/**
 * Authentication Types and Validation Schemas
 * 
 * Comprehensive type definitions and Zod schemas for
 * authentication, user management, and security features.
 */

import { z } from 'zod';

/**
 * Authentication form validation schemas
 */
export const SignInSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .max(255, 'Email is too long')
    .transform(email => email.trim().toLowerCase()),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long'),
});

export const SignUpSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .max(255, 'Email is too long')
    .transform(email => email.trim().toLowerCase()),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one lowercase letter, one uppercase letter, and one number'
    ),
  confirmPassword: z
    .string()
    .min(1, 'Please confirm your password'),
  fullName: z
    .string()
    .max(100, 'Name is too long')
    .transform(name => name.trim())
    .optional(),
  agreeToTerms: z
    .boolean()
    .refine(val => val === true, 'You must agree to the terms and conditions'),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const ResetPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .max(255, 'Email is too long')
    .transform(email => email.trim().toLowerCase()),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one lowercase letter, one uppercase letter, and one number'
    ),
  confirmNewPassword: z
    .string()
    .min(1, 'Please confirm your new password'),
}).refine(data => data.newPassword === data.confirmNewPassword, {
  message: 'New passwords do not match',
  path: ['confirmNewPassword'],
});

export const UpdateProfileSchema = z.object({
  full_name: z
    .string()
    .max(100, 'Name is too long')
    .transform(name => name.trim())
    .optional(),
  preferences: z.object({
    theme: z.enum(['light', 'dark', 'system']).default('system'),
    notifications_enabled: z.boolean().default(true),
    vibration_enabled: z.boolean().default(true),
    biometric_auth_enabled: z.boolean().default(false),
  }).optional(),
});

/**
 * Type exports from schemas
 */
export type SignInForm = z.infer<typeof SignInSchema>;
export type SignUpForm = z.infer<typeof SignUpSchema>;
export type ResetPasswordForm = z.infer<typeof ResetPasswordSchema>;
export type ChangePasswordForm = z.infer<typeof ChangePasswordSchema>;
export type UpdateProfileForm = z.infer<typeof UpdateProfileSchema>;

/**
 * Authentication state types
 */
export type AuthenticationStatus = 
  | 'unauthenticated'
  | 'authenticated'
  | 'loading'
  | 'error';

export type SubscriptionStatus = 
  | 'free'
  | 'trial'
  | 'premium'
  | 'canceled'
  | 'expired';

export type BiometricAuthType = 
  | 'fingerprint'
  | 'facial_recognition'
  | 'iris'
  | 'voice'
  | 'none';

/**
 * User preference types
 */
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications_enabled: boolean;
  vibration_enabled: boolean;
  biometric_auth_enabled: boolean;
  default_alarm_sound?: string;
  default_white_noise?: string;
  auto_start_white_noise?: boolean;
  sleep_reminder_enabled?: boolean;
  sleep_reminder_time?: string;
}

/**
 * Security and privacy types
 */
export interface SecuritySettings {
  two_factor_enabled: boolean;
  biometric_enabled: boolean;
  session_timeout_minutes: number;
  require_auth_for_settings: boolean;
  data_export_requested_at?: string;
  account_deletion_requested_at?: string;
}

export interface PrivacySettings {
  analytics_enabled: boolean;
  crash_reporting_enabled: boolean;
  personalized_ads_enabled: boolean;
  data_sharing_enabled: boolean;
  location_tracking_enabled: boolean;
}

/**
 * OAuth provider types
 */
export type OAuthProvider = 'google' | 'apple' | 'facebook';

export interface OAuthResult {
  success: boolean;
  error?: string;
  user?: any;
  session?: any;
}

/**
 * Biometric authentication types
 */
export interface BiometricCapabilities {
  isSupported: boolean;
  availableTypes: BiometricAuthType[];
  isEnrolled: boolean;
  securityLevel: 'none' | 'biometric' | 'device_credential' | 'both';
}

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
  biometricType?: BiometricAuthType;
}

/**
 * Session management types
 */
export interface SessionInfo {
  id: string;
  user_id: string;
  created_at: string;
  expires_at: string;
  last_active_at: string;
  device_info: {
    platform: string;
    version: string;
    model?: string;
    is_primary: boolean;
  };
  location?: {
    country?: string;
    city?: string;
    ip_hash?: string;
  };
}

/**
 * Account recovery types
 */
export interface RecoveryOptions {
  email_recovery: boolean;
  sms_recovery: boolean;
  backup_codes: string[];
  recovery_questions: Array<{
    question: string;
    answer_hash: string;
  }>;
}

/**
 * Account deletion and data export types
 */
export interface DataExportRequest {
  id: string;
  user_id: string;
  requested_at: string;
  completed_at?: string;
  download_url?: string;
  expires_at?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'expired';
  data_types: string[];
  file_size_bytes?: number;
}

export interface AccountDeletionRequest {
  id: string;
  user_id: string;
  requested_at: string;
  scheduled_deletion_date: string;
  cancellation_deadline: string;
  reason?: string;
  status: 'pending' | 'confirmed' | 'processing' | 'completed' | 'cancelled';
  data_retention_policy: {
    logs_retention_days: number;
    backup_retention_days: number;
    legal_hold_retention_days?: number;
  };
}

/**
 * Error types specific to authentication
 */
export type AuthErrorCode = 
  | 'INVALID_CREDENTIALS'
  | 'USER_NOT_FOUND'
  | 'EMAIL_ALREADY_EXISTS'
  | 'WEAK_PASSWORD'
  | 'EMAIL_NOT_CONFIRMED'
  | 'TOO_MANY_ATTEMPTS'
  | 'SESSION_EXPIRED'
  | 'NETWORK_ERROR'
  | 'BIOMETRIC_NOT_AVAILABLE'
  | 'OAUTH_ERROR'
  | 'UNKNOWN_ERROR';

export interface AuthError {
  code: AuthErrorCode;
  message: string;
  details?: any;
  timestamp: Date;
}

/**
 * Validation utility functions
 */
export const validateEmail = (email: string): boolean => {
  return SignInSchema.shape.email.safeParse(email).success;
};

export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const result = SignUpSchema.shape.password.safeParse(password);
  
  if (result.success) {
    return { isValid: true, errors: [] };
  }
  
  return {
    isValid: false,
    errors: result.error.errors.map(err => err.message),
  };
};

/**
 * Security utility functions
 */
export const isStrongPassword = (password: string): boolean => {
  return (
    password.length >= 12 &&
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/i.test(password)
  );
};

export const generateSecurePassword = (): string => {
  const length = 16;
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@$!%*?&';
  let password = '';
  
  // Ensure at least one of each required character type
  password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
  password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
  password += '0123456789'[Math.floor(Math.random() * 10)];
  password += '@$!%*?&'[Math.floor(Math.random() * 7)];
  
  // Fill the rest randomly
  for (let i = 4; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => 0.5 - Math.random()).join('');
};

export default {
  SignInSchema,
  SignUpSchema,
  ResetPasswordSchema,
  ChangePasswordSchema,
  UpdateProfileSchema,
  validateEmail,
  validatePassword,
  isStrongPassword,
  generateSecurePassword,
};