const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmZWVxZ29remt6YmxkZGVmaHhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1MTM1NTIsImV4cCI6MjA5NjA4OTU1Mn0.vzeLfLLeOajdsUaE__jvs_VoxzbvmX0j7p3GVAa26lI';
const url = 'https://cfeeqgokzkzblddefhxn.supabase.co/rest/v1/profiles';

async function run() {
  try {
    const res = await fetch(`${url}?email=eq.owaissaifi019@gmail.com`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    });
    if (res.ok) {
      const data = await res.json();
      console.log('Profile details:', JSON.stringify(data, null, 2));
    } else {
      console.log('Error:', res.statusText);
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
}

run();
