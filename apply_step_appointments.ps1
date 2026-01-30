$ErrorActionPreference = "Stop"

function Find-AppFile {
  if (Test-Path ".\App.tsx") { return ".\App.tsx" }
  if (Test-Path ".\src\App.tsx") { return ".\src\App.tsx" }
  throw "App.tsx not found in .\ or .\src\"
}

$appPath = Find-AppFile
Write-Host "Using App file: $appPath" -ForegroundColor Cyan

# Backup
$ts = Get-Date -Format "yyyyMMdd_HHmmss"
$bak = "$appPath.bak_$ts"
Copy-Item $appPath $bak -Force
Write-Host "Backup created: $bak" -ForegroundColor Green

$content = Get-Content $appPath -Raw -Encoding utf8

# 1) Update handleBookAppointment signature to accept source param
$content = [regex]::Replace(
  $content,
  "const handleBookAppointment = async \(appData: Omit<Appointment, 'id'>\) => \{",
  "const handleBookAppointment = async (appData: Omit<Appointment, 'id'>, source: 'ai' | 'manual' = 'ai') => {",
  1
)

# 2) After creating newApp, compute bookedService + servicePrice (reused later)
$needle = "const newApp: Appointment = { ...appData, id: newId };"
if ($content -notmatch [regex]::Escape($needle)) {
  throw "Could not find expected line: $needle"
}

$insert = @"
$needle

    // ✅ Service lookup once (used for CRM + Calendar)
    const bookedService = business.services.find(s => s.id === appData.serviceId);
    const servicePrice = bookedService?.price || 0;
"@

$content = $content.Replace($needle, $insert)

# 3) Replace upsertCustomer call to include source + totalSpent
$oldUpsert = @"
    upsertCustomer({ 
      name: appData.customerName, 
      phone: appData.customerPhone, 
      source: 'ai' 
    });
"@

$newUpsert = @"
    upsertCustomer({ 
      name: appData.customerName, 
      phone: appData.customerPhone, 
      source,
      totalSpent: servicePrice
    });
"@

if ($content -notmatch [regex]::Escape($oldUpsert)) {
  throw "Could not find the exact upsertCustomer block to replace. (File may differ slightly.)"
}
$content = $content.Replace($oldUpsert, $newUpsert)

# 4) Update Calendar sync block to reuse bookedService (avoid redeclare const service)
$content = [regex]::Replace(
  $content,
  "if \(calendarService\.getMode\(\) === 'real' && calendarService\.isConnected\(\)\) \{\s*const service = business\.services\.find\(s => s\.id === appData\.serviceId\);\s*await calendarService\.createEvent\(\{\s*summary: `\$\{service\?\.\name \|\| 'תור'\} - \$\{appData\.customerName\}`,\s*description: `נקבע דרך ביזי AI\. טלפון: \$\{appData\.customerPhone\}`,\s*start: appData\.startTime\.toISOString\(\),\s*end: new Date\(appData\.startTime\.getTime\(\) \+ \(service\?\.\duration \|\| 60\) \* 60000\)\.toISOString\(\)\s*\}\);\s*\}",
  @"
if (calendarService.getMode() === 'real' && calendarService.isConnected()) {
      await calendarService.createEvent({
        summary: `${bookedService?.name || 'תור'} - ${appData.customerName}`,
        description: `נקבע דרך ביזי AI. טלפון: ${appData.customerPhone}`,
        start: appData.startTime.toISOString(),
        end: new Date(appData.startTime.getTime() + (bookedService?.duration || 60) * 60000).toISOString()
      });
    }
"@,
  1,
  [System.Text.RegularExpressions.RegexOptions]::Singleline
)

# 5) Make manual bookings from AppointmentsList call handleBookAppointment(app, 'manual')
$content = $content.Replace(
  "onAddAppointment={handleBookAppointment}",
  "onAddAppointment={(app) => handleBookAppointment(app, 'manual')}"
)

Set-Content $appPath -Value $content -Encoding utf8
Write-Host "✅ Done. Updated: $appPath" -ForegroundColor Green
Write-Host "Now restart dev server (Ctrl+C then npm run dev)." -ForegroundColor Yellow
