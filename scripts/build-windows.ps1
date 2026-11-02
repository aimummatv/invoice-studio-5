param([switch]$RunTests)
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
if ($env:OS -ne 'Windows_NT') { throw 'Run this packaging script on Windows 10/11 x64.' }
$nodeVersion = & node --version
if ($LASTEXITCODE -ne 0 -or [int]($nodeVersion.TrimStart('v').Split('.')[0]) -lt 24) { throw 'Install Node.js 24 x64 first.' }
if (Test-Path 'package-lock.json') { & npm ci } else { & npm install }
if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed. No packaging performed.' }
if ($RunTests) {
  & npm run typecheck
  if ($LASTEXITCODE -ne 0) { throw 'Strict typecheck failed.' }
  & npm test
  if ($LASTEXITCODE -ne 0) { throw 'Service tests failed.' }
}
& npm run build
if ($LASTEXITCODE -ne 0) { throw 'Desktop build failed.' }
if ($RunTests) {
  & npm run test:desktop
  if ($LASTEXITCODE -ne 0) { throw 'Desktop verification failed.' }
}
& npx --no-install electron-builder --win nsis portable --x64 --publish never
if ($LASTEXITCODE -ne 0) { throw 'Windows packaging failed.' }
Write-Host 'Local Windows artifacts generated under release/artifacts. Nothing was published.'
if (-not $RunTests) { Write-Warning 'TESTS DEFERRED: these artifacts are unverified development builds, not approved for business use.' }
