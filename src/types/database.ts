/**
 * Database Types for Alarm & White Noise App
 * 
 * Core database schema types for Supabase integration.
 * Provides type safety for all database operations with Zod validation.
 */

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: UserInsert;
        Update: UserUpdate;
      };
      alarms: {
        Row: Alarm;
        Insert: AlarmInsert;
        Update: AlarmUpdate;
      };
      active_sessions: {
        Row: ActiveSession;
        Insert: ActiveSessionInsert;
        Update: ActiveSessionUpdate;
      };
      user_preferences: {
        Row: UserPreferences;
        Insert: UserPreferencesInsert;
        Update: UserPreferencesUpdate;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      audio_output: 'speaker' | 'headphones' | 'auto';
      repeat_pattern: 'none' | 'daily' | 'weekdays' | 'weekends' | 'custom';
      session_status: 'active' | 'paused' | 'completed' | 'cancelled';
      white_noise_category: 'nature' | 'ambient' | 'mechanical' | 'binaural' | 'custom';
    };
  };
}

// User Types
export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  subscription_status: 'free' | 'premium' | 'trial';
  subscription_expires_at: string | null;
  timezone: string;
  created_at: string;
  updated_at: string;
  last_seen_at: string | null;
  is_premium: boolean;
}

export interface UserInsert {
  id: string;
  email: string;
  full_name?: string | null;
  avatar_url?: string | null;
  subscription_status?: 'free' | 'premium' | 'trial';
  subscription_expires_at?: string | null;
  timezone?: string;
  last_seen_at?: string | null;
  is_premium?: boolean;
}

export interface UserUpdate {
  full_name?: string | null;
  avatar_url?: string | null;
  subscription_status?: 'free' | 'premium' | 'trial';
  subscription_expires_at?: string | null;
  timezone?: string;
  updated_at?: string;
  last_seen_at?: string | null;
  is_premium?: boolean;
}

// Alarm Types
export interface Alarm {
  id: string;
  user_id: string;
  name: string;
  time: string; // Format: HH:MM
  enabled: boolean;
  repeat_pattern: Database['public']['Enums']['repeat_pattern'];
  repeat_days: number[] | null; // [0-6] where 0 is Sunday
  audio_file_url: string | null;
  audio_output: Database['public']['Enums']['audio_output'];
  volume: number; // 0.0 to 1.0
  vibration_enabled: boolean;
  snooze_enabled: boolean;
  snooze_duration: number; // minutes
  snooze_count_limit: number;
  white_noise_enabled: boolean;
  white_noise_file_url: string | null;
  white_noise_category: Database['public']['Enums']['white_noise_category'] | null;
  white_noise_volume: number; // 0.0 to 1.0
  white_noise_duration: number | null; // minutes, null for continuous
  fade_in_duration: number; // seconds
  fade_out_duration: number; // seconds
  is_premium_feature: boolean;
  created_at: string;
  updated_at: string;
  last_triggered_at: string | null;
  next_trigger_at: string | null;
}

export interface AlarmInsert {
  id?: string;
  user_id: string;
  name: string;
  time: string;
  enabled?: boolean;
  repeat_pattern?: Database['public']['Enums']['repeat_pattern'];
  repeat_days?: number[] | null;
  audio_file_url?: string | null;
  audio_output?: Database['public']['Enums']['audio_output'];
  volume?: number;
  vibration_enabled?: boolean;
  snooze_enabled?: boolean;
  snooze_duration?: number;
  snooze_count_limit?: number;
  white_noise_enabled?: boolean;
  white_noise_file_url?: string | null;
  white_noise_category?: Database['public']['Enums']['white_noise_category'] | null;
  white_noise_volume?: number;
  white_noise_duration?: number | null;
  fade_in_duration?: number;
  fade_out_duration?: number;
  is_premium_feature?: boolean;
  last_triggered_at?: string | null;
  next_trigger_at?: string | null;
}

