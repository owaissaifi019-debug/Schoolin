const fs = require('fs');
const path = require('path');

const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmZWVxZ29remt6YmxkZGVmaHhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1MTM1NTIsImV4cCI6MjA5NjA4OTU1Mn0.vzeLfLLeOajdsUaE__jvs_VoxzbvmX0j7p3GVAa26lI';
const url = 'https://cfeeqgokzkzblddefhxn.supabase.co/rest/v1';

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
    console.error(`Failed to fetch ${table}:`, e.message);
  }
  return [];
}

async function run() {
  const tables = ['schools', 'profiles', 'events', 'admissions', 'school_suggestions', 'posts', 'conversations'];
  for (const table of tables) {
    console.log(`Fetching ${table}...`);
    const data = await fetchTable(table);
    const serialized = JSON.stringify(data);
    if (serialized.includes('cl_keys') || serialized.includes('auth_keys')) {
      console.log(`\n>>> FOUND IN DATABASE TABLE: ${table} <<<`);
      console.log(data);
    }
  }
  console.log('Finished DB inspect.');
}

run();
