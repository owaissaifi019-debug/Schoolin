const { execSync } = require('child_process');
const path = require('path');

const repoPath = 'e:\\Owais\\School Idea\\SchoolIn';

try {
  console.log('--- GIT STATUS ---');
  const status = execSync('git status', { cwd: repoPath, encoding: 'utf8' });
  console.log(status);

  console.log('--- GIT LOG ---');
  const log = execSync('git log -n 5 --oneline', { cwd: repoPath, encoding: 'utf8' });
  console.log(log);
} catch (error) {
  console.error('Error running git commands:', error.message);
  if (error.stdout) console.error('Stdout:', error.stdout);
  if (error.stderr) console.error('Stderr:', error.stderr);
}
