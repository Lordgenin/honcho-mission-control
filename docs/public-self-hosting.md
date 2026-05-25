# Public self-hosting guide

This guide describes how to run Honcho Mission Control against a self-hosted Honcho API without publishing private deployment details. Keep real hostnames, workspace identifiers, API keys, tokens, and operator-specific notes in your deployment secrets or private runbooks only.

## What the dashboard reads and stores

Honcho Mission Control is a Next.js dashboard. In live mode it reads Honcho data server-side and renders normalized snapshots for the UI.

Live reads use Honcho v3 workspace-scoped routes:

- `POST /v3/workspaces/list` when no single workspace is configured.
- `POST /v3/workspaces/{workspaceId}/peers/list`.
- `POST /v3/workspaces/{workspaceId}/sessions/list`.
- `POST /v3/workspaces/{workspaceId}/sessions/{sessionId}/messages/list`.
- `POST /v3/workspaces/{workspaceId}/conclusions/list`.

Session message counts are derived from each session's message list. If a session object has no trustworthy count field, the dashboard prefers the fetched message-list length rather than inventing a value.

The dashboard does not store Honcho data by default. It renders data returned by the configured Honcho API, plus local demo data when demo mode is explicitly enabled.

## Required environment variables

Use placeholders in public docs and examples. Replace them only in private deployment configuration.

```bash
HONCHO_BASE_URL=https://honcho.example.com
HONCHO_WORKSPACE_ID=workspace-example
HONCHO_API_KEY=<server-side-secret>
ENABLE_MUTATIONS=false
USE_DEMO_DATA=true
ALLOW_LIVE_PUBLIC_DATA=false
HERMES_KANBAN_DBS=<container-kanban-db>
NEXT_PUBLIC_DASHBOARD_NAME="Honcho Mission Control"
```

Notes:

- `HONCHO_BASE_URL` points to your Honcho API origin.
- `HONCHO_WORKSPACE_ID` is optional. Set it to scope the dashboard to one workspace, or leave it empty to list available workspaces in operator mode.
- `HONCHO_API_KEY` is optional for deployments that do not require authentication, but if present it must be server-side only.
- `ENABLE_MUTATIONS` should remain `false` for public or shared deployments unless you have reviewed and intentionally enabled every exposed write path.
- `USE_DEMO_DATA=true` is the public/local default. Set it to `false` only in trusted operator mode together with `ALLOW_LIVE_PUBLIC_DATA=true`.
- `ALLOW_LIVE_PUBLIC_DATA=false` is the public protected default. Set it to `true` only for authenticated/private operator deployments where live Honcho memory may render.
- `HERMES_KANBAN_DBS`, `HERMES_KANBAN_DB`, and `HERMES_KANBAN_DATABASE` identify optional container-visible Kanban DB files for sanitized agent runtime. Prefer a read-only mount or copied snapshot.

## Local run

```bash
cp .env.example .env.local
npm ci
USE_DEMO_DATA=true npm run dev
```

Open `http://localhost:3000` for a demo-data run.

For live Honcho, put your private values in `.env.local` or your deployment secret manager, set `USE_DEMO_DATA=false` and `ALLOW_LIVE_PUBLIC_DATA=true`, then run:

```bash
npm run dev
```

Do not paste real API keys, private hostnames, internal addresses, or workspace IDs into public issues, pull requests, screenshots, or documentation.

## Production checklist

Before exposing the dashboard beyond your own machine or private network:

- Serve it behind HTTPS and your normal authentication layer if live private data is enabled.
- Keep `.env.local` and deployment secrets out of git.
- Keep `HONCHO_API_KEY` server-side; browser code should call only the Next.js proxy.
- Keep `ALLOW_LIVE_PUBLIC_DATA=false` for public demos or shared unauthenticated dashboards. Only set it true for trusted operator access.
- Keep `ENABLE_MUTATIONS=false` unless you have a reviewed mutation policy.
- Confirm the Honcho API origin is the intended endpoint and is not printed in browser-visible public pages.
- Confirm logs and screenshots redact API keys, bearer tokens, workspace IDs, private URLs, raw paths, operator names, and real operational messages if those are sensitive.
- Prefer a single scoped `HONCHO_WORKSPACE_ID` for operator demos; use placeholders in public docs.
- Label demo, public protected, partial-live, live-private, degraded, and unknown modes clearly in the UI.
- If mounting Kanban runtime, mount the intended board read-only, verify `/agents` with a safe canary task, and keep raw task bodies/comments out of the UI.
- If QA finds leaked env labels, API-key flags, raw paths, or missing Kanban canaries, state that the deployment is not public-ready until fixed.

## Proxy and public redaction rules

