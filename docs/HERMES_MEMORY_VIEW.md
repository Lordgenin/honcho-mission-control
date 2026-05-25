# Hermes Memory View

Honcho Mission Control presents Hermes memory through ordinary Honcho resources. The goal is to make a self-hosted Honcho workspace understandable to operators without requiring private knowledge of a particular deployment.

## Resource mapping

- Workspaces: memory domains, projects, tenants, or operating contexts.
- Peers: humans, applications, and agents participating in a workspace.
- Sessions: conversations, task runs, investigations, councils, or other bounded exchanges.
- Messages: raw exchanged content and evidence. Public mode should keep these demo/redacted unless live private data is explicitly enabled.
- Conclusions: durable facts and synthesized memory with reported confidence/provenance only when available.
- Agents: peers interpreted as Hermes-style agents by sanitized Kanban runtime, explicit metadata, or peer-id convention.

## Agent discovery

Agent discovery is intentionally data-driven. The dashboard does not hardcode a fixed team. Runtime activity prefers a sanitized Hermes Kanban DB when configured; Honcho peer records enrich identity/capabilities; peer-id fallback only proves that a peer looks like an agent, not that it is active.

A peer is treated as an agent when one of these explicit metadata markers is present:

- `metadata.type = "agent"`
- `metadata.kind = "agent"`
- `metadata.role = "agent"`
- `metadata.agent = true`

The dashboard also supports a Hermes peer-id fallback for live deployments where Honcho returns agent peers with empty metadata/configuration:

- `id` or `peer_id` is `hermes`
- `id` or `peer_id` starts with `hermes-`

A normal `user` peer should not be counted as an agent. For example, a workspace with peers `user`, `hermes`, `hermes-weaver`, `hermes-breach`, `hermes-nexus-prime`, `hermes-jarvis`, `hermes-monarch`, and `hermes-forge` should show 7 discovered agents from 8 live peers.

## Agent card fields

When available, the Agents view uses these metadata fields:

- `role`
- `team`
- `status`
- `heartbeat`
- `last_seen`
- `current_goal`
- `assigned_task`
- `capabilities`

If fields are absent, the UI uses safe fallback labels and capability chips instead of hiding the peer.

## Interpreting statuses

Status badges are display hints, not an independent monitoring system. They reflect data returned by sanitized Kanban runtime, Honcho peer metadata, or dashboard fallback logic.

Common status tones:

- active/ready/online/healthy: green
- busy/degraded/stale/warning: amber
- offline/failed/error: red
- missing/unknown: neutral

Live-state grammar:

- `source` says where a field came from, for example `kanban-task-runtime`, `honcho-peer-enrichment`, `static-hermes-peer-fallback`, or `fallback-not-reported`.
- `freshness` says whether a safe timestamp is fresh, stale, unknown, or unavailable.
- `degraded` should include a sanitized reason, not a raw exception or filesystem path.
- `confidence` is shown only when Honcho reports a numeric value; otherwise it should be labeled unavailable with provenance/evidence fields when present.

If heartbeats or statuses are unknown, confirm your agent process writes safe fields into Kanban or Honcho peer metadata. The peer-id fallback alone should not imply monitoring data exists.

## Views that help debug memory

- `/dashboard`: high-level source, API health, generated timestamp, and recent memory activity.
- `/agents`: discovered agent cards and agent-count summary.
- `/workspaces/[workspaceId]/peers`: raw peer list for the selected workspace.
- `/context`: combined normalized snapshot of workspaces, discovered agents, recent messages, and conclusions.
- `/settings`: runtime source, workspace, demo/live state, mutation state, and server-side API-key presence.

## When agents do not appear

1. Confirm the app is not in demo mode unless you intend it to be.
2. Confirm Honcho API health is OK.
3. Confirm peers are visible in the selected workspace.
4. Confirm agent peers use explicit agent metadata or ids matching `hermes` / `hermes-*`.
5. Inspect `/context` to see the normalized peer shape.
6. If your deployment uses another naming convention, update discovery in `lib/data-utils.js` and add tests for that shape.

## Demo mode

Demo mode includes generic build, review, and planning agents as examples. It is useful for evaluating layout, navigation, and status interpretation without requiring a live Honcho service.

Live mode does not assume any fixed organization structure; it renders what Honcho returns after normalization and agent discovery.
