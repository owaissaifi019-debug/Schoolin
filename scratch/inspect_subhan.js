const url = 'https://cfeeqgokzkzblddefhxn.supabase.co/rest/v1/profiles?full_name=ilike.Subhan*&select=*,schools(*)';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmZWVxZ29remt6YmxkZGVmaHhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1MTM1NTIsImV4cCI6MjA5NjA4OTU1Mn0.vzeLfLLeOajdsUaE__jvs_VoxzbvmX0j7p3GVAa26lI';

async function run() {
  try {
    const res = await fetch(url, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    });
    console.log('Status:', res.status);
    const json = await res.json();
    console.log('Profiles matching Subhan:', JSON.stringify(json, null, 2));
  } catch (err) {
    console.error(err);
  }
}

run();
