// Diagnose the exact cause of "Database error saving new user"
const SUPABASE_URL = 'https://cfeeqgokzkzblddefhxn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmZWVxZ29remt6YmxkZGVmaHhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1MTM1NTIsImV4cCI6MjA5NjA4OTU1Mn0.vzeLfLLeOajdsUaE__jvs_VoxzbvmX0j7p3GVAa26lI';

async function diagnose() {
  console.log('=== DIAGNOSING SIGNUP FAILURE ===\n');

  // 1. Check the profiles table schema to see all columns
  console.log('1. Checking profiles table columns...');
  const schemaRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=*&limit=1`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  });
  const profiles = await schemaRes.json();
  if (profiles.length > 0) {
    console.log('   Columns:', Object.keys(profiles[0]).join(', '));
    console.log('   Sample row:', JSON.stringify(profiles[0], null, 2));
  } else {
    console.log('   No profiles found (table may be empty)');
  }

  // 2. Check if there's an existing user with the test email (owaissaifi003)
  console.log('\n2. Checking if owaissaifi003@gmail.com already has a profile...');
  const existingRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?email=eq.owaissaifi003@gmail.com&select=*`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  });
  const existing = await existingRes.json();
  console.log('   Found:', existing.length, 'profiles');
  if (existing.length > 0) {
    console.log('   Profile:', JSON.stringify(existing[0], null, 2));
  }

  // 3. Try to manually insert into profiles to see the exact error
  console.log('\n3. Attempting manual profile insert to see exact error...');
  const testId = '00000000-0000-0000-0000-000000000099';
  const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      id: testId,
      full_name: 'Test',
      email: 'test@test.com',
      user_type: 'student',
      platform_role: 'user'
    })
  });
  console.log('   Status:', insertRes.status);
  const insertBody = await insertRes.json();
  console.log('   Response:', JSON.stringify(insertBody, null, 2));

  // 4. Check the CHECK constraints on the profiles table by trying different user_type values
  console.log('\n4. Checking all profile columns with NOT NULL constraints...');
  const sampleProfile = profiles[0];
  if (sampleProfile) {
    for (const [key, val] of Object.entries(sampleProfile)) {
      const isNull = val === null;
      console.log(`   ${key}: ${isNull ? 'NULL (nullable)' : typeof val + ' = ' + JSON.stringify(val).substring(0, 60)}`);
    }
  }

  // 5. Check the error details from the signup endpoint
  console.log('\n5. Attempting signup with detailed error capture...');
  const signupRes = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY
    },
    body: JSON.stringify({
      email: `diagnose_${Date.now()}@example.com`,
      password: 'TestPass@123',
      data: {
        full_name: 'Diagnose User',
        user_type: 'student'
      }
    })
  });
  console.log('   Status:', signupRes.status);
  const signupBody = await signupRes.json();
  console.log('   Full response:', JSON.stringify(signupBody, null, 2));
}

diagnose().catch(console.error);