The server proxy exists so the browser never needs the Honcho API key and does not call Honcho directly.

Default proxy posture:

- Non-v3 Honcho API paths are rejected, except explicit health checks such as `/health` and `/v3/health`.
- Read-style v3 list/search routes are the intended public default for dashboard exploration.
- Mutating methods (`POST`, `PUT`, `PATCH`, `DELETE`) return `403` unless `ENABLE_MUTATIONS=true`; read-only v3 list/search POST routes are allowed because Honcho v3 uses POST bodies for list/search operations.
- Upstream timeout, offline, auth, and malformed JSON failures should return safe error states, not raw secrets or stack traces.

When documenting or debugging proxy calls publicly, use placeholders such as `{workspaceId}`, `{sessionId}`, `{peerId}`, and `{conclusionId}`. Do not include real workspace IDs, tokens, private base URLs, task IDs, local paths, or company-specific naming.

## Kanban runtime for agent-company style boards

Kanban runtime is optional. When enabled, it gives `/agents` a live operational signal from Hermes task state without exposing private Honcho memory.

Required configuration:

- Mount the intended SQLite board file read-only into the dashboard container or process namespace.
- Set `HERMES_KANBAN_DBS` to a delimiter-separated candidate list, or set `HERMES_KANBAN_DB` / `HERMES_KANBAN_DATABASE` for a single candidate.
- Use placeholders in public docs, for example `<host-kanban-db>:<container-kanban-db>:ro`.

Verification:

1. Create a safe canary task with a non-private title in the intended board.
2. Confirm `/health` reports Kanban configured/readable using a safe source label, not a raw path.
3. Confirm `/agents` shows the canary assignee or task status with `kanban-task-runtime` source/freshness labels.
4. If health says readable but `/agents` is not attached, treat it as a release-blocking degraded state and document it honestly.

The public Kanban snapshot may include task id, safe title, assignee, status, and safe timestamps. It must not include task body, comments, run metadata, heartbeat notes, raw errors, private paths, private IPs, or secrets.

## Demo data and metrics honesty

Demo mode is for UI exploration only. It may include realistic-looking sessions, messages, webhooks, and request telemetry examples, but it is not live telemetry.

Live mode currently reports telemetry collected from the dashboard's own server-side requests to Honcho: request success/failure, latency samples, slow endpoints, freshness, and optional trend samples. It is useful for debugging the dashboard connection, but it is not a full Honcho service observability layer. Do not claim service-level latency, request-rate, or error-rate metrics unless you wire a verified metrics source and label it clearly. If no request telemetry has been captured, the Performance page should show unknown, empty, or unavailable states instead of inventing values.

## Live-state grammar

Use the same vocabulary across routes:

- `source`: where a value came from (`demo`, `live`, `live-partial`, `kanban-task-runtime`, `honcho-peer-enrichment`, `static-hermes-peer-fallback`, `fallback-not-reported`).
- `freshness`: fresh, stale, unknown, or unavailable based on safe timestamps; do not infer live activity from a page render alone.
- `degraded reason`: a sanitized reason such as timeout, auth failure, unsupported route, unreadable Kanban DB, empty workspace, or not configured.
- `confidence/provenance`: conclusions should show reported confidence only when provided by Honcho. Otherwise say confidence is unavailable and include evidence/source/last-updated labels when present.

CLI-originated work appears only if it was written to Kanban or Honcho and the dashboard can read that source. The dashboard cannot display arbitrary terminal output or private worker comments safely.

## Troubleshooting

### Workspaces, sessions, or messages show zero

Check the configured Honcho API and workspace scope:

1. Confirm `HONCHO_BASE_URL` reaches the intended Honcho service from the server running Next.js.
2. Confirm `HONCHO_API_KEY`, if required, is available only to the server runtime.
3. Confirm `HONCHO_WORKSPACE_ID` is spelled correctly, or leave it empty to list workspaces.
4. Confirm the Honcho deployment supports the v3 list routes used by the dashboard.
5. Review the dashboard status for `live-partial`, timeout, auth, offline, or malformed JSON failures.

A session count of zero should mean the fetched session message list is empty, not that the dashboard skipped the message-list request.

### Status is unknown or live-partial

`live-partial` means at least one live request failed while other data may have loaded. Typical causes are authentication failures, missing v3 routes, network timeouts, or an incorrect workspace ID.

Keep public reports sanitized. Share route shapes, HTTP status classes, and redacted error names; keep real URLs, workspace IDs, API keys, bearer tokens, and local file paths private.

### Mutating actions are disabled

This is the safe default. Set `ENABLE_MUTATIONS=true` only in a private, reviewed deployment where you understand which UI actions and proxy routes can write to Honcho.
