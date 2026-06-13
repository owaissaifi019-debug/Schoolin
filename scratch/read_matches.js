const fs = require('fs');
const readline = require('readline');
const path = require('path');

const files = [
  'C:\\Users\\Mohd Anas\\.gemini\\antigravity-ide\\brain\\f15386b9-859a-455f-b1de-74dadf8ff40f\\.system_generated\\logs\\transcript.jsonl',
  'C:\\Users\\Mohd Anas\\.gemini\\antigravity-ide\\brain\\7c4b6637-2b3e-41b5-b54f-227b05d56c51\\.system_generated\\logs\\transcript.jsonl'
];

files.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.log('File does not exist:', filePath);
    return;
  }
  console.log(`\nReading matches from: ${filePath}`);
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  lines.forEach((line, lineNum) => {
    if (line.includes('CAMPUSLINK_RESULT') || line.includes('cl_keys')) {
      try {
        const parsed = JSON.parse(line);
        console.log(`\n--- Line ${lineNum + 1} | Step ${parsed.step_index} | Type: ${parsed.type} ---`);
        if (parsed.content && parsed.content.includes('CAMPUSLINK_RESULT')) {
          console.log('Content has CAMPUSLINK_RESULT. Snippet around it:');
          const idx = parsed.content.indexOf('CAMPUSLINK_RESULT');
          console.log(parsed.content.substring(Math.max(0, idx - 100), Math.min(parsed.content.length, idx + 800)));
        }
        if (parsed.tool_calls) {
          const tcStr = JSON.stringify(parsed.tool_calls);
          if (tcStr.includes('CAMPUSLINK_RESULT')) {
            console.log('Tool calls have CAMPUSLINK_RESULT. Snippet:');
            const idx = tcStr.indexOf('CAMPUSLINK_RESULT');
            console.log(tcStr.substring(Math.max(0, idx - 100), Math.min(tcStr.length, idx + 800)));
          }
        }
        // Let's also check if the output/response in the step has it
        const serialized = JSON.stringify(parsed);
        const idx = serialized.indexOf('CAMPUSLINK_RESULT');
        if (idx !== -1) {
          console.log('Serialized JSON match snippet:');
          console.log(serialized.substring(Math.max(0, idx - 100), Math.min(serialized.length, idx + 800)));
        }
      } catch (e) {
        // Maybe not JSON
        if (line.includes('CAMPUSLINK_RESULT')) {
          console.log(`Non-JSON line match: ${line.substring(0, 500)}`);
        }
      }
    }
  });
});
