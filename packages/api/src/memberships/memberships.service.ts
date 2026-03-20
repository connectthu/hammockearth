import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SupabaseService } from "../supabase/supabase.service";
import { StripeService } from "../stripe/stripe.service";
import { EmailService } from "../email/email.service";
import { DiscountCodesService } from "../discount-codes/discount-codes.service";
import type { CreateMembershipCheckoutDto } from "./dto/create-membership-checkout.dto";

@Injectable()
export class MembershipsService {
  private readonly logger = new Logger(MembershipsService.name);

  constructor(
    private supabase: SupabaseService,
    private stripe: StripeService,
    private email: EmailService,
    private config: ConfigService,
    private discountCodes: DiscountCodesService
  ) {}

  async checkout(dto: CreateMembershipCheckoutDto) {
    if (dto.membershipType === "season_pass") {
      return this.checkoutSeasonPass(dto);
    }
    if (dto.membershipType === "try_a_month") {
      return this.checkoutTryAMonth(dto);
    }
    return this.checkoutFarmFriend(dto);
  }

  private async checkoutSeasonPass(dto: CreateMembershipCheckoutDto) {
    if (!dto.priceWindowSlug) {
      throw new BadRequestException("priceWindowSlug is required for season_pass");
    }

    // 1. Fetch price window
    const { data: windowData, error: windowError } =
      await this.supabase.client
        .from("membership_price_windows")
        .select("*")
        .eq("slug", dto.priceWindowSlug as any)
        .single();

    if (windowError || !windowData) {
      throw new NotFoundException("Price window not found");
    }
    const window = windowData as any;

    if (window.status !== "open") {
      throw new BadRequestException("This price window is closed");
    }

    // 2. Check spots
    if (window.max_spots !== null && window.spots_taken >= window.max_spots) {
      throw new BadRequestException("This price window is sold out");
    }

    // 3. Apply discount code if provided
    let amountCents = window.price_cents;
    let discountCodeId: string | undefined;
    if (dto.discountCode) {
      const dc = await this.discountCodes.validate(dto.discountCode);
      const discountAmount = this.discountCodes.calculateDiscount(window.price_cents, 1, dc);
      amountCents = Math.max(0, window.price_cents - discountAmount);
      discountCodeId = dc.id;
    }

    // 4. Free membership — skip Stripe entirely
    if (amountCents === 0) {
      if (discountCodeId) await this.discountCodes.incrementUsedCount(discountCodeId);

      const userId = await this.findOrCreateUser(dto.email, dto.name);
      if (!userId) throw new BadRequestException("Failed to create account");

      const validUntil = new Date("2026-12-31T23:59:59Z").toISOString();
      await this.activateMembership({
        userId,
        membershipType: "season_pass",
        billingType: "one_time",
        priceWindowSlug: dto.priceWindowSlug,
        validUntil,
      });

      await this.incrementSpotsTaken(dto.priceWindowSlug!);
      await this.updateProfile(userId, "season_pass", "active");

      await this.email.membershipWelcome({
        to: dto.email,
        name: dto.name,
        membershipType: "season_pass",
        validUntil: "December 31, 2026",
      }).catch((err) => this.logger.error("Failed to send welcome email", err));

      return { free: true };
    }

    // 5. Create PaymentIntent (DB row created by webhook on success)
    const paymentIntent = await this.stripe.createPaymentIntent(
      amountCents,
      {
        type: "season_pass",
        priceWindowSlug: dto.priceWindowSlug,
        name: dto.name,
        email: dto.email,
        ...(discountCodeId ? { discountCodeId } : {}),
      }
    );

    if (discountCodeId) {
      await this.discountCodes.incrementUsedCount(discountCodeId);
    }

    return {
      clientSecret: paymentIntent.client_secret,
      amountCents,
    };
  }

