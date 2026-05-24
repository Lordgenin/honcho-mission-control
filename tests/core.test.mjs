import assert from 'node:assert/strict';
import test from 'node:test';
import { getDashboardEnv } from '../lib/env.js';
import { discoverAgents, filterCollection } from '../lib/data-utils.js';
import { getDemoSnapshot } from '../lib/demo-data.js';

test('getDashboardEnv keeps secrets server-side and applies safe defaults', () => {
  const env = getDashboardEnv({});
  assert.equal(env.HONCHO_BASE_URL, 'http://localhost:8000');
  assert.equal(env.ENABLE_MUTATIONS, false);
  assert.equal(env.USE_DEMO_DATA, false);
  assert.equal(env.NEXT_PUBLIC_DASHBOARD_NAME, 'Honcho Mission Control');
  assert.equal(Object.prototype.propertyIsEnumerable.call(env, 'HONCHO_API_KEY'), false);
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
  assert.ok(snapshot.performance.some((point) => typeof point.latency_ms === 'number'));
});
