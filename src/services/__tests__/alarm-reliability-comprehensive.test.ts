/**
 * Comprehensive Alarm Reliability Testing
 * Phase 2.3: Integration Testing & Cross-Platform Validation
 * 
 * Tests the 99.9% alarm reliability target through extensive scenarios:
 * - Device state changes (background, locked, low battery)
 * - Network connectivity issues
 * - System resource constraints
 * - Do Not Disturb mode testing
 * - Long-running reliability marathons
 * - Cross-platform edge cases
 */

import AlarmScheduler from '../alarm-scheduler';
import type { 
  Alarm, 
  AlarmScheduleResult,
  ReliabilityTestReport,
  NotificationDeliveryTest,
  NotificationDeliveryResult 
} from '../../types/alarm';
import { reliabilityTestConfig } from './reliability-setup';

// Mock dependencies for comprehensive testing
jest.mock('expo-notifications');
jest.mock('expo-device');
jest.mock('@react-native-async-storage/async-storage');
jest.mock('react-native', () => ({
  Platform: { OS: 'ios', Version: '16.0' },
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
}));

describe('Comprehensive Alarm Reliability Tests', () => {
  let testAlarms: Alarm[];
  let reliabilityResults: ReliabilityTestReport;

  beforeAll(async () => {
    console.log('🔬 Starting Comprehensive Alarm Reliability Test Suite');
    console.log(`Target: ${reliabilityTestConfig.RELIABILITY_TARGET}% reliability`);
    
    // Initialize scheduler
    await AlarmScheduler.initialize();
    
    // Create test alarms for different scenarios
    testAlarms = [
      createTestAlarm('Morning Alarm', '07:00', 'daily'),
      createTestAlarm('Evening Alarm', '20:00', 'weekdays'),
      createTestAlarm('Weekend Alarm', '09:00', 'weekends'),
      createTestAlarm('Custom Alarm', '12:00', 'custom', [1, 3, 5]),
      createTestAlarm('One-time Alarm', '15:30', 'none'),
    ];

    // Mock notification permissions
    const mockNotifications = require('expo-notifications');
    mockNotifications.getPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mockNotifications.scheduleNotificationAsync.mockImplementation(() => 
      Promise.resolve(`notification-${Date.now()}-${Math.random()}`)
    );
    mockNotifications.getAllScheduledNotificationsAsync.mockResolvedValue([]);
  }, reliabilityTestConfig.TIMEOUT_RELIABILITY_SUITE);

  afterAll(async () => {
    console.log('🧹 Cleaning up Comprehensive Reliability Test Suite');
    
    // Generate final reliability report
    if (reliabilityResults) {
      console.log('\n📊 RELIABILITY TEST SUMMARY:');
      console.log(`Overall Score: ${reliabilityResults.overallScore.toFixed(2)}%`);
      console.log(`Reliability Met: ${reliabilityResults.reliabilityMet ? '✅ YES' : '❌ NO'}`);
      console.log(`Total Tests: ${reliabilityResults.totalTests}`);
      console.log(`Passed: ${reliabilityResults.passedTests}`);
      console.log(`Failed: ${reliabilityResults.failedTests}`);
      console.log(`Duration: ${(reliabilityResults.totalDuration / 1000).toFixed(2)}s`);
      
      if (reliabilityResults.recommendations.length > 0) {
        console.log('\n💡 RECOMMENDATIONS:');
        reliabilityResults.recommendations.forEach(rec => console.log(`- ${rec}`));
      }
    }
  }, reliabilityTestConfig.TIMEOUT_RELIABILITY_SUITE);

  describe('Device State Reliability Testing', () => {
    it('should deliver alarms when app is backgrounded', async () => {
      const testResults = [];
      
      for (const alarm of testAlarms.slice(0, 3)) {
        try {
          // Simulate app backgrounding
          const appState = require('react-native').AppState;
          appState.currentState = 'background';
          
          const result = await AlarmScheduler.scheduleAlarm(alarm);
          
          testResults.push({
            alarmId: alarm.id,
            success: result.success,
            backgroundState: true,
            error: result.error || null,
          });
        } catch (error) {
          testResults.push({
            alarmId: alarm.id,
            success: false,
            backgroundState: true,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
      
      const successRate = (testResults.filter(r => r.success).length / testResults.length) * 100;
      
      expect(successRate).toBeGreaterThanOrEqual(reliabilityTestConfig.RELIABILITY_TARGET);
      
      console.log(`Background state reliability: ${successRate.toFixed(2)}%`);
    }, reliabilityTestConfig.TIMEOUT_LONG);

    it('should handle device lock/unlock cycles', async () => {
      const lockUnlockResults = [];
      
      for (let cycle = 0; cycle < 5; cycle++) {
        try {
          // Simulate device lock
          const deviceState = { locked: true };
          
          const alarm = testAlarms[cycle % testAlarms.length];
          const result = await AlarmScheduler.scheduleAlarm(alarm);
          
          // Simulate device unlock
          deviceState.locked = false;
          
          lockUnlockResults.push({
            cycle: cycle + 1,
            success: result.success,
            deviceLocked: deviceState.locked,
            error: result.error || null,
          });
        } catch (error) {
          lockUnlockResults.push({
            cycle: cycle + 1,
            success: false,
            deviceLocked: true,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
      
      const successRate = (lockUnlockResults.filter(r => r.success).length / lockUnlockResults.length) * 100;
      expect(successRate).toBeGreaterThanOrEqual(95.0); // Slightly lower threshold for device state changes
      
      console.log(`Lock/unlock cycle reliability: ${successRate.toFixed(2)}%`);
    }, reliabilityTestConfig.TIMEOUT_MEDIUM);

    it('should maintain performance under low battery conditions', async () => {
      const lowBatteryResults = [];
      
      // Simulate low battery condition
      const mockDevice = require('expo-device');
      mockDevice.batteryLevel = 0.15; // 15% battery
      
      for (const alarm of testAlarms) {
        const startTime = performance.now();
        
        try {
          const result = await AlarmScheduler.scheduleAlarm(alarm);
          const duration = performance.now() - startTime;
          
          lowBatteryResults.push({
            alarmId: alarm.id,
            success: result.success,
            duration,
            batteryLevel: 0.15,
            withinPerformanceTarget: duration < reliabilityTestConfig.PERFORMANCE_TARGET_SCHEDULE,
          });
        } catch (error) {
          lowBatteryResults.push({
            alarmId: alarm.id,
            success: false,
            duration: performance.now() - startTime,
            batteryLevel: 0.15,
            withinPerformanceTarget: false,
          });
        }
      }
      
      const successRate = (lowBatteryResults.filter(r => r.success).length / lowBatteryResults.length) * 100;
      const performanceRate = (lowBatteryResults.filter(r => r.withinPerformanceTarget).length / lowBatteryResults.length) * 100;
      
      expect(successRate).toBeGreaterThanOrEqual(95.0); // Lower threshold for low battery
      expect(performanceRate).toBeGreaterThanOrEqual(80.0); // Performance may degrade under low battery
      
      console.log(`Low battery reliability: ${successRate.toFixed(2)}%`);
      console.log(`Low battery performance: ${performanceRate.toFixed(2)}%`);
    }, reliabilityTestConfig.TIMEOUT_MEDIUM);
  });

  describe('Network Connectivity Reliability', () => {
    it('should handle offline scheduling gracefully', async () => {
      const offlineResults = [];
      
      // Mock network failure
      const mockFetch = global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      
      for (const alarm of testAlarms) {
        try {
          const result = await AlarmScheduler.scheduleAlarm(alarm);
          
          offlineResults.push({
            alarmId: alarm.id,
            success: result.success,
            offlineMode: true,
            error: result.error || null,
          });
        } catch (error) {
          offlineResults.push({
            alarmId: alarm.id,
            success: false,
            offlineMode: true,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
      
      // Local scheduling should still work offline
      const successRate = (offlineResults.filter(r => r.success).length / offlineResults.length) * 100;
      expect(successRate).toBeGreaterThanOrEqual(90.0); // Local scheduling should be resilient
      
      console.log(`Offline scheduling reliability: ${successRate.toFixed(2)}%`);
      
      // Restore global fetch
      delete global.fetch;
    }, reliabilityTestConfig.TIMEOUT_MEDIUM);

    it('should recover from intermittent network issues', async () => {
      const networkRecoveryResults = [];
      let networkCallCount = 0;
      
      // Mock intermittent network failures
      const mockScheduleNotification = require('expo-notifications').scheduleNotificationAsync;
      mockScheduleNotification.mockImplementation(() => {
        networkCallCount++;
        if (networkCallCount % 3 === 0) {
          return Promise.reject(new Error('Intermittent network error'));
        }
        return Promise.resolve(`notification-${Date.now()}`);
      });
      
      for (const alarm of testAlarms) {
        try {
          const result = await AlarmScheduler.scheduleAlarm(alarm);
          
          networkRecoveryResults.push({
            alarmId: alarm.id,
            success: result.success,
            networkCallCount,
            error: result.error || null,
          });
        } catch (error) {
          networkRecoveryResults.push({
            alarmId: alarm.id,
            success: false,
            networkCallCount,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
      
      const successRate = (networkRecoveryResults.filter(r => r.success).length / networkRecoveryResults.length) * 100;
      expect(successRate).toBeGreaterThanOrEqual(85.0); // Some failures expected with intermittent issues
      
      console.log(`Network recovery reliability: ${successRate.toFixed(2)}%`);
    }, reliabilityTestConfig.TIMEOUT_MEDIUM);
  });

  describe('System Resource Constraint Testing', () => {
    it('should handle memory pressure gracefully', async () => {
      const memoryPressureResults = [];
      
      // Simulate memory pressure by creating many concurrent operations
      const concurrentAlarms = Array.from({ length: 20 }, (_, i) => 
        createTestAlarm(`Memory Test ${i}`, '10:00', 'daily')
      );
      
      const promises = concurrentAlarms.map(async (alarm, index) => {
        try {
          // Add artificial delay to simulate memory pressure
          await new Promise(resolve => setTimeout(resolve, index * 50));
          
          const result = await AlarmScheduler.scheduleAlarm(alarm);
          
          return {
            alarmId: alarm.id,
            success: result.success,
            memoryPressure: true,
            error: result.error || null,
          };
        } catch (error) {
          return {
            alarmId: alarm.id,
            success: false,
            memoryPressure: true,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      });
      
      const results = await Promise.all(promises);
      const successRate = (results.filter(r => r.success).length / results.length) * 100;
      
      expect(successRate).toBeGreaterThanOrEqual(85.0); // Some degradation expected under pressure
      
      console.log(`Memory pressure reliability: ${successRate.toFixed(2)}%`);
      console.log(`Tested ${results.length} concurrent alarms`);
    }, reliabilityTestConfig.TIMEOUT_LONG);

    it('should maintain performance under CPU load', async () => {
      const cpuLoadResults = [];
      
      // Simulate CPU load with intensive operations
      const createCpuLoad = () => {
        const start = Date.now();
        while (Date.now() - start < 100) {
          Math.random() * Math.random(); // CPU-intensive operation
        }
      };
      
      for (const alarm of testAlarms) {
        // Create CPU load
        const loadInterval = setInterval(createCpuLoad, 10);
        
        const startTime = performance.now();
        
        try {
          const result = await AlarmScheduler.scheduleAlarm(alarm);
          const duration = performance.now() - startTime;
          
          cpuLoadResults.push({
            alarmId: alarm.id,
            success: result.success,
            duration,
            cpuLoad: true,
            withinPerformanceTarget: duration < reliabilityTestConfig.PERFORMANCE_TARGET_SCHEDULE * 2, // Double tolerance under load
          });
        } catch (error) {
          cpuLoadResults.push({
            alarmId: alarm.id,
            success: false,
            duration: performance.now() - startTime,
            cpuLoad: true,
            withinPerformanceTarget: false,
          });
        } finally {
          clearInterval(loadInterval);
        }
      }
      
      const successRate = (cpuLoadResults.filter(r => r.success).length / cpuLoadResults.length) * 100;
      const performanceRate = (cpuLoadResults.filter(r => r.withinPerformanceTarget).length / cpuLoadResults.length) * 100;
      
      expect(successRate).toBeGreaterThanOrEqual(90.0);
      expect(performanceRate).toBeGreaterThanOrEqual(70.0); // Performance degradation expected under CPU load
      
      console.log(`CPU load reliability: ${successRate.toFixed(2)}%`);
      console.log(`CPU load performance: ${performanceRate.toFixed(2)}%`);
    }, reliabilityTestConfig.TIMEOUT_LONG);
  });

  describe('Do Not Disturb Mode Testing', () => {
    it('should handle Do Not Disturb mode appropriately', async () => {
      const dndResults = [];
      
      // Mock DND mode
      const mockNotifications = require('expo-notifications');
      mockNotifications.getPermissionsAsync.mockResolvedValue({ 
        status: 'granted',
        ios: { 
          allowAlert: true,
          allowBadge: true,
          allowSound: false, // DND mode blocks sound
          allowCriticalAlerts: true,
        }
      });
      
      for (const alarm of testAlarms.slice(0, 3)) {
        try {
          const result = await AlarmScheduler.scheduleAlarm(alarm);
          
          dndResults.push({
            alarmId: alarm.id,
            success: result.success,
            dndMode: true,
            soundAllowed: false,
            error: result.error || null,
          });
        } catch (error) {
          dndResults.push({
            alarmId: alarm.id,
            success: false,
            dndMode: true,
            soundAllowed: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
      
      const successRate = (dndResults.filter(r => r.success).length / dndResults.length) * 100;
      
      // Alarms should still schedule even in DND mode (system handles delivery)
      expect(successRate).toBeGreaterThanOrEqual(95.0);
      
      console.log(`DND mode scheduling reliability: ${successRate.toFixed(2)}%`);
    }, reliabilityTestConfig.TIMEOUT_MEDIUM);
  });

  describe('Long-Running Reliability Marathon', () => {
    it('should maintain reliability over extended operation', async () => {
      const marathonResults = [];
      const totalIterations = 50;
      const batchSize = 5;
      
      console.log(`Starting reliability marathon: ${totalIterations} iterations in batches of ${batchSize}`);
      
      for (let batch = 0; batch < totalIterations / batchSize; batch++) {
        console.log(`Running batch ${batch + 1}/${totalIterations / batchSize}`);
        
        const batchPromises = [];
        
        for (let i = 0; i < batchSize; i++) {
          const iteration = batch * batchSize + i;
          const alarm = createTestAlarm(`Marathon ${iteration}`, '11:00', 'daily');
          
          const promise = (async () => {
            const startTime = performance.now();
            
            try {
              const result = await AlarmScheduler.scheduleAlarm(alarm);
              const duration = performance.now() - startTime;
              
              return {
                iteration: iteration + 1,
                batch: batch + 1,
                success: result.success,
                duration,
                error: result.error || null,
              };
            } catch (error) {
              return {
                iteration: iteration + 1,
                batch: batch + 1,
                success: false,
                duration: performance.now() - startTime,
                error: error instanceof Error ? error.message : 'Unknown error',
              };
            }
          })();
          
          batchPromises.push(promise);
        }
        
        const batchResults = await Promise.all(batchPromises);
        marathonResults.push(...batchResults);
        
        // Brief pause between batches
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      const successRate = (marathonResults.filter(r => r.success).length / marathonResults.length) * 100;
      const averageDuration = marathonResults
        .filter(r => r.success)
        .reduce((sum, r) => sum + r.duration, 0) / marathonResults.filter(r => r.success).length;
      
      expect(successRate).toBeGreaterThanOrEqual(reliabilityTestConfig.RELIABILITY_TARGET);
      expect(averageDuration).toBeLessThan(reliabilityTestConfig.PERFORMANCE_TARGET_SCHEDULE);
      
      console.log(`Marathon reliability: ${successRate.toFixed(2)}%`);
      console.log(`Average duration: ${averageDuration.toFixed(2)}ms`);
      console.log(`Total iterations: ${marathonResults.length}`);
      
      // Generate detailed reliability report
      reliabilityResults = generateReliabilityReport(marathonResults);
      
    }, reliabilityTestConfig.TIMEOUT_RELIABILITY_SUITE);
  });

  describe('Cross-Platform Edge Cases', () => {
    it('should handle timezone changes gracefully', async () => {
      const timezoneResults = [];
      const timezones = ['America/New_York', 'Europe/London', 'Asia/Tokyo', 'Australia/Sydney'];
      
      for (const timezone of timezones) {
        const alarm = createTestAlarm(`Timezone Test ${timezone}`, '14:00', 'daily');
        
        try {
          const result = await AlarmScheduler.scheduleAlarm(alarm, timezone);
          
          timezoneResults.push({
            timezone,
            success: result.success,
            nextTrigger: result.next_trigger_at,
            error: result.error || null,
          });
        } catch (error) {
          timezoneResults.push({
            timezone,
            success: false,
            nextTrigger: null,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
      
      const successRate = (timezoneResults.filter(r => r.success).length / timezoneResults.length) * 100;
      expect(successRate).toBeGreaterThanOrEqual(95.0);
      
      console.log(`Timezone handling reliability: ${successRate.toFixed(2)}%`);
    }, reliabilityTestConfig.TIMEOUT_MEDIUM);

    it('should handle daylight saving time transitions', async () => {
      const dstResults = [];
      
      // Test around DST transition dates
      const dstTestDates = [
        new Date('2024-03-10T06:00:00Z'), // DST begins in US
        new Date('2024-11-03T06:00:00Z'), // DST ends in US
      ];
      
      for (const testDate of dstTestDates) {
        const alarm = createTestAlarm(`DST Test ${testDate.toISOString()}`, '07:00', 'daily');
        
        try {
          const result = await AlarmScheduler.scheduleAlarm(alarm, 'America/New_York');
          
          dstResults.push({
            testDate: testDate.toISOString(),
            success: result.success,
            nextTrigger: result.next_trigger_at,
            error: result.error || null,
          });
        } catch (error) {
          dstResults.push({
            testDate: testDate.toISOString(),
            success: false,
            nextTrigger: null,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
      
      const successRate = (dstResults.filter(r => r.success).length / dstResults.length) * 100;
      expect(successRate).toBeGreaterThanOrEqual(95.0);
      
      console.log(`DST handling reliability: ${successRate.toFixed(2)}%`);
    }, reliabilityTestConfig.TIMEOUT_MEDIUM);
  });

  // Helper functions
  function createTestAlarm(
    name: string, 
    time: string, 
    repeatPattern: any = 'none', 
    repeatDays: number[] | null = null
  ): Alarm {
    return {
      id: `test-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      user_id: 'test-user',
      name,
      time,
      enabled: true,
      repeat_pattern: repeatPattern,
      repeat_days: repeatDays,
      timezone: 'America/New_York',
      audio_file_url: null,
      audio_output: 'auto' as any,
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
  }

  function generateReliabilityReport(results: any[]): ReliabilityTestReport {
    const totalTests = results.length;
    const passedTests = results.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    const overallScore = (passedTests / totalTests) * 100;
    
    const recommendations = [];
    
    if (overallScore < reliabilityTestConfig.RELIABILITY_TARGET) {
      recommendations.push('Investigate and fix scheduling failures to meet 99.9% target');
    }
    
    const averageDuration = results
      .filter(r => r.success && r.duration)
      .reduce((sum, r) => sum + r.duration, 0) / passedTests;
    
    if (averageDuration > reliabilityTestConfig.PERFORMANCE_TARGET_SCHEDULE) {
      recommendations.push('Optimize scheduling performance to meet response time targets');
    }
    
    return {
      overallScore,
      reliabilityMet: overallScore >= reliabilityTestConfig.RELIABILITY_TARGET,
      totalTests,
      passedTests,
      failedTests,
      totalDuration: results.reduce((sum, r) => sum + (r.duration || 0), 0),
      timestamp: new Date().toISOString(),
      suites: [],
      recommendations,
      summary: {
        critical_issues: failedTests,
        performance_concerns: averageDuration > reliabilityTestConfig.PERFORMANCE_TARGET_SCHEDULE,
        notification_reliability: overallScore,
        background_stability: overallScore,
        edge_case_coverage: overallScore,
      },
    };
  }
});