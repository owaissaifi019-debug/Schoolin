
# sync_www.ps1 - Synchronize frontend files from root to www directory
$src = "E:\Owais\School Idea\SchoolIn"
$dst = "E:\Owais\School Idea\SchoolIn\www"

Write-Host "=== CampusLink WWW Sync Script ===" -ForegroundColor Cyan
Write-Host "Source: $src"
Write-Host "Destination: $dst"
Write-Host ""

# ─────────────────────────────────────────
# STEP 1: Define frontend files to copy from root level
# ─────────────────────────────────────────
$rootFiles = @(
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
)

# ─────────────────────────────────────────
# STEP 2: Copy root-level frontend files
# ─────────────────────────────────────────
Write-Host "--- Copying root-level files ---" -ForegroundColor Yellow
$copiedRoot = 0
$missingSrc = @()

foreach ($file in $rootFiles) {
    $srcFile = Join-Path $src $file
    $dstFile = Join-Path $dst $file
    if (Test-Path $srcFile) {
        Copy-Item -Path $srcFile -Destination $dstFile -Force
        Write-Host "  COPIED: $file"
        $copiedRoot++
    } else {
        Write-Host "  MISSING IN SRC: $file" -ForegroundColor Red
        $missingSrc += $file
    }
}

# ─────────────────────────────────────────
# STEP 3: Copy admin folder
# ─────────────────────────────────────────
Write-Host ""
Write-Host "--- Copying admin folder ---" -ForegroundColor Yellow
$srcAdmin = Join-Path $src "admin"
$dstAdmin = Join-Path $dst "admin"

if (-not (Test-Path $dstAdmin)) {
    New-Item -ItemType Directory -Path $dstAdmin -Force | Out-Null
}

$adminFiles = Get-ChildItem -Path $srcAdmin -File
$copiedAdmin = 0
foreach ($file in $adminFiles) {
    Copy-Item -Path $file.FullName -Destination (Join-Path $dstAdmin $file.Name) -Force
    Write-Host "  COPIED: admin\$($file.Name)"
    $copiedAdmin++
}

# ─────────────────────────────────────────
# STEP 4: Copy css folder (including core subfolder)
# ─────────────────────────────────────────
Write-Host ""
Write-Host "--- Copying css folder ---" -ForegroundColor Yellow
$srcCss = Join-Path $src "css"
$dstCss = Join-Path $dst "css"

if (-not (Test-Path $dstCss)) {
    New-Item -ItemType Directory -Path $dstCss -Force | Out-Null
}
if (-not (Test-Path (Join-Path $dstCss "core"))) {
    New-Item -ItemType Directory -Path (Join-Path $dstCss "core") -Force | Out-Null
}

$copiedCss = 0
# Top-level css files
$cssFiles = Get-ChildItem -Path $srcCss -File
foreach ($file in $cssFiles) {
    Copy-Item -Path $file.FullName -Destination (Join-Path $dstCss $file.Name) -Force
    Write-Host "  COPIED: css\$($file.Name)"
    $copiedCss++
}
# core subfolder
$cssCoreFiles = Get-ChildItem -Path (Join-Path $srcCss "core") -File
foreach ($file in $cssCoreFiles) {
    Copy-Item -Path $file.FullName -Destination (Join-Path $dstCss "core\$($file.Name)") -Force
    Write-Host "  COPIED: css\core\$($file.Name)"
    $copiedCss++
}

# ─────────────────────────────────────────
# STEP 5: Remove stale files from www that should NOT be there
# ─────────────────────────────────────────
Write-Host ""
Write-Host "--- Removing stale files from www ---" -ForegroundColor Yellow

# Build the expected set of files in www root
$expectedWwwFiles = $rootFiles + @()  # same set as root files

$staleRemoved = 0
$wwwRootFiles = Get-ChildItem -Path $dst -File
foreach ($file in $wwwRootFiles) {
    if ($file.Name -notin $expectedWwwFiles) {
        Write-Host "  STALE REMOVED: $($file.Name)" -ForegroundColor Magenta
        Remove-Item -Path $file.FullName -Force
        $staleRemoved++
    }
}

# Remove stale files in www\css (not in source css folder)
$srcCssFileNames = (Get-ChildItem -Path $srcCss -File).Name
$wwwCssFiles = Get-ChildItem -Path $dstCss -File
foreach ($file in $wwwCssFiles) {
    if ($file.Name -notin $srcCssFileNames) {
        Write-Host "  STALE REMOVED: css\$($file.Name)" -ForegroundColor Magenta
        Remove-Item -Path $file.FullName -Force
        $staleRemoved++
    }
}

# Remove stale files in www\css\core
$srcCssCoreFileNames = (Get-ChildItem -Path (Join-Path $srcCss "core") -File).Name
$wwwCssCoreFiles = Get-ChildItem -Path (Join-Path $dstCss "core") -File
foreach ($file in $wwwCssCoreFiles) {
    if ($file.Name -notin $srcCssCoreFileNames) {
        Write-Host "  STALE REMOVED: css\core\$($file.Name)" -ForegroundColor Magenta
        Remove-Item -Path $file.FullName -Force
        $staleRemoved++
    }
}

# Remove stale files in www\admin
$srcAdminFileNames = (Get-ChildItem -Path $srcAdmin -File).Name
$wwwAdminFiles = Get-ChildItem -Path $dstAdmin -File
foreach ($file in $wwwAdminFiles) {
    if ($file.Name -notin $srcAdminFileNames) {
        Write-Host "  STALE REMOVED: admin\$($file.Name)" -ForegroundColor Magenta
        Remove-Item -Path $file.FullName -Force
        $staleRemoved++
    }
}

# ─────────────────────────────────────────
# STEP 6: Verify www/index.html exists
# ─────────────────────────────────────────
Write-Host ""
Write-Host "--- Verification ---" -ForegroundColor Yellow
$indexExists = Test-Path (Join-Path $dst "index.html")
Write-Host "  www/index.html exists: $indexExists"

# ─────────────────────────────────────────
# STEP 7: Summary
# ─────────────────────────────────────────
$totalCopied = $copiedRoot + $copiedAdmin + $copiedCss
Write-Host ""
Write-Host "=== SYNC COMPLETE ===" -ForegroundColor Green
Write-Host "Root files copied    : $copiedRoot"
Write-Host "Admin files copied   : $copiedAdmin"
Write-Host "CSS files copied     : $copiedCss"
Write-Host "Total files copied   : $totalCopied"
Write-Host "Stale files removed  : $staleRemoved"
Write-Host "www/index.html exists: $indexExists"
if ($missingSrc.Count -gt 0) {
    Write-Host "WARNING - Files listed but missing in src:" -ForegroundColor Red
    $missingSrc | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
} else {
    Write-Host "No missing source files detected." -ForegroundColor Green
}
