import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

const deployRemoteSource = new URL('../scripts/deploy-remote.sh', import.meta.url);
const composeSource = new URL('../docker-compose.dashboard.yml', import.meta.url);
const envExampleSource = new URL('../.env.example', import.meta.url);
const prepareLocalSource = new URL('../scripts/prepare-local.mjs', import.meta.url);

test('deploy-remote stages prepared incoming .env before preserving stale app env', async () => {
  const source = await fs.readFile(deployRemoteSource, 'utf8');
  const incomingEnvCheck = source.indexOf('[ -r "$REMOTE_INCOMING/.env" ]');
  const appEnvCheck = source.indexOf('[ -r "$REMOTE_APP/.env" ]');

  assert.notEqual(incomingEnvCheck, -1, 'deploy helper must inspect prepared incoming .env');
  assert.notEqual(appEnvCheck, -1, 'deploy helper may preserve existing app .env as fallback');
  assert.ok(
    incomingEnvCheck < appEnvCheck,
    'prepared incoming .env must win so operator-selected live/rollback files drive Docker Compose runtime'
  );
});

test('deploy-remote preserves prepared env candidates while replacing incoming source files', async () => {
  const source = await fs.readFile(deployRemoteSource, 'utf8');

  assert.match(source, /find "\$REMOTE_INCOMING" -mindepth 1 ! -name '\.env' ! -name '\.env\.\*' -exec rm -rf \{\} \+/);
});

test('compose loads generated runtime env file without overriding it with interpolated defaults', async () => {
  const compose = await fs.readFile(composeSource, 'utf8');

  assert.match(compose, /env_file:[\s\S]*- path: \.\/runtime\/dashboard\.env\s*\n\s*required: false/);
  assert.doesNotMatch(compose, /ALLOW_LIVE_PUBLIC_DATA:\s+"\$\{ALLOW_LIVE_PUBLIC_DATA:-false\}"/);
  assert.doesNotMatch(compose, /USE_DEMO_DATA:\s+"\$\{USE_DEMO_DATA:-true\}"/);
});

test('deploy-remote generates non-dot runtime env for Compose from prepared private env', async () => {
  const source = await fs.readFile(deployRemoteSource, 'utf8');

  assert.match(source, /mkdir -p "\$TMPDIR\/runtime"/);
  assert.match(source, /cp "\$TMPDIR\/\.env" "\$TMPDIR\/runtime\/dashboard\.env"/);
  assert.match(source, /chmod 600 "\$TMPDIR\/runtime\/dashboard\.env"/);
});

test('compose defaults mount a live Kanban host DB instead of a static snapshot source', async () => {
  const compose = await fs.readFile(composeSource, 'utf8');

  assert.match(compose, /\$\{HERMES_KANBAN_HOST_DB:-\.\/runtime\/kanban\.db\}:\/data\/hermes\/kanban\.db:ro/);
  assert.doesNotMatch(compose, /HERMES_KANBAN_SNAPSHOT_HOST_DB:-\.\/runtime\/kanban\.db/);
  assert.match(compose, /HERMES_KANBAN_SOURCE_MODE:\s+"\$\{HERMES_KANBAN_SOURCE_MODE:-live\}"/);
});

test('fresh install examples reserve snapshot env for explicit static snapshots only', async () => {
  const envExample = await fs.readFile(envExampleSource, 'utf8');
  const prepareLocal = await fs.readFile(prepareLocalSource, 'utf8');

  assert.match(envExample, /HERMES_KANBAN_HOST_DB=\.\/runtime\/kanban\.db/);
  assert.match(envExample, /HERMES_KANBAN_SOURCE_MODE=live/);
  assert.doesNotMatch(envExample, /^HERMES_KANBAN_SNAPSHOT_HOST_DB=/m);
  assert.match(prepareLocal, /HERMES_KANBAN_HOST_DB=\.\/runtime\/kanban\.db/);
  assert.match(prepareLocal, /HERMES_KANBAN_SOURCE_MODE=live/);
  assert.doesNotMatch(prepareLocal, /HERMES_KANBAN_SNAPSHOT_HOST_DB=\.\/runtime\/kanban\.db/);
});

test('deploy-remote separates live remote Kanban mounts from copied static snapshots', async () => {
  const source = await fs.readFile(deployRemoteSource, 'utf8');

  assert.match(source, /LIVE_KANBAN_HOST_DB="\$\{LIVE_KANBAN_HOST_DB:-\}"/);
  assert.match(source, /set_kv HERMES_KANBAN_HOST_DB "\$LIVE_KANBAN_HOST_DB" "\$TMPDIR\/\.env"/);
  assert.match(source, /set_kv HERMES_KANBAN_SOURCE_MODE live "\$TMPDIR\/\.env"/);
  assert.match(source, /text\.replace\('\$\{HERMES_KANBAN_HOST_DB:-\.\/runtime\/kanban\.db\}', '\$\{HERMES_KANBAN_HOST_DB:-' \+ live_host_db \+ '}'\)/);
  assert.match(source, /set_kv HERMES_KANBAN_SOURCE_MODE snapshot "\$TMPDIR\/\.env"/);
  assert.match(source, /set_kv HERMES_KANBAN_SNAPSHOT_HOST_DB "\$REMOTE_INCOMING\/runtime\/kanban\.db" "\$TMPDIR\/\.env"/);
});

test('deploy-remote rejects static snapshot health when deploying live Kanban mounts', async () => {
  const source = await fs.readFile(deployRemoteSource, 'utf8');

  assert.match(source, /DEPLOY_HEALTH_URL="\$\{DEPLOY_HEALTH_URL:-http:\/\/\$REMOTE_HOST:3000\/api\/health\}"/);
  assert.match(source, /if \[ "\$EXPECT_LIVE_KANBAN" = "true" \] \|\| \[ -n "\$LIVE_KANBAN_HOST_DB" \]; then/);
  assert.match(source, /source_mode == 'static-snapshot' or source_label == 'static-snapshot-db'/);
  assert.match(source, /live Kanban deployment rejected static snapshot health/);
});
