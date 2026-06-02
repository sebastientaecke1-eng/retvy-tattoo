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
  subscription_status: string | null;
  trial_ends_at: string | null;
  price_min: number | null;
  price_max: number | null;
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
  phone: string;
  styles: string[];
  slug: string;
  status?: string;
  bio?: string | null;
};

export type ProProfileUpdate = Partial<ProProfileInsert> & {
  stripe_connect_account_id?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  subscription_status?: string | null;
  trial_ends_at?: string | null;
  status?: string;
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
