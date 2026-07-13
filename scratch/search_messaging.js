const fs = require('fs');
const code = fs.readFileSync('e:\\Owais\\School Idea\\SchoolIn\\messaging.js', 'utf8');
const lines = code.split('\n');

console.log('--- Search Results for selectedMobileMessageId ---');
lines.forEach((line, index) => {
  if (line.includes('selectedMobileMessageId') || line.includes('long') || line.includes('press') || line.includes('context')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
