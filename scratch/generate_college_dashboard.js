const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');

// 1. Generate college-dashboard.html
const htmlPath = path.join(rootDir, 'dashboard.html');
const targetHtmlPath = path.join(rootDir, 'college-dashboard.html');

console.log('Reading dashboard.html...');
let html = fs.readFileSync(htmlPath, 'utf8');

// Replacements for HTML
const htmlReplacements = [
  { search: 'School Admin Dashboard | CampusLink', replace: 'College Admin Dashboard | CampusLink' },
  { search: 'Manage your school\'s events', replace: 'Manage your college\'s events' },
  { search: 'School Portal', replace: 'College Portal' },
  { search: 'School Admin', replace: 'College Admin' },
  { search: 'School Profile', replace: 'College Profile' },
  { search: 'School Profile Settings', replace: 'College Profile Settings' },
  { search: 'School Logo', replace: 'College Logo' },
  { search: 'School Name', replace: 'College Name' },
  { search: 'School Representative', replace: 'College Representative' },
  { search: 'School Partner', replace: 'College Partner' },
  { search: 'My School', replace: 'My College' },
  { search: 'Edit School', replace: 'Edit College' },
  { search: 'Describe your school\'s vision', replace: 'Describe your college\'s vision' },
  { search: 'Manage your school\'s academic structure', replace: 'Manage your college\'s academic structure' },
  { search: 'school-profile.html', replace: 'college-profile.html' },
  { search: 'school-admin-body', replace: 'college-admin-body' },
  { search: 'dashboard.js?v=1.9', replace: 'college-dashboard.js?v=1.9' }
];

htmlReplacements.forEach(({ search, replace }) => {
  html = html.replaceAll(search, replace);
});

console.log('Writing college-dashboard.html...');
fs.writeFileSync(targetHtmlPath, html, 'utf8');

// 2. Generate college-dashboard.js
const jsPath = path.join(rootDir, 'dashboard.js');
const targetJsPath = path.join(rootDir, 'college-dashboard.js');

console.log('Reading dashboard.js...');
let js = fs.readFileSync(jsPath, 'utf8');

// Replacements for JS
const jsReplacements = [
  // Redirection guard replacement
  {
    search: `if (school.institution_type === 'college') {
      window.location.href = 'college-dashboard.html';
      return;
    }`,
    replace: `if (school.institution_type !== 'college') {
      window.location.href = 'dashboard.html';
      return;
    }`
  },
  // General text terminology
  { search: 'School Admin Dashboard', replace: 'College Admin Dashboard' },
  { search: 'School Profile Settings', replace: 'College Profile Settings' },
  { search: 'School Representative', replace: 'College Representative' },
  { search: 'School Admin', replace: 'College Admin' },
  { search: 'School Partner', replace: 'College Partner' },
  { search: 'School Profile', replace: 'College Profile' },
  { search: 'My School', replace: 'My College' },
  { search: 'Edit School', replace: 'Edit College' },
  { search: 'No school associated with this administrator account.', replace: 'No college associated with this administrator account.' },
  { search: 'Administrator account has no associated school record.', replace: 'Administrator account has no associated college record.' },
  { search: 'Loading school...', replace: 'Loading college...' }
];

jsReplacements.forEach(({ search, replace }) => {
  js = js.replaceAll(search, replace);
});

console.log('Writing college-dashboard.js...');
fs.writeFileSync(targetJsPath, js, 'utf8');

console.log('Success! College dashboard files generated successfully.');
