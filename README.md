# Honcho Mission Control

Honcho Mission Control is a public, self-hostable Next.js dashboard for Honcho memory workspaces and Hermes-style AI agent operations. It gives operators a safe read-only view of workspaces, peers, sessions, messages, conclusions, API health, and discovered agents without exposing the Honcho API key to browser code.

Use it when you want to answer questions such as:

- Is my Honcho service reachable from the dashboard?
- Which workspaces, peers, sessions, messages, and conclusions are visible?
- Are Hermes agents being discovered from Honcho peers?
- Is the dashboard running in demo, live, read-only, or mutation-enabled mode?
- What should I check when data or agents do not appear?

## What the dashboard does

- Provides a production-oriented Next.js App Router UI for Honcho memory operations.
- Reads Honcho data through a server-side `/api/honcho/[...path]` proxy so `HONCHO_API_KEY` stays on the server.
- Defaults to read-only mode. Mutating proxy requests return `403` unless `ENABLE_MUTATIONS=true`.
- Supports demo mode with sample workspaces, peers, sessions, messages, conclusions, webhooks, performance samples, and Hermes agents.
- Supports live mode against a configured Honcho service and workspace.
- Discovers agents from Honcho peers using explicit agent metadata and a Hermes peer-id fallback for live peers such as `hermes` and `hermes-*`.
- Labels runtime state clearly in the shell and dashboard: demo/live source, API health, read-only/mutation posture, workspace scope, and discovered agent counts.

## Prerequisites

- Node.js 20+ recommended.
- npm 10+ recommended.
- A reachable Honcho server for live mode, or no Honcho server if you only want demo mode.
- Optional: Docker and Docker Compose for containerized local hosting.

## Quick start: demo mode

Demo mode is the fastest way to see the UI without connecting to Honcho.

```bash
cp .env.example .env.local
npm install
USE_DEMO_DATA=true npm run dev
```

Open http://localhost:3000.

The shell should identify the source as demo data. The Agents page should show sample agents so you can understand the intended layout before wiring a live workspace.

## Quick start: live Honcho mode

1. Copy the example environment file.

```bash
cp .env.example .env.local
```

2. Edit `.env.local` for your Honcho deployment.

```bash
HONCHO_BASE_URL=http://localhost:8000
HONCHO_API_KEY=your-server-side-key-if-required
HONCHO_WORKSPACE_ID=your-workspace-id
ENABLE_MUTATIONS=false
USE_DEMO_DATA=false
NEXT_PUBLIC_DASHBOARD_NAME=Honcho Mission Control
```

3. Install dependencies and run the app.

```bash
npm install
npm run dev
```

4. Open http://localhost:3000.

Keep `.env.local` out of source control. `HONCHO_API_KEY` must only be configured in server-side environment files or deployment secrets.

## Production-style local run

```bash
cp .env.example .env.local
npm ci
npm run build
npm run start
```

Then open http://localhost:3000.

## Docker Compose

```bash
cp .env.example .env.local
docker compose -f docker-compose.dashboard.yml up --build
```

The compose file exposes port 3000. Configure the same environment variables listed above through `.env.local`, your shell, or your deployment platform.

## Main views

### Home (`/`)

The landing page explains the purpose of the dashboard and highlights operational guardrails such as server-side API keys, the Honcho proxy, and read-only defaults. After the UX update it also acts as a first-run orientation surface for new users.

### Dashboard (`/dashboard`)

The Dashboard view summarizes live system state: data source, API health, generated timestamp, read-only/mutation posture, workspace scope, and recent memory activity. It is intended as the first place to check whether the app is connected and whether returned data looks plausible.

### Agents (`/agents`)

The Agents view shows Hermes-style agents discovered from Honcho peers. Agent cards show status, role/team, current goal, assigned task, heartbeat/last-seen style fields when present, capability chips, and whether the agent was inferred from fallback discovery when metadata is sparse.

Expected live behavior:

