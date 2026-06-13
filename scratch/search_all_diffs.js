const fs = require('fs');
const path = require('path');

const diffPath = path.join(__dirname, 'all_diffs.txt');
if (!fs.existsSync(diffPath)) {
  console.log('all_diffs.txt not found');
  process.exit(1);
}

const content = fs.readFileSync(diffPath, 'utf8');
const lines = content.split('\n');

console.log('Searching added lines in git diff...');
let currentFile = '';
lines.forEach((line, idx) => {
  if (line.startsWith('diff --git')) {
    currentFile = line.substring(11);
  }
  if (line.startsWith('+') && !line.startsWith('+++')) {
    const addedContent = line.substring(1);
    const keywords = ['console.', 'JSON.', 'stringify', 'prepend', 'append', 'innerHTML', 'textContent', 'CampusLink'];
    keywords.forEach(kw => {
      if (addedContent.includes(kw)) {
        console.log(`Match for "${kw}" in ${currentFile} at line ${idx + 1}:`);
        console.log(`  > ${addedContent.trim()}`);
      }
    });
  }
});
console.log('Search finished.');
