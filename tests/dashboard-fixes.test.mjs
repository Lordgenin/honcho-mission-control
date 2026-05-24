import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeV3Session, normalizeV3Message, getPerformanceMetricConfig, sanitizePublicText } from '../lib/data-utils.js';
import { isAllowedProxyPath, isReadOnlyPostPath } from '../lib/proxy-policy.js';
import { getHonchoSnapshot } from '../lib/honcho-client.js';

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

test('getHonchoSnapshot defaults public runtime to demo unless live data is explicitly allowed', async () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };
  let fetchCalled = false;
  process.env.HONCHO_BASE_URL = 'http://honcho.example';
  process.env.HONCHO_WORKSPACE_ID = 'agent-company';
  process.env.USE_DEMO_DATA = 'false';
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
