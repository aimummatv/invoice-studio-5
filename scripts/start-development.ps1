$ErrorActionPreference = 'Stop'
& (Join-Path $PSScriptRoot 'prepare-pc.ps1')
Set-Location (Split-Path $PSScriptRoot -Parent)
& npm.cmd run build
if ($LASTEXITCODE -ne 0) { throw 'Source compilation failed. Copy the complete error output for the PC fix pass.' }
& npm.cmd start
if ($LASTEXITCODE -ne 0) { throw 'The Electron developer app exited with an error.' }
