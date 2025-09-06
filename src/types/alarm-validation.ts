/**
 * Alarm Validation Schemas
 * 
 * Comprehensive Zod validation schemas for alarm data integrity.
 * Provides client-side validation with detailed error messages
 * and sanitization for all alarm-related operations.
 */

import { z } from 'zod';
import type { 
  AlarmFormData, 
  AlarmConfig, 
  AlarmState,
  RepeatPattern,
  AudioOutput,
  WhiteNoiseCategory 
} from './alarm';

// Base validation schemas for enums
export const AudioOutputSchema = z.enum(['speaker', 'headphones', 'auto'], {
  message: 'Audio output must be speaker, headphones, or auto'
});

export const RepeatPatternSchema = z.enum(['none', 'daily', 'weekdays', 'weekends', 'custom'], {
  message: 'Invalid repeat pattern'
});

export const WhiteNoiseCategorySchema = z.enum(['nature', 'ambient', 'mechanical', 'binaural', 'custom'], {
  message: 'Invalid white noise category'
});

// Time validation schema
export const TimeSchema = z.string()
  .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Time must be in HH:MM format (24-hour)'
  })
  .transform((time) => {
    const [hour, minute] = time.split(':').map(Number);
    if (hour < 0 || hour > 23) throw new Error('Hour must be between 0-23');
    if (minute < 0 || minute > 59) throw new Error('Minute must be between 0-59');
    return time;
  });

// Volume validation (0.0 to 1.0)
export const VolumeSchema = z.number()
  .min(0.0, 'Volume must be at least 0.0')
  .max(1.0, 'Volume must be at most 1.0')
  .transform((val) => Math.round(val * 100) / 100); // Round to 2 decimal places

// Duration validation for various use cases
export const DurationSchema = z.number()
  .int('Duration must be an integer')
  .min(0, 'Duration must be non-negative');

export const SnoozeDurationSchema = z.number()
  .int('Snooze duration must be an integer')
  .min(1, 'Snooze duration must be at least 1 minute')
  .max(60, 'Snooze duration cannot exceed 60 minutes');

export const FadeDurationSchema = z.number()
  .int('Fade duration must be an integer')
  .min(0, 'Fade duration must be non-negative')
  .max(300, 'Fade duration cannot exceed 5 minutes (300 seconds)');

export const WhiteNoiseDurationSchema = z.number()
  .int('White noise duration must be an integer')
  .min(1, 'White noise duration must be at least 1 minute')
  .nullable();

// Repeat days validation
export const RepeatDaysSchema = z.array(z.number().int().min(0).max(6))
  .max(7, 'Cannot have more than 7 days')
  .refine((days) => {
    const uniqueDays = new Set(days);
    return uniqueDays.size === days.length;
  }, 'Duplicate days are not allowed')
  .nullable();

// URL validation for audio files
export const AudioUrlSchema = z.string()
  .url('Must be a valid URL')
  .regex(/^https?:\/\//, 'URL must use HTTP or HTTPS protocol')
  .nullable();

// Alarm name validation
export const AlarmNameSchema = z.string()
  .min(1, 'Alarm name is required')
  .max(100, 'Alarm name cannot exceed 100 characters')
  .trim()
  .refine((name) => name.length > 0, 'Alarm name cannot be empty after trimming');

// Main alarm form validation schema
export const AlarmFormSchema = z.object({
  name: AlarmNameSchema,
  time: TimeSchema,
  enabled: z.boolean().default(true),
  repeat_pattern: RepeatPatternSchema.default('none'),
  repeat_days: RepeatDaysSchema,
  
  // Audio settings
  audio_file_url: AudioUrlSchema,
  audio_output: AudioOutputSchema.default('auto'),
  volume: VolumeSchema.default(0.7),
  
  // Behavior settings
  vibration_enabled: z.boolean().default(true),
  snooze_enabled: z.boolean().default(true),
  snooze_duration: SnoozeDurationSchema.default(5),
  snooze_count_limit: z.number()
    .int('Snooze count limit must be an integer')
    .min(1, 'Snooze count limit must be at least 1')
    .max(10, 'Snooze count limit cannot exceed 10')
    .default(3),
  
  // White noise integration
  white_noise_enabled: z.boolean().default(false),
  white_noise_file_url: AudioUrlSchema,
  white_noise_category: WhiteNoiseCategorySchema.nullable(),
  white_noise_volume: VolumeSchema.default(0.5),
  white_noise_duration: WhiteNoiseDurationSchema,
  
  // Audio effects
  fade_in_duration: FadeDurationSchema.default(0),
  fade_out_duration: FadeDurationSchema.default(0),
})
.superRefine((data, ctx) => {
  // Custom validation for repeat pattern and days
  if (data.repeat_pattern === 'custom') {
    if (!data.repeat_days || data.repeat_days.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Custom repeat pattern requires at least one day to be selected',
        path: ['repeat_days']
      });
    }
  } else if (['none', 'daily', 'weekdays', 'weekends'].includes(data.repeat_pattern) && data.repeat_days && data.repeat_days.length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Repeat days should only be set for custom repeat pattern',
      path: ['repeat_days']
    });
  }
  
  // White noise validation
  if (data.white_noise_enabled) {
    if (!data.white_noise_file_url && !data.white_noise_category) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'White noise requires either a file URL or category selection',
        path: ['white_noise_file_url', 'white_noise_category']
      });
    }
  }
  
  // Logical validation for fade durations
  const totalFadeDuration = data.fade_in_duration + data.fade_out_duration;
  if (totalFadeDuration > 600) { // 10 minutes total
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Combined fade in and fade out duration cannot exceed 10 minutes',
      path: ['fade_in_duration', 'fade_out_duration']
    });
  }
});

