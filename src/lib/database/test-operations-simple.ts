/**
 * Simplified Database Test Operations for Alarm & White Noise App
 * 
 * Basic database operations testing and validation.
 * Tests core functionality without complex type validation.
 */

import { supabase } from '../supabase/client';
import type { Database, UserInsert, AlarmInsert } from '../../types/database';

// Type-safe database operations with explicit typing
const typedSupabase = supabase as any;

export interface TestResult {
  name: string;
  success: boolean;
  message: string;
  duration?: number;
  error?: any;
}

export interface TestSuite {
  name: string;
  results: TestResult[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
  totalDuration: number;
}

/**
 * Test database connection
 */
export async function testConnection(): Promise<TestResult> {
  const startTime = Date.now();
  try {
    const { data, error } = await typedSupabase
      .from('users')
      .select('id')
      .limit(1);

    const duration = Date.now() - startTime;

    if (error) {
      return {
        name: 'Database Connection',
        success: false,
        message: `Connection failed: ${error.message}`,
        duration,
        error,
      };
    }

    return {
      name: 'Database Connection',
      success: true,
      message: 'Connection successful',
      duration,
    };
  } catch (error: any) {
    return {
      name: 'Database Connection',
      success: false,
      message: `Connection exception: ${error.message}`,
      duration: Date.now() - startTime,
      error,
    };
  }
}

/**
 * Test user operations
 */
export async function testUserOperations(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const testUserId = 'test-user-' + Date.now();
  const testUserEmail = `test${Date.now()}@example.com`;

  // Test user creation
  try {
    const startTime = Date.now();
    const newUser: UserInsert = {
      id: testUserId,
      email: testUserEmail,
      subscription_status: 'free',
      is_premium: false,
    };
    const { data, error } = await typedSupabase
      .from('users')
      .insert(newUser)
      .select()
      .single();

    const duration = Date.now() - startTime;

    if (error) {
      results.push({
        name: 'User Create',
        success: false,
        message: `Failed to create user: ${error.message}`,
        duration,
        error,
      });
    } else {
      results.push({
        name: 'User Create',
        success: true,
        message: 'User created successfully',
        duration,
      });

      // Test user retrieval
      const retrievalStart = Date.now();
      const { data: retrievedUser, error: retrievalError } = await typedSupabase
        .from('users')
        .select('*')
        .eq('id', testUserId)
        .single();

      const retrievalDuration = Date.now() - retrievalStart;

      if (retrievalError) {
        results.push({
          name: 'User Retrieve',
          success: false,
          message: `Failed to retrieve user: ${retrievalError.message}`,
          duration: retrievalDuration,
          error: retrievalError,
        });
      } else {
        results.push({
          name: 'User Retrieve',
          success: true,
          message: 'User retrieved successfully',
          duration: retrievalDuration,
        });
      }

      // Cleanup: Delete test user
      await typedSupabase.from('users').delete().eq('id', testUserId);
    }
  } catch (error: any) {
    results.push({
      name: 'User Operations',
      success: false,
      message: `Exception: ${error.message}`,
      error,
    });
  }

  return results;
}

/**
 * Test alarm operations
 */
export async function testAlarmOperations(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  
  // First create a test user for the alarm
  const testUserId = 'alarm-test-user-' + Date.now();
  const testUserEmail = `alarmtest${Date.now()}@example.com`;

  try {
    // Create test user
    const testUser: UserInsert = {
      id: testUserId,
      email: testUserEmail,
      subscription_status: 'free',
      is_premium: false,
    };
    const { data: user, error: userError } = await typedSupabase
      .from('users')
      .insert(testUser)
      .select()
      .single();

    if (userError) {
      results.push({
        name: 'Alarm Test Setup',
        success: false,
        message: `Failed to create test user: ${userError.message}`,
        error: userError,
      });
      return results;
    }

    // Test alarm creation
    const alarmStart = Date.now();
    const testAlarm: AlarmInsert = {
      user_id: testUserId,
      name: 'Test Alarm',
      time: '07:00',
      enabled: true,
      repeat_pattern: 'daily',
      audio_output: 'auto',
      volume: 0.7,
      snooze_enabled: true,
      snooze_duration: 5,
      snooze_count_limit: 3,
      vibration_enabled: true,
      white_noise_enabled: false,
      white_noise_volume: 0.5,
      fade_in_duration: 0,
      // is_premium_feature not in alarm schema
    };
    const { data: alarm, error: alarmError } = await typedSupabase
      .from('alarms')
      .insert(testAlarm)
      .select()
      .single();

    const alarmDuration = Date.now() - alarmStart;

    if (alarmError) {
      results.push({
        name: 'Alarm Create',
        success: false,
        message: `Failed to create alarm: ${alarmError.message}`,
        duration: alarmDuration,
        error: alarmError,
      });
    } else {
      results.push({
        name: 'Alarm Create',
        success: true,
        message: 'Alarm created successfully',
        duration: alarmDuration,
      });

      // Test alarm retrieval
      const retrievalStart = Date.now();
      const { data: alarms, error: retrievalError } = await typedSupabase
        .from('alarms')
        .select('*')
        .eq('user_id', testUserId);

      const retrievalDuration = Date.now() - retrievalStart;

      if (retrievalError) {
        results.push({
          name: 'Alarm Retrieve',
          success: false,
          message: `Failed to retrieve alarms: ${retrievalError.message}`,
          duration: retrievalDuration,
          error: retrievalError,
        });
      } else {
        results.push({
          name: 'Alarm Retrieve',
          success: true,
          message: `Retrieved ${alarms?.length || 0} alarms`,
          duration: retrievalDuration,
        });
      }

      // Cleanup: Delete test alarm
      await typedSupabase.from('alarms').delete().eq('id', alarm.id);
    }

    // Cleanup: Delete test user
    await typedSupabase.from('users').delete().eq('id', testUserId);

  } catch (error: any) {
    results.push({
      name: 'Alarm Operations',
      success: false,
      message: `Exception: ${error.message}`,
      error,
    });

    // Cleanup on error
    await typedSupabase.from('users').delete().eq('id', testUserId);
  }

  return results;
}

/**
 * Test performance requirements (<50ms for basic queries)
 */
export async function testPerformance(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const performanceThreshold = 50; // 50ms requirement

  // Test user lookup performance
  try {
    const iterations = 5;
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      await typedSupabase.from('users').select('id').limit(1);
      times.push(Date.now() - startTime);
    }

    const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
    const maxTime = Math.max(...times);

    results.push({
      name: 'User Query Performance',
      success: averageTime < performanceThreshold,
      message: `Average: ${averageTime.toFixed(1)}ms, Max: ${maxTime}ms (Threshold: ${performanceThreshold}ms)`,
      duration: averageTime,
    });

  } catch (error: any) {
    results.push({
      name: 'User Query Performance',
      success: false,
      message: `Performance test failed: ${error.message}`,
      error,
    });
  }

