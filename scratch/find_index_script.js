const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');

const regex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
let match;
let count = 0;

while ((match = regex.exec(content)) !== null) {
  count++;
  console.log(`\n--- Script Tag #${count} ---`);
  console.log('Full Opening Tag:', match[0].substring(0, match[0].indexOf('>') + 1));
  const inner = match[1].trim();
  if (inner) {
    console.log('Inline Content:');
    console.log(inner);
  } else {
    console.log('(External script)');
  }
}

console.log(`\nTotal scripts found: ${count}`);
