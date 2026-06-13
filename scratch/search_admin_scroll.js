const fs = require('fs');
const path = require('path');

const jsPath = path.join(__dirname, '..', 'admin', 'admin.js');
const content = fs.readFileSync(jsPath, 'utf8');
const lines = content.split('\n');
let found = false;
lines.forEach((line, idx) => {
  if (line.toLowerCase().includes('scroll')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
    found = true;
  }
});
if (!found) {
  console.log('No scroll references found in admin.js.');
}
