const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const rootDir = 'E:\\Owais\\School Idea\\SchoolIn';
const wwwDir = path.join(rootDir, 'www');

// Exclude list
const excludeDirs = [
  'node_modules',
  'android',
  'supabase',
  'scratch',
  '.git',
  '.gemini',
  'docs'
];

const excludeFiles = [
  '.gitignore',
  'package.json',
  'package-lock.json',
  'capacitor.config.json',
  'sync_www.bat',
  'sync_www.ps1',
  'ACADEMIC_DEBUG_REPORT.md',
  'ACADEMIC_MANAGEMENT_PHASE1_REPORT.md',
  'ALUMNI_BATCH_IMPLEMENTATION_REPORT.md',
  'ANDROID_CHROME_RENDERING_ROOT_CAUSE_REPORT.md',
  'CHROME_RENDERING_REPORT.md',
  'COLLEGE_SUPPORT_PHASE_C0_REPORT.md',
  'CONVERSATION_CREATION_UI_REPORT.md',
  'PHASE_4D_ARCHITECTURE_REVISION.md',
  'POST_FEED_AUDIT.md',
  'STUDENT_INVITATION_SYSTEM_REPORT.md',
  'STUDENT_MANAGEMENT_PHASE4_REPORT.md',
  'TEACHER_CLASSROOM_ACCESS_PHASE4C_REPORT.md',
  'TEACHER_CLASSROOM_HUB_PHASE4C_REPORT.md'
];

const deployableExtensions = ['.html', '.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf'];

function getHash(filePath) {
  try {
    const content = fs.readFileSync(filePath);
    // Normalize line endings to avoid git crlf issues
    const normalized = content.toString().replace(/\r\n/g, '\n');
    return crypto.createHash('md5').update(normalized).digest('hex');
  } catch (e) {
    return null;
  }
}

function getAllFiles(dir, baseDir = dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    const relPath = path.relative(baseDir, fullPath);

    if (stat && stat.isDirectory()) {
      const parts = relPath.split(path.sep);
      if (excludeDirs.includes(parts[0])) {
        return;
      }
      results = results.concat(getAllFiles(fullPath, baseDir));
    } else {
      const ext = path.extname(file).toLowerCase();
      if (deployableExtensions.includes(ext) && !excludeFiles.includes(file)) {
        // Also make sure it's not inside www
        const parts = relPath.split(path.sep);
        if (parts[0] !== 'www') {
          results.push(relPath);
        }
      }
    }
  });
  return results;
}

function getWwwFiles(dir, baseDir = dir) {
  let results = [];
  try {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      const relPath = path.relative(baseDir, fullPath);

      if (stat && stat.isDirectory()) {
        const parts = relPath.split(path.sep);
        if (excludeDirs.includes(parts[0])) {
          return;
        }
        results = results.concat(getWwwFiles(fullPath, baseDir));
      } else {
        const ext = path.extname(file).toLowerCase();
        if (deployableExtensions.includes(ext)) {
          results.push(relPath);
        }
      }
    });
  } catch (e) {}
  return results;
}

const rootFiles = getAllFiles(rootDir);
const wwwFiles = getWwwFiles(wwwDir);

const upToDate = [];
const outdated = [];
const missing = [];
const stale = [];

rootFiles.forEach(file => {
  const rootPath = path.join(rootDir, file);
  const wwwPath = path.join(wwwDir, file);

  if (fs.existsSync(wwwPath)) {
    const rootHash = getHash(rootPath);
    const wwwHash = getHash(wwwPath);

    if (rootHash === wwwHash) {
      upToDate.push(file);
    } else {
      outdated.push(file);
    }
  } else {
    missing.push(file);
  }
});

wwwFiles.forEach(file => {
  const rootPath = path.join(rootDir, file);
  if (!fs.existsSync(rootPath)) {
    stale.push(file);
  }
});

console.log(JSON.stringify({
  totalChecked: rootFiles.length,
  upToDateCount: upToDate.length,
  outdatedCount: outdated.length,
  missingCount: missing.length,
  staleCount: stale.length,
  outdatedList: outdated,
  missingList: missing,
  staleList: stale
}, null, 2));
