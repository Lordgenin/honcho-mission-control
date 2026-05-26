# Local Startup Guide

This guide is the fresh-operator path for running Honcho Mission Control locally without hard-coding secrets.

## What you need

Required for any mode:

- Node.js 20+ and npm 10+, or Docker with Docker Compose.
- This repository checked out on the machine that will run the dashboard.

Required only for live-private mode:

- A Honcho server reachable from the dashboard host or container.
- `HONCHO_BASE_URL` for that server.
- `HONCHO_API_KEY` only if your Honcho server requires one.
- Optional `HONCHO_WORKSPACE_ID` to scope the first workspace you inspect.

Optional for Hermes agent activity:

- A Hermes Kanban SQLite DB mounted read-only for the dashboard.
- For Docker Compose live mode, the container-visible path is `/data/hermes/kanban.db` and the host source is `HERMES_KANBAN_HOST_DB`. Reserve `HERMES_KANBAN_SNAPSHOT_HOST_DB` / `HERMES_KANBAN_SOURCE_MODE=snapshot` for copied point-in-time snapshots only.

## One-time local preparation

```bash
npm run setup:local
```

This creates ignored local runtime files:

- `.env.local` for Node.js development.
- `runtime/dashboard.env` for Docker Compose.
- `runtime/kanban.db`, an empty safe SQLite snapshot with the table shape needed for clean startup when you do not yet have a real Kanban board.

The script does not overwrite existing env files unless you run it with `-- --force`:

```bash
npm run setup:local -- --force
```

## Start in demo mode with Node.js

```bash
npm install
npm run setup:local
npm run dev
```

Open http://localhost:3000 and check:

- `/settings` says demo/source protected and mutations disabled.
- `/dashboard` renders without upstream Honcho errors.
- `/agents` renders sample/demo agents or a clearly labeled empty/degraded Kanban runtime, not raw paths or secrets.
- `/api/health` returns JSON without exposing private hosts, tokens, or local file paths.

## Start in demo mode with Docker Compose

```bash
npm run setup:local
docker compose -f docker-compose.dashboard.yml up --build
```

Open http://localhost:3000. The compose file reads `.env.local` if present, then `runtime/dashboard.env`, and forces the in-container Kanban path to `/data/hermes/kanban.db` so the read-only mount lines up with the app config.

## Connect to your live Honcho data

Use live-private mode only on a trusted operator-only dashboard protected by an external access-control boundary. This app does not currently implement its own operator login, session, or role checks.

Edit `.env.local` for Node.js or `runtime/dashboard.env` for Docker Compose:

```bash
HONCHO_BASE_URL=http://your-honcho-host:8000
HONCHO_API_KEY=
HONCHO_WORKSPACE_ID=your-workspace-id
USE_DEMO_DATA=false
ALLOW_LIVE_PUBLIC_DATA=true
ENABLE_MUTATIONS=false
```

Notes:

- Leave `ENABLE_MUTATIONS=false` unless write paths were intentionally reviewed.
- Leave `HONCHO_API_KEY` blank if your Honcho server does not require one.
- Keep private values in ignored env files or deployment secrets, not markdown.
- For Docker on Linux, `host.docker.internal` may not resolve unless your Docker setup provides it; use the container-reachable Honcho hostname/IP or add an explicit host-gateway mapping in a private compose override.

Verify reachability from the same runtime that runs the dashboard:

```bash
curl "$HONCHO_BASE_URL/health"
```

Then restart the dashboard and check:

- `/settings`: live-private source, scoped workspace if configured, public privacy posture intentionally enabled, mutations disabled.
- `/dashboard`: API health OK or a specific `live-partial` degraded reason.
- `/workspaces`: expected workspace visible.
- `/agents`: Kanban/Honcho/fallback source badges are visible if agents exist.
- `/performance`: request telemetry appears after live reads, or explicitly says trend samples are unavailable.

## Use a real Kanban board safely

For local Node.js, set the Kanban env values to a readable local DB path:

```bash
HERMES_KANBAN_DBS=/path/to/kanban.db
HERMES_KANBAN_DB=/path/to/kanban.db
HERMES_KANBAN_DATABASE=/path/to/kanban.db
```

For Docker Compose, keep the app's in-container path as `/data/hermes/kanban.db` and set the live host source separately. Prefer mounting the active board DB directory or a DB path whose SQLite sidecars are visible to the container so WAL-backed writes appear without rebuilding a snapshot:

```bash
HERMES_KANBAN_HOST_DB=/path/to/kanban.db \
HERMES_KANBAN_SOURCE_MODE=live \
docker compose -f docker-compose.dashboard.yml up --build
```

Use a copied/sanitized snapshot only when you intentionally want static fallback behavior:

```bash
HERMES_KANBAN_HOST_DB=./runtime/kanban.db \
HERMES_KANBAN_SOURCE_MODE=snapshot \
HERMES_KANBAN_SNAPSHOT_HOST_DB=./runtime/kanban.db \
docker compose -f docker-compose.dashboard.yml up --build
```

The dashboard reads task ids, safe task titles, assignees, statuses, and timestamps; it should not render task bodies, comments, run metadata, heartbeat notes, raw errors, host paths, private IPs, or secrets.

## Production-style local smoke test

```bash
npm run setup:local
npm test
npm run lint
npm run typecheck
npm run build
npm run start
```

With the server running, verify:

```bash
curl -fsS http://localhost:3000/api/health
curl -fsS http://localhost:3000/settings >/dev/null
curl -fsS http://localhost:3000/agents >/dev/null
```

A clean demo startup does not require Honcho. A clean live-private startup requires the configured Honcho service to be reachable from the dashboard runtime and allowed to serve the selected workspace.
