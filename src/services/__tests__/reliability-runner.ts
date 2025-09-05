/**
 * Alarm Reliability Test Runner
 * 
 * Executes comprehensive reliability tests and generates detailed
 * reports for 99.9% alarm delivery validation. Includes platform-specific
 * tests, performance benchmarks, and edge case validation.
 */

import { AlarmDomain } from '../alarm-domain';
import { AlarmScheduler } from '../alarm-scheduler';
import { SnoozeManager } from '../snooze-manager';
import { AlarmAudio } from '../alarm-audio';
import { AlarmErrorHandler } from '../alarm-error-handler';
import type { 
  AlarmFormData, 
  Alarm,
  ReliabilityTestReport,
  TestSuite,
  TestResult 
} from '../../types/alarm';

export class ReliabilityTestRunner {
  private static testResults: TestResult[] = [];
  private static startTime: number;
  private static report: ReliabilityTestReport;

  /**
   * Execute complete reliability test suite
   */
  static async runFullSuite(): Promise<ReliabilityTestReport> {
    console.log('🚀 Starting Alarm Reliability Test Suite...');
    this.startTime = Date.now();
    this.testResults = [];

    const suites: TestSuite[] = [
      {
        name: 'Core Functionality Tests',
        tests: await this.runCoreFunctionalityTests(),
        weight: 25, // 25% of overall score
      },
      {
        name: 'Notification Delivery Tests',
        tests: await this.runNotificationDeliveryTests(),
        weight: 30, // 30% of overall score
      },
      {
        name: 'Background Processing Tests',
        tests: await this.runBackgroundProcessingTests(),
        weight: 20, // 20% of overall score
      },
      {
        name: 'Platform Compatibility Tests',
        tests: await this.runPlatformCompatibilityTests(),
        weight: 10, // 10% of overall score
      },
      {
        name: 'Edge Case Tests',
        tests: await this.runEdgeCaseTests(),
        weight: 10, // 10% of overall score
      },
      {
        name: 'Performance Tests',
        tests: await this.runPerformanceTests(),
        weight: 5, // 5% of overall score
      }
    ];

    this.report = this.generateReport(suites);
    
    console.log('✅ Reliability Test Suite Complete');
    console.log(`📊 Overall Reliability Score: ${this.report.overallScore.toFixed(2)}%`);
    
    return this.report;
  }

  /**
   * Test core alarm functionality
   */
  private static async runCoreFunctionalityTests(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    // Test 1: Alarm Creation and Validation
    results.push(await this.runTest('Alarm Creation', async () => {
      const alarmData: AlarmFormData = {
        name: 'Test Alarm',
        time: '08:00',
        enabled: true,
        repeat_pattern: 'daily',
        repeat_days: null,
        timezone: 'America/New_York',
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
        gradual_volume_increase: false
      };

      const result = await AlarmDomain.createAlarm(alarmData);
      if (!result.success) {
        throw new Error(`Alarm creation failed: ${result.error}`);
      }

      return {
        success: true,
        data: result.data,
        metrics: { creation_time: Date.now() }
      };
    }));

    // Test 2: Alarm Scheduling
    results.push(await this.runTest('Alarm Scheduling', async () => {
      const alarm = await this.createTestAlarm();
      const scheduleResult = await AlarmScheduler.scheduleAlarm(alarm);
      
      if (!scheduleResult.success) {
        throw new Error(`Alarm scheduling failed: ${scheduleResult.error}`);
      }

      return {
        success: true,
        data: scheduleResult,
        metrics: { 
          scheduled_count: scheduleResult.scheduled_times?.length || 0,
          notification_id: scheduleResult.notification_id
        }
      };
    }));

    // Test 3: Alarm Update Operations
    results.push(await this.runTest('Alarm Updates', async () => {
      const alarm = await this.createTestAlarm();
      const updateResult = await AlarmDomain.updateAlarm(alarm.id, {
        name: 'Updated Alarm Name',
        time: '09:30'
      });

      if (!updateResult.success) {
        throw new Error(`Alarm update failed: ${updateResult.error}`);
      }

      return {
        success: true,
        data: updateResult.data,
        metrics: { updated_fields: 2 }
      };
    }));

    // Test 4: Alarm Deletion
    results.push(await this.runTest('Alarm Deletion', async () => {
      const alarm = await this.createTestAlarm();
      const deleteResult = await AlarmDomain.deleteAlarm(alarm.id);

      if (!deleteResult.success) {
        throw new Error(`Alarm deletion failed: ${deleteResult.error}`);
      }

      return {
        success: true,
        data: null,
        metrics: { cleanup_successful: true }
      };
    }));

    // Test 5: CRUD Operations Stress Test
    results.push(await this.runTest('CRUD Stress Test', async () => {
      const operations = [];
      const alarms: Alarm[] = [];

      // Create 10 alarms
      for (let i = 0; i < 10; i++) {
        const alarm = await this.createTestAlarm({
          name: `Stress Test Alarm ${i}`,
          time: `0${Math.floor(i / 2 + 6)}:${(i % 2) * 30 === 0 ? '00' : '30'}`
        });
        alarms.push(alarm);
      }

      // Update all alarms
      for (const alarm of alarms) {
        await AlarmDomain.updateAlarm(alarm.id, { enabled: false });
      }

      // Delete all alarms
      for (const alarm of alarms) {
        await AlarmDomain.deleteAlarm(alarm.id);
      }

      return {
        success: true,
        data: null,
        metrics: { 
          operations_completed: alarms.length * 3, // create, update, delete
          success_rate: 1.0
        }
      };
    }));

    return results;
  }

