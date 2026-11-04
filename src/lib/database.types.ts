export type AppRole = "client" | "pro" | "admin";

export type ProProfileRow = {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  artist_name: string;
  studio: string | null;
  city: string;
  address: string | null;
  postal_code: string | null;
  phone: string;
  styles: string[];
  slug: string;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  banner_video_url: string | null;
  hygiene_stamp_enabled: boolean | null;
  status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_connect_account_id: string | null;
  stripe_account_id: string | null;
  subscription_status: string | null;
  subscription_tier: "1" | "23" | "3plus" | "free" | "starter" | "pro" | "premium" | null;
  multi_artists_tier: "small" | "large" | null;
  trial_ends_at: string | null;
  price_min: number | null;
  price_max: number | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
  is_sub_profile: boolean;
  studio_owner_id: string | null;
  studio_slug: string | null;
  cancellation_24h_lock: boolean;
  music_url: string | null;
};

export type ProProfileInsert = {
  user_id: string;
  first_name: string;
  last_name: string;
  artist_name: string;
  studio?: string | null;
  city: string;
  address?: string | null;
  postal_code?: string | null;
  phone: string;
  styles: string[];
  slug: string;
  status?: string;
  bio?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  is_sub_profile?: boolean;
  studio_owner_id?: string | null;
};

export type ProProfileUpdate = Partial<ProProfileInsert> & {
  avatar_url?: string | null;
  cover_url?: string | null;
  banner_video_url?: string | null;
  hygiene_stamp_enabled?: boolean | null;
  price_min?: number | null;
  price_max?: number | null;
  postal_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  updated_at?: string;
  stripe_connect_account_id?: string | null;
  stripe_account_id?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  subscription_status?: string | null;
  subscription_tier?: "1" | "23" | "3plus" | "free" | "starter" | "pro" | "premium" | null;
  multi_artists_tier?: "small" | "large" | null;
  trial_ends_at?: string | null;
  status?: string;
  studio_slug?: string | null;
  cancellation_24h_lock?: boolean;
  music_url?: string | null;
};

export type ProStudioPhotoRow = {
  id: string;
  user_id: string;
  image_url: string;
  storage_path: string | null;
  position: number;
  created_at: string;
};

export type ProPortfolioRow = {
  id: string;
  user_id: string;
  profile_id: string | null;
  style: string;
  image_url: string;
  storage_path: string | null;
  position: number;
  created_at: string;
};

export type ProScheduleRow = {
  id: string;
  user_id: string;
  profile_id: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  created_at: string;
};

export type ProBlockedDateRow = {
  id: string;
  user_id: string;
  profile_id: string | null;
  blocked_date: string;
  reason: string | null;
  created_at: string;
};
export type ProProfileViewRow = {
  profile_id: string;
  view_date: string;
  count: number;
};

export type HygieneCategory = "formation" | "autoclave" | "desinfection" | "materiel" | "autre";

export type ProHygieneRecordRow = {
  id: string;
  user_id: string;
  profile_id: string | null;
  category: HygieneCategory;
  label: string;
  completed_at: string;
  expires_at: string | null;
  notes: string | null;
  created_at: string;
};

export type ProReferralCodeRow = {
  id: string;
  user_id: string;
  code: string;
  created_at: string;
};

export type ProReferralStatus = "pending" | "converted" | "rewarded";

export type ProReferralRow = {
  id: string;
  referrer_id: string;
  referred_id: string;
  code: string;
  status: ProReferralStatus;
  created_at: string;
};

export type ProBlockedSlotRow = {
  id: string;
  user_id: string;
  profile_id: string | null;
  slot_date: string;   // "YYYY-MM-DD"
  time_from: string;   // "HH:MM"
  time_to: string;     // "HH:MM"
  reason: string | null;
  created_at: string;
};

export type SizeCategory = "small" | "medium" | "large";

export type ProStyleDurationRow = {
  id: string;
  user_id: string;
  profile_id: string | null;
  style: string;
  size_category: SizeCategory;
  duration_min_minutes: number | null;
  duration_max_minutes: number | null;
  duration_minutes: number;
  created_at: string;
};

export type DepositType = "fixed" | "percent";
export type CancellationPolicy = "24h" | "48h" | "72h" | "non_refundable";

export type DepositRuleJson = {
  price_min: number;
  price_max: number | null;
  deposit_value: number;
};

export type ProDepositSettingsRow = {
  user_id: string;
  profile_id: string | null;
  deposit_enabled: boolean;
  deposit_type: DepositType;
  cancellation_policy: CancellationPolicy;
  rules: DepositRuleJson[];
  created_at: string;
  updated_at: string;
};

