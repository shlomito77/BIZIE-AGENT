$ErrorActionPreference = "Stop"

$appPath = ".\App.tsx"
if (!(Test-Path $appPath)) { $appPath = ".\src\App.tsx" }
if (!(Test-Path $appPath)) { throw "App.tsx not found (checked .\App.tsx and .\src\App.tsx)" }

Write-Host "Fixing calendar createEvent block (v2) in: $appPath" -ForegroundColor Cyan

# Backup
$ts = Get-Date -Format "yyyyMMdd_HHmmss"
$bak = "$appPath.bak_fix_calendar_v2_$ts"
Copy-Item $appPath $bak -Force
Write-Host "Backup created: $bak" -ForegroundColor Green

$content = Get-Content $appPath -Raw -Encoding utf8

# Replace ONLY the createEvent({ ... }) block
$pattern = "await\s+calendarService\.createEvent\s*\(\s*\{[\s\S]*?\}\s*\)\s*;"

# Safe backtick for TS template strings
$bt = [char]96

$replacement =
"await calendarService.createEvent({" + "`r`n" +
"  summary: " + $bt + "${bookedService?.name || 'תור'} - ${appData.customerName || ''}" + $bt + ".trim()," + "`r`n" +
"  description: " + $bt + "נוצר דרך Bizie AI.`nטלפון: ${appData.customerPhone || ''}`nשירות: ${bookedService?.name || ''}`nמחיר: ₪${servicePrice || 0}" + $bt + "," + "`r`n" +
"  start: appData.startTime.toISOString()," + "`r`n" +
"  end: new Date(appData.startTime.getTime() + (bookedService?.duration || 60) * 60000).toISOString()" + "`r`n" +
"});"

$new = [regex]::Replace($content, $pattern, $replacement, [System.Text.RegularExpressions.RegexOptions]::Singleline)

if ($new -eq $content) {
  throw "Could not find 'await calendarService.createEvent({ ... });' block. Search for 'createEvent' in App.tsx."
}

Set-Content -Path $appPath -Value $new -Encoding utf8
Write-Host "✅ Calendar createEvent block replaced (v2)." -ForegroundColor Green

Write-Host "`nPreview createEvent section:" -ForegroundColor Cyan
Select-String -Path $appPath -Pattern "createEvent" -Context 8,12

Write-Host "`nSanity checks:" -ForegroundColor Yellow
Select-String -Path $appPath -Pattern "summary:" -Context 0,1
Select-String -Path $appPath -Pattern "description:" -Context 0,1
