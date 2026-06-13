const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, '..', 'style.css');
const content = fs.readFileSync(cssPath, 'utf8');
const lines = content.split('\n');
console.log('--- style.css lines 480 to 520 ---');
for (let i = 479; i < 520; i++) {
  console.log(`${i+1}: ${lines[i]}`);
}
console.log('----------------------------------');
