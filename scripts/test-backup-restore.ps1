$ErrorActionPreference = "Stop"
# Mock only the external PostgreSQL commands. No database is contacted.
$originalDatabaseUrl = $env:DATABASE_URL
$testDirectory = Join-Path ([System.IO.Path]::GetTempPath()) ("weekly-backup-test-" + [guid]::NewGuid())
New-Item -ItemType Directory -Path $testDirectory | Out-Null
$env:DATABASE_URL = "postgresql://unused.invalid/test"
$global:weeklyBackupTest = @{ commandExit = 0; restoreCalls = 0 }
function pg_dump {
  $fileArgument = $args | Where-Object { $_ -like '--file=*' }
  Set-Content -LiteralPath $fileArgument.Substring(7) -Value "test dump"
  Set-Variable -Name LASTEXITCODE -Value $global:weeklyBackupTest.commandExit -Scope 1
}
function pg_restore {
  $global:weeklyBackupTest.restoreCalls++
  if ($args -notcontains '--single-transaction') { throw "Restore must be atomic" }
  if ($args -notcontains '--exit-on-error') { throw "Restore must stop on error" }
  Set-Variable -Name LASTEXITCODE -Value $global:weeklyBackupTest.commandExit -Scope 1
}
function Assert-Fails([scriptblock]$Action, [string]$Message) {
  $caught = $false
  try { & $Action | Out-Null } catch {
    $caught = $true
    if ($_.Exception.Message -notlike "*$Message*") { throw }
  }
  if (-not $caught) { throw "Expected failure: $Message" }
}
try {
  $failedDirectory = Join-Path $testDirectory "failed"
  $global:weeklyBackupTest.commandExit = 1
  Assert-Fails { & "$PSScriptRoot/backup-db.ps1" -OutputDirectory $failedDirectory } "pg_dump failed"
  if (Get-ChildItem -LiteralPath $failedDirectory -Filter '*.sha256') { throw "Failed backup received checksum" }

  $global:weeklyBackupTest.commandExit = 0
  & "$PSScriptRoot/backup-db.ps1" -OutputDirectory $testDirectory | Out-Null
  $dump = (Get-ChildItem -LiteralPath $testDirectory -Filter '*.dump').FullName
  & "$PSScriptRoot/restore-db.ps1" -InputFile $dump -Confirm | Out-Null
  if ($global:weeklyBackupTest.restoreCalls -ne 1) { throw "Valid backup was not restored" }

  $global:weeklyBackupTest.commandExit = 1
  Assert-Fails { & "$PSScriptRoot/restore-db.ps1" -InputFile $dump -Confirm } "pg_restore failed"
  Add-Content -LiteralPath $dump -Value "corrupt"
  $callsBefore = $global:weeklyBackupTest.restoreCalls
  Assert-Fails { & "$PSScriptRoot/restore-db.ps1" -InputFile $dump -Confirm } "备份文件校验和不匹配"
  if ($global:weeklyBackupTest.restoreCalls -ne $callsBefore) { throw "Corrupt backup reached pg_restore" }
  Write-Output "PASS: backup failure, valid restore, restore failure, checksum rejection"
} finally {
  $env:DATABASE_URL = $originalDatabaseUrl
  Remove-Variable -Name weeklyBackupTest -Scope Global
  # Only the uniquely created test directory is removed.
  Remove-Item -LiteralPath $testDirectory -Recurse -Force
}
