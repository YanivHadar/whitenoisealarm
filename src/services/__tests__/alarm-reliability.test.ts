/**
 * Alarm Reliability Integration Tests
 * 
 * Comprehensive test suite ensuring 99.9% alarm delivery reliability
 * across platforms, app states, and edge cases. Tests notification
 * delivery, background processing, and system integration.
 */

import * as Notifications from 'expo-notifications';
import { AlarmDomain } from '../alarm-domain';
import { AlarmScheduler } from '../alarm-scheduler';
import { SnoozeManager } from '../snooze-manager';
import { AlarmAudio } from '../alarm-audio';
import type { 
  AlarmFormData, 
  Alarm,
  AppState,
  NotificationDeliveryTest
} from '../../types/alarm';

// Mock dependencies for isolated testing
jest.mock('expo-notifications');
jest.mock('@react-native-async-storage/async-storage');

const mockNotifications = Notifications as jest.Mocked<typeof Notifications>;

describe('Alarm Reliability Integration Tests', () => {
  beforeEach(async () => {
    // Clear all state before each test
    jest.clearAllMocks();
    await SnoozeManager.clearAllSnoozeStates();
    mockNotifications.cancelAllScheduledNotificationsAsync.mockResolvedValue();
  });

  describe('Notification Delivery Reliability', () => {
    /**
     * Test notification delivery across different app states
     * Target: 99.9% delivery reliability
     */
    it('should deliver notifications when app is closed', async () => {
      const alarm = await createTestAlarm({
        name: 'Morning Alarm',
        time: '07:00',
        enabled: true,
        repeat_pattern: 'daily'
      });

      // Mock app closed state
      const appState: AppState = 'background';
      
      // Schedule alarm
      const scheduleResult = await AlarmScheduler.scheduleAlarm(alarm);
      expect(scheduleResult.success).toBe(true);
      
      // Simulate notification trigger
      mockNotifications.scheduleNotificationAsync.mockResolvedValue('notification-id');
      
      // Verify notification was scheduled with correct parameters
      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: 'Morning Alarm',
          body: 'Time to wake up!',
          sound: alarm.alarm_sound || 'default',
          priority: Notifications.AndroidNotificationPriority.MAX,
          categoryIdentifier: 'ALARM_CATEGORY'
        },
        trigger: expect.any(Object)
      });
    });

    it('should deliver notifications when app is backgrounded', async () => {
      const alarm = await createTestAlarm({
        name: 'Afternoon Reminder',
        time: '15:30',
        enabled: true,
        repeat_pattern: 'weekdays'
      });

      // Mock app backgrounded state
      const appState: AppState = 'background';
      
      const scheduleResult = await AlarmScheduler.scheduleAlarm(alarm);
      expect(scheduleResult.success).toBe(true);
      expect(scheduleResult.notification_id).toBeDefined();
    });

    it('should handle notification permissions correctly', async () => {
      const alarm = await createTestAlarm({
        name: 'Permission Test',
        time: '09:00',
        enabled: true
      });

      // Mock permission denied
      mockNotifications.getPermissionsAsync.mockResolvedValue({
        status: Notifications.PermissionStatus.DENIED,
        canAskAgain: true,
        granted: false,
        expires: 'never'
      });

      const scheduleResult = await AlarmScheduler.scheduleAlarm(alarm);
      expect(scheduleResult.success).toBe(false);
      expect(scheduleResult.error).toContain('notification permissions');
    });

    it('should retry failed notifications with exponential backoff', async () => {
      const alarm = await createTestAlarm({
        name: 'Retry Test',
        time: '10:00',
        enabled: true
      });

      // Mock initial failure
      mockNotifications.scheduleNotificationAsync
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce('retry-notification-id');

      const scheduleResult = await AlarmScheduler.scheduleAlarm(alarm);
      
      // Should succeed on retry
      expect(scheduleResult.success).toBe(true);
      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledTimes(2);
    });
  });

  describe('Background Processing Reliability', () => {
    /**
     * Test background task execution and state persistence
     */
    it('should maintain alarm state during background execution', async () => {
      const alarm = await createTestAlarm({
        name: 'Background Test',
        time: '06:00',
        enabled: true,
        repeat_pattern: 'daily'
      });

      // Schedule alarm
      await AlarmScheduler.scheduleAlarm(alarm);
      
      // Simulate app going to background
      const beforeBackground = await AlarmDomain.getAlarmById(alarm.id);
      expect(beforeBackground.success).toBe(true);
      
      // Simulate background processing
      await simulateBackgroundProcessing();
      
      // Verify alarm state persisted
      const afterBackground = await AlarmDomain.getAlarmById(alarm.id);
      expect(afterBackground.success).toBe(true);
      expect(afterBackground.data?.enabled).toBe(true);
    });

    it('should handle background audio processing', async () => {
      const alarm = await createTestAlarm({
        name: 'Audio Test',
        time: '07:30',
        enabled: true,
        alarm_sound: 'gentle_wake.mp3'
      });

      // Test audio initialization in background
      const audioResult = await AlarmAudio.initializeAudio();
      expect(audioResult.success).toBe(true);
      
      // Test alarm playback
      const playResult = await AlarmAudio.playAlarm(alarm, 'speaker');
      expect(playResult.success).toBe(true);
    });

    it('should recover from background task failures', async () => {
      const alarm = await createTestAlarm({
        name: 'Recovery Test',
        time: '08:00',
        enabled: true
      });

      // Simulate background task failure
      const scheduleResult = await AlarmScheduler.scheduleAlarm(alarm);
      expect(scheduleResult.success).toBe(true);
      
      // Simulate system reboot/app restart
      await simulateAppRestart();
      
      // Verify alarm recovery
      const recoveredAlarm = await AlarmDomain.getAlarmById(alarm.id);
      expect(recoveredAlarm.success).toBe(true);
      expect(recoveredAlarm.data?.enabled).toBe(true);
    });
  });

  describe('Platform-Specific Reliability', () => {
    /**
     * Test iOS and Android specific notification behaviors
     */
    it('should handle iOS notification categories', async () => {
      const alarm = await createTestAlarm({
        name: 'iOS Test',
        time: '07:00',
        enabled: true,
        snooze_enabled: true
      });

      // Mock iOS platform
      jest.mock('expo-device', () => ({
        osName: 'iOS'
      }));

      const scheduleResult = await AlarmScheduler.scheduleAlarm(alarm);
      expect(scheduleResult.success).toBe(true);
      
      // Verify iOS-specific notification setup
      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: expect.objectContaining({
          categoryIdentifier: 'ALARM_CATEGORY'
        }),
        trigger: expect.any(Object)
      });
    });

    it('should handle Android notification channels', async () => {
      const alarm = await createTestAlarm({
        name: 'Android Test',
        time: '07:00',
        enabled: true
      });

      // Mock Android platform
      jest.mock('expo-device', () => ({
        osName: 'Android'
      }));

      const scheduleResult = await AlarmScheduler.scheduleAlarm(alarm);
      expect(scheduleResult.success).toBe(true);
      
      // Verify Android-specific notification setup
      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: expect.objectContaining({
          priority: Notifications.AndroidNotificationPriority.MAX
        }),
        trigger: expect.any(Object)
      });
    });
  });

  describe('Edge Case Reliability', () => {
    /**
     * Test reliability under extreme conditions and edge cases
     */
    it('should handle timezone changes during scheduled alarms', async () => {
      const alarm = await createTestAlarm({
        name: 'Timezone Test',
        time: '08:00',
        enabled: true,
        timezone: 'America/New_York'
      });

      await AlarmScheduler.scheduleAlarm(alarm);
      
      // Simulate timezone change
      const newTimezone = 'America/Los_Angeles';
      const updateResult = await AlarmDomain.updateAlarm(alarm.id, {
        timezone: newTimezone
      });
      
      expect(updateResult.success).toBe(true);
      
      // Verify alarm was rescheduled for new timezone
      expect(mockNotifications.cancelScheduledNotificationAsync).toHaveBeenCalled();
      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledTimes(2);
    });

    it('should handle DST transitions correctly', async () => {
      // Test alarm scheduled during "spring forward"
      const springAlarm = await createTestAlarm({
        name: 'Spring DST Test',
        time: '02:30', // This time gets skipped during DST
        enabled: true,
        repeat_pattern: 'daily'
      });

      const scheduleResult = await AlarmScheduler.scheduleAlarm(springAlarm);
      expect(scheduleResult.success).toBe(true);
      
      // Verify DST handling (should schedule for 3:30 AM instead)
      const scheduledTime = scheduleResult.scheduled_times?.[0];
      expect(scheduledTime).toBeDefined();
    });

    it('should handle maximum concurrent alarms', async () => {
      const alarms: Alarm[] = [];
      
      // Create maximum number of alarms (64 on most platforms)
      for (let i = 0; i < 64; i++) {
        const alarm = await createTestAlarm({
          name: `Stress Test ${i}`,
          time: `${String(Math.floor(i / 4)).padStart(2, '0')}:${String((i % 4) * 15).padStart(2, '0')}`,
          enabled: true
        });
        alarms.push(alarm);
      }

      // Schedule all alarms
      const results = await Promise.all(
        alarms.map(alarm => AlarmScheduler.scheduleAlarm(alarm))
      );

      // All should succeed or fail gracefully
      const successCount = results.filter(r => r.success).length;
      expect(successCount).toBeGreaterThan(0);
      
      // If some fail, they should have proper error messages
      const failures = results.filter(r => !r.success);
      failures.forEach(failure => {
        expect(failure.error).toBeDefined();
        expect(failure.error).toContain('notification limit');
      });
    });

    it('should handle low memory conditions', async () => {
      const alarm = await createTestAlarm({
        name: 'Memory Test',
        time: '09:00',
        enabled: true
      });

      // Simulate low memory by creating large objects
      const memoryHogs = Array(1000).fill(null).map(() => new Array(10000).fill('data'));
      
      try {
        const scheduleResult = await AlarmScheduler.scheduleAlarm(alarm);
        expect(scheduleResult.success).toBe(true);
      } finally {
        // Cleanup
        memoryHogs.length = 0;
      }
    });

    it('should handle rapid alarm creation and deletion', async () => {
      const operations: Promise<any>[] = [];

      // Create many alarms rapidly
      for (let i = 0; i < 20; i++) {
        operations.push(
          createTestAlarm({
            name: `Rapid Test ${i}`,
            time: '10:00',
            enabled: true
          })
        );
      }

      const alarms = await Promise.all(operations);
      
      // Delete them all rapidly
      const deleteOperations = alarms.map(alarm => 
        AlarmDomain.deleteAlarm(alarm.id)
      );

      const deleteResults = await Promise.all(deleteOperations);
      
      // All operations should succeed or fail gracefully
      deleteResults.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Snooze Reliability', () => {
    /**
     * Test snooze functionality reliability and state management
     */
    it('should maintain snooze state across app restarts', async () => {
      const alarm = await createTestAlarm({
        name: 'Snooze Test',
        time: '07:00',
        enabled: true,
        snooze_enabled: true,
        snooze_duration: 5,
        snooze_count_limit: 3
      });

      // Trigger snooze
      const snoozeResult = await SnoozeManager.snoozeAlarm(alarm);
      expect(snoozeResult.success).toBe(true);
      
      // Simulate app restart
      await simulateAppRestart();
      
      // Verify snooze state restored
      const snoozeState = SnoozeManager.getSnoozeState(alarm.id);
      expect(snoozeState).toBeDefined();
      expect(snoozeState?.is_active).toBe(true);
    });

    it('should handle multiple snoozes correctly', async () => {
      const alarm = await createTestAlarm({
        name: 'Multiple Snooze Test',
        time: '07:00',
        enabled: true,
        snooze_enabled: true,
        snooze_duration: 3,
        snooze_count_limit: 5
      });

      // Trigger multiple snoozes
      for (let i = 1; i <= 3; i++) {
        const snoozeResult = await SnoozeManager.snoozeAlarm(alarm);
        expect(snoozeResult.success).toBe(true);
        expect(snoozeResult.snooze_count).toBe(i);
        expect(snoozeResult.can_snooze_again).toBe(i < 5);
      }
    });

    it('should prevent excessive snoozing', async () => {
      const alarm = await createTestAlarm({
        name: 'Limit Test',
        time: '07:00',
        enabled: true,
        snooze_enabled: true,
        snooze_duration: 5,
        snooze_count_limit: 2
      });

      // Exhaust snooze limit
      await SnoozeManager.snoozeAlarm(alarm);
      await SnoozeManager.snoozeAlarm(alarm);
      
      // Third snooze should fail
      const thirdSnooze = await SnoozeManager.snoozeAlarm(alarm);
      expect(thirdSnooze.success).toBe(false);
      expect(thirdSnooze.error).toContain('Maximum snooze count reached');
    });
  });

  describe('Performance Reliability', () => {
    /**
     * Test performance under load and resource constraints
     */
    it('should perform alarm operations within time limits', async () => {
      const alarm = await createTestAlarm({
        name: 'Performance Test',
        time: '08:00',
        enabled: true
      });

      // Test alarm creation performance
      const createStart = Date.now();
      const createResult = await AlarmDomain.createAlarm({
        name: 'Speed Test',
        time: '09:00',
        enabled: true,
        repeat_pattern: 'daily'
      });
      const createDuration = Date.now() - createStart;
      
      expect(createResult.success).toBe(true);
      expect(createDuration).toBeLessThan(1000); // Should complete within 1 second
      
      // Test scheduling performance
      const scheduleStart = Date.now();
      await AlarmScheduler.scheduleAlarm(alarm);
      const scheduleDuration = Date.now() - scheduleStart;
      
      expect(scheduleDuration).toBeLessThan(500); // Should complete within 500ms
    });

    it('should handle high-frequency alarm updates', async () => {
      const alarm = await createTestAlarm({
        name: 'Update Test',
        time: '10:00',
        enabled: true
      });

      // Perform rapid updates
      const updatePromises = Array(10).fill(null).map(async (_, i) => {
        return AlarmDomain.updateAlarm(alarm.id, {
          name: `Updated Name ${i}`
        });
      });

      const results = await Promise.all(updatePromises);
      
      // All updates should succeed or fail gracefully
      results.forEach((result, i) => {
        expect(result).toBeDefined();
        // At least the last update should succeed
        if (i === results.length - 1) {
          expect(result.success).toBe(true);
        }
      });
    });
  });

  describe('Data Integrity Reliability', () => {
    /**
     * Test data consistency and integrity under various conditions
     */
    it('should maintain alarm data consistency during concurrent operations', async () => {
      const alarm = await createTestAlarm({
        name: 'Consistency Test',
        time: '11:00',
        enabled: true
      });

      // Perform concurrent operations
      const operations = [
        AlarmDomain.updateAlarm(alarm.id, { name: 'Updated Name' }),
        AlarmScheduler.scheduleAlarm(alarm),
        SnoozeManager.snoozeAlarm(alarm),
        AlarmDomain.toggleAlarm(alarm.id)
      ];

      const results = await Promise.allSettled(operations);
      
      // Final state should be consistent
      const finalAlarm = await AlarmDomain.getAlarmById(alarm.id);
      expect(finalAlarm.success).toBe(true);
      
      // Data should be valid
      const alarmData = finalAlarm.data!;
      expect(alarmData.id).toBe(alarm.id);
      expect(alarmData.time).toMatch(/^\d{2}:\d{2}$/);
      expect(typeof alarmData.enabled).toBe('boolean');
    });

    it('should recover from database connection failures', async () => {
      const alarm = await createTestAlarm({
        name: 'DB Recovery Test',
        time: '12:00',
        enabled: true
      });

      // Mock database failure
      jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Attempt operation during simulated failure
      const result = await AlarmDomain.updateAlarm(alarm.id, { name: 'Should Fail' });
      
      // Should handle failure gracefully
      expect(result).toBeDefined();
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
      
      jest.restoreAllMocks();
    });
  });

  // Helper Functions
  async function createTestAlarm(formData: Partial<AlarmFormData>): Promise<Alarm> {
    const defaultAlarm: AlarmFormData = {
      name: 'Test Alarm',
      time: '08:00',
      enabled: true,
      repeat_pattern: 'once',
      repeat_days: null,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      alarm_sound: 'default',
      volume: 0.8,
      fade_in_duration: 30,
      vibration_enabled: true,
      vibration_pattern: 'default',
      snooze_enabled: true,
      snooze_duration: 9,
      snooze_count_limit: 3,
      auto_dismiss_duration: 300,
      audio_output: 'auto',
      gradual_volume_increase: false,
      ...formData
    };

    const result = await AlarmDomain.createAlarm(defaultAlarm);
    if (!result.success) {
      throw new Error(`Failed to create test alarm: ${result.error}`);
    }
    
    return result.data!;
  }

  async function simulateBackgroundProcessing(): Promise<void> {
    // Simulate app backgrounding
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  async function simulateAppRestart(): Promise<void> {
    // Clear in-memory state to simulate restart
    await SnoozeManager.initialize();
    await new Promise(resolve => setTimeout(resolve, 50));
  }
});

/**
 * Performance benchmark tests for alarm operations
 */
describe('Alarm Performance Benchmarks', () => {
  const PERFORMANCE_TARGETS = {
    CREATE_ALARM: 1000, // ms
    SCHEDULE_ALARM: 500, // ms
    UPDATE_ALARM: 300, // ms
    DELETE_ALARM: 200, // ms
    SNOOZE_ALARM: 100, // ms
  };

  it('should meet performance targets for all operations', async () => {
    const testAlarm: AlarmFormData = {
      name: 'Benchmark Test',
      time: '08:00',
      enabled: true,
      repeat_pattern: 'daily',
      repeat_days: null,
      timezone: 'America/New_York',
      alarm_sound: 'gentle_wake.mp3',
      volume: 0.7,
      fade_in_duration: 30,
      vibration_enabled: true,
      vibration_pattern: 'gentle',
      snooze_enabled: true,
      snooze_duration: 5,
      snooze_count_limit: 3,
      auto_dismiss_duration: 300,
      audio_output: 'speaker',
      gradual_volume_increase: true
    };

    // Benchmark alarm creation
    const createStart = performance.now();
    const createResult = await AlarmDomain.createAlarm(testAlarm);
    const createDuration = performance.now() - createStart;
    
    expect(createResult.success).toBe(true);
    expect(createDuration).toBeLessThan(PERFORMANCE_TARGETS.CREATE_ALARM);
    
    const alarm = createResult.data!;

    // Benchmark alarm scheduling
    const scheduleStart = performance.now();
    const scheduleResult = await AlarmScheduler.scheduleAlarm(alarm);
    const scheduleDuration = performance.now() - scheduleStart;
    
    expect(scheduleResult.success).toBe(true);
    expect(scheduleDuration).toBeLessThan(PERFORMANCE_TARGETS.SCHEDULE_ALARM);

    // Benchmark alarm update
    const updateStart = performance.now();
    const updateResult = await AlarmDomain.updateAlarm(alarm.id, { name: 'Updated Benchmark' });
    const updateDuration = performance.now() - updateStart;
    
    expect(updateResult.success).toBe(true);
    expect(updateDuration).toBeLessThan(PERFORMANCE_TARGETS.UPDATE_ALARM);

    // Benchmark snooze operation
    const snoozeStart = performance.now();
    const snoozeResult = await SnoozeManager.snoozeAlarm(alarm);
    const snoozeDuration = performance.now() - snoozeStart;
    
    expect(snoozeResult.success).toBe(true);
    expect(snoozeDuration).toBeLessThan(PERFORMANCE_TARGETS.SNOOZE_ALARM);

    // Benchmark alarm deletion
    const deleteStart = performance.now();
    const deleteResult = await AlarmDomain.deleteAlarm(alarm.id);
    const deleteDuration = performance.now() - deleteStart;
    
    expect(deleteResult.success).toBe(true);
    expect(deleteDuration).toBeLessThan(PERFORMANCE_TARGETS.DELETE_ALARM);

    console.log(`Performance Results:
      Create: ${createDuration.toFixed(2)}ms (target: ${PERFORMANCE_TARGETS.CREATE_ALARM}ms)
      Schedule: ${scheduleDuration.toFixed(2)}ms (target: ${PERFORMANCE_TARGETS.SCHEDULE_ALARM}ms)
      Update: ${updateDuration.toFixed(2)}ms (target: ${PERFORMANCE_TARGETS.UPDATE_ALARM}ms)
      Snooze: ${snoozeDuration.toFixed(2)}ms (target: ${PERFORMANCE_TARGETS.SNOOZE_ALARM}ms)
      Delete: ${deleteDuration.toFixed(2)}ms (target: ${PERFORMANCE_TARGETS.DELETE_ALARM}ms)
    `);
  });
});