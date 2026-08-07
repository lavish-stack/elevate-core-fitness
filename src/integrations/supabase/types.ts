export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      contact_messages: {
        Row: {
          admin_reply: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_read: boolean
          message: string
          phone: string | null
          replied_at: string | null
          subject: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_reply?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          is_read?: boolean
          message: string
          phone?: string | null
          replied_at?: string | null
          subject?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_reply?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_read?: boolean
          message?: string
          phone?: string | null
          replied_at?: string | null
          subject?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      faqs: {
        Row: {
          answer: string
          created_at: string
          id: string
          is_active: boolean
          question: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          is_active?: boolean
          question: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          is_active?: boolean
          question?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      gallery_images: {
        Row: {
          alt_text: string
          created_at: string
          id: string
          image_url: string
          is_active: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          alt_text?: string
          created_at?: string
          id?: string
          image_url: string
          is_active?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          alt_text?: string
          created_at?: string
          id?: string
          image_url?: string
          is_active?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      membership_plans: {
        Row: {
          created_at: string
          duration_days: number
          features: Json
          id: string
          is_active: boolean
          is_recommended: boolean
          name: string
          period_label: string
          price_inr: number
          sort_order: number
          tag: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_days?: number
          features?: Json
          id?: string
          is_active?: boolean
          is_recommended?: boolean
          name: string
          period_label?: string
          price_inr?: number
          sort_order?: number
          tag?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_days?: number
          features?: Json
          id?: string
          is_active?: boolean
          is_recommended?: boolean
          name?: string
          period_label?: string
          price_inr?: number
          sort_order?: number
          tag?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      membership_requests: {
        Row: {
          admin_note: string | null
          created_at: string
          id: string
          membership_id: string | null
          note: string | null
          plan_id: string | null
          status: Database["public"]["Enums"]["request_status"]
          type: Database["public"]["Enums"]["request_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          id?: string
          membership_id?: string | null
          note?: string | null
          plan_id?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          type?: Database["public"]["Enums"]["request_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          id?: string
          membership_id?: string | null
          note?: string | null
          plan_id?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          type?: Database["public"]["Enums"]["request_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_requests_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_requests_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          amount_inr: number
          card_code: string
          created_at: string
          expires_at: string
          id: string
          plan_id: string | null
          plan_name: string
          starts_at: string
          status: Database["public"]["Enums"]["membership_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_inr?: number
          card_code?: string
          created_at?: string
          expires_at: string
          id?: string
          plan_id?: string | null
          plan_name: string
          starts_at?: string
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_inr?: number
          card_code?: string
          created_at?: string
          expires_at?: string
          id?: string
          plan_id?: string | null
          plan_name?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          audience: string
          body: string
          created_at: string
          dedupe_key: string | null
          id: string
          is_read: boolean
          kind: string
          link: string | null
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          audience?: string
          body?: string
          created_at?: string
          dedupe_key?: string | null
          id?: string
          is_read?: boolean
          kind?: string
          link?: string | null
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          audience?: string
          body?: string
          created_at?: string
          dedupe_key?: string | null
          id?: string
          is_read?: boolean
          kind?: string
          link?: string | null
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_inr: number
          created_at: string
          currency: string
          failure_reason: string | null
          id: string
          membership_id: string | null
          plan_id: string | null
          provider: string
          provider_order_id: string | null
          provider_payment_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_inr: number
          created_at?: string
          currency?: string
          failure_reason?: string | null
          id?: string
          membership_id?: string | null
          plan_id?: string | null
          provider?: string
          provider_order_id?: string | null
          provider_payment_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_inr?: number
          created_at?: string
          currency?: string
          failure_reason?: string | null
          id?: string
          membership_id?: string | null
          plan_id?: string | null
          provider?: string
          provider_order_id?: string | null
          provider_payment_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      programs: {
        Row: {
          created_at: string
          description: string
          icon: string | null
          id: string
          is_active: boolean
          is_featured: boolean
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          address: string
          created_at: string
          email: string
          facebook_url: string | null
          gym_name: string
          hero_images: Json
          id: string
          instagram_url: string | null
          logo_url: string | null
          map_embed_url: string | null
          name_part1: string
          name_part2: string
          opening_hours: string
          phone: string
          tagline: string
          trial_days: number
          updated_at: string
          whatsapp: string
        }
        Insert: {
          address?: string
          created_at?: string
          email?: string
          facebook_url?: string | null
          gym_name?: string
          hero_images?: Json
          id?: string
          instagram_url?: string | null
          logo_url?: string | null
          map_embed_url?: string | null
          name_part1?: string
          name_part2?: string
          opening_hours?: string
          phone?: string
          tagline?: string
          trial_days?: number
          updated_at?: string
          whatsapp?: string
        }
        Update: {
          address?: string
          created_at?: string
          email?: string
          facebook_url?: string | null
          gym_name?: string
          hero_images?: Json
          id?: string
          instagram_url?: string | null
          logo_url?: string | null
          map_embed_url?: string | null
          name_part1?: string
          name_part2?: string
          opening_hours?: string
          phone?: string
          tagline?: string
          trial_days?: number
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          rating: number
          role: string
          sort_order: number
          text: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          rating?: number
          role?: string
          sort_order?: number
          text: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          rating?: number
          role?: string
          sort_order?: number
          text?: string
          updated_at?: string
        }
        Relationships: []
      }
      trainer_availability: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          time_slot: string
          trainer_id: string
          updated_at: string
          weekday: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          time_slot: string
          trainer_id: string
          updated_at?: string
          weekday: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          time_slot?: string
          trainer_id?: string
          updated_at?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "trainer_availability_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "trainers"
            referencedColumns: ["id"]
          },
        ]
      }
      trainer_bookings: {
        Row: {
          admin_note: string | null
          created_at: string
          id: string
          notes: string | null
          session_date: string
          status: Database["public"]["Enums"]["booking_status"]
          time_slot: string
          trainer_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          session_date: string
          status?: Database["public"]["Enums"]["booking_status"]
          time_slot: string
          trainer_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          session_date?: string
          status?: Database["public"]["Enums"]["booking_status"]
          time_slot?: string
          trainer_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainer_bookings_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "trainers"
            referencedColumns: ["id"]
          },
        ]
      }
      trainers: {
        Row: {
          bio: string | null
          created_at: string
          experience: string | null
          id: string
          is_active: boolean
          is_head: boolean
          name: string
          photo_url: string | null
          role: string
          sort_order: number
          tags: Json
          updated_at: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          experience?: string | null
          id?: string
          is_active?: boolean
          is_head?: boolean
          name: string
          photo_url?: string | null
          role?: string
          sort_order?: number
          tags?: Json
          updated_at?: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          experience?: string | null
          id?: string
          is_active?: boolean
          is_head?: boolean
          name?: string
          photo_url?: string | null
          role?: string
          sort_order?: number
          tags?: Json
          updated_at?: string
        }
        Relationships: []
      }
      trial_registrations: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          goal: string | null
          id: string
          phone: string
          preferred_start_date: string | null
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          goal?: string | null
          id?: string
          phone: string
          preferred_start_date?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          goal?: string | null
          id?: string
          phone?: string
          preferred_start_date?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_my_membership_expiry: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      push_notification: {
        Args: {
          _audience: string
          _body: string
          _dedupe?: string
          _kind: string
          _link?: string
          _title: string
          _user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "member"
      booking_status: "pending" | "confirmed" | "cancelled" | "completed"
      lead_status: "new" | "contacted" | "converted" | "closed"
      membership_status: "active" | "expired" | "pending" | "cancelled"
      payment_status: "created" | "paid" | "failed" | "refunded" | "cancelled"
      request_status: "pending" | "approved" | "rejected"
      request_type: "renewal" | "cancellation" | "new"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "member"],
      booking_status: ["pending", "confirmed", "cancelled", "completed"],
      lead_status: ["new", "contacted", "converted", "closed"],
      membership_status: ["active", "expired", "pending", "cancelled"],
      payment_status: ["created", "paid", "failed", "refunded", "cancelled"],
      request_status: ["pending", "approved", "rejected"],
      request_type: ["renewal", "cancellation", "new"],
    },
  },
} as const
