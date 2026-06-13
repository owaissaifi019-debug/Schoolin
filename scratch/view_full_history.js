const fs = require('fs');
const path = require('path');

const oldTranscriptPath = 'C:\\Users\\Mohd Anas\\.gemini\\antigravity-ide\\brain\\f15386b9-859a-455f-b1de-74dadf8ff40f\\.system_generated\\logs\\transcript.jsonl';
const outputPath = path.join(__dirname, 'full_history_slice.txt');

if (!fs.existsSync(oldTranscriptPath)) {
  console.log('Old transcript not found');
  process.exit(1);
}

const lines = fs.readFileSync(oldTranscriptPath, 'utf8').split('\n');
let out = '';

lines.forEach((line, index) => {
  try {
    const parsed = JSON.parse(line);
    if (parsed.step_index >= 490 && parsed.step_index <= 542) {
      out += `\n======================================================================\n`;
      out += `Line ${index + 1} | Step ${parsed.step_index} | Type: ${parsed.type} | Status: ${parsed.status}\n`;
      if (parsed.content) {
        out += `Content: ${parsed.content}\n`;
      }
      if (parsed.tool_calls) {
        out += `Tool Calls: ${JSON.stringify(parsed.tool_calls, null, 2)}\n`;
      }
      // If it is a tool output step, it might have content in the 'content' field
    }
  } catch (e) {}
});

fs.writeFileSync(outputPath, out);
console.log('Written to scratch/full_history_slice.txt');
