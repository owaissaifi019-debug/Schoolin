const fs = require('fs');
const path = require('path');

const jsPath = path.join(__dirname, '..', 'admin', 'admin.js');
const content = fs.readFileSync(jsPath, 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('appendChild')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
