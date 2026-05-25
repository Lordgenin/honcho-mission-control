import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { sanitizePublicText } from './data-utils.js';

const ACTIVE_SECONDS = 15 * 60;
const SAFE_TASK_STATUSES = new Set(['running', 'ready', 'todo', 'blocked']);
const RUNNING_STATUSES = new Set(['running']);

function fromUnixSeconds(value) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return '';
  return new Date(seconds * 1000).toISOString();
}

function unixSeconds(value) {
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
}

function ageSeconds(generatedAt, observedSeconds) {
  const generatedMs = Date.parse(generatedAt || '');
  if (!Number.isFinite(generatedMs) || !observedSeconds) return Infinity;
  return Math.max(0, Math.round((generatedMs / 1000) - observedSeconds));
}

function profileToPeerId(profile = '') {
  const clean = String(profile || '').trim().toLowerCase();
  if (!clean) return 'hermes-unknown';
  if (clean === 'hermes' || clean.startsWith('hermes-')) return clean;
  return `hermes-${clean}`;
}

function chooseTask(tasks = []) {
  const candidates = tasks.filter((task) => SAFE_TASK_STATUSES.has(String(task.status || '').toLowerCase()));
  return candidates.sort((a, b) => {
    const ar = RUNNING_STATUSES.has(String(a.status || '').toLowerCase()) ? 0 : 1;
    const br = RUNNING_STATUSES.has(String(b.status || '').toLowerCase()) ? 0 : 1;
    if (ar !== br) return ar - br;
    return Math.max(unixSeconds(b.started_at), unixSeconds(b.created_at)) - Math.max(unixSeconds(a.started_at), unixSeconds(a.created_at));
  })[0] || null;
}

function latestEventForTask(events = [], taskId = '', kind = '') {
  return events
    .filter((event) => event.task_id === taskId && (!kind || event.kind === kind))
    .sort((a, b) => unixSeconds(b.created_at) - unixSeconds(a.created_at))[0] || null;
}

function latestRunForTask(runs = [], taskId = '') {
  return runs
    .filter((run) => run.task_id === taskId)
    .sort((a, b) => Math.max(unixSeconds(b.last_heartbeat_at), unixSeconds(b.started_at), unixSeconds(b.ended_at)) - Math.max(unixSeconds(a.last_heartbeat_at), unixSeconds(a.started_at), unixSeconds(a.ended_at)))[0] || null;
}

function deriveAgent({ profile, tasks, runs, events, generatedAt }) {
  const task = chooseTask(tasks);
  if (!task) {
    return {
      id: profileToPeerId(profile),
      profile,
      status: 'unknown',
      status_source: 'kanban-no-current-task',
      current_goal: '',
      current_goal_source: 'fallback-not-reported',
      assigned_task: '',
      assigned_task_source: 'fallback-not-reported',
      heartbeat: '',
      heartbeat_at: '',
      heartbeat_source: 'fallback-not-reported',
      last_seen: '',
      last_activity_at: '',
      last_activity_source: 'fallback-not-reported'
    };
  }

  const run = latestRunForTask(runs, task.id) || {};
  const heartbeatEvent = latestEventForTask(events, task.id, 'heartbeat');
  const latestEvent = latestEventForTask(events, task.id);
  const heartbeatSeconds = Math.max(unixSeconds(run.last_heartbeat_at), unixSeconds(heartbeatEvent?.created_at));
  const taskSeconds = Math.max(unixSeconds(task.started_at), unixSeconds(task.created_at), unixSeconds(task.completed_at));
  const runSeconds = Math.max(unixSeconds(run.last_heartbeat_at), unixSeconds(run.started_at), unixSeconds(run.ended_at));
  const eventSeconds = unixSeconds(latestEvent?.created_at);
  const lastActivitySeconds = Math.max(heartbeatSeconds, eventSeconds, runSeconds, taskSeconds);
  const taskStatus = String(task.status || '').toLowerCase();
  let status = 'unknown';
  if (taskStatus === 'running') {
    status = ageSeconds(generatedAt, heartbeatSeconds || lastActivitySeconds) <= ACTIVE_SECONDS ? 'active' : 'stale';
  } else if (['ready', 'todo', 'blocked'].includes(taskStatus)) {
    status = 'idle';
  }

  return {
    id: profileToPeerId(profile),
    profile,
    status,
    status_source: 'kanban-task-runtime',
    current_goal: sanitizePublicText(task.title || ''),
    current_goal_source: 'kanban-task-title',
    assigned_task: task.id || '',
    assigned_task_source: 'kanban-task-id',
    task_status: task.status || '',
    task_status_source: 'kanban-task-status',
    heartbeat: fromUnixSeconds(heartbeatSeconds),
    heartbeat_at: fromUnixSeconds(heartbeatSeconds),
    heartbeat_source: heartbeatSeconds ? 'kanban-run-timestamp' : 'fallback-not-reported',
    last_seen: fromUnixSeconds(lastActivitySeconds),
    last_activity_at: fromUnixSeconds(lastActivitySeconds),
    last_activity_source: lastActivitySeconds ? (eventSeconds >= runSeconds && eventSeconds >= taskSeconds ? 'kanban-event-timestamp' : (runSeconds >= taskSeconds ? 'kanban-run-timestamp' : 'kanban-task-timestamp')) : 'fallback-not-reported'
  };
}

