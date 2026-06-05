$file = 'e:\Owais\School Idea\SchoolIn\style.css'
$content = [System.IO.File]::ReadAllText($file)

# Old primary (blue) -> New primary (indigo)
$content = $content -replace 'rgba\(0, 102, 200', 'rgba(79, 70, 229'
$content = $content -replace '#0066C8', '#4F46E5'
$content = $content -replace '#00A3FF', '#818CF8'
$content = $content -replace '#0050A0', '#4338CA'

# Old accent (teal) -> New accent (amber/gold)
$content = $content -replace 'rgba\(0, 210, 196', 'rgba(217, 119, 6'
$content = $content -replace '#00D2C4', '#D97706'
$content = $content -replace '#00B3A7', '#B45309'
$content = $content -replace '#05A8FF', '#F59E0B'

# Other blue references
$content = $content -replace 'rgba\(0, 163, 255', 'rgba(129, 140, 248'
$content = $content -replace '#00c6ff', '#818CF8'

[System.IO.File]::WriteAllText($file, $content)
Write-Host "Done! All color references updated."
