const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        walk(filePath, callback);
      }
    } else {
      callback(filePath);
    }
  });
}

const terms = ['CAMPUSLINK_RESULT', 'cl_keys', 'auth_keys'];

walk(path.join(__dirname, '..'), (filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    terms.forEach(term => {
      if (content.includes(term)) {
        console.log(`Match for "${term}" in file: ${filePath}`);
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          if (line.includes(term)) {
            console.log(`  Line ${idx + 1}: ${line.trim()}`);
          }
        });
      }
    });
  } catch (e) {
    // Ignore binary/read errors
  }
});
console.log('Search complete.');