export type SketchStatus =
  | "pending"
  | "sent"
  | "approved"
  | "revision_requested";

export type BookingSketchRow = {
  id: string;
  booking_id: string;
  pro_user_id: string;
  client_email: string;
  sketch_url: string | null;
  storage_path: string | null;
  status: SketchStatus;
  client_comment: string | null;
  validation_token: string;
  created_at: string;
  updated_at: string;
};

export type SketchMessageRow = {
  id: string;
  booking_id: string;
  sender_role: "pro" | "client";
  message: string | null;
  image_url: string | null;
  created_at: string;
};

export type BookingStatus = "pending" | "confirmed" | "cancelled";

export type BookingCancelledBy = "pro" | "client";

export type BookingCancellationReason =
  | "pro_unavailability"
  | "client_request"
  | "pro_manual";

export type BookingClientAction = "pending" | "reschedule" | "declined";

export type BookingRefundAttemptTrigger =
  | "pro_block"
  | "client_cancel"
  | "admin_manual";

export type BookingRefundAttemptStatus = "pending" | "succeeded" | "failed";

export type BookingRefundStatus =
  | "none"
  | "pending"
  | "succeeded"
  | "failed"
  | "not_applicable";

export type StyleFamilyRow = {
  id: string;
  slug: string;
  label: string;
  display_order: number;
  created_at: string;
};

export type StyleRow = {
  id: string;
  family_id: string;
  slug: string;
  label: string;
  display_order: number;
  created_at: string;
};

export type ProStyleRow = {
  pro_id: string;
  style_id: string;
  created_at: string;
};

export type BookingRow = {
  id: string;
  user_id: string;
  client_id: string | null;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  project_description: string | null;
  style: string | null;
  zone: string | null;
  size: string | null;
  reference_image_url: string | null;
  color_preference: string | null;
  booking_date: string;
  slot_date: string;
  slot_time: string;
  duration_minutes: number;
  deposit_amount: number;
  deposit_paid: boolean;
  status: BookingStatus;
  cancellation_policy: CancellationPolicy;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  stripe_connect_account_id: string | null;
  refund_stripe_id: string | null;
  refund_status: BookingRefundStatus;
  refunded_at: string | null;
  cancelled_by: BookingCancelledBy | null;
  cancellation_reason: BookingCancellationReason | null;
  client_action: BookingClientAction | null;
  rescheduled_to_booking_id: string | null;
  rescheduled_from_booking_id: string | null;
  cancelled_at: string | null;
  created_at: string;
  pro_profile_id: string | null;
  artist_slug: string | null;
  artist_name: string | null;
  artist_studio: string | null;
};

export type BookingRefundAttemptRow = {
  id: string;
  booking_id: string;
  trigger: BookingRefundAttemptTrigger;
  amount_cents: number;
  currency: string;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  stripe_connect_account_id: string | null;
  stripe_refund_id: string | null;
  status: BookingRefundAttemptStatus;
  error_code: string | null;
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  completed_at: string | null;
};

