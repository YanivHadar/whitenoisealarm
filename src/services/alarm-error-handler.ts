/**
 * Alarm Error Handling Service
 * 
 * Comprehensive error handling and recovery system for alarm operations.
 * Provides detailed error categorization, user-friendly messages,
 * and automatic recovery strategies for reliability-critical operations.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { 
  AlarmError,
  AlarmErrorCode,
  AlarmValidationResult,
  AlarmValidationError,
  AlarmValidationWarning,
  AlarmFormData
} from '../types/alarm';

// Error severity levels
export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

// Error categories for grouping and handling
export type ErrorCategory = 
  | 'validation'
  | 'permission'
  | 'audio'
  | 'notification'
  | 'network'
  | 'storage'
  | 'premium'
  | 'system';

// Enhanced error interface with metadata
export interface EnhancedAlarmError extends AlarmError {
  id: string;
  timestamp: Date;
  severity: ErrorSeverity;
  category: ErrorCategory;
  user_action_required: boolean;
  retry_possible: boolean;
  suggested_actions: string[];
  technical_details?: Record<string, any>;
  user_context?: Record<string, any>;
}

// Error recovery strategies
export type RecoveryStrategy = 'retry' | 'fallback' | 'user_action' | 'ignore' | 'escalate';

export interface ErrorRecoveryPlan {
  strategy: RecoveryStrategy;
  max_retry_attempts: number;
  retry_delay_ms: number;
  fallback_action?: () => Promise<void>;
  user_message: string;
  technical_steps: string[];
}

// Storage keys
const STORAGE_KEYS = {
  ERROR_LOG: 'alarm_error_log',
  ERROR_STATS: 'alarm_error_statistics',
  RECOVERY_ATTEMPTS: 'alarm_recovery_attempts',
};

// Error code to metadata mapping
const ERROR_METADATA: Record<AlarmErrorCode, {
  severity: ErrorSeverity;
  category: ErrorCategory;
  user_action_required: boolean;
  retry_possible: boolean;
  user_message: string;
  technical_message: string;
  suggested_actions: string[];
  recovery_plan: ErrorRecoveryPlan;
}> = {
  INVALID_TIME: {
    severity: 'error',
    category: 'validation',
    user_action_required: true,
    retry_possible: false,
    user_message: 'Please enter a valid time in 24-hour format (HH:MM)',
    technical_message: 'Time validation failed: invalid format or out of range',
    suggested_actions: [
      'Use 24-hour format (00:00 to 23:59)',
      'Ensure hours are 0-23 and minutes are 0-59',
    ],
    recovery_plan: {
      strategy: 'user_action',
      max_retry_attempts: 0,
      retry_delay_ms: 0,
      user_message: 'Please correct the time format and try again.',
      technical_steps: ['Validate time format', 'Parse hours and minutes', 'Check ranges'],
    },
  },

  INVALID_REPEAT_PATTERN: {
    severity: 'error',
    category: 'validation',
    user_action_required: true,
    retry_possible: false,
    user_message: 'Invalid repeat pattern selected',
    technical_message: 'Repeat pattern validation failed',
    suggested_actions: [
      'Select a valid repeat pattern',
      'Ensure custom pattern has days selected',
    ],
    recovery_plan: {
      strategy: 'user_action',
      max_retry_attempts: 0,
      retry_delay_ms: 0,
      user_message: 'Please select a valid repeat pattern.',
      technical_steps: ['Validate repeat pattern enum', 'Check custom days array'],
    },
  },

  INVALID_REPEAT_DAYS: {
    severity: 'error',
    category: 'validation',
    user_action_required: true,
    retry_possible: false,
    user_message: 'Please select at least one day for custom repeat pattern',
    technical_message: 'Custom repeat pattern requires valid days array',
    suggested_actions: [
      'Select at least one day of the week',
      'Ensure day values are between 0-6',
    ],
    recovery_plan: {
      strategy: 'user_action',
      max_retry_attempts: 0,
      retry_delay_ms: 0,
      user_message: 'Please select which days the alarm should repeat.',
      technical_steps: ['Validate days array', 'Check day range 0-6', 'Ensure non-empty'],
    },
  },

  INVALID_AUDIO_URL: {
    severity: 'warning',
    category: 'audio',
    user_action_required: false,
    retry_possible: true,
    user_message: 'Custom alarm sound is not accessible. Using default sound.',
    technical_message: 'Audio file URL validation or loading failed',
    suggested_actions: [
      'Check internet connection',
      'Verify audio file is accessible',
      'Try a different audio file',
    ],
    recovery_plan: {
      strategy: 'fallback',
      max_retry_attempts: 2,
      retry_delay_ms: 1000,
      user_message: 'We\'ll use the default alarm sound for now.',
      technical_steps: ['Retry URL validation', 'Use default sound', 'Log URL issue'],
    },
  },

  INVALID_VOLUME: {
    severity: 'error',
    category: 'validation',
    user_action_required: true,
    retry_possible: false,
    user_message: 'Volume must be between 0% and 100%',
    technical_message: 'Volume validation failed: out of range 0.0-1.0',
    suggested_actions: [
      'Set volume between 0% and 100%',
      'Use the volume slider controls',
    ],
    recovery_plan: {
      strategy: 'user_action',
      max_retry_attempts: 0,
      retry_delay_ms: 0,
      user_message: 'Please adjust the volume to a valid level.',
      technical_steps: ['Validate volume range', 'Clamp to 0.0-1.0', 'Update UI'],
    },
  },

  INVALID_SNOOZE_DURATION: {
    severity: 'error',
    category: 'validation',
    user_action_required: true,
    retry_possible: false,
    user_message: 'Snooze duration must be between 1 and 60 minutes',
    technical_message: 'Snooze duration validation failed',
    suggested_actions: [
      'Set snooze duration between 1-60 minutes',
      'Use common values like 5, 10, or 15 minutes',
    ],
    recovery_plan: {
      strategy: 'user_action',
      max_retry_attempts: 0,
      retry_delay_ms: 0,
      user_message: 'Please choose a snooze duration between 1 and 60 minutes.',
      technical_steps: ['Validate duration range', 'Check integer value', 'Update form'],
    },
  },

  INVALID_FADE_DURATION: {
    severity: 'error',
    category: 'validation',
    user_action_required: true,
    retry_possible: false,
    user_message: 'Fade duration must be between 0 and 300 seconds',
    technical_message: 'Fade duration validation failed',
    suggested_actions: [
      'Set fade duration between 0-300 seconds',
      'Use shorter durations for better experience',
    ],
    recovery_plan: {
      strategy: 'user_action',
      max_retry_attempts: 0,
      retry_delay_ms: 0,
      user_message: 'Please adjust the fade duration.',
      technical_steps: ['Validate duration range', 'Check combined fade time', 'Update settings'],
    },
  },

  PERMISSION_DENIED: {
    severity: 'critical',
    category: 'permission',
    user_action_required: true,
    retry_possible: true,
    user_message: 'Notification permissions are required for alarms to work',
    technical_message: 'Notification permissions not granted',
    suggested_actions: [
      'Open Settings and enable notifications',
      'Grant notification permissions',
      'Restart the app if needed',
    ],
    recovery_plan: {
      strategy: 'user_action',
      max_retry_attempts: 3,
      retry_delay_ms: 5000,
      user_message: 'Please enable notifications in Settings to ensure alarms work properly.',
      technical_steps: ['Request permissions', 'Guide to settings', 'Retry after grant'],
    },
  },

  NOTIFICATION_SCHEDULING_FAILED: {
    severity: 'critical',
    category: 'notification',
    user_action_required: false,
    retry_possible: true,
    user_message: 'Failed to schedule alarm notification. Please try again.',
    technical_message: 'expo-notifications scheduling failed',
    suggested_actions: [
      'Check device storage space',
      'Restart the app',
      'Check system notification settings',
    ],
    recovery_plan: {
      strategy: 'retry',
      max_retry_attempts: 3,
      retry_delay_ms: 2000,
      user_message: 'Retrying alarm scheduling...',
      technical_steps: ['Clear old notifications', 'Retry scheduling', 'Check system limits'],
    },
  },

  DATABASE_ERROR: {
    severity: 'error',
    category: 'storage',
    user_action_required: false,
    retry_possible: true,
    user_message: 'Failed to save alarm. Please try again.',
    technical_message: 'Database operation failed',
    suggested_actions: [
      'Check internet connection',
      'Try again in a few moments',
      'Restart the app if problem persists',
    ],
    recovery_plan: {
      strategy: 'retry',
      max_retry_attempts: 3,
      retry_delay_ms: 3000,
      user_message: 'Retrying save operation...',
      technical_steps: ['Check connection', 'Retry with exponential backoff', 'Cache locally'],
    },
  },

  NETWORK_ERROR: {
    severity: 'warning',
    category: 'network',
    user_action_required: false,
    retry_possible: true,
    user_message: 'Network connection issue. Some features may not work.',
    technical_message: 'Network request failed',
    suggested_actions: [
      'Check internet connection',
      'Switch to WiFi if using cellular',
      'Try again when connection improves',
    ],
    recovery_plan: {
      strategy: 'retry',
      max_retry_attempts: 5,
      retry_delay_ms: 5000,
      user_message: 'Working offline. Changes will sync when connection is restored.',
      technical_steps: ['Enable offline mode', 'Queue operations', 'Retry when online'],
    },
  },

  AUDIO_LOADING_FAILED: {
    severity: 'warning',
    category: 'audio',
    user_action_required: false,
    retry_possible: true,
    user_message: 'Failed to load audio file. Using default sound.',
    technical_message: 'Audio file loading or decoding failed',
    suggested_actions: [
      'Check internet connection',
      'Verify audio file format is supported',
      'Try a different audio file',
    ],
    recovery_plan: {
      strategy: 'fallback',
      max_retry_attempts: 2,
      retry_delay_ms: 1000,
      user_message: 'Using default alarm sound instead.',
      technical_steps: ['Retry loading', 'Use cached version', 'Fallback to default'],
    },
  },

  PREMIUM_FEATURE_REQUIRED: {
    severity: 'info',
    category: 'premium',
    user_action_required: true,
    retry_possible: false,
    user_message: 'This feature requires a premium subscription',
    technical_message: 'Premium feature access denied',
    suggested_actions: [
      'Upgrade to premium',
      'Use basic alarm features',
      'Learn more about premium benefits',
    ],
    recovery_plan: {
      strategy: 'user_action',
      max_retry_attempts: 0,
      retry_delay_ms: 0,
      user_message: 'Upgrade to unlock premium features like white noise and fade effects.',
      technical_steps: ['Show premium upgrade', 'Disable premium features', 'Guide user'],
    },
  },
};

/**
 * Comprehensive alarm error handling service
 */
