# Honcho dashboard data and trend pipeline audit

Task: t_fa3b55b5
Date: 2026-05-26
Repo: /root/agent-company/honcho-mission-control
Commit inspected: 600f201 (main)

## Executive findings

1. The dashboard is not statically cached for normal pages. App routes declare `dynamic = 'force-dynamic'` and `revalidate = 0`; server-side Honcho fetches use `cache: 'no-store'`; the shell calls `router.refresh()` on a 30s interval plus focus/visibility events.
2. The dashboard defaults to bundled demo data unless both `USE_DEMO_DATA=false` and `ALLOW_LIVE_PUBLIC_DATA=true` are set. In the deployed CT122 runtime, `/api/health` reports live opt-in and demo disabled.
3. Live performance totals are real but are only per-render dashboard-to-Honcho request telemetry, not persisted Honcho performance history. The live performance snapshot currently reports healthy request counts/latency/slow endpoints, but `timeseries` is always empty in live mode.
4. The missing trend chart is explained by code path, not by Next.js caching: `summarizePerformanceTelemetry()` only returns the `timeseries` argument, and `getHonchoSnapshot()` calls it with records but no live `timeseries`. Only demo data supplies sample trend points.
5. Auth/access gates are intentionally fail-closed. Without the server-side Honcho API key, the same live snapshot path returns 401 failures for workspace-scoped v3 list routes. With the configured key, the local live snapshot succeeds.

## Evidence gathered

### Deployed runtime

Command:

```bash
curl http://192.168.20.14:3000/api/health
curl http://192.168.20.14:3000/performance
```

Observed safe summary:

- `/api/health` HTTP 200.
- Build revision: `main@600f201`.
- Runtime: `public_data_mode=live-opt-in`, `demo_data_requested=false`, `mutations_enabled=false`.
- Kanban source configured/readable: yes, container-mounted DB.
- `/performance` HTTP 200.
- Rendered HTML contains `Trend samples` and `No trend samples`, confirming the page renders live performance summary but no trend series.

### Local live snapshot probe

Using `/root/.hermes/honcho.json` only inside the probe, with the actual key not printed:

- `source`: `live`
- `status.ok`: `true`
- counts: 1 workspace, 8 peers, 50 sessions, 283 messages, 21 conclusions
- performance: 53/53 sampled requests succeeded, avg latency about 245.64ms, max latency 341ms
- `performance.timeseries.length`: 0
- slow endpoint count: 5
- error count: 0

The same probe without a usable Honcho API key returned 401/auth for:

- `/v3/workspaces/agent-company/peers/list`
- `/v3/workspaces/agent-company/sessions/list`
- `/v3/workspaces/agent-company/conclusions/list`

This confirms the endpoint plumbing works when credentials are present and correctly labels auth-gated visibility when credentials are absent.

## Data-flow trace

### Page and component path

- `app/performance/page.tsx`
  - marks route dynamic and no revalidate.
  - calls `getRouteScopedHonchoSnapshot('performance')`.
  - renders `<Shell snapshot={snapshot}><PerformanceView snapshot={snapshot}/></Shell>`.

- `components/views.tsx`
  - `PerformanceView` reads `snapshot.performance`.
  - `series` is `performance.timeseries` when present, otherwise legacy array fallback.
  - chart condition: if `series.length` then `<PerformanceChart data={series}/>`; otherwise empty state `No trend samples`.
  - request health, freshness, requests, latency, errors, and slow endpoints render from summary fields even when trend series is empty.

- `components/charts.tsx`
  - `PerformanceChart` uses Recharts.
  - chart metric selection is delegated to `getPerformanceMetricConfig(data)`.
  - SSR warnings are avoided by waiting for mount before rendering the chart.

- `components/shell.tsx`
  - `RuntimeRefresh` calls `router.refresh()` every 30 seconds and on focus/visibility changes.
  - This is polling via React Server Component refresh, not a websocket/subscription.

### Server snapshot path

- `lib/honcho-client.js`
  - `getDashboardEnv()` decides demo/live.
  - If `USE_DEMO_DATA` is true or `ALLOW_LIVE_PUBLIC_DATA` is false, returns demo/safe snapshot.
  - In live mode:
    - Optional `HONCHO_WORKSPACE_ID` is used directly, otherwise `/v3/workspaces/list` is called.
    - For each workspace, `buildWorkspaceSnapshot()` calls v3 list endpoints for peers, sessions, conclusions, then messages for every loaded session.
    - `fetchJson()` captures request telemetry records: path, observed timestamp, latency, status, ok/error.
    - It returns `performance: summarizePerformanceTelemetry({ records: telemetry, generatedAt, source })`.
  - Important: there is no live call that loads persisted metrics/history, and no live timeseries is passed.

