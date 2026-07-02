const fs = require('fs');
const path = require('path');

const filePath = path.join('e:', 'Owais', 'School Idea', 'SchoolIn', 'dashboard.js');
const content = fs.readFileSync(filePath, 'utf8');

// The file currently has:
// [Lines 1-2851]: Good code (correct init + DOMContentLoaded close at end)
// [Lines 2852-3946]: Orphaned classroom code
// [Lines 3947-3961]: Duplicate init section + second DOMContentLoaded close

// Strategy: Find the first }); that closes the DOMContentLoaded event
// and remove everything between it and the second }); at the end

// The marker for the end of good code (first });) is just after:
//   }); (the loadDashboardData().then block closing)
// followed by
// }); (the DOMContentLoaded closing)
// 
// Then the orphan starts with: ];\n  const DEFAULT_ASSIGNMENTS
// And ends with something before the second // --- Init Dashboard Rendering ---

// We'll find the index of the orphan marker
const ORPHAN_START_MARKER = '});\n  ];\n  const DEFAULT_ASSIGNMENTS';
const ORPHAN_END_MARKER = '\n  // --- Init Dashboard Rendering ---\n  loadDashboardData().then(';

const startIdx = content.indexOf(ORPHAN_START_MARKER);
const endIdx = content.indexOf(ORPHAN_END_MARKER);

if (startIdx === -1) {
  console.error('START MARKER NOT FOUND');
  process.exit(1);
}
if (endIdx === -1) {
  console.error('END MARKER NOT FOUND');
  process.exit(1);
}

console.log(`Found orphan block: chars ${startIdx} to ${endIdx}`);
console.log(`Removing ${endIdx - startIdx - 3} characters of orphaned code`);

// Keep everything before the orphan's ];\n content (i.e. keep the });\n)
// and keep everything from the second init section onwards
const beforeOrphan = content.substring(0, startIdx + 3); // include the });\n
const afterOrphan = content.substring(endIdx + 1); // skip the leading \n before the good init

const cleaned = beforeOrphan + '\n' + afterOrphan;

fs.writeFileSync(filePath, cleaned, 'utf8');
console.log('Done! Cleaned file written.');

// Verify
const result = fs.readFileSync(filePath, 'utf8');
const lines = result.split('\n');
console.log(`Result file has ${lines.length} lines`);
