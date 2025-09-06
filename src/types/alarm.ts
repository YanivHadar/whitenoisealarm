/**
 * Alarm Domain Types & Models
 * 
 * Comprehensive alarm data models with TypeScript interfaces for
 * the Alarm & White Noise app. Provides type safety for alarm
 * scheduling, state management, and notification handling.
 */

import { Database } from './database';

// Re-export database alarm types for convenience
export type { Alarm, AlarmInsert, AlarmUpdate } from './database';
export type AudioOutput = Database['public']['Enums']['audio_output'];
export type RepeatPattern = Database['public']['Enums']['repeat_pattern'];
export type WhiteNoiseCategory = Database['public']['Enums']['white_noise_category'];

// Extended alarm types for app logic
type AlarmRowType = Database['public']['Tables']['alarms']['Row'];
export interface AlarmWithStatus extends AlarmRowType {
  // Computed fields
  is_active: boolean;
  is_snoozed: boolean;
  snooze_count: number;
  time_until_next: number | null; // milliseconds until next trigger
  formatted_time: string; // User-friendly time display (e.g., "7:30 AM")
  days_display: string; // User-friendly repeat pattern (e.g., "Weekdays")
}

// Alarm creation/editing form data
export interface AlarmFormData {
  name: string;
  time: string; // HH:MM format
  enabled: boolean;
  repeat_pattern: RepeatPattern;
  repeat_days: number[] | null;
  
  // Audio settings
  audio_file_url: string | null;
  audio_output: AudioOutput;
  volume: number;
  
  // Behavior settings
  vibration_enabled: boolean;
  snooze_enabled: boolean;
  snooze_duration: number;
  snooze_count_limit: number;
  
  // White noise integration
  white_noise_enabled: boolean;
  white_noise_file_url: string | null;
  white_noise_category: WhiteNoiseCategory | null;
  white_noise_volume: number;
  white_noise_duration: number | null;
  
  // Audio effects
  fade_in_duration: number;
  fade_out_duration: number;
}

// Alarm state for real-time tracking
export interface AlarmState {
  alarm_id: string;
  status: 'scheduled' | 'triggered' | 'snoozed' | 'dismissed' | 'stopped';
  triggered_at: Date | null;
  snoozed_at: Date | null;
  snooze_count: number;
  next_trigger_at: Date | null;
}

// Notification scheduling data
export interface AlarmNotification {
  alarm_id: string;
  notification_id: string;
  scheduled_for: Date;
  trigger_type: 'alarm' | 'snooze';
  is_scheduled: boolean;
}

// Repeat pattern configuration
export interface RepeatConfig {
  pattern: RepeatPattern;
  days?: number[]; // 0-6, where 0 is Sunday
  custom_description?: string; // For display purposes
}

// Time configuration with timezone support
export interface TimeConfig {
  hour: number; // 0-23
  minute: number; // 0-59
  timezone: string; // IANA timezone identifier
}

// Audio configuration for alarms
export interface AudioConfig {
  file_url: string | null;
  output: AudioOutput;
  volume: number; // 0.0-1.0
  fade_in_duration: number; // seconds
  fade_out_duration: number; // seconds
}

// White noise configuration
export interface WhiteNoiseConfig {
  enabled: boolean;
  file_url: string | null;
  category: WhiteNoiseCategory | null;
  volume: number; // 0.0-1.0
  duration: number | null; // minutes, null for continuous
}

// Snooze configuration
export interface SnoozeConfig {
  enabled: boolean;
  duration: number; // minutes
  count_limit: number;
  current_count: number;
}

// Comprehensive alarm configuration
export interface AlarmConfig {
  id: string;
  user_id: string;
  name: string;
  time: TimeConfig;
  enabled: boolean;
  repeat: RepeatConfig;
  audio: AudioConfig;
  white_noise: WhiteNoiseConfig;
  snooze: SnoozeConfig;
  vibration_enabled: boolean;
  is_premium_feature: boolean;
  created_at: Date;
  updated_at: Date;
  last_triggered_at: Date | null;
  next_trigger_at: Date | null;
}

// Alarm scheduling result
export interface AlarmScheduleResult {
  success: boolean;
  alarm_id: string;
  next_trigger_at: Date | null;
  notification_id: string | null;
  error?: string;
}

// Alarm validation result
export interface AlarmValidationResult {
  valid: boolean;
  errors: AlarmValidationError[];
  warnings: AlarmValidationWarning[];
}

export interface AlarmValidationError {
  field: keyof AlarmFormData;
  code: string;
  message: string;
}

export interface AlarmValidationWarning {
  field: keyof AlarmFormData;
  code: string;
  message: string;
}

// Day of week constants
export const DAYS_OF_WEEK = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
} as const;

export const DAY_NAMES: Record<number, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
};

export const DAY_ABBREV: Record<number, string> = {
  0: 'Sun',
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
};

// Repeat pattern display configurations
export const REPEAT_PATTERN_DISPLAY: Record<RepeatPattern, string> = {
  none: 'Once',
  daily: 'Daily',
  weekdays: 'Weekdays',
  weekends: 'Weekends',
  custom: 'Custom',
};

