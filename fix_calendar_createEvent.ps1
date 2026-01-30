$ErrorActionPreference = "Stop"

$appPath = ".\App.tsx"
if (!(Test-Path $appPath)) { $appPath = ".\src\App.tsx" }
if (!(Test-Path $appPath)) { throw "App.tsx not found (checked .\App.tsx and .\src\App.tsx)" }

Write-Host "Fixing calendar createEvent block in: $appPath" -ForegroundColor Cyan

# Backup
$ts = Get-Date -Format "yyyyMMdd_HHmmss"
$bak = "$appPath.bak_fix_calendar_$ts"
Copy-Item $appPath $bak -Force
Write-Host "Backup created: $bak" -ForegroundColor Green

$content = Get-Content $appPath -Raw -Encoding utf8

# Find and replace ONLY the createEvent({...}) block
$pattern = "await\s+calendarService\.createEvent\s*\(\s*\{[\s\S]*?\}\s*\)\s*;"

$replacement = @"
await calendarService.createEvent({
  summary: `${bookedService?.name || 'תור'} - ${appData.customerName || ''}`.trim(),
  description: `נוצר דרך Bizie AI.` + `\nטלפון: ${appData.customerPhone || ''}` + `\nשירות: ${bookedService?.name || ''}` + `\nמחיר: ₪${servicePrice || 0}`,
  start: appData.startTime.toISOString(),
  end: new Date(appData.startTime.getTime() + (bookedService?.duration || 60) * 60000).toISOString()
});
"@

$new = [regex]::Replace($content, $pattern, $replacement, [System.Text.RegularExpressions.RegexOptions]::Singleline)

if ($new -eq $content) {
  throw "Could not find 'await calendarService.createEvent({ ... });' block. Search for 'createEvent' in App.tsx."
}

Set-Content -Path $appPath -Value $new -Encoding utf8
Write-Host "✅ Calendar createEvent block replaced." -ForegroundColor Green

Write-Host "`nChecking for bad quote char (׳) in App.tsx..." -ForegroundColor Yellow
$hits = Select-String -Path $appPath -Pattern "׳" -ErrorAction SilentlyContinue
if ($hits) {
  Write-Host "⚠ Found bad quote char (׳). Showing first 8 hits:" -ForegroundColor Red
  $hits | Select-Object -First 8
} else {
  Write-Host "✅ No bad quote chars (׳) found in App.tsx." -ForegroundColor Green
}

Write-Host "`nPreview createEvent section:" -ForegroundColor Cyan
Select-String -Path $appPath -Pattern "createEvent" -Context 8,12
