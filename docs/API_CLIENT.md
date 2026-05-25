# Honcho API Client

Core files:

- `lib/env.js` parses runtime environment, keeps `HONCHO_API_KEY` non-enumerable, and exposes only client-safe runtime status through `getPublicDashboardEnv`.
- `lib/honcho-client.js` fetches server-side collections, handles timeout/offline/auth/malformed JSON states, records dashboard-to-Honcho request telemetry, and falls back to partial live snapshots when some endpoints fail.
- `app/api/honcho/[...path]/route.ts` is the server-side proxy that avoids browser CORS and keeps credentials out of client bundles.

## Environment defaults

- `HONCHO_BASE_URL=http://localhost:8000`
- `HONCHO_API_KEY=` optional, server-side only
- `HONCHO_WORKSPACE_ID=` optional
- `ENABLE_MUTATIONS=false`
- `USE_DEMO_DATA=false`
- `NEXT_PUBLIC_DASHBOARD_NAME=Honcho Mission Control`

## Proxy behavior

The proxy forwards requests to `${HONCHO_BASE_URL}/<path>` from the Next.js server only, so browsers never receive the raw Honcho origin or API key.

Default policy:

- Non-v3 Honcho API paths are rejected, except explicit health checks such as `/health` and `/v3/health`.
- `GET` requests to allowed paths are proxied read-only.
- Honcho v3 read/list operations use `POST`; the proxy therefore allows v3 `POST` paths ending in `/list` or `/search` while mutations are disabled.
- Other `POST`, `PUT`, `PATCH`, and `DELETE` requests return `403` unless `ENABLE_MUTATIONS=true`.
- Upstream timeout/offline failures return safe 502 JSON responses without raw secrets or stack traces.

Examples allowed with default settings:

- `POST /api/honcho/v3/workspaces/list`
- `POST /api/honcho/v3/workspaces/{workspaceId}/peers/list`
- `POST /api/honcho/v3/workspaces/{workspaceId}/sessions/list`
- `POST /api/honcho/v3/workspaces/{workspaceId}/sessions/{sessionId}/messages/list`
- `POST /api/honcho/v3/workspaces/{workspaceId}/conclusions/list`

Examples blocked with default settings:

- `GET /api/honcho/v2/workspaces`
- `POST /api/honcho/v3/workspaces/{workspaceId}/sessions/{sessionId}`
- `PATCH /api/honcho/v3/workspaces/{workspaceId}/peers/{peerId}`

## Collection normalization

The client accepts arrays directly and common envelopes: `items`, `results`, `data`, `workspaces`, `peers`, `sessions`, `messages`, and `conclusions`.

## Partial live and telemetry behavior

When at least one live request fails but other requests succeed, the public snapshot uses `source: "live-partial"` and includes sanitized failure metadata. UI copy should describe that state as degraded rather than as an empty workspace.

The `performance` payload is derived from the dashboard's own server-side fetch records. It can summarize request health, latency samples, errors, slow endpoints, freshness, and trend samples when available. It is not a general Honcho metrics source; unknown or empty telemetry states are valid when no request records exist.