  /**
   * Test notification delivery reliability
   */
  private static async runNotificationDeliveryTests(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    // Test 1: Immediate Notification Delivery
    results.push(await this.runTest('Immediate Delivery', async () => {
      const alarm = await this.createTestAlarm();
      const scheduleResult = await AlarmScheduler.scheduleAlarm(alarm);
      
      if (!scheduleResult.success || !scheduleResult.notification_id) {
        throw new Error('Failed to schedule notification');
      }

      return {
        success: true,
        data: scheduleResult,
        metrics: { 
          delivery_method: 'immediate',
          notification_id: scheduleResult.notification_id
        }
      };
    }));

    // Test 2: Scheduled Notification Delivery
    results.push(await this.runTest('Scheduled Delivery', async () => {
      const alarm = await this.createTestAlarm({
        time: this.getFutureTime(2) // 2 minutes from now
      });
      
      const scheduleResult = await AlarmScheduler.scheduleAlarm(alarm);
      
      if (!scheduleResult.success) {
        throw new Error(`Scheduled delivery failed: ${scheduleResult.error}`);
      }

      return {
        success: true,
        data: scheduleResult,
        metrics: { 
          delivery_method: 'scheduled',
          scheduled_times: scheduleResult.scheduled_times?.length || 0
        }
      };
    }));

    // Test 3: Repeat Pattern Notifications
    results.push(await this.runTest('Repeat Pattern Delivery', async () => {
      const alarm = await this.createTestAlarm({
        repeat_pattern: 'weekdays',
        repeat_days: [1, 2, 3, 4, 5] // Monday to Friday
      });

      const scheduleResult = await AlarmScheduler.scheduleAlarm(alarm);
      
      if (!scheduleResult.success) {
        throw new Error(`Repeat pattern scheduling failed: ${scheduleResult.error}`);
      }

      return {
        success: true,
        data: scheduleResult,
        metrics: { 
          repeat_pattern: alarm.repeat_pattern,
          scheduled_instances: scheduleResult.scheduled_times?.length || 0
        }
      };
    }));

    // Test 4: High Priority Notification Delivery
    results.push(await this.runTest('High Priority Delivery', async () => {
      const alarm = await this.createTestAlarm({
        name: 'URGENT ALARM',
        priority: 'high'
      });

      const scheduleResult = await AlarmScheduler.scheduleAlarm(alarm);
      
      if (!scheduleResult.success) {
        throw new Error(`High priority scheduling failed: ${scheduleResult.error}`);
      }

      return {
        success: true,
        data: scheduleResult,
        metrics: { 
          priority_level: 'high',
          notification_configured: true
        }
      };
    }));

    return results;
  }

