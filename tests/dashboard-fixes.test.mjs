import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { normalizeV3Session, normalizeV3Message, getPerformanceMetricConfig, sanitizePublicText, summarizePerformanceTelemetry } from '../lib/data-utils.js';
import { isAllowedProxyPath, isReadOnlyPostPath } from '../lib/proxy-policy.js';
import { getHonchoSnapshot } from '../lib/honcho-client.js';

function createKanbanFixtureDb() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kanban-fixture-'));
  const dbPath = path.join(dir, 'kanban.db');
  execFileSync('python3', ['-c', String.raw`
import sqlite3, sys
db = sys.argv[1]
con = sqlite3.connect(db)
con.executescript('''
create table tasks (id text primary key, title text, assignee text, status text, created_at integer, started_at integer, completed_at integer);
create table task_runs (task_id text, profile text, status text, last_heartbeat_at integer, started_at integer, ended_at integer);
create table task_events (task_id text, kind text, created_at integer);
insert into tasks values ('t_fixture_ready', 'Fixture ready canary', 'jarvis', 'ready', 1779709900, null, null);
insert into tasks values ('t_fixture_blocked', 'Fixture blocked canary', 'breach', 'blocked', 1779709950, null, null);
insert into tasks values ('t_fixture_running', 'Fixture running canary', 'forge', 'running', 1779709800, 1779709800, null);
insert into task_runs values ('t_fixture_running', 'forge', 'running', 1779709980, 1779709800, null);
insert into task_events values ('t_fixture_running', 'heartbeat', 1779709980);
''')
con.commit()
con.close()
`, dbPath]);
  return { dir, dbPath };
}

test('normalizeV3Session maps Honcho v3 active state and derived message counts', () => {
  const session = normalizeV3Session(
    { id: 'session-1', is_active: true, metadata: { title: 'Planning session' }, created_at: '2026-05-24T00:00:00Z' },
    'workspace-1',
    [{ id: 'm1' }, { id: 'm2' }]
  );

  assert.equal(session.id, 'session-1');
  assert.equal(session.workspace_id, 'workspace-1');
  assert.equal(session.title, 'Planning session');
  assert.equal(session.status, 'active');
  assert.equal(session.message_count, 2);
});

test('normalizeV3Session preserves explicit message totals and avoids unknown status', () => {
  const session = normalizeV3Session({ id: 'session-2', is_active: false, message_count: 7 }, 'workspace-1', []);

  assert.equal(session.status, 'inactive');
  assert.equal(session.message_count, 7);
});

test('normalizeV3Message carries workspace and session context for v3 message pages', () => {
  const message = normalizeV3Message({ id: 'msg-1', content: 'hello' }, 'workspace-1', 'session-1');

  assert.equal(message.workspace_id, 'workspace-1');
  assert.equal(message.session_id, 'session-1');
  assert.equal(message.content, 'hello');
});

test('proxy policy rejects non-v3 paths and allows read-only v3 POST list routes', () => {
  assert.equal(isAllowedProxyPath(['v3', 'workspaces', 'workspace-1', 'sessions', 'list']), true);
  assert.equal(isAllowedProxyPath(['v2', 'workspaces']), false);
  assert.equal(isAllowedProxyPath(['not-v3']), false);
  assert.equal(isReadOnlyPostPath(['v3', 'workspaces', 'workspace-1', 'sessions', 'list']), true);
  assert.equal(isReadOnlyPostPath(['v3', 'workspaces', 'workspace-1', 'sessions', 'session-1']), false);
});

test('performance metric config refuses to label queue/demo values as live latency', () => {
  assert.deepEqual(getPerformanceMetricConfig([{ label: 'now', pending_work_units: 3 }]), {
    key: 'pending_work_units',
    label: 'Pending work units',
    unit: 'work units'
  });
  assert.equal(getPerformanceMetricConfig([{ label: 'now', latency_ms: 42 }]).label, 'Demo latency (ms)');
});

