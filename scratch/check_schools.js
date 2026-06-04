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

async function test() {
  const userId = '72ea700c-3e6a-4b30-b763-54212692994c';
  console.log(`Querying profile for user ${userId}...`);
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=*`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errText}`);
    }
    const data = await response.json();
    console.log(`Profile:`, data);
  } catch (err) {
    console.error("Error querying profiles:", err.message);
  }
}

test();
