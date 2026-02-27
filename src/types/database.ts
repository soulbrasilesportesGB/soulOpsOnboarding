export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          user_id: string;
          email: string;
          full_name: string | null;
          created_at_portal: string;
          updated_at_portal: string;
        };
        Insert: {
          user_id: string;
          email: string;
          full_name?: string | null;
          created_at_portal?: string;
          updated_at_portal?: string;
        };
        Update: {
          user_id?: string;
          email?: string;
          full_name?: string | null;
          created_at_portal?: string;
          updated_at_portal?: string;
        };
      };
      onboarding: {
        Row: {
          id: string;
          user_id: string;
          profile_kind: string;
          entity_type: string | null;
          completion_score: number;
          completion_status: string;
          missing_fields: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          profile_kind: string;
          entity_type?: string | null;
          completion_score?: number;
          completion_status?: string;
          missing_fields?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          profile_kind?: string;
          entity_type?: string | null;
          completion_score?: number;
          completion_status?: string;
          missing_fields?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
      };
      outreach: {
        Row: {
          id: string;
          user_id: string;
          channel: string;
          outcome: string | null;
          notes: string | null;
          created_at: string;
          next_followup_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          channel: string;
          outcome?: string | null;
          notes?: string | null;
          created_at?: string;
          next_followup_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          channel?: string;
          outcome?: string | null;
          notes?: string | null;
          created_at?: string;
          next_followup_at?: string | null;
        };
      };
    };
  };
}

export type User = Database['public']['Tables']['users']['Row'];
export type Onboarding = Database['public']['Tables']['onboarding']['Row'];
export type Outreach = Database['public']['Tables']['outreach']['Row'];