  private async checkoutFarmFriend(dto: CreateMembershipCheckoutDto) {
    const priceId = this.config.get<string>("STRIPE_FARM_FRIEND_PRICE_ID");
    if (!priceId) {
      throw new BadRequestException("Farm Friend price not configured");
    }

    // 1. Create Stripe customer
    const customer = await this.stripe.createCustomer(dto.email, { name: dto.name });

    // 2. Create subscription (DB row created by webhook on activation)
    const subscription = await this.stripe.createSubscription(customer.id, priceId, {
      type: "farm_friend",
      name: dto.name,
      email: dto.email,
    });

    const clientSecret =
      subscription.latest_invoice?.payment_intent?.client_secret;

    if (!clientSecret) {
      throw new BadRequestException("Failed to create subscription payment intent");
    }

    return {
      clientSecret,
      amountCents: 1000, // $10 CAD
    };
  }

  private async checkoutTryAMonth(dto: CreateMembershipCheckoutDto) {
    const isRecurring = dto.billingMode === "recurring";

    if (isRecurring) {
      const priceId = this.config.get<string>("STRIPE_TRY_A_MONTH_RECURRING_PRICE_ID");
      if (!priceId) throw new BadRequestException("Monthly membership price not configured");

      const customer = await this.stripe.createCustomer(dto.email, { name: dto.name });
      const subscription = await this.stripe.createSubscription(customer.id, priceId, {
        type: "try_a_month",
        billingMode: "recurring",
        name: dto.name,
        email: dto.email,
      });

      const clientSecret = subscription.latest_invoice?.payment_intent?.client_secret;
      if (!clientSecret) throw new BadRequestException("Failed to create subscription payment intent");

      return { clientSecret, amountCents: 14000 };
    }

    // One-time $150
    const paymentIntent = await this.stripe.createPaymentIntent(15000, {
      type: "try_a_month",
      billingMode: "one_time",
      name: dto.name,
      email: dto.email,
    });

    return { clientSecret: paymentIntent.client_secret, amountCents: 15000 };
  }

  async renewTryAMonth(userId: string): Promise<{ clientSecret: string; amountCents: number }> {
    // Fetch current membership to know the current valid_until
    const { data: membershipData } = await this.supabase.client
      .from("memberships")
      .select("valid_until")
      .eq("user_id", userId)
      .eq("membership_type", "try_a_month" as any)
      .in("status", ["active", "expired"] as any)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const currentValidUntil = (membershipData as any)?.valid_until ?? null;

    const paymentIntent = await this.stripe.createPaymentIntent(15000, {
      type: "try_a_month_renewal",
      userId,
      currentValidUntil: currentValidUntil ?? "",
    });

    return { clientSecret: paymentIntent.client_secret!, amountCents: 15000 };
  }

  async cancelTryAMonthAutoRenew(userId: string): Promise<{ success: boolean }> {
    const { data: membershipData } = await this.supabase.client
      .from("memberships")
      .select("id, stripe_subscription_id")
      .eq("user_id", userId)
      .eq("membership_type", "try_a_month" as any)
      .eq("billing_type", "monthly" as any)
      .eq("status", "active" as any)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!membershipData) throw new NotFoundException("No active monthly membership found");
    const membership = membershipData as any;
    if (!membership.stripe_subscription_id) throw new BadRequestException("No subscription ID found");

    await this.stripe.cancelSubscription(membership.stripe_subscription_id);

    await this.supabase.client
      .from("memberships")
      .update({ status: "cancelled" as any })
      .eq("id", membership.id);

    await this.updateProfile(userId, "none", null);

