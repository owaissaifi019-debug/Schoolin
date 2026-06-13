const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, '../admin/admin.js'), 'utf8');
const lines = content.split(/\r?\n/);

const SEARCH_TERMS = ['current-date-display', 'top-bar-title', 'currentDateDisplay', 'topBarTitle', 'session', 'auth', 'supabase'];

lines.forEach((line, index) => {
  SEARCH_TERMS.forEach((term) => {
    if (line.includes(term)) {
      console.log(`Found "${term}" at line ${index + 1}:`);
      console.log(`  > ${line.trim()}`);
    }
  });
});
