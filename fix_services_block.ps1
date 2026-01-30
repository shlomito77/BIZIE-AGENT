$ErrorActionPreference = "Stop"

$appPath = ".\App.tsx"
if (!(Test-Path $appPath)) { $appPath = ".\src\App.tsx" }
if (!(Test-Path $appPath)) { throw "App.tsx not found (checked .\App.tsx and .\src\App.tsx)" }

Write-Host "Fixing INITIAL_SERVICES descriptions in: $appPath" -ForegroundColor Cyan

# Backup
$ts = Get-Date -Format "yyyyMMdd_HHmmss"
$bak = "$appPath.bak_fix_services_$ts"
Copy-Item $appPath $bak -Force
Write-Host "Backup created: $bak" -ForegroundColor Green

$content = Get-Content $appPath -Raw -Encoding utf8

# Replace any broken description value that starts with the bad Hebrew quote char ׳
# Example: description: ׳ ... ,  ---> description: 'תיאור' ,
$pattern = "description:\s*׳[^,]*,"
$replacement = "description: 'תיאור השירות',"

$new = [regex]::Replace($content, $pattern, $replacement, [System.Text.RegularExpressions.RegexOptions]::Singleline)

Set-Content -Path $appPath -Value $new -Encoding utf8

Write-Host "✅ Patched. Showing INITIAL_SERVICES area:" -ForegroundColor Yellow
Select-String -Path $appPath -Pattern "INITIAL_SERVICES" -Context 0,20
