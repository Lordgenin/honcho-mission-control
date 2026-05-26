import assert from 'node:assert/strict';
import test from 'node:test';
import { getDashboardEnv, getPublicDashboardEnv } from '../lib/env.js';
import { createRouteScopedSnapshot, discoverAgents, filterCollection, getConclusionProvenanceLabel, getPeerDiscoveryFailure, getSessionMessageCountLabel, getSnapshotPosture, getSubsystemStatuses, normalizeConclusion, protectPublicProxyResponse, protectUnauthenticatedLiveSnapshot, resetPerformanceTelemetryHistory, sanitizePublicValue, summarizePerformanceTelemetry, templateEndpointPath } from '../lib/data-utils.js';
import { getDemoSnapshot } from '../lib/demo-data.js';
import { getHonchoSnapshot } from '../lib/honcho-client.js';
import { getHealthPayload } from '../lib/health.js';

test('getDashboardEnv keeps secrets server-side and applies safe demo defaults', () => {
  const env = getDashboardEnv({});
  assert.equal(env.HONCHO_BASE_URL, 'http://localhost:8000');
  assert.equal(env.ENABLE_MUTATIONS, false);
  assert.equal(env.USE_DEMO_DATA, true);
  assert.equal(env.ALLOW_LIVE_PUBLIC_DATA, false);
  assert.equal(env.NEXT_PUBLIC_DASHBOARD_NAME, 'Honcho Mission Control');
  assert.equal(Object.prototype.propertyIsEnumerable.call(env, 'HONCHO_API_KEY'), false);
});

