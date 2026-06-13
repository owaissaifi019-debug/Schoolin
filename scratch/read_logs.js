const fs = require('fs');
const readline = require('readline');
const path = require('path');

const logPath = 'C:/Users/Mohd Anas/.gemini/antigravity-ide/brain/4248a135-0976-4ece-9dfc-de80571e28e3/.system_generated/logs/transcript.jsonl';

const rl = readline.createInterface({
  input: fs.createReadStream(logPath),
  crlfDelay: Infinity
});

let lineNum = 0;
rl.on('line', (line) => {
  lineNum++;
  if (line.toLowerCase().includes('bottom') || line.toLowerCase().includes('plain text') || line.toLowerCase().includes('interactive')) {
    try {
      const parsed = JSON.parse(line);
      console.log(`Line ${lineNum} [Type: ${parsed.type || 'unknown'}]:`);
      if (parsed.content) {
        console.log(`  Content: ${parsed.content.substring(0, 500)}`);
      }
      if (parsed.tool_calls) {
        console.log(`  Tool Calls: ${JSON.stringify(parsed.tool_calls).substring(0, 500)}`);
      }
    } catch (e) {
      console.log(`Line ${lineNum} [Raw match]: ${line.substring(0, 300)}`);
    }
  }
});
