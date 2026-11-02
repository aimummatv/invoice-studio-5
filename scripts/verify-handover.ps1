$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$manifest = Join-Path $root 'Checksums.txt'
if (-not (Test-Path $manifest)) { throw 'Place this script in the Windows-Tools folder of the extracted handover.' }
$failures = 0
foreach ($line in Get-Content -LiteralPath $manifest) {
  if ($line -notmatch '^([a-f0-9]{64})  (.+)$') { continue }
  $expected = $Matches[1]; $relative = $Matches[2]
  $file = Join-Path $root $relative.Replace('/', [IO.Path]::DirectorySeparatorChar)
  if (-not (Test-Path -LiteralPath $file) -or (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expected) {
    Write-Host ('Missing or changed: ' + $relative); $failures++
  }
}
if ($failures) { throw "$failures handover files did not match the manifest." }
Write-Host 'All packaged file checksums match. This checks archive integrity, not application correctness.'
