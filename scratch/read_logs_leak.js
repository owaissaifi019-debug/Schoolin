const fs = require('fs');
const path = require('path');
const readline = require('readline');

const logsPath = path.join('C:', 'Users', 'Mohd Anas', '.gemini', 'antigravity-ide', 'brain', '7c4b6637-2b3e-41b5-b54f-227b05d56c51', '.system_generated', 'logs', 'transcript.jsonl');

async function run() {
  const fileStream = fs.createReadStream(logsPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    if (line.includes('CAMPUSLINK_RESULT')) {
      // Parse JSON line
      try {
        const obj = JSON.parse(line);
        console.log('--- MATCH FOUND IN LOGS ---');
        console.log('Type:', obj.type);
        console.log('Content preview:', typeof obj.content === 'string' ? obj.content.substring(0, 500) : obj.content);
        if (obj.tool_calls) {
          console.log('Tool calls:', JSON.stringify(obj.tool_calls, null, 2));
        }
      } catch (e) {
        console.log('Line matched but failed to parse JSON:', line.substring(0, 300));
      }
    }
  }
}

run();
