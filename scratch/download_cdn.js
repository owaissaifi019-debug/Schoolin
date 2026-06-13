async function run() {
  console.log('Fetching CDN...');
  try {
    const res = await fetch('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2');
    const text = await res.text();
    console.log('Length:', text.length);
    console.log('Contains cl_keys:', text.includes('cl_keys'));
    console.log('Contains CAMPUSLINK_RESULT:', text.includes('CAMPUSLINK_RESULT'));
  } catch (e) {
    console.error('Fetch failed:', e.message);
  }
}
run();
