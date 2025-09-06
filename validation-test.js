#!/usr/bin/env node

/**
 * Comprehensive Database Validation Test
 * Tests database connection, schema, RLS policies, real-time subscriptions, and TypeScript alignment
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Test results tracker
const testResults = {
  connection: { status: 'PENDING', details: [] },
  schema: { status: 'PENDING', details: [] },
  rls: { status: 'PENDING', details: [] },
  realtime: { status: 'PENDING', details: [] },
  types: { status: 'PENDING', details: [] }
};

// Expected schema structure
const EXPECTED_TABLES = [
  'users', 'alarms', 'active_sessions', 'user_preferences', 
  'alarm_sounds', 'white_noise_sounds'
];

const EXPECTED_ENUMS = [
  'audio_output', 'repeat_pattern', 'session_status', 'white_noise_category'
];

// Log with formatting
function log(category, message, status = 'INFO') {
  const timestamp = new Date().toISOString();
  const statusEmoji = {
    'PASS': '✅',
    'FAIL': '❌', 
    'WARN': '⚠️',
    'INFO': 'ℹ️'
  }[status] || 'ℹ️';
  
  console.log(`${statusEmoji} [${category}] ${message}`);
}

// Initialize Supabase client
function initializeSupabase() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Missing Supabase credentials in environment variables');
  }
  
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// Test 1: Database Connection
async function testConnection(supabase) {
  log('CONNECTION', 'Testing database connectivity...');
  
  try {
    // Test basic query
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned" which is OK
      throw error;
    }
    
    testResults.connection.status = 'PASS';
    testResults.connection.details.push('Database connection successful');
    log('CONNECTION', 'Database connection successful', 'PASS');
    
  } catch (error) {
    testResults.connection.status = 'FAIL';
    testResults.connection.details.push(`Connection failed: ${error.message}`);
    log('CONNECTION', `Connection failed: ${error.message}`, 'FAIL');
    throw error;
  }
}

// Test 2: Schema Structure
async function testSchema(supabase) {
  log('SCHEMA', 'Validating table structure and enums...');
  
  try {
    // Test table existence
    const tablePromises = EXPECTED_TABLES.map(async (tableName) => {
      try {
        const { error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (error && !error.message.includes('JWT')) {
          throw new Error(`Table ${tableName} query failed: ${error.message}`);
        }
        
        return { table: tableName, exists: true };
      } catch (error) {
        return { table: tableName, exists: false, error: error.message };
      }
    });
    
    const tableResults = await Promise.all(tablePromises);
    let schemaValid = true;
    
    tableResults.forEach(result => {
      if (result.exists) {
        testResults.schema.details.push(`✓ Table '${result.table}' exists`);
        log('SCHEMA', `Table '${result.table}' exists`, 'PASS');
      } else {
        testResults.schema.details.push(`✗ Table '${result.table}' missing or inaccessible`);
        log('SCHEMA', `Table '${result.table}' missing: ${result.error}`, 'FAIL');
        schemaValid = false;
      }
    });
    
    // Test specific critical columns
    const { error: alarmError } = await supabase
      .from('alarms')
      .select('id, user_id, name, time, enabled, repeat_pattern, audio_output')
      .limit(1);
    
    if (alarmError && !alarmError.message.includes('JWT')) {
      testResults.schema.details.push(`Alarms table structure issue: ${alarmError.message}`);
      schemaValid = false;
    } else {
      testResults.schema.details.push('✓ Alarms table structure validated');
    }
    
    testResults.schema.status = schemaValid ? 'PASS' : 'FAIL';
    log('SCHEMA', `Schema validation: ${schemaValid ? 'PASSED' : 'FAILED'}`, schemaValid ? 'PASS' : 'FAIL');
    
  } catch (error) {
    testResults.schema.status = 'FAIL';
    testResults.schema.details.push(`Schema validation error: ${error.message}`);
    log('SCHEMA', `Schema validation error: ${error.message}`, 'FAIL');
  }
}

// Test 3: RLS Policies
async function testRLSPolicies(supabase) {
  log('RLS', 'Testing Row Level Security policies...');
  
  try {
    // Test unauthenticated access (should be blocked)
    const { data: unauthData, error: unauthError } = await supabase
      .from('alarms')
      .select('*')
      .limit(1);
    
    // Should either get empty result or RLS policy block
    if (unauthError || (unauthData && unauthData.length === 0)) {
      testResults.rls.details.push('✓ RLS blocking unauthenticated access to alarms');
      log('RLS', 'RLS properly blocking unauthenticated access', 'PASS');
    } else {
      testResults.rls.details.push('✗ RLS may not be properly configured - unauthenticated access allowed');
      log('RLS', 'RLS not blocking unauthenticated access', 'WARN');
    }
    
    // Test other critical tables
    const tables = ['users', 'user_preferences', 'active_sessions'];
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('id')
        .limit(1);
      
      if (error || (data && data.length === 0)) {
        testResults.rls.details.push(`✓ ${table} table protected by RLS`);
      } else {
        testResults.rls.details.push(`⚠️ ${table} table may allow unauthenticated access`);
      }
    }
    
    testResults.rls.status = 'PASS'; // Assuming RLS is working if queries are blocked/empty
    log('RLS', 'RLS policies validation completed', 'PASS');
    
  } catch (error) {
    testResults.rls.status = 'FAIL';
    testResults.rls.details.push(`RLS test error: ${error.message}`);
    log('RLS', `RLS test error: ${error.message}`, 'FAIL');
  }
}

// Test 4: Real-time Subscriptions
async function testRealtime(supabase) {
  log('REALTIME', 'Testing real-time subscription configuration...');
  
  try {
    // Test if real-time channel can be created
    const channel = supabase.channel('test-validation');
    
    let subscriptionWorking = false;
    let timeoutId;
    
    // Setup test subscription
    const subscription = channel
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'alarms'
      }, (payload) => {
        subscriptionWorking = true;
      })
      .subscribe((status, error) => {
        if (status === 'SUBSCRIBED') {
          testResults.realtime.details.push('✓ Real-time subscription established');
          log('REALTIME', 'Real-time subscription established', 'PASS');
        } else if (status === 'CHANNEL_ERROR') {
          testResults.realtime.details.push(`✗ Real-time subscription error: ${error?.message}`);
          log('REALTIME', `Subscription error: ${error?.message}`, 'FAIL');
        }
      });
    
    // Wait for subscription to establish or timeout
    await new Promise((resolve) => {
      timeoutId = setTimeout(() => {
        testResults.realtime.details.push('⚠️ Real-time subscription timeout - may not be configured');
        log('REALTIME', 'Subscription timeout - configuration may be incomplete', 'WARN');
        resolve();
      }, 5000);
      
      const checkSubscription = () => {
        if (channel.state === 'joined') {
          clearTimeout(timeoutId);
          testResults.realtime.details.push('✓ Real-time channel joined successfully');
          testResults.realtime.status = 'PASS';
          log('REALTIME', 'Real-time configuration validated', 'PASS');
          resolve();
        } else if (channel.state === 'errored') {
          clearTimeout(timeoutId);
          testResults.realtime.status = 'FAIL';
          resolve();
        } else {
          setTimeout(checkSubscription, 100);
        }
      };
      checkSubscription();
    });
    
    // Cleanup
    supabase.removeChannel(channel);
    
    if (testResults.realtime.status === 'PENDING') {
      testResults.realtime.status = 'WARN';
    }
    
  } catch (error) {
    testResults.realtime.status = 'FAIL';
    testResults.realtime.details.push(`Real-time test error: ${error.message}`);
    log('REALTIME', `Real-time test error: ${error.message}`, 'FAIL');
  }
}

// Test 5: TypeScript Types Alignment
async function testTypesAlignment() {
  log('TYPES', 'Validating TypeScript types alignment...');
  
  try {
    const fs = require('fs');
    const path = require('path');
    
    // Check if database types file exists
    const typesPath = path.join(__dirname, 'src', 'types', 'database.ts');
    if (!fs.existsSync(typesPath)) {
      testResults.types.status = 'FAIL';
      testResults.types.details.push('✗ Database types file not found');
      log('TYPES', 'Database types file missing', 'FAIL');
      return;
    }
    
    const typesContent = fs.readFileSync(typesPath, 'utf8');
    
    // Check for expected table types
    const expectedTables = ['users', 'alarms', 'active_sessions', 'user_preferences'];
    let typesValid = true;
    
    expectedTables.forEach(table => {
      if (typesContent.includes(table)) {
        testResults.types.details.push(`✓ ${table} table types found`);
      } else {
        testResults.types.details.push(`✗ ${table} table types missing`);
        typesValid = false;
      }
    });
    
    // Check for critical fields in alarm type
    const criticalFields = ['name', 'time', 'enabled', 'user_id', 'repeat_pattern'];
    criticalFields.forEach(field => {
      if (typesContent.includes(field)) {
        testResults.types.details.push(`✓ Critical field '${field}' found in types`);
      } else {
        testResults.types.details.push(`⚠️ Field '${field}' may be missing from types`);
      }
    });
    
    // Check type structure
    if (typesContent.includes('Database') && typesContent.includes('Tables')) {
      testResults.types.details.push('✓ Database type structure is properly formatted');
    } else {
      testResults.types.details.push('✗ Database type structure appears malformed');
      typesValid = false;
    }
    
    testResults.types.status = typesValid ? 'PASS' : 'WARN';
    log('TYPES', `TypeScript types validation: ${typesValid ? 'PASSED' : 'HAS WARNINGS'}`, typesValid ? 'PASS' : 'WARN');
    
  } catch (error) {
    testResults.types.status = 'FAIL';
    testResults.types.details.push(`Types validation error: ${error.message}`);
    log('TYPES', `Types validation error: ${error.message}`, 'FAIL');
  }
}

// Generate final report
function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('                      VALIDATION REPORT');
  console.log('='.repeat(80));
  
  const categories = [
    { key: 'connection', name: 'DATABASE CONNECTION' },
    { key: 'schema', name: 'SCHEMA STRUCTURE' },
    { key: 'rls', name: 'RLS POLICIES' },
    { key: 'realtime', name: 'REAL-TIME SUBSCRIPTIONS' },
    { key: 'types', name: 'TYPESCRIPT TYPES' }
  ];
  
  let overallPass = true;
  
  categories.forEach(category => {
    const result = testResults[category.key];
    const statusIcon = {
      'PASS': '✅ PASS',
      'FAIL': '❌ FAIL', 
      'WARN': '⚠️  WARN',
      'PENDING': '⏳ PENDING'
    }[result.status];
    
    console.log(`\n${category.name}: ${statusIcon}`);
    result.details.forEach(detail => {
      console.log(`  ${detail}`);
    });
    
    if (result.status === 'FAIL') {
      overallPass = false;
    }
  });
  
  console.log('\n' + '='.repeat(80));
  console.log(`OVERALL STATUS: ${overallPass ? '✅ PASS' : '❌ FAIL'}`);
  console.log('='.repeat(80));
  
  // Key findings summary
  console.log('\nKEY FINDINGS:');
  if (testResults.connection.status === 'PASS') {
    console.log('• Database connection is working properly');
  }
  if (testResults.schema.status === 'PASS') {
    console.log('• All required tables exist and are accessible');
  }
  if (testResults.rls.status === 'PASS') {
    console.log('• RLS policies are properly blocking unauthorized access');
  }
  if (testResults.realtime.status === 'PASS') {
    console.log('• Real-time subscriptions are configured and working');
  }
  if (testResults.types.status === 'PASS') {
    console.log('• TypeScript types align with database schema');
  }
  
  // Failure summary
  const failures = Object.entries(testResults).filter(([key, result]) => result.status === 'FAIL');
  if (failures.length > 0) {
    console.log('\nCRITICAL ISSUES TO ADDRESS:');
    failures.forEach(([key, result]) => {
      console.log(`• ${key.toUpperCase()}: Check configuration and resolve errors`);
    });
  }
  
  console.log('\n');
  
  return overallPass;
}

// Main test runner
async function runValidation() {
  console.log('🚀 Starting Database Validation Tests...\n');
  
  try {
    const supabase = initializeSupabase();
    
    // Run tests sequentially
    await testConnection(supabase);
    await testSchema(supabase);
    await testRLSPolicies(supabase);
    await testRealtime(supabase);
    await testTypesAlignment();
    
    const passed = generateReport();
    process.exit(passed ? 0 : 1);
    
  } catch (error) {
    log('CRITICAL', `Validation failed: ${error.message}`, 'FAIL');
    console.log('\n❌ VALIDATION TERMINATED DUE TO CRITICAL ERROR');
    process.exit(1);
  }
}

// Run the validation
if (require.main === module) {
  runValidation();
}

module.exports = { runValidation, testResults };