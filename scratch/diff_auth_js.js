const fs = require('fs');
const path = require('path');

const local = fs.readFileSync(path.join(__dirname, '../auth.js'), 'utf8').split(/\r?\n/);
const served = fs.readFileSync('C:\\Users\\Mohd Anas\\.gemini\\antigravity-ide\\brain\\7c4b6637-2b3e-41b5-b54f-227b05d56c51\\.system_generated\\steps\\162\\content.md', 'utf8').split(/\r?\n/);

console.log('Local lines:', local.length);
console.log('Served lines:', served.length);

// Let's print the first few differences
const maxLen = Math.max(local.length, served.length);
let count = 0;
for (let i = 0; i < maxLen; i++) {
  const lLine = local[i] || '';
  const sLine = served[i] || '';
  if (lLine.trim() !== sLine.trim()) {
    count++;
    console.log(`Diff #${count} at line ${i+1}:`);
    console.log(`  Local:  "${lLine}"`);
    console.log(`  Served: "${sLine}"`);
    if (count >= 20) break;
  }
}
