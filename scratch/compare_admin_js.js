const fs = require('fs');
const path = require('path');

const local = fs.readFileSync(path.join(__dirname, '../admin/admin.js'), 'utf8');
const served = fs.readFileSync('C:\\Users\\Mohd Anas\\.gemini\\antigravity-ide\\brain\\7c4b6637-2b3e-41b5-b54f-227b05d56c51\\.system_generated\\steps\\152\\content.md', 'utf8');

// Strip the markdown header from served file
const servedLines = served.split(/\r?\n/);
const headerEndIndex = servedLines.indexOf('---') + 1;
const servedContentOnly = servedLines.slice(headerEndIndex).join('\n').trim();

console.log('Local admin.js length:', local.trim().length);
console.log('Served content-only length:', servedContentOnly.length);

if (local.trim() === servedContentOnly) {
  console.log('Files are identical.');
} else {
  console.log('Files are different!');
  // Let's print the first difference
  const localL = local.split(/\r?\n/);
  const servedL = servedContentOnly.split(/\r?\n/);
  const max = Math.max(localL.length, servedL.length);
  let count = 0;
  for (let i = 0; i < max; i++) {
    const l = localL[i] || '';
    const s = servedL[i] || '';
    if (l.trim() !== s.trim()) {
      count++;
      console.log(`Diff #${count} at line ${i+1}:`);
      console.log(`  Local:  "${l}"`);
      console.log(`  Served: "${s}"`);
      if (count >= 5) break;
    }
  }
}
