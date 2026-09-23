$ErrorActionPreference = 'Stop'
# Installation writes registry entries and shortcuts. Never run against a personal profile.
if ($env:GITHUB_ACTIONS -ne 'true' -or $env:RUNNER_ENVIRONMENT -ne 'github-hosted') {
  throw 'Installer tests may only run on disposable GitHub-hosted Windows runners.'
}
$installRoot = Join-Path $env:LOCALAPPDATA 'Programs/focusbase-desktop'
$profile = Join-Path $env:APPDATA 'FocusBase'
if (Test-Path $installRoot) { throw 'Expected a clean runner, but an installation already exists.' }
if (Test-Path $profile) { throw 'Expected a clean runner, but an application profile already exists.' }
function Install-Checked([string]$file) {
  $process = Start-Process -FilePath (Resolve-Path -LiteralPath $file).Path -ArgumentList '/S' -WindowStyle Hidden -PassThru
  if (-not $process.WaitForExit(180000)) { throw 'Installer timed out' }
  if ($process.ExitCode -ne 0) { throw "Installer returned $($process.ExitCode)" }
}
function Check-Workspace([string]$exe, [string]$mode) {
  $process = Start-Process -FilePath $exe -ArgumentList '--remote-debugging-port=9229' -WindowStyle Hidden -PassThru
  try {
    node scripts/verify-installed-workspace.mjs $mode
    if ($LASTEXITCODE -ne 0) { throw "Installed workspace check failed: $mode" }
  } finally {
    if (-not $process.WaitForExit(10000)) { Stop-Process -Id $process.Id -Force }
  }
}
Install-Checked 'previous/outputs/desktop/FocusBase-Setup-1.0.6.exe'
Check-Workspace (Join-Path $installRoot 'FocusBase.exe') 'seed'
$before = Get-Content outputs/update-before.json -Raw
Install-Checked 'outputs/desktop/ÇalışBase-Setup-1.0.7.exe'
$newExe = Join-Path $installRoot 'ÇalışBase.exe'
if (-not (Test-Path -LiteralPath $newExe)) { throw 'Updated executable missing' }
Check-Workspace $newExe 'verify'
# A repeat install must also preserve the same workspace.
Install-Checked 'outputs/desktop/ÇalışBase-Setup-1.0.7.exe'
Check-Workspace $newExe 'verify'
$info = (Get-Item -LiteralPath $newExe).VersionInfo
if ($info.CompanyName -ne 'NEXERA') { throw "Unexpected executable publisher: $($info.CompanyName)" }
$registered = Get-ItemProperty 'HKCU:/Software/Microsoft/Windows/CurrentVersion/Uninstall/*' |
  Where-Object { $_.DisplayName -like '*alışBase*' }
if (@($registered).Count -ne 1 -or $registered.Publisher -ne 'NEXERA') { throw 'Installer publisher metadata was not registered correctly' }
$env:FOCUSBASE_SMOKE_PROFILE = Join-Path $env:RUNNER_TEMP 'calisbase-installed-smoke'
$smoke = Start-Process -FilePath $newExe -ArgumentList '--smoke-test' -WindowStyle Hidden -PassThru -RedirectStandardOutput outputs/installed-smoke.log -RedirectStandardError outputs/installed-smoke-error.log
if (-not $smoke.WaitForExit(60000) -or $smoke.ExitCode -ne 0) { throw 'Installed companion smoke test failed' }
@{
  result='passed'; fromVersion='1.0.6'; toVersion='1.0.7'; publisher=$info.CompanyName;
  cleanInstall=$true; upgrade=$true; repeatInstall=$true; installedLaunch=$true; companionSmoke=$true;
  preserved=@('tasks','notes','projects','resources','tables','settings','language','IndexedDB origin');
  testedAt=(Get-Date).ToUniversalTime().ToString('o'); sourceCommit=$env:GITHUB_SHA;
  installerSha256=(Get-FileHash 'outputs/desktop/ÇalışBase-Setup-1.0.7.exe' -Algorithm SHA256).Hash
} | ConvertTo-Json | Set-Content outputs/installer-update-report.json -Encoding utf8NoBOM
