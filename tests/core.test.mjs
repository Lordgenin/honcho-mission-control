import assert from 'node:assert/strict';
import test from 'node:test';
import { getDashboardEnv, getPublicDashboardEnv } from '../lib/env.js';
import { discoverAgents, filterCollection, getPeerDiscoveryFailure, getSessionMessageCountLabel, getSnapshotPosture } from '../lib/data-utils.js';
import { getDemoSnapshot } from '../lib/demo-data.js';
import { getHonchoSnapshot } from '../lib/honcho-client.js';

test('getDashboardEnv keeps secrets server-side and applies safe defaults', () => {
  const env = getDashboardEnv({});
  assert.equal(env.HONCHO_BASE_URL, 'http://localhost:8000');
  assert.equal(env.ENABLE_MUTATIONS, false);
  assert.equal(env.USE_DEMO_DATA, false);
  assert.equal(env.NEXT_PUBLIC_DASHBOARD_NAME, 'Honcho Mission Control');
  assert.equal(Object.prototype.propertyIsEnumerable.call(env, 'HONCHO_API_KEY'), false);
});

test('getPublicDashboardEnv redacts upstream Honcho URL and exposes API key presence only', () => {
  const publicEnv = getPublicDashboardEnv({
    HONCHO_BASE_URL: 'http://127.0.0.1:8001/private-path',
    HONCHO_API_KEY: 'example-api-key-present',
    HONCHO_WORKSPACE_ID: 'workspace-1',
    USE_DEMO_DATA: 'false',
    ENABLE_MUTATIONS: 'false'
  });

  assert.equal(publicEnv.HONCHO_BASE_URL, undefined);
  assert.equal(publicEnv.HONCHO_API_KEY, undefined);
  assert.equal(publicEnv.hasHonchoApiKey, true);
  assert.equal(publicEnv.honchoConnection, 'loopback/self-hosted');
  assert.equal(JSON.stringify(publicEnv).includes('127.0.0.1'), false);
  assert.equal(JSON.stringify(publicEnv).includes('example-api-key-present'), false);
});

test('getHonchoSnapshot does not serialize raw base URL or API key secrets', async () => {
  const originalEnv = { ...process.env };
  process.env.HONCHO_BASE_URL = 'http://127.0.0.1:8001/internal-honcho';
  process.env.HONCHO_API_KEY = 'example-api-key-present';
  process.env.USE_DEMO_DATA = 'true';

  try {
    const snapshot = await getHonchoSnapshot();
    const serialized = JSON.stringify(snapshot);
    assert.equal(serialized.includes('127.0.0.1'), false);
    assert.equal(serialized.includes('internal-honcho'), false);
    assert.equal(serialized.includes('example-api-key-present'), false);
    assert.equal(snapshot.env.hasHonchoApiKey, true);
  } finally {
    process.env = originalEnv;
  }
});

test('getDashboardEnv parses true booleans explicitly only', () => {
  const env = getDashboardEnv({ ENABLE_MUTATIONS: 'true', USE_DEMO_DATA: '1' });
  assert.equal(env.ENABLE_MUTATIONS, true);
  assert.equal(env.USE_DEMO_DATA, true);
});

test('discoverAgents returns peers marked as agent without hardcoding teams', () => {
  const agents = discoverAgents([
    { id: 'builder-bot', metadata: { type: 'agent', role: 'engineering lead', team: 'build', status: 'online', capabilities: ['nextjs'] } },
    { id: 'ada', metadata: { type: 'human', role: 'operator' } },
    { id: 'review-bot', metadata: { kind: 'agent', role: 'qa', team: 'review', last_seen: 'now' } }
  ]);
  assert.deepEqual(agents.map((agent) => agent.id), ['builder-bot', 'review-bot']);
  assert.deepEqual(agents.map((agent) => agent.team), ['build', 'review']);
});

test('discoverAgents includes live Hermes peers even when metadata is empty', () => {
  const agents = discoverAgents([
    { id: 'user', metadata: {}, configuration: {}, workspace_id: 'agent-company' },
    { id: 'hermes', metadata: {}, configuration: {}, workspace_id: 'agent-company' },
    { id: 'hermes-jarvis', metadata: {}, configuration: {}, workspace_id: 'agent-company' },
    { id: 'hermes-weaver', metadata: {}, configuration: {}, workspace_id: 'agent-company' }
  ]);

  assert.deepEqual(agents.map((agent) => agent.id), ['hermes', 'hermes-jarvis', 'hermes-weaver']);
  assert.deepEqual(agents.map((agent) => agent.name), ['Hermes', 'Jarvis', 'Weaver']);
  assert.ok(agents.every((agent) => agent.team === 'hermes'));
  assert.ok(agents.every((agent) => agent.status === 'discovered'));
});

test('getPeerDiscoveryFailure detects failed peers list separately from empty peers', () => {
  assert.equal(getPeerDiscoveryFailure({ status: { ok: true }, peers: [] }), null);

  const failure = getPeerDiscoveryFailure({
    status: {
      ok: false,
      failures: [
        { path: '/v3/workspaces/workspace-1/sessions/list', status: 200, error: null },
        { path: '/v3/workspaces/workspace-1/peers/list', status: 503, error: 'http-503' }
      ]
    },
    peers: []
  });

  assert.deepEqual(failure, { path: '/v3/workspaces/workspace-1/peers/list', status: 503, error: 'http-503' });
});

