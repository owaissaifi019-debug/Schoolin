// e:/Owais/School Idea/SchoolIn/scratch/inspect_db.js
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://cfeeqgokzkzblddefhxn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmZWVxZ29remt6YmxkZGVmaHhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1MTM1NTIsImV4cCI6MjA5NjA4OTU1Mn0.vzeLfLLeOajdsUaE__jvs_VoxzbvmX0j7p3GVAa26lI';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  console.log("=== Fetching Posts ===");
  const { data: posts, error: postsErr } = await supabase
    .from('posts')
    .select('id, user_id, content, post_type, created_at');
  
  if (postsErr) {
    console.error("Error fetching posts:", postsErr);
  } else {
    console.log(`Fetched ${posts.length} posts:`);
    console.log(JSON.stringify(posts, null, 2));
  }

  console.log("\n=== Fetching Profiles ===");
  const { data: profiles, error: profilesErr } = await supabase
    .from('profiles')
    .select('id, full_name, email, platform_role');
  
  if (profilesErr) {
    console.error("Error fetching profiles:", profilesErr);
  } else {
    console.log(`Fetched ${profiles.length} profiles:`);
    console.log(JSON.stringify(profiles, null, 2));
  }
}

main().catch(console.error);
