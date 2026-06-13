const fs = require('fs');
const path = require('path');

const rootDir = 'C:\\Users\\Mohd Anas\\.gemini\\antigravity-ide';

function walk(dir, callback) {
  try {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat && stat.isDirectory()) {
        walk(filePath, callback);
      } else {
        callback(filePath);
      }
    });
  } catch (e) {}
}

console.log('Searching all files in App Data Directory...');
walk(rootDir, (filePath) => {
  if (filePath.endsWith('.js') || filePath.endsWith('.html') || filePath.endsWith('.json') || filePath.endsWith('.md') || filePath.endsWith('.txt') || filePath.endsWith('.jsonl')) {
    // Avoid current script
    if (filePath.includes('search_brain.js')) return;
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('CAMPUSLINK_RESULT') || content.includes('cl_keys')) {
        console.log(`Found in: ${filePath}`);
        // print a few lines around the match
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          if (line.includes('CAMPUSLINK_RESULT') || line.includes('cl_keys')) {
            console.log(`  Line ${idx + 1}: ${line.trim().substring(0, 200)}`);
          }
        });
      }
    } catch (e) {}
  }
});
console.log('Search finished.');
