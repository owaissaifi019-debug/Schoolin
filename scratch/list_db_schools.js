const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://cfeeqgokzkzblddefhxn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmZWVxZ29remt6YmxkZGVmaHhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1MTM1NTIsImV4cCI6MjA5NjA4OTU1Mn0.vzeLfLLeOajdsUaE__jvs_VoxzbvmX0j7p3GVAa26lI';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  console.log('Fetching approved schools from database...');
  const { data, error } = await supabase.from('schools').select('id, name, status, verification_badge');
  if (error) {
    console.error('Error fetching schools:', error);
    return;
  }
  console.log('Schools in DB:', JSON.stringify(data, null, 2));
}

run();
