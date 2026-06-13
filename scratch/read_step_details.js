const fs = require('fs');

const path152 = 'C:\\Users\\Mohd Anas\\.gemini\\antigravity-ide\\brain\\7c4b6637-2b3e-41b5-b54f-227b05d56c51\\.system_generated\\steps\\152\\content.md';
const path162 = 'C:\\Users\\Mohd Anas\\.gemini\\antigravity-ide\\brain\\7c4b6637-2b3e-41b5-b54f-227b05d56c51\\.system_generated\\steps\\162\\content.md';

function showMatch(filePath) {
  console.log(`\n================= ${filePath} =================`);
  if (!fs.existsSync(filePath)) {
    console.log('File does not exist');
    return;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const terms = ['CAMPUSLINK_RESULT', 'cl_keys', 'auth_keys', 'owaissaifi019'];
  terms.forEach(term => {
    let idx = content.indexOf(term);
    if (idx !== -1) {
      console.log(`\n--- Match context for "${term}": ---`);
      console.log(content.substring(Math.max(0, idx - 150), Math.min(content.length, idx + 1000)));
    }
  });
}

showMatch(path152);
showMatch(path162);
