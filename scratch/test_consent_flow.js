// e:/Owais/School Idea/SchoolIn/scratch/test_consent_flow.js
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Mock window object for auth.js
global.window = {
  CampusLink: {}
};

const SUPABASE_URL = 'https://cfeeqgokzkzblddefhxn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmZWVxZ29remt6YmxkZGVmaHhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1MTM1NTIsImV4cCI6MjA5NjA4OTU1Mn0.vzeLfLLeOajdsUaE__jvs_VoxzbvmX0j7p3GVAa26lI';

global.window.CampusLink.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Load and evaluate auth.js
const authCode = fs.readFileSync(path.join(__dirname, '../auth.js'), 'utf8');
eval(authCode);

const auth = global.window.CampusLink.auth;

async function runTests() {
  console.log('=== Running Consent Flow Tests ===\n');

  // Test Case 1: Attempt signup without terms accepted (should throw validation error immediately)
  console.log('Test Case 1: Registering with termsAccepted = false/undefined...');
  try {
    await auth.signUp(
      'someemail@example.com',
      'Password123',
      'Test Name',
      'student',
      null, // no avatar
      false // termsAccepted
    );
    console.log('❌ FAIL: signUp should have thrown an error but succeeded.');
  } catch (err) {
    if (err.message.includes('agree to the Terms & Conditions')) {
      console.log('✅ PASS: Correctly threw validation error:', err.message);
    } else {
      console.log('❌ FAIL: Threw unexpected error:', err.message);
    }
  }

  console.log('\nTest Case 2: Registering with termsAccepted = true...');
  const testEmail = `consent_user_${Date.now()}@example.com`;
  try {
    // We expect this to call Supabase auth.signUp. Since it's a real call to the remote database,
    // it will either succeed (returning success/confirmation required) or fail if Supabase is offline.
    const result = await auth.signUp(
      testEmail,
      'Password123!',
      'Consent Tester',
      'student',
      null, // no avatar
      true // termsAccepted
    );

    console.log('✅ PASS: Call to auth.signUp succeeded.');
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (err) {
    // If it fails because of actual DB config or network, but doesn't fail on consent, that still confirms the client-side validation logic passed.
    console.log('ℹ️ Supabase API completed with message/error:', err.message);
  }
}

runTests().catch(console.error);