test('getSnapshotPosture labels demo, live, and degraded states with next operator action', () => {
  assert.deepEqual(getSnapshotPosture({ source: 'demo', status: { ok: true }, readOnly: true }).label, 'Demo mode');
  assert.match(getSnapshotPosture({ source: 'demo', status: { ok: true }, readOnly: true }).nextAction, /Connect live Honcho/i);

  const live = getSnapshotPosture({ source: 'live', status: { ok: true }, readOnly: true });
  assert.equal(live.label, 'Live and healthy');
  assert.match(live.summary, /Honcho API is reachable/i);

  const degraded = getSnapshotPosture({ source: 'live-partial', status: { ok: false, failures: [{ path: '/v3/workspaces/w/peers/list', status: 503, error: 'http-503' }] }, readOnly: true });
  assert.equal(degraded.label, 'Live but degraded');
  assert.match(degraded.summary, /1 upstream check failed/i);
  assert.match(degraded.nextAction, /Open Agents/i);
});

test('session message count labels distinguish API counts from derived counts and unknowns', () => {
  assert.equal(getSessionMessageCountLabel({ message_count: 4, message_count_source: 'api' }), '4 messages (reported by Honcho)');
  assert.equal(getSessionMessageCountLabel({ message_count: 2, message_count_source: 'derived' }), '2 messages (derived from loaded messages)');
  assert.equal(getSessionMessageCountLabel({}), 'message count unavailable (Honcho did not report it)');
});

test('getHonchoSnapshot reports peers list failures with path, status, and error', async () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };
  process.env.HONCHO_BASE_URL = 'http://honcho.example';
  process.env.HONCHO_WORKSPACE_ID = 'workspace-1';
  process.env.USE_DEMO_DATA = 'false';
  process.env.ALLOW_LIVE_PUBLIC_DATA = 'true';
  globalThis.fetch = async (url) => {
    const path = new URL(String(url)).pathname;
    if (path === '/v3/workspaces/workspace-1/peers/list') {
      return new Response(JSON.stringify({ error: 'upstream unavailable' }), { status: 503, headers: { 'content-type': 'application/json' } });
    }
    const payloads = {
      '/v3/workspaces/workspace-1/sessions/list': { sessions: [] },
      '/v3/workspaces/workspace-1/conclusions/list': { conclusions: [] }
    };
    return new Response(JSON.stringify(payloads[path] || {}), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  try {
    const snapshot = await getHonchoSnapshot();
    const failure = getPeerDiscoveryFailure(snapshot);

    assert.equal(snapshot.source, 'live-partial');
    assert.equal(snapshot.status.ok, false);
    assert.deepEqual(failure, { path: '/v3/workspaces/workspace-1/peers/list', status: 503, error: 'http-503' });
    assert.equal(snapshot.peers.length, 0);
  } finally {
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
  }
});

test('filterCollection searches nested fields and reports empty matches', () => {
  const filtered = filterCollection([
    { id: 'm1', content: 'Hermes memory conclusion', workspace_id: 'example-workspace' },
    { id: 'm2', content: 'Webhook delivery failed', session: { id: 'ops' } }
  ], 'webhook');
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 'm2');
});

test('getDemoSnapshot includes Hermes-like operational data and clear demo mode', () => {
  const snapshot = getDemoSnapshot();
  assert.equal(snapshot.mode, 'demo');
  assert.ok(snapshot.workspaces.length >= 2);
  assert.ok(snapshot.peers.some((peer) => peer.metadata?.type === 'agent'));
  assert.ok(snapshot.performance.timeseries.some((point) => typeof point.latency_ms === 'number'));
  assert.equal(snapshot.performance.health.state, 'degraded');
});

test('getHonchoSnapshot reads v3 workspace-scoped lists and derives session message counts', async () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };
  const requested = [];
  process.env.HONCHO_BASE_URL = 'http://honcho.example';
  process.env.HONCHO_WORKSPACE_ID = 'workspace-1';
  process.env.USE_DEMO_DATA = 'false';
  process.env.ALLOW_LIVE_PUBLIC_DATA = 'true';
  globalThis.fetch = async (url, init) => {
    requested.push({ path: new URL(String(url)).pathname, method: init?.method });
    const path = new URL(String(url)).pathname;
    const payloads = {
      '/v3/workspaces/workspace-1/peers/list': { peers: [{ id: 'peer-1' }] },
      '/v3/workspaces/workspace-1/sessions/list': { sessions: [{ id: 'session-1', is_active: true }] },
      '/v3/workspaces/workspace-1/conclusions/list': { conclusions: [] },
      '/v3/workspaces/workspace-1/sessions/session-1/messages/list': { messages: [{ id: 'message-1', content: 'hi' }] }
    };
    return new Response(JSON.stringify(payloads[path] || {}), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  try {
    const snapshot = await getHonchoSnapshot();
    assert.equal(snapshot.status.ok, true);
    assert.equal(snapshot.sessions[0].status, 'active');
    assert.equal(snapshot.sessions[0].message_count, 1);
    assert.equal(snapshot.sessions[0].message_count_source, 'derived');
    assert.equal(getSessionMessageCountLabel(snapshot.sessions[0]), '1 message (derived from loaded messages)');
    assert.equal(snapshot.messages[0].workspace_id, 'workspace-1');
    assert.ok(requested.every((request) => request.method === 'POST'));
    assert.ok(requested.every((request) => request.path.startsWith('/v3/workspaces/workspace-1/')));
  } finally {
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
  }
});
