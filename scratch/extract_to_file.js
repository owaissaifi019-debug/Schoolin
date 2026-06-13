const fs = require('fs');
const path = require('path');

const oldTranscriptPath = 'C:\\Users\\Mohd Anas\\.gemini\\antigravity-ide\\brain\\f15386b9-859a-455f-b1de-74dadf8ff40f\\.system_generated\\logs\\transcript.jsonl';
const outputPath = path.join(__dirname, 'transcript_results.txt');

if (!fs.existsSync(oldTranscriptPath)) {
  fs.writeFileSync(outputPath, 'Old transcript file not found at: ' + oldTranscriptPath);
  process.exit(0);
}

const lines = fs.readFileSync(oldTranscriptPath, 'utf8').split('\n');
let out = '';

lines.forEach((line, index) => {
  if (line.includes('CAMPUSLINK_RESULT') || line.includes('cl_keys')) {
    try {
      const parsed = JSON.parse(line);
      out += `\n======================================================================\n`;
      out += `Line ${index + 1} | Step ${parsed.step_index} | Type: ${parsed.type} | Status: ${parsed.status}\n`;
      if (parsed.thinking) {
        out += `Thinking: ${parsed.thinking.substring(0, 500)}\n`;
      }
      if (parsed.content) {
        out += `Content: ${parsed.content}\n`;
      }
      if (parsed.tool_calls) {
        out += `Tool Calls: ${JSON.stringify(parsed.tool_calls, null, 2)}\n`;
      }
      // If the tool response or output has the match, print it
      const responseStr = JSON.stringify(parsed);
      const matchIdx = responseStr.indexOf('CAMPUSLINK_RESULT');
      if (matchIdx !== -1) {
        out += `Match Context: ... ${responseStr.substring(Math.max(0, matchIdx - 150), Math.min(responseStr.length, matchIdx + 1200))} ...\n`;
      }
    } catch (e) {
      out += `Non-JSON match at line ${index + 1}: ${line.substring(0, 1000)}\n`;
    }
  }
});

fs.writeFileSync(outputPath, out);
console.log('Results written to scratch/transcript_results.txt');