test('sanitizePublicText redacts private env labels, local origins, paths, and token shaped strings', () => {
  const unsafe = 'Set HONCHO_BASE_URL=http://192.168.20.14:8000 and HONCHO_API_KEY=sk-1234567890abcdefghijklmnopqrstuvwx in /root/.hermes/config.yaml for the operator note.';
  const sanitized = sanitizePublicText(unsafe);

  assert.equal(sanitized.includes('HONCHO_BASE_URL'), false);
  assert.equal(sanitized.includes('HONCHO_API_KEY'), false);
  assert.equal(sanitized.includes('192.168.'), false);
  assert.equal(sanitized.includes('/root/.hermes'), false);
  assert.equal(sanitized.includes('sk-1234567890abcdefghijklmnopqrstuvwx'), false);
});

test('summarizePerformanceTelemetry exposes freshness, request, latency, error, and degraded states', () => {
  const summary = summarizePerformanceTelemetry({
    generatedAt: '2026-05-25T00:00:10.000Z',
    source: 'live-partial',
    records: [
      { path: '/v3/workspaces/workspace-1/peers/list', ok: true, status: 200, latency_ms: 40, observed_at: '2026-05-25T00:00:01.000Z' },
      { path: '/v3/workspaces/workspace-1/sessions/list', ok: false, status: 502, error: 'timeout', latency_ms: 10000, observed_at: '2026-05-25T00:00:02.000Z' }
    ]
  });

  assert.equal(summary.health.state, 'degraded');
  assert.equal(summary.freshness.state, 'live');
  assert.equal(summary.requests.total, 2);
  assert.equal(summary.errors.total, 1);
  assert.equal(summary.latency.avg_ms, 5020);
  assert.equal(summary.latency.max_ms, 10000);
  assert.equal(summary.slow_endpoints[0].path, '/v3/workspaces/workspace-1/sessions/list');
});

test('getHonchoSnapshot attaches request telemetry when live fetches partially fail', async () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };
  process.env.HONCHO_BASE_URL = 'http://honcho.example';
  process.env.HONCHO_WORKSPACE_ID = 'workspace-1';
  process.env.USE_DEMO_DATA = 'false';
  process.env.ALLOW_LIVE_PUBLIC_DATA = 'true';
  globalThis.fetch = async (url) => {
    const path = new URL(String(url)).pathname;
    if (path.endsWith('/sessions/list')) return new Response(JSON.stringify({ error: 'temporary' }), { status: 503, headers: { 'content-type': 'application/json' } });
    const payloads = {
      '/v3/workspaces/workspace-1/peers/list': { peers: [{ id: 'peer-1' }] },
      '/v3/workspaces/workspace-1/conclusions/list': { conclusions: [] }
    };
    return new Response(JSON.stringify(payloads[path] || { messages: [] }), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  try {
    const snapshot = await getHonchoSnapshot();
    assert.equal(snapshot.source, 'live-partial');
    assert.equal(snapshot.performance.health.state, 'degraded');
    assert.equal(snapshot.performance.requests.failed, 1);
    assert.equal(snapshot.performance.errors.recent[0].path, '/v3/workspaces/workspace-1/sessions/list');
    assert.ok(snapshot.performance.freshness.generated_at);
  } finally {
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
  }
});

test('getHonchoSnapshot defaults public runtime to demo unless live data is explicitly allowed', async () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };
  let fetchCalled = false;
  process.env.HONCHO_BASE_URL = 'http://honcho.example';
  process.env.HONCHO_WORKSPACE_ID = 'agent-company';
  process.env.USE_DEMO_DATA = 'false';
  process.env.HERMES_KANBAN_DBS = '/private/missing-kanban.db';
  delete process.env.ALLOW_LIVE_PUBLIC_DATA;
  globalThis.fetch = async () => { fetchCalled = true; throw new Error('live fetch should be disabled by default'); };

  try {
    const snapshot = await getHonchoSnapshot();
    const serialized = JSON.stringify(snapshot);
    assert.equal(snapshot.source, 'demo');
    assert.equal(snapshot.env.liveDataAllowed, false);
    assert.equal(fetchCalled, false);
    assert.equal(serialized.includes('agent-company'), false);
  } finally {
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
  }
});

