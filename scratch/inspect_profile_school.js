const SUPABASE_URL = 'https://cfeeqgokzkzblddefhxn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmZWVxZ29remt6YmxkZGVmaHhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1MTM1NTIsImV4cCI6MjA5NjA4OTU1Mn0.vzeLfLLeOajdsUaE__jvs_VoxzbvmX0j7p3GVAa26lI';

async function inspect() {
  console.log('Logging in...');
  const loginRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'owaissaifi019@gmail.com',
      password: 'Owais@11'
    })
  });
  const loginData = await loginRes.json();
  const token = loginData.access_token;
  if (!token) {
    console.error('Login failed:', loginData);
    return;
  }

  console.log('Fetching profile...');
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.72ea700c-3e6a-4b30-b763-54212692994c`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token}`
      }
    });
    const profiles = await res.json();
    console.log('Profile details:', profiles[0]);

    console.log('Fetching schools...');
    const schoolRes = await fetch(`${SUPABASE_URL}/rest/v1/schools?admin_user_id=eq.72ea700c-3e6a-4b30-b763-54212692994c`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token}`
      }
    });
    const schools = await schoolRes.json();
    console.log('Admin of schools:', schools);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

inspect();
