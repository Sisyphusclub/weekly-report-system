param([Parameter(Mandatory = $true)][string]$InputFile, [switch]$Confirm)
$ErrorActionPreference = "Stop"
if (-not $Confirm) { throw "恢复会覆盖目标数据库，请追加 -Confirm" }
if (-not $env:DATABASE_URL) { throw "DATABASE_URL is required" }
if (-not (Test-Path -LiteralPath $InputFile -PathType Leaf)) { throw "备份文件不存在" }
$checksumFile = "$InputFile.sha256"
if (Test-Path -LiteralPath $checksumFile -PathType Leaf) {
  $expected = (Get-Content -LiteralPath $checksumFile -Raw).Trim().Split(" ")[0]
  $actual = (Get-FileHash -Algorithm SHA256 -LiteralPath $InputFile).Hash
  if ($expected -ne $actual) { throw "备份文件校验和不匹配" }
}
pg_restore --clean --if-exists --no-owner --no-privileges --dbname=$env:DATABASE_URL $InputFile
Write-Output "Database restored from: $InputFile"
