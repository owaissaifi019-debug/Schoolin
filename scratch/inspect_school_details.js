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

  console.log('Fetching school details...');
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/schools?id=eq.d5b7360f-613b-4d08-8ad8-4734dffdccb7`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token}`
      }
    });
    const schools = await res.json();
    console.log('School details:', schools[0]);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

inspect();
