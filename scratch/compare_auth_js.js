const fs = require('fs');
const path = require('path');

const local = fs.readFileSync(path.join(__dirname, '../auth.js'), 'utf8');
const served = fs.readFileSync('C:\\Users\\Mohd Anas\\.gemini\\antigravity-ide\\brain\\7c4b6637-2b3e-41b5-b54f-227b05d56c51\\.system_generated\\steps\\162\\content.md', 'utf8');

// Strip any headers from served file if added by the tool (usually markdown format)
// The tool saves it as raw text/markdown. Let's compare lengths or print diffs.
console.log('Local auth.js length:', local.length);
console.log('Served file length:', served.length);

if (local.trim() === served.trim()) {
  console.log('Files are identical.');
} else {
  console.log('Files are different!');
}