- Peers with metadata such as `type=agent`, `kind=agent`, `role=agent`, or `agent=true` appear as agents.
- Live Hermes peers with ids such as `hermes` and `hermes-*` also appear even when Honcho returns empty metadata/configuration.
- A normal human/user peer should not be counted as an agent.
- A healthy live workspace can show a summary like `Discovered agents: 7` from `8` live peers when seven peers are Hermes agents and one peer is the user.

### Workspaces, peers, sessions, messages, and conclusions

These views expose searchable Honcho memory resources. Search filters real nested fields and shows a distinct no-results state when the dataset exists but the query matches nothing.

### Context (`/context`)

The Context view presents a combined JSON-oriented snapshot for operators: workspaces, discovered agents, recent messages, and conclusions. Use it for debugging what the UI received after normalization.

### API playground (`/api-playground`)

The API playground documents safe read-only proxy paths. Browser requests target the Next.js server proxy rather than Honcho directly.

### Settings (`/settings`)

Settings shows runtime posture without printing secrets. The API key is displayed only as configured/not configured.

## Agent discovery behavior

Honcho peer records vary by deployment. Mission Control supports both explicit metadata and pragmatic Hermes peer-id discovery:

1. Explicit metadata discovery:
   - `metadata.type = "agent"`
   - `metadata.kind = "agent"`
   - `metadata.role = "agent"`
   - `metadata.agent = true`
2. Hermes peer-id fallback:
   - `id` or `peer_id` is `hermes`
   - `id` or `peer_id` starts with `hermes-`

Metadata fields used in cards when available include `role`, `team`, `status`, `heartbeat`, `last_seen`, `current_goal`, `assigned_task`, and `capabilities`.

If these fields are absent, the UI still renders fallback labels rather than hiding the peer.

## Troubleshooting

### The app starts but shows demo data

Check `USE_DEMO_DATA`. Set it to `false` for live mode.

```bash
USE_DEMO_DATA=false npm run dev
```

Also confirm `.env.local` is loaded and that `HONCHO_BASE_URL` points at the Honcho service from the machine running Next.js.

### API health says Needs attention

Verify Honcho is reachable from the dashboard host:

```bash
curl "$HONCHO_BASE_URL/health"
```

Then check that the configured workspace id exists and that any required API key is present in the server environment.

### Agents do not appear

1. Open `/dashboard` or `/settings` and confirm the app is in live mode and API health is OK.
2. Open `/workspaces` and `/workspaces/[workspaceId]/peers` to confirm peers are being returned.
3. Check peer ids. Hermes peers named `hermes` or `hermes-*` should be discovered even with empty metadata.
4. If your agent peer ids use another naming scheme, add explicit metadata: `type=agent`, `kind=agent`, `role=agent`, or `agent=true`.
5. If peers are present but agents are still missing, inspect `/context` to see the normalized peer shape and update `lib/data-utils.js` if your Honcho deployment uses a different shape.

### A search box returns no rows

The search components distinguish empty datasets from no search matches. Clear the query first. If rows return after clearing, the dataset is present but your query did not match any nested fields.

### Mutating actions are disabled

This is expected. The dashboard is read-only by default. Set `ENABLE_MUTATIONS=true` only for trusted deployments where you intentionally want mutating proxy requests and controls enabled.

### Counts look lower than expected

Check `HONCHO_WORKSPACE_ID`. When set, the dashboard scopes live reads to that workspace. Clear it only if your deployment and API paths support broad multi-workspace reads safely.

## Verification commands

Run these before publishing changes:

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

## Documentation

- `docs/SELF_HOSTING.md` - deployment and security posture.
- `docs/HERMES_MEMORY_VIEW.md` - how Honcho resources map to Hermes memory and agents.
- `docs/ROUTES.md` - route-by-route reference.
- `docs/API_CLIENT.md` - live Honcho client and proxy behavior.

## Known limitations

Live Honcho REST shapes can vary by deployment. The client normalizes common collection envelopes such as `items`, `results`, `data`, and resource-specific keys, and fails safely for offline, unauthorized, malformed, or slow responses. If your deployment exposes different endpoint names or peer shapes, update `lib/honcho-client.js`, `lib/data-utils.js`, and the docs together.
