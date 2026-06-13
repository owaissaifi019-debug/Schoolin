const fs = require('fs');
const path = require('path');

const files = [
  'admin/admin.js',
  'admin/index.html',
  'auth.js',
  'supabase.js'
];

for (const relPath of files) {
  const filePath = path.join(__dirname, '..', relPath);
  if (!fs.existsSync(filePath)) {
    console.log(`File does not exist: ${relPath}`);
    continue;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  console.log(`=== ANALYZING ${relPath} ===`);
  
  // Search for event listener bindings
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('addEventListener') || line.includes('on') || line.includes('eval') || line.includes('localStorage') || line.includes('sessionStorage') || line.includes('window.') || line.includes('document.')) {
      // Print lines of interest
      if (line.includes('scroll') || line.includes('onscroll') || line.includes('prepend') || line.includes('insert') || line.includes('cl_keys') || line.includes('auth_keys')) {
        console.log(`Line ${idx+1} [INTERESTING]: ${line.trim()}`);
      }
    }
  });
}
