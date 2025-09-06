#!/usr/bin/env node
/**
 * Schema Inspector - Query actual database schema
 * 
 * This tool inspects the actual Supabase database schema to determine
 * the real column names and structure, so we can fix our integration tests.
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xeufulgndgxxaslkyjsm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhldWZ1bGduZGd4eGFzbGt5anNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwOTI1OTIsImV4cCI6MjA3MjY2ODU5Mn0.6FGR90xQ9FOIzOA47QT9NYLZ-RZo6bzQatMQBTo3Z98';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const inspectSchema = async () => {
  console.log('🔍 INSPECTING ACTUAL DATABASE SCHEMA');
  console.log('=' .repeat(50));
  
  try {
    // Try to get column information from users table
    console.log('\n📋 USERS TABLE SCHEMA:');
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(0);
    
    if (usersError) {
      console.log('❌ Error querying users table:', usersError);
    } else {
      console.log('✅ Users table accessible (empty result set for schema inspection)');
    }
    
    // Try to get column information from alarms table
    console.log('\n⏰ ALARMS TABLE SCHEMA:');
    const { data: alarmsData, error: alarmsError } = await supabase
      .from('alarms')
      .select('*')
      .limit(0);
    
    if (alarmsError) {
      console.log('❌ Error querying alarms table:', alarmsError);
    } else {
      console.log('✅ Alarms table accessible (empty result set for schema inspection)');
    }
    
    // Try to get column information from active_sessions table
    console.log('\n🔄 ACTIVE_SESSIONS TABLE SCHEMA:');
    const { data: sessionsData, error: sessionsError } = await supabase
      .from('active_sessions')
      .select('*')
      .limit(0);
    
    if (sessionsError) {
      console.log('❌ Error querying active_sessions table:', sessionsError);
    } else {
      console.log('✅ Active_sessions table accessible (empty result set for schema inspection)');
    }
    
    // Try a more direct approach - create a test record to see what fields are expected
    console.log('\n🧪 TESTING USER INSERT WITH MINIMAL FIELDS:');
    
    const testUserId = crypto.randomUUID();
    const testEmail = `schema-test-${Date.now()}@test.com`;
    
    // Try inserting with minimal fields to see what's required
    const { data: minimalUser, error: minimalError } = await supabase
      .from('users')
      .insert({
        id: testUserId,
        email: testEmail,
      })
      .select()
      .single();
    
    if (minimalError) {
      console.log('❌ Minimal user insert failed:', minimalError.message);
      console.log('   Details:', minimalError.details);
      console.log('   Hint:', minimalError.hint);
    } else {
      console.log('✅ Minimal user insert successful');
      console.log('   Created user:', minimalUser);
      
      // Clean up the test user
      await supabase.from('users').delete().eq('id', testUserId);
      console.log('🗑️  Test user cleaned up');
    }
    
    // Try with common field variations
    console.log('\n🔍 TESTING COMMON FIELD VARIATIONS:');
    
    const fieldVariations = [
      { name: 'full_name field test', fields: { id: crypto.randomUUID(), email: `test-fullname-${Date.now()}@test.com`, full_name: 'Test User' } },
      { name: 'display_name field test', fields: { id: crypto.randomUUID(), email: `test-displayname-${Date.now()}@test.com`, display_name: 'Test User' } },
      { name: 'first_name/last_name field test', fields: { id: crypto.randomUUID(), email: `test-names-${Date.now()}@test.com`, first_name: 'Test', last_name: 'User' } },
    ];
    
    for (const variation of fieldVariations) {
      const { data, error } = await supabase
        .from('users')
        .insert(variation.fields)
        .select()
        .single();
      
      if (error) {
        console.log(`❌ ${variation.name}: ${error.message}`);
      } else {
        console.log(`✅ ${variation.name}: SUCCESS`);
        console.log('   Fields that worked:', Object.keys(variation.fields).join(', '));
        
        // Clean up
        await supabase.from('users').delete().eq('id', variation.fields.id);
        console.log('   Cleaned up test record');
      }
    }
    
    // Try to query existing data to understand structure
    console.log('\n📊 CHECKING FOR EXISTING DATA:');
    
    const { data: existingUsers, error: existingError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (existingError) {
      console.log('❌ Error querying existing users:', existingError.message);
    } else if (existingUsers && existingUsers.length > 0) {
      console.log('✅ Found existing users. Sample structure:');
      console.log('   Available fields:', Object.keys(existingUsers[0]).join(', '));
      console.log('   Sample record (anonymized):');
      const sample = { ...existingUsers[0] };
      if (sample.email) sample.email = 'user@example.com';
      if (sample.full_name) sample.full_name = 'Sample User';
      if (sample.first_name) sample.first_name = 'Sample';
      if (sample.last_name) sample.last_name = 'User';
      console.log('   ', sample);
    } else {
      console.log('ℹ️  No existing users found in database');
    }
    
  } catch (error) {
    console.error('🚨 Error during schema inspection:', error);
  }
};

const crypto = require('crypto');

// Run the inspection
inspectSchema().catch(console.error);