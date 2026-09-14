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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          at: string
          campaign_id: string | null
          category_id: string | null
          detail: string | null
          id: string
          prospect_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          at?: string
          campaign_id?: string | null
          category_id?: string | null
          detail?: string | null
          id?: string
          prospect_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          at?: string
          campaign_id?: string | null
          category_id?: string | null
          detail?: string | null
          id?: string
          prospect_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      app_user_connections: {
        Row: {
          connection_key_ciphertext: string
          connector_id: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          connection_key_ciphertext: string
          connector_id: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          connection_key_ciphertext?: string
          connector_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      campaign_recipients: {
        Row: {
          body: string | null
          campaign_id: string
          created_at: string
          error_message: string | null
          follow_up_at: string | null
          id: string
          open_count: number
          opened_at: string | null
          outcome: string | null
          prospect_id: string
          provider_message_id: string | null
          provider_thread_id: string | null
          replied_at: string | null
          sent_at: string | null
          state: string
          subject: string | null
          user_id: string
        }
        Insert: {
          body?: string | null
          campaign_id: string
          created_at?: string
          error_message?: string | null
          follow_up_at?: string | null
          id?: string
          open_count?: number
          opened_at?: string | null
          outcome?: string | null
          prospect_id: string
          provider_message_id?: string | null
          provider_thread_id?: string | null
          replied_at?: string | null
          sent_at?: string | null
          state?: string
          subject?: string | null
          user_id: string
        }
        Update: {
          body?: string | null
          campaign_id?: string
          created_at?: string
          error_message?: string | null
          follow_up_at?: string | null
          id?: string
          open_count?: number
          opened_at?: string | null
          outcome?: string | null
          prospect_id?: string
          provider_message_id?: string | null
          provider_thread_id?: string | null
          replied_at?: string | null
          sent_at?: string | null
          state?: string
          subject?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_recipients_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          batch_size: number
          body: string
          category_id: string | null
          created_at: string
          description: string | null
          email_account_id: string | null
          id: string
          interval_minutes: number
          name: string
          purpose: string
          scheduled_at: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          batch_size?: number
          body?: string
          category_id?: string | null
          created_at?: string
          description?: string | null
          email_account_id?: string | null
          id?: string
          interval_minutes?: number
          name: string
          purpose?: string
          scheduled_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          batch_size?: number
          body?: string
          category_id?: string | null
          created_at?: string
          description?: string | null
          email_account_id?: string | null
          id?: string
          interval_minutes?: number
          name?: string
          purpose?: string
          scheduled_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_email_account_id_fkey"
            columns: ["email_account_id"]
            isOneToOne: false
            referencedRelation: "email_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string
          created_at: string
          email_account_id: string | null
          icon: string
          id: string
          name: string
          purposes: string[]
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          email_account_id?: string | null
          icon?: string
          id?: string
          name: string
          purposes?: string[]
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          email_account_id?: string | null
          icon?: string
          id?: string
          name?: string
          purposes?: string[]
          user_id?: string
        }
        Relationships: []
      }
      email_accounts: {
        Row: {
          address: string
          category_ids: string[]
          connector_id: string | null
          created_at: string
          daily_limit: number
          id: string
          label: string
          last_sync_at: string | null
          provider: string
          sent_today: number
          status: string
          user_id: string
        }
        Insert: {
          address: string
          category_ids?: string[]
          connector_id?: string | null
          created_at?: string
          daily_limit?: number
          id?: string
          label: string
          last_sync_at?: string | null
          provider?: string
          sent_today?: number
          status?: string
          user_id: string
        }
        Update: {
          address?: string
          category_ids?: string[]
          connector_id?: string | null
          created_at?: string
          daily_limit?: number
          id?: string
          label?: string
          last_sync_at?: string | null
          provider?: string
          sent_today?: number
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      follow_ups: {
        Row: {
          campaign_id: string | null
          created_at: string
          due_at: string
          id: string
          note: string | null
          prospect_id: string
          status: string
          step: number
          user_id: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          due_at: string
          id?: string
          note?: string | null
          prospect_id: string
          status?: string
          step?: number
          user_id: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          due_at?: string
          id?: string
          note?: string | null
          prospect_id?: string
          status?: string
          step?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_ups_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          workspace_name: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
          workspace_name?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          workspace_name?: string
        }
        Relationships: []
      }
      prospects: {
        Row: {
          category_id: string | null
          city: string
          company: string
          contact_name: string
          country: string
          created_at: string
          email: string
          id: string
          industry: string | null
          last_contacted_at: string | null
          last_response_at: string | null
          next_follow_up_at: string | null
          notes: string | null
          phone: string | null
          status: string
          tags: string[]
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          category_id?: string | null
          city?: string
          company: string
          contact_name?: string
          country?: string
          created_at?: string
          email: string
          id?: string
          industry?: string | null
          last_contacted_at?: string | null
          last_response_at?: string | null
          next_follow_up_at?: string | null
          notes?: string | null
          phone?: string | null
          status?: string
          tags?: string[]
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          category_id?: string | null
          city?: string
          company?: string
          contact_name?: string
          country?: string
          created_at?: string
          email?: string
          id?: string
          industry?: string | null
          last_contacted_at?: string | null
          last_response_at?: string | null
          next_follow_up_at?: string | null
          notes?: string | null
          phone?: string | null
          status?: string
          tags?: string[]
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prospects_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          body: string
          category_id: string | null
          created_at: string
          id: string
          name: string
          reply_rate: number
          subject: string
          times_used: number
          user_id: string
          won: number
        }
        Insert: {
          body?: string
          category_id?: string | null
          created_at?: string
          id?: string
          name: string
          reply_rate?: number
          subject?: string
          times_used?: number
          user_id: string
          won?: number
        }
        Update: {
          body?: string
          category_id?: string | null
          created_at?: string
          id?: string
          name?: string
          reply_rate?: number
          subject?: string
          times_used?: number
          user_id?: string
          won?: number
        }
        Relationships: [
          {
            foreignKeyName: "templates_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
