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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      active_sessions: {
        Row: {
          alarm_id: string | null
          id: string
          progress_seconds: number | null
          session_type: string
          started_at: string | null
          status: string | null
          total_duration_seconds: number | null
          user_id: string | null
        }
        Insert: {
          alarm_id?: string | null
          id?: string
          progress_seconds?: number | null
          session_type: string
          started_at?: string | null
          status?: string | null
          total_duration_seconds?: number | null
          user_id?: string | null
        }
        Update: {
          alarm_id?: string | null
          id?: string
          progress_seconds?: number | null
          session_type?: string
          started_at?: string | null
          status?: string | null
          total_duration_seconds?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "active_sessions_alarm_id_fkey"
            columns: ["alarm_id"]
            isOneToOne: false
            referencedRelation: "alarms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "active_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      alarm_sounds: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          duration_seconds: number | null
          filename: string
          id: string
          is_premium: boolean | null
          name: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          filename: string
          id?: string
          is_premium?: boolean | null
          name: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          filename?: string
          id?: string
          is_premium?: boolean | null
          name?: string
        }
        Relationships: []
      }
      alarms: {
        Row: {
          alarm_sound: string | null
          audio_output: string | null
          auto_dismiss_duration: number | null
          created_at: string | null
          enabled: boolean | null
          fade_in_duration: number | null
          id: string
          name: string
          repeat_days: number[] | null
          repeat_pattern: string | null
          snooze_count_limit: number | null
          snooze_duration: number | null
          snooze_enabled: boolean | null
          time: string
          timezone: string | null
          updated_at: string | null
          user_id: string | null
          vibration_enabled: boolean | null
          volume: number | null
          white_noise_enabled: boolean | null
          white_noise_sound: string | null
          white_noise_volume: number | null
        }
        Insert: {
          alarm_sound?: string | null
          audio_output?: string | null
          auto_dismiss_duration?: number | null
          created_at?: string | null
          enabled?: boolean | null
          fade_in_duration?: number | null
          id?: string
          name: string
          repeat_days?: number[] | null
          repeat_pattern?: string | null
          snooze_count_limit?: number | null
          snooze_duration?: number | null
          snooze_enabled?: boolean | null
          time: string
          timezone?: string | null
          updated_at?: string | null
          user_id?: string | null
          vibration_enabled?: boolean | null
          volume?: number | null
          white_noise_enabled?: boolean | null
          white_noise_sound?: string | null
          white_noise_volume?: number | null
        }
        Update: {
          alarm_sound?: string | null
          audio_output?: string | null
          auto_dismiss_duration?: number | null
          created_at?: string | null
          enabled?: boolean | null
          fade_in_duration?: number | null
          id?: string
          name?: string
          repeat_days?: number[] | null
          repeat_pattern?: string | null
          snooze_count_limit?: number | null
          snooze_duration?: number | null
          snooze_enabled?: boolean | null
          time?: string
          timezone?: string | null
          updated_at?: string | null
          user_id?: string | null
          vibration_enabled?: boolean | null
          volume?: number | null
          white_noise_enabled?: boolean | null
          white_noise_sound?: string | null
          white_noise_volume?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "alarms_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          bedtime_reminder_enabled: boolean | null
          bedtime_reminder_time: string | null
          crash_reporting_enabled: boolean | null
          created_at: string | null
          custom_sounds_enabled: boolean | null
          dark_mode_enabled: boolean | null
          default_alarm_volume: number | null
          default_audio_output:
            | Database["public"]["Enums"]["audio_output"]
            | null
          default_snooze_duration: number | null
          default_white_noise_volume: number | null
          haptic_feedback_enabled: boolean | null
          id: string
          notification_sound: string | null
          notification_vibration: boolean | null
          preferred_white_noise_category:
            | Database["public"]["Enums"]["white_noise_category"]
            | null
          quiet_hours_enabled: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          sound_preview_enabled: boolean | null
          updated_at: string | null
          usage_analytics_enabled: boolean | null
          user_id: string | null
          wake_up_light_enabled: boolean | null
        }
        Insert: {
          bedtime_reminder_enabled?: boolean | null
          bedtime_reminder_time?: string | null
          crash_reporting_enabled?: boolean | null
          created_at?: string | null
          custom_sounds_enabled?: boolean | null
          dark_mode_enabled?: boolean | null
          default_alarm_volume?: number | null
          default_audio_output?:
            | Database["public"]["Enums"]["audio_output"]
            | null
          default_snooze_duration?: number | null
          default_white_noise_volume?: number | null
          haptic_feedback_enabled?: boolean | null
          id?: string
          notification_sound?: string | null
          notification_vibration?: boolean | null
          preferred_white_noise_category?:
            | Database["public"]["Enums"]["white_noise_category"]
            | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sound_preview_enabled?: boolean | null
          updated_at?: string | null
          usage_analytics_enabled?: boolean | null
          user_id?: string | null
          wake_up_light_enabled?: boolean | null
        }
        Update: {
          bedtime_reminder_enabled?: boolean | null
          bedtime_reminder_time?: string | null
          crash_reporting_enabled?: boolean | null
          created_at?: string | null
          custom_sounds_enabled?: boolean | null
          dark_mode_enabled?: boolean | null
          default_alarm_volume?: number | null
          default_audio_output?:
            | Database["public"]["Enums"]["audio_output"]
            | null
          default_snooze_duration?: number | null
          default_white_noise_volume?: number | null
          haptic_feedback_enabled?: boolean | null
          id?: string
          notification_sound?: string | null
          notification_vibration?: boolean | null
          preferred_white_noise_category?:
            | Database["public"]["Enums"]["white_noise_category"]
            | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sound_preview_enabled?: boolean | null
          updated_at?: string | null
          usage_analytics_enabled?: boolean | null
          user_id?: string | null
          wake_up_light_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          is_premium: boolean | null
          subscription_expires_at: string | null
          subscription_status: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id?: string
          is_premium?: boolean | null
          subscription_expires_at?: string | null
          subscription_status?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_premium?: boolean | null
          subscription_expires_at?: string | null
          subscription_status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      white_noise_sounds: {
        Row: {
          category: Database["public"]["Enums"]["white_noise_category"] | null
          created_at: string | null
          description: string | null
          duration_seconds: number | null
          filename: string
          id: string
          is_premium: boolean | null
          loop_friendly: boolean | null
          name: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["white_noise_category"] | null
          created_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          filename: string
          id?: string
          is_premium?: boolean | null
          loop_friendly?: boolean | null
          name: string
        }
        Update: {
          category?: Database["public"]["Enums"]["white_noise_category"] | null
          created_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          filename?: string
          id?: string
          is_premium?: boolean | null
          loop_friendly?: boolean | null
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      alarm_system_health: {
        Row: {
          active_alarms: number | null
          active_sessions: number | null
          last_check: string | null
          metric_type: string | null
          status: string | null
          total_users: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_alarm_reliability: {
        Args: { hours_back?: number; user_uuid?: string }
        Returns: Json
      }
    }
    Enums: {
      audio_output: "speaker" | "headphones" | "auto"
      repeat_pattern: "none" | "daily" | "weekdays" | "weekends" | "custom"
      session_status: "active" | "paused" | "completed" | "cancelled"
      white_noise_category:
        | "nature"
        | "ambient"
        | "mechanical"
        | "binaural"
        | "custom"
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
      audio_output: ["speaker", "headphones", "auto"],
      repeat_pattern: ["none", "daily", "weekdays", "weekends", "custom"],
      session_status: ["active", "paused", "completed", "cancelled"],
      white_noise_category: [
        "nature",
        "ambient",
        "mechanical",
        "binaural",
        "custom",
      ],
    },
  },
} as const

// Export specific table types for easier imports
export type User = Tables<'users'>
export type UserInsert = TablesInsert<'users'>
export type UserUpdate = TablesUpdate<'users'>

export type Alarm = Tables<'alarms'>  
export type AlarmInsert = TablesInsert<'alarms'>
export type AlarmUpdate = TablesUpdate<'alarms'>

export type ActiveSession = Tables<'active_sessions'>
export type ActiveSessionInsert = TablesInsert<'active_sessions'>
export type ActiveSessionUpdate = TablesUpdate<'active_sessions'>

export type UserPreferences = Tables<'user_preferences'>
export type UserPreferencesInsert = TablesInsert<'user_preferences'>
export type UserPreferencesUpdate = TablesUpdate<'user_preferences'>

export type AlarmSound = Tables<'alarm_sounds'>
export type AlarmSoundInsert = TablesInsert<'alarm_sounds'>
export type AlarmSoundUpdate = TablesUpdate<'alarm_sounds'>

export type WhiteNoiseSound = Tables<'white_noise_sounds'>
export type WhiteNoiseSoundInsert = TablesInsert<'white_noise_sounds'>
export type WhiteNoiseSoundUpdate = TablesUpdate<'white_noise_sounds'>

// Export enums for easier imports
export type AudioOutput = Database["public"]["Enums"]["audio_output"]
export type RepeatPattern = Database["public"]["Enums"]["repeat_pattern"]
export type SessionStatus = Database["public"]["Enums"]["session_status"]
export type WhiteNoiseCategory = Database["public"]["Enums"]["white_noise_category"]