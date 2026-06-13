const fs = require('fs');
const path = require('path');

const files = [
  'active_transcript_slice.txt',
  'full_history_slice.txt',
  'transcript_results.txt'
];

for (const file of files) {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    console.log(`File does not exist: ${file}`);
    continue;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  console.log(`Searching in ${file}...`);
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('CAMPUSLINK_RESULT') || line.includes('index.html:0:73') || line.includes('index.html:1:')) {
      console.log(`  Line ${idx+1}: ${line.trim().substring(0, 300)}`);
    }
  });
}
