param([switch]$Desktop)
$ErrorActionPreference = 'Stop'
& (Join-Path $PSScriptRoot 'prepare-pc.ps1')
Set-Location (Split-Path $PSScriptRoot -Parent)
New-Item -ItemType Directory -Force 'qa/pc-results' | Out-Null
Start-Transcript -Path ('qa/pc-results/' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.txt')
try {
  & npm.cmd run typecheck
  if ($LASTEXITCODE -ne 0) { throw 'Typecheck failed; fix reported source/type errors before runtime checks.' }
  & npm.cmd run lint
  if ($LASTEXITCODE -ne 0) { throw 'Source parsing failed.' }
  & npm.cmd test
  if ($LASTEXITCODE -ne 0) { throw 'Service tests failed. Review both new behavior and historical test expectations; do not change financial goldens just to pass.' }
  & npm.cmd run build
  if ($LASTEXITCODE -ne 0) { throw 'Desktop build failed.' }
  if ($Desktop) {
    & npm.cmd run test:desktop
    if ($LASTEXITCODE -ne 0) { throw 'Electron checks failed. Retain screenshots/logs for review.' }
    Write-Host 'Inspect screenshots manually. Automated execution does not establish visual approval.'
  }
} finally { Stop-Transcript }
