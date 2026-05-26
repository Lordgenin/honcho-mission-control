# Live Kanban and visibility behavior

This document records the current Honcho Mission Control contract for Hermes Kanban runtime data, public versus operator visibility, and maintainer verification. Keep it in sync with the implementation in `lib/kanban-runtime.js`, `lib/health.js`, `lib/data-utils.js`, the Next.js Honcho proxy, and deployment helpers.

## Audience and safety model

Honcho Mission Control has two different data-exposure postures:

- Public/demo or public protected mode: safe to publish or share broadly. Demo data may render. Sanitized Kanban runtime summaries may render if a read-only Kanban database is mounted. Raw live Honcho message bodies, conclusion text, private peer metadata, raw workspace/session details, private paths, private hosts, env labels, and token-shaped strings must not render.
- Operator live-private mode: intended for a trusted operator deployment protected outside this app by a private network, VPN, SSO proxy, or equivalent boundary. Enable it only with server-side `ALLOW_LIVE_PUBLIC_DATA=true`. The app does not implement its own operator login, session, or role checks.

`ENABLE_MUTATIONS=true` is separate from visibility. Leave it false unless write-capable proxy routes have been reviewed for the deployment.

## Live Kanban source contract

The dashboard reads Hermes Kanban directly on the server from SQLite. There is no browser-facing Kanban write API.

Implementation:

- `lib/kanban-runtime.js` reads SQLite rows with a Python `sqlite3` helper and summarizes only safe task/runtime fields.
- `components` receive a route-scoped snapshot; Kanban values are embedded in dynamic server-rendered views such as `/agents`, `/dashboard`, and `/context`.
- `lib/health.js` exposes high-level Kanban posture through `/health` and `/api/health` without raw file paths.

Runtime fields that may be exposed from Kanban:

- task id
- sanitized task title
- assignee/profile
- task status
- safe task/run/event timestamps
- derived freshness, source, and degraded-state labels
- aggregate counts such as active assignees and running tasks

Runtime fields that must not be exposed from Kanban:

- task bodies
- comments
- run metadata
- heartbeat note text
- raw errors or stack traces
- host/container filesystem paths
- private hosts, private IPs, tokens, or other secrets

Fresh/live behavior depends on SQLite read mode:

- Live mode uses regular read-only SQLite (`mode=ro`) so updates from the active board and WAL/sidecar files can be observed by the server process.
- Snapshot mode uses immutable/static behavior and is reserved for intentionally copied point-in-time databases.

## Configuration locations

Fresh local defaults are created by:

```bash
npm run setup:local
```

Files and helpers:

- `.env.example`: safe placeholder defaults for local copies.
- `.env.local`: ignored Node.js local runtime values.
- `runtime/dashboard.env`: ignored Docker Compose runtime values.
- `runtime/kanban.db`: safe empty starter SQLite file for first boot/demo fallback.
- `docker-compose.dashboard.yml`: mounts `${HERMES_KANBAN_HOST_DB:-./runtime/kanban.db}` to `/data/hermes/kanban.db:ro` and sets container-visible Kanban env values.
- `scripts/prepare-local.mjs`: creates local env files and the starter DB without writing snapshot-only variables.
- `scripts/deploy-remote.sh`: prepares deploy env, prefers live host mounts when `LIVE_KANBAN_HOST_DB` is supplied, and uses copied DB snapshots only when explicitly deploying a copied `LOCAL_KANBAN_DB`.

Kanban variables:

| Variable | Purpose |
| --- | --- |
| `HERMES_KANBAN_DBS` | Preferred delimiter-separated list of container-visible SQLite candidates. |
| `HERMES_KANBAN_DB` | Single container-visible SQLite candidate. |
| `HERMES_KANBAN_DATABASE` | Legacy/alternate single container-visible SQLite candidate. |
| `HERMES_KANBAN_HOST_DB` | Docker Compose host-side source mounted read-only to `/data/hermes/kanban.db`. |
| `HERMES_KANBAN_SOURCE_MODE` | `live` for active board mounts; `snapshot` for copied point-in-time DBs. |
| `HERMES_KANBAN_SNAPSHOT_HOST_DB` | Legacy/static-snapshot marker. Use only with explicit snapshot deployments. Remove stale values when migrating to live mode. |
| `LIVE_KANBAN_HOST_DB` | Deploy-helper input for the operator-prepared live board path on the remote host. |
| `LOCAL_KANBAN_DB` | Deploy-helper input for uploading a copied static snapshot, not live runtime. |

Recommended Docker live mount:

```bash
HERMES_KANBAN_HOST_DB=/path/to/active/kanban.db \
HERMES_KANBAN_SOURCE_MODE=live \
docker compose -f docker-compose.dashboard.yml up --build
```

