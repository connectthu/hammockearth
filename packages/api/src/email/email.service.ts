import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SupabaseService } from "../supabase/supabase.service";
import type { Event, EventSeries, EventSeriesSession } from "@hammock/database";

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
  attachments?: Array<{ filename: string; content: string }>;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private config: ConfigService,
    private supabase: SupabaseService
  ) {}

  async send(opts: SendEmailOptions): Promise<void> {
    const apiKey = this.config.get<string>("RESEND_API_KEY");
    const from = this.config.get<string>("EMAIL_FROM") ?? "hello@hammock.earth";

    if (!apiKey) {
      this.logger.warn("RESEND_API_KEY not set — skipping email");
      return;
    }

    try {
      const body: Record<string, unknown> = {
        from,
        to: Array.isArray(opts.to) ? opts.to : [opts.to],
        subject: opts.subject,
        html: opts.html,
        reply_to: opts.replyTo ?? from,
      };

      if (opts.attachments?.length) {
        body.attachments = opts.attachments;
      }

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const resBody = await res.text();
        this.logger.error(`Resend error ${res.status}: ${resBody}`);
      }
    } catch (err) {
      this.logger.error("Failed to send email", err);
    }
  }

  private substituteVariables(template: string, vars: Record<string, string>): string {
    return Object.entries(vars).reduce(
      (t, [k, v]) => t.replaceAll(`{{${k}}}`, v ?? ""),
      template
    );
  }

  private wrapEmailBody(body: string): string {
    return `<div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#3B2F2F">${body}</div>`;
  }

  private async fetchTemplate(key: string): Promise<{ subject: string; body_html: string } | null> {
    try {
      const { data } = await this.supabase.client
        .from("email_templates" as any)
        .select("subject,body_html")
        .eq("key", key)
        .single();
      return (data as any) ?? null;
    } catch {
      return null;
    }
  }

  async sendAdminNotification(eventKey: string, subject: string, html: string): Promise<void> {
    try {
      const { data } = await this.supabase.client
        .from("notification_settings" as any)
        .select("enabled,recipient_emails")
        .eq("key", eventKey)
        .single();
      const row = data as any;
      if (!row?.enabled || !row.recipient_emails?.length) return;
      await this.send({ to: row.recipient_emails, subject, html });
    } catch (err) {
      this.logger.error(`Failed to send admin notification (${eventKey})`, err);
    }
  }

  facilitatorInquiryNotification(opts: {
    name: string;
    email: string;
    message: string;
  }): Promise<void> {
    return this.send({
      to: "hello@hammock.earth",
      subject: `New Facilitator Inquiry from ${opts.name}`,
      html: `
        <h2>New Facilitator / Space Rental Inquiry</h2>
        <p><strong>Name:</strong> ${opts.name}</p>
        <p><strong>Email:</strong> <a href="mailto:${opts.email}">${opts.email}</a></p>
        <p><strong>Message:</strong></p>
        <blockquote style="border-left:3px solid #C4845A;padding-left:1rem;color:#4A4A4A">
          ${opts.message.replace(/\n/g, "<br>")}
        </blockquote>
      `,
    });
  }

  waitlistConfirmation(opts: { to: string; firstName?: string | null }): Promise<void> {
    return this.send({
      to: opts.to,
      subject: "You're on the Hammock Earth list",
      html: `
        <p>Hi${opts.firstName ? ` ${opts.firstName}` : ""},</p>
        <p>Thanks for joining the Hammock Earth community list.
        We'll be in touch when new events and programs are announced.</p>
        <p>With warmth,<br>Thu & Anahita<br>Hammock Earth</p>
      `,
    });
  }

  async bookingConfirmation(opts: {
    to: string;
    name: string;
    event: Event;
    quantity: number;
    amountPaidCents: number;
    icsContent: string;
  }): Promise<void> {
    const { to, name, event, quantity, amountPaidCents, icsContent } = opts;
    const startDate = new Date(event.start_at);
    const formattedDate = startDate.toLocaleDateString("en-CA", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "America/Toronto",
    });
    const formattedTime = startDate.toLocaleTimeString("en-CA", {
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
      timeZone: "America/Toronto",
    });
    const amount = amountPaidCents === 0 ? "Free" : `$${(amountPaidCents / 100).toFixed(2)} CAD`;

    const confirmationDetailsBlock = event.confirmation_details
      ? `<div style="margin:24px 0;padding:20px;background:#FBF7F0;border-radius:8px;border-left:3px solid #C4845A">
          <p style="margin:0 0 8px;font-weight:bold;color:#3B2F2F">Details for this event</p>
          ${event.confirmation_details}
        </div>`
      : "";

    const tmpl = await this.fetchTemplate("booking_confirmation");

    if (tmpl) {
      const html = this.wrapEmailBody(
        this.substituteVariables(tmpl.body_html, {
          name,
          event_title: event.title,
          event_date: formattedDate,
          event_time: formattedTime,
          event_location: event.location ?? "",
          quantity: String(quantity),
          amount_paid: amount,
          confirmation_details_block: confirmationDetailsBlock,
        })
      );
      const subject = this.substituteVariables(tmpl.subject, { event_title: event.title });
      return this.send({
        to,
        subject,
        html,
        attachments: [{ filename: `${event.slug}.ics`, content: Buffer.from(icsContent).toString("base64") }],
      });
    }

    // Fallback
    return this.send({
      to,
      subject: `You're registered — ${event.title}`,
      html: `
        <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#3B2F2F">
          <h1 style="color:#3B2F2F;font-size:24px">You're registered 🌿</h1>
          <p>Hi ${name},</p>
          <p>We're so glad you're joining us. Here are your booking details:</p>

          <table style="width:100%;border-collapse:collapse;margin:24px 0">
            <tr>
              <td style="padding:8px 0;border-top:1px solid #F5EFE6;font-weight:bold">Event</td>
              <td style="padding:8px 0;border-top:1px solid #F5EFE6">${event.title}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;border-top:1px solid #F5EFE6;font-weight:bold">Date</td>
              <td style="padding:8px 0;border-top:1px solid #F5EFE6">${formattedDate}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;border-top:1px solid #F5EFE6;font-weight:bold">Time</td>
              <td style="padding:8px 0;border-top:1px solid #F5EFE6">${formattedTime}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;border-top:1px solid #F5EFE6;font-weight:bold">Location</td>
              <td style="padding:8px 0;border-top:1px solid #F5EFE6">${event.location}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;border-top:1px solid #F5EFE6;font-weight:bold">Tickets</td>
              <td style="padding:8px 0;border-top:1px solid #F5EFE6">${quantity}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;border-top:1px solid #F5EFE6;border-bottom:1px solid #F5EFE6;font-weight:bold">Total Paid</td>
              <td style="padding:8px 0;border-top:1px solid #F5EFE6;border-bottom:1px solid #F5EFE6">${amount}</td>
            </tr>
          </table>

          <p>The .ics file is attached — open it to add the event to your calendar.</p>
          ${confirmationDetailsBlock}
          <p>If you have any questions, reply to this email or reach us at <a href="mailto:hello@hammock.earth" style="color:#C4845A">hello@hammock.earth</a>.</p>
          <p>With warmth,<br>Thu &amp; Anahita<br>Hammock Earth</p>
        </div>
      `,
      attachments: [
        {
          filename: `${event.slug}.ics`,
          content: Buffer.from(icsContent).toString("base64"),
        },
      ],
    });
  }

  seriesBookingConfirmation(opts: {
    to: string;
    name: string;
    series: EventSeries;
    sessions: EventSeriesSession[];
    amountPaidCents: number;
    icsContent: string;
  }): Promise<void> {
    const { to, name, series, sessions, amountPaidCents, icsContent } = opts;
    const amount = amountPaidCents === 0 ? "Free" : `$${(amountPaidCents / 100).toFixed(2)} CAD`;

    const sessionRows = sessions
      .map((s) => {
        const date = new Date(s.start_at).toLocaleDateString("en-CA", {
          weekday: "short",
          month: "long",
          day: "numeric",
          timeZone: "America/Toronto",
        });
        const time = new Date(s.start_at).toLocaleTimeString("en-CA", {
          hour: "numeric",
          minute: "2-digit",
          timeZoneName: "short",
          timeZone: "America/Toronto",
        });
        return `<tr>
          <td style="padding:6px 8px;border-top:1px solid #F5EFE6;color:#6B7C5C;font-weight:bold">Week ${s.session_number}</td>
          <td style="padding:6px 8px;border-top:1px solid #F5EFE6">${date}</td>
          <td style="padding:6px 8px;border-top:1px solid #F5EFE6">${time}</td>
        </tr>`;
      })
      .join("");

    return this.send({
      to,
      subject: `You're registered — ${series.title}`,
      html: `
        <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#3B2F2F">
          <h1 style="color:#3B2F2F;font-size:24px">You're registered 🌿</h1>
          <p>Hi ${name},</p>
          <p>We're so glad you're joining us for <strong>${series.title}</strong>.</p>

          <table style="width:100%;border-collapse:collapse;margin:24px 0">
            <tr>
              <td style="padding:8px 0;border-top:1px solid #F5EFE6;font-weight:bold">Program</td>
              <td style="padding:8px 0;border-top:1px solid #F5EFE6">${series.title}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;border-top:1px solid #F5EFE6;font-weight:bold">Duration</td>
              <td style="padding:8px 0;border-top:1px solid #F5EFE6">${series.duration_weeks} weeks · ${series.session_count} sessions</td>
            </tr>
            <tr>
              <td style="padding:8px 0;border-top:1px solid #F5EFE6;border-bottom:1px solid #F5EFE6;font-weight:bold">Total Paid</td>
              <td style="padding:8px 0;border-top:1px solid #F5EFE6;border-bottom:1px solid #F5EFE6">${amount}</td>
            </tr>
          </table>

          <h2 style="font-size:16px;color:#3B2F2F;margin-top:24px">Session Schedule</h2>
          <table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:14px">
            ${sessionRows}
          </table>

          <p style="color:#6B7C5C;font-size:14px">Meeting links will be shared before each session.</p>
          <p>The .ics file is attached — open it to add all sessions to your calendar at once.</p>
          <p>If you have any questions, reply to this email or reach us at <a href="mailto:hello@hammock.earth" style="color:#C4845A">hello@hammock.earth</a>.</p>
          <p>With warmth,<br>Thu &amp; Anahita<br>Hammock Earth</p>
        </div>
      `,
      attachments: [
        {
          filename: `${series.slug}.ics`,
          content: Buffer.from(icsContent).toString("base64"),
        },
      ],
    });
  }

  eventWaitlistConfirmation(opts: {
    to: string;
    name: string;
    eventTitle: string;
  }): Promise<void> {
    return this.send({
      to: opts.to,
      subject: `You're on the waitlist — ${opts.eventTitle}`,
      html: `
        <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#3B2F2F">
          <h1 style="color:#3B2F2F;font-size:24px">You're on the waitlist</h1>
          <p>Hi ${opts.name},</p>
          <p>You're on the waitlist for <strong>${opts.eventTitle}</strong>.</p>
          <p>We'll email you right away if a spot opens up.</p>
          <p>With warmth,<br>Thu &amp; Anahita<br>Hammock Earth</p>
        </div>
      `,
    });
  }

  async membershipWelcome(opts: {
    to: string;
    name: string;
    membershipType: "season_pass" | "farm_friend";
    validUntil?: string;
  }): Promise<void> {
    const { to, name, membershipType, validUntil } = opts;
    const isSeasonPass = membershipType === "season_pass";

    const templateKey = isSeasonPass
      ? "membership_welcome_season_pass"
      : "membership_welcome_farm_friend";

    const validityHtml = isSeasonPass && validUntil
      ? `<p style="color:#6B7C5C;font-size:14px">Your membership is valid through <strong>${validUntil}</strong>.</p>`
      : !isSeasonPass
      ? `<p style="color:#6B7C5C;font-size:14px">Your Farm Friend membership renews at <strong>$10/month</strong>. Cancel anytime from your dashboard.</p>`
      : "";

    const dashboardUrl = "https://hammock.earth/members/dashboard";

    const tmpl = await this.fetchTemplate(templateKey);

    if (tmpl) {
      const html = this.wrapEmailBody(
        this.substituteVariables(tmpl.body_html, {
          name: name || "there",
          validity_html: validityHtml,
          dashboard_url: dashboardUrl,
        })
      );
      return this.send({ to, subject: tmpl.subject, html });
    }

    // Fallback
    const perksHtml = isSeasonPass
      ? `
        <ul style="padding-left:20px;line-height:1.8;color:#3B2F2F">
          <li>2 tickets per event at member price</li>
          <li>Members-only events &amp; farm days</li>
          <li>Weekly farm days at Hammock Hills</li>
          <li>Care Tent visit</li>
          <li>Farming &amp; homesteading workshops</li>
          <li>Movement, meditation &amp; nature art</li>
          <li>Online Community Circles</li>
          <li>Full content library access</li>
          <li>Newsletter &amp; a seasonal gift</li>
        </ul>`
      : `
        <ul style="padding-left:20px;line-height:1.8;color:#3B2F2F">
          <li>Access to our growing content library</li>
          <li>Recipes &amp; homesteading guides</li>
          <li>Monthly newsletter</li>
        </ul>`;

    return this.send({
      to,
      subject: `Welcome to Hammock Earth — Your membership is active`,
      html: `
        <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#3B2F2F">
          <h1 style="color:#3B2F2F;font-size:24px">Welcome to Hammock Earth</h1>
          <p>Hi ${name || "there"},</p>
          <p>Your <strong>${isSeasonPass ? "2026 Seasons Pass" : "Farm Friend"}</strong> membership is now active. We're so glad to have you.</p>

          ${validityHtml}

          <div style="margin:24px 0;padding:20px;background:#FBF7F0;border-radius:8px;border-left:3px solid #C4845A">
            <p style="margin:0 0 12px;font-weight:bold;color:#3B2F2F">What's included</p>
            ${perksHtml}
          </div>

          <p>Head to your <a href="${dashboardUrl}" style="color:#C4845A">member dashboard</a> to explore upcoming events and manage your membership.</p>
          <p>If you have any questions, reply to this email or reach us at <a href="mailto:hello@hammock.earth" style="color:#C4845A">hello@hammock.earth</a>.</p>
          <p>With warmth,<br>Thu &amp; Anahita<br>Hammock Earth</p>
        </div>
      `,
    });
  }

  collaboratorInvite(opts: {
    to: string;
    name: string;
    loginLink: string;
    eventTitle?: string;
  }): Promise<void> {
    const { to, name, loginLink, eventTitle } = opts;
    const greeting = name ? `Hi ${name},` : "Hi,";
    const eventLine = eventTitle
      ? `<p>You've been added as a collaborator on <strong>${eventTitle}</strong>.</p>`
      : `<p>You've been added as a collaborator on Hammock Earth.</p>`;

    return this.send({
      to,
      subject: "You've been added as a collaborator — Hammock Earth",
      html: `
        <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#3B2F2F">
          <h1 style="color:#3B2F2F;font-size:24px">Welcome, collaborator 🌿</h1>
          <p>${greeting}</p>
          ${eventLine}
          <p>You can log in to your collaborator dashboard to view your events and set up your public profile (name, photo, bio, and website link).</p>
          <p style="margin:32px 0">
            <a href="${loginLink}"
               style="background:#C4845A;color:#fff;padding:12px 24px;border-radius:24px;text-decoration:none;font-weight:bold">
              Log in to your dashboard
            </a>
          </p>
          <p style="color:#6B7C5C;font-size:13px">This link expires in 24 hours. If you need a new one, go to <a href="https://hammock.earth/members/login" style="color:#C4845A">hammock.earth/members/login</a>.</p>
          <p>If you have any questions, reply to this email or reach us at <a href="mailto:hello@hammock.earth" style="color:#C4845A">hello@hammock.earth</a>.</p>
          <p>With warmth,<br>Thu &amp; Anahita<br>Hammock Earth</p>
        </div>
      `,
    });
  }

  async communityAskConnection(opts: {
    templateKey: "community_ask_poster" | "community_ask_helper";
    to: string;
    vars: Record<string, string>;
  }): Promise<void> {
    const tmpl = await this.fetchTemplate(opts.templateKey);
    if (!tmpl) return;
    const html = this.wrapEmailBody(this.substituteVariables(tmpl.body_html, opts.vars));
    const subject = this.substituteVariables(tmpl.subject, opts.vars);
    return this.send({ to: opts.to, subject, html });
  }

  waitlistPromotion(opts: {
    to: string;
    name: string;
    eventTitle: string;
    eventSlug: string;
    appUrl: string;
  }): Promise<void> {
    const eventUrl = `${opts.appUrl}/events/${opts.eventSlug}`;
    return this.send({
      to: opts.to,
      subject: `A spot opened up — ${opts.eventTitle}`,
      html: `
        <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#3B2F2F">
          <h1 style="color:#3B2F2F;font-size:24px">Good news — a spot opened up!</h1>
          <p>Hi ${opts.name},</p>
          <p>A spot has become available for <strong>${opts.eventTitle}</strong>.</p>
          <p>Head over to register before it fills up again:</p>
          <p style="margin:24px 0">
            <a href="${eventUrl}"
               style="background:#C4845A;color:#fff;padding:12px 24px;border-radius:24px;text-decoration:none;font-weight:bold">
              Register Now
            </a>
          </p>
          <p>With warmth,<br>Thu &amp; Anahita<br>Hammock Earth</p>
        </div>
      `,
    });
  }
}
