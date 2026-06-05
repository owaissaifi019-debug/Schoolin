const fs = require('fs');

const css = fs.readFileSync('e:/Owais/School Idea/SchoolIn/style.css', 'utf8');
const lines = css.split('\n');

const query = process.argv[2] || '.dashboard';
console.log(`Searching style.css for query: "${query}"...`);

let matches = 0;
lines.forEach((line, index) => {
  if (line.toLowerCase().includes(query.toLowerCase())) {
    console.log(`L${index + 1}: ${line.trim()}`);
    matches++;
    if (matches >= 20) {
      console.log('... truncated');
      process.exit(0);
    }
  }
});

if (matches === 0) {
  console.log('No matches found.');
}
