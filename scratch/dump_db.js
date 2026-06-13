const fs = require('fs');
const path = require('path');

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
  } catch (e) {
    console.error(`Error fetching ${table}:`, e.message);
  }
  return [];
}

async function run() {
  let dump = '';
  for (const table of tables) {
    console.log(`Dumping table ${table}...`);
    const data = await fetchTable(table);
    dump += `=== TABLE: ${table} ===\n`;
    dump += JSON.stringify(data, null, 2) + '\n\n';
  }
  fs.writeFileSync(path.join(__dirname, 'db_dump.txt'), dump, 'utf8');
  console.log('Database dump complete. Saved to scratch/db_dump.txt');
}

run();
