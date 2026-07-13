# CampusLink Asset Generation Script
# Resizes logo.png into all required Android launcher icons and splash screens.

$ErrorActionPreference = "Stop"

# Paths
$rootDir = Resolve-Path (Join-Path $PSScriptRoot "..")
$logoPath = Join-Path $rootDir "logo.png"
$wwwDir = Join-Path $rootDir "www"
$androidResDir = Join-Path $rootDir "android\app\src\main\res"
$androidAssetDir = Join-Path $rootDir "android\app\src\main\assets\public"

Write-Host "=== CampusLink Asset Generator ===" -ForegroundColor Cyan
Write-Host "Logo source: $logoPath"

if (-not (Test-Path $logoPath)) {
    Write-Error "Source logo.png not found at $logoPath!"
    exit 1
}

# 1. Load .NET Assembly for Drawing
Add-Type -AssemblyName System.Drawing
Write-Host "Loaded System.Drawing assembly." -ForegroundColor Gray

# Create output folders if they don't exist
function Ensure-Directory ($dir) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}

Ensure-Directory $wwwDir
Ensure-Directory $androidAssetDir

# 2. Copy source logo to web assets
Write-Host "Copying logo.png to web folders..." -ForegroundColor Yellow
Copy-Item -Path $logoPath -Destination (Join-Path $wwwDir "logo.png") -Force
Copy-Item -Path $logoPath -Destination (Join-Path $androidAssetDir "logo.png") -Force
Write-Host "  Copied to www/logo.png and android/app/src/main/assets/public/logo.png" -ForegroundColor Green

# 3. Image Processing Helper Functions
function Resize-Image {
    param (
        [string]$sourcePath,
        [string]$outputPath,
        [int]$width,
        [int]$height,
        [bool]$circular = $false,
        [bool]$adaptiveForeground = $false
    )
    
    $srcImage = [System.Drawing.Image]::FromFile($sourcePath)
    $newBitmap = New-Object System.Drawing.Bitmap($width, $height)
    $graphics = [System.Drawing.Graphics]::FromImage($newBitmap)
    
    # Enable high-quality resizing
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    
    if ($circular) {
        $graphics.Clear([System.Drawing.Color]::Transparent)
        $path = New-Object System.Drawing.Drawing2D.GraphicsPath
        $path.AddEllipse(0, 0, $width, $height)
        $graphics.SetClip($path)
        $graphics.DrawImage($srcImage, 0, 0, $width, $height)
        $path.Dispose()
    } elseif ($adaptiveForeground) {
        $graphics.Clear([System.Drawing.Color]::Transparent)
        # Adaptive foreground padding: foreground is 66% of the canvas size
        $fgSize = [int]($width * 0.66)
        $offset = [int](($width - $fgSize) / 2)
        $graphics.DrawImage($srcImage, $offset, $offset, $fgSize, $fgSize)
    } else {
        $graphics.DrawImage($srcImage, 0, 0, $width, $height)
    }
    
    # Save as PNG
    $newBitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    # Cleanup
    $graphics.Dispose()
    $newBitmap.Dispose()
    $srcImage.Dispose()
}

function Generate-Splash {
    param (
        [string]$sourcePath,
        [string]$outputPath,
        [int]$width,
        [int]$height,
        [string]$bgColorHex = "#FFFFFF"
    )
    
    $srcImage = [System.Drawing.Image]::FromFile($sourcePath)
    $newBitmap = New-Object System.Drawing.Bitmap($width, $height)
    $graphics = [System.Drawing.Graphics]::FromImage($newBitmap)
    
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    
    # Fill background color
    $color = [System.Drawing.ColorTranslator]::FromHtml($bgColorHex)
    $graphics.Clear($color)
    
    # Draw logo in center (30% of the minimum screen dimension)
    $splashSize = [int]([Math]::Min($width, $height) * 0.3)
    if ($splashSize -lt 120) { $splashSize = 120 }
    
    $posX = [int](($width - $splashSize) / 2)
    $posY = [int](($height - $splashSize) / 2)
    
    $graphics.DrawImage($srcImage, $posX, $posY, $splashSize, $splashSize)
    
    $newBitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    $graphics.Dispose()
    $newBitmap.Dispose()
    $srcImage.Dispose()
}

