const fs = require('fs');
try {
  fs.copyFileSync('school-profile.js', 'www/school-profile.js');
  console.log('Copied school-profile.js to www/school-profile.js successfully!');
} catch (err) {
  console.error('Error copying file:', err);
}
