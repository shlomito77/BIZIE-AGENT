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

# Replace the whole handleBookAppointment function block safely (Singleline)
$pattern = "const handleBookAppointment\s*=\s*async\s*\(appData:\s*Omit<Appointment,\s*'id'>\)\s*=>\s*\{.*?\n\s*\};"
$replacement = @"
const handleBookAppointment = async (appData: Omit<Appointment, 'id'>, source: 'ai' | 'manual' = 'ai') => {
    const newId = Math.random().toString(36).substr(2, 9);
    const newApp: Appointment = { ...appData, id: newId };

    // ✅ Service lookup once (used for CRM + Calendar)
    const bookedService = business.services.find(s => s.id === appData.serviceId);
    const servicePrice = bookedService?.price || 0;

    // 1. Update Local State
    setAppointments(prev => {
      const updated = [...prev, newApp];
      localStorage.setItem('bizie_virtual_appointments', JSON.stringify(updated));
      return updated;
    });

    // 2. Sync with Customer CRM
    upsertCustomer({
      name: appData.customerName,
      phone: appData.customerPhone,
      source,
      totalSpent: servicePrice
    });

    // 3. Real Sync with Google Calendar if connected
    if (calendarService.getMode() === 'real' && calendarService.isConnected()) {
      await calendarService.createEvent({
        summary: `${bookedService?.name || 'תור'} - ${appData.customerName}`,
        description: `נקבע דרך ביזי AI. טלפון: ${appData.customerPhone}`,
        start: appData.startTime.toISOString(),
        end: new Date(appData.startTime.getTime() + (bookedService?.duration || 60) * 60000).toISOString()
      });
    }
  };
"@

$regex = New-Object System.Text.RegularExpressions.Regex($pattern, [System.Text.RegularExpressions.RegexOptions]::Singleline)
$newContent = $regex.Replace($content, $replacement, 1)

if ($newContent -eq $content) {
  throw "Could not replace handleBookAppointment (pattern not found). Paste ONLY the current handleBookAppointment function and I will tailor the script 1:1."
}

# Update AppointmentsList manual wrapper (safe replace)
$newContent = $newContent.Replace(
  "onAddAppointment={handleBookAppointment}",
  "onAddAppointment={(app) => handleBookAppointment(app, 'manual')}"
)

Set-Content $appPath -Value $newContent -Encoding utf8
Write-Host "✅ Updated successfully: $appPath" -ForegroundColor Green
Write-Host "Now restart: npm run dev" -ForegroundColor Yellow
