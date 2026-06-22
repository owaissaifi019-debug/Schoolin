const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const wwwDir = path.join(rootDir, 'www');
const androidDir = path.join(rootDir, 'android', 'app', 'src', 'main', 'assets', 'public');

const files = ['dashboard.html', 'admin.css', 'dashboard.js'];

function normalize(str) {
  return str.replace(/\r\n/g, '\n').trim();
}

files.forEach(file => {
  console.log(`=== Comparing ${file} ===`);
  const rootPath = path.join(rootDir, file);
  const wwwPath = path.join(wwwDir, file);
  const androidPath = path.join(androidDir, file);

  let rootContent = '', wwwContent = '', androidContent = '';
  try {
    rootContent = fs.readFileSync(rootPath, 'utf8');
  } catch (e) {
    console.error(`Error reading root ${file}:`, e.message);
  }

  try {
    wwwContent = fs.readFileSync(wwwPath, 'utf8');
  } catch (e) {
    console.error(`Error reading www ${file}:`, e.message);
  }

  try {
    androidContent = fs.readFileSync(androidPath, 'utf8');
  } catch (e) {
    console.error(`Error reading android ${file}:`, e.message);
  }

  const rootNorm = normalize(rootContent);
  const wwwNorm = normalize(wwwContent);
  const androidNorm = normalize(androidContent);

  if (rootNorm === wwwNorm) {
    console.log(`✓ Root and WWW are IDENTICAL (length: ${rootNorm.length})`);
  } else {
    console.log(`❌ Root and WWW DIFFER! Root: ${rootNorm.length}, WWW: ${wwwNorm.length}`);
  }

  if (rootNorm === androidNorm) {
    console.log(`✓ Root and Android are IDENTICAL (length: ${rootNorm.length})`);
  } else {
    console.log(`❌ Root and Android DIFFER! Root: ${rootNorm.length}, Android: ${androidNorm.length}`);
  }

  if (wwwNorm === androidNorm) {
    console.log(`✓ WWW and Android are IDENTICAL (length: ${wwwNorm.length})`);
  } else {
    console.log(`❌ WWW and Android DIFFER! WWW: ${wwwNorm.length}, Android: ${androidNorm.length}`);
  }
});
