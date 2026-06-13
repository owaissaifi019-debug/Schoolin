const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, '../admin/admin.js'), 'utf8');
const lines = content.split(/\r?\n/);

const SEARCH_TERMS = ['console', 'alert', 'confirm', 'prompt', 'localStorage', 'sessionStorage', 'JSON', 'stringify', 'keys', 'access_token'];

lines.forEach((line, index) => {
  SEARCH_TERMS.forEach((term) => {
    if (line.includes(term)) {
      console.log(`Found "${term}" in admin.js at line ${index + 1}:`);
      console.log(`  > ${line.trim()}`);
    }
  });
});
