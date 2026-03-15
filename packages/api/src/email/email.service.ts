import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
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
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: Array.isArray(opts.to) ? opts.to : [opts.to],
          subject: opts.subject,
          html: opts.html,
          reply_to: opts.replyTo ?? from,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        this.logger.error(`Resend error ${res.status}: ${body}`);
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
}
