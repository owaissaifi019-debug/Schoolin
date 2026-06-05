const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmZWVxZ29remt6YmxkZGVmaHhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1MTM1NTIsImV4cCI6MjA5NjA4OTU1Mn0.vzeLfLLeOajdsUaE__jvs_VoxzbvmX0j7p3GVAa26lI';

async function test(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    });
    console.log('URL:', url);
    console.log('Status:', res.status);
    const json = await res.json();
    if (res.status === 200) {
      console.log('Success! First item:', json[0]);
    } else {
      console.log('Error:', json);
    }
  } catch (err) {
    console.error(err);
  }
}

async function run() {
  await test('https://cfeeqgokzkzblddefhxn.supabase.co/rest/v1/posts?select=*,profiles!user_id(full_name,email)');
  await test('https://cfeeqgokzkzblddefhxn.supabase.co/rest/v1/posts?select=*,profiles!posts_user_id_fkey(full_name,email)');
}

run();
