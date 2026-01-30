$ErrorActionPreference = "Stop"

$appPath = ".\App.tsx"
if (!(Test-Path $appPath)) { $appPath = ".\src\App.tsx" }
if (!(Test-Path $appPath)) { throw "App.tsx not found (checked .\App.tsx and .\src\App.tsx)" }

Write-Host "Fixing createEvent block in: $appPath" -ForegroundColor Cyan

# Backup
$ts = Get-Date -Format "yyyyMMdd_HHmmss"
$bak = "$appPath.bak_fix_calendar_$ts"
Copy-Item $appPath $bak -Force
Write-Host "Backup created: $bak" -ForegroundColor Green

$content = Get-Content $appPath -Raw -Encoding utf8

# Replace ONLY the two broken lines (summary + description) as they appear in your file
$oldSummaryPattern = "summary:\s*\$\{bookedService\?\.\s*name\s*\|\|\s*'[^']*'\}\s*-\s*,"
$oldDescPattern    = "description:\s*[^,\r\n]*,"

$newSummaryLine = @"
summary: `${bookedService?.name || 'תור'} - ${appData.customerName}`,
"@

$newDescLine = @"
description: `נקבע דרך ביזי AI. טלפון: ${appData.customerPhone}`,
"@

$new = [regex]::Replace($content, $oldSummaryPattern, $newSummaryLine.TrimEnd(), [System.Text.RegularExpressions.RegexOptions]::Singleline)
$new = [regex]::Replace($new,     $oldDescPattern,    $newDescLine.TrimEnd(),    [System.Text.RegularExpressions.RegexOptions]::Singleline)

Set-Content -Path $appPath -Value $new -Encoding utf8

Write-Host "✅ Patched. Showing createEvent area:" -ForegroundColor Yellow
Select-String -Path $appPath -Pattern "createEvent" -Context 0,10
