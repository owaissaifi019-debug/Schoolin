const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://cfeeqgokzkzblddefhxn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmZWVxZ29remt6YmxkZGVmaHhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1MTM1NTIsImV4cCI6MjA5NjA4OTU1Mn0.vzeLfLLeOajdsUaE__jvs_VoxzbvmX0j7p3GVAa26lI';

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  try {
    const { data: posts, error } = await sb
      .from('posts')
      .select('id, content, post_type, created_at, user_id')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    console.log(JSON.stringify(posts, null, 2));
  } catch (err) {
    console.error('Error fetching posts:', err);
  }
}

run();
