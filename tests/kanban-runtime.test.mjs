import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { discoverAgents } from '../lib/data-utils.js';
import { buildDegradedKanbanRuntime, getKanbanRuntimeSnapshot, summarizeKanbanRuntimeRows } from '../lib/kanban-runtime.js';

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

test('getKanbanRuntimeSnapshot reads configured DB list before legacy defaults and labels source without paths', () => {
  const calls = [];
  const snapshot = getKanbanRuntimeSnapshot({
    generatedAt,
    env: { HERMES_KANBAN_DBS: '/private/agent-company.db:/private/empty.db', HERMES_KANBAN_DB: '/wrong/default.db' },
    execFileSyncImpl: (_cmd, args) => {
      calls.push(args.at(-1));
      if (args.at(-1).endsWith('agent-company.db')) {
        return JSON.stringify({
          tasks: [{ id: 't_live', title: 'Live board task', assignee: 'jarvis', status: 'running', started_at: 1779709800 }],
          runs: [{ task_id: 't_live', profile: 'jarvis', status: 'running', last_heartbeat_at: 1779709980, started_at: 1779709800 }],
          events: []
        });
      }
      return JSON.stringify({ tasks: [], runs: [], events: [] });
    }
  });

  assert.deepEqual(calls, ['/private/agent-company.db', '/private/empty.db']);
  assert.equal(snapshot.available, true);
  assert.equal(snapshot.agents[0].assigned_task, 't_live');
  assert.equal(snapshot.source, 'hermes-kanban:configured-list');
  assert.equal(snapshot.sources.length, 2);
  assert.equal(snapshot.sources[0].label, 'configured-db-1');
  assert.equal(JSON.stringify(snapshot).includes('/private/'), false);
});

test('getKanbanRuntimeSnapshot does not use private agent-company board paths without explicit configuration', () => {
  const calls = [];
  const snapshot = getKanbanRuntimeSnapshot({
    generatedAt,
    env: {},
    execFileSyncImpl: (_cmd, args) => {
      calls.push(args.at(-1));
      throw new Error('missing default DB');
    }
  });

  assert.deepEqual(calls, [path.join(os.homedir(), '.hermes', 'kanban.db')]);
  assert.equal(snapshot.available, false);
  assert.equal(JSON.stringify(snapshot).includes('agent-company'), false);
});

test('production Docker runner includes python3 for sanitized Kanban SQLite reads', async () => {
  const source = await import('node:fs/promises').then((fs) => fs.readFile(new URL('../Dockerfile', import.meta.url), 'utf8'));
  assert.match(source, /FROM node:22-alpine AS runner[\s\S]*apk add --no-cache python3/);
});

test('getKanbanRuntimeSnapshot labels single container-mounted DB consistently with health diagnostics', () => {
  const snapshot = getKanbanRuntimeSnapshot({
    generatedAt,
    env: { HERMES_KANBAN_DBS: '/data/hermes/kanban.db' },
    execFileSyncImpl: () => JSON.stringify({
      tasks: [{ id: 't_container', title: 'Container mounted task', assignee: 'jarvis', status: 'ready', created_at: 1779709900 }],
      runs: [],
      events: []
    })
  });

  assert.equal(snapshot.available, true);
  assert.equal(snapshot.source, 'hermes-kanban:container-mounted-db');
  assert.equal(snapshot.sources[0].label, 'container-mounted-db');
  assert.equal(JSON.stringify(snapshot).includes('/data/hermes/kanban.db'), false);
});

test('Kanban runtime keeps multiple safe tasks visible per agent without raw task bodies', () => {
  const runtime = summarizeKanbanRuntimeRows({
    generatedAt,
    tasks: [
      { id: 't_ready_canary', title: 'Ready public canary', assignee: 'jarvis', status: 'ready', created_at: 1779709900 },
      { id: 't_blocked_canary', title: 'Blocked public canary /root/private note', assignee: 'jarvis', status: 'blocked', created_at: 1779709800 },
      { id: 't_done_hidden', title: 'Completed task should not render', assignee: 'jarvis', status: 'done', created_at: 1779709700 }
    ],
    runs: [],
    events: []
  });

  const jarvis = runtime.agents[0];
  assert.equal(jarvis.assigned_task, 't_ready_canary');
  assert.deepEqual(jarvis.recent_tasks.map((task) => task.id), ['t_ready_canary', 't_blocked_canary']);
  assert.equal(JSON.stringify(jarvis.recent_tasks).includes('t_done_hidden'), false);
  assert.equal(JSON.stringify(jarvis.recent_tasks).includes('/root/private'), false);
});

test('getKanbanRuntimeSnapshot reports wrong or missing DB diagnostics without raw paths', () => {
  const snapshot = getKanbanRuntimeSnapshot({
    generatedAt,
    env: { HERMES_KANBAN_DBS: '/private/missing.db' },
    execFileSyncImpl: () => { throw new Error('unable to open database file /private/missing.db'); }
  });

  assert.equal(snapshot.available, false);
  assert.equal(snapshot.state, 'degraded');
  assert.equal(snapshot.sources[0].state, 'degraded');
  assert.equal(snapshot.sources[0].label, 'configured-db-1');
  assert.match(snapshot.reason, /Kanban runtime unavailable/);
  assert.equal(JSON.stringify(snapshot).includes('/private/missing.db'), false);
});
