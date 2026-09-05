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
      app_comments: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          resolved: boolean | null
          user_id: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          id?: string
          resolved?: boolean | null
          user_id: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          resolved?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      app_feedback: {
        Row: {
          created_at: string
          feature_request: string | null
          id: string
          rating: number
          suggestion: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          feature_request?: string | null
          id?: string
          rating: number
          suggestion?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          feature_request?: string | null
          id?: string
          rating?: number
          suggestion?: string | null
          user_id?: string
        }
        Relationships: []
      }
      chat_groups: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string
          description: string | null
          icon: string | null
          id: string
          invite_code: string | null
          is_public: boolean | null
          name: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          icon?: string | null
          id?: string
          invite_code?: string | null
          is_public?: boolean | null
          name: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          icon?: string | null
          id?: string
          invite_code?: string | null
          is_public?: boolean | null
          name?: string
        }
        Relationships: []
      }
      chat_preferences: {
        Row: {
          created_at: string
          custom_instructions: string | null
          id: string
          persona: string
          reply_length: string
          show_thinking: boolean
          tone: string
          updated_at: string
          user_id: string
          viewing_chat_id: string | null
        }
        Insert: {
          created_at?: string
          custom_instructions?: string | null
          id?: string
          persona?: string
          reply_length?: string
          show_thinking?: boolean
          tone?: string
          updated_at?: string
          user_id: string
          viewing_chat_id?: string | null
        }
        Update: {
          created_at?: string
          custom_instructions?: string | null
          id?: string
          persona?: string
          reply_length?: string
          show_thinking?: boolean
          tone?: string
          updated_at?: string
          user_id?: string
          viewing_chat_id?: string | null
        }
        Relationships: []
      }
      contacts: {
        Row: {
          contact_user_id: string
          created_at: string
          id: string
          nickname: string | null
          status: string
          user_id: string
        }
        Insert: {
          contact_user_id: string
          created_at?: string
          id?: string
          nickname?: string | null
          status?: string
          user_id: string
        }
        Update: {
          contact_user_id?: string
          created_at?: string
          id?: string
          nickname?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_hot_answers: {
        Row: {
          content: string
          created_at: string
          id: string
          is_correct: boolean
          question_id: string
          selected_option: string | null
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          is_correct?: boolean
          question_id: string
          selected_option?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_correct?: boolean
          question_id?: string
          selected_option?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_hot_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "daily_hot_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_hot_questions: {
        Row: {
          admin_id: string | null
          content: string
          correct_answer: string | null
          created_at: string
          ends_at: string | null
          id: string
          image_url: string | null
          is_active: boolean
          kind: string
          owner_id: string
          poll_options: Json
          quiz_options: Json
          schedule_basis: string
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          admin_id?: string | null
          content?: string
          correct_answer?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          kind?: string
          owner_id: string
          poll_options?: Json
          quiz_options?: Json
          schedule_basis?: string
          starts_at?: string
          title: string
          updated_at?: string
        }
        Update: {
          admin_id?: string | null
          content?: string
          correct_answer?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          kind?: string
          owner_id?: string
          poll_options?: Json
          quiz_options?: Json
          schedule_basis?: string
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      direct_messages: {
        Row: {
          attachment_meta: Json | null
          attachment_name: string | null
          attachment_type: string | null
          attachment_url: string | null
          content: string
          created_at: string
          encrypted: boolean
          id: string
          nonce: string | null
          read_at: string | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          attachment_meta?: Json | null
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          content: string
          created_at?: string
          encrypted?: boolean
          id?: string
          nonce?: string | null
          read_at?: string | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          attachment_meta?: Json | null
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          content?: string
          created_at?: string
          encrypted?: boolean
          id?: string
          nonce?: string | null
          read_at?: string | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      edge_rate_limit_log: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      feature_ratings: {
        Row: {
          comment: string | null
          created_at: string
          feature_key: string
          id: string
          stars: number
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          feature_key: string
          id?: string
          stars: number
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          feature_key?: string
          id?: string
          stars?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gamification_rules: {
        Row: {
          focus_coin_seconds: number
          focus_xp_seconds: number
          id: number
          invite_coins: number
          invite_xp: number
          updated_at: string
          updated_by: string | null
          xp_per_level: number
        }
        Insert: {
          focus_coin_seconds?: number
          focus_xp_seconds?: number
          id: number
          invite_coins?: number
          invite_xp?: number
          updated_at?: string
          updated_by?: string | null
          xp_per_level?: number
        }
        Update: {
          focus_coin_seconds?: number
          focus_xp_seconds?: number
          id?: number
          invite_coins?: number
          invite_xp?: number
          updated_at?: string
          updated_by?: string | null
          xp_per_level?: number
        }
        Relationships: []
      }
      group_bans: {
        Row: {
          banned_at: string
          banned_by: string
          group_id: string
          id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          banned_at?: string
          banned_by: string
          group_id: string
          id?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          banned_at?: string
          banned_by?: string
          group_id?: string
          id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_bans_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "chat_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_invite_attempts: {
        Row: {
          attempted_at: string
          user_id: string
        }
        Insert: {
          attempted_at?: string
          user_id: string
        }
        Update: {
          attempted_at?: string
          user_id?: string
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
          attachment_meta: Json | null
          attachment_name: string | null
          attachment_type: string | null
          attachment_url: string | null
          content: string
          created_at: string
          group_id: string
          id: string
          sender_id: string
        }
        Insert: {
          attachment_meta?: Json | null
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          content: string
          created_at?: string
          group_id: string
          id?: string
          sender_id: string
        }
        Update: {
          attachment_meta?: Json | null
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
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
      journal_entries: {
        Row: {
          content: string
          created_at: string
          entry_date: string
          id: string
          mood: number | null
          prompt: string | null
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          entry_date?: string
          id?: string
          mood?: number | null
          prompt?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          entry_date?: string
          id?: string
          mood?: number | null
          prompt?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mentor_conversations: {
        Row: {
          attachment_meta: Json | null
          content: string
          created_at: string
          id: string
          role: string
          study_track: string | null
          user_id: string
        }
        Insert: {
          attachment_meta?: Json | null
          content: string
          created_at?: string
          id?: string
          role: string
          study_track?: string | null
          user_id: string
        }
        Update: {
          attachment_meta?: Json | null
          content?: string
          created_at?: string
          id?: string
          role?: string
          study_track?: string | null
          user_id?: string
        }
        Relationships: []
      }
      mentor_daily_summaries: {
        Row: {
          created_at: string
          id: string
          metrics: Json | null
          summary: string
          summary_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metrics?: Json | null
          summary: string
          summary_date?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metrics?: Json | null
          summary?: string
          summary_date?: string
          user_id?: string
        }
        Relationships: []
      }
      mind_game_scores: {
        Row: {
          coins_earned: number
          created_at: string
          game_type: string
          id: string
          score: number
          user_id: string
          xp_earned: number
        }
        Insert: {
          coins_earned?: number
          created_at?: string
          game_type: string
          id?: string
          score?: number
          user_id: string
          xp_earned?: number
        }
        Update: {
          coins_earned?: number
          created_at?: string
          game_type?: string
          id?: string
          score?: number
          user_id?: string
          xp_earned?: number
        }
        Relationships: []
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
          invite_code: string | null
          last_study_date: string | null
          level: number | null
          name: string
          phone: string | null
          streak: number | null
          unique_id: string
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
          invite_code?: string | null
          last_study_date?: string | null
          level?: number | null
          name?: string
          phone?: string | null
          streak?: number | null
          unique_id: string
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
          invite_code?: string | null
          last_study_date?: string | null
          level?: number | null
          name?: string
          phone?: string | null
          streak?: number | null
          unique_id?: string
          updated_at?: string | null
          user_id?: string
          xp?: number | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_active_at: string | null
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_active_at?: string | null
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_active_at?: string | null
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      study_room_audit_log: {
        Row: {
          action: string
          created_at: string
          host_id: string
          id: string
          metadata: Json
          room_id: string
          target_id: string | null
          target_name: string | null
        }
        Insert: {
          action: string
          created_at?: string
          host_id: string
          id?: string
          metadata?: Json
          room_id: string
          target_id?: string | null
          target_name?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          host_id?: string
          id?: string
          metadata?: Json
          room_id?: string
          target_id?: string | null
          target_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "study_room_audit_log_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "study_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      study_room_bans: {
        Row: {
          created_at: string
          expires_at: string | null
          host_id: string
          id: string
          reason: string | null
          room_id: string | null
          scope: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          host_id: string
          id?: string
          reason?: string | null
          room_id?: string | null
          scope?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          host_id?: string
          id?: string
          reason?: string | null
          room_id?: string | null
          scope?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_room_bans_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "study_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      study_room_members: {
        Row: {
          id: string
          joined_at: string
          last_seen_at: string
          role: string
          room_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          last_seen_at?: string
          role?: string
          room_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          last_seen_at?: string
          role?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_room_members_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "study_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      study_room_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          room_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          room_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          room_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_room_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "study_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      study_rooms: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          owner_id: string
          title: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          owner_id: string
          title: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          owner_id?: string
          title?: string
          updated_at?: string
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
      tracker_sheet_collaborators: {
        Row: {
          collaborator_id: string
          created_at: string
          id: string
          owner_id: string
          role: string
          tracker_id: string
        }
        Insert: {
          collaborator_id: string
          created_at?: string
          id?: string
          owner_id: string
          role?: string
          tracker_id: string
        }
        Update: {
          collaborator_id?: string
          created_at?: string
          id?: string
          owner_id?: string
          role?: string
          tracker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracker_sheet_collaborators_tracker_id_fkey"
            columns: ["tracker_id"]
            isOneToOne: false
            referencedRelation: "tracker_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      tracker_sheets: {
        Row: {
          color: string | null
          columns: Json
          created_at: string
          icon: string | null
          id: string
          name: string
          position: number | null
          rows: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          columns?: Json
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          position?: number | null
          rows?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          columns?: Json
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          position?: number | null
          rows?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_api_keys: {
        Row: {
          created_at: string
          id: string
          iv: string
          key_ciphertext: string
          label: string | null
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          iv: string
          key_ciphertext: string
          label?: string | null
          provider: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          iv?: string
          key_ciphertext?: string
          label?: string | null
          provider?: string
          updated_at?: string
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
      user_public_keys: {
        Row: {
          created_at: string
          public_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          public_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          public_key?: string
          updated_at?: string
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
          notes: string | null
          priority: string
          remind_at: string | null
          reminded_at: string | null
          sort_order: number
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
          notes?: string | null
          priority?: string
          remind_at?: string | null
          reminded_at?: string | null
          sort_order?: number
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
          notes?: string | null
          priority?: string
          remind_at?: string | null
          reminded_at?: string | null
          sort_order?: number
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      profiles_public: {
        Row: {
          avatar: string | null
          avatar_url: string | null
          level: number | null
          name: string | null
          streak: number | null
          unique_id: string | null
          user_id: string | null
          xp: number | null
        }
        Insert: {
          avatar?: string | null
          avatar_url?: string | null
          level?: number | null
          name?: string | null
          streak?: number | null
          unique_id?: string | null
          user_id?: string | null
          xp?: number | null
        }
        Update: {
          avatar?: string | null
          avatar_url?: string | null
          level?: number | null
          name?: string | null
          streak?: number | null
          unique_id?: string | null
          user_id?: string | null
          xp?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_get_full_profile: {
        Args: { _user_id: string }
        Returns: {
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
          invite_code: string | null
          last_study_date: string | null
          level: number | null
          name: string
          phone: string | null
          streak: number | null
          unique_id: string
          updated_at: string | null
          user_id: string
          xp: number | null
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_reschedule_push_cron: {
        Args: { _job_name?: string; _secret: string }
        Returns: undefined
      }
      can_use_study_room_topic: {
        Args: { _topic: string; _uid: string }
        Returns: boolean
      }
      generate_unique_code: {
        Args: { _len: number; _prefix: string }
        Returns: string
      }
      get_my_full_profile: {
        Args: never
        Returns: {
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
          invite_code: string | null
          last_study_date: string | null
          level: number | null
          name: string
          phone: string | null
          streak: number | null
          unique_id: string
          updated_at: string | null
          user_id: string
          xp: number | null
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_group_admin: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      is_group_banned: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      is_group_creator: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      is_group_member: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      is_study_room_banned: {
        Args: { _room_id: string; _user_id: string }
        Returns: boolean
      }
      is_study_room_member: {
        Args: { _room_id: string; _user_id: string }
        Returns: boolean
      }
      join_group_by_invite: { Args: { _code: string }; Returns: string }
      join_study_room_by_code: { Args: { _code: string }; Returns: string }
      log_my_activity: {
        Args: {
          _coins_earned?: number
          _message: string
          _type: string
          _xp_earned?: number
        }
        Returns: string
      }
      realtime_room_code_from_topic: {
        Args: { _topic: string }
        Returns: string
      }
      shares_group_with_user: {
        Args: { _profile_user_id: string; _viewer_id: string }
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
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
