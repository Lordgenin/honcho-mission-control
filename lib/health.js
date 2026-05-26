import fs from 'node:fs';
import path from 'node:path';
import { getDashboardEnv } from './env.js';
import { getKanbanRuntimeSnapshot } from './kanban-runtime.js';

const CONTAINER_KANBAN_DB = '/data/hermes/kanban.db';

function readSourceRevision() {
  const candidates = [
    path.join(process.cwd(), '.source-revision'),
    path.join(process.cwd(), '..', '.source-revision')
  ];
  for (const candidate of candidates) {
    try {
      const revision = fs.readFileSync(candidate, 'utf8').trim();
      if (revision) return { revision, source: '.source-revision' };
    } catch {}
  }
  return { revision: process.env.NEXT_PUBLIC_BUILD_REVISION || 'unknown', source: process.env.NEXT_PUBLIC_BUILD_REVISION ? 'NEXT_PUBLIC_BUILD_REVISION' : 'unknown' };
}

function splitConfiguredDbs(value = '') {
  return String(value || '').split(path.delimiter).map((item) => item.trim()).filter(Boolean);
}

function isContainerKanbanPath(value = '') {
  return splitConfiguredDbs(value).includes(CONTAINER_KANBAN_DB) || String(value || '') === CONTAINER_KANBAN_DB;
}

function canReadContainerKanbanDb() {
  try {
    const stat = fs.statSync(CONTAINER_KANBAN_DB);
    fs.accessSync(CONTAINER_KANBAN_DB, fs.constants.R_OK);
    return stat.isFile();
  } catch {
    return false;
  }
}

function isStaticKanbanSnapshot(envSource = {}) {
  const explicitSourceMode = String(envSource.HERMES_KANBAN_SOURCE_MODE || '').trim().toLowerCase();
  const sourceMode = String(envSource.HERMES_KANBAN_SOURCE_MODE || envSource.HERMES_KANBAN_SNAPSHOT_MODE || '').trim().toLowerCase();
  return Boolean(['snapshot', 'static', 'static-snapshot'].includes(sourceMode) || (envSource.HERMES_KANBAN_SNAPSHOT_HOST_DB && !explicitSourceMode));
}

function healthKanbanSourceMode(envSource = {}, { configured = false, staticSnapshot = false } = {}) {
  if (staticSnapshot) return 'static-snapshot';
  if (!configured) return 'not-configured';
  const sourceMode = String(envSource.HERMES_KANBAN_SOURCE_MODE || '').trim().toLowerCase();
  if (sourceMode === 'live') return 'live';
  return 'mounted-db';
}

function safeKanbanFreshness(runtime = {}) {
  const freshness = runtime?.freshness || {};
  return {
    latest_observed_at: freshness.latest_observed_at || null,
    latest_task_at: freshness.latest_task_at || null,
    latest_run_at: freshness.latest_run_at || null,
    latest_event_at: freshness.latest_event_at || null,
    running_task_count: Number.isFinite(Number(freshness.running_task_count)) ? Number(freshness.running_task_count) : undefined,
    active_assignee_count: Number.isFinite(Number(freshness.active_assignee_count)) ? Number(freshness.active_assignee_count) : undefined,
    state: freshness.state || runtime?.state || 'unknown'
  };
}

export function getHealthPayload({ now = new Date(), envSource = process.env, exposeOperatorDiagnostics = false, getKanbanRuntimeSnapshotImpl = getKanbanRuntimeSnapshot, canReadContainerKanbanDbImpl = canReadContainerKanbanDb } = {}) {
  const env = getDashboardEnv(envSource);
  const build = readSourceRevision();
  const configuredDbs = splitConfiguredDbs(envSource.HERMES_KANBAN_DBS || '');
  const kanbanConfigured = (
    isContainerKanbanPath(envSource.HERMES_KANBAN_DBS) ||
    isContainerKanbanPath(envSource.HERMES_KANBAN_DB) ||
    isContainerKanbanPath(envSource.HERMES_KANBAN_DATABASE)
  );
  const staticKanbanSnapshot = isStaticKanbanSnapshot(envSource);
  const sourceReadable = canReadContainerKanbanDbImpl();
  let kanbanFreshness = undefined;
  if (kanbanConfigured && sourceReadable) {
    try {
      const runtime = getKanbanRuntimeSnapshotImpl({ env: envSource, generatedAt: now.toISOString() });
      kanbanFreshness = safeKanbanFreshness(runtime);
    } catch {
      kanbanFreshness = { state: 'unknown' };
    }
  }

  const payload = {
    ok: true,
    service: 'honcho-mission-control',
    generated_at: now.toISOString(),
    build,
    runtime: {
      public_data_mode: env.ALLOW_LIVE_PUBLIC_DATA ? 'live-opt-in' : 'protected-default',
      live_private_data_requires_server_opt_in: true,
      mutations_enabled: env.ENABLE_MUTATIONS,
      demo_data_requested: env.USE_DEMO_DATA
    },
    kanban: {
      configured: kanbanConfigured,
      configured_db_count: configuredDbs.length || (envSource.HERMES_KANBAN_DB || envSource.HERMES_KANBAN_DATABASE ? 1 : 0),
      source_readable: sourceReadable,
      source_label: staticKanbanSnapshot ? 'static-snapshot-db' : (kanbanConfigured ? 'container-mounted-db' : 'not-configured'),
      source_mode: healthKanbanSourceMode(envSource, { configured: kanbanConfigured, staticSnapshot: staticKanbanSnapshot }),
      freshness: kanbanFreshness,
      snapshot_reason: staticKanbanSnapshot ? 'copied-db-snapshot' : undefined
    }
  };

  if (exposeOperatorDiagnostics) {
    payload.operator_diagnostics = {
      kanban_container_mount: CONTAINER_KANBAN_DB,
      kanban_container_mount_readable: payload.kanban.source_readable
    };
  }

  return payload;
}
