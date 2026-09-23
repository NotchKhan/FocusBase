$ErrorActionPreference = 'Stop'
if ($env:GITHUB_ACTIONS -ne 'true' -or $env:RUNNER_ENVIRONMENT -ne 'github-hosted') {
  throw 'This scan is intended for the disposable GitHub-hosted Windows runner.'
}
$installer = (Resolve-Path 'outputs/desktop/ÇalışBase-Setup-1.0.7.exe').Path
$before = Get-MpComputerStatus
if (-not $before.AntivirusEnabled) { throw 'Microsoft Defender is not active; no clean verdict can be issued.' }
Update-MpSignature
$status = Get-MpComputerStatus
if ($status.AntivirusSignatureLastUpdated -lt (Get-Date).AddDays(-3)) { throw 'Defender signatures are stale.' }
$scanner = Get-ChildItem "$env:ProgramData/Microsoft/Windows Defender/Platform/*/MpCmdRun.exe" |
  Sort-Object { $_.VersionInfo.FileVersionRaw } -Descending | Select-Object -First 1
if (-not $scanner) { throw 'Defender command-line scanner is unavailable.' }
$hash = (Get-FileHash -LiteralPath $installer -Algorithm SHA256).Hash
& $scanner.FullName -Scan -ScanType 3 -File $installer -DisableRemediation 2>&1 |
  Tee-Object -FilePath outputs/antivirus-scan.txt
$scanExit = $LASTEXITCODE
if ($scanExit -ne 0) { throw "Defender did not return a clean result: exit $scanExit" }
if ((Get-FileHash -LiteralPath $installer -Algorithm SHA256).Hash -ne $hash) { throw 'Installer changed during scan.' }
@{
  file = 'CalisBase-Setup-1.0.7.exe'; sha256 = $hash; scanner = 'Microsoft Defender';
  signatureVersion = $status.AntivirusSignatureVersion; scannedAt = (Get-Date).ToUniversalTime().ToString('o');
  exitCode = $scanExit; result = 'No threats detected';
  authenticode = (Get-AuthenticodeSignature -LiteralPath $installer).Status.ToString();
  limitation = 'One engine at the recorded time. This is not an AVG or SmartScreen reputation verdict.'
} | ConvertTo-Json | Set-Content outputs/antivirus-report.json -Encoding utf8NoBOM