export interface Database {
  public: {
    Tables: {
      pro_profiles: {
        Row: ProProfileRow;
        Insert: ProProfileInsert;
        Update: ProProfileUpdate;
        Relationships: [];
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role: AppRole;
          created_at: string;
        };
        Insert: {
          user_id: string;
          role: AppRole;
          id?: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          role?: AppRole;
        };
        Relationships: [];
      };
      pro_schedules: {
        Row: ProScheduleRow;
        Insert: {
          user_id: string;
          profile_id?: string | null;
          day_of_week: number;
          start_time: string;
          end_time: string;
          id?: string;
          created_at?: string;
        };
        Update: {
          day_of_week?: number;
          start_time?: string;
          end_time?: string;
        };
        Relationships: [];
      };
      pro_blocked_dates: {
        Row: ProBlockedDateRow;
        Insert: {
          user_id: string;
          profile_id?: string | null;
          blocked_date: string;
          reason?: string | null;
          id?: string;
          created_at?: string;
        };
        Update: {
          profile_id?: string | null;
          blocked_date?: string;
          reason?: string | null;
        };
        Relationships: [];
      };
      pro_hygiene_records: {
        Row: ProHygieneRecordRow;
        Insert: {
          user_id: string;
          category: HygieneCategory;
          label: string;
          completed_at: string;
          profile_id?: string | null;
          expires_at?: string | null;
          notes?: string | null;
          id?: string;
          created_at?: string;
        };
        Update: {
          category?: HygieneCategory;
          label?: string;
          completed_at?: string;
          expires_at?: string | null;
          notes?: string | null;
        };
        Relationships: [];
      };
      pro_referral_codes: {
        Row: ProReferralCodeRow;
        Insert: { user_id: string; code: string; id?: string; created_at?: string; };
        Update: { code?: string; };
        Relationships: [];
      };
      pro_referrals: {
        Row: ProReferralRow;
        Insert: { referrer_id: string; referred_id: string; code: string; status?: ProReferralStatus; id?: string; created_at?: string; };
        Update: { status?: ProReferralStatus; };
        Relationships: [];
      };
      pro_profile_views: {
        Row: ProProfileViewRow;
        Insert: {
          profile_id: string;
          view_date?: string;
          count?: number;
        };
        Update: {
          count?: number;
        };
        Relationships: [];
      };
      pro_blocked_slots: {
        Row: ProBlockedSlotRow;
        Insert: {
          user_id: string;
          profile_id?: string | null;
          slot_date: string;
          time_from: string;
          time_to: string;
          reason?: string | null;
          id?: string;
          created_at?: string;
        };
        Update: {
          profile_id?: string | null;
          slot_date?: string;
          time_from?: string;
          time_to?: string;
          reason?: string | null;
        };
        Relationships: [];
      };
      pro_deposit_settings: {
        Row: ProDepositSettingsRow;
        Insert: {
          user_id: string;
          profile_id?: string | null;
          deposit_enabled?: boolean;
          deposit_type?: DepositType;
          cancellation_policy?: CancellationPolicy;
          rules?: DepositRuleJson[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          profile_id?: string | null;
          deposit_enabled?: boolean;
          deposit_type?: DepositType;
          cancellation_policy?: CancellationPolicy;
          rules?: DepositRuleJson[];
          updated_at?: string;
        };
        Relationships: [];
      };
      pro_style_durations: {
        Row: ProStyleDurationRow;
        Insert: {
          user_id: string;
          profile_id?: string | null;
          style: string;
          duration_minutes: number;
          size_category?: SizeCategory;
          duration_min_minutes?: number | null;
          duration_max_minutes?: number | null;
          id?: string;
          created_at?: string;
        };
        Update: {
          duration_minutes?: number;
          size_category?: SizeCategory;
          duration_min_minutes?: number | null;
          duration_max_minutes?: number | null;
        };
        Relationships: [];
      };
      pro_studio_photos: {
        Row: ProStudioPhotoRow;
        Insert: {
          user_id: string;
          image_url: string;
          storage_path?: string | null;
          position?: number;
          id?: string;
          created_at?: string;
        };
        Update: {
          image_url?: string;
          position?: number;
        };
        Relationships: [];
      };
      pro_portfolio: {
        Row: ProPortfolioRow;
        Insert: {
          user_id: string;
          profile_id?: string | null;
          style: string;
          image_url: string;
          storage_path?: string | null;
          position?: number;
          id?: string;
          created_at?: string;
        };
        Update: {
          style?: string;
          image_url?: string;
          position?: number;
        };
        Relationships: [];
      };
      bookings: {
        Row: BookingRow;
        Insert: {
          user_id: string;
          client_name: string;
          booking_date: string;
          slot_date: string;
          slot_time: string;
          client_id?: string | null;
          pro_profile_id?: string | null;
          artist_slug?: string | null;
          artist_name?: string | null;
          artist_studio?: string | null;
          client_email?: string | null;
          client_phone?: string | null;
          project_description?: string | null;
          style?: string | null;
          zone?: string | null;
          size?: string | null;
          reference_image_url?: string | null;
          color_preference?: string | null;
          duration_minutes?: number;
          deposit_amount?: number;
          deposit_paid?: boolean;
          status?: BookingStatus;
          cancellation_policy?: CancellationPolicy;
          stripe_checkout_session_id?: string | null;
          stripe_payment_intent_id?: string | null;
          stripe_charge_id?: string | null;
          stripe_connect_account_id?: string | null;
          refund_stripe_id?: string | null;
          refund_status?: BookingRefundStatus;
          refunded_at?: string | null;
          cancelled_by?: BookingCancelledBy | null;
          cancellation_reason?: BookingCancellationReason | null;
          client_action?: BookingClientAction | null;
          rescheduled_to_booking_id?: string | null;
          rescheduled_from_booking_id?: string | null;
          cancelled_at?: string | null;
          id?: string;
          created_at?: string;
        };
        Update: {
          client_name?: string;
          client_id?: string | null;
          pro_profile_id?: string | null;
          artist_slug?: string | null;
          artist_name?: string | null;
          artist_studio?: string | null;
          client_email?: string | null;
          client_phone?: string | null;
          project_description?: string | null;
          style?: string | null;
          zone?: string | null;
          size?: string | null;
          reference_image_url?: string | null;
          color_preference?: string | null;
          booking_date?: string;
          slot_date?: string;
          slot_time?: string;
          duration_minutes?: number;
          deposit_amount?: number;
          deposit_paid?: boolean;
          status?: BookingStatus;
          cancellation_policy?: CancellationPolicy;
          stripe_checkout_session_id?: string | null;
          stripe_payment_intent_id?: string | null;
          stripe_charge_id?: string | null;
          stripe_connect_account_id?: string | null;
          refund_stripe_id?: string | null;
          refund_status?: BookingRefundStatus;
          refunded_at?: string | null;
          cancelled_by?: BookingCancelledBy | null;
          cancellation_reason?: BookingCancellationReason | null;
          client_action?: BookingClientAction | null;
          rescheduled_to_booking_id?: string | null;
          rescheduled_from_booking_id?: string | null;
          cancelled_at?: string | null;
        };
        Relationships: [];
      };
      booking_refund_attempts: {
        Row: BookingRefundAttemptRow;
        Insert: {
          booking_id: string;
          trigger: BookingRefundAttemptTrigger;
          amount_cents: number;
          currency?: string;
          stripe_payment_intent_id?: string | null;
          stripe_charge_id?: string | null;
          stripe_connect_account_id?: string | null;
          stripe_refund_id?: string | null;
          status: BookingRefundAttemptStatus;
          error_code?: string | null;
          error_message?: string | null;
          metadata?: Record<string, unknown>;
          id?: string;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          stripe_refund_id?: string | null;
          status?: BookingRefundAttemptStatus;
          error_code?: string | null;
          error_message?: string | null;
          metadata?: Record<string, unknown>;
          completed_at?: string | null;
        };
        Relationships: [];
      };
      bookings_sketches: {
        Row: BookingSketchRow;
        Insert: {
          booking_id: string;
          pro_user_id: string;
          client_email: string;
          validation_token: string;
          sketch_url?: string | null;
          storage_path?: string | null;
          status?: SketchStatus;
          client_comment?: string | null;
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          client_email?: string;
          sketch_url?: string | null;
          storage_path?: string | null;
          status?: SketchStatus;
          client_comment?: string | null;
          validation_token?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      sketch_messages: {
        Row: SketchMessageRow;
        Insert: {
          booking_id: string;
          sender_role: "pro" | "client";
          message?: string | null;
          image_url?: string | null;
          id?: string;
          created_at?: string;
        };
        Update: {
          message?: string | null;
          image_url?: string | null;
        };
        Relationships: [];
      };
      style_families: {
        Row: StyleFamilyRow;
        Insert: {
          slug: string;
          label: string;
          display_order?: number;
          id?: string;
          created_at?: string;
        };
        Update: {
          slug?: string;
          label?: string;
          display_order?: number;
        };
        Relationships: [];
      };
      styles: {
        Row: StyleRow;
        Insert: {
          family_id: string;
          slug: string;
          label: string;
          display_order?: number;
          id?: string;
          created_at?: string;
        };
        Update: {
          family_id?: string;
          slug?: string;
          label?: string;
          display_order?: number;
        };
        Relationships: [];
      };
      pro_styles: {
        Row: ProStyleRow;
        Insert: {
          pro_id: string;
          style_id: string;
          created_at?: string;
        };
        Update: {
          style_id?: string;
        };
        Relationships: [];
      };
      pro_pricing_settings: {
        Row: ProPricingSettingsRow;
        Insert: {
          user_id: string;
          profile_id?: string | null;
          size_small_min?: number;
          size_small_max?: number;
          size_medium_min?: number;
          size_medium_max?: number;
          size_large_min?: number;
          size_large_max?: number;
          color_enabled?: boolean;
          color_type?: "pct" | "fixed";
          color_amount?: number;
          style_multipliers?: Record<string, number>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          profile_id?: string | null;
          size_small_min?: number;
          size_small_max?: number;
          size_medium_min?: number;
          size_medium_max?: number;
          size_large_min?: number;
          size_large_max?: number;
          color_enabled?: boolean;
          color_type?: "pct" | "fixed";
          color_amount?: number;
          style_multipliers?: Record<string, number>;
          updated_at?: string;
        };
        Relationships: [];
      };
      stripe_events: {
        Row: {
          id: string;
          type: string;
          payload: unknown;
          processed_at: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          type: string;
          payload?: unknown;
          processed_at?: string | null;
        };
        Update: {
          processed_at?: string | null;
        };
        Relationships: [];
      };
      pro_reviews: {
        Row: ProReviewRow;
        Insert: ProReviewInsert;
        Update: Partial<ProReviewInsert>;
        Relationships: [];
      };
      pro_large_projects: {
        Row: ProLargeProjectRow;
        Insert: {
          user_id: string;
          title: string;
          client_name: string;
          profile_id?: string | null;
          description?: string | null;
          client_email?: string | null;
          total_sessions_planned?: number;
          status?: LargeProjectStatus;
          notes?: string | null;
          ai_summary?: string | null;
        };
        Update: Partial<ProLargeProjectRow>;
        Relationships: [];
      };
      pro_large_project_sessions: {
        Row: ProLargeProjectSessionRow;
        Insert: {
          project_id: string;
          session_number: number;
          status?: LargeProjectSessionStatus;
          booking_id?: string | null;
          session_date?: string | null;
          duration_minutes?: number | null;
          zone?: string | null;
          notes?: string | null;
        };
        Update: Partial<ProLargeProjectSessionRow>;
        Relationships: [];
      };
      booking_consents: {
        Row: {
          id: string;
          client_email: string;
          signer_name: string;
          signature: string;
          signed_at: string;
          booking_id: string | null;
          pro_slug: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_email: string;
          signer_name: string;
          signature: string;
          signed_at?: string;
          booking_id?: string | null;
          pro_slug?: string | null;
          created_at?: string;
        };
        Update: Partial<{
          id: string;
          client_email: string;
          signer_name: string;
          signature: string;
          signed_at: string;
          booking_id: string | null;
          pro_slug: string | null;
          created_at: string;
        }>;
        Relationships: [];
      };
    };
    Views: {
      pro_profiles_public: {
        Row: {
          user_id: string | null;
          artist_name: string | null;
          studio: string | null;
          city: string | null;
          bio: string | null;
          styles: string[] | null;
          slug: string | null;
          avatar_url: string | null;
          cover_url: string | null;
  banner_video_url: string | null;
          hygiene_stamp_enabled: boolean | null;
          latitude: number | null;
          longitude: number | null;
          price_min: number | null;
          price_max: number | null;
          status: string | null;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: {
      app_role: AppRole;
    };
  };
}

// ── Finance / Pricing ──────────────────────────────────────────────────────
export type ProPricingSettingsRow = {
  user_id: string;
  profile_id: string | null;
  size_small_min: number;
  size_small_max: number;
  size_medium_min: number;
  size_medium_max: number;
  size_large_min: number;
  size_large_max: number;
  color_enabled: boolean;
  color_type: "pct" | "fixed";
  color_amount: number;
  style_multipliers: Record<string, number>;
  flash_enabled: boolean;
  flash_price_min: number;
  flash_price_max: number;
  created_at: string;
  updated_at: string;
};

// ── Reviews ────────────────────────────────────────────────────────────────
export type ProReviewRow = {
  id: string;
  booking_id: string;
  client_id: string | null;
  pro_profile_id: string;
  rating: number; // 1–5
  comment: string | null;
  is_anonymous: boolean;
  created_at: string;
};

export type ProReviewInsert = {
  booking_id: string;
  client_id?: string | null;
  pro_profile_id: string;
  rating: number;
  comment?: string | null;
  is_anonymous?: boolean;
};

// ── Grands projets multi-séances (Feature 12 Premium) ─────────────────────
export type LargeProjectStatus = "in_progress" | "completed" | "cancelled" | "paused";
export type LargeProjectSessionStatus = "planned" | "done" | "missed";

export type ProLargeProjectRow = {
  id: string;
  user_id: string;
  profile_id: string | null;
  title: string;
  description: string | null;
  client_name: string;
  client_email: string | null;
  total_sessions_planned: number;
  status: LargeProjectStatus;
  notes: string | null;
  ai_summary: string | null;
  created_at: string;
  updated_at: string;
};

export type ProLargeProjectSessionRow = {
  id: string;
  project_id: string;
  session_number: number;
  booking_id: string | null;
  session_date: string | null;
  duration_minutes: number | null;
  zone: string | null;
  notes: string | null;
  status: LargeProjectSessionStatus;
  created_at: string;
};

