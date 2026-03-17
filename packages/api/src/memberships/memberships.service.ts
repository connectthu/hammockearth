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
import type { CreateMembershipCheckoutDto } from "./dto/create-membership-checkout.dto";

@Injectable()
export class MembershipsService {
  private readonly logger = new Logger(MembershipsService.name);

  constructor(
    private supabase: SupabaseService,
    private stripe: StripeService,
    private email: EmailService,
    private config: ConfigService
  ) {}

  async checkout(dto: CreateMembershipCheckoutDto, userId: string) {
    if (dto.membershipType === "season_pass") {
      return this.checkoutSeasonPass(dto, userId);
    }
    return this.checkoutFarmFriend(dto, userId);
  }

  private async checkoutSeasonPass(
    dto: CreateMembershipCheckoutDto,
    userId: string
  ) {
    if (!dto.priceWindowSlug) {
      throw new BadRequestException("priceWindowSlug is required for season_pass");
    }

    // 1. Fetch price window
    const { data: windowData, error: windowError } =
      await this.supabase.client
        .from("membership_price_windows")
        .select("*")
        .eq("slug", dto.priceWindowSlug)
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

    // 3. Get or create Stripe customer
    const customerId = await this.getOrCreateCustomer(userId, dto.email, dto.name);

    // 4. Create PaymentIntent (DB row created by webhook on success)
    const paymentIntent = await this.stripe.createPaymentIntent(
      window.price_cents,
      {
        type: "season_pass",
        userId,
        priceWindowSlug: dto.priceWindowSlug,
        name: dto.name,
        email: dto.email,
      }
    );

    return {
      clientSecret: paymentIntent.client_secret,
      amountCents: window.price_cents,
    };
  }

  private async checkoutFarmFriend(
    dto: CreateMembershipCheckoutDto,
    userId: string
  ) {
    const priceId = this.config.get<string>("STRIPE_FARM_FRIEND_PRICE_ID");
    if (!priceId) {
      throw new BadRequestException("Farm Friend price not configured");
    }

    // 1. Check for existing active subscription
    const { data: existing } = await this.supabase.client
      .from("memberships")
      .select("id, status")
      .eq("user_id", userId)
      .eq("membership_type", "farm_friend")
      .eq("status", "active" as any)
      .limit(1)
      .single();

    if (existing) {
      throw new BadRequestException("You already have an active Farm Friend membership");
    }

    // 2. Get or create Stripe customer
    const customerId = await this.getOrCreateCustomer(userId, dto.email, dto.name);

    // 3. Create subscription (DB row created by webhook on activation)
    const subscription = await this.stripe.createSubscription(customerId, priceId, {
      type: "farm_friend",
      userId,
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

  async activateMembership(opts: {
    userId: string;
    membershipType: "season_pass" | "farm_friend";
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

  private async getOrCreateCustomer(
    userId: string,
    email: string,
    name: string
  ): Promise<string> {
    // Check if profile already has a customer ID
    const { data: profileData } = await this.supabase.client
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", userId)
      .single();

    const profile = profileData as any;
    if (profile?.stripe_customer_id) {
      return profile.stripe_customer_id;
    }

    // Create new customer
    const customer = await this.stripe.createCustomer(email, {
      userId,
      name,
    });

    // Save to profile
    await this.supabase.client
      .from("profiles")
      .update({ stripe_customer_id: customer.id })
      .eq("id", userId);

    return customer.id;
  }
}
