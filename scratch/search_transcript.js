const fs = require('fs');
const readline = require('readline');

const filePath = 'C:\\Users\\Mohd Anas\\.gemini\\antigravity-ide\\brain\\7c4b6637-2b3e-41b5-b54f-227b05d56c51\\.system_generated\\logs\\transcript.jsonl';

if (!fs.existsSync(filePath)) {
  console.log('Transcript file does not exist at:', filePath);
  process.exit(1);
}

const fileStream = fs.createReadStream(filePath);
const rl = readline.createInterface({
  input: fileStream,
  crlfDelay: Infinity
});

rl.on('line', (line) => {
  if (line.includes('CAMPUSLINK_RESULT') || line.includes('cl_keys')) {
    try {
      const parsed = JSON.parse(line);
      console.log('\n=============================================');
      console.log(`Step: ${parsed.step_index} | Type: ${parsed.type}`);
      if (parsed.content) {
        console.log('Content snippet:', parsed.content.substring(0, 1000));
      }
      if (parsed.tool_calls) {
        console.log('Tool calls:', JSON.stringify(parsed.tool_calls).substring(0, 1000));
      }
      // If it contains a console_logs or similar tool response:
      const serialized = JSON.stringify(parsed);
      const startIdx = serialized.indexOf('CAMPUSLINK_RESULT');
      if (startIdx !== -1) {
        console.log('--- CAMPUSLINK_RESULT Context: ---');
        console.log(serialized.substring(Math.max(0, startIdx - 200), Math.min(serialized.length, startIdx + 1200)));
      }
    } catch (e) {
      console.log('Error parsing line:', e.message);
    }
  }
});

rl.on('close', () => {
  console.log('\nFinished reading transcript.');
});
