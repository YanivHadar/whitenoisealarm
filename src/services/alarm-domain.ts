/**
 * Alarm Domain Service - Integration Layer
 * 
 * Master service that orchestrates all alarm-related operations.
 * Integrates CRUD operations, scheduling, audio management, snooze functionality,
 * and error handling to provide a unified interface for alarm management.
 * 
 * This is the single entry point for all alarm operations in the app.
 */

import { EnhancedAlarmService } from './alarm-service';
import { AlarmScheduler } from './alarm-scheduler';
import { SnoozeManager } from './snooze-manager';
import { AlarmAudio } from './alarm-audio';
import { AlarmErrorHandler } from './alarm-error-handler';
import type { 
  Alarm,
  AlarmFormData,
  AlarmWithStatus,
  AlarmState,
  AlarmScheduleResult,
  AlarmValidationResult,
  SnoozeResult
} from '../types/alarm';
import type { ServiceResponse } from './database';

/**
 * Comprehensive result interface for alarm operations
 */
export interface AlarmOperationResult<T = any> extends ServiceResponse<T> {
  validation?: AlarmValidationResult;
  schedule_result?: AlarmScheduleResult;
  audio_session_id?: string;
}

/**
 * Alarm domain configuration
 */
export interface AlarmDomainConfig {
  user_id: string;
  timezone: string;
  is_premium: boolean;
  enable_audio_preview: boolean;
  auto_schedule_notifications: boolean;
}

/**
 * Master alarm domain service
 */
export class AlarmDomain {
  private static config: AlarmDomainConfig | null = null;
  private static initialized = false;

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  /**
   * Initialize the alarm domain with user configuration
   */
  static async initialize(config: AlarmDomainConfig): Promise<void> {
    try {
      this.config = config;
      
      // Initialize all subsystems
      await Promise.all([
        AlarmScheduler.initialize(),
        SnoozeManager.initialize(),
        AlarmAudio.initialize(),
        AlarmErrorHandler.loadErrorLog(),
      ]);

      this.initialized = true;
      console.log('AlarmDomain initialized successfully');
    } catch (error) {
      console.error('Failed to initialize AlarmDomain:', error);
      throw error;
    }
  }

  /**
   * Update domain configuration
   */
  static updateConfig(updates: Partial<AlarmDomainConfig>): void {
    if (this.config) {
      this.config = { ...this.config, ...updates };
    }
  }

  // ============================================================================
  // ALARM MANAGEMENT
  // ============================================================================

