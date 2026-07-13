const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '..');
const dstDir = path.resolve(srcDir, 'www');

const rootFiles = [
    "about.html",
    "admin.css",
    "admissions.css",
    "admissions.html",
    "admissions.js",
    "app.js",
    "apply-admission.html",
    "apply-admission.js",
    "attendance.js",
    "auth.js",
    "child-safety.html",
    "classroom.html",
    "classroom.js",
    "classrooms.js",
    "college-dashboard.html",
    "college-dashboard.js",
    "college-profile.html",
    "complete-profile.html",
    "complete-profile.js",
    "create-classroom.html",
    "create-classroom.js",
    "dashboard.html",
    "dashboard.js",
    "delete-account.html",
    "event-detail.html",
    "event-detail.js",
    "events.css",
    "events.html",
    "events.js",
    "index.html",
    "join-alumni.html",
    "join-school.html",
    "login.html",
    "login.js",
    "logo.png",
    "messaging.css",
    "messaging.html",
    "messaging.js",
    "mobile-nav.js",
    "networking.html",
    "networking.js",
    "notifications.js",
    "privacy-policy.html",
    "profile.html",
    "profile.js",
    "school-profile.html",
    "school-profile.js",
    "schools.css",
    "schools.html",
    "schools.js",
    "students.js",
    "style.css",
    "supabase.js",
    "teacher_classroom_hub.js",
    "terms-and-conditions.html"
];

// Helper to copy file
function copyFile(src, dst) {
    try {
        fs.copyFileSync(src, dst);
        console.log(`Copied: ${path.basename(src)}`);
    } catch (e) {
        console.error(`Failed to copy ${src} to ${dst}: ${e.message}`);
    }
}

// Ensure destination exists
if (!fs.existsSync(dstDir)) {
    fs.mkdirSync(dstDir, { recursive: true });
}

// Copy root-level files
rootFiles.forEach(file => {
    const srcPath = path.join(srcDir, file);
    const dstPath = path.join(dstDir, file);
    if (fs.existsSync(srcPath)) {
        copyFile(srcPath, dstPath);
    } else {
        console.warn(`Missing root file: ${file}`);
    }
});

// Copy directories
const dirs = ['admin', 'css', 'css/core'];
dirs.forEach(dir => {
    const srcPath = path.join(srcDir, dir);
    const dstPath = path.join(dstDir, dir);
    if (fs.existsSync(srcPath)) {
        if (!fs.existsSync(dstPath)) {
            fs.mkdirSync(dstPath, { recursive: true });
        }
        const items = fs.readdirSync(srcPath, { withFileTypes: true });
        items.forEach(item => {
            if (item.isFile()) {
                copyFile(path.join(srcPath, item.name), path.join(dstPath, item.name));
            }
        });
    } else {
        console.warn(`Missing source directory: ${dir}`);
    }
});

console.log("Synchronization complete!");