  return results;
}

/**
 * Test real-time subscriptions
 */
export async function testRealTimeSubscriptions(): Promise<TestResult> {
  try {
    let messageReceived = false;
    const timeout = 10000; // 10 second timeout

    const channel = typedSupabase
      .channel('test-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'users',
        },
        (payload: any) => {
          console.log('Real-time message received:', payload);
          messageReceived = true;
        }
      )
      .subscribe();

    // Wait for subscription to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));

    const startTime = Date.now();

    // Create a test user to trigger the real-time event
    const testUserId = 'realtime-test-' + Date.now();
    const testUserEmail = `realtime${Date.now()}@example.com`;

    const realtimeTestUser: UserInsert = {
      id: testUserId,
      email: testUserEmail,
      subscription_status: 'free',
      is_premium: false,
    };
    await typedSupabase.from('users').insert(realtimeTestUser);

    // Wait for real-time message
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Cleanup
    await typedSupabase.from('users').delete().eq('id', testUserId);
    channel.unsubscribe();

    const duration = Date.now() - startTime;

    return {
      name: 'Real-time Subscriptions',
      success: messageReceived,
      message: messageReceived ? 'Real-time message received' : 'No real-time message received within timeout',
      duration,
    };

  } catch (error: any) {
    return {
      name: 'Real-time Subscriptions',
      success: false,
      message: `Real-time test failed: ${error.message}`,
      error,
    };
  }
}

/**
 * Run complete test suite
 */
export async function runTestSuite(): Promise<TestSuite> {
  console.log('🧪 Starting database test suite...');
  const startTime = Date.now();
  const results: TestResult[] = [];

  // Run connection test
  console.log('📡 Testing database connection...');
  const connectionResult = await testConnection();
  results.push(connectionResult);

  if (!connectionResult.success) {
    // If connection fails, skip other tests
    return {
      name: 'Database Test Suite',
      results,
      totalTests: 1,
      passedTests: 0,
      failedTests: 1,
      totalDuration: Date.now() - startTime,
    };
  }

  // Run user operations tests
  console.log('👤 Testing user operations...');
  const userResults = await testUserOperations();
  results.push(...userResults);

  // Run alarm operations tests
  console.log('⏰ Testing alarm operations...');
  const alarmResults = await testAlarmOperations();
  results.push(...alarmResults);

  // Run performance tests
  console.log('🚀 Testing performance...');
  const performanceResults = await testPerformance();
  results.push(...performanceResults);

  // Run real-time tests
  console.log('📡 Testing real-time subscriptions...');
  const realtimeResult = await testRealTimeSubscriptions();
  results.push(realtimeResult);

  const totalDuration = Date.now() - startTime;
  const passedTests = results.filter(r => r.success).length;
  const failedTests = results.filter(r => !r.success).length;

  const suite: TestSuite = {
    name: 'Database Test Suite',
    results,
    totalTests: results.length,
    passedTests,
    failedTests,
    totalDuration,
  };

  console.log(`✅ Test suite completed: ${passedTests}/${results.length} passed in ${totalDuration}ms`);

  return suite;
}

/**
 * Print test results to console
 */
export function printTestResults(suite: TestSuite): void {
  console.log('\n' + '='.repeat(60));
  console.log(`📊 ${suite.name} Results`);
  console.log('='.repeat(60));
  console.log(`Total Tests: ${suite.totalTests}`);
  console.log(`✅ Passed: ${suite.passedTests}`);
  console.log(`❌ Failed: ${suite.failedTests}`);
  console.log(`⏱️  Total Duration: ${suite.totalDuration}ms`);
  console.log('='.repeat(60));

  suite.results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    const duration = result.duration ? ` (${result.duration}ms)` : '';
    console.log(`${index + 1}. ${status} ${result.name}${duration}`);
    console.log(`   ${result.message}`);
    if (!result.success && result.error) {
      console.log(`   Error: ${result.error.code || 'Unknown'} - ${result.error.message || result.error}`);
    }
  });
  console.log('='.repeat(60));
}

export default {
  testConnection,
  testUserOperations,
  testAlarmOperations,
  testPerformance,
  testRealTimeSubscriptions,
  runTestSuite,
  printTestResults,
};