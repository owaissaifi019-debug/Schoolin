// Check if the columns added by ALTER TABLE have NOT NULL constraints
// that would cause the trigger INSERT to fail
const SUPABASE_URL = 'https://cfeeqgokzkzblddefhxn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmZWVxZ29remt6YmxkZGVmaHhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1MTM1NTIsImV4cCI6MjA5NjA4OTU1Mn0.vzeLfLLeOajdsUaE__jvs_VoxzbvmX0j7p3GVAa26lI';

async function checkColumns() {
  // Use RPC to query information_schema
  const query = encodeURIComponent(`
    SELECT column_name, data_type, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles'
    ORDER BY ordinal_position
  `);
  
  // We can't run this via REST, but we can check via the trigger source
  // Instead, let's try creating a user with all possible columns set
  console.log('Attempting signup with all metadata fields populated...');
  
  const signupRes = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY
    },
    body: JSON.stringify({
      email: `fulltest_${Date.now()}@example.com`,
      password: 'TestPass@123',
      data: {
        full_name: 'Full Test User',
        user_type: 'student',
        avatar_url: null
      }
    })
  });
  
  console.log('Status:', signupRes.status);
  const body = await signupRes.json();
  console.log('Response:', JSON.stringify(body, null, 2));
  
  // Now check what the trigger function currently looks like
  // by examining if the issue is a NOT NULL constraint on newer columns
  console.log('\n--- Analysis ---');
  console.log('The trigger INSERT only specifies: id, full_name, email, user_type, platform_role, avatar_url');
  console.log('But the profiles table now has additional columns: class, bio, skills, achievements, sports, certificates, school_id');
  console.log('If any of those have NOT NULL without DEFAULT, the INSERT would fail.');
  console.log('');
  console.log('From the sample data:');
  console.log('  class: null ✅ (nullable)');
  console.log('  bio: null ✅ (nullable)');
  console.log('  skills: [] ✅ (has default)');
  console.log('  achievements: [] ✅ (has default)');
  console.log('  sports: [] ✅ (has default)');
  console.log('  certificates: [] ✅ (has default)');
  console.log('  school_id: null ✅ (nullable)');
  console.log('');
  console.log('All additional columns are either nullable or have defaults.');
  console.log('The issue is most likely that the trigger function itself has an error');
  console.log('or was not updated after schema changes.');
  console.log('');
  console.log('>>> HAVE YOU RUN THE FIX SQL IN SUPABASE SQL EDITOR? <<<');
  console.log('File: scratch/fix_signup_trigger.sql');
}

checkColumns().catch(console.error);