export class AlarmErrorHandler {
  private static errorLog: EnhancedAlarmError[] = [];
  private static recoveryAttempts = new Map<string, number>();

  // ============================================================================
  // ERROR CREATION AND LOGGING
  // ============================================================================

  /**
   * Create a comprehensive alarm error
   */
  static createError(
    code: AlarmErrorCode,
    message?: string,
    field?: keyof AlarmFormData,
    details?: Record<string, any>,
    userContext?: Record<string, any>
  ): EnhancedAlarmError {
    const metadata = ERROR_METADATA[code];
    const errorId = `${code}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      id: errorId,
      code,
      message: message || metadata.user_message,
      field,
      details,
      timestamp: new Date(),
      severity: metadata.severity,
      category: metadata.category,
      user_action_required: metadata.user_action_required,
      retry_possible: metadata.retry_possible,
      suggested_actions: metadata.suggested_actions,
      technical_details: details,
      user_context: userContext,
    };
  }

  /**
   * Log an error with automatic persistence
   */
  static async logError(error: EnhancedAlarmError): Promise<void> {
    try {
      this.errorLog.push(error);
      
      // Keep only recent errors (last 100)
      if (this.errorLog.length > 100) {
        this.errorLog = this.errorLog.slice(-100);
      }

      // Persist to storage
      await this.persistErrorLog();

      // Log to console for development
      const logLevel = error.severity === 'critical' ? 'error' : 
                      error.severity === 'error' ? 'error' :
                      error.severity === 'warning' ? 'warn' : 'info';
      
      console[logLevel](`[AlarmError:${error.code}]`, error.message, error.details);
    } catch (persistError) {
      console.error('Failed to log alarm error:', persistError);
    }
  }

  /**
   * Handle error with automatic recovery attempt
   */
  static async handleError(
    error: EnhancedAlarmError,
    context?: Record<string, any>
  ): Promise<{ recovered: boolean; message: string }> {
    await this.logError(error);

    const metadata = ERROR_METADATA[error.code];
    const recoveryPlan = metadata.recovery_plan;
    
    // Check if we should attempt recovery
    const attemptKey = `${error.code}_${JSON.stringify(context)}`;
    const currentAttempts = this.recoveryAttempts.get(attemptKey) || 0;

    if (recoveryPlan.strategy === 'retry' && currentAttempts < recoveryPlan.max_retry_attempts) {
      // Attempt automatic retry
      this.recoveryAttempts.set(attemptKey, currentAttempts + 1);
      
      // Wait before retry
      if (recoveryPlan.retry_delay_ms > 0) {
        await new Promise(resolve => setTimeout(resolve, recoveryPlan.retry_delay_ms));
      }

      return {
        recovered: false, // Recovery attempt made, but not guaranteed
        message: `Retry attempt ${currentAttempts + 1} of ${recoveryPlan.max_retry_attempts}`,
      };
    }

    if (recoveryPlan.strategy === 'fallback' && recoveryPlan.fallback_action) {
      // Attempt fallback action
      try {
        await recoveryPlan.fallback_action();
        return {
          recovered: true,
          message: recoveryPlan.user_message,
        };
      } catch (fallbackError) {
        console.error('Fallback action failed:', fallbackError);
      }
    }

    // Reset attempts if max reached or no recovery possible
    this.recoveryAttempts.delete(attemptKey);

    return {
      recovered: false,
      message: recoveryPlan.user_message,
    };
  }

  // ============================================================================
  // VALIDATION ERROR HANDLING
  // ============================================================================

  /**
   * Create validation errors from field issues
   */
  static createValidationErrors(
    fieldErrors: Array<{ field: keyof AlarmFormData; message: string; code?: string }>
  ): AlarmValidationError[] {
    return fieldErrors.map(({ field, message, code = 'VALIDATION_FAILED' }) => ({
      field,
      code,
      message,
    }));
  }

  /**
   * Create validation warnings for non-blocking issues
   */
  static createValidationWarnings(
    fieldWarnings: Array<{ field: keyof AlarmFormData; message: string; code?: string }>
  ): AlarmValidationWarning[] {
    return fieldWarnings.map(({ field, message, code = 'VALIDATION_WARNING' }) => ({
      field,
      code,
      message,
    }));
  }

  /**
   * Comprehensive alarm validation with detailed error reporting
   */
  static validateAlarmComprehensive(
    alarmData: AlarmFormData,
    isPremium: boolean = false
  ): AlarmValidationResult {
    const errors: AlarmValidationError[] = [];
    const warnings: AlarmValidationWarning[] = [];

    // Time validation
    if (!alarmData.time || !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(alarmData.time)) {
      errors.push({
        field: 'time',
        code: 'INVALID_TIME',
        message: 'Please enter a valid time in 24-hour format (HH:MM)',
      });
    }

    // Name validation
    if (!alarmData.name || alarmData.name.trim().length === 0) {
      errors.push({
        field: 'name',
        code: 'INVALID_NAME',
        message: 'Alarm name is required',
      });
    } else if (alarmData.name.length > 100) {
      errors.push({
        field: 'name',
        code: 'NAME_TOO_LONG',
        message: 'Alarm name cannot exceed 100 characters',
      });
    }

    // Repeat pattern validation
    if (alarmData.repeat_pattern === 'custom') {
      if (!alarmData.repeat_days || alarmData.repeat_days.length === 0) {
        errors.push({
          field: 'repeat_days',
          code: 'INVALID_REPEAT_DAYS',
          message: 'Please select at least one day for custom repeat pattern',
        });
      } else {
        const invalidDays = alarmData.repeat_days.filter(day => day < 0 || day > 6);
        if (invalidDays.length > 0) {
          errors.push({
            field: 'repeat_days',
            code: 'INVALID_DAY_VALUES',
            message: 'Day values must be between 0 (Sunday) and 6 (Saturday)',
          });
        }
      }
    }

    // Volume validation
    if (alarmData.volume < 0 || alarmData.volume > 1) {
      errors.push({
        field: 'volume',
        code: 'INVALID_VOLUME',
        message: 'Volume must be between 0% and 100%',
      });
    }

    // Snooze validation
    if (alarmData.snooze_enabled) {
      if (alarmData.snooze_duration < 1 || alarmData.snooze_duration > 60) {
        errors.push({
          field: 'snooze_duration',
          code: 'INVALID_SNOOZE_DURATION',
          message: 'Snooze duration must be between 1 and 60 minutes',
        });
      }

      if (alarmData.snooze_count_limit < 1 || alarmData.snooze_count_limit > 10) {
        errors.push({
          field: 'snooze_count_limit',
          code: 'INVALID_SNOOZE_COUNT',
          message: 'Snooze count limit must be between 1 and 10',
        });
      }
    }

    // Premium feature validation
    if (!isPremium) {
      if (alarmData.white_noise_enabled) {
        errors.push({
          field: 'white_noise_enabled',
          code: 'PREMIUM_FEATURE_REQUIRED',
          message: 'White noise is a premium feature',
        });
      }

      if (alarmData.fade_in_duration > 0 || alarmData.fade_out_duration > 0) {
        errors.push({
          field: 'fade_in_duration',
          code: 'PREMIUM_FEATURE_REQUIRED',
          message: 'Fade effects are premium features',
        });
      }
    }

    // White noise validation
    if (alarmData.white_noise_enabled) {
      if (!alarmData.white_noise_file_url && !alarmData.white_noise_category) {
        errors.push({
          field: 'white_noise_file_url',
          code: 'WHITE_NOISE_REQUIRED',
          message: 'Please select a white noise sound or category',
        });
      }

      if (alarmData.white_noise_volume < 0 || alarmData.white_noise_volume > 1) {
        errors.push({
          field: 'white_noise_volume',
          code: 'INVALID_VOLUME',
          message: 'White noise volume must be between 0% and 100%',
        });
      }
    }

    // Fade duration validation
    if (alarmData.fade_in_duration < 0 || alarmData.fade_in_duration > 300) {
      errors.push({
        field: 'fade_in_duration',
        code: 'INVALID_FADE_DURATION',
        message: 'Fade in duration must be between 0 and 300 seconds',
      });
    }

    if (alarmData.fade_out_duration < 0 || alarmData.fade_out_duration > 300) {
      errors.push({
        field: 'fade_out_duration',
        code: 'INVALID_FADE_DURATION',
        message: 'Fade out duration must be between 0 and 300 seconds',
      });
    }

    // Combined fade duration warning
    const totalFade = alarmData.fade_in_duration + alarmData.fade_out_duration;
    if (totalFade > 600) {
      warnings.push({
        field: 'fade_in_duration',
        code: 'LONG_FADE_DURATION',
        message: 'Very long fade durations may affect alarm effectiveness',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ============================================================================
  // ERROR STATISTICS AND REPORTING
  // ============================================================================

  /**
   * Get error statistics
   */
  static getErrorStatistics(): {
    total_errors: number;
    errors_by_code: Record<string, number>;
    errors_by_category: Record<string, number>;
    errors_by_severity: Record<string, number>;
    recent_errors: EnhancedAlarmError[];
  } {
    const byCode: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    this.errorLog.forEach(error => {
      byCode[error.code] = (byCode[error.code] || 0) + 1;
      byCategory[error.category] = (byCategory[error.category] || 0) + 1;
      bySeverity[error.severity] = (bySeverity[error.severity] || 0) + 1;
    });

    const recentErrors = this.errorLog
      .filter(error => error.timestamp.getTime() > Date.now() - 24 * 60 * 60 * 1000)
      .slice(-10);

    return {
      total_errors: this.errorLog.length,
      errors_by_code: byCode,
      errors_by_category: byCategory,
      errors_by_severity: bySeverity,
      recent_errors: recentErrors,
    };
  }

  /**
   * Clear error log
   */
  static async clearErrorLog(): Promise<void> {
    this.errorLog = [];
    this.recoveryAttempts.clear();
    await this.persistErrorLog();
  }

  // ============================================================================
  // PERSISTENCE
  // ============================================================================

  /**
   * Load error log from storage
   */
  static async loadErrorLog(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.ERROR_LOG);
      if (data) {
        this.errorLog = JSON.parse(data, (key, value) => {
          if (key === 'timestamp') {
            return new Date(value);
          }
          return value;
        });
      }
    } catch (error) {
      console.error('Failed to load error log:', error);
    }
  }

  /**
   * Persist error log to storage
   */
  private static async persistErrorLog(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ERROR_LOG, JSON.stringify(this.errorLog));
    } catch (error) {
      console.error('Failed to persist error log:', error);
    }
  }
}

export default AlarmErrorHandler;