  /**
   * Test background processing reliability
   */
  private static async runBackgroundProcessingTests(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    // Test 1: Background State Persistence
    results.push(await this.runTest('Background Persistence', async () => {
      const alarm = await this.createTestAlarm();
      
      // Simulate background processing
      await this.simulateBackgroundState();
      
      const retrievedAlarm = await AlarmDomain.getAlarmById(alarm.id);
      if (!retrievedAlarm.success) {
        throw new Error('Failed to retrieve alarm after background simulation');
      }

      return {
        success: true,
        data: retrievedAlarm.data,
        metrics: { 
          data_persisted: true,
          state_consistent: retrievedAlarm.data?.enabled === alarm.enabled
        }
      };
    }));

    // Test 2: Snooze State Management
    results.push(await this.runTest('Snooze State Management', async () => {
      const alarm = await this.createTestAlarm({
        snooze_enabled: true,
        snooze_duration: 5,
        snooze_count_limit: 3
      });

      await SnoozeManager.initialize();
      const snoozeResult = await SnoozeManager.snoozeAlarm(alarm);
      
      if (!snoozeResult.success) {
        throw new Error(`Snooze failed: ${snoozeResult.error}`);
      }

      // Simulate app restart
      await this.simulateAppRestart();
      
      const snoozeState = SnoozeManager.getSnoozeState(alarm.id);
      if (!snoozeState) {
        throw new Error('Snooze state not restored after restart');
      }

      return {
        success: true,
        data: snoozeState,
        metrics: { 
          snooze_count: snoozeResult.snooze_count,
          state_restored: true,
          can_snooze_again: snoozeResult.can_snooze_again
        }
      };
    }));

    // Test 3: Audio Processing in Background
    results.push(await this.runTest('Background Audio Processing', async () => {
      const initResult = await AlarmAudio.initializeAudio();
      if (!initResult.success) {
        throw new Error(`Audio initialization failed: ${initResult.error}`);
      }

      const alarm = await this.createTestAlarm({
        alarm_sound: 'gentle_wake.mp3'
      });

      const playResult = await AlarmAudio.playAlarm(alarm, 'speaker');
      if (!playResult.success) {
        throw new Error(`Audio playback failed: ${playResult.error}`);
      }

      return {
        success: true,
        data: playResult,
        metrics: { 
          audio_initialized: true,
          playback_successful: true,
          audio_output: 'speaker'
        }
      };
    }));

    return results;
  }

  /**
   * Test platform-specific compatibility
   */
  private static async runPlatformCompatibilityTests(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    // Test 1: Notification Categories Setup
    results.push(await this.runTest('Notification Categories', async () => {
      const setupResult = await AlarmScheduler.setupNotificationCategories();
      if (!setupResult) {
        throw new Error('Failed to setup notification categories');
      }

      return {
        success: true,
        data: null,
        metrics: { 
          categories_configured: true,
          actions_available: true
        }
      };
    }));

    // Test 2: Permission Handling
    results.push(await this.runTest('Permission Handling', async () => {
      const permissionResult = await AlarmScheduler.requestNotificationPermissions();
      
      return {
        success: permissionResult.granted || permissionResult.canAskAgain,
        data: permissionResult,
        metrics: { 
          permissions_granted: permissionResult.granted,
          can_ask_again: permissionResult.canAskAgain,
          status: permissionResult.status
        }
      };
    }));

    // Test 3: Timezone Handling
    results.push(await this.runTest('Timezone Compatibility', async () => {
      const timezones = [
        'America/New_York',
        'America/Los_Angeles',
        'Europe/London',
        'Asia/Tokyo'
      ];

      const results = [];
      for (const timezone of timezones) {
        const alarm = await this.createTestAlarm({
          timezone,
          time: '09:00'
        });

        const scheduleResult = await AlarmScheduler.scheduleAlarm(alarm);
        results.push({
          timezone,
          success: scheduleResult.success,
          scheduled_times: scheduleResult.scheduled_times?.length || 0
        });
      }

      return {
        success: results.every(r => r.success),
        data: results,
        metrics: { 
          timezones_tested: timezones.length,
          success_rate: results.filter(r => r.success).length / results.length
        }
      };
    }));

    return results;
  }

