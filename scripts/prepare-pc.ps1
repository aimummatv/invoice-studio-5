param([switch]$Install)
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
if ($env:OS -ne 'Windows_NT') { throw 'Use Windows 10/11 x64 for this handover.' }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Install Node.js 24 LTS x64 from https://nodejs.org and reopen this window.' }
$nodeVersion = & node --version
if ([int]($nodeVersion.TrimStart('v').Split('.')[0]) -lt 24) { throw 'Node.js 24 or newer is required.' }
if ($Install -or -not (Test-Path 'node_modules')) {
  if (Test-Path 'package-lock.json') { & npm.cmd ci } else { & npm.cmd install }
  if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed. Keep the error text for troubleshooting; no app or tests were started.' }
}
Write-Host 'PC prerequisites prepared. No tests, screenshots, EXE packaging or publication were run by this script.'
