/**
 * Snooze Management Service
 * 
 * Comprehensive snooze functionality with state tracking, persistence,
 * and reliable snooze countdown management. Integrates with alarm
 * scheduling to provide seamless snooze experiences.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { 
  Alarm,
  AlarmState,
  SnoozeConfig,
  AlarmScheduleResult
} from '../types/alarm';
import { AlarmScheduler } from './alarm-scheduler';

// Storage keys for snooze state
const STORAGE_KEYS = {
  SNOOZE_STATES: 'snooze_states',
  SNOOZE_HISTORY: 'snooze_history',
};

// Snooze event types
export type SnoozeEventType = 'snoozed' | 'dismissed' | 'expired' | 'cancelled';

export interface SnoozeState {
  alarm_id: string;
  is_active: boolean;
  snooze_count: number;
  max_snooze_count: number;
  snooze_duration: number; // minutes
  original_trigger_time: Date;
  current_snooze_time: Date | null;
  next_snooze_time: Date | null;
  snooze_history: SnoozeHistoryEntry[];
  created_at: Date;
  updated_at: Date;
}

export interface SnoozeHistoryEntry {
  snoozed_at: Date;
  snooze_number: number;
  snooze_duration: number;
  dismissed_at?: Date;
  event_type: SnoozeEventType;
}

export interface SnoozeResult {
  success: boolean;
  alarm_id: string;
  snooze_count: number;
  next_snooze_time: Date | null;
  can_snooze_again: boolean;
  error?: string;
}

/**
 * Snooze management and state tracking service
 */
export class SnoozeManager {
  private static snoozeStates = new Map<string, SnoozeState>();
  private static snoozeTimers = new Map<string, NodeJS.Timeout>();
  private static initialized = false;

  // ============================================================================
  // INITIALIZATION AND SETUP
  // ============================================================================

