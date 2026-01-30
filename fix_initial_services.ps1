$ErrorActionPreference = "Stop"

$appPath = ".\App.tsx"
if (!(Test-Path $appPath)) { $appPath = ".\src\App.tsx" }
if (!(Test-Path $appPath)) { throw "App.tsx not found (checked .\App.tsx and .\src\App.tsx)" }

Write-Host "Fixing INITIAL_SERVICES in: $appPath" -ForegroundColor Cyan

# Backup
$ts = Get-Date -Format "yyyyMMdd_HHmmss"
$bak = "$appPath.bak_fix_initial_services_$ts"
Copy-Item $appPath $bak -Force
Write-Host "Backup created: $bak" -ForegroundColor Green

$content = Get-Content $appPath -Raw -Encoding utf8

# Replace the whole INITIAL_SERVICES block
$pattern = "const\s+INITIAL_SERVICES\s*:\s*Service\[\]\s*=\s*\[[\s\S]*?\];"

$replacement = @"
const INITIAL_SERVICES: Service[] = [
  { id: 'm1', name: 'עיסוי שוודי קלאסי', description: 'עיסוי שחרור והרגעה.', duration: 60, price: 280 },
  { id: 'm2', name: 'עיסוי רקמות עמוק', description: 'ממוקד תפיסות וכאבי שרירים.', duration: 60, price: 320 },
  { id: 'm3', name: 'עיסוי אבנים חמות', description: 'חימום עמוק והרפיית שרירים.', duration: 75, price: 350 },
  { id: 'f1', name: 'טיפול פנים קלאסי', description: 'ניקוי, פילינג והזנה לעור הפנים.', duration: 60, price: 300 },
  { id: 'p1', name: 'חבילת VIP זוגית', description: 'חבילה זוגית הכוללת פינוקים, יין ופירות ושימוש במתקנים.', duration: 120, price: 850 },
];
"@

$new = [regex]::Replace($content, $pattern, $replacement, [System.Text.RegularExpressions.RegexOptions]::Singleline)

if ($new -eq $content) {
  throw "Could not find INITIAL_SERVICES block. Search for 'const INITIAL_SERVICES' manually."
}

Set-Content -Path $appPath -Value $new -Encoding utf8
Write-Host "✅ INITIAL_SERVICES replaced." -ForegroundColor Green

Write-Host "`nChecking for bad quote char (׳) in App.tsx..." -ForegroundColor Yellow
$hits = Select-String -Path $appPath -Pattern "׳" -ErrorAction SilentlyContinue
if ($hits) {
  Write-Host "⚠ Found bad quote char (׳). Showing first 3 hits:" -ForegroundColor Red
  $hits | Select-Object -First 3
} else {
  Write-Host "✅ No bad quote chars (׳) found in App.tsx." -ForegroundColor Green
}

Write-Host "`nPreview INITIAL_SERVICES:" -ForegroundColor Cyan
Select-String -Path $appPath -Pattern "const INITIAL_SERVICES" -Context 0,15
