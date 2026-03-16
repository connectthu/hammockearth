import { Injectable, Logger } from "@nestjs/common";
import { StripeService } from "../stripe/stripe.service";
import { RegistrationsService } from "../registrations/registrations.service";
import { EmailService } from "../email/email.service";
import { EventsService } from "../events/events.service";
import { CalendarService } from "../calendar/calendar.service";
import { SupabaseService } from "../supabase/supabase.service";

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private stripe: StripeService,
    private registrations: RegistrationsService,
    private email: EmailService,
    private events: EventsService,
    private calendar: CalendarService,
    private supabase: SupabaseService
  ) {}

  async handleStripe(rawBody: Buffer, signature: string): Promise<void> {
    let stripeEvent: ReturnType<typeof this.stripe.constructWebhookEvent>;

    try {
      stripeEvent = this.stripe.constructWebhookEvent(rawBody, signature);
    } catch (err) {
      this.logger.error("Stripe webhook signature verification failed", err);
      throw err;
    }

    switch (stripeEvent.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = stripeEvent.data.object as any;
        const registrationId = paymentIntent.metadata?.registrationId;

        if (!registrationId || registrationId === "pending") {
          this.logger.warn(
            `No registrationId in PaymentIntent metadata: ${paymentIntent.id}`
          );
          break;
        }

        const reg = await this.registrations.confirmRegistration(registrationId);
        if (!reg) break;

        // Fetch registration with event/series and send confirmation email
        try {
          const { data: regWithRelations } = await this.supabase.client
            .from("event_registrations")
            .select("*, events(*), event_series(*, event_series_sessions(*))")
            .eq("id", registrationId)
            .single();

          const regRow = regWithRelations as any;

          if (regRow?.registration_type === "full_series" && regRow?.event_series) {
            const series = regRow.event_series;
            const sessions = (series.event_series_sessions ?? []).sort(
              (a: any, b: any) => a.session_number - b.session_number
            );
            const icsContent = this.calendar.generateSeriesIcs(series, sessions);
            await this.email.seriesBookingConfirmation({
              to: reg.guest_email!,
              name: reg.guest_name!,
              series,
              sessions,
              amountPaidCents: reg.amount_paid_cents,
              icsContent,
            });
          } else {
            const event = regRow?.events;
            if (!event) break;
            const icsContent = this.calendar.generateIcs(event);
            await this.email.bookingConfirmation({
              to: reg.guest_email!,
              name: reg.guest_name!,
              event,
              quantity: reg.quantity,
              amountPaidCents: reg.amount_paid_cents,
              icsContent,
            });
          }
        } catch (err) {
          this.logger.error("Failed to send booking confirmation email", err);
          // Email failure must NOT return 500 — already caught here
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = stripeEvent.data.object as any;
        const registrationId = paymentIntent.metadata?.registrationId;

        if (!registrationId || registrationId === "pending") break;

        const { error } = await this.supabase.client
          .from("event_registrations")
          .delete()
          .eq("id", registrationId)
          .eq("status", "pending");

        if (error) {
          this.logger.error(
            `Failed to delete pending registration ${registrationId}`,
            error
          );
        }
        break;
      }

      default:
        this.logger.debug(`Unhandled Stripe event: ${stripeEvent.type}`);
    }
  }
}
