param([Parameter(Mandatory = $true)][string]$OutputDirectory)
$ErrorActionPreference = "Stop"
if (-not $env:DATABASE_URL) { throw "DATABASE_URL is required" }
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$target = Join-Path $OutputDirectory ("weekly-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".dump")
pg_dump --format=custom --no-owner --no-privileges --file=$target $env:DATABASE_URL
Get-FileHash -Algorithm SHA256 -LiteralPath $target | ForEach-Object {
  "$($_.Hash)  $([System.IO.Path]::GetFileName($target))" |
    Set-Content -LiteralPath "$target.sha256" -Encoding ascii
}
Write-Output "Backup created: $target"
