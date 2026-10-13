$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
$phpExecutable = (Get-Command php).Source
$documentRoot = Join-Path $projectRoot 'runtime/wordpress'
if (-not (Test-Path -LiteralPath (Join-Path $documentRoot 'wp-config.php'))) { throw 'Сначала выполните python scripts/setup_local.py' }
Write-Host 'WordPress: http://127.0.0.1:8136 — для остановки Ctrl+C'
& $phpExecutable -S 127.0.0.1:8136 -t $documentRoot (Join-Path $projectRoot 'scripts/router.php')