    return { success: true };
  }

  async activateMembership(opts: {
    userId: string;
    membershipType: "season_pass" | "farm_friend" | "try_a_month";
    billingType: "one_time" | "monthly";
    priceWindowSlug?: string;
    stripePaymentId?: string;
    stripeSubscriptionId?: string;
    validUntil?: string;
  }) {
    // For subscriptions, check if we already have a row to update
    if (opts.stripeSubscriptionId) {
      const { data: existing } = await this.supabase.client
        .from("memberships")
        .select("id")
        .eq("stripe_subscription_id", opts.stripeSubscriptionId)
        .single();

      if (existing) {
        const { data, error } = await this.supabase.client
          .from("memberships")
          .update({ status: "active" as any })
          .eq("id", (existing as any).id)
          .select()
          .single();
        if (error) this.logger.error("Failed to update membership", error);
        return data as any;
      }
    }

    // Insert new row
    const { data, error } = await this.supabase.client
      .from("memberships")
      .insert({
        user_id: opts.userId,
        membership_type: opts.membershipType,
        billing_type: opts.billingType as any,
        price_window: (opts.priceWindowSlug ?? null) as any,
        status: "active" as any,
        valid_from: new Date().toISOString(),
        valid_until: opts.validUntil ?? null,
        stripe_payment_id: opts.stripePaymentId ?? null,
        stripe_subscription_id: opts.stripeSubscriptionId ?? null,
      })
      .select()
      .single();

    if (error) {
      this.logger.error("Failed to insert membership", error);
    }
    return data as any;
  }

  async findByUserId(userId: string) {
    const { data } = await this.supabase.client
      .from("memberships")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active" as any)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    return data as any;
  }

  async cancel(userId: string) {
    // Find active farm_friend membership
    const { data: membershipData } = await this.supabase.client
      .from("memberships")
      .select("*")
      .eq("user_id", userId)
      .eq("membership_type", "farm_friend")
      .eq("status", "active" as any)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!membershipData) {
      throw new NotFoundException("No active Farm Friend membership found");
    }
    const membership = membershipData as any;

    if (!membership.stripe_subscription_id) {
      throw new BadRequestException("No subscription ID found");
    }

    // Cancel in Stripe
    await this.stripe.cancelSubscription(membership.stripe_subscription_id);

    // Update DB immediately
    await this.supabase.client
      .from("memberships")
      .update({ status: "cancelled" as any })
      .eq("id", membership.id);

    // Update profile
    await this.updateProfile(userId, "none", null);

    return { success: true };
  }

  async findAll() {
    const { data } = await this.supabase.client
      .from("memberships")
      .select("*, profiles(full_name, avatar_url)")
      .order("created_at", { ascending: false });

    return data ?? [];
  }

  async findAllUsers() {
    const { data: listData } = await this.supabase.client.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    const authUsers = listData?.users ?? [];

    const { data: profilesData } = await this.supabase.client
      .from("profiles")
      .select("id, full_name, username, role, membership_type, membership_status");
    const profiles = profilesData ?? [];
    const profileMap = new Map((profiles as any[]).map((p) => [p.id, p]));

    const users = authUsers.map((u: any) => {
      const profile = profileMap.get(u.id) as any;
      return {
        id: u.id,
        email: u.email,
        full_name: profile?.full_name ?? null,
        username: profile?.username ?? null,
        role: profile?.role ?? "genpop",
        membership_type: profile?.membership_type ?? null,
        membership_status: profile?.membership_status ?? null,
        created_at: u.created_at,
      };
    });

    return users.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  async updateStatus(id: string, status: string) {
    const { data, error } = await this.supabase.client
      .from("memberships")
      .update({ status: status as any })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateProfile(
    userId: string,
    membershipType: string,
    membershipStatus: string | null
  ) {
    const update: Record<string, any> = { membership_type: membershipType };
    if (membershipStatus !== null) {
      update.membership_status = membershipStatus;
    }

    const { error } = await this.supabase.client
      .from("profiles")
      .update(update)
      .eq("id", userId);

    if (error) {
      this.logger.error("Failed to update profile membership", error);
    }
  }

  private async findOrCreateUser(email: string, name: string): Promise<string | null> {
    const { data, error } = await this.supabase.client.auth.admin.createUser({
      email,
      user_metadata: { full_name: name },
      email_confirm: true,
    });

    if (data?.user?.id) return data.user.id;

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

  private async incrementSpotsTaken(priceWindowSlug: string): Promise<void> {
    const { data } = await this.supabase.client
      .from("membership_price_windows")
      .select("spots_taken")
      .eq("slug", priceWindowSlug as any)
      .single();
    if (data) {
      await this.supabase.client
        .from("membership_price_windows")
        .update({ spots_taken: (data as any).spots_taken + 1 })
        .eq("slug", priceWindowSlug as any);
    }
  }
}
