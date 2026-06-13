const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmZWVxZ29remt6YmxkZGVmaHhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1MTM1NTIsImV4cCI6MjA5NjA4OTU1Mn0.vzeLfLLeOajdsUaE__jvs_VoxzbvmX0j7p3GVAa26lI';
const url = 'https://cfeeqgokzkzblddefhxn.supabase.co/rest/v1';

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
  'school_suggestions'
];

async function fetchTable(table) {
  try {
    const res = await fetch(`${url}/${table}?select=*`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {}
  return [];
}

async function run() {
  for (const table of tables) {
    const data = await fetchTable(table);
    for (const row of data) {
      const rowStr = JSON.stringify(row).toLowerCase();
      if (rowStr.includes('onerror') || rowStr.includes('<script') || rowStr.includes('<img') || rowStr.includes('javascript:') || rowStr.includes('onload')) {
        console.log(`\n----------------------------------------------`);
        console.log(`POTENTIAL INJECTION IN TABLE: ${table}`);
        console.log(`----------------------------------------------`);
        console.log(JSON.stringify(row, null, 2));
      }
    }
  }
  console.log('Search finished.');
}

run();
