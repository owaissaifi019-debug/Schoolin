const fs = require('fs');
const readline = require('readline');
const path = require('path');

const filePath = 'C:\\Users\\Mohd Anas\\.gemini\\antigravity-ide\\brain\\7c4b6637-2b3e-41b5-b54f-227b05d56c51\\.system_generated\\logs\\transcript.jsonl';

const fileStream = fs.createReadStream(filePath);
const rl = readline.createInterface({
  input: fileStream,
  crlfDelay: Infinity
});

console.log('Reading transcript.jsonl...');

rl.on('line', (line) => {
  if (line.includes('CAMPUSLINK_RESULT') || line.includes('cl_keys')) {
    try {
      const parsed = JSON.parse(line);
      console.log('\n--- MATCH FOUND ---');
      console.log('Type:', parsed.type);
      console.log('Status:', parsed.status);
      
      // Print context/content
      const contentStr = JSON.stringify(parsed.content || parsed.tool_calls || parsed);
      const idx = contentStr.indexOf('CAMPUSLINK_RESULT');
      if (idx !== -1) {
        console.log('Match context (CAMPUSLINK_RESULT):');
        console.log(contentStr.substring(Math.max(0, idx - 100), Math.min(contentStr.length, idx + 2000)));
      } else {
        const idx2 = contentStr.indexOf('cl_keys');
        if (idx2 !== -1) {
          console.log('Match context (cl_keys):');
          console.log(contentStr.substring(Math.max(0, idx2 - 100), Math.min(contentStr.length, idx2 + 2000)));
        }
      }
    } catch (e) {
      console.log('Error parsing line:', e.message);
    }
  }
});

rl.on('close', () => {
  console.log('\nFinished reading transcript.');
});
