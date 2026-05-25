import assert from 'node:assert/strict';
import test from 'node:test';
import { discoverAgents } from '../lib/data-utils.js';
import { buildDegradedKanbanRuntime, summarizeKanbanRuntimeRows } from '../lib/kanban-runtime.js';

const generatedAt = '2026-05-25T12:00:00.000Z';

test('summarizeKanbanRuntimeRows derives active state from running Kanban task with fresh heartbeat', () => {
  const runtime = summarizeKanbanRuntimeRows({
    generatedAt,
    tasks: [{ id: 't_active', title: 'Ship source labels', assignee: 'jarvis', status: 'running', started_at: 1779709800 }],
    runs: [{ task_id: 't_active', profile: 'jarvis', status: 'running', last_heartbeat_at: 1779709980, started_at: 1779709800 }],
    events: [{ task_id: 't_active', kind: 'heartbeat', created_at: 1779709980 }]
  });

  assert.equal(runtime.available, true);
  assert.equal(runtime.agents[0].status, 'active');
  assert.equal(runtime.agents[0].current_goal, 'Ship source labels');
  assert.equal(runtime.agents[0].current_goal_source, 'kanban-task-title');
  assert.equal(runtime.agents[0].assigned_task, 't_active');
  assert.equal(runtime.agents[0].heartbeat_source, 'kanban-run-timestamp');
});

test('summarizeKanbanRuntimeRows derives idle state from queued Kanban work without pretending it is active', () => {
  const runtime = summarizeKanbanRuntimeRows({
    generatedAt,
    tasks: [{ id: 't_ready', title: 'Review launch copy', assignee: 'weaver', status: 'ready', created_at: 1779709000 }],
    runs: [],
    events: []
  });

  assert.equal(runtime.agents[0].status, 'idle');
  assert.equal(runtime.agents[0].current_goal, 'Review launch copy');
  assert.equal(runtime.agents[0].last_activity_source, 'kanban-task-timestamp');
});

test('summarizeKanbanRuntimeRows marks stale running work when last Kanban signal is old', () => {
  const runtime = summarizeKanbanRuntimeRows({
    generatedAt,
    tasks: [{ id: 't_stale', title: 'Investigate stale worker', assignee: 'forge', status: 'running', started_at: 1779700000 }],
    runs: [{ task_id: 't_stale', profile: 'forge', status: 'running', last_heartbeat_at: 1779700000, started_at: 1779700000 }],
    events: []
  });

  assert.equal(runtime.agents[0].status, 'stale');
  assert.equal(runtime.agents[0].heartbeat_at, '2026-05-25T09:06:40.000Z');
});

test('buildDegradedKanbanRuntime reports degraded without exposing database paths or raw errors', () => {
  const runtime = buildDegradedKanbanRuntime({ generatedAt, reason: 'sqlite failed at /root/.hermes/kanban.db with TOKEN=secret' });

  assert.equal(runtime.available, false);
  assert.equal(runtime.state, 'degraded');
  assert.equal(JSON.stringify(runtime).includes('/root/.hermes'), false);
  assert.equal(JSON.stringify(runtime).includes('TOKEN=secret'), false);
});

test('discoverAgents prefers Kanban runtime for goal/activity and labels Honcho metadata as enrichment', () => {
  const runtime = summarizeKanbanRuntimeRows({
    generatedAt,
    tasks: [{ id: 't_active', title: 'Implement runtime source hierarchy', assignee: 'jarvis', status: 'running', started_at: 1779709800 }],
    runs: [{ task_id: 't_active', profile: 'jarvis', status: 'running', last_heartbeat_at: 1779709980, started_at: 1779709800 }],
    events: []
  });
  const agents = discoverAgents([
    { id: 'hermes-jarvis', metadata: { current_goal: 'Old Honcho goal', heartbeat: 'raw note must not win', team: 'build' } },
    { id: 'hermes-weaver', metadata: {} }
  ], runtime);

  const jarvis = agents.find((agent) => agent.id === 'hermes-jarvis');
  const weaver = agents.find((agent) => agent.id === 'hermes-weaver');
  assert.equal(jarvis.current_goal, 'Implement runtime source hierarchy');
  assert.equal(jarvis.current_goal_source, 'kanban-task-title');
  assert.equal(jarvis.heartbeat, '2026-05-25T11:53:00.000Z');
  assert.equal(jarvis.heartbeat_source, 'kanban-run-timestamp');
  assert.equal(jarvis.metadata_source, 'honcho-peer-enrichment');
  assert.equal(weaver.status, 'unknown');
  assert.equal(weaver.current_goal_source, 'fallback-not-reported');
});
