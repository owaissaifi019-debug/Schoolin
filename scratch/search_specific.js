const fs = require('fs');
const path = require('path');

const filesToSearch = [
  'admin/admin.js',
  'admin/index.html',
  'supabase.js',
  'auth.js',
  'style.css'
];

const terms = ['cl_keys', 'auth_keys', 'access_token', 'getSession', 'window.CampusLink', 'JSON', 'Object.keys'];

console.log('Searching specific files...');

filesToSearch.forEach((relPath) => {
  const filePath = path.join(__dirname, '..', relPath);
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${relPath}`);
    return;
  }
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/);
    lines.forEach((line, index) => {
      terms.forEach((term) => {
        if (line.includes(term)) {
          console.log(`Found "${term}" in ${relPath} at line ${index + 1}:`);
          console.log(`  > ${line.trim()}`);
        }
      });
    });
  } catch (e) {
    console.log(`Error reading ${relPath}:`, e.message);
  }
});

console.log('Search finished.');