test('getPublicDashboardEnv redacts upstream Honcho URL, API-key flags, and private-network hints', () => {
  const publicEnv = getPublicDashboardEnv({
    HONCHO_BASE_URL: 'http://127.0.0.1:8001/private-path',
    HONCHO_API_KEY: 'example-api-key-present',
    HONCHO_WORKSPACE_ID: 'workspace-1',
    USE_DEMO_DATA: 'false',
    ENABLE_MUTATIONS: 'false'
  });

  assert.equal(publicEnv.HONCHO_BASE_URL, undefined);
  assert.equal(publicEnv.HONCHO_API_KEY, undefined);
  assert.equal(publicEnv.HONCHO_WORKSPACE_ID, undefined);
  assert.equal(publicEnv.ENABLE_MUTATIONS, undefined);
  assert.equal(publicEnv.USE_DEMO_DATA, undefined);
  assert.equal(publicEnv.hasHonchoApiKey, undefined);
  assert.equal(publicEnv.honchoConnection, 'server-side connection configured');
  assert.equal(JSON.stringify(publicEnv).includes('127.0.0.1'), false);
  assert.equal(JSON.stringify(publicEnv).includes('example-api-key-present'), false);
  assert.equal(JSON.stringify(publicEnv).includes('self-hosted'), false);
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
    assert.equal(snapshot.env.hasHonchoApiKey, undefined);
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

test('getSnapshotPosture labels public/operator modes with next operator action', () => {
  const demo = getSnapshotPosture({ source: 'demo', env: { liveDataAllowed: false, demoData: 'demo requested' }, status: { ok: true }, readOnly: true });
  assert.equal(demo.label, 'public-demo');
  assert.match(demo.nextAction, /self-host/i);

  const live = getSnapshotPosture({ source: 'live', env: { liveDataAllowed: true }, status: { ok: true }, readOnly: true });
  assert.equal(live.label, 'operator-live-private');
  assert.match(live.summary, /Scoped live data/i);

  const degraded = getSnapshotPosture({ source: 'live-partial', env: { liveDataAllowed: true }, status: { ok: false, failures: [{ path: '/v3/workspaces/w/peers/list', status: 503, error: 'http-503' }] }, readOnly: true });
  assert.equal(degraded.label, 'operator-live-partial');
  assert.match(degraded.summary, /sources are unavailable or degraded/i);
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
    assert.deepEqual(failure, { path: '/v3/workspaces/{workspace}/peers/list', status: 503, error: 'http-503' });
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

test('normalizeConclusion exposes confidence provenance without inventing numeric confidence', () => {
  const missing = normalizeConclusion({ id: 'c1', text: 'Use explicit provenance', evidence_count: 3, created_at: '2026-05-25T00:00:00Z' }, 'workspace-1');
  assert.equal(missing.confidence, null);
  assert.equal(missing.confidence_status, 'unavailable');
  assert.equal(missing.confidence_reason, 'Honcho did not report confidence');
  assert.equal(missing.evidence_count, 3);
  assert.equal(missing.provenance.source, 'honcho-conclusion');
  assert.match(getConclusionProvenanceLabel(missing), /confidence unavailable/i);
  assert.match(getConclusionProvenanceLabel(missing), /3 evidence item/i);

  const reported = normalizeConclusion({ id: 'c2', content: 'Reported confidence', confidence: 0.7, updated_at: '2026-05-25T00:10:00Z' }, 'workspace-1');
  assert.equal(reported.confidence, 0.7);
  assert.equal(reported.confidence_status, 'reported');
  assert.match(getConclusionProvenanceLabel(reported), /reported by Honcho/);
});

test('getSubsystemStatuses separates Honcho, Kanban, gateway, browser, and privacy posture', () => {
  const statuses = getSubsystemStatuses({
    source: 'live-partial',
    status: { ok: false, failures: [{ path: '/v3/workspaces/w/peers/list', status: 503, error: 'http-503' }] },
    kanban: { available: false, state: 'degraded', source: 'hermes-kanban:configured-list' },
    performance: { freshness: { state: 'stale' } },
    env: { liveDataAllowed: false }
  });

  assert.deepEqual(statuses.map((status) => status.id), ['honcho', 'kanban', 'gateway-dispatcher', 'browser-runtime', 'public-privacy']);
  assert.equal(statuses.find((status) => status.id === 'honcho').state, 'degraded');
  assert.equal(statuses.find((status) => status.id === 'kanban').state, 'degraded');
  assert.equal(statuses.find((status) => status.id === 'public-privacy').state, 'public-protected');
});

test('shell includes a client refresh hook for polling dynamic runtime state', async () => {
  const source = await import('node:fs/promises').then((fs) => fs.readFile(new URL('../components/shell.tsx', import.meta.url), 'utf8'));
  assert.match(source, /router\.refresh\(\)/);
  assert.match(source, /visibilitychange/);
  assert.match(source, /setInterval/);
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

test('getHonchoSnapshot in externally protected operator mode shows sanitized message and memory bodies', async () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };
  process.env.HONCHO_BASE_URL = 'http://honcho.example';
  process.env.HONCHO_WORKSPACE_ID = 'workspace-1';
  process.env.USE_DEMO_DATA = 'false';
  process.env.ALLOW_LIVE_PUBLIC_DATA = 'true';
  process.env.ENABLE_MUTATIONS = 'true';
  globalThis.fetch = async (url) => {
    const path = new URL(String(url)).pathname;
    const payloads = {
      '/v3/workspaces/workspace-1/peers/list': { peers: [{ id: 'hermes-jarvis', metadata: { type: 'agent', current_goal: 'Ship live memory dashboard', raw: { token: 'secret-token-value' } } }] },
      '/v3/workspaces/workspace-1/sessions/list': { sessions: [{ id: 'session-1', is_active: true, metadata: { title: 'Operator memory session' } }] },
      '/v3/workspaces/workspace-1/conclusions/list': { conclusions: [{ id: 'conclusion-1', text: 'Use scoped live dashboard data for the operator', metadata: { raw: { config: 'HONCHO_API_KEY=secret' } } }] },
      '/v3/workspaces/workspace-1/sessions/session-1/messages/list': { messages: [{ id: 'message-1', content: 'Live dashboard message from the configured workspace; token secret-token-value should not leak', raw: { nested: { token: 'secret-token-value' } } }] }
    };
    return new Response(JSON.stringify(payloads[path] || {}), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  try {
    const snapshot = await getHonchoSnapshot();
    const serialized = JSON.stringify(snapshot);

    assert.equal(snapshot.source, 'live');
    assert.equal(snapshot.readOnly, true);
    assert.equal(snapshot.messages.length, 1);
    assert.equal(snapshot.messages[0].content, 'Live dashboard message from the configured workspace; [redacted] should not leak');
    assert.equal(snapshot.sessions[0].message_count, 1);
    assert.equal(snapshot.conclusions[0].text, 'Use scoped live dashboard data for the operator');
    assert.equal(serialized.includes('Live dashboard message from the configured workspace'), true);
    assert.equal(serialized.includes('Use scoped live dashboard data for the operator'), true);
    assert.equal(serialized.includes('HONCHO_API_KEY'), false);
    assert.equal(serialized.includes('secret-token-value'), false);
    assert.equal(serialized.includes('\"raw\"'), false);
  } finally {
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
  }
});

test('protectUnauthenticatedLiveSnapshot strips message and memory bodies with public-mode copy', () => {
  const protectedSnapshot = protectUnauthenticatedLiveSnapshot({
    readOnly: false,
    workspaces: [{ id: 'workspace-1', summary: 'private workspace detail' }],
    sessions: [{ id: 'session-1', title: 'private session detail', message_count: 2 }],
    messages: [{ id: 'message-1', content: 'public viewers must not see this operator message' }],
    conclusions: [{ id: 'conclusion-1', text: 'public viewers must not see this conclusion' }]
  });
  const serialized = JSON.stringify(protectedSnapshot);

  assert.equal(protectedSnapshot.readOnly, true);
  assert.equal(protectedSnapshot.messages[0].content, '[redacted: live message body hidden in public/unauthenticated mode]');
  assert.equal(protectedSnapshot.conclusions[0].text, '[redacted: live memory text hidden in public/unauthenticated mode]');
  assert.equal(serialized.includes('without operator authentication'), false);
  assert.equal(serialized.includes('public viewers must not see'), false);
});

test('public Honcho proxy response shaping strips arbitrary message and conclusion bodies by resource path', () => {
  const proxyMessages = protectPublicProxyResponse({
    messages: [
      {
        id: 'message-1',
        workspace_id: 'workspace-1',
        session_id: 'session-1',
        role: 'user',
        content: 'Plain harmless-looking sentence that regex sanitizers would not redact',
        text: 'Another plain sentence that must not reach a browser',
        raw: { debug: 'raw body' }
      }
    ]
  }, ['v3', 'workspaces', 'workspace-1', 'sessions', 'session-1', 'messages', 'list']);
  const proxyConclusions = protectPublicProxyResponse({
    items: [
      {
        id: 'conclusion-1',
        workspace_id: 'workspace-1',
        text: 'Benign-looking memory conclusion that is still private',
        content: 'Fallback conclusion body must also be redacted',
        confidence: 0.81
      }
    ]
  }, ['v3', 'workspaces', 'workspace-1', 'conclusions', 'list']);
  const wrappedMessage = protectPublicProxyResponse({
    message: {
      id: 'message-2',
      session_id: 'session-2',
      content: 'Wrapped message content must be redacted',
      text: 'Wrapped message text must be redacted'
    }
  }, ['v3', 'workspaces', 'workspace-1', 'sessions', 'session-2', 'messages', 'message-2']);
  const wrappedResult = protectPublicProxyResponse({
    result: {
      id: 'message-3',
      session_id: 'session-3',
      content: 'Wrapped result content must be redacted'
    }
  }, ['v3', 'workspaces', 'workspace-1', 'sessions', 'session-3', 'messages', 'message-3']);
  const wrappedConclusion = protectPublicProxyResponse({
    conclusion: {
      id: 'conclusion-2',
      text: 'Wrapped conclusion text must be redacted',
      content: 'Wrapped conclusion content must be redacted',
      confidence: 0.72
    }
  }, ['v3', 'workspaces', 'workspace-1', 'conclusions', 'conclusion-2']);
  const nestedDataMessage = protectPublicProxyResponse({
    data: {
      id: 'message-4',
      session_id: 'session-4',
      content: 'Nested data message content must be redacted'
    }
  }, ['v3', 'workspaces', 'workspace-1', 'sessions', 'session-4', 'messages', 'message-4']);
  const serialized = JSON.stringify({ proxyMessages, proxyConclusions, wrappedMessage, wrappedResult, wrappedConclusion, nestedDataMessage });

  assert.equal(proxyMessages.messages[0].content, '[redacted: live message body hidden in public/unauthenticated mode]');
  assert.equal(proxyMessages.messages[0].text, '[redacted: live message body hidden in public/unauthenticated mode]');
  assert.equal(proxyMessages.messages[0].session_id, 'session-1');
  assert.equal(proxyConclusions.items[0].text, '[redacted: live memory text hidden in public/unauthenticated mode]');
  assert.equal(proxyConclusions.items[0].content, '[redacted: live memory text hidden in public/unauthenticated mode]');
  assert.equal(proxyConclusions.items[0].confidence, 0.81);
  assert.equal(wrappedMessage.message.content, '[redacted: live message body hidden in public/unauthenticated mode]');
  assert.equal(wrappedMessage.message.text, '[redacted: live message body hidden in public/unauthenticated mode]');
  assert.equal(wrappedMessage.message.session_id, 'session-2');
  assert.equal(wrappedResult.result.content, '[redacted: live message body hidden in public/unauthenticated mode]');
  assert.equal(wrappedConclusion.conclusion.text, '[redacted: live memory text hidden in public/unauthenticated mode]');
  assert.equal(wrappedConclusion.conclusion.content, '[redacted: live memory text hidden in public/unauthenticated mode]');
  assert.equal(wrappedConclusion.conclusion.confidence, 0.72);
  assert.equal(nestedDataMessage.data.content, '[redacted: live message body hidden in public/unauthenticated mode]');
  assert.equal(serialized.includes('Plain harmless-looking sentence'), false);
  assert.equal(serialized.includes('Benign-looking memory conclusion'), false);
  assert.equal(serialized.includes('Wrapped message content'), false);
  assert.equal(serialized.includes('Wrapped result content'), false);
  assert.equal(serialized.includes('Wrapped conclusion text'), false);
  assert.equal(serialized.includes('Nested data message content'), false);
  assert.equal(serialized.includes('\\"raw\\"'), false);
});

test('public Honcho proxy response shaping leaves non-body resources sanitized without message redaction', () => {
  const proxyPeers = protectPublicProxyResponse({ peers: [{ id: 'peer-1', name: 'Visible peer', raw: { token: 'secret-token-value' } }] }, ['v3', 'workspaces', 'workspace-1', 'peers', 'list']);

  assert.equal(proxyPeers.peers[0].name, 'Visible peer');
  assert.equal(JSON.stringify(proxyPeers).includes('raw'), false);
  assert.equal(JSON.stringify(proxyPeers).includes('secret-token-value'), false);
});

test('public docs and UI copy do not imply built-in operator authentication exists', async () => {
  const fs = await import('node:fs/promises');
  const files = [
    '../README.md',
    '../components/views.tsx',
    '../lib/data-utils.js',
    '../docs/PUBLIC_OPERATOR_MODES.md',
    '../docs/public-self-hosting.md',
    '../docs/SELF_HOSTING.md',
    '../docs/API_CLIENT.md',
    '../docs/local-startup.md'
  ];

  for (const file of files) {
    const source = await fs.readFile(new URL(file, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /without operator authentication|operator-authenticated|behind authentication|authenticated\/private operator|authenticated operator/i, file);
  }
});

test('summarizePerformanceTelemetry records live aggregate history without raw endpoint details', () => {
  resetPerformanceTelemetryHistory();

  const first = summarizePerformanceTelemetry({
    source: 'live',
    generatedAt: '2026-05-25T00:00:01.000Z',
    records: [
      { path: '/v3/workspaces/workspace-1/peers/list', ok: true, status: 200, latency_ms: 120, observed_at: '2026-05-25T00:00:00.000Z' },
      { path: '/v3/workspaces/workspace-1/sessions/list', ok: false, status: 503, error: 'http-503', latency_ms: 240, observed_at: '2026-05-25T00:00:00.500Z' }
    ]
  });
  const second = summarizePerformanceTelemetry({
    source: 'live',
    generatedAt: '2026-05-25T00:00:31.000Z',
    records: [
      { path: '/v3/workspaces/workspace-1/conclusions/list', ok: true, status: 200, latency_ms: 60, observed_at: '2026-05-25T00:00:30.000Z' }
    ]
  });

  assert.equal(first.timeseries.length, 1);
  assert.equal(second.timeseries.length, 2);
  assert.deepEqual(second.timeseries.map((point) => point.label), ['00:00:01', '00:00:31']);
  assert.deepEqual(second.timeseries.map((point) => point.request_count), [2, 1]);
  assert.deepEqual(second.timeseries.map((point) => point.failed_count), [1, 0]);
  assert.equal(JSON.stringify(second.timeseries).includes('workspace-1'), false);
  assert.equal(second.history.available, true);
  assert.equal(second.history.source, 'live-aggregate-ring-buffer');
});

test('summarizePerformanceTelemetry marks live history unavailable before enough samples', () => {
  resetPerformanceTelemetryHistory();
  const summary = summarizePerformanceTelemetry({ source: 'live', generatedAt: '2026-05-25T00:00:01.000Z', records: [] });

  assert.equal(summary.timeseries.length, 0);
  assert.equal(summary.history.available, false);
  assert.equal(summary.history.reason, 'insufficient-samples');
});

test('summarizePerformanceTelemetry templates endpoint identifiers in browser-visible telemetry', () => {
  resetPerformanceTelemetryHistory();
  const summary = summarizePerformanceTelemetry({
    source: 'live',
    generatedAt: '2026-05-25T00:00:01.000Z',
    records: [
      { path: '/v3/workspaces/agent-company/sessions/session-secret-123/messages/list', ok: true, status: 200, latency_ms: 311 },
      { path: '/v3/workspaces/agent-company/sessions/session-secret-456/messages/list', ok: false, status: 500, error: 'http-500', latency_ms: 499 }
    ]
  });
  const serialized = JSON.stringify(summary);

  assert.equal(templateEndpointPath('/v3/workspaces/agent-company/sessions/session-secret-123/messages/list'), '/v3/workspaces/{workspace}/sessions/{session}/messages/list');
  assert.equal(summary.slow_endpoints[0].path, '/v3/workspaces/{workspace}/sessions/{session}/messages/list');
  assert.equal(summary.errors.recent[0].path, '/v3/workspaces/{workspace}/sessions/{session}/messages/list');
  assert.equal(serialized.includes('agent-company'), false);
  assert.equal(serialized.includes('session-secret'), false);
});

test('context route scope exposes aggregate summary without raw nested structures or identifiers', () => {
  const scoped = createRouteScopedSnapshot({
    source: 'live',
    readOnly: true,
    env: { liveDataAllowed: true },
    status: { ok: true },
    generated_at: '2026-05-25T00:00:00Z',
    workspaces: [{ id: 'agent-company', workspace_id: 'agent-company', name: 'agent-company' }],
    peers: [{ id: 'hermes-jarvis', workspace_id: 'agent-company', metadata: { type: 'agent', raw: { token: 'secret-token-value' } } }],
    sessions: [{ id: 'session-secret-123', workspace_id: 'agent-company', message_count: 3 }],
    messages: [{ id: 'message-secret-1', workspace_id: 'agent-company', session_id: 'session-secret-123', content: 'private operator memory payload' }],
    conclusions: [{ id: 'conclusion-secret-1', workspace_id: 'agent-company', text: 'private conclusion' }],
    kanban: { available: true, state: 'available', source: 'container-mounted-db', agents: [{ id: 'hermes-jarvis', assigned_task: 't_private', current_goal: 'private project raw payload' }] }
  }, 'context');
  const serialized = JSON.stringify(scoped);

  assert.equal(scoped.context_summary.data_minimized, true);
  assert.equal(scoped.context_summary.workspace_count, 1);
  assert.equal(scoped.workspaces.length, 0);
  assert.equal(scoped.messages.length, 0);
  assert.equal(scoped.conclusions.length, 0);
  assert.equal(serialized.includes('agent-company'), false);
  assert.equal(serialized.includes('session-secret'), false);
  assert.equal(serialized.includes('message-secret'), false);
  assert.equal(serialized.includes('private operator memory payload'), false);
  assert.equal(serialized.includes('\"raw\"'), false);
});

test('sanitizePublicValue removes nested raw fields and private semantic text, not only concrete tokens', () => {
  const sanitized = sanitizePublicValue({
    content: 'User said private operator local network memory mentions JWT config state',
    nested: { raw: { token: 'secret-token-value', child: { content: 'raw context JSON' } } }
  });
  const serialized = JSON.stringify(sanitized);

  assert.equal(serialized.includes('private operator'), false);
  assert.equal(serialized.includes('local network'), false);
  assert.equal(serialized.includes('JWT'), false);
  assert.equal(serialized.includes('secret-token-value'), false);
  assert.equal(serialized.includes('\"raw\"'), false);
});

test('createRouteScopedSnapshot keeps non-message routes from serializing broad live payloads', () => {
  const source = {
    source: 'live',
    readOnly: true,
    env: { liveDataAllowed: true },
    status: { ok: true },
    generated_at: '2026-05-25T00:00:00Z',
    workspaces: [{ id: 'agent-company', summary: 'Safe workspace summary' }],
    peers: [{ id: 'hermes-jarvis', metadata: { type: 'agent', role: 'engineering', raw: { token: 'secret-token-value' } } }],
    sessions: [{ id: 'session-1', title: 'Private imported memory session', message_count: 99 }],
    messages: Array.from({ length: 80 }, (_, index) => ({ id: `message-${index}`, content: `private raw Honcho memory payload ${index} mentions JWT and /root/.hermes/config.yaml` })),
    conclusions: [{ id: 'conclusion-1', text: 'Imported private project conclusion mentions HONCHO_API_KEY and local network' }],
    kanban: { available: true, state: 'available', source: 'container-mounted-db', agents: [{ id: 'hermes-jarvis', assigned_task: 't_private', current_goal: 'private project raw payload' }] },
    webhooks: [{ event: 'message.created', url: 'http://127.0.0.1:8000/hook' }]
  };

  for (const route of ['home', 'agents', 'workspaces', 'performance', 'api-playground', 'webhooks']) {
    const scoped = createRouteScopedSnapshot(source, route);
    const serialized = JSON.stringify(scoped);
    assert.equal(serialized.includes('private raw Honcho memory payload'), false, `${route} serialized message bodies`);
    assert.equal(serialized.includes('/root/.hermes'), false, `${route} serialized local paths`);
    assert.equal(serialized.includes('HONCHO_API_KEY'), false, `${route} serialized env labels`);
    assert.ok(serialized.length < JSON.stringify(source).length, `${route} should be smaller than the broad snapshot`);
  }

  const messages = createRouteScopedSnapshot(source, 'messages');
  assert.equal(messages.messages.length, 50);
  assert.equal(JSON.stringify(messages).includes('secret-token-value'), false);
});

test('health payload reports safe build, public mode, and redacted Kanban diagnostics', () => {
  const payload = getHealthPayload({
    now: new Date('2026-05-25T00:00:00Z'),
    envSource: {
      ALLOW_LIVE_PUBLIC_DATA: 'false',
      USE_DEMO_DATA: 'false',
      ENABLE_MUTATIONS: 'false',
      HERMES_KANBAN_DBS: '/data/hermes/kanban.db',
      HERMES_KANBAN_DB: '/data/hermes/kanban.db',
      HERMES_KANBAN_DATABASE: '/data/hermes/kanban.db',
      HERMES_KANBAN_SOURCE_MODE: 'live'
    }
  });

  assert.equal(payload.ok, true);
  assert.equal(payload.runtime.public_data_mode, 'protected-default');
  assert.equal(payload.runtime.live_private_data_requires_server_opt_in, true);
  assert.equal(payload.kanban.configured, true);
  assert.equal(payload.kanban.container_mount, undefined);
  assert.equal(typeof payload.kanban.source_readable, 'boolean');
  assert.equal(payload.kanban.source_label, 'container-mounted-db');
  assert.equal(payload.kanban.source_mode, 'live');
  assert.equal(JSON.stringify(payload).includes('/data/hermes/kanban.db'), false);
  assert.equal(JSON.stringify(payload).includes('/root/.hermes'), false);
});

test('health payload can reserve raw paths for explicit operator diagnostics', () => {
  const payload = getHealthPayload({
    now: new Date('2026-05-25T00:00:00Z'),
    exposeOperatorDiagnostics: true,
    envSource: { HERMES_KANBAN_DBS: '/data/hermes/kanban.db' }
  });

  assert.equal(payload.kanban.container_mount, undefined);
  assert.equal(payload.operator_diagnostics.kanban_container_mount, '/data/hermes/kanban.db');
});

test('health payload labels static Kanban snapshots without exposing raw paths', () => {
  const payload = getHealthPayload({
    now: new Date('2026-05-25T00:00:00Z'),
    envSource: {
      HERMES_KANBAN_DBS: '/data/hermes/kanban.db',
      HERMES_KANBAN_SNAPSHOT_HOST_DB: '/private/copied-kanban.db'
    }
  });

  assert.equal(payload.kanban.source_label, 'static-snapshot-db');
  assert.equal(payload.kanban.source_mode, 'static-snapshot');
  assert.equal(payload.kanban.snapshot_reason, 'copied-db-snapshot');
  assert.equal(JSON.stringify(payload).includes('/private/copied-kanban.db'), false);
});

test('health payload lets explicit live mode override stale legacy Kanban snapshot env', () => {
  const payload = getHealthPayload({
    now: new Date('2026-05-25T00:00:00Z'),
    envSource: {
      HERMES_KANBAN_DBS: '/data/hermes/kanban.db',
      HERMES_KANBAN_DB: '/data/hermes/kanban.db',
      HERMES_KANBAN_SOURCE_MODE: 'live',
      HERMES_KANBAN_SNAPSHOT_HOST_DB: '/private/stale-copied-kanban.db'
    }
  });

  assert.equal(payload.kanban.source_label, 'container-mounted-db');
  assert.equal(payload.kanban.source_mode, 'live');
  assert.equal(payload.kanban.snapshot_reason, undefined);
  assert.equal(JSON.stringify(payload).includes('/private/stale-copied-kanban.db'), false);
});

test('health payload exposes safe Kanban freshness without raw task or DB data', () => {
  const payload = getHealthPayload({
    now: new Date('2026-05-25T12:00:00Z'),
    envSource: {
      HERMES_KANBAN_DBS: '/data/hermes/kanban.db',
      HERMES_KANBAN_DB: '/data/hermes/kanban.db',
      HERMES_KANBAN_SOURCE_MODE: 'live'
    },
    canReadContainerKanbanDbImpl: () => true,
    getKanbanRuntimeSnapshotImpl: ({ env, generatedAt }) => {
      assert.equal(env.HERMES_KANBAN_DBS, '/data/hermes/kanban.db');
      assert.equal(generatedAt, '2026-05-25T12:00:00.000Z');
      return {
        available: true,
        state: 'available',
        freshness: {
          latest_observed_at: '2026-05-25T11:59:30.000Z',
          latest_task_at: '2026-05-25T11:59:00.000Z',
          latest_run_at: '2026-05-25T11:59:30.000Z',
          latest_event_at: '2026-05-25T11:59:30.000Z',
          running_task_count: 2,
          active_assignee_count: 3,
          state: 'live'
        },
        agents: [{ assigned_task: 't_private', current_goal: 'Do not expose this raw title' }]
      };
    }
  });

  assert.deepEqual(payload.kanban.freshness, {
    latest_observed_at: '2026-05-25T11:59:30.000Z',
    latest_task_at: '2026-05-25T11:59:00.000Z',
    latest_run_at: '2026-05-25T11:59:30.000Z',
    latest_event_at: '2026-05-25T11:59:30.000Z',
    running_task_count: 2,
    active_assignee_count: 3,
    state: 'live'
  });
  assert.equal(JSON.stringify(payload).includes('t_private'), false);
  assert.equal(JSON.stringify(payload).includes('Do not expose'), false);
  assert.equal(JSON.stringify(payload).includes('/data/hermes/kanban.db'), false);
});
