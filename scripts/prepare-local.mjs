#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const force = process.argv.includes('--force');
const runtimeDir = path.join(root, 'runtime');
const localEnvPath = path.join(root, '.env.local');
const composeEnvPath = path.join(runtimeDir, 'dashboard.env');
const kanbanDbPath = path.join(runtimeDir, 'kanban.db');

const LOCAL_ENV = `# Local Node.js development defaults. Safe to commit as an example only; keep real
# Honcho API keys, private workspace ids, and private hosts in this ignored file.
HONCHO_BASE_URL=http://localhost:8000
HONCHO_API_KEY=
HONCHO_WORKSPACE_ID=
ENABLE_MUTATIONS=false
USE_DEMO_DATA=true
ALLOW_LIVE_PUBLIC_DATA=false
HERMES_KANBAN_DBS=./runtime/kanban.db
HERMES_KANBAN_DB=./runtime/kanban.db
HERMES_KANBAN_DATABASE=./runtime/kanban.db
HERMES_KANBAN_SNAPSHOT_HOST_DB=./runtime/kanban.db
NEXT_PUBLIC_DASHBOARD_NAME=Honcho Mission Control
`;

const COMPOSE_ENV = `# Docker Compose runtime defaults. Use container-visible Kanban paths here.
# Keep real Honcho API keys and private workspace ids out of source control.
HONCHO_BASE_URL=http://host.docker.internal:8000
HONCHO_API_KEY=
HONCHO_WORKSPACE_ID=
ENABLE_MUTATIONS=false
USE_DEMO_DATA=true
ALLOW_LIVE_PUBLIC_DATA=false
HERMES_KANBAN_DBS=/data/hermes/kanban.db
HERMES_KANBAN_DB=/data/hermes/kanban.db
HERMES_KANBAN_DATABASE=/data/hermes/kanban.db
NEXT_PUBLIC_DASHBOARD_NAME=Honcho Mission Control
`;

function writeIfMissing(filePath, content) {
  if (fs.existsSync(filePath) && !force) return 'kept';
  fs.writeFileSync(filePath, content, { mode: 0o600 });
  return fs.existsSync(filePath) && force ? 'wrote' : 'wrote';
}

function ensureEmptyKanbanDb(dbPath) {
  if (fs.existsSync(dbPath)) {
    const stat = fs.statSync(dbPath);
    if (stat.isDirectory()) {
      throw new Error(`${path.relative(root, dbPath)} is a directory, not a SQLite file. Remove it or choose a different HERMES_KANBAN_SNAPSHOT_HOST_DB.`);
    }
    return 'kept';
  }

  const sql = `
import sqlite3, sys
path = sys.argv[1]
con = sqlite3.connect(path)
con.executescript('''
create table if not exists tasks (
  id text primary key,
  title text,
  assignee text,
  status text,
  created_at integer,
  started_at integer,
  completed_at integer
);
create table if not exists task_runs (
  id integer primary key autoincrement,
  task_id text,
  profile text,
  status text,
  last_heartbeat_at integer,
  started_at integer,
  ended_at integer
);
create table if not exists task_events (
  id integer primary key autoincrement,
  task_id text,
  kind text,
  created_at integer
);
''')
con.commit()
con.close()
`;
  execFileSync('python3', ['-c', sql, dbPath], { stdio: 'inherit' });
  fs.chmodSync(dbPath, 0o644);
  return 'wrote';
}

fs.mkdirSync(runtimeDir, { recursive: true, mode: 0o700 });
const localEnvStatus = writeIfMissing(localEnvPath, LOCAL_ENV);
const composeEnvStatus = writeIfMissing(composeEnvPath, COMPOSE_ENV);
const kanbanStatus = ensureEmptyKanbanDb(kanbanDbPath);

console.log('Honcho Mission Control local files are ready:');
console.log(`- .env.local: ${localEnvStatus}`);
console.log(`- runtime/dashboard.env: ${composeEnvStatus}`);
console.log(`- runtime/kanban.db: ${kanbanStatus}`);
console.log('Next: npm install && npm run dev, or docker compose -f docker-compose.dashboard.yml up --build.');
