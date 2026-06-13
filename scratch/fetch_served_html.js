const fs = require('fs');
const path = require('path');

async function check(urlPath, diskFilePath) {
  try {
    const res = await fetch(`http://localhost:3000/${urlPath}`);
    if (!res.ok) {
      console.log(`Failed to fetch ${urlPath}: ${res.statusText}`);
      return;
    }
    const text = await res.text();
    const diskText = fs.readFileSync(diskFilePath, 'utf8');
    
    if (text !== diskText) {
      console.log(`\n[DIFFERENCE DETECTED] served ${urlPath} is different from disk!`);
      console.log('Served length:', text.length, 'Disk length:', diskText.length);
      // Let's print any extra scripts/content in served HTML
      if (text.length > diskText.length) {
        console.log('Served HTML has extra characters. Let\'s find where they are.');
        // Diff simple check
        let diffIdx = -1;
        for (let i = 0; i < diskText.length; i++) {
          if (text[i] !== diskText[i]) {
            diffIdx = i;
            break;
          }
        }
        if (diffIdx !== -1) {
          console.log('Difference starts at char index:', diffIdx);
          console.log('Disk context around difference:', diskText.substring(Math.max(0, diffIdx - 50), diffIdx + 100));
          console.log('Served context around difference:', text.substring(Math.max(0, diffIdx - 50), diffIdx + 500));
        } else {
          console.log('Extra content is appended at the end:');
          console.log(text.substring(diskText.length));
        }
      }
    } else {
      console.log(`[IDENTICAL] served ${urlPath} matches disk perfectly.`);
    }
  } catch (e) {
    console.error(`Error checking ${urlPath}:`, e.message);
  }
}

async function run() {
  await check('admin/index.html', path.join(__dirname, '..', 'admin', 'index.html'));
  await check('login.html', path.join(__dirname, '..', 'login.html'));
  await check('auth.js', path.join(__dirname, '..', 'auth.js'));
  await check('supabase.js', path.join(__dirname, '..', 'supabase.js'));
}

run();
