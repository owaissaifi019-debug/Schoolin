# CampusLink www folder synchronization script
# This script copies the latest front-end assets from root to www/ for packaging.

$ErrorActionPreference = "Stop"

# Paths
$src = Get-Item .
$dest = Join-Path $src.FullName "www"

Write-Host "Synchronizing CampusLink website assets to $dest..." -ForegroundColor Cyan

# 1. Clean destination directory
if (Test-Path $dest) {
    Write-Host "Cleaning existing files in www/..." -ForegroundColor Yellow
    Get-ChildItem -Path $dest | Remove-Item -Recurse -Force
} else {
    New-Item -ItemType Directory -Path $dest | Out-Null
}

# 2. Re-create subdirectories
$destCss = New-Item -ItemType Directory -Path (Join-Path $dest "css") -Force
$destAdmin = New-Item -ItemType Directory -Path (Join-Path $dest "admin") -Force

# 3. Copy root assets
Write-Host "Copying HTML, JS, and CSS files from root..." -ForegroundColor Gray
Get-ChildItem -Path $src.FullName -File | Where-Object { $_.Extension -match '^\.(html|js|css|png)$' } | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination $dest -Force
}

# 4. Copy css/ directory recursively
Write-Host "Copying css/ folder..." -ForegroundColor Gray
if (Test-Path (Join-Path $src.FullName "css")) {
    Copy-Item -Path (Join-Path $src.FullName "css\*") -Destination $destCss.FullName -Recurse -Force
}

# 5. Copy admin/ directory recursively
Write-Host "Copying admin/ folder..." -ForegroundColor Gray
if (Test-Path (Join-Path $src.FullName "admin")) {
    Copy-Item -Path (Join-Path $src.FullName "admin\*") -Destination $destAdmin.FullName -Recurse -Force
}

Write-Host "Synchronization complete! The www/ folder is now fully up to date." -ForegroundColor Green
