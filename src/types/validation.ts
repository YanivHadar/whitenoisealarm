/**
 * Zod Validation Schemas for Alarm & White Noise App
 * 
 * Provides runtime type validation for all database operations,
 * API requests, and form submissions. Ensures data integrity
 * and prevents invalid data from reaching the database.
 */

import { z } from 'zod';

// Enums
export const AudioOutputSchema = z.enum(['speaker', 'headphones', 'auto']);
export const RepeatPatternSchema = z.enum(['none', 'daily', 'weekdays', 'weekends', 'custom']);
export const SessionStatusSchema = z.enum(['active', 'paused', 'completed', 'cancelled']);
export const WhiteNoiseCategorySchema = z.enum(['nature', 'ambient', 'mechanical', 'binaural', 'custom']);
export const SubscriptionStatusSchema = z.enum(['free', 'premium', 'trial']);
export const ThemeSchema = z.enum(['light', 'dark', 'auto']);

// Common validation helpers
const timeStringSchema = z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
  message: 'Time must be in HH:MM format (24-hour)',
});

const volumeSchema = z.number().min(0).max(1);
const positiveIntSchema = z.number().int().positive();
const nonNegativeIntSchema = z.number().int().nonnegative();
const uuidSchema = z.string().uuid();
const emailSchema = z.string().email();
const timezoneSchema = z.string().min(1).max(50);
const urlSchema = z.string().url().optional().or(z.literal(''));

// User Schemas
export const UserSchema = z.object({
  id: uuidSchema,
  email: emailSchema,
  full_name: z.string().nullable(),
  avatar_url: z.string().url().nullable(),
  subscription_status: SubscriptionStatusSchema,
  subscription_expires_at: z.string().datetime().nullable(),
  timezone: timezoneSchema,
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  last_seen_at: z.string().datetime().nullable(),
  is_premium: z.boolean(),
});

export const UserInsertSchema = z.object({
  id: uuidSchema,
  email: emailSchema,
  full_name: z.string().nullable().optional(),
  avatar_url: z.string().url().nullable().optional(),
  subscription_status: SubscriptionStatusSchema.optional().default('free'),
  subscription_expires_at: z.string().datetime().nullable().optional(),
  timezone: timezoneSchema.optional().default('UTC'),
  last_seen_at: z.string().datetime().nullable().optional(),
  is_premium: z.boolean().optional().default(false),
});

export const UserUpdateSchema = z.object({
  full_name: z.string().nullable().optional(),
  avatar_url: z.string().url().nullable().optional(),
  subscription_status: SubscriptionStatusSchema.optional(),
  subscription_expires_at: z.string().datetime().nullable().optional(),
  timezone: timezoneSchema.optional(),
  updated_at: z.string().datetime().optional(),
  last_seen_at: z.string().datetime().nullable().optional(),
  is_premium: z.boolean().optional(),
});

// Alarm Schemas
export const AlarmSchema = z.object({
  id: uuidSchema,
  user_id: uuidSchema,
  name: z.string().min(1).max(100),
  time: timeStringSchema,
  enabled: z.boolean(),
  repeat_pattern: RepeatPatternSchema,
  repeat_days: z.array(z.number().int().min(0).max(6)).nullable(),
  audio_file_url: z.string().url().nullable(),
  audio_output: AudioOutputSchema,
  volume: volumeSchema,
  vibration_enabled: z.boolean(),
  snooze_enabled: z.boolean(),
  snooze_duration: positiveIntSchema,
  snooze_count_limit: positiveIntSchema,
  white_noise_enabled: z.boolean(),
  white_noise_file_url: z.string().url().nullable(),
  white_noise_category: WhiteNoiseCategorySchema.nullable(),
  white_noise_volume: volumeSchema,
  white_noise_duration: positiveIntSchema.nullable(),
  fade_in_duration: nonNegativeIntSchema,
  fade_out_duration: nonNegativeIntSchema,
  is_premium_feature: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  last_triggered_at: z.string().datetime().nullable(),
  next_trigger_at: z.string().datetime().nullable(),
}).refine((data) => {
  // Custom validation: if repeat_pattern is 'custom', repeat_days must be provided
  if (data.repeat_pattern === 'custom') {
    return data.repeat_days !== null && data.repeat_days.length > 0;
  }
  return true;
}, {
  message: 'Custom repeat pattern requires at least one selected day',
  path: ['repeat_days'],
}).refine((data) => {
  // Custom validation: white noise category required if white noise enabled
  if (data.white_noise_enabled && !data.white_noise_file_url) {
    return data.white_noise_category !== null;
  }
  return true;
}, {
  message: 'White noise category is required when white noise is enabled without custom file',
  path: ['white_noise_category'],
});