export function summarizeKanbanRuntimeRows({ tasks = [], runs = [], events = [], generatedAt = new Date().toISOString(), source = 'hermes-kanban', sources = [] } = {}) {
  const taskRows = Array.isArray(tasks) ? tasks : [];
  const runRows = Array.isArray(runs) ? runs : [];
  const eventRows = Array.isArray(events) ? events : [];
  const profiles = Array.from(new Set([
    ...taskRows.map((task) => task.assignee).filter(Boolean),
    ...runRows.map((run) => run.profile).filter(Boolean)
  ])).sort();
  const agents = profiles.map((profile) => deriveAgent({
    profile,
    generatedAt,
    tasks: taskRows.filter((task) => task.assignee === profile),
    runs: runRows.filter((run) => run.profile === profile || taskRows.some((task) => task.id === run.task_id && task.assignee === profile)),
    events: eventRows
  }));
  return {
    available: true,
    state: agents.length ? 'available' : 'empty',
    source,
    generated_at: generatedAt,
    freshness: {
      generated_at: generatedAt,
      latest_observed_at: agents.map((agent) => agent.last_activity_at || agent.heartbeat_at).filter(Boolean).sort().at(-1) || null,
      state: agents.length ? 'live' : 'unknown'
    },
    sources,
    agents
  };
}

function safeSourceLabel(index = 0, reason = 'configured') {
  if (reason === 'agent-company-board') return 'agent-company-board';
  if (reason === 'legacy-default') return 'legacy-default-db';
  if (reason === 'env-single') return 'configured-db';
  return `configured-db-${index + 1}`;
}

function sourceStatus({ index = 0, reason = 'configured', ok = false, rowCount = 0, error = '' } = {}) {
  return {
    label: safeSourceLabel(index, reason),
    state: ok ? 'available' : 'degraded',
    task_count: rowCount,
    error: ok ? '' : 'unavailable'
  };
}

export function buildDegradedKanbanRuntime({ generatedAt = new Date().toISOString(), reason = '', sources = [] } = {}) {
  const text = sanitizePublicText(String(reason || 'Kanban runtime unavailable'));
  return {
    available: false,
    state: 'degraded',
    source: 'hermes-kanban',
    generated_at: generatedAt,
    freshness: { generated_at: generatedAt, latest_observed_at: null, state: 'unknown' },
    sources,
    reason: text.includes('[redacted]') ? 'Kanban runtime unavailable; inspect server logs.' : 'Kanban runtime unavailable; inspect server logs.',
    agents: []
  };
}

