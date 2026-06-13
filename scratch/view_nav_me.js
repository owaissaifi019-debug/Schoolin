const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'index.html');
const content = fs.readFileSync(htmlPath, 'utf8');
const lines = content.split('\n');
console.log('--- index.html lines 90 to 140 ---');
for (let i = 89; i < Math.min(lines.length, 140); i++) {
  console.log(`${i+1}: ${lines[i]}`);
}
console.log('----------------------------------');
