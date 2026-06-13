const fs = require('fs');
const readline = require('readline');
const path = require('path');

const filePath = 'C:\\Users\\Mohd Anas\\.gemini\\antigravity-ide\\brain\\7c4b6637-2b3e-41b5-b54f-227b05d56c51\\.system_generated\\logs\\transcript.jsonl';

const fileStream = fs.createReadStream(filePath);
const rl = readline.createInterface({
  input: fileStream,
  crlfDelay: Infinity
});

rl.on('line', (line) => {
  // Let's print any lines that look like they are tool results containing logs or HTML content
  if (line.includes('console.log') || line.includes('99A03956DCF6F2CA9FF60BCD3F50D83F') || line.includes('browser_get_dom') || line.includes('console_logs') || line.includes('ConsoleLogs')) {
    try {
      const parsed = JSON.parse(line);
      if (parsed.type === 'SUBAGENT_LOG' || parsed.type === 'SUBAGENT_STEP' || parsed.type === 'RUN_COMMAND' || parsed.tool_calls) {
        console.log('\n--- MATCH ---');
        console.log('Type:', parsed.type);
        console.log('Keys:', Object.keys(parsed));
        const str = JSON.stringify(parsed);
        console.log(str.substring(0, 1000));
      }
    } catch (e) {}
  }
});
