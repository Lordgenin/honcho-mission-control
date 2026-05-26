# Routes

Honcho Mission Control uses Next.js App Router pages. Routes are safe to browse in read-only mode unless you intentionally enable mutations.

## Public/operator routes

- `/` - Landing page, dashboard value proposition, first-run orientation, and guardrail summary.
- `/dashboard` - System status summary: source, API health, generated timestamp, read-only/mutation posture, workspace scope, agent counts, recent memory activity, and degraded/live-partial connection state.
- `/agents` - Hermes-style agents discovered from Kanban runtime first, explicit Honcho peer metadata second, and `hermes` / `hermes-*` peer-id fallback last. Current goal, task, heartbeat, and last activity show per-field source badges.
- `/workspaces` - Searchable workspace list.
- `/workspaces/[workspaceId]` - Workspace metrics and links to peers and sessions.
- `/workspaces/[workspaceId]/peers` - Peers in a workspace.
- `/workspaces/[workspaceId]/peers/[peerId]` - Peer metadata detail.
- `/workspaces/[workspaceId]/sessions` - Sessions in a workspace.
- `/workspaces/[workspaceId]/sessions/[sessionId]` - Session transcript.
- `/messages` - Searchable global message stream.
- `/conclusions` - Searchable durable conclusions.
- `/context` - Combined normalized memory context for operators: workspaces, discovered agents, recent messages, and conclusions. Public mode should remain demo/redacted; live context is operator-only.
- `/api-playground` - Read-only proxy endpoint guidance. Browser requests target the Next.js server proxy, not Honcho directly.
- `/webhooks` - Webhook configuration preview; actions are disabled by default.
- `/performance` - Dashboard-to-Honcho request telemetry: health, latency samples, failures, slow endpoints, freshness, and trend samples when available. It shows unknown/unavailable states when telemetry has not been captured.
- `/settings` - Runtime posture with high-level public labels; it should not expose secrets, API-key flags, env-style labels, raw paths, or private infrastructure hints.

Unknown routes render `app/not-found.tsx` instead of falling back to the overview.

## Legacy gamma path redirects

The public gamma QA baseline included older single-page section names. Those paths are now route-backed aliases so shared links do not fall through to a host-level raw 404:

- `/sessions` -> `/workspaces`
- `/peers` -> `/agents`
- `/kanban` and `/tasks` -> `/agents`
- `/reasoning` and `/diagnostics` -> `/performance`
- `/integrations` -> `/api-playground`
- `/config` -> `/settings`
- `/instance` -> `/dashboard`

## Command and action semantics

The global command palette opens from the route controls button or `Ctrl/⌘+K`. Arrow keys move the selected result, Enter navigates to it, Escape closes and clears stale search state, click-outside closes, and no-match queries render an explicit no-results status. Visible mutation-looking controls must be either disabled with an explanatory label in read-only/public mode, demo/local-only with inline feedback, or reviewed live-private actions when mutation mode is explicitly enabled.

## Status and empty states

The UI distinguishes these cases:

- Loading: route-level loading surface while data is being fetched.
- Error: retryable error surface when the app cannot fetch or normalize data.
- Empty dataset: Honcho returned no rows for that view.
- Degraded/live-partial: one or more upstream reads failed while other live data loaded; missing data is not inferred.
- No search results: rows exist, but the current query does not match nested fields.
- No agents discovered: Kanban runtime, Hermes peer ids, and explicit Honcho agent metadata all returned no agents.
- Kanban degraded: the server could not read Hermes Kanban runtime; activity/current-goal fields fall back to Honcho enrichment or unknown without exposing raw runtime errors.
- Public protected: live Honcho memory is hidden because `ALLOW_LIVE_PUBLIC_DATA` is not enabled; demo/redacted content may be shown.

Each operational view should label source, freshness, degraded reason, and confidence/provenance when relevant. CLI-originated work can show up only through Kanban/Honcho records; terminal output and private worker comments are not dashboard data sources.

## Useful first-run path

For a new operator:

1. `/` - Understand what the dashboard is for and what is safe by default.
2. `/settings` - Confirm public protected/live-private state, workspace scope, mutation posture, and safe labels.
3. `/dashboard` - Confirm API health, subsystem status, freshness, and high-level data counts.
4. `/agents` - Confirm Hermes agents are discovered from Kanban runtime, Honcho enrichment, or fallback with source badges.
5. `/workspaces` - Browse source workspaces and drill into peers/sessions only when live private data is intentionally enabled.
6. `/context` - Debug normalized data only in trusted operator mode; keep public context demo/redacted.