test('getHonchoSnapshot attaches sanitized Kanban runtime in protected public mode without live Honcho fetches', async () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };
  const fixture = createKanbanFixtureDb();
  let fetchCalled = false;
  process.env.HONCHO_BASE_URL = 'http://honcho.example';
  process.env.HONCHO_WORKSPACE_ID = 'agent-company';
  process.env.USE_DEMO_DATA = 'false';
  process.env.ALLOW_LIVE_PUBLIC_DATA = 'false';
  process.env.HERMES_KANBAN_DBS = fixture.dbPath;
  globalThis.fetch = async () => { fetchCalled = true; throw new Error('live Honcho fetch should stay disabled'); };

  try {
    const snapshot = await getHonchoSnapshot();
    const agents = snapshot.kanban?.agents || [];
    const discovered = agents.map((agent) => agent.assigned_task).sort();
    const serialized = JSON.stringify(snapshot);

    assert.equal(snapshot.source, 'demo');
    assert.equal(fetchCalled, false);
    assert.equal(snapshot.env.liveDataAllowed, false);
    assert.equal(snapshot.kanban.available, true);
    assert.equal(snapshot.kanban.state, 'available');
    assert.equal(snapshot.kanban.freshness.state, 'live');
    assert.equal(snapshot.kanban.source, 'hermes-kanban:configured-db-1');
    assert.deepEqual(discovered, ['t_fixture_blocked', 't_fixture_ready', 't_fixture_running']);
    assert.equal(serialized.includes(fixture.dbPath), false);
    assert.equal(serialized.includes('/tmp/kanban-fixture'), false);
  } finally {
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
    fs.rmSync(fixture.dir, { recursive: true, force: true });
  }
});

test('getHonchoSnapshot sanitizes explicitly allowed live memory before public rendering', async () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };
  process.env.HONCHO_BASE_URL = 'http://honcho.example';
  process.env.HONCHO_WORKSPACE_ID = 'workspace-1';
  process.env.USE_DEMO_DATA = 'false';
  process.env.ALLOW_LIVE_PUBLIC_DATA = 'true';
  globalThis.fetch = async (url) => {
    const path = new URL(String(url)).pathname;
    const payloads = {
      '/v3/workspaces/workspace-1/peers/list': { peers: [{ id: 'peer-1', metadata: { current_goal: 'inspect /root/.hermes/config.yaml' } }] },
      '/v3/workspaces/workspace-1/sessions/list': { sessions: [{ id: 'session-1', is_active: true }] },
      '/v3/workspaces/workspace-1/conclusions/list': { conclusions: [{ id: 'c1', text: 'HONCHO_BASE_URL=http://10.0.0.8:8000' }] },
      '/v3/workspaces/workspace-1/sessions/session-1/messages/list': { messages: [{ id: 'message-1', content: 'Bearer abcdef1234567890abcdef1234567890abc and HONCHO_API_KEY=secret in /home/user/.env' }] }
    };
    return new Response(JSON.stringify(payloads[path] || {}), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  try {
    const snapshot = await getHonchoSnapshot();
    const serialized = JSON.stringify(snapshot);
    assert.equal(snapshot.source, 'live');
    assert.equal(serialized.includes('HONCHO_BASE_URL'), false);
    assert.equal(serialized.includes('HONCHO_API_KEY'), false);
    assert.equal(serialized.includes('10.0.0.8'), false);
    assert.equal(serialized.includes('/root/.hermes'), false);
    assert.equal(serialized.includes('/home/user/.env'), false);
    assert.equal(serialized.includes('abcdef1234567890abcdef1234567890abc'), false);
  } finally {
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
  }
});
