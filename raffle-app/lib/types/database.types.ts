// Hand-authored to match db/init.sql (plain PostgreSQL schema).
// AnimationSpeed and the other exported types are still used across the
// app; the Database interface below is now mostly historical documentation
// since queries go through lib/db.ts (raw SQL) instead of a typed client.

export type RaffleEventStatus = "draft" | "in_progress" | "completed" | "archived";
export type RaffleActionType = "draw" | "redraw" | "skip" | "reset";
export type AnimationSpeed = "slow" | "normal" | "fast";

export interface Database {
  public: {
    Tables: {
      admin_users: {
        Row: { id: string; full_name: string | null; created_at: string };
        Insert: { id: string; full_name?: string | null; created_at?: string };
        Update: { id?: string; full_name?: string | null; created_at?: string };
      };
      viewer_users: {
        Row: { id: string; full_name: string | null; created_at: string };
        Insert: { id: string; full_name?: string | null; created_at?: string };
        Update: { id?: string; full_name?: string | null; created_at?: string };
      };
      raffle_events: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          event_date: string | null;
          status: RaffleEventStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          event_date?: string | null;
          status?: RaffleEventStatus;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["raffle_events"]["Insert"]>;
      };
      departments: {
        Row: {
          id: string;
          raffle_event_id: string;
          department_name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          raffle_event_id: string;
          department_name: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["departments"]["Insert"]>;
      };
      participants: {
        Row: {
          id: string;
          raffle_event_id: string;
          department_id: string;
          employee_name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          raffle_event_id: string;
          department_id: string;
          employee_name: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["participants"]["Insert"]>;
      };
      slot_groups: {
        Row: {
          id: string;
          raffle_event_id: string;
          group_name: string;
          slot_limit: number;
          is_all: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          raffle_event_id: string;
          group_name: string;
          slot_limit: number;
          is_all?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["slot_groups"]["Insert"]>;
      };
      slot_group_departments: {
        Row: {
          id: string;
          slot_group_id: string;
          department_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          slot_group_id: string;
          department_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["slot_group_departments"]["Insert"]>;
      };
      winners: {
        Row: {
          id: string;
          raffle_event_id: string;
          participant_id: string;
          slot_group_id: string;
          department_id: string;
          drawn_at: string;
        };
        Insert: {
          id?: string;
          raffle_event_id: string;
          participant_id: string;
          slot_group_id: string;
          department_id: string;
          drawn_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["winners"]["Insert"]>;
      };
      raffle_actions: {
        Row: {
          id: string;
          raffle_event_id: string;
          action_type: RaffleActionType;
          slot_group_id: string | null;
          participant_id: string | null;
          performed_by: string | null;
          metadata: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          raffle_event_id: string;
          action_type: RaffleActionType;
          slot_group_id?: string | null;
          participant_id?: string | null;
          performed_by?: string | null;
          metadata?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["raffle_actions"]["Insert"]>;
      };
      raffle_settings: {
        Row: {
          raffle_event_id: string;
          dark_mode: boolean;
          animation_speed: AnimationSpeed;
          spin_duration_ms: number;
          sound_enabled: boolean;
          confetti_enabled: boolean;
          company_logo_url: string | null;
          updated_at: string;
        };
        Insert: {
          raffle_event_id: string;
          dark_mode?: boolean;
          animation_speed?: AnimationSpeed;
          spin_duration_ms?: number;
          sound_enabled?: boolean;
          confetti_enabled?: boolean;
          company_logo_url?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["raffle_settings"]["Insert"]>;
      };
    };
    Views: {
      v_slot_group_fill: {
        Row: {
          slot_group_id: string;
          raffle_event_id: string;
          group_name: string;
          slot_limit: number;
          is_all: boolean;
          winners_drawn: number;
          slots_remaining: number;
        };
      };
    };
    Functions: {};
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type InsertDto<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type UpdateDto<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
