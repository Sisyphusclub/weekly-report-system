param(
  [Parameter(Mandatory = $true)][string]$BackupDirectory,
  [int]$MaxAgeHours = 26
)
$ErrorActionPreference = "Stop"
if ($MaxAgeHours -lt 1) { throw "MaxAgeHours must be positive" }
if (-not (Test-Path -LiteralPath $BackupDirectory -PathType Container)) {
  throw "备份目录不存在"
}
$backup = Get-ChildItem -LiteralPath $BackupDirectory -Filter "weekly-*.dump" -File |
  Sort-Object LastWriteTimeUtc -Descending |
  Select-Object -First 1
if (-not $backup) { throw "未找到数据库备份" }
$ageHours = ((Get-Date).ToUniversalTime() - $backup.LastWriteTimeUtc).TotalHours
if ($ageHours -gt $MaxAgeHours) { throw "最近备份已超过 $MaxAgeHours 小时" }
$checksumPath = "$($backup.FullName).sha256"
if (-not (Test-Path -LiteralPath $checksumPath -PathType Leaf)) {
  throw "备份缺少校验和文件"
}
$expected = (Get-Content -LiteralPath $checksumPath -Raw).Trim().Split(" ")[0].ToUpperInvariant()
$actual = (Get-FileHash -Algorithm SHA256 -LiteralPath $backup.FullName).Hash.ToUpperInvariant()
if ($expected -ne $actual) { throw "最近备份校验和不匹配" }
Write-Output ("Backup healthy: {0}; age={1:N1}h" -f $backup.Name, $ageHours)
