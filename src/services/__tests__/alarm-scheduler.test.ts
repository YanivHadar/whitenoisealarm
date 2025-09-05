/**
 * Alarm Scheduler Unit Tests
 * Phase 2.3: Integration Testing & Cross-Platform Validation
 * 
 * Comprehensive unit tests for AlarmScheduler with 95%+ coverage target.
 * Tests all CRUD operations, scheduling logic, repeat patterns, timezone handling,
 * snooze functionality, error recovery, and performance requirements.
 */

import AlarmScheduler from '../alarm-scheduler';
import type { 
  Alarm, 
  AlarmScheduleResult, 
  NextTriggerCalculation,
  RepeatPattern,
  AudioOutput 
} from '../../types/alarm';
import { reliabilityTestConfig } from './reliability-setup';

// Mock dependencies
jest.mock('expo-notifications');
jest.mock('expo-device');
jest.mock('@react-native-async-storage/async-storage');

describe('AlarmScheduler', () => {
  let mockAlarm: Alarm;
  
  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Create mock alarm for testing
    mockAlarm = {
      id: 'test-alarm-1',
      user_id: 'user-123',
      name: 'Test Morning Alarm',
      time: '07:30',
      enabled: true,
      repeat_pattern: 'none' as RepeatPattern,
      repeat_days: null,
      timezone: 'America/New_York',
      audio_file_url: null,
      audio_output: 'auto' as AudioOutput,
      volume: 0.8,
      fade_in_duration: 30,
      fade_out_duration: 10,
      vibration_enabled: true,
      vibration_pattern: 'default',
      snooze_enabled: true,
      snooze_duration: 9,
      snooze_count_limit: 3,
      auto_dismiss_duration: 300,
      white_noise_enabled: false,
      white_noise_file_url: null,
      white_noise_volume: 0.5,
      white_noise_duration: null,
      gradual_volume_increase: false,
      is_premium_feature: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_triggered_at: null,
    };
    
    // Reset scheduler state
    await AlarmScheduler.clearAllNotifications();
  });

  describe('Initialization', () => {
    it('should initialize successfully with all required setup', async () => {
      const startTime = performance.now();
      
      await expect(AlarmScheduler.initialize()).resolves.not.toThrow();
      
      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(reliabilityTestConfig.PERFORMANCE_TARGET_CREATE);
    }, reliabilityTestConfig.TIMEOUT_SHORT);

    it('should handle multiple initialization calls gracefully', async () => {
      await AlarmScheduler.initialize();
      await AlarmScheduler.initialize(); // Second call should not throw
      await AlarmScheduler.initialize(); // Third call should not throw
      
      expect(true).toBe(true); // If we reach here, no errors were thrown
    });

    it('should properly set up notification categories', async () => {
      const mockSetNotificationCategoryAsync = require('expo-notifications').setNotificationCategoryAsync;
      
      await AlarmScheduler.initialize();
      
      expect(mockSetNotificationCategoryAsync).toHaveBeenCalledWith('alarm', expect.arrayContaining([
        expect.objectContaining({ identifier: 'dismiss' }),
        expect.objectContaining({ identifier: 'snooze' }),
      ]));
      
      expect(mockSetNotificationCategoryAsync).toHaveBeenCalledWith('snooze', expect.arrayContaining([
        expect.objectContaining({ identifier: 'dismiss' }),
        expect.objectContaining({ identifier: 'snooze_again' }),
      ]));
    });

    it('should handle permission request failures gracefully', async () => {
      const mockRequestPermissionsAsync = require('expo-notifications').requestPermissionsAsync;
      mockRequestPermissionsAsync.mockRejectedValueOnce(new Error('Permission denied'));
      
      const hasPermissions = await AlarmScheduler.requestPermissions();
      
      expect(hasPermissions).toBe(false);
    });
  });

  describe('Permission Management', () => {
    it('should request and validate notification permissions', async () => {
      const mockGetPermissionsAsync = require('expo-notifications').getPermissionsAsync;
      const mockRequestPermissionsAsync = require('expo-notifications').requestPermissionsAsync;
      
      mockGetPermissionsAsync.mockResolvedValue({ status: 'undetermined' });
      mockRequestPermissionsAsync.mockResolvedValue({ status: 'granted' });
      
      const hasPermissions = await AlarmScheduler.requestPermissions();
      
      expect(hasPermissions).toBe(true);
      expect(mockRequestPermissionsAsync).toHaveBeenCalledWith(expect.objectContaining({
        ios: expect.objectContaining({
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowCriticalAlerts: true,
        }),
        android: expect.objectContaining({
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        }),
      }));
    });

    it('should check notification status correctly', async () => {
      const mockGetPermissionsAsync = require('expo-notifications').getPermissionsAsync;
      
      // Test granted status
      mockGetPermissionsAsync.mockResolvedValue({ status: 'granted' });
      let enabled = await AlarmScheduler.areNotificationsEnabled();
      expect(enabled).toBe(true);
      
      // Test denied status
      mockGetPermissionsAsync.mockResolvedValue({ status: 'denied' });
      enabled = await AlarmScheduler.areNotificationsEnabled();
      expect(enabled).toBe(false);
    });

    it('should handle permission check errors', async () => {
      const mockGetPermissionsAsync = require('expo-notifications').getPermissionsAsync;
      mockGetPermissionsAsync.mockRejectedValue(new Error('System error'));
      
      const enabled = await AlarmScheduler.areNotificationsEnabled();
      
      expect(enabled).toBe(false);
    });
  });

  describe('Alarm Scheduling', () => {
    beforeEach(async () => {
      await AlarmScheduler.initialize();
      
      // Mock successful permissions
      const mockGetPermissionsAsync = require('expo-notifications').getPermissionsAsync;
      mockGetPermissionsAsync.mockResolvedValue({ status: 'granted' });
    });

    it('should schedule a one-time alarm successfully', async () => {
      const mockScheduleNotificationAsync = require('expo-notifications').scheduleNotificationAsync;
      mockScheduleNotificationAsync.mockResolvedValue('notification-id-123');
      
      const startTime = performance.now();
      const result = await AlarmScheduler.scheduleAlarm(mockAlarm);
      const duration = performance.now() - startTime;
      
      expect(result.success).toBe(true);
      expect(result.alarm_id).toBe(mockAlarm.id);
      expect(result.notification_id).toBe('notification-id-123');
      expect(result.next_trigger_at).toBeInstanceOf(Date);
      expect(duration).toBeLessThan(reliabilityTestConfig.PERFORMANCE_TARGET_SCHEDULE);
    }, reliabilityTestConfig.TIMEOUT_SHORT);

    it('should schedule daily recurring alarm', async () => {
      const mockScheduleNotificationAsync = require('expo-notifications').scheduleNotificationAsync;
      mockScheduleNotificationAsync.mockResolvedValue('notification-id-123');
      
      const dailyAlarm = { ...mockAlarm, repeat_pattern: 'daily' as RepeatPattern };
      const result = await AlarmScheduler.scheduleAlarm(dailyAlarm);
      
      expect(result.success).toBe(true);
      expect(mockScheduleNotificationAsync).toHaveBeenCalled();
    });

    it('should schedule weekdays-only alarm correctly', async () => {
      const mockScheduleNotificationAsync = require('expo-notifications').scheduleNotificationAsync;
      mockScheduleNotificationAsync.mockResolvedValue('notification-id-123');
      
      const weekdaysAlarm = { ...mockAlarm, repeat_pattern: 'weekdays' as RepeatPattern };
      const result = await AlarmScheduler.scheduleAlarm(weekdaysAlarm);
      
      expect(result.success).toBe(true);
      expect(result.next_trigger_at).toBeInstanceOf(Date);
      
      // Verify next trigger is on a weekday (Monday-Friday)
      const nextTrigger = result.next_trigger_at!;
      const dayOfWeek = nextTrigger.getDay();
      expect(dayOfWeek).toBeGreaterThanOrEqual(1);
      expect(dayOfWeek).toBeLessThanOrEqual(5);
    });

    it('should schedule weekend-only alarm correctly', async () => {
      const mockScheduleNotificationAsync = require('expo-notifications').scheduleNotificationAsync;
      mockScheduleNotificationAsync.mockResolvedValue('notification-id-123');
      
      const weekendAlarm = { ...mockAlarm, repeat_pattern: 'weekends' as RepeatPattern };
      const result = await AlarmScheduler.scheduleAlarm(weekendAlarm);
      
      expect(result.success).toBe(true);
      expect(result.next_trigger_at).toBeInstanceOf(Date);
      
      // Verify next trigger is on weekend (Saturday or Sunday)
      const nextTrigger = result.next_trigger_at!;
      const dayOfWeek = nextTrigger.getDay();
      expect([0, 6]).toContain(dayOfWeek);
    });

    it('should schedule custom repeat pattern alarm', async () => {
      const mockScheduleNotificationAsync = require('expo-notifications').scheduleNotificationAsync;
      mockScheduleNotificationAsync.mockResolvedValue('notification-id-123');
      
      // Custom pattern: Monday, Wednesday, Friday (1, 3, 5)
      const customAlarm = {
        ...mockAlarm,
        repeat_pattern: 'custom' as RepeatPattern,
        repeat_days: [1, 3, 5]
      };
      
      const result = await AlarmScheduler.scheduleAlarm(customAlarm);
      
      expect(result.success).toBe(true);
      expect(result.next_trigger_at).toBeInstanceOf(Date);
      
      // Verify next trigger is on one of the specified days
      const nextTrigger = result.next_trigger_at!;
      const dayOfWeek = nextTrigger.getDay();
      expect([1, 3, 5]).toContain(dayOfWeek);
    });

    it('should fail gracefully when permissions are denied', async () => {
      const mockGetPermissionsAsync = require('expo-notifications').getPermissionsAsync;
      mockGetPermissionsAsync.mockResolvedValue({ status: 'denied' });
      
      const result = await AlarmScheduler.scheduleAlarm(mockAlarm);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Notification permissions not granted');
    });

    it('should handle invalid alarm time gracefully', async () => {
      const invalidAlarm = { ...mockAlarm, time: '25:99' }; // Invalid time
      
      const result = await AlarmScheduler.scheduleAlarm(invalidAlarm);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should include all alarm data in notification payload', async () => {
      const mockScheduleNotificationAsync = require('expo-notifications').scheduleNotificationAsync;
      mockScheduleNotificationAsync.mockResolvedValue('notification-id-123');
      
      const result = await AlarmScheduler.scheduleAlarm(mockAlarm);
      
      expect(result.success).toBe(true);
      expect(mockScheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            title: mockAlarm.name,
            categoryIdentifier: 'alarm',
            data: expect.objectContaining({
              alarmId: mockAlarm.id,
              type: 'alarm',
              audioOutput: mockAlarm.audio_output,
              volume: mockAlarm.volume,
              vibrationEnabled: mockAlarm.vibration_enabled,
              snoozeEnabled: mockAlarm.snooze_enabled,
            }),
          }),
        })
      );
    });
  });

  describe('Next Trigger Calculation', () => {
    it('should calculate next trigger for same day alarm correctly', () => {
      // Set current time to 6:00 AM, alarm at 7:30 AM
      const currentTime = new Date();
      currentTime.setHours(6, 0, 0, 0);
      
      const calculation = AlarmScheduler.calculateNextTrigger(mockAlarm, 'UTC', currentTime);
      
      expect(calculation.next_trigger.getHours()).toBe(7);
      expect(calculation.next_trigger.getMinutes()).toBe(30);
      expect(calculation.is_today).toBe(true);
      expect(calculation.is_tomorrow).toBe(false);
      expect(calculation.days_until).toBe(0);
      expect(calculation.hours_until).toBe(1);
      expect(calculation.minutes_until).toBe(30);
    });

    it('should calculate next trigger for next day when time has passed', () => {
      // Set current time to 8:00 AM, alarm at 7:30 AM (already passed)
      const currentTime = new Date();
      currentTime.setHours(8, 0, 0, 0);
      
      const calculation = AlarmScheduler.calculateNextTrigger(mockAlarm, 'UTC', currentTime);
      
      expect(calculation.next_trigger.getHours()).toBe(7);
      expect(calculation.next_trigger.getMinutes()).toBe(30);
      expect(calculation.is_today).toBe(false);
      expect(calculation.is_tomorrow).toBe(true);
      expect(calculation.days_until).toBe(1);
    });

    it('should handle midnight crossover correctly', () => {
      // Test alarm at 23:30 (11:30 PM) when current time is 23:45
      const lateAlarm = { ...mockAlarm, time: '23:30' };
      const currentTime = new Date();
      currentTime.setHours(23, 45, 0, 0);
      
      const calculation = AlarmScheduler.calculateNextTrigger(lateAlarm, 'UTC', currentTime);
      
      expect(calculation.is_tomorrow).toBe(true);
      expect(calculation.days_until).toBe(1);
    });

    it('should calculate weekday patterns correctly', () => {
      const weekdayAlarm = { ...mockAlarm, repeat_pattern: 'weekdays' as RepeatPattern };
      
      // Test on Sunday (should trigger on Monday)
      const sunday = new Date();
      sunday.setDate(sunday.getDate() - sunday.getDay()); // Move to Sunday
      sunday.setHours(6, 0, 0, 0); // 6 AM Sunday
      
      const calculation = AlarmScheduler.calculateNextTrigger(weekdayAlarm, 'UTC', sunday);
      
      // Should trigger on Monday (day 1)
      expect(calculation.next_trigger.getDay()).toBe(1);
    });

    it('should calculate weekend patterns correctly', () => {
      const weekendAlarm = { ...mockAlarm, repeat_pattern: 'weekends' as RepeatPattern };
      
      // Test on Friday (should trigger on Saturday)
      const friday = new Date();
      friday.setDate(friday.getDate() + (5 - friday.getDay())); // Move to Friday
      friday.setHours(6, 0, 0, 0); // 6 AM Friday
      
      const calculation = AlarmScheduler.calculateNextTrigger(weekendAlarm, 'UTC', friday);
      
      // Should trigger on Saturday (day 6)
      expect(calculation.next_trigger.getDay()).toBe(6);
    });
  });

  describe('Snooze Functionality', () => {
    it('should schedule snooze notification successfully', async () => {
      const mockScheduleNotificationAsync = require('expo-notifications').scheduleNotificationAsync;
      mockScheduleNotificationAsync.mockResolvedValue('snooze-notification-123');
      
      const startTime = performance.now();
      const result = await AlarmScheduler.scheduleSnooze('alarm-123', 9, 0, 3);
      const duration = performance.now() - startTime;
      
      expect(result.success).toBe(true);
      expect(result.notification_id).toBe('snooze-notification-123');
      expect(result.next_trigger_at).toBeInstanceOf(Date);
      expect(duration).toBeLessThan(200); // Snooze scheduling should be very fast
      
      // Verify snooze time is 9 minutes from now
      const expectedSnoozeTime = new Date(Date.now() + 9 * 60 * 1000);
      const actualSnoozeTime = result.next_trigger_at!;
      const timeDiff = Math.abs(actualSnoozeTime.getTime() - expectedSnoozeTime.getTime());
      expect(timeDiff).toBeLessThan(1000); // Allow 1 second difference
    });

    it('should prevent snooze when limit is reached', async () => {
      const result = await AlarmScheduler.scheduleSnooze('alarm-123', 9, 3, 3);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Maximum snooze count reached');
    });

    it('should include snooze count in notification data', async () => {
      const mockScheduleNotificationAsync = require('expo-notifications').scheduleNotificationAsync;
      mockScheduleNotificationAsync.mockResolvedValue('snooze-notification-123');
      
      await AlarmScheduler.scheduleSnooze('alarm-123', 5, 1, 3);
      
      expect(mockScheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            title: 'Snooze Alarm',
            body: 'Snooze 2 of 3', // currentSnoozeCount + 1
            categoryIdentifier: 'snooze',
            data: expect.objectContaining({
              alarmId: 'alarm-123',
              type: 'snooze',
              snoozeCount: 2,
              maxSnoozeCount: 3,
            }),
          }),
        })
      );
    });
  });

  describe('Alarm Cancellation', () => {
    it('should cancel all notifications for an alarm', async () => {
      const mockGetAllScheduledNotificationsAsync = require('expo-notifications').getAllScheduledNotificationsAsync;
      const mockCancelScheduledNotificationAsync = require('expo-notifications').cancelScheduledNotificationAsync;
      
      // Mock existing notifications
      mockGetAllScheduledNotificationsAsync.mockResolvedValue([
        {
          identifier: 'notification-1',
          content: { data: { alarmId: 'alarm-123' } },
        },
        {
          identifier: 'notification-2',
          content: { data: { alarmId: 'alarm-123' } },
        },
        {
          identifier: 'notification-3',
          content: { data: { alarmId: 'different-alarm' } },
        },
      ]);
      
      await AlarmScheduler.cancelAlarmNotifications('alarm-123');
      
      // Should cancel only the notifications for alarm-123
      expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledTimes(2);
      expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledWith('notification-1');
      expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledWith('notification-2');
      expect(mockCancelScheduledNotificationAsync).not.toHaveBeenCalledWith('notification-3');
    });

    it('should handle cancellation errors gracefully', async () => {
      const mockGetAllScheduledNotificationsAsync = require('expo-notifications').getAllScheduledNotificationsAsync;
      mockGetAllScheduledNotificationsAsync.mockRejectedValue(new Error('System error'));
      
      // Should not throw an error
      await expect(AlarmScheduler.cancelAlarmNotifications('alarm-123')).resolves.not.toThrow();
    });
  });

  describe('Bulk Operations', () => {
    it('should clear all notifications efficiently', async () => {
      const mockCancelAllScheduledNotificationsAsync = require('expo-notifications').cancelAllScheduledNotificationsAsync;
      
      const startTime = performance.now();
      await AlarmScheduler.clearAllNotifications();
      const duration = performance.now() - startTime;
      
      expect(mockCancelAllScheduledNotificationsAsync).toHaveBeenCalled();
      expect(duration).toBeLessThan(reliabilityTestConfig.PERFORMANCE_TARGET_DELETE);
    });

    it('should reschedule all enabled alarms', async () => {
      const mockScheduleNotificationAsync = require('expo-notifications').scheduleNotificationAsync;
      mockScheduleNotificationAsync.mockResolvedValue('notification-123');
      
      const alarms = [
        { ...mockAlarm, id: 'alarm-1', enabled: true },
        { ...mockAlarm, id: 'alarm-2', enabled: true },
        { ...mockAlarm, id: 'alarm-3', enabled: false }, // Should be skipped
      ];
      
      await AlarmScheduler.rescheduleAllAlarms(alarms);
      
      // Should schedule only enabled alarms
      expect(mockScheduleNotificationAsync).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle notification scheduling failures', async () => {
      const mockScheduleNotificationAsync = require('expo-notifications').scheduleNotificationAsync;
      mockScheduleNotificationAsync.mockRejectedValue(new Error('Scheduling failed'));
      
      const result = await AlarmScheduler.scheduleAlarm(mockAlarm);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Scheduling failed');
    });

    it('should handle storage failures gracefully', async () => {
      const mockAsyncStorage = require('@react-native-async-storage/async-storage');
      mockAsyncStorage.setItem.mockRejectedValue(new Error('Storage failed'));
      
      // Should not throw an error even if storage fails
      await expect(AlarmScheduler.scheduleAlarm(mockAlarm)).resolves.not.toThrow();
    });

    it('should handle malformed alarm data', async () => {
      const malformedAlarm = {
        ...mockAlarm,
        time: null, // Invalid time
        repeat_pattern: 'invalid' as RepeatPattern, // Invalid pattern
      };
      
      const result = await AlarmScheduler.scheduleAlarm(malformedAlarm as any);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Timezone Handling', () => {
    it('should handle timezone parameter correctly', () => {
      const calculation = AlarmScheduler.calculateNextTrigger(
        mockAlarm,
        'America/New_York'
      );
      
      expect(calculation.next_trigger).toBeInstanceOf(Date);
      expect(calculation.days_until).toBeGreaterThanOrEqual(0);
    });

    it('should default to UTC when timezone not provided', () => {
      const calculation = AlarmScheduler.calculateNextTrigger(mockAlarm);
      
      expect(calculation.next_trigger).toBeInstanceOf(Date);
    });
  });

  describe('Performance Requirements', () => {
    it('should meet sub-second scheduling performance', async () => {
      const performanceTests = [];
      
      for (let i = 0; i < 10; i++) {
        const testAlarm = { ...mockAlarm, id: `perf-test-${i}` };
        const startTime = performance.now();
        await AlarmScheduler.scheduleAlarm(testAlarm);
        const duration = performance.now() - startTime;
        
        performanceTests.push(duration);
      }
      
      const averageTime = performanceTests.reduce((a, b) => a + b, 0) / performanceTests.length;
      const maxTime = Math.max(...performanceTests);
      
      expect(averageTime).toBeLessThan(reliabilityTestConfig.PERFORMANCE_TARGET_SCHEDULE);
      expect(maxTime).toBeLessThan(reliabilityTestConfig.PERFORMANCE_TARGET_SCHEDULE * 2);
    });

    it('should handle concurrent scheduling requests', async () => {
      const mockScheduleNotificationAsync = require('expo-notifications').scheduleNotificationAsync;
      mockScheduleNotificationAsync.mockResolvedValue('notification-123');
      
      // Create 5 concurrent scheduling requests
      const promises = Array.from({ length: 5 }, (_, i) => 
        AlarmScheduler.scheduleAlarm({ ...mockAlarm, id: `concurrent-${i}` })
      );
      
      const startTime = performance.now();
      const results = await Promise.all(promises);
      const duration = performance.now() - startTime;
      
      // All should succeed
      expect(results.every(r => r.success)).toBe(true);
      
      // Total time should be reasonable
      expect(duration).toBeLessThan(reliabilityTestConfig.PERFORMANCE_TARGET_SCHEDULE * 3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle leap year dates correctly', () => {
      // Test Feb 29 on a leap year
      const leapYearDate = new Date('2024-02-29T06:00:00Z');
      
      const calculation = AlarmScheduler.calculateNextTrigger(
        mockAlarm,
        'UTC',
        leapYearDate
      );
      
      expect(calculation.next_trigger).toBeInstanceOf(Date);
      expect(isNaN(calculation.next_trigger.getTime())).toBe(false);
    });

    it('should handle daylight saving time transitions', () => {
      // Test during DST transition
      const dstDate = new Date('2024-03-10T06:00:00Z'); // DST begins
      
      const calculation = AlarmScheduler.calculateNextTrigger(
        mockAlarm,
        'America/New_York',
        dstDate
      );
      
      expect(calculation.next_trigger).toBeInstanceOf(Date);
      expect(calculation.days_until).toBeGreaterThanOrEqual(0);
    });

    it('should handle year boundary correctly', () => {
      const yearEndDate = new Date('2023-12-31T23:59:59Z');
      
      const calculation = AlarmScheduler.calculateNextTrigger(
        mockAlarm,
        'UTC',
        yearEndDate
      );
      
      expect(calculation.next_trigger).toBeInstanceOf(Date);
      expect(calculation.next_trigger.getFullYear()).toBe(2024);
    });
  });
});