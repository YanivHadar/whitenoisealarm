/**
 * Comprehensive Test Suite for Alarm Service
 * 
 * Tests all critical alarm functionality including CRUD operations,
 * scheduling logic, validation, and error handling to ensure
 * 99.9% reliability for alarm delivery.
 */

import { jest } from '@jest/globals';
import { EnhancedAlarmService } from '../alarm-service';
import { AlarmScheduler } from '../alarm-scheduler';
import { SnoozeManager } from '../snooze-manager';
import { AlarmErrorHandler } from '../alarm-error-handler';
import type { AlarmFormData, Alarm, RepeatPattern } from '../../types/alarm';

// Mock dependencies
jest.mock('../alarm-scheduler');
jest.mock('../snooze-manager');
jest.mock('../../lib/supabase/client');
jest.mock('@react-native-async-storage/async-storage');

// Mock Supabase client
const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn(),
  order: jest.fn().mockReturnThis(),
};

jest.mock('../../lib/supabase/client', () => ({
  supabase: mockSupabase,
  handleDatabaseError: jest.fn().mockReturnValue({
    code: 'DATABASE_ERROR',
    message: 'Database operation failed',
  }),
}));

// Test data
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  timezone: 'America/New_York',
};

const validAlarmData: AlarmFormData = {
  name: 'Morning Alarm',
  time: '07:30',
  enabled: true,
  repeat_pattern: 'weekdays' as RepeatPattern,
  repeat_days: null,
  audio_file_url: null,
  audio_output: 'auto' as const,
  volume: 0.7,
  vibration_enabled: true,
  snooze_enabled: true,
  snooze_duration: 5,
  snooze_count_limit: 3,
  white_noise_enabled: false,
  white_noise_file_url: null,
  white_noise_category: null,
  white_noise_volume: 0.5,
  white_noise_duration: null,
  fade_in_duration: 0,
  fade_out_duration: 0,
};

const mockAlarm: Alarm = {
  id: 'alarm-123',
  user_id: 'user-123',
  name: 'Morning Alarm',
  time: '07:30',
  enabled: true,
  repeat_pattern: 'weekdays',
  repeat_days: null,
  audio_file_url: null,
  audio_output: 'auto',
  volume: 0.7,
  vibration_enabled: true,
  snooze_enabled: true,
  snooze_duration: 5,
  snooze_count_limit: 3,
  white_noise_enabled: false,
  white_noise_file_url: null,
  white_noise_category: null,
  white_noise_volume: 0.5,
  white_noise_duration: null,
  fade_in_duration: 0,
  fade_out_duration: 0,
  is_premium_feature: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  last_triggered_at: null,
  next_trigger_at: '2024-01-02T07:30:00Z',
};

