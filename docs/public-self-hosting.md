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
USE_DEMO_DATA=false
NEXT_PUBLIC_DASHBOARD_NAME="Honcho Mission Control"
```

Notes:

- `HONCHO_BASE_URL` points to your Honcho API origin.
- `HONCHO_WORKSPACE_ID` is optional. Set it to scope the dashboard to one workspace, or leave it empty to list available workspaces.
- `HONCHO_API_KEY` is optional for deployments that do not require authentication, but if present it must be server-side only.
- `ENABLE_MUTATIONS` should remain `false` for public or shared deployments unless you have reviewed and intentionally enabled every exposed write path.
- `USE_DEMO_DATA=true` switches the UI to bundled sample data and should be visibly treated as demo mode.

## Local run

```bash
cp .env.example .env.local
npm ci
USE_DEMO_DATA=true npm run dev
```

Open `http://localhost:3000` for a demo-data run.

For live Honcho, put your private values in `.env.local` or your deployment secret manager, then run:

```bash
npm run dev
```

Do not paste real API keys, private hostnames, internal addresses, or workspace IDs into public issues, pull requests, screenshots, or documentation.

## Production checklist

Before exposing the dashboard beyond your own machine or private network:

- Serve it behind HTTPS and your normal authentication layer.
- Keep `.env.local` and deployment secrets out of git.
- Keep `HONCHO_API_KEY` server-side; browser code should call only the Next.js proxy.
- Keep `ENABLE_MUTATIONS=false` unless you have a reviewed mutation policy.
- Confirm the Honcho API origin is the intended public or private endpoint.
- Confirm logs and screenshots redact API keys, bearer tokens, workspace IDs, private URLs, and operator names if those are sensitive.
- Prefer a single scoped `HONCHO_WORKSPACE_ID` for public demos.
- Label demo, partial-live, and live modes clearly in the UI.

## Proxy and public redaction rules

The server proxy exists so the browser never needs the Honcho API key and does not call Honcho directly.

Default proxy posture:

- Non-v3 Honcho API paths are rejected, except explicit health checks such as `/health` and `/v3/health`.
- Read-style v3 list/search routes are the intended public default for dashboard exploration.
- Mutating methods (`POST`, `PUT`, `PATCH`, `DELETE`) return `403` unless `ENABLE_MUTATIONS=true`; read-only v3 list/search POST routes are allowed because Honcho v3 uses POST bodies for list/search operations.
- Upstream timeout, offline, auth, and malformed JSON failures should return safe error states, not raw secrets or stack traces.

When documenting or debugging proxy calls publicly, use placeholders such as `{workspaceId}`, `{sessionId}`, `{peerId}`, and `{conclusionId}`. Do not include real workspace IDs, tokens, private base URLs, task IDs, local paths, or company-specific naming.

## Demo data and metrics honesty

Demo mode is for UI exploration only. It may include realistic-looking sessions, messages, webhooks, and request telemetry examples, but it is not live telemetry.

Live mode currently reports telemetry collected from the dashboard's own server-side requests to Honcho: request success/failure, latency samples, slow endpoints, freshness, and optional trend samples. It is useful for debugging the dashboard connection, but it is not a full Honcho service observability layer. Do not claim service-level latency, request-rate, or error-rate metrics unless you wire a verified metrics source and label it clearly. If no request telemetry has been captured, the Performance page should show unknown, empty, or unavailable states instead of inventing values.

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