export interface AlarmUpdate {
  name?: string;
  time?: string;
  enabled?: boolean;
  repeat_pattern?: Database['public']['Enums']['repeat_pattern'];
  repeat_days?: number[] | null;
  audio_file_url?: string | null;
  audio_output?: Database['public']['Enums']['audio_output'];
  volume?: number;
  vibration_enabled?: boolean;
  snooze_enabled?: boolean;
  snooze_duration?: number;
  snooze_count_limit?: number;
  white_noise_enabled?: boolean;
  white_noise_file_url?: string | null;
  white_noise_category?: Database['public']['Enums']['white_noise_category'] | null;
  white_noise_volume?: number;
  white_noise_duration?: number | null;
  fade_in_duration?: number;
  fade_out_duration?: number;
  is_premium_feature?: boolean;
  updated_at?: string;
  last_triggered_at?: string | null;
  next_trigger_at?: string | null;
}

// Active Session Types
export interface ActiveSession {
  id: string;
  user_id: string;
  alarm_id: string | null;
  session_type: 'alarm' | 'white_noise' | 'combined';
  status: Database['public']['Enums']['session_status'];
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  audio_file_url: string | null;
  volume: number;
  white_noise_enabled: boolean;
  white_noise_file_url: string | null;
  white_noise_volume: number;
  progress_percentage: number;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface ActiveSessionInsert {
  id?: string;
  user_id: string;
  alarm_id?: string | null;
  session_type: 'alarm' | 'white_noise' | 'combined';
  status?: Database['public']['Enums']['session_status'];
  started_at?: string;
  ended_at?: string | null;
  duration_seconds?: number | null;
  audio_file_url?: string | null;
  volume?: number;
  white_noise_enabled?: boolean;
  white_noise_file_url?: string | null;
  white_noise_volume?: number;
  progress_percentage?: number;
  metadata?: Record<string, any> | null;
}

export interface ActiveSessionUpdate {
  status?: Database['public']['Enums']['session_status'];
  ended_at?: string | null;
  duration_seconds?: number | null;
  progress_percentage?: number;
  metadata?: Record<string, any> | null;
  updated_at?: string;
}

// User Preferences Types
export interface UserPreferences {
  id: string;
  user_id: string;
  default_audio_output: Database['public']['Enums']['audio_output'];
  default_volume: number;
  default_white_noise_volume: number;
  default_snooze_duration: number;
  default_fade_in_duration: number;
  default_fade_out_duration: number;
  notifications_enabled: boolean;
  do_not_disturb_enabled: boolean;
  do_not_disturb_start: string | null; // HH:MM format
  do_not_disturb_end: string | null; // HH:MM format
  theme: 'light' | 'dark' | 'auto';
  language: string;
  battery_optimization_enabled: boolean;
  analytics_enabled: boolean;
  crash_reporting_enabled: boolean;
  premium_features_intro_shown: boolean;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserPreferencesInsert {
  id?: string;
  user_id: string;
  default_audio_output?: Database['public']['Enums']['audio_output'];
  default_volume?: number;
  default_white_noise_volume?: number;
  default_snooze_duration?: number;
  default_fade_in_duration?: number;
  default_fade_out_duration?: number;
  notifications_enabled?: boolean;
  do_not_disturb_enabled?: boolean;
  do_not_disturb_start?: string | null;
  do_not_disturb_end?: string | null;
  theme?: 'light' | 'dark' | 'auto';
  language?: string;
  battery_optimization_enabled?: boolean;
  analytics_enabled?: boolean;
  crash_reporting_enabled?: boolean;
  premium_features_intro_shown?: boolean;
  onboarding_completed?: boolean;
}

export interface UserPreferencesUpdate {
  default_audio_output?: Database['public']['Enums']['audio_output'];
  default_volume?: number;
  default_white_noise_volume?: number;
  default_snooze_duration?: number;
  default_fade_in_duration?: number;
  default_fade_out_duration?: number;
  notifications_enabled?: boolean;
  do_not_disturb_enabled?: boolean;
  do_not_disturb_start?: string | null;
  do_not_disturb_end?: string | null;
  theme?: 'light' | 'dark' | 'auto';
  language?: string;
  battery_optimization_enabled?: boolean;
  analytics_enabled?: boolean;
  crash_reporting_enabled?: boolean;
  premium_features_intro_shown?: boolean;
  onboarding_completed?: boolean;
  updated_at?: string;
}

// Utility Types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T];

// Real-time Types for Subscriptions
export interface RealtimePayload<T> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: T | null;
  old: T | null;
  table: string;
  schema: string;
  commit_timestamp: string;
}