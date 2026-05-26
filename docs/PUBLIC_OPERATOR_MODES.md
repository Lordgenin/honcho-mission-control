# Public and operator modes

Honcho Mission Control is designed to be safe to publish before it is connected to private memory. Public mode is the default; operator/live-private mode must be enabled deliberately on the server.

## Mode summary

| Mode | Intended audience | Required setting | What may render | What must not render |
| --- | --- | --- | --- | --- |
| Public demo | Anyone evaluating the repo | `USE_DEMO_DATA=true` or no live-data opt-in | Bundled sample workspaces, agents, messages, conclusions, status grammar, and onboarding copy | Real Honcho memory, live messages, private workspace ids, raw paths, tokens, private hosts, or operator notes |
| Public protected | Public/shared dashboard with live services configured server-side | default `ALLOW_LIVE_PUBLIC_DATA=false` | Safe posture labels, public health posture, sanitized Kanban runtime if mounted read-only, demo/redacted Honcho content | Raw Honcho messages, conclusions, peer metadata, API-key flags, env-style labels, raw runtime paths, private infrastructure hints |
| Operator live-private | Trusted deployment protected by external access control | `ALLOW_LIVE_PUBLIC_DATA=true` set server-side | Live Honcho resources and sanitized Kanban runtime with source/freshness/provenance labels | Browser-visible API keys, bearer tokens, private secrets, unsanitized stack traces, raw filesystem errors |
| Mutation-enabled operator | Trusted private deployment only | `ENABLE_MUTATIONS=true` after review | Explicitly reviewed write-capable proxy routes | Public writes, surprise mutations, or enabled controls in unauthenticated/public deployments |

Important: `ALLOW_LIVE_PUBLIC_DATA=true` is a live-private opt-in, not a public-readiness flag or built-in auth mechanism. Keep it false for public demos unless the dashboard is already protected by external access control and the data is safe for that audience.

## Public-mode redaction boundary

Public pages and example assets should use placeholders and sanitized labels. Do not publish:

- API keys, bearer tokens, cookies, OAuth tokens, or token-shaped strings.
- Private hostnames, LAN IPs, internal service names, or deployment-specific network topology.
- Real workspace ids, raw operational message bodies, raw private Honcho memory, or private peer metadata.
- Host filesystem paths, container mount paths, stack traces, SQLite errors, or process details.
- Env-style diagnostic labels on public pages, such as raw variable names or API-key configured flags.

Safe public labels are high-level: `demo data`, `public privacy protected`, `server-side connection configured`, `read-only`, `mutations disabled`, `container-mounted-db`, `configured-list`, `degraded`, `unknown`, or `unavailable`.

## Enabling live private data explicitly

Use server-side environment or deployment secrets only:

```bash
USE_DEMO_DATA=false
ALLOW_LIVE_PUBLIC_DATA=true
ENABLE_MUTATIONS=false
HONCHO_BASE_URL=https://honcho.example.invalid
HONCHO_WORKSPACE_ID=workspace-example
HONCHO_API_KEY=<server-side-secret>
```

Then protect the dashboard with your normal external access-control boundary before exposing it beyond a trusted environment. Browser code should still call only the Next.js proxy; the browser should never receive the upstream API key. This app does not currently implement its own operator login, session, or role checks.

## Kanban DB configuration for agent-company style boards

The Agents page can show current operational work from a Hermes Kanban SQLite board when the Next.js server can read a sanitized copy or read-only mount. This is independent from live Honcho memory: public protected mode may show sanitized Kanban activity while still hiding raw Honcho messages.

Supported variables, in preference order:

1. `HERMES_KANBAN_DBS`: delimiter-separated list of candidate SQLite DB files. Use this for an agent-company style board plus a fallback snapshot.
2. `HERMES_KANBAN_DB`: single candidate DB file.
3. `HERMES_KANBAN_DATABASE`: legacy/alternate single candidate DB file.
4. If none are set, the runtime may try legacy Hermes defaults; do not rely on that for deployments because it can accidentally point at an empty/default board.

Read-only Docker-style mount example using placeholders:

```yaml
services:
  honcho-mission-control:
    environment:
      HERMES_KANBAN_DBS: "<container-kanban-db>"
      HERMES_KANBAN_DB: "<container-kanban-db>"
      HERMES_KANBAN_DATABASE: "<container-kanban-db>"
    volumes:
      - "<host-kanban-db>:<container-kanban-db>:ro"
```

Use a copied snapshot if the live board should not be mounted directly. The mounted file only needs read access for the dashboard process.

### Wrong/default DB diagnostics

Symptoms of the wrong DB or an unreadable mount:

- `/health` reports Kanban not configured, not readable, or degraded.
- `/agents` says Kanban state is not attached, degraded, or source not reported.
- New safe canary tasks do not appear on `/agents` after refresh.
- `/agents` only shows fallback/demo peers while health claims a different source.

Verification steps:

1. Create a safe canary task in the intended board with a non-private title.
2. Start or restart the dashboard server so it sees the intended `HERMES_KANBAN_*` variables.
3. Open `/health` or `/api/health` and confirm the Kanban source label is configured/readable without exposing raw paths.
4. Open `/agents` and confirm the canary assignee appears with a Kanban source badge, task status, and freshness/activity label.
5. If the canary is missing, check the mounted DB file, variable precedence, container permissions, and whether the dashboard is reading a copied snapshot instead of the live board.

## Live-state grammar

Every operational panel should be honest about where a value came from and how fresh it is.

- `source`: the origin of a value, such as `demo`, `live`, `live-partial`, `kanban-task-runtime`, `honcho-peer-enrichment`, `static-hermes-peer-fallback`, `configured-list`, `container-mounted-db`, or `fallback-not-reported`.
- `freshness`: whether the value is fresh, stale, unknown, or unavailable. Freshness should be based on a server-generated timestamp, safe Kanban event/run timestamps, or explicit Honcho metadata; do not infer it from page load alone.
- `degraded reason`: a sanitized explanation for missing or partial data, such as auth failure, timeout, unsupported route, unreadable Kanban DB, empty workspace, or not configured. Do not render raw exception strings.
- `confidence`: conclusions may show a numeric confidence only when Honcho reported one. Missing confidence should read as unavailable with a reason, not `n/a` or an invented value.
- `provenance`: show evidence count, source label, or last-updated label when available. If unavailable, say so directly.

CLI-originated work can appear when it is recorded in the mounted Kanban DB as tasks, assignees, statuses, runs, and safe timestamps. The dashboard cannot see arbitrary terminal output, private worker comments, raw task bodies, local shell state, or work that was never written to Kanban/Honcho.

## Public onboarding checklist

Before publishing a demo link, README screenshot, or repository example:

- Start in demo or public protected mode; keep `ALLOW_LIVE_PUBLIC_DATA=false` unless the link is private and protected by external access control.
- Keep `ENABLE_MUTATIONS=false` for public/shared deployments.
- Use placeholder Honcho origins, workspace ids, and Kanban paths in docs and screenshots.
- Verify public pages do not expose private memory, raw messages, private hosts, local paths, env-style labels, API-key flags, tokens, or real operational message bodies.
- Confirm `/settings`, `/health`, and `/api/health` show high-level posture labels only.
- Confirm `/agents` either shows sanitized Kanban runtime with source/freshness labels or one clear degraded reason.
- If QA finds a privacy or truthfulness gap, describe the deployment as not public-ready until fixed.
