import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
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

  constructor(private config: ConfigService) {}

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

  bookingConfirmation(opts: {
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
    const amount = `$${(amountPaidCents / 100).toFixed(2)} CAD`;

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
          ${event.confirmation_details ? `
          <div style="margin:24px 0;padding:20px;background:#FBF7F0;border-radius:8px;border-left:3px solid #C4845A">
            <p style="margin:0 0 8px;font-weight:bold;color:#3B2F2F">Details for this event</p>
            ${event.confirmation_details}
          </div>` : ""}
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