- `lib/data-utils.js`
  - `createRouteScopedSnapshot('performance')` retains `snapshot.performance` and drops broad live data to reduce SSR payload exposure.
  - `summarizePerformanceTelemetry()` computes health/freshness/request counts/latency/errors/slow endpoints from current render's request records.
  - It returns `timeseries: asArray(timeseries)`. Since live mode does not pass `timeseries`, this is `[]`.
  - `getPerformanceMetricConfig()` already recognizes `pending_work_units`, `completed_work_units`, `total_work_units`, and `latency_ms`, but no production code currently generates live work-unit series.

### API proxy path

- `app/api/honcho/[...path]/route.ts`
  - Proxies only allowed Honcho v3/public health paths.
  - Blocks live proxy use unless `ALLOW_LIVE_PUBLIC_DATA=true`.
  - Allows read-only POST suffixes (`list`, `search`) while keeping mutations disabled by default.
  - Uses server-side `HONCHO_API_KEY`; browser never receives the key.
  - Uses `cache: 'no-store'` and no-store response headers.

- `lib/proxy-policy.js`
  - Allows paths starting with `v3` plus `health`/`v3/health`.
  - Treats POST `list` and `search` as read-only.

### Health/config path

- `lib/env.js`
  - Defaults: `USE_DEMO_DATA=true`, `ALLOW_LIVE_PUBLIC_DATA=false`, `ENABLE_MUTATIONS=false`.
  - `HONCHO_API_KEY` is non-enumerable.
  - public env labels redact URL/key/workspace details.

- `lib/health.js` and `app/api/health/route.ts`
  - expose safe runtime posture and Kanban configured/readable status.
  - do not expose private raw paths unless explicit operator diagnostics are requested in code.

## Relevant files

- `app/performance/page.tsx` - performance route entrypoint and dynamic/no-cache flags.
- `components/views.tsx` - `PerformanceView` empty-state/chart logic and status rendering.
- `components/charts.tsx` - Recharts chart and metric config usage.
- `components/shell.tsx` - client refresh/polling hook.
- `lib/honcho-client.js` - live/demo snapshot construction, Honcho v3 calls, per-request telemetry capture.
- `lib/data-utils.js` - route-scoped payload reduction, performance summary, metric config.
- `app/api/honcho/[...path]/route.ts` - browser-to-Honcho server proxy and auth/live/mutation gates.
- `lib/proxy-policy.js` - allowed proxy path/read-only POST policy.
- `lib/env.js` - safe defaults, live opt-in, public env redaction.
- `lib/demo-data.js` - the only current source of populated performance `timeseries`.
- `tests/core.test.mjs` - tests for env defaults, live snapshot behavior, polling hook, demo performance series, route-scoped payloads.
- `docs/API_CLIENT.md`, `docs/ROUTES.md`, `docs/SELF_HOSTING.md`, `docs/PUBLIC_OPERATOR_MODES.md` - docs describing telemetry as dashboard-to-Honcho request telemetry, not general Honcho metrics.

## Current behavior by mode

### Demo/default mode

- Triggered when `USE_DEMO_DATA=true` or `ALLOW_LIVE_PUBLIC_DATA=false`.
- Uses `getDemoSnapshot()` from `lib/demo-data.js`.
- Demo performance includes hard-coded sample points at 10:00-14:00.
- Trend chart renders because demo supplies `timeseries`.

### Operator live mode

- Requires `USE_DEMO_DATA=false` and `ALLOW_LIVE_PUBLIC_DATA=true`.
- Uses live Honcho v3 list endpoints and server-side API key if configured.
- Provides live request health/latency/failure/slow endpoint summary for the current server render.
- Does not persist or reconstruct trend points across refreshes.
- `performance.timeseries` is empty, so `/performance` shows `No trend samples` even when live telemetry summary is healthy.

### Auth failure/live-partial mode

- Missing/incorrect API key or inaccessible workspace yields sanitized failures.
- Snapshot source becomes `live-partial`.
- Performance still summarizes failed requests and shows auth/errors/slow endpoint data.
- Live memory details remain absent/redacted.

