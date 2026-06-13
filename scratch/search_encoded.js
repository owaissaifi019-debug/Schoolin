const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'scratch') {
        walk(filePath, callback);
      }
    } else {
      if (filePath.endsWith('.js') || filePath.endsWith('.html')) {
        callback(filePath);
      }
    }
  });
}

const terms = ['atob', 'btoa', 'eval', 'Function(', 'String.fromCharCode', 'decodeURIComponent'];

walk(path.join(__dirname, '..'), (filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      terms.forEach(term => {
        if (line.includes(term)) {
          console.log(`Found "${term}" in ${path.relative(path.join(__dirname, '..'), filePath)} at line ${idx + 1}:`);
          console.log(`  > ${line.trim()}`);
        }
      });
    });
  } catch (e) {}
});
console.log('Obfuscation search complete.');