// Alarm update schema (all fields optional except what's required)
// Note: Cannot use .partial() on ZodEffects, so we recreate as needed
export const AlarmUpdateSchema = z.object({
  id: z.string().uuid('Invalid alarm ID'),
  name: AlarmNameSchema.optional(),
  time: TimeSchema.optional(),
  enabled: z.boolean().optional(),
  repeat_pattern: RepeatPatternSchema.optional(),
  repeat_days: RepeatDaysSchema.optional(),
  audio_file_url: AudioUrlSchema.optional(),
  audio_output: AudioOutputSchema.optional(),
  volume: VolumeSchema.optional(),
  vibration_enabled: z.boolean().optional(),
  snooze_enabled: z.boolean().optional(),
  snooze_duration: SnoozeDurationSchema.optional(),
  snooze_count_limit: z.number().int().min(1).max(10).optional(),
  white_noise_enabled: z.boolean().optional(),
  white_noise_file_url: AudioUrlSchema.optional(),
  white_noise_category: WhiteNoiseCategorySchema.nullable().optional(),
  white_noise_volume: VolumeSchema.optional(),
  white_noise_duration: WhiteNoiseDurationSchema.optional(),
  fade_in_duration: FadeDurationSchema.optional(),
  fade_out_duration: FadeDurationSchema.optional(),
});

// Alarm state validation schema
export const AlarmStateSchema = z.object({
  alarm_id: z.string().uuid('Invalid alarm ID'),
  status: z.enum(['scheduled', 'triggered', 'snoozed', 'dismissed', 'stopped']),
  triggered_at: z.date().nullable(),
  snoozed_at: z.date().nullable(),
  snooze_count: z.number().int().min(0),
  next_trigger_at: z.date().nullable(),
});

// Time configuration schema
export const TimeConfigSchema = z.object({
  hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59),
  timezone: z.string().min(1, 'Timezone is required'),
});

// Audio configuration schema
export const AudioConfigSchema = z.object({
  file_url: AudioUrlSchema,
  output: AudioOutputSchema,
  volume: VolumeSchema,
  fade_in_duration: FadeDurationSchema,
  fade_out_duration: FadeDurationSchema,
});

// White noise configuration schema
export const WhiteNoiseConfigSchema = z.object({
  enabled: z.boolean(),
  file_url: AudioUrlSchema,
  category: WhiteNoiseCategorySchema.nullable(),
  volume: VolumeSchema,
  duration: WhiteNoiseDurationSchema,
}).superRefine((data, ctx) => {
  if (data.enabled && !data.file_url && !data.category) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'White noise requires either file URL or category when enabled',
      path: ['file_url', 'category']
    });
  }
});