## Root-cause hypotheses for missing live trends

1. Primary root cause: no live timeseries producer exists. `summarizePerformanceTelemetry()` preserves only an explicit `timeseries` parameter, and live `getHonchoSnapshot()` never passes one.
2. Product semantics mismatch: the UI label `Trend samples` implies historical performance, but the backend currently collects only instantaneous per-render fetch telemetry. That can support request health and latency, but not historical trends without persistence or bucketing.
3. No browser subscription or server-side telemetry store exists. `router.refresh()` re-runs the server render every 30s, but each render starts with a fresh local `telemetry = []`, so past samples are discarded.
4. Possible auth misconfiguration can hide all live data and make performance degraded, but it is not the cause of empty trends when live auth succeeds. The authenticated probe still produced `timeseriesLength: 0`.
5. Existing metric config hints at a planned Kanban/work-unit series (`pending_work_units`, `completed_work_units`, `total_work_units`), but no code currently derives these from `kanban-runtime.js` or any other live source.

## Recommended code changes

### Short-term fix: make the current limitation explicit

- Rename the chart section from `Trend samples` to `Historical trend samples` or `Historical samples`.
- Update empty-state copy to say live request health is current-render telemetry and no historical store is configured.
- Add a small `performance.telemetry_source`/`history_available` flag from `summarizePerformanceTelemetry()` so UI copy does not infer why series is empty.
- Add tests asserting live snapshots with request records have summary data but empty history unless explicit timeseries is passed.

### Functional fix option A: derive per-render endpoint samples into a chart

If a chart is needed immediately without persistence:

- Add a derived `timeseries` in `summarizePerformanceTelemetry()` from `records`, e.g. one point per request `{ label: short path or observed time, latency_ms, ok/status }`.
- Change chart label from trend/history to `Current render request samples`.
- This is honest and easy, but it is not a historical trend.

### Functional fix option B: persist dashboard telemetry history

For true trends:

- Add a tiny server-side ring buffer or SQLite table for sanitized performance samples.
- On each snapshot, store aggregated buckets such as timestamp, source, request_count, failed_count, avg_latency_ms, max_latency_ms.
- Read the last N buckets into `performance.timeseries`.
- Keep only safe aggregate fields; do not store raw messages, tokens, workspace details, or private endpoint bodies.
- Add retention limits and tests for redaction/no-secret serialization.

### Functional fix option C: use Kanban runtime for operational workload trends

If the desired trend is agent workload rather than Honcho HTTP latency:

- Extend `lib/kanban-runtime.js` to expose sanitized aggregate snapshots by status and timestamp, or read recent events/runs into time buckets.
- Populate `performance.timeseries` with `pending_work_units`, `completed_work_units`, and `total_work_units` because `getPerformanceMetricConfig()` already supports these fields.
- Label it as Kanban/agent workload, not Honcho API latency.

### Auth/config hardening

- Consider accepting both Hermes config naming conventions if the dashboard ever auto-loads local Honcho config: current dashboard env expects `HONCHO_BASE_URL`/`HONCHO_API_KEY`/`HONCHO_WORKSPACE_ID`, while `/root/.hermes/honcho.json` uses camelCase keys. This is not a deployment bug when env is prepared correctly, but it is a local-operator footgun.
- Keep `ALLOW_LIVE_PUBLIC_DATA` fail-closed and preserve existing redaction boundaries.

## Suggested acceptance tests for implementation follow-up

1. `summarizePerformanceTelemetry({ records })` either:
   - keeps `timeseries=[]` and sets `history_available=false`, or
   - derives explicit current-render samples with correct labels.
2. Live `getHonchoSnapshot()` with mocked successful fetches produces non-empty request summary and expected timeseries semantics.
3. Demo snapshot continues to include demo timeseries.
4. Performance route remains dynamic/no-store and shell polling test continues to pass.
5. Serialization tests verify no API keys, raw paths, message bodies, private endpoints, or raw runtime errors leak into performance payloads.

## Bottom line

The dashboard is live and no-store when operator live mode is enabled, and deployed CT122 is currently running live-opt-in. Missing trend data is not caused by stale Next.js caching. It is caused by an absent live historical trend source: live mode records only current render request telemetry, summarizes it, and discards it; only demo mode supplies `timeseries`.