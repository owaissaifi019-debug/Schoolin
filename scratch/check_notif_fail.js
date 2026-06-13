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

async function runTest() {
  console.log("Testing notifications querying using direct REST fetch to pinpoint schema/join issues...");
  
  // Let's first login or check using anon key (which has RLS)
  // Let's sign in to a known user first. Let's see if we can log in with a user.
  // Wait, let's try login with a user to get their token.
  // Let's try owaisgmail@gmail.com / Owais@11
  
  let token = null;
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
      console.log("Logged in successfully. Using token for requests...");
      token = signinData.access_token;
    } else {
      console.log("Failed to log in: ", signinData);
    }
  } catch (err) {
    console.error("Login attempt failed:", err.message);
  }

  if (!token) return;

  const headers = {
    'apikey': supabaseAnonKey,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // 1. Try fetching notifications directly without relationship
  console.log("\n1. Fetching raw notifications (no joins)...");
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/notifications?limit=5`, { headers });
    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Data/Error:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error:", err);
  }

  // 2. Try fetching notifications WITH the actor relationship as written in notifications.js
  console.log("\n2. Fetching notifications with actor relationship: select=*,actor:profiles!actor_id(full_name,avatar_url,user_type)...");
  try {
    const url = `${supabaseUrl}/rest/v1/notifications?select=*,actor:profiles!actor_id(full_name,avatar_url,user_type)&limit=5`;
    const res = await fetch(url, { headers });
    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Data/Error:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error:", err);
  }

  // 3. Try fetching notifications with alternative join if the first fails
  console.log("\n3. Fetching notifications with actor relationship using foreign key name if known...");
  try {
    const url = `${supabaseUrl}/rest/v1/notifications?select=*,actor:profiles!notifications_actor_id_fkey(full_name,avatar_url,user_type)&limit=5`;
    const res = await fetch(url, { headers });
    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Data/Error:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error:", err);
  }
}

runTest();
