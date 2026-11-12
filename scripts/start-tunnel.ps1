$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$nodeRoot = Join-Path $projectRoot '.tools\node-v22.23.5-win-x64'

if (-not (Test-Path (Join-Path $nodeRoot 'node.exe'))) {
  throw 'The project-local Node 22 runtime is missing. Restore .tools/node-v22.23.5-win-x64 first.'
}

$env:Path = "$nodeRoot;$env:Path"
Set-Location $projectRoot
Write-Host "Starting Expo tunnel with $(& (Join-Path $nodeRoot 'node.exe') --version)"
& (Join-Path $nodeRoot 'npx.cmd') expo start --tunnel --clear --port 8082
exit $LASTEXITCODE
