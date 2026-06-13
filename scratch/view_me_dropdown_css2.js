const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, '..', 'style.css');
const content = fs.readFileSync(cssPath, 'utf8');
const lines = content.split('\n');
console.log('--- style.css lines 520 to 600 ---');
for (let i = 519; i < Math.min(lines.length, 600); i++) {
  console.log(`${i+1}: ${lines[i]}`);
}
console.log('----------------------------------');
