import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

const deployRemoteSource = new URL('../scripts/deploy-remote.sh', import.meta.url);
const composeSource = new URL('../docker-compose.dashboard.yml', import.meta.url);

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

  assert.match(compose, /env_file:\s*\n\s*- path: \.\/runtime\/dashboard\.env\s*\n\s*required: false/);
  assert.doesNotMatch(compose, /ALLOW_LIVE_PUBLIC_DATA:\s+"\$\{ALLOW_LIVE_PUBLIC_DATA:-false\}"/);
  assert.doesNotMatch(compose, /USE_DEMO_DATA:\s+"\$\{USE_DEMO_DATA:-true\}"/);
});

test('deploy-remote generates non-dot runtime env for Compose from prepared private env', async () => {
  const source = await fs.readFile(deployRemoteSource, 'utf8');

  assert.match(source, /mkdir -p "\$TMPDIR\/runtime"/);
  assert.match(source, /cp "\$TMPDIR\/\.env" "\$TMPDIR\/runtime\/dashboard\.env"/);
  assert.match(source, /chmod 600 "\$TMPDIR\/runtime\/dashboard\.env"/);
});
