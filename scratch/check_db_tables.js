const SUPABASE_URL = 'https://cfeeqgokzkzblddefhxn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmZWVxZ29remt6YmxkZGVmaHhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1MTM1NTIsImV4cCI6MjA5NjA4OTU1Mn0.vzeLfLLeOajdsUaE__jvs_VoxzbvmX0j7p3GVAa26lI';

const tables = [
  'profiles',
  'schools',
  'events',
  'admissions',
  'posts',
  'post_likes',
  'comments',
  'follows',
  'connections',
  'messages',
  'notifications',
  'admission_applications',
  'school_suggestions'
];

async function check() {
  console.log('Checking tables in Supabase...');
  for (const table of tables) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?limit=1`, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });
      if (res.status === 200 || res.status === 204 || res.status === 406) {
        console.log(`✅ Table '${table}': EXISTS (Status ${res.status})`);
      } else if (res.status === 404) {
        console.log(`❌ Table '${table}': MISSING (404)`);
      } else {
        console.log(`❓ Table '${table}': Status ${res.status}`);
      }
    } catch (err) {
      console.log(`❌ Table '${table}': Error ${err.message}`);
    }
  }
}

check();
