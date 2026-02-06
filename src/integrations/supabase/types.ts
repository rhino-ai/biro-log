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
      activity_log: {
        Row: {
          coins_earned: number | null
          created_at: string | null
          id: string
          message: string
          type: string
          user_id: string
          xp_earned: number | null
        }
        Insert: {
          coins_earned?: number | null
          created_at?: string | null
          id?: string
          message: string
          type: string
          user_id: string
          xp_earned?: number | null
        }
        Update: {
          coins_earned?: number | null
          created_at?: string | null
          id?: string
          message?: string
          type?: string
          user_id?: string
          xp_earned?: number | null
        }
        Relationships: []
      }
      chat_groups: {
        Row: {
          created_at: string
          created_by: string
          icon: string | null
          id: string
          is_public: boolean | null
          name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          icon?: string | null
          id?: string
          is_public?: boolean | null
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          icon?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          contact_user_id: string
          created_at: string
          id: string
          nickname: string | null
          user_id: string
        }
        Insert: {
          contact_user_id: string
          created_at?: string
          id?: string
          nickname?: string | null
          user_id: string
        }
        Update: {
          contact_user_id?: string
          created_at?: string
          id?: string
          nickname?: string | null
          user_id?: string
        }
        Relationships: []
      }
      direct_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          read_at: string | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          read_at?: string | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          read_at?: string | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          role: string | null
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          role?: string | null
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "chat_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_messages: {
        Row: {
          content: string
          created_at: string
          group_id: string
          id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          group_id: string
          id?: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          group_id?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "chat_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar: string | null
          avatar_url: string | null
          coins: number | null
          created_at: string | null
          dream_college: string | null
          dream_college_image: string | null
          dream_marks_cbse: number | null
          dream_marks_jee_advanced: number | null
          dream_marks_jee_main: number | null
          email: string | null
          exam_date_cbse: string | null
          exam_date_jee_advanced: string | null
          exam_date_jee_main: string | null
          id: string
          last_study_date: string | null
          level: number | null
          name: string
          phone: string | null
          streak: number | null
          updated_at: string | null
          user_id: string
          xp: number | null
        }
        Insert: {
          avatar?: string | null
          avatar_url?: string | null
          coins?: number | null
          created_at?: string | null
          dream_college?: string | null
          dream_college_image?: string | null
          dream_marks_cbse?: number | null
          dream_marks_jee_advanced?: number | null
          dream_marks_jee_main?: number | null
          email?: string | null
          exam_date_cbse?: string | null
          exam_date_jee_advanced?: string | null
          exam_date_jee_main?: string | null
          id?: string
          last_study_date?: string | null
          level?: number | null
          name?: string
          phone?: string | null
          streak?: number | null
          updated_at?: string | null
          user_id: string
          xp?: number | null
        }
        Update: {
          avatar?: string | null
          avatar_url?: string | null
          coins?: number | null
          created_at?: string | null
          dream_college?: string | null
          dream_college_image?: string | null
          dream_marks_cbse?: number | null
          dream_marks_jee_advanced?: number | null
          dream_marks_jee_main?: number | null
          email?: string | null
          exam_date_cbse?: string | null
          exam_date_jee_advanced?: string | null
          exam_date_jee_main?: string | null
          id?: string
          last_study_date?: string | null
          level?: number | null
          name?: string
          phone?: string | null
          streak?: number | null
          updated_at?: string | null
          user_id?: string
          xp?: number | null
        }
        Relationships: []
      }
      test_records: {
        Row: {
          chemistry_marks: number | null
          created_at: string | null
          date: string
          exam_type: string
          id: string
          mathematics_marks: number | null
          max_marks: number
          physics_marks: number | null
          scored_marks: number
          test_name: string
          user_id: string
        }
        Insert: {
          chemistry_marks?: number | null
          created_at?: string | null
          date: string
          exam_type: string
          id?: string
          mathematics_marks?: number | null
          max_marks: number
          physics_marks?: number | null
          scored_marks: number
          test_name: string
          user_id: string
        }
        Update: {
          chemistry_marks?: number | null
          created_at?: string | null
          date?: string
          exam_type?: string
          id?: string
          mathematics_marks?: number | null
          max_marks?: number
          physics_marks?: number | null
          scored_marks?: number
          test_name?: string
          user_id?: string
        }
        Relationships: []
      }
      user_chapter_progress: {
        Row: {
          chapter_id: string
          id: string
          jungle_id: string
          practice_done: boolean | null
          revision_done: boolean | null
          theory_done: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          chapter_id: string
          id?: string
          jungle_id: string
          practice_done?: boolean | null
          revision_done?: boolean | null
          theory_done?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          chapter_id?: string
          id?: string
          jungle_id?: string
          practice_done?: boolean | null
          revision_done?: boolean | null
          theory_done?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_tasks: {
        Row: {
          alarm_enabled: boolean | null
          alarm_ringtone: string | null
          alarm_time: string | null
          chapter_id: string | null
          completed: boolean | null
          created_at: string | null
          due_date: string | null
          due_time: string | null
          id: string
          jungle_id: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          alarm_enabled?: boolean | null
          alarm_ringtone?: string | null
          alarm_time?: string | null
          chapter_id?: string | null
          completed?: boolean | null
          created_at?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          jungle_id: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          alarm_enabled?: boolean | null
          alarm_ringtone?: string | null
          alarm_time?: string | null
          chapter_id?: string | null
          completed?: boolean | null
          created_at?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          jungle_id?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