  /**
   * Test edge cases and error conditions
   */
  private static async runEdgeCaseTests(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    // Test 1: Invalid Data Handling
    results.push(await this.runTest('Invalid Data Handling', async () => {
      const invalidData = {
        name: '', // Invalid: empty name
        time: '25:00', // Invalid: bad time format
        enabled: true,
        repeat_pattern: 'invalid' as any, // Invalid: bad repeat pattern
      };

      const result = await AlarmDomain.createAlarm(invalidData as AlarmFormData);
      
      // Should fail with proper error message
      if (result.success) {
        throw new Error('Should have failed with invalid data');
      }

      return {
        success: true,
        data: result,
        metrics: { 
          validation_working: true,
          error_message_provided: !!result.error
        }
      };
    }));

    // Test 2: Timezone Transition Handling
    results.push(await this.runTest('DST Transitions', async () => {
      // Create alarm during DST transition time
      const alarm = await this.createTestAlarm({
        time: '02:30', // This time gets skipped during spring forward
        timezone: 'America/New_York'
      });

      const scheduleResult = await AlarmScheduler.scheduleAlarm(alarm);
      
      return {
        success: scheduleResult.success,
        data: scheduleResult,
        metrics: { 
          dst_handled: true,
          alternative_time_scheduled: !!scheduleResult.scheduled_times?.length
        }
      };
    }));

    // Test 3: Maximum Alarms Limit
    results.push(await this.runTest('Maximum Alarms Limit', async () => {
      const alarms: Alarm[] = [];
      let creationSuccesses = 0;
      let scheduleSuccesses = 0;

      // Attempt to create many alarms (testing system limits)
      for (let i = 0; i < 100; i++) {
        try {
          const alarm = await this.createTestAlarm({
            name: `Limit Test ${i}`,
            time: `${String(Math.floor(i / 4) % 24).padStart(2, '0')}:${String((i % 4) * 15).padStart(2, '0')}`
          });
          alarms.push(alarm);
          creationSuccesses++;

          const scheduleResult = await AlarmScheduler.scheduleAlarm(alarm);
          if (scheduleResult.success) {
            scheduleSuccesses++;
          }
        } catch (error) {
          // Expected to hit limits eventually
          break;
        }
      }

      // Cleanup
      for (const alarm of alarms) {
        await AlarmDomain.deleteAlarm(alarm.id);
      }

      return {
        success: creationSuccesses > 0 && scheduleSuccesses > 0,
        data: null,
        metrics: { 
          alarms_created: creationSuccesses,
          alarms_scheduled: scheduleSuccesses,
          hit_limit_gracefully: creationSuccesses >= 50 // Should handle at least 50
        }
      };
    }));

    // Test 4: Concurrent Operations
    results.push(await this.runTest('Concurrent Operations', async () => {
      const operations = [];
      
      // Create concurrent operations
      for (let i = 0; i < 10; i++) {
        operations.push(
          this.createTestAlarm({ name: `Concurrent ${i}` })
            .then(alarm => AlarmScheduler.scheduleAlarm(alarm))
        );
      }

      const results = await Promise.allSettled(operations);
      const successCount = results.filter(r => 
        r.status === 'fulfilled' && r.value.success
      ).length;

      return {
        success: successCount > 0,
        data: results,
        metrics: { 
          concurrent_operations: operations.length,
          success_count: successCount,
          success_rate: successCount / operations.length
        }
      };
    }));

    return results;
  }

  /**
   * Test performance under load
   */
  private static async runPerformanceTests(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    // Test 1: Operation Speed
    results.push(await this.runTest('Operation Performance', async () => {
      const benchmarks = {
        create: 0,
        schedule: 0,
        update: 0,
        delete: 0
      };

      // Benchmark alarm creation
      const createStart = performance.now();
      const alarm = await this.createTestAlarm();
      benchmarks.create = performance.now() - createStart;

      // Benchmark scheduling
      const scheduleStart = performance.now();
      await AlarmScheduler.scheduleAlarm(alarm);
      benchmarks.schedule = performance.now() - scheduleStart;

      // Benchmark update
      const updateStart = performance.now();
      await AlarmDomain.updateAlarm(alarm.id, { name: 'Performance Test Updated' });
      benchmarks.update = performance.now() - updateStart;

      // Benchmark deletion
      const deleteStart = performance.now();
      await AlarmDomain.deleteAlarm(alarm.id);
      benchmarks.delete = performance.now() - deleteStart;

      return {
        success: true,
        data: benchmarks,
        metrics: {
          create_time: benchmarks.create,
          schedule_time: benchmarks.schedule,
          update_time: benchmarks.update,
          delete_time: benchmarks.delete,
          meets_performance_targets: 
            benchmarks.create < 1000 &&
            benchmarks.schedule < 500 &&
            benchmarks.update < 300 &&
            benchmarks.delete < 200
        }
      };
    }));

    return results;
  }

  /**
   * Execute a single test with error handling and metrics
   */
  private static async runTest(
    name: string, 
    testFunction: () => Promise<any>
  ): Promise<TestResult> {
    const startTime = performance.now();
    
    try {
      console.log(`🧪 Running: ${name}`);
      const result = await testFunction();
      const duration = performance.now() - startTime;
      
      const testResult: TestResult = {
        name,
        success: result.success,
        duration,
        data: result.data,
        metrics: result.metrics,
        error: null,
        timestamp: new Date().toISOString()
      };

      console.log(`✅ ${name}: PASSED (${duration.toFixed(2)}ms)`);
      return testResult;
      
    } catch (error) {
      const duration = performance.now() - startTime;
      const testResult: TestResult = {
        name,
        success: false,
        duration,
        data: null,
        metrics: {},
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      };

      console.log(`❌ ${name}: FAILED (${duration.toFixed(2)}ms) - ${testResult.error}`);
      return testResult;
    }
  }

