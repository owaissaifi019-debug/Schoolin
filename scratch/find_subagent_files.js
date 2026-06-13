const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walkDir(filePath, callback);
    } else {
      callback(filePath);
    }
  }
}

const dirPath = 'C:\\Users\\Mohd Anas\\.gemini\\antigravity-ide\\brain\\7c4b6637-2b3e-41b5-b54f-227b05d56c51\\.system_generated\\steps';

console.log('Searching step files for CAMPUSLINK_RESULT or cl_keys...');

walkDir(dirPath, (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.md' || ext === '.json' || ext === '.txt') {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('CAMPUSLINK_RESULT') || content.includes('cl_keys') || content.includes('owaissaifi019')) {
        console.log(`Found match in: ${filePath}`);
        // Print some context around match
        const idx = content.indexOf('CAMPUSLINK_RESULT');
        if (idx !== -1) {
          console.log('Match context (CAMPUSLINK_RESULT):', content.substring(Math.max(0, idx - 100), Math.min(content.length, idx + 1000)));
        } else {
          const idx2 = content.indexOf('cl_keys');
          if (idx2 !== -1) {
            console.log('Match context (cl_keys):', content.substring(Math.max(0, idx2 - 100), Math.min(content.length, idx2 + 1000)));
          }
        }
      }
    } catch (e) {}
  }
});
