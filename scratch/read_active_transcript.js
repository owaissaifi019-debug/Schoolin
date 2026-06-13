const fs = require('fs');
const path = require('path');

const transcriptPath = 'C:\\Users\\Mohd Anas\\.gemini\\antigravity-ide\\brain\\7c4b6637-2b3e-41b5-b54f-227b05d56c51\\.system_generated\\logs\\transcript.jsonl';
const outputPath = path.join(__dirname, 'active_transcript_slice.txt');

if (!fs.existsSync(transcriptPath)) {
  console.log('Transcript not found');
  process.exit(1);
}

const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n');
let out = '';

lines.forEach((line, index) => {
  try {
    const parsed = JSON.parse(line);
    out += `\n======================================================================\n`;
    out += `Line ${index + 1} | Step ${parsed.step_index} | Type: ${parsed.type} | Status: ${parsed.status}\n`;
    if (parsed.content) {
      out += `Content: ${parsed.content}\n`;
    }
    if (parsed.tool_calls) {
      out += `Tool Calls: ${JSON.stringify(parsed.tool_calls, null, 2)}\n`;
    }
  } catch (e) {}
});

fs.writeFileSync(outputPath, out);
console.log('Written active transcript slice to scratch/active_transcript_slice.txt');
