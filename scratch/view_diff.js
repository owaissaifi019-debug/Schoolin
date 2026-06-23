const { execSync } = require('child_process');
const repoPath = 'e:\\Owais\\School Idea\\SchoolIn';
try {
  console.log('--- GIT DIFF PROFILE.HTML ---');
  const diff = execSync('git diff profile.html', { cwd: repoPath, encoding: 'utf8' });
  console.log(diff);
} catch (error) {
  console.error('Error running git diff:', error.message);
  if (error.stdout) console.error('Stdout:', error.stdout);
  if (error.stderr) console.error('Stderr:', error.stderr);
}