describe('EnhancedAlarmService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock implementations
    mockSupabase.single.mockResolvedValue({ data: mockAlarm, error: null });
  });

  describe('create', () => {
    it('should create a new alarm successfully', async () => {
      mockSupabase.single.mockResolvedValue({ data: mockAlarm, error: null });
      (AlarmScheduler.scheduleAlarm as jest.Mock).mockResolvedValue({
        success: true,
        alarm_id: mockAlarm.id,
        next_trigger_at: new Date('2024-01-02T07:30:00Z'),
        notification_id: 'notification-123',
      });

      const result = await EnhancedAlarmService.create(
        validAlarmData,
        mockUser.id,
        false
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockAlarm);
      expect(result.error).toBeNull();
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: validAlarmData.name,
          time: validAlarmData.time,
          enabled: validAlarmData.enabled,
          user_id: mockUser.id,
        })
      );
    });

    it('should handle validation errors', async () => {
      const invalidAlarmData = {
        ...validAlarmData,
        time: '25:00', // Invalid time
        name: '', // Empty name
        volume: 1.5, // Invalid volume
      };

      const result = await EnhancedAlarmService.create(
        invalidAlarmData,
        mockUser.id,
        false
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect(result.data).toBeNull();
      expect(mockSupabase.insert).not.toHaveBeenCalled();
    });

    it('should prevent premium features for non-premium users', async () => {
      const premiumAlarmData = {
        ...validAlarmData,
        white_noise_enabled: true,
        fade_in_duration: 30,
      };

      const result = await EnhancedAlarmService.create(
        premiumAlarmData,
        mockUser.id,
        false // Not premium
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PREMIUM_FEATURE_REQUIRED');
      expect(result.data).toBeNull();
    });

    it('should allow premium features for premium users', async () => {
      const premiumAlarmData = {
        ...validAlarmData,
        white_noise_enabled: true,
        white_noise_file_url: 'https://example.com/rain.mp3',
        white_noise_category: 'nature' as const,
        fade_in_duration: 30,
      };

      mockSupabase.single.mockResolvedValue({
        data: { ...mockAlarm, ...premiumAlarmData, is_premium_feature: true },
        error: null,
      });

      const result = await EnhancedAlarmService.create(
        premiumAlarmData,
        mockUser.id,
        true // Premium user
      );

      expect(result.success).toBe(true);
      expect(result.data?.white_noise_enabled).toBe(true);
      expect(result.data?.is_premium_feature).toBe(true);
    });

    it('should handle database errors', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST100', message: 'Database error' },
      });

      const result = await EnhancedAlarmService.create(
        validAlarmData,
        mockUser.id,
        false
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('DATABASE_ERROR');
      expect(result.data).toBeNull();
    });
  });

  describe('update', () => {
    it('should update an alarm successfully', async () => {
      // Mock getting current alarm
      mockSupabase.single
        .mockResolvedValueOnce({ data: mockAlarm, error: null }) // getById
        .mockResolvedValueOnce({ data: { ...mockAlarm, name: 'Updated Alarm' }, error: null }); // update

      const updates = { name: 'Updated Alarm', volume: 0.8 };
      const result = await EnhancedAlarmService.update(
        mockAlarm.id,
        updates,
        false
      );

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Updated Alarm');
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining(updates)
      );
    });

    it('should reschedule notifications when time changes', async () => {
      mockSupabase.single
        .mockResolvedValueOnce({ data: mockAlarm, error: null })
        .mockResolvedValueOnce({ data: { ...mockAlarm, time: '08:00' }, error: null });

      (AlarmScheduler.cancelAlarmNotifications as jest.Mock).mockResolvedValue(undefined);
      (AlarmScheduler.scheduleAlarm as jest.Mock).mockResolvedValue({
        success: true,
        alarm_id: mockAlarm.id,
        next_trigger_at: new Date('2024-01-02T08:00:00Z'),
        notification_id: 'notification-456',
      });

      const result = await EnhancedAlarmService.update(
        mockAlarm.id,
        { time: '08:00' },
        false
      );

      expect(result.success).toBe(true);
      expect(AlarmScheduler.cancelAlarmNotifications).toHaveBeenCalledWith(mockAlarm.id);
      expect(AlarmScheduler.scheduleAlarm).toHaveBeenCalled();
    });

    it('should handle alarm not found', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });

      const result = await EnhancedAlarmService.update(
        'non-existent-id',
        { name: 'Updated' },
        false
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      expect(result.data).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete an alarm and cancel notifications', async () => {
      mockSupabase.delete.mockResolvedValue({ error: null });
      (AlarmScheduler.cancelAlarmNotifications as jest.Mock).mockResolvedValue(undefined);

      const result = await EnhancedAlarmService.delete(mockAlarm.id);

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(AlarmScheduler.cancelAlarmNotifications).toHaveBeenCalledWith(mockAlarm.id);
      expect(mockSupabase.delete).toHaveBeenCalled();
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', mockAlarm.id);
    });

    it('should handle deletion errors', async () => {
      mockSupabase.delete.mockResolvedValue({
        error: { code: 'PGRST100', message: 'Delete failed' },
      });

      const result = await EnhancedAlarmService.delete(mockAlarm.id);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('DATABASE_ERROR');
      expect(result.data).toBeNull();
    });
  });

  describe('getUserAlarms', () => {
    it('should get user alarms with status enhancement', async () => {
      const alarmsList = [mockAlarm, { ...mockAlarm, id: 'alarm-456', name: 'Evening Alarm' }];
      mockSupabase.order.mockResolvedValue({ data: alarmsList, error: null });

      const result = await EnhancedAlarmService.getUserAlarms(mockUser.id);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0]).toHaveProperty('is_active');
      expect(result.data?.[0]).toHaveProperty('formatted_time');
      expect(result.data?.[0]).toHaveProperty('days_display');
    });

    it('should filter enabled alarms only', async () => {
      const alarmsList = [
        mockAlarm,
        { ...mockAlarm, id: 'alarm-456', enabled: false },
      ];
      mockSupabase.order.mockResolvedValue({ data: [mockAlarm], error: null });

      const result = await EnhancedAlarmService.getUserAlarms(mockUser.id, false);

      expect(result.success).toBe(true);
      expect(mockSupabase.eq).toHaveBeenCalledWith('enabled', true);
    });
  });

  describe('calculateNextTrigger', () => {
    beforeAll(() => {
      // Mock current time to Wednesday, 2024-01-03 06:00:00 UTC
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-03T06:00:00Z'));
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    it('should calculate next trigger for daily alarm', () => {
      const dailyAlarm = { ...mockAlarm, repeat_pattern: 'daily' as RepeatPattern };
      const result = EnhancedAlarmService.calculateNextTrigger(dailyAlarm);

      expect(result.is_today).toBe(true); // 7:30 AM same day
      expect(result.hours_until).toBe(1);
      expect(result.minutes_until).toBe(30);
    });

    it('should calculate next trigger for weekdays alarm', () => {
      const weekdaysAlarm = { ...mockAlarm, repeat_pattern: 'weekdays' as RepeatPattern };
      const result = EnhancedAlarmService.calculateNextTrigger(weekdaysAlarm);

      expect(result.is_today).toBe(true); // Wednesday is a weekday
      expect(result.hours_until).toBe(1);
      expect(result.minutes_until).toBe(30);
    });

    it('should calculate next trigger for weekends alarm on weekday', () => {
      const weekendsAlarm = { ...mockAlarm, repeat_pattern: 'weekends' as RepeatPattern };
      const result = EnhancedAlarmService.calculateNextTrigger(weekendsAlarm);

      expect(result.is_today).toBe(false); // Wednesday -> Saturday
      expect(result.days_until).toBe(3); // Saturday is 3 days away
    });

    it('should calculate next trigger for custom days', () => {
      const customAlarm = {
        ...mockAlarm,
        repeat_pattern: 'custom' as RepeatPattern,
        repeat_days: [1, 3, 5], // Monday, Wednesday, Friday
      };
      const result = EnhancedAlarmService.calculateNextTrigger(customAlarm);

      expect(result.is_today).toBe(true); // Today is Wednesday (3)
      expect(result.hours_until).toBe(1);
      expect(result.minutes_until).toBe(30);
    });

    it('should handle past time - move to next day', () => {
      // Set time to 8:00 AM (past the 7:30 alarm)
      jest.setSystemTime(new Date('2024-01-03T08:00:00Z'));

      const result = EnhancedAlarmService.calculateNextTrigger(mockAlarm);

      expect(result.is_today).toBe(false);
      expect(result.is_tomorrow).toBe(true);
      expect(result.days_until).toBe(1);
    });
  });

  describe('enhanceAlarmWithStatus', () => {
    it('should enhance alarm with runtime status', async () => {
      const enhanced = await EnhancedAlarmService.enhanceAlarmWithStatus(mockAlarm);

      expect(enhanced).toHaveProperty('is_active');
      expect(enhanced).toHaveProperty('is_snoozed');
      expect(enhanced).toHaveProperty('snooze_count');
      expect(enhanced).toHaveProperty('time_until_next');
      expect(enhanced).toHaveProperty('formatted_time');
      expect(enhanced).toHaveProperty('days_display');

      expect(enhanced.is_active).toBe(mockAlarm.enabled);
      expect(enhanced.formatted_time).toBe('7:30 AM');
      expect(enhanced.days_display).toBe('Weekdays');
    });
  });

  describe('getRepeatPatternDisplay', () => {
    it('should return correct display for standard patterns', () => {
      expect(EnhancedAlarmService.getRepeatPatternDisplay('daily')).toBe('Daily');
      expect(EnhancedAlarmService.getRepeatPatternDisplay('weekdays')).toBe('Weekdays');
      expect(EnhancedAlarmService.getRepeatPatternDisplay('weekends')).toBe('Weekends');
      expect(EnhancedAlarmService.getRepeatPatternDisplay('none')).toBe('Once');
    });

    it('should handle custom patterns correctly', () => {
      // All days
      expect(EnhancedAlarmService.getRepeatPatternDisplay('custom', [0, 1, 2, 3, 4, 5, 6])).toBe('Daily');
      
      // Weekends only
      expect(EnhancedAlarmService.getRepeatPatternDisplay('custom', [0, 6])).toBe('Weekends');
      
      // Weekdays only
      expect(EnhancedAlarmService.getRepeatPatternDisplay('custom', [1, 2, 3, 4, 5])).toBe('Weekdays');
      
      // Specific days
      expect(EnhancedAlarmService.getRepeatPatternDisplay('custom', [1, 3, 5]))
        .toBe('Monday, Wednesday, Friday');
    });
  });

  describe('parseTime', () => {
    it('should parse time correctly', () => {
      expect(EnhancedAlarmService.parseTime('07:30')).toEqual({
        hour: 7,
        minute: 30,
        formatted12: '7:30 AM',
        formatted24: '07:30',
      });

      expect(EnhancedAlarmService.parseTime('15:45')).toEqual({
        hour: 15,
        minute: 45,
        formatted12: '3:45 PM',
        formatted24: '15:45',
      });

      expect(EnhancedAlarmService.parseTime('00:00')).toEqual({
        hour: 0,
        minute: 0,
        formatted12: '12:00 AM',
        formatted24: '00:00',
      });

      expect(EnhancedAlarmService.parseTime('12:00')).toEqual({
        hour: 12,
        minute: 0,
        formatted12: '12:00 PM',
        formatted24: '12:00',
      });
    });
  });

  describe('isPremiumAlarm', () => {
    it('should identify premium features correctly', () => {
      expect(EnhancedAlarmService.isPremiumAlarm(validAlarmData)).toBe(false);

      expect(EnhancedAlarmService.isPremiumAlarm({
        ...validAlarmData,
        white_noise_enabled: true,
      })).toBe(true);

      expect(EnhancedAlarmService.isPremiumAlarm({
        ...validAlarmData,
        fade_in_duration: 30,
      })).toBe(true);

      expect(EnhancedAlarmService.isPremiumAlarm({
        ...validAlarmData,
        fade_out_duration: 15,
      })).toBe(true);
    });
  });

  describe('getUpcomingAlarms', () => {
    it('should get upcoming alarms sorted by trigger time', async () => {
      const alarmsList = [
        { ...mockAlarm, time: '07:30' },
        { ...mockAlarm, id: 'alarm-456', time: '08:00' },
        { ...mockAlarm, id: 'alarm-789', time: '06:30' },
      ];
      mockSupabase.order.mockResolvedValue({ data: alarmsList, error: null });

      const result = await EnhancedAlarmService.getUpcomingAlarms(mockUser.id, 7);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      // Should be sorted by next trigger time
      if (result.data) {
        expect(result.data.length).toBeGreaterThan(0);
        // Verify sorting
        for (let i = 1; i < result.data.length; i++) {
          expect(result.data[i].next_trigger.getTime())
            .toBeGreaterThanOrEqual(result.data[i - 1].next_trigger.getTime());
        }
      }
    });
  });

  describe('error handling', () => {
    it('should handle service errors gracefully', async () => {
      mockSupabase.single.mockRejectedValue(new Error('Network error'));

      const result = await EnhancedAlarmService.create(
        validAlarmData,
        mockUser.id,
        false
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SERVICE_ERROR');
      expect(result.error?.message).toContain('Network error');
      expect(result.data).toBeNull();
    });

    it('should validate alarm readiness', async () => {
      const validationResult = await EnhancedAlarmService.validateAlarmReadiness(mockAlarm);

      expect(validationResult).toHaveProperty('valid');
      expect(validationResult).toHaveProperty('errors');
      expect(validationResult).toHaveProperty('warnings');
    });
  });

  describe('integration with scheduler and snooze manager', () => {
    it('should schedule notification when creating enabled alarm', async () => {
      mockSupabase.single.mockResolvedValue({ data: mockAlarm, error: null });
      (AlarmScheduler.scheduleAlarm as jest.Mock).mockResolvedValue({
        success: true,
        alarm_id: mockAlarm.id,
        next_trigger_at: new Date('2024-01-02T07:30:00Z'),
        notification_id: 'notification-123',
      });

      await EnhancedAlarmService.create(validAlarmData, mockUser.id, false);

      expect(AlarmScheduler.scheduleAlarm).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockAlarm.id,
          enabled: true,
        })
      );
    });

    it('should not schedule notification when creating disabled alarm', async () => {
      const disabledAlarm = { ...mockAlarm, enabled: false };
      mockSupabase.single.mockResolvedValue({ data: disabledAlarm, error: null });

      await EnhancedAlarmService.create(
        { ...validAlarmData, enabled: false },
        mockUser.id,
        false
      );

      expect(AlarmScheduler.scheduleAlarm).not.toHaveBeenCalled();
    });

    it('should handle scheduler failures gracefully', async () => {
      mockSupabase.single.mockResolvedValue({ data: mockAlarm, error: null });
      (AlarmScheduler.scheduleAlarm as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Notification scheduling failed',
      });

      const result = await EnhancedAlarmService.create(validAlarmData, mockUser.id, false);

      // Should still succeed with alarm creation even if scheduling fails
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockAlarm);
    });
  });
});

