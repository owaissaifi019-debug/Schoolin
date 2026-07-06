const fs = require('fs');
const path = require('path');

const transcriptPath = 'C:\\Users\\Mohd Anas\\.gemini\\antigravity-ide\\brain\\57db4aee-5d85-45ce-a871-b51ede4697ec\\.system_generated\\logs\\transcript.jsonl';

if (!fs.existsSync(transcriptPath)) {
  console.log('Transcript not found');
  process.exit(1);
}

const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n');

lines.forEach((line, index) => {
  if (!line.trim()) return;
  try {
    const parsed = JSON.parse(line);
    // Find tool calls or tool output for console logs
    if (line.includes('capture_browser_console_logs') || line.includes('ConsoleLogs') || line.includes('console')) {
      console.log(`\n--- Step ${parsed.step_index} (${parsed.type}) ---`);
      if (parsed.tool_calls) {
        console.log("Tool Call:", JSON.stringify(parsed.tool_calls, null, 2));
      }
      if (parsed.content) {
        console.log("Output content:", parsed.content.substring(0, 1000));
      }
    }
  } catch (e) {
    console.error(e);
  }
});
