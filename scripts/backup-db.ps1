param([Parameter(Mandatory = $true)][string]$OutputDirectory)
$ErrorActionPreference = "Stop"
if (-not $env:DATABASE_URL) { throw "DATABASE_URL is required" }
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$target = Join-Path $OutputDirectory ("weekly-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".dump")
pg_dump --format=custom --no-owner --no-privileges --file=$target $env:DATABASE_URL
Write-Output "Backup created: $target"
