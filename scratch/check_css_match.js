const fs = require('fs');
const path = require('path');

async function run() {
  try {
    const res = await fetch('http://localhost:3000/style.css');
    if (!res.ok) {
      console.log('Failed to fetch style.css:', res.statusText);
      return;
    }
    const text = await res.text();
    const diskText = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');
    console.log('style.css matches disk:', text === diskText);
    if (text !== diskText) {
      console.log('Served style.css length:', text.length, 'Disk style.css length:', diskText.length);
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
}

run();
