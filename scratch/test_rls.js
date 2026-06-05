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

async function tryUpdate(token, label) {
  const targetSchoolId = 'c144a7bf-504f-4391-a796-4c57bc62bf61';
  console.log(`\nTesting update with [${label}]...`);
  
  const headers = {
    'apikey': supabaseAnonKey,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  try {
    const updateRes = await fetch(`${supabaseUrl}/rest/v1/schools?id=eq.${targetSchoolId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        name: `Aesthetic Academy (test-${label})`
      })
    });
    
    const updateData = await updateRes.json();
    console.log(`Result for [${label}]: Status ${updateRes.status}`);
    console.log(`Response body:`, updateData);
    
    if (updateRes.ok && updateData.length > 0) {
      console.log(`[VULNERABLE] Successfully updated school name to 'Aesthetic Academy (test-${label})'!`);
      return true;
    } else {
      console.log(`[SECURE] Update blocked or modified 0 rows.`);
      return false;
    }
  } catch (err) {
    console.log(`[SECURE/ERROR] Request failed:`, err.message);
    return false;
  }
}

async function runTest() {
  // Test 1: Unauthenticated (No token, just anon key)
  await tryUpdate(null, "Unauthenticated");
  
  // Test 2: Try logging in as school admin owaisgmail@gmail.com / Owais@11
  console.log("\nAttempting to log in as owaisgmail@gmail.com...");
  try {
    const signinRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'owaisgmail@gmail.com',
        password: 'Owais@11'
      })
    });
    
    const signinData = await signinRes.json();
    if (signinRes.ok && signinData.access_token) {
      console.log("Logged in successfully as owaisgmail@gmail.com.");
      await tryUpdate(signinData.access_token, "owaisgmail@gmail.com (School Admin of another school)");
    } else {
      console.log("Failed to log in as owaisgmail@gmail.com:", signinData.error_description || signinData.msg || JSON.stringify(signinData));
    }
  } catch (err) {
    console.error("Login attempt failed:", err.message);
  }
}

runTest();
