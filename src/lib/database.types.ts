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
  status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_connect_account_id: string | null;
  stripe_account_id: string | null;
  subscription_status: string | null;
  trial_ends_at: string | null;
  price_min: number | null;
  price_max: number | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
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
};

export type ProProfileUpdate = Partial<ProProfileInsert> & {
  avatar_url?: string | null;
  cover_url?: string | null;
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
  trial_ends_at?: string | null;
  status?: string;
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
  style: string;
  image_url: string;
  storage_path: string | null;
  position: number;
  created_at: string;
};

export type ProScheduleRow = {
  id: string;
  user_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  created_at: string;
};

export type ProBlockedDateRow = {
  id: string;
  user_id: string;
  blocked_date: string;
  reason: string | null;
  created_at: string;
};

export type SizeCategory = "small" | "medium" | "large";

export type ProStyleDurationRow = {
  id: string;
  user_id: string;
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

export type BookingStatus = "pending" | "confirmed" | "cancelled";

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
  booking_date: string;
  duration_minutes: number;
  deposit_amount: number;
  deposit_paid: boolean;
  status: BookingStatus;
  cancellation_policy: CancellationPolicy;
  created_at: string;
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
          blocked_date: string;
          reason?: string | null;
          id?: string;
          created_at?: string;
        };
        Update: {
          blocked_date?: string;
          reason?: string | null;
        };
        Relationships: [];
      };
      pro_deposit_settings: {
        Row: ProDepositSettingsRow;
        Insert: {
          user_id: string;
          deposit_type?: DepositType;
          cancellation_policy?: CancellationPolicy;
          rules?: DepositRuleJson[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
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
          client_id?: string | null;
          client_email?: string | null;
          client_phone?: string | null;
          project_description?: string | null;
          style?: string | null;
          zone?: string | null;
          size?: string | null;
          reference_image_url?: string | null;
          duration_minutes?: number;
          deposit_amount?: number;
          deposit_paid?: boolean;
          status?: BookingStatus;
          cancellation_policy?: CancellationPolicy;
          id?: string;
          created_at?: string;
        };
        Update: {
          client_name?: string;
          client_id?: string | null;
          client_email?: string | null;
          client_phone?: string | null;
          project_description?: string | null;
          style?: string | null;
          zone?: string | null;
          size?: string | null;
          reference_image_url?: string | null;
          booking_date?: string;
          duration_minutes?: number;
          deposit_amount?: number;
          deposit_paid?: boolean;
          status?: BookingStatus;
          cancellation_policy?: CancellationPolicy;
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
