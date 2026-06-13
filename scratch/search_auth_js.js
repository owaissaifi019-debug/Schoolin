const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, '../auth.js'), 'utf8');
const lines = content.split(/\r?\n/);

const SEARCH_TERMS = ['JSON', 'Object.keys', 'alert', 'console.log', 'textContent', 'innerHTML', 'innerText', 'document.write', 'document.body'];

lines.forEach((line, index) => {
  SEARCH_TERMS.forEach((term) => {
    if (line.includes(term)) {
      console.log(`Found "${term}" at line ${index + 1}:`);
      console.log(`  > ${line.trim()}`);
    }
  });
});
