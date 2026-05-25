# Self Hosting

This guide explains how to run Honcho Mission Control for either local evaluation or a self-hosted Honcho deployment.

## Security model

Honcho Mission Control is designed for a safe public-repo default posture:

- `HONCHO_API_KEY` is read only on the server.
- Browser code talks to the Next.js `/api/honcho/[...path]` proxy, not directly to Honcho.
- Mutations are disabled by default. Non-read proxy requests return `403` unless `ENABLE_MUTATIONS=true`.
- Settings and status views show whether a secret is configured, but never print the secret value.
- Demo/live state is labeled so public demos are not mistaken for private production memory.

Do not commit `.env.local`, real API keys, private workspace ids, private hostnames, or deployment-only notes.

## Prerequisites

- Node.js 20+ recommended.
- npm 10+ recommended.
- A reachable Honcho server for live mode.
- Optional: Docker and Docker Compose.
- Optional: a reverse proxy such as Caddy, Nginx, Traefik, or a platform load balancer for public HTTPS.

## Environment variables

Start from `.env.example`:

```bash
cp .env.example .env.local
```

Common variables:

```bash
HONCHO_BASE_URL=http://localhost:8000
HONCHO_API_KEY=
HONCHO_WORKSPACE_ID=
ENABLE_MUTATIONS=false
USE_DEMO_DATA=false
NEXT_PUBLIC_DASHBOARD_NAME=Honcho Mission Control
```

- `HONCHO_BASE_URL`: Base URL for the Honcho API as seen by the Next.js server.
- `HONCHO_API_KEY`: Optional server-side API key, if your Honcho deployment requires one.
- `HONCHO_WORKSPACE_ID`: Optional workspace scope. Set this for the workspace you want to inspect first.
- `ENABLE_MUTATIONS`: Keep `false` unless you intentionally want write operations enabled.
- `USE_DEMO_DATA`: Set `true` to run without Honcho and see sample data.
- `NEXT_PUBLIC_DASHBOARD_NAME`: Public UI title. This value is safe to expose.

## Run locally with demo data

```bash
cp .env.example .env.local
npm install
USE_DEMO_DATA=true npm run dev
```

Open http://localhost:3000.

Expected result:

- The shell labels the source as demo data.
- Home and Dashboard show onboarding/status cards.
- Agents shows sample discovered agents.
- Mutating controls remain disabled unless explicitly enabled.

## Run locally against live Honcho

```bash
cp .env.example .env.local
# edit .env.local for your Honcho server/workspace
npm install
npm run dev
```

Open http://localhost:3000.

Recommended first checks:

1. `/settings` - verify the source, workspace id, read-only state, and API-key presence.
2. `/dashboard` - verify API health and recent memory activity.
3. `/workspaces` - verify the expected workspace is visible.
4. `/agents` - verify Hermes agents are discovered.
5. `/performance` - inspect dashboard-to-Honcho request telemetry, or confirm it is unknown/unavailable.
6. `/context` - inspect normalized data if anything looks wrong.

## Production-style Node run

```bash
cp .env.example .env.local
npm ci
npm run build
npm run start
```

Bind the app behind a reverse proxy when exposing it outside localhost or a trusted LAN. Terminate HTTPS at the proxy or hosting platform.

## Docker Compose

```bash
cp .env.example .env.local
docker compose -f docker-compose.dashboard.yml up --build -d
```

The compose file exposes port 3000 and uses `restart: unless-stopped`.

Check the container logs if the app does not become reachable:

```bash
docker compose -f docker-compose.dashboard.yml logs -f
```

## Agent discovery expectations

Agents are discovered from Honcho peer records. A peer appears on `/agents` when either:

- peer metadata explicitly identifies it as an agent using `type=agent`, `kind=agent`, `role=agent`, or `agent=true`; or
- the peer id follows the Hermes convention `hermes` or `hermes-*`.

This fallback is important for live Honcho deployments that return Hermes peers with empty metadata/configuration. In that case the dashboard should still show Hermes agents and exclude a normal `user` peer.

Useful optional metadata:

```json
{
  "type": "agent",
  "role": "planner",
  "team": "operations",
  "status": "active",
  "heartbeat": "2026-05-25T00:00:00Z",
  "current_goal": "Review dashboard status",
  "assigned_task": "t_example",
  "capabilities": ["planning", "qa"]
}
```

If fields are absent, the UI falls back to neutral labels. Heartbeat and activity wording is only shown when Honcho returns `heartbeat`, `last_seen`, `updated_at`, or `created_at`; otherwise the card should say activity is unknown rather than implying monitoring data exists.

## Performance telemetry expectations

The Performance page summarizes telemetry from the dashboard's server-side Honcho requests: health state, latency samples, failures, slow endpoints, freshness, and trend samples when present. Use it to debug the dashboard connection to Honcho.

Do not treat this as full Honcho service observability. A fresh process, failed live connection, or deployment without retained time-series samples may show unknown or empty trend states. That is expected and safer than inferring service metrics from unrelated counts.

## Troubleshooting

### App cannot reach Honcho

- Confirm `HONCHO_BASE_URL` is reachable from the machine or container running Next.js.
- Confirm firewalls, container networking, and reverse-proxy rules allow the connection.
- If Honcho has a health endpoint, test it from the same host:

```bash
curl "$HONCHO_BASE_URL/health"
```

### API health is not OK

- Check the Dashboard and Settings views for source and workspace configuration.
- Confirm `HONCHO_API_KEY` is set in the server environment if required.
- Confirm `HONCHO_WORKSPACE_ID` exists.
- Check server logs for failed upstream requests.

### Agents are missing

- Confirm peers are visible under `/workspaces/[workspaceId]/peers`.
- Confirm agent peers either use ids `hermes` / `hermes-*` or have explicit agent metadata.
- Open `/context` and inspect the normalized peer data.
- If your deployment uses a different peer shape, update `lib/data-utils.js` discovery rules and add a regression test.

### Data appears but search says no results

Clear the search query. Empty datasets and no-match search results are separate states; if clearing the query restores rows, your data loaded correctly.

### Mutating controls are disabled

This is the expected default. Set `ENABLE_MUTATIONS=true` only in trusted environments after you have reviewed the proxy policy and operational risk.

## Pre-release verification

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

For live deployments, also verify:

- `/api/health` or equivalent health check returns OK if enabled.
- `/agents` renders discovered agents from the target workspace.
- Public pages do not expose private memory, secrets, local IPs, or personal deployment notes.
