const fs = require('fs');
const path = require('path');

const SEARCH_TERMS = ['cl_keys', 'auth_keys', 'access_token', 'Object.keys', 'JSON.stringify'];

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
      const ext = path.extname(file).toLowerCase();
      if (ext === '.js' || ext === '.html') {
        callback(filePath);
      }
    }
  }
}

console.log('Starting thorough search of codebase for key terms...');

walkDir(path.join(__dirname, '..'), (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  
  lines.forEach((line, index) => {
    SEARCH_TERMS.forEach((term) => {
      if (line.includes(term)) {
        console.log(`Found "${term}" in ${path.relative(path.join(__dirname, '..'), filePath)} at line ${index + 1}:`);
        console.log(`  > ${line.trim()}`);
      }
    });
  });
});

console.log('Search finished.');