export const AlarmInsertSchema = z.object({
  id: uuidSchema.optional(),
  user_id: uuidSchema,
  name: z.string().min(1).max(100),
  time: timeStringSchema,
  enabled: z.boolean().optional().default(true),
  repeat_pattern: RepeatPatternSchema.optional().default('none'),
  repeat_days: z.array(z.number().int().min(0).max(6)).nullable().optional(),
  audio_file_url: z.string().url().nullable().optional(),
  audio_output: AudioOutputSchema.optional().default('auto'),
  volume: volumeSchema.optional().default(0.7),
  vibration_enabled: z.boolean().optional().default(true),
  snooze_enabled: z.boolean().optional().default(true),
  snooze_duration: positiveIntSchema.optional().default(5),
  snooze_count_limit: positiveIntSchema.optional().default(3),
  white_noise_enabled: z.boolean().optional().default(false),
  white_noise_file_url: z.string().url().nullable().optional(),
  white_noise_category: WhiteNoiseCategorySchema.nullable().optional(),
  white_noise_volume: volumeSchema.optional().default(0.5),
  white_noise_duration: positiveIntSchema.nullable().optional(),
  fade_in_duration: nonNegativeIntSchema.optional().default(0),
  fade_out_duration: nonNegativeIntSchema.optional().default(0),
  is_premium_feature: z.boolean().optional().default(false),
  last_triggered_at: z.string().datetime().nullable().optional(),
  next_trigger_at: z.string().datetime().nullable().optional(),
}).refine((data) => {
  if (data.repeat_pattern === 'custom') {
    return data.repeat_days !== null && data.repeat_days!.length > 0;
  }
  return true;
}, {
  message: 'Custom repeat pattern requires at least one selected day',
  path: ['repeat_days'],
});

export const AlarmUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  time: timeStringSchema.optional(),
  enabled: z.boolean().optional(),
  repeat_pattern: RepeatPatternSchema.optional(),
  repeat_days: z.array(z.number().int().min(0).max(6)).nullable().optional(),
  audio_file_url: z.string().url().nullable().optional(),
  audio_output: AudioOutputSchema.optional(),
  volume: volumeSchema.optional(),
  vibration_enabled: z.boolean().optional(),
  snooze_enabled: z.boolean().optional(),
  snooze_duration: positiveIntSchema.optional(),
  snooze_count_limit: positiveIntSchema.optional(),
  white_noise_enabled: z.boolean().optional(),
  white_noise_file_url: z.string().url().nullable().optional(),
  white_noise_category: WhiteNoiseCategorySchema.nullable().optional(),
  white_noise_volume: volumeSchema.optional(),
  white_noise_duration: positiveIntSchema.nullable().optional(),
  fade_in_duration: nonNegativeIntSchema.optional(),
  fade_out_duration: nonNegativeIntSchema.optional(),
  is_premium_feature: z.boolean().optional(),
  updated_at: z.string().datetime().optional(),
  last_triggered_at: z.string().datetime().nullable().optional(),
  next_trigger_at: z.string().datetime().nullable().optional(),
});

