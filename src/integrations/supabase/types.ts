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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      blocked_users: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocked_users_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_users_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_entries: {
        Row: {
          challenge_id: string
          content_url: string
          created_at: string
          id: string
          likes_count: number
          user_id: string
        }
        Insert: {
          challenge_id: string
          content_url: string
          created_at?: string
          id?: string
          likes_count?: number
          user_id: string
        }
        Update: {
          challenge_id?: string
          content_url?: string
          created_at?: string
          id?: string
          likes_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_entries_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          challenge_date: string
          created_at: string
          description: string
          id: string
          is_active: boolean
        }
        Insert: {
          challenge_date: string
          created_at?: string
          description: string
          id?: string
          is_active?: boolean
        }
        Update: {
          challenge_date?: string
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
        }
        Relationships: []
      }
      chats: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_group: boolean
          name: string | null
          participant_ids: string[]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_group?: boolean
          name?: string | null
          participant_ids: string[]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_group?: boolean
          name?: string | null
          participant_ids?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "chats_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author_id: string
          created_at: string
          id: string
          post_id: string
          text: string
        }
        Insert: {
          author_id: string
          created_at?: string
          id?: string
          post_id: string
          text: string
        }
        Update: {
          author_id?: string
          created_at?: string
          id?: string
          post_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_settings: {
        Row: {
          chat_id: string
          created_at: string
          id: string
          muted: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          chat_id: string
          created_at?: string
          id?: string
          muted?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          chat_id?: string
          created_at?: string
          id?: string
          muted?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_settings_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          created_at: string
          id: string
          receiver_id: string
          sender_id: string
          status: Database["public"]["Enums"]["friendship_status"]
          tutor_approved: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          receiver_id: string
          sender_id: string
          status?: Database["public"]["Enums"]["friendship_status"]
          tutor_approved?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          receiver_id?: string
          sender_id?: string
          status?: Database["public"]["Enums"]["friendship_status"]
          tutor_approved?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "friendships_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reads: {
        Row: {
          id: string
          message_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          message_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          message_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reads_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          chat_id: string
          content: string
          created_at: string
          id: string
          is_blocked: boolean
          sender_id: string
          type: Database["public"]["Enums"]["content_type"]
        }
        Insert: {
          chat_id: string
          content: string
          created_at?: string
          id?: string
          is_blocked?: boolean
          sender_id: string
          type?: Database["public"]["Enums"]["content_type"]
        }
        Update: {
          chat_id?: string
          content?: string
          created_at?: string
          id?: string
          is_blocked?: boolean
          sender_id?: string
          type?: Database["public"]["Enums"]["content_type"]
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_events: {
        Row: {
          allowed: boolean
          categories: Json | null
          created_at: string
          id: string
          reason: string | null
          severity: string | null
          surface: string
          text_snippet: string
          user_id: string
        }
        Insert: {
          allowed?: boolean
          categories?: Json | null
          created_at?: string
          id?: string
          reason?: string | null
          severity?: string | null
          surface: string
          text_snippet: string
          user_id: string
        }
        Update: {
          allowed?: boolean
          categories?: Json | null
          created_at?: string
          id?: string
          reason?: string | null
          severity?: string | null
          surface?: string
          text_snippet?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "moderation_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          challenge_id: string | null
          content_url: string | null
          created_at: string
          id: string
          is_challenge_entry: boolean
          likes_count: number
          privacy: Database["public"]["Enums"]["post_privacy"]
          text: string | null
          type: Database["public"]["Enums"]["content_type"]
        }
        Insert: {
          author_id: string
          challenge_id?: string | null
          content_url?: string | null
          created_at?: string
          id?: string
          is_challenge_entry?: boolean
          likes_count?: number
          privacy?: Database["public"]["Enums"]["post_privacy"]
          text?: string | null
          type: Database["public"]["Enums"]["content_type"]
        }
        Update: {
          author_id?: string
          challenge_id?: string | null
          content_url?: string | null
          created_at?: string
          id?: string
          is_challenge_entry?: boolean
          likes_count?: number
          privacy?: Database["public"]["Enums"]["post_privacy"]
          text?: string | null
          type?: Database["public"]["Enums"]["content_type"]
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_status: Database["public"]["Enums"]["account_status"]
          age_group: Database["public"]["Enums"]["age_group"]
          avatar_data: Json | null
          birth_year: number
          created_at: string
          id: string
          language_infractions_count: number
          last_seen_at: string | null
          nick: string
          parent_approved: boolean
          suspended_until: string | null
          tutor_email: string
          updated_at: string
        }
        Insert: {
          account_status?: Database["public"]["Enums"]["account_status"]
          age_group?: Database["public"]["Enums"]["age_group"]
          avatar_data?: Json | null
          birth_year: number
          created_at?: string
          id: string
          language_infractions_count?: number
          last_seen_at?: string | null
          nick: string
          parent_approved?: boolean
          suspended_until?: string | null
          tutor_email: string
          updated_at?: string
        }
        Update: {
          account_status?: Database["public"]["Enums"]["account_status"]
          age_group?: Database["public"]["Enums"]["age_group"]
          avatar_data?: Json | null
          birth_year?: number
          created_at?: string
          id?: string
          language_infractions_count?: number
          last_seen_at?: string | null
          nick?: string
          parent_approved?: boolean
          suspended_until?: string | null
          tutor_email?: string
          updated_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          id: string
          reason: string | null
          reported_chat_id: string | null
          reported_message_id: string | null
          reported_user_id: string | null
          reporter_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason?: string | null
          reported_chat_id?: string | null
          reported_message_id?: string | null
          reported_user_id?: string | null
          reporter_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string | null
          reported_chat_id?: string | null
          reported_message_id?: string | null
          reported_user_id?: string | null
          reporter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reported_chat_id_fkey"
            columns: ["reported_chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reported_message_id_fkey"
            columns: ["reported_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reported_user_id_fkey"
            columns: ["reported_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          created_at: string
          id: string
          item_data: Json
          item_type: string
          reason: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_data: Json
          item_type: string
          reason: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_data?: Json
          item_type?: string
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rewards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tutor_notifications: {
        Row: {
          created_at: string
          error: string | null
          id: string
          payload: Json | null
          sent_at: string | null
          status: string
          tutor_email: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          payload?: Json | null
          sent_at?: string | null
          status?: string
          tutor_email: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          payload?: Json | null
          sent_at?: string | null
          status?: string
          tutor_email?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutor_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tutors: {
        Row: {
          approval_history: Json | null
          children_ids: string[] | null
          created_at: string
          email: string
          id: string
        }
        Insert: {
          approval_history?: Json | null
          children_ids?: string[] | null
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          approval_history?: Json | null
          children_ids?: string[] | null
          created_at?: string
          email?: string
          id?: string
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
          role?: Database["public"]["Enums"]["app_role"]
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
      calculate_age_group: {
        Args: { _birth_year: number }
        Returns: Database["public"]["Enums"]["age_group"]
      }
      can_access_post: {
        Args: { _post_id: string; _user_id: string }
        Returns: boolean
      }
      get_strikes_24h: { Args: { _user_id: string }; Returns: number }
      get_user_age_group: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["age_group"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_blocked_user: { Args: { _user_id: string }; Returns: boolean }
      is_chat_participant: {
        Args: { _chat_id: string; _user_id: string }
        Returns: boolean
      }
      is_friend: {
        Args: { _user_a: string; _user_b: string }
        Returns: boolean
      }
      is_user_suspended: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      account_status: "pending_approval" | "active" | "suspended"
      age_group: "6-8" | "9-12" | "13-16"
      app_role: "admin" | "moderator" | "user"
      content_type: "photo" | "video" | "text" | "audio" | "image"
      friendship_status: "pending" | "approved" | "rejected"
      post_privacy: "friends_only" | "same_age_group"
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
      account_status: ["pending_approval", "active", "suspended"],
      age_group: ["6-8", "9-12", "13-16"],
      app_role: ["admin", "moderator", "user"],
      content_type: ["photo", "video", "text", "audio", "image"],
      friendship_status: ["pending", "approved", "rejected"],
      post_privacy: ["friends_only", "same_age_group"],
    },
  },
} as const
