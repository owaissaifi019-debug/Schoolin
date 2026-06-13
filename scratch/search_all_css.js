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
      if (filePath.endsWith('.css')) {
        callback(filePath);
      }
    }
  });
}

walk(path.join(__dirname, '..'), (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('me-dropdown') || line.includes('profile-link')) {
      console.log(`Found in ${path.relative(path.join(__dirname, '..'), filePath)} at line ${idx + 1}: ${line.trim()}`);
    }
  });
});
