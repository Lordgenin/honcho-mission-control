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
- `/context` - Combined normalized memory context for operators: workspaces, discovered agents, recent messages, and conclusions.
- `/api-playground` - Read-only proxy endpoint guidance. Browser requests target the Next.js server proxy, not Honcho directly.
- `/webhooks` - Webhook configuration preview; actions are disabled by default.
- `/performance` - Dashboard-to-Honcho request telemetry: health, latency samples, failures, slow endpoints, freshness, and trend samples when available. It shows unknown/unavailable states when telemetry has not been captured.
- `/settings` - Runtime environment and deployment posture without exposing server-side secrets.

Unknown routes render `app/not-found.tsx` instead of falling back to the overview.

## Status and empty states

The UI distinguishes these cases:

- Loading: route-level loading surface while data is being fetched.
- Error: retryable error surface when the app cannot fetch or normalize data.
- Empty dataset: Honcho returned no rows for that view.
- Degraded/live-partial: one or more upstream reads failed while other live data loaded; missing data is not inferred.
- No search results: rows exist, but the current query does not match nested fields.
- No agents discovered: Kanban runtime, Hermes peer ids, and explicit Honcho agent metadata all returned no agents.
- Kanban degraded: the server could not read Hermes Kanban runtime; activity/current-goal fields fall back to Honcho enrichment or unknown without exposing raw runtime errors.

## Useful first-run path

For a new operator:

1. `/` - Understand what the dashboard is for and what is safe by default.
2. `/settings` - Confirm demo/live state, workspace id, mutation posture, and API-key presence.
3. `/dashboard` - Confirm API health and high-level data counts.
4. `/agents` - Confirm Hermes agents are discovered.
5. `/workspaces` - Browse source workspaces and drill into peers/sessions.
6. `/context` - Debug normalized data if any counts look wrong.
