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

  console.log('Fetching conversations and participants...');
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/conversations?select=*,conversation_participants(*)`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token}`
      }
    });
    const convs = await res.json();
    console.log(`Found ${convs.length} conversations:`);
    for (const c of convs) {
      console.log(`\nConversation ID: ${c.id}`);
      console.log(`Status: ${c.status}`);
      console.log(`Initiator ID: ${c.initiator_id}`);
      console.log(`School ID: ${c.school_id}`);
      console.log(`Participants (${c.conversation_participants.length}):`);
      for (const p of c.conversation_participants) {
        console.log(`  - Participant ID: ${p.id}, user_id: ${p.user_id}, school_id: ${p.school_id}`);
      }
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

inspect();