// Audio output display configurations
export const AUDIO_OUTPUT_DISPLAY: Record<AudioOutput, string> = {
  speaker: 'Speaker',
  headphones: 'Headphones Only',
  auto: 'Auto-detect',
};

// White noise category display configurations
export const WHITE_NOISE_CATEGORY_DISPLAY: Record<WhiteNoiseCategory, string> = {
  nature: 'Nature Sounds',
  ambient: 'Ambient',
  mechanical: 'Mechanical',
  binaural: 'Binaural Beats',
  custom: 'Custom',
};

// Default alarm configuration
export const DEFAULT_ALARM_CONFIG: Partial<AlarmFormData> = {
  enabled: true,
  repeat_pattern: 'none',
  audio_output: 'auto',
  volume: 0.7,
  vibration_enabled: true,
  snooze_enabled: true,
  snooze_duration: 5,
  snooze_count_limit: 3,
  white_noise_enabled: false,
  white_noise_volume: 0.5,
  fade_in_duration: 0,
  fade_out_duration: 0,
};

// Time utilities
export interface ParsedTime {
  hour: number;
  minute: number;
  formatted12: string; // e.g., "7:30 AM"
  formatted24: string; // e.g., "07:30"
}

// Alarm scheduling utilities
export interface NextTriggerCalculation {
  next_trigger: Date;
  days_until: number;
  hours_until: number;
  minutes_until: number;
  is_today: boolean;
  is_tomorrow: boolean;
}

// Alarm sound management
export interface AlarmSound {
  id: string;
  name: string;
  file_url: string;
  duration: number; // seconds
  category: 'default' | 'custom' | 'premium';
  preview_url?: string;
  is_premium: boolean;
}

// White noise sound management
export interface WhiteNoiseSound {
  id: string;
  name: string;
  file_url: string;
  category: WhiteNoiseCategory;
  duration: number | null; // seconds, null for loopable
  is_loopable: boolean;
  is_premium: boolean;
  preview_url?: string;
}

// Alarm analytics and tracking
export interface AlarmAnalytics {
  alarm_id: string;
  total_triggers: number;
  successful_wakeups: number; // dismissed without snooze
  snooze_rate: number; // percentage of triggers that were snoozed
  average_snoozes: number;
  avg_time_to_dismiss: number; // seconds
  last_30_days: {
    triggers: number;
    successful: number;
    snoozed: number;
  };
}

// Export utility type for alarm-related operations
export type AlarmOperation = 
  | 'create'
  | 'update' 
  | 'delete'
  | 'enable'
  | 'disable'
  | 'trigger'
  | 'snooze'
  | 'dismiss'
  | 'stop';

// Alarm error types for better error handling
export type AlarmErrorCode =
  | 'INVALID_TIME'
  | 'INVALID_REPEAT_PATTERN'
  | 'INVALID_REPEAT_DAYS'
  | 'INVALID_AUDIO_URL'
  | 'INVALID_VOLUME'
  | 'INVALID_SNOOZE_DURATION'
  | 'INVALID_FADE_DURATION'
  | 'PERMISSION_DENIED'
  | 'NOTIFICATION_SCHEDULING_FAILED'
  | 'DATABASE_ERROR'
  | 'NETWORK_ERROR'
  | 'AUDIO_LOADING_FAILED'
  | 'PREMIUM_FEATURE_REQUIRED';

export interface AlarmError {
  code: AlarmErrorCode;
  message: string;
  field?: keyof AlarmFormData;
  details?: Record<string, any>;
}

// ============================================================================
// RELIABILITY TESTING TYPES
// ============================================================================

export interface ReliabilityTestReport {
  overallScore: number;
  reliabilityMet: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  totalDuration: number;
  timestamp: string;
  suites: TestSuiteResult[];
  recommendations: string[];
  summary: {
    critical_issues: number;
    performance_concerns: boolean;
    notification_reliability: number;
    background_stability: number;
    edge_case_coverage: number;
  };
}

export interface TestSuite {
  name: string;
  tests: TestResult[];
  weight: number;
}

export interface TestSuiteResult {
  name: string;
  weight: number;
  score: number;
  passed: number;
  total: number;
  tests: TestResult[];
}

export interface TestResult {
  name: string;
  success: boolean;
  duration: number;
  data: any;
  metrics: Record<string, any>;
  error: string | null;
  timestamp: string;
}

export interface NotificationDeliveryTest {
  testId: string;
  alarmId: string;
  expectedDeliveryTime: Date;
  actualDeliveryTime?: Date;
  delivered: boolean;
  deliveryLatency?: number;
  platform: 'ios' | 'android' | 'web';
  appState: AppState;
  notificationId?: string;
}

export interface NotificationDeliveryResult {
  delivered: boolean;
  deliveryTime: number;
  actualDeliveryTime: number | null;
  expectedDeliveryTime?: number;
  notification: any;
  priority: string;
  hasActions: boolean;
  channelId?: string;
  isAlarmNotification: boolean;
  isSnoozeNotification: boolean;
  deliveredInBackground: boolean;
  userAction?: string;
}

// App state for reliability testing
export type AppState = 'active' | 'background' | 'inactive';