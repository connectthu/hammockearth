import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";
import { StripeService } from "../stripe/stripe.service";
import { EmailService } from "../email/email.service";
import { EventsService } from "../events/events.service";
import { DiscountCodesService } from "../discount-codes/discount-codes.service";
import { SeriesService } from "../series/series.service";
import type { EventRegistration } from "@hammock/database";
import type { CreateRegistrationDto } from "./dto/create-registration.dto";

@Injectable()
export class RegistrationsService {
  private readonly logger = new Logger(RegistrationsService.name);

  constructor(
    private supabase: SupabaseService,
    private stripe: StripeService,
    private email: EmailService,
    private events: EventsService,
    private discountCodes: DiscountCodesService,
    private series: SeriesService
  ) {}

  private async verifyActiveMembership(token: string): Promise<boolean> {
    const { data: { user } } = await this.supabase.client.auth.getUser(token);
    if (!user) return false;
    const { data } = await this.supabase.client
      .from("memberships")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "active" as any)
      .in("membership_type", ["season_pass", "try_a_month"])
      .limit(1)
      .single();
    return !!data;
  }

  async createRegistration(dto: CreateRegistrationDto, authToken?: string) {
    const registrationType = dto.registrationType ?? "single_event";

    if (registrationType === "full_series") {
      return this.createSeriesRegistration(dto);
    }
    if (registrationType === "drop_in_session") {
      return this.createDropInRegistration(dto);
    }

    // ── single_event (original flow) ──────────────────────────────────────
    if (!dto.eventSlug) throw new BadRequestException("eventSlug is required");

    // 1. Fetch event (findBySlug returns Promise<Event>)
    const event = await this.events.findBySlug(dto.eventSlug);

    // 2. Check capacity
    const { data: capacityData } = await this.supabase.client
      .from("event_capacity")
      .select("spots_remaining")
      .eq("slug", dto.eventSlug)
      .single();

    const spotsRemaining = (capacityData as any)?.spots_remaining ?? null;
    const isAtCapacity =
      spotsRemaining !== null && spotsRemaining < dto.quantity;

    if (isAtCapacity) {
      // Insert waitlisted registration (no payment)
      const { data: regData, error } = await this.supabase.client
        .from("event_registrations")
        .insert({
          event_id: event.id,
          guest_name: dto.guestName,
          guest_email: dto.guestEmail,
          quantity: dto.quantity,
          status: "waitlisted",
          amount_paid_cents: 0,
          notes: dto.notes ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      const reg = regData as unknown as EventRegistration;

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

    // 3. Determine effective unit price (member pricing)
    let unitPriceCents = event.price_cents;
    if (
      dto.useMemberPrice &&
      authToken &&
      (event as any).member_price_cents > 0 &&
      (event as any).member_price_cents < event.price_cents
    ) {
      const verified = await this.verifyActiveMembership(authToken);
      if (verified) unitPriceCents = (event as any).member_price_cents;
    }

    // 4. Validate discount code
    let discountAmountCents = 0;
    let discountCodeId: string | null = null;

    if (dto.discountCode) {
      try {
        const code = await this.discountCodes.validate(dto.discountCode);
        discountAmountCents = this.discountCodes.calculateDiscount(
          unitPriceCents,
          dto.quantity,
          code
        );
        discountCodeId = code.id;
      } catch (err) {
        this.logger.warn(`Invalid discount code: ${dto.discountCode}`, err);
        // Proceed without discount
      }
    }

    // 5. Calculate amount
    const amountCents = Math.max(
      0,
      unitPriceCents * dto.quantity - discountAmountCents
    );

    // 6. Free event — skip Stripe entirely
    if (amountCents === 0) {
      const { data: regData, error } = await this.supabase.client
        .from("event_registrations")
        .insert({
          event_id: event.id,
          guest_name: dto.guestName,
          guest_email: dto.guestEmail,
          quantity: dto.quantity,
          status: "confirmed",
          discount_code_id: discountCodeId,
          amount_paid_cents: 0,
          notes: dto.notes ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      const reg = regData as unknown as EventRegistration;

      if (discountCodeId) {
        try {
          await this.discountCodes.incrementUsedCount(discountCodeId);
        } catch (err) {
          this.logger.warn("Failed to increment discount code usage", err);
        }
      }

      try {
        const { CalendarService } = await import("../calendar/calendar.service");
        const calendarService = new CalendarService();
        const icsContent = calendarService.generateIcs(event as any);
        await this.email.bookingConfirmation({
          to: dto.guestEmail,
          name: dto.guestName,
          event,
          quantity: dto.quantity,
          amountPaidCents: 0,
          icsContent,
        });
      } catch (err) {
        this.logger.error("Failed to send free event confirmation email", err);
      }

      // Admin notification (fire-and-forget)
      this.email.sendAdminNotification(
        "new_registration",
        `New Registration — ${dto.guestName || dto.guestEmail}`,
        `<p><strong>${dto.guestName}</strong> (${dto.guestEmail}) registered for <strong>${event.title}</strong> (free).</p>`
      ).catch(() => {});

      // Upgrade genpop → event_customer on first confirmed registration (fire-and-forget)
      this.upgradeGenpopByEmail(dto.guestEmail).catch(() => {});

      return { status: "confirmed", registrationId: reg.id };
    }

    // 7. Create Stripe PaymentIntent with placeholder metadata
    const paymentIntent = await this.stripe.createPaymentIntent(amountCents, {
      registrationId: "pending",
      eventSlug: dto.eventSlug,
    });

    // 8. Insert registration
    const { data: regData, error } = await this.supabase.client
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
        notes: dto.notes ?? null,
      })
      .select()
      .single();

    if (error) throw error;
    const reg = regData as unknown as EventRegistration;

    // 9. Update PaymentIntent metadata with real registrationId
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

  // ── admin: list registrations for an event ────────────────────────────────
  async listForEvent(eventId: string) {
    const { data, error } = await this.supabase.client
      .from("event_registrations")
      .select("id, guest_name, guest_email, quantity, status, amount_paid_cents, notes, created_at")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data ?? [];
  }

  // ── full_series registration ───────────────────────────────────────────────
  private async createSeriesRegistration(dto: CreateRegistrationDto) {
    if (!dto.seriesSlug) throw new BadRequestException("seriesSlug is required");

    const seriesData = await this.series.findBySlug(dto.seriesSlug);
    if (seriesData.status !== "published") {
      throw new NotFoundException("Series not found");
    }

    // Validate discount code
    let discountAmountCents = 0;
    let discountCodeId: string | null = null;
    if (dto.discountCode) {
      try {
        const code = await this.discountCodes.validate(dto.discountCode);
        discountAmountCents = this.discountCodes.calculateDiscount(
          seriesData.price_cents,
          1,
          code
        );
        discountCodeId = code.id;
      } catch {
        // Proceed without discount
      }
    }

    const amountCents = Math.max(0, seriesData.price_cents - discountAmountCents);

    if (amountCents === 0) {
      const { data: regData, error } = await this.supabase.client
        .from("event_registrations")
        .insert({
          series_id: seriesData.id,
          registration_type: "full_series",
          guest_name: dto.guestName,
          guest_email: dto.guestEmail,
          quantity: 1,
          status: "confirmed",
          discount_code_id: discountCodeId,
          amount_paid_cents: 0,
        })
        .select()
        .single();

      if (error) throw error;

      if (discountCodeId) {
        await this.discountCodes.incrementUsedCount(discountCodeId).catch(() => {});
      }

      try {
        const { CalendarService } = await import("../calendar/calendar.service");
        const calendarService = new CalendarService();
        const icsContent = calendarService.generateSeriesIcs(seriesData, seriesData.sessions);
        await this.email.seriesBookingConfirmation({
          to: dto.guestEmail,
          name: dto.guestName,
          series: seriesData,
          sessions: seriesData.sessions,
          amountPaidCents: 0,
          icsContent,
        });
      } catch (err) {
        this.logger.error("Failed to send series confirmation email", err);
      }

      const reg = regData as unknown as EventRegistration;
      return { status: "confirmed", registrationId: reg.id };
    }

    const paymentIntent = await this.stripe.createPaymentIntent(amountCents, {
      registrationId: "pending",
      seriesSlug: dto.seriesSlug,
    });

    const { data: regData, error } = await this.supabase.client
      .from("event_registrations")
      .insert({
        series_id: seriesData.id,
        registration_type: "full_series",
        guest_name: dto.guestName,
        guest_email: dto.guestEmail,
        quantity: 1,
        status: "pending",
        stripe_payment_intent_id: paymentIntent.id,
        discount_code_id: discountCodeId,
        amount_paid_cents: amountCents,
        notes: dto.notes ?? null,
      })
      .select()
      .single();

    if (error) throw error;
    const reg = regData as unknown as EventRegistration;

    await this.stripe
      .updatePaymentIntentMetadata(paymentIntent.id, {
        registrationId: reg.id,
        seriesSlug: dto.seriesSlug,
      })
      .catch((err) => this.logger.warn("Failed to update PaymentIntent metadata", err));

    return {
      status: "pending",
      clientSecret: paymentIntent.client_secret,
      registrationId: reg.id,
      amountCents,
    };
  }

  // ── drop_in_session registration ──────────────────────────────────────────
  private async createDropInRegistration(dto: CreateRegistrationDto) {
    if (!dto.sessionId) throw new BadRequestException("sessionId is required");

    const { data: sessionData, error: sessionError } =
      await this.supabase.client
        .from("event_series_sessions")
        .select("*, event_series(*)")
        .eq("id", dto.sessionId)
        .limit(1);

    if (sessionError || !sessionData || sessionData.length === 0) {
      throw new NotFoundException("Session not found");
    }

    const session = sessionData[0] as any;
    const seriesData = session.event_series;

    if (!seriesData?.drop_in_enabled) {
      throw new BadRequestException("Drop-in is not enabled for this series");
    }

    // Check session capacity
    if (session.capacity !== null) {
      const { count } = await this.supabase.client
        .from("event_registrations")
        .select("id", { count: "exact", head: true })
        .eq("session_id", dto.sessionId)
        .eq("status", "confirmed");

      if ((count ?? 0) >= session.capacity) {
        throw new BadRequestException("Session is full");
      }
    }

    const amountCents = seriesData.drop_in_price_cents ?? 0;

    if (amountCents === 0) {
      const { data: regData, error } = await this.supabase.client
        .from("event_registrations")
        .insert({
          session_id: dto.sessionId,
          registration_type: "drop_in_session",
          guest_name: dto.guestName,
          guest_email: dto.guestEmail,
          quantity: 1,
          status: "confirmed",
          amount_paid_cents: 0,
        })
        .select()
        .single();

      if (error) throw error;
      const reg = regData as unknown as EventRegistration;
      return { status: "confirmed", registrationId: reg.id };
    }

    const paymentIntent = await this.stripe.createPaymentIntent(amountCents, {
      registrationId: "pending",
      sessionId: dto.sessionId,
    });

    const { data: regData, error } = await this.supabase.client
      .from("event_registrations")
      .insert({
        session_id: dto.sessionId,
        registration_type: "drop_in_session",
        guest_name: dto.guestName,
        guest_email: dto.guestEmail,
        quantity: 1,
        status: "pending",
        stripe_payment_intent_id: paymentIntent.id,
        amount_paid_cents: amountCents,
      })
      .select()
      .single();

    if (error) throw error;
    const reg = regData as unknown as EventRegistration;

    await this.stripe
      .updatePaymentIntentMetadata(paymentIntent.id, {
        registrationId: reg.id,
        sessionId: dto.sessionId,
      })
      .catch((err) => this.logger.warn("Failed to update PaymentIntent metadata", err));

    return {
      status: "pending",
      clientSecret: paymentIntent.client_secret,
      registrationId: reg.id,
      amountCents,
    };
  }

  async cancelRegistration(id: string) {
    const { data: regData, error } = await this.supabase.client
      .from("event_registrations")
      .update({ status: "cancelled" })
      .eq("id", id)
      .select("*, events(*)")
      .single();

    if (error || !regData) throw new NotFoundException("Registration not found");
    const reg = regData as any;

    // Promote first waitlisted registration for this event
    const { data: waitlistedData } = await this.supabase.client
      .from("event_registrations")
      .select("*")
      .eq("event_id", reg.event_id)
      .eq("status", "waitlisted")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (waitlistedData) {
      const waitlisted = waitlistedData as unknown as EventRegistration;
      const event = reg.events;
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

  async confirmRegistration(registrationId: string): Promise<EventRegistration | null> {
    const { data: regData, error } = await this.supabase.client
      .from("event_registrations")
      .update({ status: "confirmed" })
      .eq("id", registrationId)
      .select()
      .single();

    if (error || !regData) {
      this.logger.error(`Failed to confirm registration ${registrationId}`);
      return null;
    }

    const reg = regData as unknown as EventRegistration;

    // Increment discount code usage if applicable
    if (reg.discount_code_id) {
      try {
        await this.discountCodes.incrementUsedCount(reg.discount_code_id);
      } catch (err) {
        this.logger.warn("Failed to increment discount code usage", err);
      }
    }

    // Upgrade genpop → event_customer on first confirmed registration (fire-and-forget)
    if (reg.guest_email) {
      this.upgradeGenpopByEmail(reg.guest_email).catch(() => {});
    }

    return reg;
  }

  private async upgradeGenpopByEmail(email: string): Promise<void> {
    const { data, error } = await this.supabase.client.auth.admin.listUsers({ perPage: 10000 });
    if (error || !data) return;
    const user = data.users.find((u) => u.email === email);
    if (!user) return;
    await this.supabase.client
      .from("profiles")
      .update({ role: "event_customer" as any })
      .eq("id", user.id)
      .eq("role", "genpop" as any);
  }
}
