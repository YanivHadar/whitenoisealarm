/**
 * Database Test Operations for Alarm & White Noise App
 * 
 * Comprehensive testing suite for database operations, real-time functionality,
 * and performance validation. Use this to verify Phase 1.2 completion.
 */

import {
  UserService,
  AlarmService,
  ActiveSessionService,
  UserPreferencesService,
  DatabaseHealthService,
} from '../../services/database';
import { supabase } from '../supabase/client';
import type { User, Alarm, ActiveSession, UserPreferences } from '../../types/database';

// Test results interface
interface TestResult {
  test: string;
  success: boolean;
  message: string;
  duration?: number;
  data?: any;
  error?: any;
}

interface TestSuite {
  suite: string;
  tests: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    duration: number;
  };
}

/**
 * Performance benchmark for database operations
 */
class PerformanceBenchmark {
  private startTime: number = 0;

  start() {
    this.startTime = performance.now();
  }

  end(): number {
    return performance.now() - this.startTime;
  }

  static async measureAsync<T>(operation: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const start = performance.now();
    const result = await operation();
    const duration = performance.now() - start;
    return { result, duration };
  }
}

/**
 * Test database health and connectivity
 */
export async function testDatabaseHealth(): Promise<TestSuite> {
  const tests: TestResult[] = [];
  const suiteStart = performance.now();

  // Test 1: Basic connectivity
  try {
    const benchmark = new PerformanceBenchmark();
    benchmark.start();
    
    const result = await DatabaseHealthService.healthCheck();
    const duration = benchmark.end();

    tests.push({
      test: 'Database Connectivity',
      success: result.success,
      message: result.success ? 'Database connection successful' : result.error?.message || 'Connection failed',
      duration,
      data: result.data,
    });
  } catch (error) {
    tests.push({
      test: 'Database Connectivity',
      success: false,
      message: 'Exception during connectivity test',
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Test 2: Performance metrics
  try {
    const benchmark = new PerformanceBenchmark();
    benchmark.start();
    
    const result = await DatabaseHealthService.getMetrics();
    const duration = benchmark.end();

    tests.push({
      test: 'Performance Metrics',
      success: result.success,
      message: result.success ? `Response time: ${result.data?.responseTime}ms` : 'Metrics collection failed',
      duration,
      data: result.data,
    });
  } catch (error) {
    tests.push({
      test: 'Performance Metrics',
      success: false,
      message: 'Exception during metrics test',
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Test 3: Authentication check
  try {
    const benchmark = new PerformanceBenchmark();
    benchmark.start();
    
    const session = await supabase.auth.getSession();
    const duration = benchmark.end();

    tests.push({
      test: 'Authentication System',
      success: !session.error,
      message: session.error ? session.error.message : 'Auth system accessible',
      duration,
    });
  } catch (error) {
    tests.push({
      test: 'Authentication System',
      success: false,
      message: 'Exception during auth test',
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const suiteDuration = performance.now() - suiteStart;
  const passed = tests.filter(t => t.success).length;

  return {
    suite: 'Database Health',
    tests,
    summary: {
      total: tests.length,
      passed,
      failed: tests.length - passed,
      duration: suiteDuration,
    },
  };
}

/**
 * Test user operations (CRUD)
 */
export async function testUserOperations(): Promise<TestSuite> {
  const tests: TestResult[] = [];
  const suiteStart = performance.now();
  let testUser: User | null = null;

  // Generate test user data
  const testUserId = '12345678-1234-1234-1234-123456789012'; // Mock UUID for testing
  const testUserData = {
    id: testUserId,
    email: `test-${Date.now()}@example.com`,
    full_name: 'Test User',
    timezone: 'America/New_York',
  };

  // Test 1: Create user
  try {
    const { result, duration } = await PerformanceBenchmark.measureAsync(async () => {
      return UserService.create(testUserData);
    });

    tests.push({
      test: 'User Creation',
      success: result.success,
      message: result.success ? 'User created successfully' : result.error?.message || 'Creation failed',
      duration,
      data: result.data,
    });

    if (result.success) {
      testUser = result.data;
    }
  } catch (error) {
    tests.push({
      test: 'User Creation',
      success: false,
      message: 'Exception during user creation',
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Test 2: Get user by ID
  if (testUser) {
    try {
      const { result, duration } = await PerformanceBenchmark.measureAsync(async () => {
        return UserService.getById(testUser!.id);
      });

      tests.push({
        test: 'User Retrieval',
        success: result.success,
        message: result.success ? 'User retrieved successfully' : result.error?.message || 'Retrieval failed',
        duration,
        data: result.data,
      });
    } catch (error) {
      tests.push({
        test: 'User Retrieval',
        success: false,
        message: 'Exception during user retrieval',
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Test 3: Update user
    try {
      const { result, duration } = await PerformanceBenchmark.measureAsync(async () => {
        return UserService.update(testUser!.id, {
          full_name: 'Updated Test User',
          is_premium: true,
        });
      });

      tests.push({
        test: 'User Update',
        success: result.success,
        message: result.success ? 'User updated successfully' : result.error?.message || 'Update failed',
        duration,
        data: result.data,
      });
    } catch (error) {
      tests.push({
        test: 'User Update',
        success: false,
        message: 'Exception during user update',
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Test 4: Update last seen
    try {
      const { result, duration } = await PerformanceBenchmark.measureAsync(async () => {
        return UserService.updateLastSeen(testUser!.id);
      });

      tests.push({
        test: 'Last Seen Update',
        success: result.success,
        message: result.success ? 'Last seen updated successfully' : result.error?.message || 'Update failed',
        duration,
        data: result.data,
      });
    } catch (error) {
      tests.push({
        test: 'Last Seen Update',
        success: false,
        message: 'Exception during last seen update',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const suiteDuration = performance.now() - suiteStart;
  const passed = tests.filter(t => t.success).length;

  return {
    suite: 'User Operations',
    tests,
    summary: {
      total: tests.length,
      passed,
      failed: tests.length - passed,
      duration: suiteDuration,
    },
  };
}

/**
 * Test alarm operations with performance benchmarks
 */
export async function testAlarmOperations(): Promise<TestSuite> {
  const tests: TestResult[] = [];
  const suiteStart = performance.now();
  let testAlarm: Alarm | null = null;

  const testUserId = '12345678-1234-1234-1234-123456789012';
  const testAlarmData = {
    user_id: testUserId,
    name: 'Test Alarm',
    time: '07:00',
    enabled: true,
    repeat_pattern: 'daily' as const,
    volume: 0.8,
    white_noise_enabled: true,
    white_noise_category: 'nature' as const,
    white_noise_volume: 0.5,
  };

  // Test 1: Create alarm
  try {
    const { result, duration } = await PerformanceBenchmark.measureAsync(async () => {
      return AlarmService.create(testAlarmData);
    });

    tests.push({
      test: 'Alarm Creation',
      success: result.success,
      message: result.success ? 'Alarm created successfully' : result.error?.message || 'Creation failed',
      duration,
      data: result.data,
    });

    if (result.success) {
      testAlarm = result.data;
    }
  } catch (error) {
    tests.push({
      test: 'Alarm Creation',
      success: false,
      message: 'Exception during alarm creation',
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Test 2: Get alarms by user
  try {
    const { result, duration } = await PerformanceBenchmark.measureAsync(async () => {
      return AlarmService.getByUser(testUserId);
    });

    tests.push({
      test: 'Alarm Retrieval by User',
      success: result.success,
      message: result.success ? `Retrieved ${result.data?.length || 0} alarms` : result.error?.message || 'Retrieval failed',
      duration,
      data: result.pagination,
    });
  } catch (error) {
    tests.push({
      test: 'Alarm Retrieval by User',
      success: false,
      message: 'Exception during alarm retrieval',
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Test 3: Get active alarms
  try {
    const { result, duration } = await PerformanceBenchmark.measureAsync(async () => {
      return AlarmService.getActiveByUser(testUserId);
    });

    tests.push({
      test: 'Active Alarms Retrieval',
      success: result.success,
      message: result.success ? `Retrieved ${result.data?.length || 0} active alarms` : result.error?.message || 'Retrieval failed',
      duration,
      data: result.data,
    });
  } catch (error) {
    tests.push({
      test: 'Active Alarms Retrieval',
      success: false,
      message: 'Exception during active alarms retrieval',
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Test 4: Update alarm
  if (testAlarm) {
    try {
      const { result, duration } = await PerformanceBenchmark.measureAsync(async () => {
        return AlarmService.update(testAlarm!.id, {
          name: 'Updated Test Alarm',
          volume: 0.9,
          enabled: false,
        });
      });

      tests.push({
        test: 'Alarm Update',
        success: result.success,
        message: result.success ? 'Alarm updated successfully' : result.error?.message || 'Update failed',
        duration,
        data: result.data,
      });
    } catch (error) {
      tests.push({
        test: 'Alarm Update',
        success: false,
        message: 'Exception during alarm update',
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Test 5: Toggle alarm
    try {
      const { result, duration } = await PerformanceBenchmark.measureAsync(async () => {
        return AlarmService.toggle(testAlarm!.id, true);
      });

      tests.push({
        test: 'Alarm Toggle',
        success: result.success,
        message: result.success ? 'Alarm toggled successfully' : result.error?.message || 'Toggle failed',
        duration,
        data: result.data,
      });
    } catch (error) {
      tests.push({
        test: 'Alarm Toggle',
        success: false,
        message: 'Exception during alarm toggle',
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Test 6: Delete alarm
    try {
      const { result, duration } = await PerformanceBenchmark.measureAsync(async () => {
        return AlarmService.delete(testAlarm!.id);
      });

      tests.push({
        test: 'Alarm Deletion',
        success: result.success,
        message: result.success ? 'Alarm deleted successfully' : result.error?.message || 'Deletion failed',
        duration,
        data: result.data,
      });
    } catch (error) {
      tests.push({
        test: 'Alarm Deletion',
        success: false,
        message: 'Exception during alarm deletion',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const suiteDuration = performance.now() - suiteStart;
  const passed = tests.filter(t => t.success).length;

  return {
    suite: 'Alarm Operations',
    tests,
    summary: {
      total: tests.length,
      passed,
      failed: tests.length - passed,
      duration: suiteDuration,
    },
  };
}

/**
 * Test real-time functionality
 */
export async function testRealtimeSubscriptions(): Promise<TestSuite> {
  const tests: TestResult[] = [];
  const suiteStart = performance.now();

  const testUserId = '12345678-1234-1234-1234-123456789012';

  // Test 1: Alarm subscription
  try {
    const benchmark = new PerformanceBenchmark();
    benchmark.start();

    let subscriptionWorks = false;
    let subscriptionError: any = null;

    const channel = AlarmService.subscribeToUserAlarms(testUserId, (payload) => {
      console.log('Real-time alarm update received:', payload);
      subscriptionWorks = true;
    });

    // Wait a moment to establish connection
    await new Promise(resolve => setTimeout(resolve, 1000));

    const duration = benchmark.end();

    // Check if channel is subscribed
    const isSubscribed = channel.state === 'joined';

    await channel.unsubscribe();

    tests.push({
      test: 'Alarm Real-time Subscription',
      success: isSubscribed,
      message: isSubscribed ? 'Subscription established successfully' : 'Failed to establish subscription',
      duration,
      data: { channel_state: channel.state },
    });
  } catch (error) {
    tests.push({
      test: 'Alarm Real-time Subscription',
      success: false,
      message: 'Exception during subscription test',
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Test 2: Session subscription
  try {
    const benchmark = new PerformanceBenchmark();
    benchmark.start();

    const channel = ActiveSessionService.subscribeToUserSessions(testUserId, (payload) => {
      console.log('Real-time session update received:', payload);
    });

    // Wait a moment to establish connection
    await new Promise(resolve => setTimeout(resolve, 1000));

    const duration = benchmark.end();
    const isSubscribed = channel.state === 'joined';

    await channel.unsubscribe();

    tests.push({
      test: 'Session Real-time Subscription',
      success: isSubscribed,
      message: isSubscribed ? 'Session subscription established successfully' : 'Failed to establish session subscription',
      duration,
      data: { channel_state: channel.state },
    });
  } catch (error) {
    tests.push({
      test: 'Session Real-time Subscription',
      success: false,
      message: 'Exception during session subscription test',
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const suiteDuration = performance.now() - suiteStart;
  const passed = tests.filter(t => t.success).length;

  return {
    suite: 'Real-time Subscriptions',
    tests,
    summary: {
      total: tests.length,
      passed,
      failed: tests.length - passed,
      duration: suiteDuration,
    },
  };
}

/**
 * Performance benchmark tests
 */
export async function testPerformanceBenchmarks(): Promise<TestSuite> {
  const tests: TestResult[] = [];
  const suiteStart = performance.now();

  const testUserId = '12345678-1234-1234-1234-123456789012';

  // Test 1: Query performance (should be < 50ms as per requirements)
  try {
    const iterations = 10;
    const durations: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const { duration } = await PerformanceBenchmark.measureAsync(async () => {
        return AlarmService.getByUser(testUserId, { page: 1, limit: 20 });
      });
      durations.push(duration);
    }

    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / iterations;
    const maxDuration = Math.max(...durations);
    const minDuration = Math.min(...durations);

    const performanceTarget = 50; // ms
    const success = avgDuration < performanceTarget;

    tests.push({
      test: 'Query Performance (<50ms)',
      success,
      message: success ? 
        `Average: ${avgDuration.toFixed(2)}ms (Target: <${performanceTarget}ms)` :
        `Average: ${avgDuration.toFixed(2)}ms exceeds target of ${performanceTarget}ms`,
      duration: avgDuration,
      data: {
        average: avgDuration,
        min: minDuration,
        max: maxDuration,
        target: performanceTarget,
        iterations,
      },
    });
  } catch (error) {
    tests.push({
      test: 'Query Performance (<50ms)',
      success: false,
      message: 'Exception during performance test',
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Test 2: Concurrent operations
  try {
    const benchmark = new PerformanceBenchmark();
    benchmark.start();

    const promises = [
      UserService.getById(testUserId),
      AlarmService.getByUser(testUserId),
      ActiveSessionService.getActiveByUser(testUserId),
      UserPreferencesService.getByUser(testUserId),
    ];

    const results = await Promise.all(promises);
    const duration = benchmark.end();

    const successfulOperations = results.filter(r => r.success).length;
    const success = successfulOperations === promises.length;

    tests.push({
      test: 'Concurrent Operations',
      success,
      message: success ? 
        `All ${promises.length} concurrent operations completed successfully` :
        `${successfulOperations}/${promises.length} operations succeeded`,
      duration,
      data: {
        total: promises.length,
        successful: successfulOperations,
        results: results.map(r => ({ success: r.success, error: r.error?.code })),
      },
    });
  } catch (error) {
    tests.push({
      test: 'Concurrent Operations',
      success: false,
      message: 'Exception during concurrent operations test',
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const suiteDuration = performance.now() - suiteStart;
  const passed = tests.filter(t => t.success).length;

  return {
    suite: 'Performance Benchmarks',
    tests,
    summary: {
      total: tests.length,
      passed,
      failed: tests.length - passed,
      duration: suiteDuration,
    },
  };
}

/**
 * Run all database tests
 */
export async function runAllDatabaseTests(): Promise<{
  overall: {
    total: number;
    passed: number;
    failed: number;
    duration: number;
  };
  suites: TestSuite[];
}> {
  const overallStart = performance.now();
  
  console.log('🧪 Starting comprehensive database tests...\n');

  const suites: TestSuite[] = [];

  try {
    // Run test suites
    suites.push(await testDatabaseHealth());
    suites.push(await testUserOperations());
    suites.push(await testAlarmOperations());
    suites.push(await testRealtimeSubscriptions());
    suites.push(await testPerformanceBenchmarks());

    const overallDuration = performance.now() - overallStart;

    // Calculate overall summary
    const overall = {
      total: suites.reduce((sum, suite) => sum + suite.summary.total, 0),
      passed: suites.reduce((sum, suite) => sum + suite.summary.passed, 0),
      failed: suites.reduce((sum, suite) => sum + suite.summary.failed, 0),
      duration: overallDuration,
    };

    // Print results
    console.log('\n📊 Test Results Summary:');
    console.log('=' .repeat(50));
    
    suites.forEach(suite => {
      const { total, passed, failed, duration } = suite.summary;
      const successRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';
      const status = failed === 0 ? '✅' : '❌';
      
      console.log(`${status} ${suite.suite}: ${passed}/${total} (${successRate}%) - ${duration.toFixed(2)}ms`);
      
      if (failed > 0) {
        suite.tests.filter(t => !t.success).forEach(test => {
          console.log(`   ❌ ${test.test}: ${test.message}`);
        });
      }
    });

    console.log('=' .repeat(50));
    console.log(`📈 Overall: ${overall.passed}/${overall.total} tests passed (${((overall.passed / overall.total) * 100).toFixed(1)}%)`);
    console.log(`⏱️ Total Duration: ${overall.duration.toFixed(2)}ms`);
    
    if (overall.failed === 0) {
      console.log('🎉 All tests passed! Database is ready for production.');
    } else {
      console.log(`⚠️  ${overall.failed} test(s) failed. Please review and fix issues.`);
    }

    return { overall, suites };
  } catch (error) {
    console.error('💥 Test suite execution failed:', error);
    throw error;
  }
}

/**
 * Quick validation test for Phase 1.2 completion
 */
export async function validatePhase1_2(): Promise<boolean> {
  console.log('🔍 Validating Phase 1.2: Supabase Backend Foundation...\n');

  const requiredTests = [
    'Database Connectivity',
    'User Creation',
    'Alarm Creation',
    'Query Performance (<50ms)',
    'Alarm Real-time Subscription',
  ];

  try {
    const { suites } = await runAllDatabaseTests();
    
    const allTests = suites.flatMap(suite => suite.tests);
    const criticalTests = allTests.filter(test => 
      requiredTests.some(required => test.test.includes(required))
    );

    const criticalPassed = criticalTests.filter(test => test.success).length;
    const success = criticalPassed === requiredTests.length;

    console.log('\n🎯 Phase 1.2 Validation:');
    console.log('=' .repeat(50));
    requiredTests.forEach(requiredTest => {
      const test = criticalTests.find(t => t.test.includes(requiredTest));
      const status = test?.success ? '✅' : '❌';
      console.log(`${status} ${requiredTest}: ${test?.message || 'Not found'}`);
    });

    console.log('=' .repeat(50));
    if (success) {
      console.log('✅ Phase 1.2: Supabase Backend Foundation - COMPLETED');
      console.log('✨ Ready to proceed to Phase 2: Core Sleep System');
    } else {
      console.log('❌ Phase 1.2: Supabase Backend Foundation - INCOMPLETE');
      console.log(`⚠️  ${requiredTests.length - criticalPassed}/${requiredTests.length} critical requirements not met`);
    }

    return success;
  } catch (error) {
    console.error('💥 Phase 1.2 validation failed:', error);
    return false;
  }
}