  /**
   * Initialize the snooze manager
   */
  static async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.loadSnoozeStates();
      await this.restoreActiveSnoozes();
      this.initialized = true;
      console.log('SnoozeManager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize SnoozeManager:', error);
      throw error;
    }
  }

  /**
   * Load snooze states from persistent storage
   */
  private static async loadSnoozeStates(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SNOOZE_STATES);
      if (data) {
        const states: [string, SnoozeState][] = JSON.parse(data, (key, value) => {
          // Parse date fields
          if (key.includes('time') || key.includes('_at')) {
            return value ? new Date(value) : null;
          }
          return value;
        });
        this.snoozeStates = new Map(states);
      }
    } catch (error) {
      console.error('Failed to load snooze states:', error);
    }
  }

  /**
   * Save snooze states to persistent storage
   */
  private static async saveSnoozeStates(): Promise<void> {
    try {
      const data = Array.from(this.snoozeStates.entries());
      await AsyncStorage.setItem(STORAGE_KEYS.SNOOZE_STATES, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save snooze states:', error);
    }
  }

  /**
   * Restore active snoozes after app restart
   */
  private static async restoreActiveSnoozes(): Promise<void> {
    const now = new Date();
    
    for (const [alarmId, state] of this.snoozeStates) {
      if (state.is_active && state.next_snooze_time) {
        if (state.next_snooze_time > now) {
          // Snooze is still active, restart the timer
          this.startSnoozeTimer(alarmId, state);
        } else {
          // Snooze has expired, mark as completed
          await this.completeSnooze(alarmId, 'expired');
        }
      }
    }
  }

  // ============================================================================
  // SNOOZE OPERATIONS
  // ============================================================================

  /**
   * Snooze an alarm
   */
  static async snoozeAlarm(
    alarm: Alarm,
    customDuration?: number // minutes, overrides alarm setting
  ): Promise<SnoozeResult> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const snoozeDuration = customDuration || alarm.snooze_duration;
      const existingState = this.snoozeStates.get(alarm.id);
      
      // Check if snooze is allowed
      if (existingState && existingState.snooze_count >= existingState.max_snooze_count) {
        return {
          success: false,
          alarm_id: alarm.id,
          snooze_count: existingState.snooze_count,
          next_snooze_time: null,
          can_snooze_again: false,
          error: 'Maximum snooze count reached',
        };
      }

      const now = new Date();
      const nextSnoozeTime = new Date(now.getTime() + snoozeDuration * 60 * 1000);
      
      // Update or create snooze state
      let snoozeState: SnoozeState;
      
      if (existingState) {
        snoozeState = {
          ...existingState,
          is_active: true,
          snooze_count: existingState.snooze_count + 1,
          current_snooze_time: now,
          next_snooze_time: nextSnoozeTime,
          snooze_history: [
            ...existingState.snooze_history,
            {
              snoozed_at: now,
              snooze_number: existingState.snooze_count + 1,
              snooze_duration: snoozeDuration,
              event_type: 'snoozed',
            }
          ],
          updated_at: now,
        };
      } else {
        snoozeState = {
          alarm_id: alarm.id,
          is_active: true,
          snooze_count: 1,
          max_snooze_count: alarm.snooze_count_limit,
          snooze_duration: snoozeDuration,
          original_trigger_time: now,
          current_snooze_time: now,
          next_snooze_time: nextSnoozeTime,
          snooze_history: [{
            snoozed_at: now,
            snooze_number: 1,
            snooze_duration: snoozeDuration,
            event_type: 'snoozed',
          }],
          created_at: now,
          updated_at: now,
        };
      }

      this.snoozeStates.set(alarm.id, snoozeState);
      await this.saveSnoozeStates();

      // Schedule snooze notification
      const scheduleResult = await AlarmScheduler.scheduleSnooze(
        alarm.id,
        snoozeDuration,
        snoozeState.snooze_count,
        snoozeState.max_snooze_count
      );

      if (!scheduleResult.success) {
        return {
          success: false,
          alarm_id: alarm.id,
          snooze_count: snoozeState.snooze_count,
          next_snooze_time: null,
          can_snooze_again: false,
          error: scheduleResult.error || 'Failed to schedule snooze notification',
        };
      }

      // Start local timer for tracking
      this.startSnoozeTimer(alarm.id, snoozeState);

      const canSnoozeAgain = snoozeState.snooze_count < snoozeState.max_snooze_count;

      return {
        success: true,
        alarm_id: alarm.id,
        snooze_count: snoozeState.snooze_count,
        next_snooze_time: nextSnoozeTime,
        can_snooze_again: canSnoozeAgain,
      };
    } catch (error) {
      return {
        success: false,
        alarm_id: alarm.id,
        snooze_count: 0,
        next_snooze_time: null,
        can_snooze_again: false,
        error: error instanceof Error ? error.message : 'Snooze failed',
      };
    }
  }

  /**
   * Dismiss a snoozed alarm
   */
  static async dismissAlarm(alarmId: string): Promise<void> {
    await this.completeSnooze(alarmId, 'dismissed');
  }

  /**
   * Cancel active snooze
   */
  static async cancelSnooze(alarmId: string): Promise<void> {
    await this.completeSnooze(alarmId, 'cancelled');
  }

  /**
   * Complete snooze cycle
   */
  private static async completeSnooze(alarmId: string, eventType: SnoozeEventType): Promise<void> {
    try {
      const snoozeState = this.snoozeStates.get(alarmId);
      if (!snoozeState) return;

      // Clear timer
      const timer = this.snoozeTimers.get(alarmId);
      if (timer) {
        clearTimeout(timer);
        this.snoozeTimers.delete(alarmId);
      }

      // Update state
      const now = new Date();
      const updatedState: SnoozeState = {
        ...snoozeState,
        is_active: false,
        current_snooze_time: null,
        next_snooze_time: null,
        snooze_history: snoozeState.snooze_history.map((entry, index) => 
          index === snoozeState.snooze_history.length - 1
            ? { ...entry, dismissed_at: now, event_type: eventType }
            : entry
        ),
        updated_at: now,
      };

      this.snoozeStates.set(alarmId, updatedState);
      await this.saveSnoozeStates();

      // Cancel any scheduled snooze notifications
      await AlarmScheduler.cancelAlarmNotifications(alarmId);

      console.log(`Snooze completed for alarm ${alarmId} with event: ${eventType}`);
    } catch (error) {
      console.error('Failed to complete snooze:', error);
    }
  }

  /**
   * Start snooze countdown timer
   */
  private static startSnoozeTimer(alarmId: string, snoozeState: SnoozeState): void {
    if (!snoozeState.next_snooze_time) return;

    const timeUntilSnooze = snoozeState.next_snooze_time.getTime() - Date.now();
    
    if (timeUntilSnooze <= 0) {
      this.completeSnooze(alarmId, 'expired');
      return;
    }

    const timer = setTimeout(() => {
      this.completeSnooze(alarmId, 'expired');
    }, timeUntilSnooze);

    this.snoozeTimers.set(alarmId, timer);
  }

  // ============================================================================
  // STATE QUERIES
  // ============================================================================

  /**
   * Get snooze state for an alarm
   */
  static getSnoozeState(alarmId: string): SnoozeState | null {
    return this.snoozeStates.get(alarmId) || null;
  }

  /**
   * Check if an alarm is currently snoozed
   */
  static isAlarmSnoozed(alarmId: string): boolean {
    const state = this.snoozeStates.get(alarmId);
    return !!(state?.is_active && state.next_snooze_time && state.next_snooze_time > new Date());
  }

  /**
   * Get remaining snooze time in milliseconds
   */
  static getRemainingSnoozeTime(alarmId: string): number | null {
    const state = this.snoozeStates.get(alarmId);
    if (!state?.is_active || !state.next_snooze_time) return null;
    
    const remaining = state.next_snooze_time.getTime() - Date.now();
    return remaining > 0 ? remaining : null;
  }

  /**
   * Check if alarm can be snoozed again
   */
  static canSnoozeAgain(alarmId: string): boolean {
    const state = this.snoozeStates.get(alarmId);
    if (!state) return true; // First snooze
    
    return state.snooze_count < state.max_snooze_count;
  }

  /**
   * Get all active snoozes
   */
  static getActiveSnoozes(): SnoozeState[] {
    const now = new Date();
    return Array.from(this.snoozeStates.values()).filter(
      state => state.is_active && state.next_snooze_time && state.next_snooze_time > now
    );
  }

  /**
   * Get snooze statistics for an alarm
   */
  static getSnoozeStats(alarmId: string): {
    total_snoozes: number;
    average_snooze_duration: number;
    last_snooze_date: Date | null;
    current_streak: number;
  } {
    const state = this.snoozeStates.get(alarmId);
    
    if (!state || state.snooze_history.length === 0) {
      return {
        total_snoozes: 0,
        average_snooze_duration: 0,
        last_snooze_date: null,
        current_streak: 0,
      };
    }

    const history = state.snooze_history;
    const totalSnoozes = history.length;
    const avgDuration = history.reduce((sum, entry) => sum + entry.snooze_duration, 0) / totalSnoozes;
    const lastSnoozeDate = history[history.length - 1]?.snoozed_at || null;
    const currentStreak = state.is_active ? state.snooze_count : 0;

    return {
      total_snoozes: totalSnoozes,
      average_snooze_duration: avgDuration,
      last_snooze_date: lastSnoozeDate,
      current_streak: currentStreak,
    };
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Clear snooze state for an alarm (cleanup)
   */
  static async clearSnoozeState(alarmId: string): Promise<void> {
    try {
      // Clear timer if active
      const timer = this.snoozeTimers.get(alarmId);
      if (timer) {
        clearTimeout(timer);
        this.snoozeTimers.delete(alarmId);
      }

      // Remove state
      this.snoozeStates.delete(alarmId);
      await this.saveSnoozeStates();
    } catch (error) {
      console.error('Failed to clear snooze state:', error);
    }
  }

  /**
   * Clear all snooze states (for debugging/reset)
   */
  static async clearAllSnoozeStates(): Promise<void> {
    try {
      // Clear all timers
      for (const timer of this.snoozeTimers.values()) {
        clearTimeout(timer);
      }
      this.snoozeTimers.clear();

      // Clear all states
      this.snoozeStates.clear();
      await this.saveSnoozeStates();

      console.log('All snooze states cleared');
    } catch (error) {
      console.error('Failed to clear all snooze states:', error);
    }
  }

  /**
   * Get formatted time remaining for snooze
   */
  static getFormattedSnoozeTime(alarmId: string): string | null {
    const remaining = this.getRemainingSnoozeTime(alarmId);
    if (!remaining) return null;

    const minutes = Math.floor(remaining / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Export snooze history for analytics
   */
  static exportSnoozeHistory(): SnoozeHistoryEntry[] {
    const allHistory: SnoozeHistoryEntry[] = [];
    
    for (const state of this.snoozeStates.values()) {
      allHistory.push(...state.snooze_history);
    }
    
    return allHistory.sort((a, b) => a.snoozed_at.getTime() - b.snoozed_at.getTime());
  }
}

export default SnoozeManager;