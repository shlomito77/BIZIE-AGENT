$ErrorActionPreference = "Stop"

$appPath = ".\App.tsx"
if (!(Test-Path $appPath)) { $appPath = ".\src\App.tsx" }
if (!(Test-Path $appPath)) { throw "App.tsx not found" }

Write-Host "Patching: $appPath" -ForegroundColor Cyan

# Backup
$ts = Get-Date -Format "yyyyMMdd_HHmmss"
$bak = "$appPath.bak_patch_$ts"
Copy-Item $appPath $bak -Force
Write-Host "Backup created: $bak" -ForegroundColor Green

$content = Get-Content $appPath -Raw -Encoding utf8

# Fix broken summary line (handles the corrupted Hebrew too)
# Replace any line that starts with summary: and contains ${bookedService with the correct template string
$content = [regex]::Replace(
  $content,
  "summary:\s*\$\{bookedService\?\.(?:name)\s*\|\|\s*'[^']*'\}\s*-\s*,?",
  "summary: `${bookedService?.name || 'תור'} - ${appData.customerName}`,",
  [System.Text.RegularExpressions.RegexOptions]::Singleline
)

# Fix broken description line similarly (if it got corrupted)
$content = [regex]::Replace(
  $content,
  "description:\s*[^,\r\n]*,",
  "description: `נקבע דרך ביזי AI. טלפון: ${appData.customerPhone}`,",
  [System.Text.RegularExpressions.RegexOptions]::Singleline
)

Set-Content $appPath -Value $content -Encoding utf8
Write-Host "✅ Patch applied. Restart Vite." -ForegroundColor Yellow
