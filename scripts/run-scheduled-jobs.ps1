param(
  [string]$ProjectDirectory = (Get-Location).Path
)
$ErrorActionPreference = "Stop"
if (-not (Test-Path -LiteralPath (Join-Path $ProjectDirectory "package.json") -PathType Leaf)) {
  throw "项目目录无效"
}
Push-Location $ProjectDirectory
try {
  $jobs = @(
    "npm run reminders:run",
    "npm run weekly:drafts",
    "npm run login-audit:cleanup",
    "npm run attachments:cleanup"
  )
  foreach ($job in $jobs) {
    Write-Output "Running scheduled job: $job"
    & npm.cmd run ($job -replace "^npm run ", "")
    if ($LASTEXITCODE -ne 0) {
      throw "Scheduled job failed: $job (exit $LASTEXITCODE)"
    }
  }
  if ($env:BACKUP_DIRECTORY) {
    Write-Output "Checking database backups: $env:BACKUP_DIRECTORY"
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $ProjectDirectory "scripts/check-backup.ps1") -BackupDirectory $env:BACKUP_DIRECTORY
    if ($LASTEXITCODE -ne 0) {
      throw "Backup health check failed (exit $LASTEXITCODE)"
    }
  } else {
    Write-Output "Backup health check skipped: BACKUP_DIRECTORY is not set."
  }
  Write-Output "Scheduled jobs completed."
}
finally {
  Pop-Location
}
