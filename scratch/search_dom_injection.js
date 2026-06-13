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

const patterns = [
  'prepend',
  'document.write',
  'insertAdjacentHTML',
  'innerHTML',
  'createElement',
  'insertBefore'
];

walk(path.join(__dirname, '..'), (filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      patterns.forEach(pattern => {
        if (line.includes(pattern)) {
          // Exclude standard common things like innerHTML = '' to keep output clean
          if (line.includes("innerHTML = ''") || line.includes("innerHTML = \"\"")) return;
          console.log(`Found "${pattern}" in ${path.relative(path.join(__dirname, '..'), filePath)} at line ${idx + 1}:`);
          console.log(`  > ${line.trim()}`);
        }
      });
    });
  } catch (e) {}
});
console.log('DOM search complete.');
