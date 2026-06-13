const fs = require('fs');

const content = fs.readFileSync('C:\\Users\\Mohd Anas\\.gemini\\antigravity-ide\\brain\\7c4b6637-2b3e-41b5-b54f-227b05d56c51\\.system_generated\\steps\\162\\content.md', 'utf8');
const lines = content.split(/\r?\n/);

const terms = ['cl_keys', 'auth_keys', 'access_token', 'JSON', 'Object.keys'];

lines.forEach((line, index) => {
  terms.forEach((term) => {
    if (line.includes(term)) {
      console.log(`Found "${term}" in served auth.js at line ${index + 1}:`);
      console.log(`  > ${line.trim()}`);
    }
  });
});