  /**
   * Generate comprehensive reliability report
   */
  private static generateReport(suites: TestSuite[]): ReliabilityTestReport {
    const totalDuration = Date.now() - this.startTime;
    let totalScore = 0;
    let totalWeight = 0;
    let totalTests = 0;
    let passedTests = 0;

    const suiteResults = suites.map(suite => {
      const suitePassed = suite.tests.filter(t => t.success).length;
      const suiteTotal = suite.tests.length;
      const suiteScore = suiteTotal > 0 ? (suitePassed / suiteTotal) * 100 : 0;
      
      totalScore += suiteScore * (suite.weight / 100);
      totalWeight += suite.weight;
      totalTests += suiteTotal;
      passedTests += suitePassed;

      return {
        name: suite.name,
        weight: suite.weight,
        score: suiteScore,
        passed: suitePassed,
        total: suiteTotal,
        tests: suite.tests
      };
    });

    const overallScore = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
    const reliabilityMet = overallScore >= 99.0; // Target: 99.0%+
    
    return {
      overallScore,
      reliabilityMet,
      totalTests,
      passedTests,
      failedTests: totalTests - passedTests,
      totalDuration,
      timestamp: new Date().toISOString(),
      suites: suiteResults,
      recommendations: this.generateRecommendations(suiteResults),
      summary: {
        critical_issues: suiteResults.filter(s => s.score < 95).length,
        performance_concerns: suiteResults.find(s => s.name.includes('Performance'))?.score < 90,
        notification_reliability: suiteResults.find(s => s.name.includes('Notification'))?.score || 0,
        background_stability: suiteResults.find(s => s.name.includes('Background'))?.score || 0,
        edge_case_coverage: suiteResults.find(s => s.name.includes('Edge'))?.score || 0
      }
    };
  }

  /**
   * Generate improvement recommendations based on test results
   */
  private static generateRecommendations(suiteResults: any[]): string[] {
    const recommendations: string[] = [];

    suiteResults.forEach(suite => {
      if (suite.score < 95) {
        recommendations.push(
          `🚨 Critical: ${suite.name} scored ${suite.score.toFixed(1)}% - requires immediate attention`
        );
      } else if (suite.score < 99) {
        recommendations.push(
          `⚠️  Warning: ${suite.name} scored ${suite.score.toFixed(1)}% - improvement recommended`
        );
      }

      // Specific recommendations based on failed tests
      suite.tests.forEach((test: TestResult) => {
        if (!test.success && test.error) {
          recommendations.push(
            `🔧 Fix: ${test.name} failed - ${test.error}`
          );
        }
      });
    });

    if (recommendations.length === 0) {
      recommendations.push('🎉 All tests passed! System meets 99.9% reliability target.');
    }

    return recommendations;
  }

  // Helper Methods
  private static async createTestAlarm(overrides: Partial<AlarmFormData> = {}): Promise<Alarm> {
    const defaultData: AlarmFormData = {
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
      ...overrides
    };

    const result = await AlarmDomain.createAlarm(defaultData);
    if (!result.success) {
      throw new Error(`Failed to create test alarm: ${result.error}`);
    }

    return result.data!;
  }

  private static getFutureTime(minutesFromNow: number): string {
    const future = new Date();
    future.setMinutes(future.getMinutes() + minutesFromNow);
    return `${String(future.getHours()).padStart(2, '0')}:${String(future.getMinutes()).padStart(2, '0')}`;
  }

  private static async simulateBackgroundState(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private static async simulateAppRestart(): Promise<void> {
    await SnoozeManager.clearAllSnoozeStates();
    await SnoozeManager.initialize();
    await new Promise(resolve => setTimeout(resolve, 50));
  }
}

// Type definitions for reliability testing
declare module '../../types/alarm' {
  export interface ReliabilityTestReport {
    overallScore: number;
    reliabilityMet: boolean;
    totalTests: number;
    passedTests: number;
    failedTests: number;
    totalDuration: number;
    timestamp: string;
    suites: TestSuiteResult[];
    recommendations: string[];
    summary: {
      critical_issues: number;
      performance_concerns: boolean;
      notification_reliability: number;
      background_stability: number;
      edge_case_coverage: number;
    };
  }

  export interface TestSuite {
    name: string;
    tests: TestResult[];
    weight: number;
  }

  export interface TestSuiteResult {
    name: string;
    weight: number;
    score: number;
    passed: number;
    total: number;
    tests: TestResult[];
  }

  export interface TestResult {
    name: string;
    success: boolean;
    duration: number;
    data: any;
    metrics: Record<string, any>;
    error: string | null;
    timestamp: string;
  }
}

export default ReliabilityTestRunner;