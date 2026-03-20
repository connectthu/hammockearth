import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { StripeService } from "../stripe/stripe.service";
import { RegistrationsService } from "../registrations/registrations.service";
import { EmailService } from "../email/email.service";
import { EventsService } from "../events/events.service";
import { CalendarService } from "../calendar/calendar.service";
import { SupabaseService } from "../supabase/supabase.service";
import { MembershipsService } from "../memberships/memberships.service";

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private stripe: StripeService,
    private registrations: RegistrationsService,
    private email: EmailService,
    private events: EventsService,
    private calendar: CalendarService,
    private supabase: SupabaseService,
    private memberships: MembershipsService,
    private config: ConfigService
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
        const metaType = paymentIntent.metadata?.type;

        // ── Season Pass membership ────────────────────────────────────────
        if (metaType === "season_pass") {
          const priceWindowSlug = paymentIntent.metadata?.priceWindowSlug;
          const name = paymentIntent.metadata?.name ?? "";
          const email = paymentIntent.metadata?.email ?? "";

          if (!email) {
            this.logger.warn(`Missing email in season_pass PI: ${paymentIntent.id}`);
            break;
          }

          try {
            // Find or create Supabase user
            const userId = await this.findOrCreateUser(email, name);
            if (!userId) {
              this.logger.error(`Failed to find/create user for season_pass PI: ${paymentIntent.id}`);
              break;
            }

            const validUntil = new Date("2026-12-31T23:59:59Z").toISOString();

            // Create membership row
            await this.memberships.activateMembership({
              userId,
              membershipType: "season_pass",
              billingType: "one_time",
              priceWindowSlug,
              stripePaymentId: paymentIntent.id,
              validUntil,
            });

            // Increment spots_taken
            if (priceWindowSlug) {
              const { data: windowData } = await this.supabase.client
                .from("membership_price_windows")
                .select("spots_taken")
                .eq("slug", priceWindowSlug)
                .single();
              if (windowData) {
                await this.supabase.client
                  .from("membership_price_windows")
                  .update({ spots_taken: (windowData as any).spots_taken + 1 })
                  .eq("slug", priceWindowSlug);
              }
            }

            // Update profile
            await this.memberships.updateProfile(userId, "season_pass", "active");

            // Send welcome email
            await this.email.membershipWelcome({
              to: email,
              name,
              membershipType: "season_pass",
              validUntil: "December 31, 2026",
            }).catch((err) => this.logger.error("Failed to send membership welcome email", err));

            // Admin notification
            this.email.sendAdminNotification(
              "new_membership",
              `New Season Pass — ${name || email}`,
              `<p><strong>${name || "Someone"}</strong> (${email}) purchased a Season Pass.</p>`
            ).catch(() => {});
          } catch (err) {
            this.logger.error("Failed to handle season_pass payment", err);
          }
          break;
        }

        // ── Try a Month (new purchase) ────────────────────────────────────
        if (metaType === "try_a_month") {
          const name = paymentIntent.metadata?.name ?? "";
          const email = paymentIntent.metadata?.email ?? "";
          if (!email) { this.logger.warn(`Missing email in try_a_month PI: ${paymentIntent.id}`); break; }

          try {
            const userId = await this.findOrCreateUser(email, name);
            if (!userId) { this.logger.error(`Failed to find/create user for try_a_month PI: ${paymentIntent.id}`); break; }

            const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

            await this.memberships.activateMembership({
              userId,
              membershipType: "try_a_month",
              billingType: "one_time",
              stripePaymentId: paymentIntent.id,
              validUntil,
            });

            await this.memberships.updateProfile(userId, "try_a_month", "active");

            await this.email.membershipWelcome({
              to: email,
              name,
              membershipType: "try_a_month",
              validUntil: new Date(validUntil).toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" }),
            }).catch((err) => this.logger.error("Failed to send try_a_month welcome email", err));

            this.email.sendAdminNotification(
              "new_membership",
              `New Try a Month — ${name || email}`,
              `<p><strong>${name || "Someone"}</strong> (${email}) purchased a Try a Month pass.</p>`
            ).catch(() => {});
          } catch (err) {
            this.logger.error("Failed to handle try_a_month payment", err);
          }
          break;
        }

        // ── Try a Month renewal ───────────────────────────────────────────
        if (metaType === "try_a_month_renewal") {
          const userId = paymentIntent.metadata?.userId;
          const currentValidUntil = paymentIntent.metadata?.currentValidUntil;
          if (!userId) { this.logger.warn(`Missing userId in try_a_month_renewal PI: ${paymentIntent.id}`); break; }

          try {
            const base = currentValidUntil && new Date(currentValidUntil) > new Date()
              ? new Date(currentValidUntil)
              : new Date();
            const validUntil = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

            // Update existing try_a_month membership valid_until, or insert new row
            const { data: existing } = await this.supabase.client
              .from("memberships")
              .select("id")
              .eq("user_id", userId)
              .eq("membership_type", "try_a_month" as any)
              .order("created_at", { ascending: false })
              .limit(1)
              .single();

            if (existing) {
              await this.supabase.client
                .from("memberships")
                .update({ status: "active" as any, valid_until: validUntil, stripe_payment_id: paymentIntent.id })
                .eq("id", (existing as any).id);
            } else {
              await this.memberships.activateMembership({
                userId,
                membershipType: "try_a_month",
                billingType: "one_time",
                stripePaymentId: paymentIntent.id,
                validUntil,
              });
            }

            await this.memberships.updateProfile(userId, "try_a_month", "active");
          } catch (err) {
            this.logger.error("Failed to handle try_a_month_renewal payment", err);
          }
          break;
        }

        // ── Event / Series registration ───────────────────────────────────
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

          // Admin notification (fire-and-forget)
          this.email.sendAdminNotification(
            "new_registration",
            `New Registration — ${reg.guest_name || reg.guest_email}`,
            `<p><strong>${reg.guest_name}</strong> (${reg.guest_email}) registered. Registration ID: ${reg.id}</p>`
          ).catch(() => {});
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

      case "customer.subscription.updated": {
        const subscription = stripeEvent.data.object as any;
        await this.handleSubscriptionChange(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = stripeEvent.data.object as any;
        await this.handleSubscriptionChange(subscription, true);
        break;
      }

      default:
        this.logger.debug(`Unhandled Stripe event: ${stripeEvent.type}`);
    }
  }

  private async handleSubscriptionChange(
    subscription: any,
    isDeleted = false
  ): Promise<void> {
    const subscriptionId = subscription.id;

    try {
      const isActive = !isDeleted && subscription.status === "active";

      if (isActive) {
        const name = subscription.metadata?.name ?? "";
        const email = subscription.metadata?.email ?? "";

        if (!email) {
          this.logger.warn(`Missing email in farm_friend subscription: ${subscriptionId}`);
          return;
        }

        // Find or create Supabase user
        const userId = await this.findOrCreateUser(email, name);
        if (!userId) {
          this.logger.error(`Failed to find/create user for subscription: ${subscriptionId}`);
          return;
        }

        // Check if membership already exists for this subscription
        const { data: existing } = await this.supabase.client
          .from("memberships")
          .select("id, status")
          .eq("stripe_subscription_id", subscriptionId)
          .single();

        const isNew = !existing;

        const membershipType = subscription.metadata?.type === "try_a_month" ? "try_a_month" : "farm_friend";
        const validUntil = membershipType === "try_a_month" && subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : undefined;

        // Create or activate membership row
        await this.memberships.activateMembership({
          userId,
          membershipType,
          billingType: "monthly",
          stripeSubscriptionId: subscriptionId,
          validUntil,
        });

        await this.memberships.updateProfile(userId, membershipType, "active");

        // Send welcome email only on first activation
        if (isNew && email) {
          await this.email.membershipWelcome({
            to: email,
            name,
            membershipType,
            ...(validUntil ? { validUntil: new Date(validUntil).toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" }) } : {}),
          }).catch((err) =>
            this.logger.error(`Failed to send ${membershipType} welcome email`, err)
          );

          this.email.sendAdminNotification(
            "new_membership",
            `New ${membershipType === "try_a_month" ? "Monthly Membership" : "Farm Friend"} — ${name || email}`,
            `<p><strong>${name || "Someone"}</strong> (${email}) started a ${membershipType} membership.</p>`
          ).catch(() => {});
        }
      } else {
        // Look up userId from membership row
        const { data: membershipRow } = await this.supabase.client
          .from("memberships")
          .select("user_id")
          .eq("stripe_subscription_id", subscriptionId)
          .single();

        await this.supabase.client
          .from("memberships")
          .update({ status: "cancelled" as any })
          .eq("stripe_subscription_id", subscriptionId);

        if (membershipRow) {
          await this.memberships.updateProfile((membershipRow as any).user_id, "none", null);
          // For try_a_month subscriptions, keep membership active until valid_until rather than cancelling immediately
          // (already handled above via status: "cancelled" — valid_until remains in DB for reference)
        }
      }
    } catch (err) {
      this.logger.error(
        `Failed to handle subscription ${subscriptionId} change`,
        err
      );
    }
  }

  private async findOrCreateUser(email: string, name: string): Promise<string | null> {
    // Try to create user; if already exists, find their ID
    const { data, error } = await this.supabase.client.auth.admin.createUser({
      email,
      user_metadata: { full_name: name },
      email_confirm: true,
    });

    if (data?.user?.id) return data.user.id;

    // User already registered — find by iterating listUsers
    if (error) {
      const { data: listData } = await this.supabase.client.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      const existing = listData?.users?.find((u: any) => u.email === email);
      if (existing?.id) return existing.id;

      this.logger.error("Failed to find or create user", error);
    }

    return null;
  }
}
