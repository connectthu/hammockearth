export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ============================================================
// Enum types (matching DB check constraints / enum types)
// ============================================================

export type MembershipType =
  | "none"
  | "farm_friend"
  | "season_pass"
  | "try_a_month"
  | "community_partner";

export type MembershipStatus = "active" | "cancelled" | "expired";
export type PriceWindow = "founding" | "early_bird" | "regular";
export type PriceWindowStatus = "open" | "sold_out" | "closed";
export type BillingType = "one_time" | "monthly";
export type EventVisibility = "public" | "members_only";
export type EventStatus = "draft" | "published" | "cancelled";
export type RegistrationStatus = "pending" | "confirmed" | "waitlisted" | "cancelled";
export type ContentType =
  | "recipe"
  | "homesteading"
  | "nervous_system"
  | "meditation"
  | "guide";
export type ContentVisibility = "public" | "members_only";
export type DiscountType = "percent" | "fixed";
export type MediaKind = "video" | "audio" | "pdf";
export type UserRole = "user" | "admin";

// ============================================================
// Database type (matches @supabase/supabase-js v2 shape)
// ============================================================

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          role: UserRole;
          membership_type: MembershipType;
          membership_status: MembershipStatus | null;
          stripe_customer_id: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          membership_type?: MembershipType;
          membership_status?: MembershipStatus | null;
          stripe_customer_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          membership_type?: MembershipType;
          membership_status?: MembershipStatus | null;
          stripe_customer_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
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
          confirmation_details: string | null;
          tags: string[];
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          slug: string;
          description?: string | null;
          event_type?: string | null;
          cover_image_url?: string | null;
          start_at: string;
          end_at?: string | null;
          location: string;
          is_online?: boolean;
          capacity?: number | null;
          price_cents?: number;
          member_price_cents?: number;
          member_ticket_allowance?: number;
          visibility?: EventVisibility;
          status?: EventStatus;
          registration_url?: string | null;
          registration_note?: string | null;
          confirmation_details?: string | null;
          tags?: string[];
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          slug?: string;
          description?: string | null;
          event_type?: string | null;
          cover_image_url?: string | null;
          start_at?: string;
          end_at?: string | null;
          location?: string;
          is_online?: boolean;
          capacity?: number | null;
          price_cents?: number;
          member_price_cents?: number;
          member_ticket_allowance?: number;
          visibility?: EventVisibility;
          status?: EventStatus;
          registration_url?: string | null;
          registration_note?: string | null;
          confirmation_details?: string | null;
          tags?: string[];
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      event_series: {
        Row: {
          id: string;
          title: string;
          slug: string;
          description: string | null;
          cover_image_url: string | null;
          is_online: boolean;
          location: string | null;
          duration_weeks: number;
          session_count: number;
          price_cents: number;
          member_price_cents: number;
          drop_in_enabled: boolean;
          drop_in_price_cents: number | null;
          drop_in_member_price_cents: number | null;
          visibility: EventVisibility;
          status: EventStatus;
          tags: string[];
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          slug: string;
          description?: string | null;
          cover_image_url?: string | null;
          is_online?: boolean;
          location?: string | null;
          duration_weeks: number;
          session_count: number;
          price_cents?: number;
          member_price_cents?: number;
          drop_in_enabled?: boolean;
          drop_in_price_cents?: number | null;
          drop_in_member_price_cents?: number | null;
          visibility?: EventVisibility;
          status?: EventStatus;
          tags?: string[];
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          slug?: string;
          description?: string | null;
          cover_image_url?: string | null;
          is_online?: boolean;
          location?: string | null;
          duration_weeks?: number;
          session_count?: number;
          price_cents?: number;
          member_price_cents?: number;
          drop_in_enabled?: boolean;
          drop_in_price_cents?: number | null;
          drop_in_member_price_cents?: number | null;
          visibility?: EventVisibility;
          status?: EventStatus;
          tags?: string[];
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      event_series_sessions: {
        Row: {
          id: string;
          series_id: string;
          title: string | null;
          session_number: number;
          start_at: string;
          end_at: string;
          location: string | null;
          meeting_url: string | null;
          capacity: number | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          series_id: string;
          title?: string | null;
          session_number: number;
          start_at: string;
          end_at: string;
          location?: string | null;
          meeting_url?: string | null;
          capacity?: number | null;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          series_id?: string;
          title?: string | null;
          session_number?: number;
          start_at?: string;
          end_at?: string;
          location?: string | null;
          meeting_url?: string | null;
          capacity?: number | null;
          status?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      event_registrations: {
        Row: {
          id: string;
          event_id: string | null;
          series_id: string | null;
          session_id: string | null;
          registration_type: "single_event" | "full_series" | "drop_in_session";
          user_id: string | null;
          quantity: number;
          stripe_payment_intent_id: string | null;
          status: RegistrationStatus;
          discount_code_id: string | null;
          amount_paid_cents: number;
          guest_name: string | null;
          guest_email: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id?: string | null;
          series_id?: string | null;
          session_id?: string | null;
          registration_type?: "single_event" | "full_series" | "drop_in_session";
          user_id?: string | null;
          quantity?: number;
          stripe_payment_intent_id?: string | null;
          status?: RegistrationStatus;
          discount_code_id?: string | null;
          amount_paid_cents?: number;
          guest_name?: string | null;
          guest_email?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string | null;
          series_id?: string | null;
          session_id?: string | null;
          registration_type?: "single_event" | "full_series" | "drop_in_session";
          user_id?: string | null;
          quantity?: number;
          stripe_payment_intent_id?: string | null;
          status?: RegistrationStatus;
          discount_code_id?: string | null;
          amount_paid_cents?: number;
          guest_name?: string | null;
          guest_email?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey";
            columns: ["event_id"];
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_registrations_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      memberships: {
        Row: {
          id: string;
          user_id: string;
          membership_type: Exclude<MembershipType, "none">;
          price_window: PriceWindow | null;
          billing_type: BillingType;
          stripe_payment_id: string | null;
          stripe_subscription_id: string | null;
          status: MembershipStatus;
          valid_from: string;
          valid_until: string | null;
          trial_credited: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          membership_type: Exclude<MembershipType, "none">;
          price_window?: PriceWindow | null;
          billing_type: BillingType;
          stripe_payment_id?: string | null;
          stripe_subscription_id?: string | null;
          status?: MembershipStatus;
          valid_from?: string;
          valid_until?: string | null;
          trial_credited?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          membership_type?: Exclude<MembershipType, "none">;
          price_window?: PriceWindow | null;
          billing_type?: BillingType;
          stripe_payment_id?: string | null;
          stripe_subscription_id?: string | null;
          status?: MembershipStatus;
          valid_from?: string;
          valid_until?: string | null;
          trial_credited?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "memberships_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      membership_price_windows: {
        Row: {
          id: string;
          slug: PriceWindow;
          label: string;
          price_cents: number;
          max_spots: number | null;
          spots_taken: number;
          status: PriceWindowStatus;
          closes_at: string | null;
          stripe_price_id: string | null;
        };
        Insert: {
          id?: string;
          slug: PriceWindow;
          label: string;
          price_cents: number;
          max_spots?: number | null;
          spots_taken?: number;
          status?: PriceWindowStatus;
          closes_at?: string | null;
          stripe_price_id?: string | null;
        };
        Update: {
          id?: string;
          slug?: PriceWindow;
          label?: string;
          price_cents?: number;
          max_spots?: number | null;
          spots_taken?: number;
          status?: PriceWindowStatus;
          closes_at?: string | null;
          stripe_price_id?: string | null;
        };
        Relationships: [];
      };
      discount_codes: {
        Row: {
          id: string;
          code: string;
          description: string | null;
          discount_type: DiscountType;
          discount_value: number;
          max_uses: number | null;
          used_count: number;
          valid_from: string;
          valid_until: string | null;
          members_only: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          description?: string | null;
          discount_type: DiscountType;
          discount_value: number;
          max_uses?: number | null;
          used_count?: number;
          valid_from?: string;
          valid_until?: string | null;
          members_only?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          description?: string | null;
          discount_type?: DiscountType;
          discount_value?: number;
          max_uses?: number | null;
          used_count?: number;
          valid_from?: string;
          valid_until?: string | null;
          members_only?: boolean;
          created_at?: string;
        };
        Relationships: [];
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
          media_kind: MediaKind | null;
          visibility: ContentVisibility;
          tags: string[];
          published_at: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          slug: string;
          summary?: string | null;
          body?: string | null;
          cover_image_url?: string | null;
          content_type: ContentType;
          media_url?: string | null;
          media_kind?: MediaKind | null;
          visibility?: ContentVisibility;
          tags?: string[];
          published_at?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          slug?: string;
          summary?: string | null;
          body?: string | null;
          cover_image_url?: string | null;
          content_type?: ContentType;
          media_url?: string | null;
          media_kind?: MediaKind | null;
          visibility?: ContentVisibility;
          tags?: string[];
          published_at?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "content_library_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      facilitator_inquiries: {
        Row: {
          id: string;
          name: string;
          email: string;
          message: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          message: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          message?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      waitlist_signups: {
        Row: {
          id: string;
          email: string;
          first_name: string | null;
          source: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          first_name?: string | null;
          source?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          first_name?: string | null;
          source?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      event_capacity: {
        Row: {
          event_id: string;
          slug: string;
          capacity: number | null;
          tickets_sold: number;
          spots_remaining: number | null;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: {
      membership_type_enum: MembershipType;
      membership_status_enum: MembershipStatus;
      price_window_enum: PriceWindow;
      billing_type_enum: BillingType;
      event_visibility_enum: EventVisibility;
      event_status_enum: EventStatus;
      registration_status_enum: RegistrationStatus;
      content_type_enum: ContentType;
      content_visibility_enum: ContentVisibility;
      discount_type_enum: DiscountType;
      price_window_status_enum: PriceWindowStatus;
      media_kind_enum: MediaKind;
    };
    CompositeTypes: Record<string, never>;
  };
};

// ============================================================
// Convenience row types
// ============================================================

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Event = Database["public"]["Tables"]["events"]["Row"];
export type EventInsert = Database["public"]["Tables"]["events"]["Insert"];
export type EventUpdate = Database["public"]["Tables"]["events"]["Update"];
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
export type EventCapacity =
  Database["public"]["Views"]["event_capacity"]["Row"];
export type EventSeries =
  Database["public"]["Tables"]["event_series"]["Row"];
export type EventSeriesInsert =
  Database["public"]["Tables"]["event_series"]["Insert"];
export type EventSeriesSession =
  Database["public"]["Tables"]["event_series_sessions"]["Row"];
export type EventSeriesSessionInsert =
  Database["public"]["Tables"]["event_series_sessions"]["Insert"];
