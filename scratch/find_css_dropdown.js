const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, '..', 'style.css');
const content = fs.readFileSync(cssPath, 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('me-dropdown') || line.includes('nav-me-btn')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
    const start = Math.max(0, idx - 3);
    const end = Math.min(lines.length, idx + 25);
    console.log('--- Context ---');
    for (let i = start; i < end; i++) {
      console.log(`${i+1}: ${lines[i]}`);
    }
    console.log('---------------\n');
  }
});