Recommended explicit snapshot fallback:

```bash
HERMES_KANBAN_HOST_DB=./runtime/kanban.db \
HERMES_KANBAN_SOURCE_MODE=snapshot \
HERMES_KANBAN_SNAPSHOT_HOST_DB=./runtime/kanban.db \
docker compose -f docker-compose.dashboard.yml up --build
```

For live mounts, prefer mounting a path where SQLite sidecar files remain visible to the container. If the active board uses WAL, mounting only a stale copied `.db` file can look configured while still failing freshness expectations.

## Fallback and degraded behavior

The app should be explicit about source and freshness:

- No configured/readable Kanban DB: `/agents` and dashboard panels show degraded or fallback-not-reported states, not invented live work.
- Empty safe starter DB: startup succeeds but `/agents` may show no live Kanban assignments; this is a bootstrap fallback, not proof of live runtime.
- Snapshot deployment: UI and health should label `static-snapshot` / `static-snapshot-db` and may include snapshot age/reason. Operators must treat it as point-in-time data.
- Live deployment: UI and health should label the source as configured/container-mounted/live and show fresh task/run/event timestamps when the board is active.
- Read errors: surface sanitized degraded reasons such as unavailable/unreadable source; do not render raw exception strings or paths.

## Message and memory body visibility

Implementation lives in `lib/data-utils.js` and the Honcho API proxy route.

Public/unauthenticated behavior:

- `protectUnauthenticatedLiveSnapshot()` replaces message bodies with `[redacted: live message body hidden in public/unauthenticated mode]`.
- It replaces conclusion/memory text with `[redacted: live memory text hidden in public/unauthenticated mode]`.
- `protectPublicProxyResponse()` applies path-aware shaping for `/messages` and `/conclusions` proxy responses, preserving non-body metadata where safe.
- `sanitizePublicValue()` recursively strips `raw` fields and redacts known private patterns such as token-shaped strings, local/private origins, local paths, and env-style secret labels.

Operator live-private behavior:

- When the server is intentionally configured with `ALLOW_LIVE_PUBLIC_DATA=true` and the deployment is externally protected, route snapshots may preserve sanitized message and memory bodies.
- Sanitized does not mean unauthenticated-public: generic private pattern redaction still applies, API keys must stay server-side, and raw fields remain removed.
- Do not describe this as built-in operator authentication. It is a deployment boundary plus server-side opt-in.

## Verification checklist for maintainers

Before calling a deployment live-Kanban ready:

1. Confirm the intended environment values are present in the server/container runtime, especially `HERMES_KANBAN_SOURCE_MODE=live` and the container-visible `HERMES_KANBAN_DBS` or `HERMES_KANBAN_DB` path.
2. Remove stale `HERMES_KANBAN_SNAPSHOT_HOST_DB` values when the deployment is meant to be live.
3. Fetch `/api/health` and confirm Kanban is configured/readable and includes safe freshness timestamps/counts without exposing raw paths or task text.
4. For a live deployment, fail acceptance if health reports `source_mode=static-snapshot`, `source_label=static-snapshot-db`, `snapshot_reason=copied-db-snapshot`, or freshness older than a known active board event.
5. Create or identify a safe canary task title in the intended board, then refresh `/agents` and `/dashboard`; the canary assignee/status should appear within the refresh interval. Deploy automation can enforce this with `EXPECT_KANBAN_TASK_ID` and `EXPECT_KANBAN_MIN_EVENT_EPOCH`.
6. Confirm `/agents`, `/dashboard`, and `/context` show source/freshness labels and do not render task bodies, comments, heartbeat notes, raw errors, or paths.
7. In public/protected mode, probe `/messages`, `/conclusions`, and the `/api/honcho/.../messages` / `/api/honcho/.../conclusions` proxy paths. Message/conclusion bodies should be replaced with the public redaction strings.
8. In operator live-private mode, confirm message/conclusion bodies needed by operators render after generic sanitization, while API keys and raw/private patterns do not.
9. Run the relevant automated suite before shipping code changes:

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

Targeted suites that cover this behavior include `tests/kanban-runtime.test.mjs`, `tests/core.test.mjs`, and `tests/deploy-remote.test.mjs`.

## Maintainer notes

- Keep public documentation and screenshots on placeholders. Do not paste real hostnames, workspace ids, API keys, private paths, or real operational message bodies into docs.
- Keep the install default friendly for local operators: a fresh clone should start without Honcho, and a local/operator clone should be able to opt into its own live data explicitly.
- Treat `static-snapshot` labels as honest fallback labels, not success for a live release.
- If QA reports that a live deployment is still static, fix runtime env/mounts and source-mode precedence before updating screenshots or claiming live readiness.
