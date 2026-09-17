param([Parameter(Mandatory = $true)][string]$InputFile, [switch]$Confirm)
$ErrorActionPreference = "Stop"
if (-not $Confirm) { throw "恢复会覆盖目标数据库，请追加 -Confirm" }
if (-not $env:DATABASE_URL) { throw "DATABASE_URL is required" }
if (-not (Test-Path -LiteralPath $InputFile -PathType Leaf)) { throw "备份文件不存在" }
pg_restore --clean --if-exists --no-owner --no-privileges --dbname=$env:DATABASE_URL $InputFile
Write-Output "Database restored from: $InputFile"
