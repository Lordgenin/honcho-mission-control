# Honcho API Client

Core files:

- `lib/env.js` parses runtime environment and keeps `HONCHO_API_KEY` non-enumerable.
- `lib/honcho-client.js` fetches server-side collections, handles timeout/offline/auth/malformed JSON states, and falls back to partial live snapshots when some endpoints fail.
- `app/api/honcho/[...path]/route.ts` is the server-side proxy that avoids browser CORS and keeps credentials out of client bundles.

## Environment defaults

- `HONCHO_BASE_URL=http://localhost:8000`
- `HONCHO_API_KEY=` optional, server-side only
- `HONCHO_WORKSPACE_ID=` optional
- `ENABLE_MUTATIONS=false`
- `USE_DEMO_DATA=false`
- `NEXT_PUBLIC_DASHBOARD_NAME=Honcho Mission Control`

## Proxy behavior

GET requests are proxied to `${HONCHO_BASE_URL}/<path>`. POST/PUT/PATCH/DELETE return 403 unless `ENABLE_MUTATIONS=true`. Upstream timeout returns a safe 502 JSON response.

## Collection normalization

The client accepts arrays directly and common envelopes: `items`, `results`, `data`, `workspaces`, `peers`, `sessions`, `messages`, and `conclusions`.
