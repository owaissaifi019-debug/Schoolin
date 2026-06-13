const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        walkDir(filePath, callback);
      }
    } else {
      callback(filePath);
    }
  }
}

const terms = ['top-bar-title', 'current-date-display', 'cl_keys', 'auth_keys'];

walkDir(path.join(__dirname, '..'), (filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/);
    lines.forEach((line, index) => {
      terms.forEach((term) => {
        if (line.includes(term)) {
          console.log(`Found "${term}" in ${path.relative(path.join(__dirname, '..'), filePath)} at line ${index + 1}:`);
          console.log(`  > ${line.trim()}`);
        }
      });
    });
  } catch (e) {}
});
