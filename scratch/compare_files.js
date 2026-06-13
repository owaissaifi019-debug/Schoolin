const http = require('http');
const fs = require('fs');
const path = require('path');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => { resolve(data); });
    }).on('error', reject);
  });
}

function normalize(str) {
  return str.replace(/\r\n/g, '\n').trim();
}

async function run() {
  const files = ['supabase.js', 'auth.js', 'login.js', 'login.html'];
  for (const file of files) {
    try {
      console.log(`Comparing ${file}...`);
      const served = await fetchUrl(`http://localhost:3000/${file}`);
      const disk = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
      
      const normServed = normalize(served);
      const normDisk = normalize(disk);
      
      if (normServed === normDisk) {
        console.log(`✓ ${file} is IDENTICAL.`);
      } else {
        console.log(`❌ ${file} is DIFFERENT!`);
        console.log(`Disk length (normalized): ${normDisk.length}, Served length (normalized): ${normServed.length}`);
        
        // Let's find the first index where they differ
        let firstDiff = -1;
        for (let i = 0; i < Math.min(normDisk.length, normServed.length); i++) {
          if (normDisk[i] !== normServed[i]) {
            firstDiff = i;
            break;
          }
        }
        if (firstDiff !== -1) {
          console.log(`First difference at index ${firstDiff}:`);
          console.log(`Disk: "${normDisk.substring(firstDiff, firstDiff + 100)}"`);
          console.log(`Served: "${normServed.substring(firstDiff, firstDiff + 100)}"`);
        }
      }
      console.log('------------------------------------');
    } catch (e) {
      console.error(`Error comparing ${file}:`, e);
    }
  }
}

run();
