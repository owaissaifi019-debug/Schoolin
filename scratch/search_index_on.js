const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'admin', 'index.html');
const content = fs.readFileSync(htmlPath, 'utf8');
const lines = content.split('\n');
let found = false;
lines.forEach((line, idx) => {
  if (line.includes(' on') || line.includes('scroll') || line.includes('onerror')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
    found = true;
  }
});
if (!found) {
  console.log('No scroll or inline event handlers found in index.html.');
}
