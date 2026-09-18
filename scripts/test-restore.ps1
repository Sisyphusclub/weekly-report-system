param([string]$DockerCommand = 'docker')
$ErrorActionPreference = 'Stop'
# Only the project's local development container is addressed. No supplied
# connection string can redirect this exercise to a production database.
$container = 'weekly-dev-db-1'
$id = [Guid]::NewGuid().ToString('N')
$source = "restore_source_${id}_test"
$destination = "restore_target_${id}_test"
$archive = "/tmp/weekly-$id.dump"
function Invoke-Docker([string[]]$Arguments) {
  & $DockerCommand @Arguments
  if ($LASTEXITCODE -ne 0) { throw 'Database restore exercise failed' }
}
$sourceCreated = $false
$targetCreated = $false
try {
  Invoke-Docker @('exec', $container, 'createdb', '-U', 'weekly', $source)
  $sourceCreated = $true
  # Snapshot into an isolated source; never restore over the business database.
  Invoke-Docker @('exec', $container, 'pg_dump', '-U', 'weekly', '-d', 'weekly', '-Fc', '-f', $archive)
  Invoke-Docker @('exec', $container, 'pg_restore', '-U', 'weekly', '-d', $source, '--exit-on-error', '--single-transaction', $archive)
  Invoke-Docker @('exec', $container, 'psql', '-U', 'weekly', '-d', $source, '-v', 'ON_ERROR_STOP=1', '-c', "CREATE TABLE restore_probe(id integer PRIMARY KEY, body text NOT NULL); INSERT INTO restore_probe VALUES (1,'恢复验证');")
  Invoke-Docker @('exec', $container, 'pg_dump', '-U', 'weekly', '-d', $source, '-Fc', '--no-owner', '--no-privileges', '-f', $archive)
  $before = & $DockerCommand exec $container sha256sum $archive
  if ($LASTEXITCODE -ne 0) { throw 'Checksum failed' }
  Invoke-Docker @('exec', $container, 'createdb', '-U', 'weekly', $destination)
  $targetCreated = $true
  Invoke-Docker @('exec', $container, 'pg_restore', '-U', 'weekly', '-d', $destination, '--exit-on-error', '--single-transaction', '--no-owner', '--no-privileges', $archive)
  $after = & $DockerCommand exec $container sha256sum $archive
  if ($LASTEXITCODE -ne 0 -or $before -ne $after) { throw 'Checksum mismatch' }
  $probe = & $DockerCommand exec $container psql -U weekly -d $destination -At -c "SELECT body FROM restore_probe WHERE id=1"
  if ($LASTEXITCODE -ne 0 -or $probe -ne '恢复验证') { throw 'Restored data mismatch' }
  $query = "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"
  $originalTables = & $DockerCommand exec $container psql -U weekly -d $source -At -c $query
  if ($LASTEXITCODE -ne 0) { throw 'Source schema check failed' }
  $restoredTables = & $DockerCommand exec $container psql -U weekly -d $destination -At -c $query
  if ($LASTEXITCODE -ne 0 -or (Compare-Object $originalTables $restoredTables)) { throw 'Restored schema mismatch' }
  $journalQuery = 'SELECT hash,created_at FROM drizzle.__drizzle_migrations ORDER BY created_at'
  $originalJournal = & $DockerCommand exec $container psql -U weekly -d $source -At -c $journalQuery
  if ($LASTEXITCODE -ne 0 -or -not $originalJournal) { throw 'Source migration journal missing' }
  $restoredJournal = & $DockerCommand exec $container psql -U weekly -d $destination -At -c $journalQuery
  if ($LASTEXITCODE -ne 0 -or (Compare-Object $originalJournal $restoredJournal)) { throw 'Restored migration journal mismatch' }
  & node --env-file=.env.local scripts/verify-restored-database.mjs $destination
  if ($LASTEXITCODE -ne 0) { throw 'Restored database business verification failed' }
  Write-Output 'PASS: custom archive, checksum, transactional restore, schema inventory, migration journal, Unicode data, restored business invariants'
} finally {
  if ($targetCreated) { Invoke-Docker @('exec', $container, 'dropdb', '-U', 'weekly', $destination) }
  if ($sourceCreated) { Invoke-Docker @('exec', $container, 'dropdb', '-U', 'weekly', $source) }
  Invoke-Docker @('exec', $container, 'rm', '-f', $archive)
}
