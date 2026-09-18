param([switch]$Force)
$ErrorActionPreference = "Stop"
$envFile = Join-Path $PSScriptRoot "..\.env.local"
if ((Test-Path -LiteralPath $envFile) -and -not $Force) {
  Write-Host ".env.local already exists; use -Force only to replace it."; exit 0
}
function New-Secret([int]$Bytes = 32) {
  $data = New-Object byte[] $Bytes
  $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
  try { $generator.GetBytes($data) } finally { $generator.Dispose() }
  return [Convert]::ToBase64String($data).Replace('+','-').Replace('/','_').TrimEnd('=')
}
$dbPassword = New-Secret 24
$s3Secret = New-Secret 36
$authSecret = New-Secret 48
$scannerToken = New-Secret 32
$lines = @(
  "DATABASE_URL=postgresql://weekly:$dbPassword@localhost:55432/weekly",
  "BETTER_AUTH_URL=http://localhost:3000",
  "BETTER_AUTH_SECRET=$authSecret",
  "APP_ENV=development",
  "POSTGRES_USER=weekly",
  "POSTGRES_PASSWORD=$dbPassword",
  "POSTGRES_DB=weekly",
  "APP_PORT=3000",
  "S3_ENDPOINT=http://localhost:9000",
  "S3_REGION=us-east-1",
  "S3_BUCKET=weekly-attachments",
  "S3_ACCESS_KEY_ID=weekly-dev",
  "S3_SECRET_ACCESS_KEY=$s3Secret",
  "ATTACHMENT_SCANNER_URL=http://localhost:3000/api/internal/attachment-scan",
  "ATTACHMENT_SCANNER_TOKEN=$scannerToken",
  "CLAMAV_URL=tcp://localhost:3310"
)
[IO.File]::WriteAllText($envFile, ($lines -join [Environment]::NewLine), (New-Object Text.UTF8Encoding($false)))
Write-Host "Created $envFile with random development credentials."
Write-Host "Start dependencies: docker compose --env-file .env.local -f docker-compose.dev.yml up -d"
Write-Host "Then migrate: npm run db:migrate"