// Snooze configuration schema
export const SnoozeConfigSchema = z.object({
  enabled: z.boolean(),
  duration: SnoozeDurationSchema,
  count_limit: z.number().int().min(1).max(10),
  current_count: z.number().int().min(0),
}).superRefine((data, ctx) => {
  if (data.current_count > data.count_limit) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Current snooze count cannot exceed limit',
      path: ['current_count']
    });
  }
});

// Comprehensive alarm configuration schema
export const AlarmConfigSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: AlarmNameSchema,
  time: TimeConfigSchema,
  enabled: z.boolean(),
  repeat: z.object({
    pattern: RepeatPatternSchema,
    days: RepeatDaysSchema,
    custom_description: z.string().optional(),
  }),
  audio: AudioConfigSchema,
  white_noise: WhiteNoiseConfigSchema,
  snooze: SnoozeConfigSchema,
  vibration_enabled: z.boolean(),
  is_premium_feature: z.boolean(),
  created_at: z.date(),
  updated_at: z.date(),
  last_triggered_at: z.date().nullable(),
  next_trigger_at: z.date().nullable(),
});

// Bulk validation schemas for batch operations
export const BulkAlarmUpdateSchema = z.object({
  alarm_ids: z.array(z.string().uuid()).min(1, 'At least one alarm ID required'),
  updates: AlarmUpdateSchema.omit({ id: true }), // Reuse the manual partial schema
});

export const BulkAlarmDeleteSchema = z.object({
  alarm_ids: z.array(z.string().uuid()).min(1, 'At least one alarm ID required'),
  confirm: z.boolean().refine(val => val === true, 'Deletion must be confirmed'),
});

// Validation for alarm scheduling
export const AlarmScheduleSchema = z.object({
  alarm_id: z.string().uuid(),
  user_timezone: z.string().min(1),
  current_time: z.date().optional(), // For testing purposes
});

// Validation utilities
export const validateAlarmForm = (data: unknown) => {
  return AlarmFormSchema.safeParse(data);
};

export const validateAlarmUpdate = (data: unknown) => {
  return AlarmUpdateSchema.safeParse(data);
};

export const validateAlarmState = (data: unknown) => {
  return AlarmStateSchema.safeParse(data);
};

// Helper function to extract validation errors
export const extractValidationErrors = (result: z.SafeParseReturnType<any, any>) => {
  if (!result.success) {
    return result.error.issues.map((issue: any) => ({
      field: issue.path.join('.'),
      code: issue.code,
      message: issue.message,
    }));
  }
  return [];
};

// Helper function to validate and sanitize alarm data
export const sanitizeAlarmData = (data: unknown): AlarmFormData | null => {
  const result = validateAlarmForm(data);
  if (result.success) {
    return result.data;
  }
  return null;
};

// Custom validation functions for specific use cases
export const validateTimeFormat = (time: string): boolean => {
  return TimeSchema.safeParse(time).success;
};

export const validateVolume = (volume: number): boolean => {
  return VolumeSchema.safeParse(volume).success;
};

export const validateRepeatDays = (days: number[] | null, pattern: RepeatPattern): boolean => {
  if (pattern === 'custom') {
    return days !== null && days.length > 0 && RepeatDaysSchema.safeParse(days).success;
  }
  return days === null || days.length === 0;
};

// Validation for premium features
export const validatePremiumFeature = (data: Partial<AlarmFormData>, isPremium: boolean) => {
  if (!isPremium) {
    // Define premium-only features
    const premiumFeatures = [
      'white_noise_enabled',
      'fade_in_duration',
      'fade_out_duration',
    ];
    
    const errors: string[] = [];
    
    if (data.white_noise_enabled) {
      errors.push('White noise integration is a premium feature');
    }
    
    if ((data.fade_in_duration && data.fade_in_duration > 0) || 
        (data.fade_out_duration && data.fade_out_duration > 0)) {
      errors.push('Fade effects are premium features');
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }
  
  return { valid: true, errors: [] };
};

// Type guards for runtime validation
export const isValidAlarmFormData = (data: unknown): data is AlarmFormData => {
  return AlarmFormSchema.safeParse(data).success;
};

export const isValidAlarmConfig = (data: unknown): data is AlarmConfig => {
  return AlarmConfigSchema.safeParse(data).success;
};

export const isValidAlarmState = (data: unknown): data is AlarmState => {
  return AlarmStateSchema.safeParse(data).success;
};