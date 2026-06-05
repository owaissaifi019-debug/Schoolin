// Test account creation using the Supabase API directly
const SUPABASE_URL = 'https://cfeeqgokzkzblddefhxn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmZWVxZ29remt6YmxkZGVmaHhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1MTM1NTIsImV4cCI6MjA5NjA4OTU1Mn0.vzeLfLLeOajdsUaE__jvs_VoxzbvmX0j7p3GVAa26lI';

async function testSignup() {
  const testEmail = `testuser_${Date.now()}@example.com`;
  console.log('Attempting signup with email:', testEmail);

  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        email: testEmail,
        password: 'TestPass@123',
        data: {
          full_name: 'Test User',
          user_type: 'student'
        }
      })
    });

    const json = await res.json();
    console.log('Status:', res.status);
    
    if (res.status === 200 || res.status === 201) {
      console.log('✅ SUCCESS! User created.');
      console.log('User ID:', json.id);
      console.log('Email:', json.email);
      
      // Check if profile was created
      if (json.id) {
        const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${json.id}&select=*`, {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          }
        });
        const profiles = await profileRes.json();
        console.log('Profile created:', profiles.length > 0 ? '✅ YES' : '❌ NO');
        if (profiles[0]) {
          console.log('Profile data:', profiles[0]);
        }
      }
    } else {
      console.log('❌ FAILED:', json.msg || json.message || json.error || JSON.stringify(json));
    }
  } catch (err) {
    console.error('Request error:', err.message);
  }
}

testSignup();