// Active Session Schemas
export const ActiveSessionSchema = z.object({
  id: uuidSchema,
  user_id: uuidSchema,
  alarm_id: uuidSchema.nullable(),
  session_type: z.enum(['alarm', 'white_noise', 'combined']),
  status: SessionStatusSchema,
  started_at: z.string().datetime(),
  ended_at: z.string().datetime().nullable(),
  duration_seconds: nonNegativeIntSchema.nullable(),
  audio_file_url: z.string().url().nullable(),
  volume: volumeSchema,
  white_noise_enabled: z.boolean(),
  white_noise_file_url: z.string().url().nullable(),
  white_noise_volume: volumeSchema,
  progress_percentage: z.number().min(0).max(100),
  metadata: z.record(z.string(), z.any()).nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const ActiveSessionInsertSchema = z.object({
  id: uuidSchema.optional(),
  user_id: uuidSchema,
  alarm_id: uuidSchema.nullable().optional(),
  session_type: z.enum(['alarm', 'white_noise', 'combined']),
  status: SessionStatusSchema.optional().default('active'),
  started_at: z.string().datetime().optional(),
  ended_at: z.string().datetime().nullable().optional(),
  duration_seconds: nonNegativeIntSchema.nullable().optional(),
  audio_file_url: z.string().url().nullable().optional(),
  volume: volumeSchema.optional().default(0.7),
  white_noise_enabled: z.boolean().optional().default(false),
  white_noise_file_url: z.string().url().nullable().optional(),
  white_noise_volume: volumeSchema.optional().default(0.5),
  progress_percentage: z.number().min(0).max(100).optional().default(0),
  metadata: z.record(z.string(), z.any()).nullable().optional(),
});

export const ActiveSessionUpdateSchema = z.object({
  status: SessionStatusSchema.optional(),
  ended_at: z.string().datetime().nullable().optional(),
  duration_seconds: nonNegativeIntSchema.nullable().optional(),
  progress_percentage: z.number().min(0).max(100).optional(),
  metadata: z.record(z.string(), z.any()).nullable().optional(),
  updated_at: z.string().datetime().optional(),
});

// User Preferences Schemas
export const UserPreferencesSchema = z.object({
  id: uuidSchema,
  user_id: uuidSchema,
  default_audio_output: AudioOutputSchema,
  default_volume: volumeSchema,
  default_white_noise_volume: volumeSchema,
  default_snooze_duration: positiveIntSchema,
  default_fade_in_duration: nonNegativeIntSchema,
  default_fade_out_duration: nonNegativeIntSchema,
  notifications_enabled: z.boolean(),
  do_not_disturb_enabled: z.boolean(),
  do_not_disturb_start: timeStringSchema.nullable(),
  do_not_disturb_end: timeStringSchema.nullable(),
  theme: ThemeSchema,
  language: z.string().length(2), // ISO 639-1 language codes
  battery_optimization_enabled: z.boolean(),
  analytics_enabled: z.boolean(),
  crash_reporting_enabled: z.boolean(),
  premium_features_intro_shown: z.boolean(),
  onboarding_completed: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
}).refine((data) => {
  // Custom validation: if DND enabled, both start and end times must be provided
  if (data.do_not_disturb_enabled) {
    return data.do_not_disturb_start !== null && data.do_not_disturb_end !== null;
  }
  return true;
}, {
  message: 'Do Not Disturb start and end times are required when enabled',
  path: ['do_not_disturb_start', 'do_not_disturb_end'],
});

export const UserPreferencesInsertSchema = z.object({
  id: uuidSchema.optional(),
  user_id: uuidSchema,
  default_audio_output: AudioOutputSchema.optional().default('auto'),
  default_volume: volumeSchema.optional().default(0.7),
  default_white_noise_volume: volumeSchema.optional().default(0.5),
  default_snooze_duration: positiveIntSchema.optional().default(5),
  default_fade_in_duration: nonNegativeIntSchema.optional().default(0),
  default_fade_out_duration: nonNegativeIntSchema.optional().default(0),
  notifications_enabled: z.boolean().optional().default(true),
  do_not_disturb_enabled: z.boolean().optional().default(false),
  do_not_disturb_start: timeStringSchema.nullable().optional(),
  do_not_disturb_end: timeStringSchema.nullable().optional(),
  theme: ThemeSchema.optional().default('auto'),
  language: z.string().length(2).optional().default('en'),
  battery_optimization_enabled: z.boolean().optional().default(true),
  analytics_enabled: z.boolean().optional().default(true),
  crash_reporting_enabled: z.boolean().optional().default(true),
  premium_features_intro_shown: z.boolean().optional().default(false),
  onboarding_completed: z.boolean().optional().default(false),
});

export const UserPreferencesUpdateSchema = z.object({
  default_audio_output: AudioOutputSchema.optional(),
  default_volume: volumeSchema.optional(),
  default_white_noise_volume: volumeSchema.optional(),
  default_snooze_duration: positiveIntSchema.optional(),
  default_fade_in_duration: nonNegativeIntSchema.optional(),
  default_fade_out_duration: nonNegativeIntSchema.optional(),
  notifications_enabled: z.boolean().optional(),
  do_not_disturb_enabled: z.boolean().optional(),
  do_not_disturb_start: timeStringSchema.nullable().optional(),
  do_not_disturb_end: timeStringSchema.nullable().optional(),
  theme: ThemeSchema.optional(),
  language: z.string().length(2).optional(),
  battery_optimization_enabled: z.boolean().optional(),
  analytics_enabled: z.boolean().optional(),
  crash_reporting_enabled: z.boolean().optional(),
  premium_features_intro_shown: z.boolean().optional(),
  onboarding_completed: z.boolean().optional(),
  updated_at: z.string().datetime().optional(),
});

// API Response Schemas
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
  }).optional(),
  timestamp: z.string().datetime(),
});

export const PaginationSchema = z.object({
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().min(1).max(100).optional().default(20),
  sort_by: z.string().optional().default('created_at'),
  sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
});

// Export type inference helpers
export type ApiResponse = z.infer<typeof ApiResponseSchema>;
export type Pagination = z.infer<typeof PaginationSchema>;

// Validation helper functions
export const validateData = <T>(schema: z.ZodSchema<T>, data: unknown): T => {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(`Validation failed: ${result.error.message}`);
  }
  return result.data;
};

export const isValidData = <T>(schema: z.ZodSchema<T>, data: unknown): data is T => {
  return schema.safeParse(data).success;
};