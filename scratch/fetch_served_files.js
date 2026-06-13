const http = require('http');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => { resolve(data); });
    }).on('error', reject);
  });
}

async function run() {
  try {
    console.log('Fetching supabase.js from local server...');
    const supabaseJs = await fetchUrl('http://localhost:3000/supabase.js');
    console.log('supabase.js length:', supabaseJs.length);
    console.log('supabase.js first 200 chars:', supabaseJs.substring(0, 200));
    console.log('====================================');

    console.log('Fetching auth.js from local server...');
    const authJs = await fetchUrl('http://localhost:3000/auth.js');
    console.log('auth.js length:', authJs.length);
    console.log('====================================');

    console.log('Fetching login.js from local server...');
    const loginJs = await fetchUrl('http://localhost:3000/login.js');
    console.log('login.js length:', loginJs.length);
    console.log('====================================');

    console.log('Fetching login.html from local server...');
    const loginHtml = await fetchUrl('http://localhost:3000/login.html');
    console.log('login.html length:', loginHtml.length);
    console.log('login.html first 300 chars:', loginHtml.substring(0, 300));
    console.log('====================================');
  } catch (err) {
    console.error('Error fetching files:', err);
  }
}

run();