# 4. Generate Launcher Icons
Write-Host ""
Write-Host "--- Generating Android Launcher Icons ---" -ForegroundColor Yellow

$mipmapConfigs = @(
    @{ Name = "mipmap-mdpi";   LegacySize = 48;  AdaptiveSize = 108 },
    @{ Name = "mipmap-hdpi";   LegacySize = 72;  AdaptiveSize = 162 },
    @{ Name = "mipmap-xhdpi";  LegacySize = 96;  AdaptiveSize = 216 },
    @{ Name = "mipmap-xxhdpi"; LegacySize = 144; AdaptiveSize = 324 },
    @{ Name = "mipmap-xxxhdpi";LegacySize = 192; AdaptiveSize = 432 }
)

foreach ($config in $mipmapConfigs) {
    $folderPath = Join-Path $androidResDir $config.Name
    Ensure-Directory $folderPath
    
    # legacy icon (square)
    $legacyOut = Join-Path $folderPath "ic_launcher.png"
    Resize-Image -sourcePath $logoPath -outputPath $legacyOut -width $config.LegacySize -height $config.LegacySize
    
    # round icon
    $roundOut = Join-Path $folderPath "ic_launcher_round.png"
    Resize-Image -sourcePath $logoPath -outputPath $roundOut -width $config.LegacySize -height $config.LegacySize -circular $true
    
    # adaptive foreground
    $adaptiveOut = Join-Path $folderPath "ic_launcher_foreground.png"
    Resize-Image -sourcePath $logoPath -outputPath $adaptiveOut -width $config.AdaptiveSize -height $config.AdaptiveSize -adaptiveForeground $true
    
    Write-Host "  Generated icons in $($config.Name) (legacy: $($config.LegacySize)px, adaptive: $($config.AdaptiveSize)px)" -ForegroundColor Green
}

# 5. Generate Splash Screens
Write-Host ""
Write-Host "--- Generating Android Splash Screens ---" -ForegroundColor Yellow

# Fallback/default splash
Ensure-Directory (Join-Path $androidResDir "drawable")
Generate-Splash -sourcePath $logoPath -outputPath (Join-Path $androidResDir "drawable\splash.png") -width 512 -height 512

$splashConfigs = @(
    @{ Folder = "drawable-land-mdpi";    W = 480;  H = 320 },
    @{ Folder = "drawable-land-hdpi";    W = 800;  H = 480 },
    @{ Folder = "drawable-land-xhdpi";   W = 1280; H = 720 },
    @{ Folder = "drawable-land-xxhdpi";  W = 1600; H = 960 },
    @{ Folder = "drawable-land-xxxhdpi"; W = 1920; H = 1280 },
    
    @{ Folder = "drawable-port-mdpi";    W = 320;  H = 480 },
    @{ Folder = "drawable-port-hdpi";    W = 480;  H = 800 },
    @{ Folder = "drawable-port-xhdpi";   W = 720;  H = 1280 },
    @{ Folder = "drawable-port-xxhdpi";  W = 960;  H = 1600 },
    @{ Folder = "drawable-port-xxxhdpi"; W = 1280; H = 1920 }
)

foreach ($config in $splashConfigs) {
    $folderPath = Join-Path $androidResDir $config.Folder
    Ensure-Directory $folderPath
    
    $splashOut = Join-Path $folderPath "splash.png"
    Generate-Splash -sourcePath $logoPath -outputPath $splashOut -width $config.W -height $config.H
    
    Write-Host "  Generated splash in $($config.Folder) ($($config.W)x$($config.H))" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== ASSET GENERATION COMPLETE ===" -ForegroundColor Green
Write-Host "All icons and splash screens successfully generated!" -ForegroundColor Green
Write-Host "Please run 'npx cap sync android' to update Capacitor's Android configurations." -ForegroundColor Cyan