function defaultDbCandidates(env = process.env) {
  if (env.HERMES_KANBAN_DBS) {
    return String(env.HERMES_KANBAN_DBS).split(path.delimiter).map((dbPath) => dbPath.trim()).filter(Boolean).map((dbPath, index) => ({ path: dbPath, reason: 'configured-list', index }));
  }
  if (env.HERMES_KANBAN_DB) return [{ path: env.HERMES_KANBAN_DB, reason: 'env-single', index: 0 }];
  if (env.HERMES_KANBAN_DATABASE) return [{ path: env.HERMES_KANBAN_DATABASE, reason: 'env-single', index: 0 }];
  const agentCompany = '/root/.hermes/kanban/boards/agent-company/kanban.db';
  if (fs.existsSync(agentCompany)) return [{ path: agentCompany, reason: 'agent-company-board', index: 0 }];
  return [{ path: path.join(os.homedir(), '.hermes', 'kanban.db'), reason: 'legacy-default', index: 0 }];
}

function combineRows(collections = []) {
  return collections.reduce((merged, rows) => ({
    tasks: [...merged.tasks, ...(Array.isArray(rows.tasks) ? rows.tasks : [])],
    runs: [...merged.runs, ...(Array.isArray(rows.runs) ? rows.runs : [])],
    events: [...merged.events, ...(Array.isArray(rows.events) ? rows.events : [])]
  }), { tasks: [], runs: [], events: [] });
}
const PYTHON_SQLITE_READER = String.raw`
import json, sqlite3, sys
path = sys.argv[1]
con = sqlite3.connect(path)
con.row_factory = sqlite3.Row
queries = {
  'tasks': "select id, title, assignee, status, created_at, started_at, completed_at from tasks where assignee is not null and status in ('running','ready','todo','blocked') order by coalesce(started_at, created_at) desc limit 200",
  'runs': "select task_id, profile, status, last_heartbeat_at, started_at, ended_at from task_runs where profile is not null order by coalesce(last_heartbeat_at, started_at, ended_at) desc limit 300",
  'events': "select task_id, kind, created_at from task_events where kind in ('heartbeat','claimed','spawned','promoted','blocked','completed') order by created_at desc limit 500"
}
out = {}
for key, sql in queries.items():
    out[key] = [dict(row) for row in con.execute(sql)]
print(json.dumps(out))
`;

export function readKanbanRows({ dbPath, execFileSyncImpl = execFileSync } = {}) {
  const output = execFileSyncImpl('python3', ['-c', PYTHON_SQLITE_READER, dbPath], { encoding: 'utf8', timeout: 3000, stdio: ['ignore', 'pipe', 'pipe'] });
  return JSON.parse(output || '{}');
}

export function getKanbanRuntimeSnapshot({ env = process.env, generatedAt = new Date().toISOString(), execFileSyncImpl = execFileSync } = {}) {
  const candidates = defaultDbCandidates(env);
  const rows = [];
  const sources = [];
  let lastError = null;
  for (const candidate of candidates) {
    try {
      const sourceRows = readKanbanRows({ dbPath: candidate.path, execFileSyncImpl });
      rows.push(sourceRows);
      sources.push(sourceStatus({ index: candidate.index, reason: candidate.reason, ok: true, rowCount: Array.isArray(sourceRows.tasks) ? sourceRows.tasks.length : 0 }));
    } catch (error) {
      lastError = error;
      sources.push(sourceStatus({ index: candidate.index, reason: candidate.reason, ok: false, error: error?.message || 'unavailable' }));
    }
  }
  if (!rows.length) {
    return buildDegradedKanbanRuntime({ generatedAt, reason: lastError?.message || 'Kanban runtime unavailable', sources });
  }
  const configuredList = candidates.length > 1 || candidates[0]?.reason === 'configured-list';
  return summarizeKanbanRuntimeRows({
    ...combineRows(rows),
    generatedAt,
    source: configuredList ? 'hermes-kanban:configured-list' : `hermes-kanban:${safeSourceLabel(0, candidates[0]?.reason)}`,
    sources
  });
}
