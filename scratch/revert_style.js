const { execSync } = require('child_process');
try {
  console.log("Running git checkout...");
  const output = execSync('git checkout -- style.css', {
    cwd: 'e:\\Owais\\School Idea\\SchoolIn',
    encoding: 'utf8'
  });
  console.log("Success:", output);
} catch (err) {
  console.error("Error:", err.message);
}
