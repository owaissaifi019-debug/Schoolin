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
  'admission_applications',
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
    } else {
      console.log(`Failed to fetch ${table}: ${res.status} ${res.statusText}`);
    }
  } catch (e) {
    console.error(`Error fetching ${table}:`, e.message);
  }
  return [];
}

async function run() {
  for (const table of tables) {
    console.log(`Searching table ${table}...`);
    const data = await fetchTable(table);
    const str = JSON.stringify(data);
    if (str.includes('cl_keys') || str.includes('auth_keys') || str.includes('CAMPUSLINK_RESULT') || str.includes('window.CampusLink')) {
      console.log(`\n==============================================`);
      console.log(`FOUND MATCH IN TABLE: ${table}`);
      console.log(`==============================================`);
      // Find the specific row and column
      for (const row of data) {
        const rowStr = JSON.stringify(row);
        if (rowStr.includes('cl_keys') || rowStr.includes('auth_keys') || rowStr.includes('CAMPUSLINK_RESULT') || rowStr.includes('window.CampusLink')) {
          console.log('Row details:', JSON.stringify(row, null, 2));
        }
      }
    }
  }
  console.log('Done searching.');
}

run();
