export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type MembershipType =
  | "none"
  | "farm_friend"
  | "season_pass"
  | "try_a_month"
  | "community_partner";

export type MembershipStatus = "active" | "cancelled" | "expired";

export type PriceWindow = "founding" | "early_bird" | "regular";

export type EventVisibility = "public" | "members_only";

export type EventStatus = "draft" | "published" | "cancelled";

export type RegistrationStatus = "confirmed" | "waitlisted" | "cancelled";

export type ContentType =
  | "recipe"
  | "homesteading"
  | "nervous_system"
  | "meditation"
  | "guide";

export type ContentVisibility = "public" | "members_only";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          role: "user" | "admin";
          membership_type: MembershipType;
          membership_status: MembershipStatus | null;
          stripe_customer_id: string | null;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["profiles"]["Row"],
          "created_at"
        >;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      events: {
        Row: {
          id: string;
          title: string;
          slug: string;
          description: string | null;
          event_type: string | null;
          cover_image_url: string | null;
          start_at: string;
          end_at: string | null;
          location: string;
          is_online: boolean;
          capacity: number | null;
          price_cents: number;
          member_price_cents: number;
          member_ticket_allowance: number;
          visibility: EventVisibility;
          status: EventStatus;
          registration_url: string | null;
          registration_note: string | null;
          tags: string[];
          created_by: string | null;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["events"]["Row"],
          "id" | "created_at"
        >;
        Update: Partial<Database["public"]["Tables"]["events"]["Insert"]>;
      };
      event_registrations: {
        Row: {
          id: string;
          event_id: string;
          user_id: string;
          quantity: number;
          stripe_payment_intent_id: string | null;
          status: RegistrationStatus;
          discount_code_id: string | null;
          amount_paid_cents: number;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["event_registrations"]["Row"],
          "id" | "created_at"
        >;
        Update: Partial<
          Database["public"]["Tables"]["event_registrations"]["Insert"]
        >;
      };
      memberships: {
        Row: {
          id: string;
          user_id: string;
          membership_type: Exclude<MembershipType, "none">;
          price_window: PriceWindow | null;
          billing_type: "one_time" | "monthly";
          stripe_payment_id: string | null;
          stripe_subscription_id: string | null;
          status: MembershipStatus;
          valid_from: string;
          valid_until: string | null;
          trial_credited: boolean;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["memberships"]["Row"],
          "id" | "created_at"
        >;
        Update: Partial<
          Database["public"]["Tables"]["memberships"]["Insert"]
        >;
      };
      membership_price_windows: {
        Row: {
          id: string;
          slug: PriceWindow;
          label: string;
          price_cents: number;
          max_spots: number | null;
          spots_taken: number;
          status: "open" | "sold_out" | "closed";
          closes_at: string | null;
          stripe_price_id: string | null;
        };
        Insert: Omit<
          Database["public"]["Tables"]["membership_price_windows"]["Row"],
          "id"
        >;
        Update: Partial<
          Database["public"]["Tables"]["membership_price_windows"]["Insert"]
        >;
      };
      discount_codes: {
        Row: {
          id: string;
          code: string;
          description: string | null;
          discount_type: "percent" | "fixed";
          discount_value: number;
          max_uses: number | null;
          used_count: number;
          valid_from: string;
          valid_until: string | null;
          members_only: boolean;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["discount_codes"]["Row"],
          "id" | "created_at"
        >;
        Update: Partial<
          Database["public"]["Tables"]["discount_codes"]["Insert"]
        >;
      };
      content_library: {
        Row: {
          id: string;
          title: string;
          slug: string;
          summary: string | null;
          body: string | null;
          cover_image_url: string | null;
          content_type: ContentType;
          media_url: string | null;
          media_kind: "video" | "audio" | "pdf" | null;
          visibility: ContentVisibility;
          tags: string[];
          published_at: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["content_library"]["Row"],
          "id" | "created_at"
        >;
        Update: Partial<
          Database["public"]["Tables"]["content_library"]["Insert"]
        >;
      };
      facilitator_inquiries: {
        Row: {
          id: string;
          name: string;
          email: string;
          message: string;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["facilitator_inquiries"]["Row"],
          "id" | "created_at"
        >;
        Update: Partial<
          Database["public"]["Tables"]["facilitator_inquiries"]["Insert"]
        >;
      };
      waitlist_signups: {
        Row: {
          id: string;
          email: string;
          first_name: string | null;
          source: string;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["waitlist_signups"]["Row"],
          "id" | "created_at"
        >;
        Update: Partial<
          Database["public"]["Tables"]["waitlist_signups"]["Insert"]
        >;
      };
    };
  };
}

// Convenience row types
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Event = Database["public"]["Tables"]["events"]["Row"];
export type EventRegistration =
  Database["public"]["Tables"]["event_registrations"]["Row"];
export type Membership = Database["public"]["Tables"]["memberships"]["Row"];
export type MembershipPriceWindow =
  Database["public"]["Tables"]["membership_price_windows"]["Row"];
export type DiscountCode =
  Database["public"]["Tables"]["discount_codes"]["Row"];
export type ContentItem =
  Database["public"]["Tables"]["content_library"]["Row"];
export type FacilitatorInquiry =
  Database["public"]["Tables"]["facilitator_inquiries"]["Row"];
export type WaitlistSignup =
  Database["public"]["Tables"]["waitlist_signups"]["Row"];