// Additional edge case tests
describe('Edge Cases and Error Conditions', () => {
  it('should handle timezone changes correctly', () => {
    const alarm = { ...mockAlarm, time: '07:30' };
    const utcResult = EnhancedAlarmService.calculateNextTrigger(alarm, 'UTC');
    const estResult = EnhancedAlarmService.calculateNextTrigger(alarm, 'America/New_York');

    // Results should be different due to timezone
    expect(utcResult.next_trigger).not.toEqual(estResult.next_trigger);
  });

  it('should handle daylight saving time transitions', () => {
    // Test during DST transition (this would need specific DST dates)
    const alarm = { ...mockAlarm, time: '02:30' };
    const dstDate = new Date('2024-03-10T01:00:00Z'); // Spring forward date
    
    const result = EnhancedAlarmService.calculateNextTrigger(
      alarm,
      'America/New_York',
      dstDate
    );
    
    expect(result.next_trigger).toBeDefined();
  });

  it('should handle leap year and month boundaries', () => {
    const alarm = { ...mockAlarm, time: '23:59', repeat_pattern: 'daily' as RepeatPattern };
    const endOfMonth = new Date('2024-02-29T23:30:00Z'); // Leap year Feb 29
    
    const result = EnhancedAlarmService.calculateNextTrigger(alarm, 'UTC', endOfMonth);
    
    expect(result.next_trigger.getDate()).toBe(29); // Should be today (Feb 29)
    expect(result.is_today).toBe(true);
  });

  it('should handle custom repeat pattern with no valid days', () => {
    const invalidCustomAlarm = {
      ...mockAlarm,
      repeat_pattern: 'custom' as RepeatPattern,
      repeat_days: [], // No days selected
    };
    
    const result = EnhancedAlarmService.calculateNextTrigger(invalidCustomAlarm);
    
    // Should fallback to next day
    expect(result.days_until).toBeGreaterThanOrEqual(1);
  });
});

export {};