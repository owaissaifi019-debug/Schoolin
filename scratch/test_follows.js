const fs = require('fs');

// Read supabase credentials from supabase.js
const supabaseFile = fs.readFileSync('e:/Owais/School Idea/SchoolIn/supabase.js', 'utf8');
const urlMatch = supabaseFile.match(/const SUPABASE_URL = ['"]([^'"]+)['"]/);
const keyMatch = supabaseFile.match(/const SUPABASE_ANON_KEY = ['"]([^'"]+)['"]/);

if (!urlMatch || !keyMatch) {
  console.error("Could not find supabase credentials in supabase.js");
  process.exit(1);
}

const supabaseUrl = urlMatch[1];
const supabaseAnonKey = keyMatch[1];

async function checkTable(tableName) {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/${tableName}?select=*&limit=1`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    });
    if (!response.ok) {
      const errText = await response.text();
      return `Error: HTTP ${response.status} - ${errText}`;
    }
    const data = await response.json();
    return `OK (Rows found: ${data.length})`;
  } catch (err) {
    return `Network/HTTP Error: ${err.message}`;
  }
}

async function test() {
  const tables = ['profiles', 'schools', 'events', 'admissions', 'posts', 'post_likes', 'comments', 'follows'];
  for (const table of tables) {
    const result = await checkTable(table);
    console.log(`Table '${table}': ${result}`);
  }
}

test();