  /**
   * Create a new alarm with full validation and scheduling
   */
  static async createAlarm(alarmData: AlarmFormData): Promise<AlarmOperationResult<Alarm>> {
    try {
      if (!this.initialized || !this.config) {
        throw new Error('AlarmDomain not initialized');
      }

      // Comprehensive validation
      const validation = AlarmErrorHandler.validateAlarmComprehensive(
        alarmData,
        this.config.is_premium
      );

      if (!validation.valid) {
        return {
          data: null,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Alarm data validation failed',
            details: { errors: validation.errors, warnings: validation.warnings },
          },
          success: false,
          validation,
        };
      }

      // Create alarm in database
      const createResult = await EnhancedAlarmService.create(
        alarmData,
        this.config.user_id,
        this.config.is_premium
      );

      if (!createResult.success || !createResult.data) {
        return {
          ...createResult,
          validation,
        };
      }

      const alarm = createResult.data;
      let scheduleResult: AlarmScheduleResult | undefined;

      // Schedule notification if enabled and auto-scheduling is on
      if (alarm.enabled && this.config.auto_schedule_notifications) {
        scheduleResult = await AlarmScheduler.scheduleAlarm(alarm, this.config.timezone);
        
        if (!scheduleResult.success && scheduleResult.error) {
          // Log scheduling error but don't fail the creation
          const error = AlarmErrorHandler.createError(
            'NOTIFICATION_SCHEDULING_FAILED',
            scheduleResult.error,
            undefined,
            { alarmId: alarm.id },
            { operation: 'create_alarm' }
          );
          await AlarmErrorHandler.logError(error);
        }
      }

      return {
        data: alarm,
        error: null,
        success: true,
        validation,
        schedule_result: scheduleResult,
      };
    } catch (error) {
      const alarmError = AlarmErrorHandler.createError(
        'DATABASE_ERROR',
        error instanceof Error ? error.message : 'Unknown error',
        undefined,
        { error },
        { operation: 'create_alarm' }
      );
      await AlarmErrorHandler.logError(alarmError);

      return {
        data: null,
        error: {
          code: 'SERVICE_ERROR',
          message: alarmError.message,
          details: alarmError.details,
        },
        success: false,
      };
    }
  }

  /**
   * Update an existing alarm
   */
  static async updateAlarm(
    alarmId: string,
    updates: Partial<AlarmFormData>
  ): Promise<AlarmOperationResult<Alarm>> {
    try {
      if (!this.initialized || !this.config) {
        throw new Error('AlarmDomain not initialized');
      }

      // Get current alarm for validation
      const currentResult = await EnhancedAlarmService.getById(alarmId);
      if (!currentResult.success || !currentResult.data) {
        return {
          data: null,
          error: {
            code: 'ALARM_NOT_FOUND',
            message: 'Alarm not found',
          },
          success: false,
        };
      }

      // Merge and validate updates
      const mergedData = this.mergeAlarmData(currentResult.data, updates);
      const validation = AlarmErrorHandler.validateAlarmComprehensive(
        mergedData,
        this.config.is_premium
      );

      if (!validation.valid) {
        return {
          data: null,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Alarm update validation failed',
            details: { errors: validation.errors, warnings: validation.warnings },
          },
          success: false,
          validation,
        };
      }

      // Update alarm in database
      const updateResult = await EnhancedAlarmService.update(
        alarmId,
        updates,
        this.config.is_premium
      );

      if (!updateResult.success || !updateResult.data) {
        return {
          ...updateResult,
          validation,
        };
      }

      const alarm = updateResult.data;
      let scheduleResult: AlarmScheduleResult | undefined;

      // Reschedule if necessary
      const needsRescheduling = this.requiresRescheduling(updates);
      if (needsRescheduling && this.config.auto_schedule_notifications) {
        if (alarm.enabled) {
          scheduleResult = await AlarmScheduler.scheduleAlarm(alarm, this.config.timezone);
        } else {
          await AlarmScheduler.cancelAlarmNotifications(alarmId);
          scheduleResult = {
            success: true,
            alarm_id: alarmId,
            next_trigger_at: null,
            notification_id: null,
          };
        }
      }

      return {
        data: alarm,
        error: null,
        success: true,
        validation,
        schedule_result: scheduleResult,
      };
    } catch (error) {
      const alarmError = AlarmErrorHandler.createError(
        'DATABASE_ERROR',
        error instanceof Error ? error.message : 'Unknown error',
        undefined,
        { error, alarmId },
        { operation: 'update_alarm' }
      );
      await AlarmErrorHandler.logError(alarmError);

      return {
        data: null,
        error: {
          code: 'SERVICE_ERROR',
          message: alarmError.message,
          details: alarmError.details,
        },
        success: false,
      };
    }
  }

  /**
   * Delete an alarm and clean up all associated data
   */
  static async deleteAlarm(alarmId: string): Promise<AlarmOperationResult<boolean>> {
    try {
      if (!this.initialized || !this.config) {
        throw new Error('AlarmDomain not initialized');
      }

      // Clean up all associated data
      await Promise.all([
        AlarmScheduler.cancelAlarmNotifications(alarmId),
        SnoozeManager.clearSnoozeState(alarmId),
        AlarmAudio.cleanupSessions(), // General cleanup
      ]);

      // Delete from database
      const deleteResult = await EnhancedAlarmService.delete(alarmId);

      return deleteResult;
    } catch (error) {
      const alarmError = AlarmErrorHandler.createError(
        'DATABASE_ERROR',
        error instanceof Error ? error.message : 'Unknown error',
        undefined,
        { error, alarmId },
        { operation: 'delete_alarm' }
      );
      await AlarmErrorHandler.logError(alarmError);

      return {
        data: null,
        error: {
          code: 'SERVICE_ERROR',
          message: alarmError.message,
          details: alarmError.details,
        },
        success: false,
      };
    }
  }

  /**
   * Get all alarms for the current user with enhanced status
   */
  static async getUserAlarms(includeDisabled: boolean = true): Promise<AlarmOperationResult<AlarmWithStatus[]>> {
    try {
      if (!this.initialized || !this.config) {
        throw new Error('AlarmDomain not initialized');
      }

      const result = await EnhancedAlarmService.getUserAlarms(
        this.config.user_id,
        includeDisabled
      );

      if (result.success && result.data) {
        // Enhance with snooze state information
        const enhancedAlarms = result.data.map(alarm => ({
          ...alarm,
          is_snoozed: SnoozeManager.isAlarmSnoozed(alarm.id),
          snooze_count: SnoozeManager.getSnoozeState(alarm.id)?.snooze_count || 0,
        }));

        return {
          data: enhancedAlarms,
          error: null,
          success: true,
        };
      }

      return result as AlarmOperationResult<AlarmWithStatus[]>;
    } catch (error) {
      const alarmError = AlarmErrorHandler.createError(
        'DATABASE_ERROR',
        error instanceof Error ? error.message : 'Unknown error',
        undefined,
        { error },
        { operation: 'get_user_alarms' }
      );
      await AlarmErrorHandler.logError(alarmError);

      return {
        data: null,
        error: {
          code: 'SERVICE_ERROR',
          message: alarmError.message,
          details: alarmError.details,
        },
        success: false,
      };
    }
  }

  /**
   * Get upcoming alarms for notification display
   */
  static async getUpcomingAlarms(days: number = 7): Promise<AlarmOperationResult<Array<{ alarm: Alarm; next_trigger: Date }>>> {
    try {
      if (!this.initialized || !this.config) {
        throw new Error('AlarmDomain not initialized');
      }

      return await EnhancedAlarmService.getUpcomingAlarms(this.config.user_id, days);
    } catch (error) {
      const alarmError = AlarmErrorHandler.createError(
        'DATABASE_ERROR',
        error instanceof Error ? error.message : 'Unknown error',
        undefined,
        { error },
        { operation: 'get_upcoming_alarms' }
      );
      await AlarmErrorHandler.logError(alarmError);

      return {
        data: null,
        error: {
          code: 'SERVICE_ERROR',
          message: alarmError.message,
          details: alarmError.details,
        },
        success: false,
      };
    }
  }

  // ============================================================================
  // ALARM PLAYBACK AND CONTROL
  // ============================================================================

  /**
   * Trigger an alarm with full audio playback
   */
  static async triggerAlarm(alarmId: string): Promise<AlarmOperationResult<{ session_id: string }>> {
    try {
      if (!this.initialized || !this.config) {
        throw new Error('AlarmDomain not initialized');
      }

      // Get alarm details
      const alarmResult = await EnhancedAlarmService.getById(alarmId);
      if (!alarmResult.success || !alarmResult.data) {
        return {
          data: null,
          error: {
            code: 'ALARM_NOT_FOUND',
            message: 'Alarm not found',
          },
          success: false,
        };
      }

      const alarm = alarmResult.data;

      // Start audio playback
      const audioResult = await AlarmAudio.playAlarm(alarm, alarm.audio_output);
      if (!audioResult.success || !audioResult.session_id) {
        return {
          data: null,
          error: {
            code: 'AUDIO_LOADING_FAILED',
            message: audioResult.error || 'Failed to start audio playback',
          },
          success: false,
        };
      }

      // Update last triggered timestamp
      await EnhancedAlarmService.update(alarmId, {
        last_triggered_at: new Date().toISOString(),
      });

      return {
        data: { session_id: audioResult.session_id },
        error: null,
        success: true,
        audio_session_id: audioResult.session_id,
      };
    } catch (error) {
      const alarmError = AlarmErrorHandler.createError(
        'AUDIO_LOADING_FAILED',
        error instanceof Error ? error.message : 'Unknown error',
        undefined,
        { error, alarmId },
        { operation: 'trigger_alarm' }
      );
      await AlarmErrorHandler.logError(alarmError);

      return {
        data: null,
        error: {
          code: 'SERVICE_ERROR',
          message: alarmError.message,
          details: alarmError.details,
        },
        success: false,
      };
    }
  }

  /**
   * Snooze an active alarm
   */
  static async snoozeAlarm(
    alarmId: string,
    sessionId: string,
    customDuration?: number
  ): Promise<AlarmOperationResult<SnoozeResult>> {
    try {
      if (!this.initialized || !this.config) {
        throw new Error('AlarmDomain not initialized');
      }

      // Get alarm details
      const alarmResult = await EnhancedAlarmService.getById(alarmId);
      if (!alarmResult.success || !alarmResult.data) {
        return {
          data: null,
          error: {
            code: 'ALARM_NOT_FOUND',
            message: 'Alarm not found',
          },
          success: false,
        };
      }

      const alarm = alarmResult.data;

      // Check if snooze is enabled
      if (!alarm.snooze_enabled) {
        return {
          data: null,
          error: {
            code: 'SNOOZE_DISABLED',
            message: 'Snooze is disabled for this alarm',
          },
          success: false,
        };
      }

      // Pause current audio
      await AlarmAudio.pauseAlarm(sessionId);

      // Execute snooze
      const snoozeResult = await SnoozeManager.snoozeAlarm(alarm, customDuration);

      return {
        data: snoozeResult,
        error: null,
        success: true,
      };
    } catch (error) {
      const alarmError = AlarmErrorHandler.createError(
        'DATABASE_ERROR',
        error instanceof Error ? error.message : 'Unknown error',
        undefined,
        { error, alarmId, sessionId },
        { operation: 'snooze_alarm' }
      );
      await AlarmErrorHandler.logError(alarmError);

      return {
        data: null,
        error: {
          code: 'SERVICE_ERROR',
          message: alarmError.message,
          details: alarmError.details,
        },
        success: false,
      };
    }
  }

  /**
   * Dismiss an active alarm
   */
  static async dismissAlarm(alarmId: string, sessionId: string): Promise<AlarmOperationResult<boolean>> {
    try {
      if (!this.initialized || !this.config) {
        throw new Error('AlarmDomain not initialized');
      }

      // Stop audio playback
      await AlarmAudio.stopAlarm(sessionId);

      // Dismiss snooze if active
      await SnoozeManager.dismissAlarm(alarmId);

      return {
        data: true,
        error: null,
        success: true,
      };
    } catch (error) {
      const alarmError = AlarmErrorHandler.createError(
        'DATABASE_ERROR',
        error instanceof Error ? error.message : 'Unknown error',
        undefined,
        { error, alarmId, sessionId },
        { operation: 'dismiss_alarm' }
      );
      await AlarmErrorHandler.logError(alarmError);

      return {
        data: null,
        error: {
          code: 'SERVICE_ERROR',
          message: alarmError.message,
          details: alarmError.details,
        },
        success: false,
      };
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Preview alarm sound
   */
  static async previewAlarmSound(soundUrl: string, duration: number = 5000): Promise<void> {
    if (!this.config?.enable_audio_preview) {
      throw new Error('Audio preview is disabled');
    }
    
    await AlarmAudio.previewSound(soundUrl, duration);
  }

  /**
   * Get available alarm sounds
   */
  static getAvailableAlarmSounds(): ReturnType<typeof AlarmAudio.getAlarmSounds> {
    return AlarmAudio.getAlarmSounds(this.config?.is_premium || false);
  }

  /**
   * Get available white noise sounds
   */
  static getAvailableWhiteNoiseSounds(): ReturnType<typeof AlarmAudio.getWhiteNoiseSounds> {
    return AlarmAudio.getWhiteNoiseSounds(this.config?.is_premium || false);
  }

  /**
   * Get alarm error statistics for diagnostics
   */
  static getErrorStatistics(): ReturnType<typeof AlarmErrorHandler.getErrorStatistics> {
    return AlarmErrorHandler.getErrorStatistics();
  }

  /**
   * Reschedule all user alarms (for timezone changes, etc.)
   */
  static async rescheduleAllAlarms(): Promise<void> {
    if (!this.initialized || !this.config) {
      throw new Error('AlarmDomain not initialized');
    }

    const alarmsResult = await this.getUserAlarms(false); // Only enabled alarms
    if (alarmsResult.success && alarmsResult.data) {
      const alarms = alarmsResult.data.map(alarm => alarm as Alarm);
      await AlarmScheduler.rescheduleAllAlarms(alarms, this.config.timezone);
    }
  }

  /**
   * Cleanup all resources
   */
  static async cleanup(): Promise<void> {
    await Promise.all([
      AlarmAudio.stopAllSessions(),
      AlarmAudio.cleanupSessions(),
      SnoozeManager.clearAllSnoozeStates(),
    ]);
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Merge current alarm data with updates
   */
  private static mergeAlarmData(current: Alarm, updates: Partial<AlarmFormData>): AlarmFormData {
    return {
      name: updates.name || current.name,
      time: updates.time || current.time,
      enabled: updates.enabled !== undefined ? updates.enabled : current.enabled,
      repeat_pattern: updates.repeat_pattern || current.repeat_pattern,
      repeat_days: updates.repeat_days !== undefined ? updates.repeat_days : current.repeat_days,
      audio_file_url: updates.audio_file_url !== undefined ? updates.audio_file_url : current.audio_file_url,
      audio_output: updates.audio_output || current.audio_output,
      volume: updates.volume !== undefined ? updates.volume : current.volume,
      vibration_enabled: updates.vibration_enabled !== undefined ? updates.vibration_enabled : current.vibration_enabled,
      snooze_enabled: updates.snooze_enabled !== undefined ? updates.snooze_enabled : current.snooze_enabled,
      snooze_duration: updates.snooze_duration !== undefined ? updates.snooze_duration : current.snooze_duration,
      snooze_count_limit: updates.snooze_count_limit !== undefined ? updates.snooze_count_limit : current.snooze_count_limit,
      white_noise_enabled: updates.white_noise_enabled !== undefined ? updates.white_noise_enabled : current.white_noise_enabled,
      white_noise_file_url: updates.white_noise_file_url !== undefined ? updates.white_noise_file_url : current.white_noise_file_url,
      white_noise_category: updates.white_noise_category !== undefined ? updates.white_noise_category : current.white_noise_category,
      white_noise_volume: updates.white_noise_volume !== undefined ? updates.white_noise_volume : current.white_noise_volume,
      white_noise_duration: updates.white_noise_duration !== undefined ? updates.white_noise_duration : current.white_noise_duration,
      fade_in_duration: updates.fade_in_duration !== undefined ? updates.fade_in_duration : current.fade_in_duration,
      fade_out_duration: updates.fade_out_duration !== undefined ? updates.fade_out_duration : current.fade_out_duration,
    };
  }

  /**
   * Check if updates require alarm rescheduling
   */
  private static requiresRescheduling(updates: Partial<AlarmFormData>): boolean {
    return !!(
      updates.time !== undefined ||
      updates.enabled !== undefined ||
      updates.repeat_pattern !== undefined ||
      updates.repeat_days !== undefined
    );
  }
}

export default AlarmDomain;