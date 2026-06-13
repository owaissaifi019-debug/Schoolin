const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'index.html');
const content = fs.readFileSync(htmlPath, 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('me-dropdown')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
    const start = Math.max(0, idx - 5);
    const end = Math.min(lines.length, idx + 25);
    console.log('--- Context ---');
    for (let i = start; i < end; i++) {
      console.log(`${i+1}: ${lines[i]}`);
    }
    console.log('---------------\n');
  }
});
