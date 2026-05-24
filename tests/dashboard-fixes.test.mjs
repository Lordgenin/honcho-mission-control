import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeV3Session, normalizeV3Message, getPerformanceMetricConfig } from '../lib/data-utils.js';
import { isAllowedProxyPath, isReadOnlyPostPath } from '../lib/proxy-policy.js';

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
