# Honcho Mission Control

Production-oriented Next.js App Router dashboard for self-hosted Honcho + Hermes memory orchestration.

## What is included

- Next.js App Router + TypeScript + Tailwind UI shell.
- Required routes for dashboard, workspaces, peers, sessions, messages, conclusions, context, API playground, webhooks, performance, settings, and Hermes agents.
- Server-side Honcho client and `/api/honcho/[...path]` proxy so `HONCHO_API_KEY` never reaches browser code.
- Read-only default posture. Mutating proxy requests return 403 unless `ENABLE_MUTATIONS=true`.
- `USE_DEMO_DATA=true` mode with realistic Hermes agents, sessions, messages, conclusions, webhooks, and performance data. The shell labels demo/live and read-only/mutations state.
- Search components that actually filter nested records and show no-results states.
- Loading, error/retry, empty, and unknown-route fallback surfaces.

## Local run

```bash
cp .env.example .env.local
npm install
USE_DEMO_DATA=true npm run dev
```

Then open http://localhost:3000.

For live Honcho:

```bash
HONCHO_BASE_URL=http://localhost:8000 HONCHO_WORKSPACE_ID=example-workspace npm run dev
```

Set `HONCHO_API_KEY` only in server environment files or deployment secrets.

## Verification commands

```bash
npm run test
npm run lint
npm run typecheck
npm run build
```

## Docker

```bash
docker compose -f docker-compose.dashboard.yml up --build
```

## Known limitations

The live Honcho REST shapes can vary by deployment. The client normalizes common collection envelopes (`items`, `results`, `data`, and resource-specific keys) and fails safely for offline/auth/malformed/slow responses. If a specific Honcho deployment exposes different endpoint names, update `lib/honcho-client.js` and docs/API_CLIENT.md.
