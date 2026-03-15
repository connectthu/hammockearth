import {
  Injectable,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";
import { StripeService } from "../stripe/stripe.service";
import { EmailService } from "../email/email.service";
import { EventsService } from "../events/events.service";
import { DiscountCodesService } from "../discount-codes/discount-codes.service";
import type { CreateRegistrationDto } from "./dto/create-registration.dto";

@Injectable()
export class RegistrationsService {
  private readonly logger = new Logger(RegistrationsService.name);

  constructor(
    private supabase: SupabaseService,
    private stripe: StripeService,
    private email: EmailService,
    private events: EventsService,
    private discountCodes: DiscountCodesService
  ) {}

  async createRegistration(dto: CreateRegistrationDto) {
    // 1. Fetch event
    const event = await this.events.findBySlug(dto.eventSlug);
    if (!event) throw new NotFoundException("Event not found");

    // 2. Check capacity
    const { data: capacity } = await this.supabase.client
      .from("event_capacity")
      .select("spots_remaining")
      .eq("slug", dto.eventSlug)
      .single();

    const spotsRemaining = capacity?.spots_remaining ?? null;
    const isAtCapacity =
      spotsRemaining !== null && spotsRemaining < dto.quantity;

    if (isAtCapacity) {
      // Insert waitlisted registration (no payment)
      const { data: reg, error } = await this.supabase.client
        .from("event_registrations")
        .insert({
          event_id: event.id,
          guest_name: dto.guestName,
          guest_email: dto.guestEmail,
          quantity: dto.quantity,
          status: "waitlisted",
          amount_paid_cents: 0,
        })
        .select()
        .single();

      if (error) throw error;

      // Send waitlist confirmation email
      try {
        await this.email.eventWaitlistConfirmation({
          to: dto.guestEmail,
          name: dto.guestName,
          eventTitle: event.title,
        });
      } catch (err) {
        this.logger.error("Failed to send waitlist email", err);
      }

      return { status: "waitlisted", registrationId: reg.id };
    }

    // 3. Validate discount code
    let discountAmountCents = 0;
    let discountCodeId: string | null = null;

    if (dto.discountCode) {
      try {
        const code = await this.discountCodes.validate(dto.discountCode);
        discountAmountCents = this.discountCodes.calculateDiscount(
          event.price_cents,
          dto.quantity,
          code
        );
        discountCodeId = code.id;
      } catch (err) {
        this.logger.warn(`Invalid discount code: ${dto.discountCode}`, err);
        // Invalid discount code — proceed without discount
      }
    }

    // 4. Calculate amount
    const amountCents = Math.max(
      0,
      event.price_cents * dto.quantity - discountAmountCents
    );

    // 5. Create Stripe PaymentIntent with placeholder metadata
    const paymentIntent = await this.stripe.createPaymentIntent(amountCents, {
      registrationId: "pending",
      eventSlug: dto.eventSlug,
    });

    // 6. Insert registration
    const { data: reg, error } = await this.supabase.client
      .from("event_registrations")
      .insert({
        event_id: event.id,
        guest_name: dto.guestName,
        guest_email: dto.guestEmail,
        quantity: dto.quantity,
        status: "pending",
        stripe_payment_intent_id: paymentIntent.id,
        discount_code_id: discountCodeId,
        amount_paid_cents: amountCents,
      })
      .select()
      .single();

    if (error) throw error;

    // 7. Update PaymentIntent metadata with real registrationId
    try {
      await this.stripe.updatePaymentIntentMetadata(paymentIntent.id, {
        registrationId: reg.id,
        eventSlug: dto.eventSlug,
      });
    } catch (err) {
      this.logger.warn("Failed to update PaymentIntent metadata", err);
    }

    return {
      status: "pending",
      clientSecret: paymentIntent.client_secret,
      registrationId: reg.id,
      amountCents,
    };
  }

  async cancelRegistration(id: string) {
    const { data: reg, error } = await this.supabase.client
      .from("event_registrations")
      .update({ status: "cancelled" })
      .eq("id", id)
      .select("*, events(*)")
      .single();

    if (error || !reg) throw new NotFoundException("Registration not found");

    // Promote first waitlisted registration for this event
    const { data: waitlisted } = await this.supabase.client
      .from("event_registrations")
      .select("*")
      .eq("event_id", (reg as any).event_id)
      .eq("status", "waitlisted")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (waitlisted) {
      await this.supabase.client
        .from("event_registrations")
        .update({ status: "waitlisted" }) // keep as waitlisted — they still need to register
        .eq("id", waitlisted.id);

      const event = (reg as any).events;
      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL ?? "https://hammock.earth";

      try {
        await this.email.waitlistPromotion({
          to: waitlisted.guest_email!,
          name: waitlisted.guest_name!,
          eventTitle: event?.title ?? "",
          eventSlug: event?.slug ?? "",
          appUrl,
        });
      } catch (err) {
        this.logger.error("Failed to send waitlist promotion email", err);
      }
    }

    return { success: true };
  }

  async confirmRegistration(registrationId: string) {
    const { data: reg, error } = await this.supabase.client
      .from("event_registrations")
      .update({ status: "confirmed" })
      .eq("id", registrationId)
      .select()
      .single();

    if (error || !reg) {
      this.logger.error(`Failed to confirm registration ${registrationId}`);
      return null;
    }

    // Increment discount code usage if applicable
    if (reg.discount_code_id) {
      try {
        await this.discountCodes.incrementUsedCount(reg.discount_code_id);
      } catch (err) {
        this.logger.warn("Failed to increment discount code usage", err);
      }
    }

    return reg;
  }
}
