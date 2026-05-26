# Honcho dashboard documentation backlog

Task: `t_d8d1b017`
Date: 2026-05-26
Sources:

- Parent visible-browser documentation review `t_43508928`: `qa-visible-docs-t_43508928/report.md`
- Parent visible-browser technical UX/documentation review `t_0a049132`: `qa-visible-tech-docs-t_0a049132/report.md`
- Existing durable baseline: `docs/VERCEL_GAMMA_DASHBOARD_VIEW_BASELINE.md`
- Existing route/public-mode docs: `docs/ROUTES.md`, `docs/PUBLIC_OPERATOR_MODES.md`, `docs/PUBLIC_OPERATOR_RELEASE_POLICY.md`, `docs/LIVE_PRIVATE_DASHBOARD_REQUIREMENTS.md`

## Executive summary

The visible-browser reviews agree that the Honcho dashboard already has a strong operator-console shape, but it is not yet documentation-ready for broad self-hosted or operator release. The highest-priority documentation work is not generic marketing content; it is operational safety and first-run clarity around live/private data, routing/deep links, object model, reasoning/context semantics, configuration, diagnostics, webhooks, privacy, and destructive or high-cost actions.

Documentation should be built in two layers:

1. Durable docs under `docs/dashboard/` and `docs/deploy/` for onboarding, references, and runbooks.
2. Inline UI copy, tooltips, empty states, warning text, and `Learn more` links that point to those durable docs.

Existing docs already cover some public/operator posture and route intent. The backlog below focuses on the gaps surfaced by the CT123 visible-browser reviews and should be treated as documentation/product-copy work that unblocks safer operator use.

## Priority scale

- P0: Release blocker for public trust, operator safety, or runbook viability.
- P1: Required before a self-serve operator can use the dashboard confidently.
- P2: Important clarity/completeness work after the core runbooks exist.
- P3: Polish, contributor ergonomics, or later expansion.

## Required coverage summary

- User onboarding: P0-1 quickstart, P1-1 overview guide, and P3-2 example operator workflows.
- Page/feature reference: P1-1 overview, P1-2 peers/sessions/messages, P1-3 reasoning, P1-4 context, P1-5 webhooks, P1-6 config, P1-7 diagnostics, P2-1 workspaces, P2-2 integrations, and P2-3 global search.
- Operator/admin runbooks: P0-2 routing/deploy, P0-3 admin safety, P1-3 reasoning operations, P1-5 webhook delivery, P1-6 config edit semantics, and P1-7 diagnostics/incident response.
- Tooltips/help copy: cross-cutting inline copy plus P2-5 accessibility/help inventory; every technical label and status chip should have short help text or a docs link.
- Warnings/safety language: P0-3 destructive/high-cost action warnings, P0-4 privacy/redaction guidance, and public/demo/live mode labels across sensitive sections.

## P0 documentation backlog

### P0-1. Dashboard quickstart and first-run operator guide

Proposed artifact: `docs/dashboard/quickstart.md`

Audience: first-time self-hosted operators, contributors, evaluators.

Why this is P0:

- The dashboard exposes many domain-heavy sections immediately: Workspaces, Peers, Sessions, Messages, Reasoning, Context, Webhooks, Instance, Diagnostics, Integrations, Config.
- There is no visible first-run tour, help drawer, or concise explanation of the Honcho object model.
- Without onboarding, users may misread demo/live data, derived memory outputs, queue status, or admin controls.

Required content:

- What Honcho Mission Control is and what it is not.
- Public demo vs public protected vs operator live-private vs mutation-enabled operator modes.
- Core object model: instance -> workspace -> peer -> session -> message -> conclusion/context.
- Recommended first 5 minutes:
  1. Confirm mode and data source.
  2. Check health/status and freshness.
  3. Inspect workspace scope.
  4. Inspect peers/sessions/messages only in trusted mode.
  5. Review diagnostics/config before enabling live or mutation-capable actions.
- Glossary for recurring terms: workspace, peer, session, message, conclusion, peer card, summary, dream, deriver, dialectic, reasoning worker, context layer, token limit.
- Links to overview, route map, reasoning, context, config, diagnostics, webhooks, and privacy docs.

Inline UI copy/tooltips needed:

- Add a persistent `Help` or `?` entry in the header/sidebar.
- Add a `Getting started` card to Overview.
- Add section-heading `Learn more` links.
- Add a public/demo/live data posture banner when appropriate.

Acceptance criteria:

- A new operator can explain what each primary dashboard section is for after reading one page.
- The guide makes it explicit that `ALLOW_LIVE_PUBLIC_DATA=true` is a live-private opt-in, not an auth or public-readiness flag.
- No secrets, real internal hosts, raw env values, or private memory examples appear in the guide.

### P0-2. Route map, deep-link contract, and deployment routing runbook

Proposed artifacts:

- `docs/dashboard/navigation-reference.md`
- `docs/deploy/spa-routing.md`

Audience: operators writing runbooks, support/docs writers, deployers, dashboard contributors.

Why this is P0:

- Parent reviews found direct URLs such as `/workspaces`, `/sessions`, `/config`, and `/diagnostics` returning raw Vercel `404: NOT_FOUND` on the visible gamma dashboard.
- Operators cannot bookmark, reload, or share dashboard section URLs if route state is not stable.
- Incident runbooks cannot safely instruct users to open `/diagnostics` or `/config` until route behavior is fixed or explicitly documented.

Required content:

- Authoritative route map for every visible section.
- Current vs intended behavior: root-only SPA state, Next/App Router route, hash route, or rewrite fallback.
- Which routes are safe/public and which require operator/live-private access.
- Deep-link support expectations for filters, selected workspace, selected peer, selected session, expanded rows, and search state.
- Deployment recipes:
  - Vercel rewrites/fallbacks.
  - Nginx `try_files` fallback.
  - Cloudflare Pages fallback.
  - Static Docker server fallback.
  - Next/App Router not-found behavior if migrated.
- Troubleshooting note for raw Vercel 404s and stale direct links.

Inline UI copy/tooltips needed:

- Product-level branded 404 with links back to Overview and docs.
- Route/deep-link warnings in docs until direct route tests pass.

Acceptance criteria:

- Every sidebar item has a documented direct route or an explicit statement that it is internal-only.
- Refresh/back/forward expectations are documented.
- Direct-route tests are listed as release checks.

### P0-3. Admin safety and destructive/high-cost action runbook

Proposed artifact: `docs/dashboard/admin-safety-runbook.md`

Audience: trusted operators and contributors implementing action copy.

Why this is P0:

- Visible reviews saw high-impact actions including `ARCHIVE`, `REMOVE_SESSION`, webhook `Delete`/`Deactivate`, `PAUSE_QUEUE`, `PROCESS_ALL`, `Retry`, `Cancel`, `REINDEX_VECTORS`, `FLUSH_CACHE`, `EXPORT_BACKUP`, config edits, and database URL changes.
- These actions need confirmation language, permission expectations, reversibility semantics, and verification steps before they are safe in an operator console.

Required content:

For every high-impact action, document:

- What the action does.
- Scope: instance, workspace, peer, session, message, webhook, queue job, or config field.
- Whether it is reversible.
- Whether it is audited.
- Required permissions/access-control expectations.
- Expected runtime and side effects.
- How to verify success.
- Rollback/recovery steps.
- When not to use it.
- Public/demo behavior: disabled, local demo-only mutation, or explanatory toast.

Actions requiring explicit coverage:

- Session archive/remove.
- Webhook deactivate/delete/edit.
- Queue pause/process-all/retry/cancel.
- Backup export.
- Vector reindex.
- Cache flush.
- Config save/reset/provider/model/worker/token/database changes.

Inline UI copy/tooltips needed:

- Confirmation modals for destructive actions.
- `This is demo-only` or `Mutations disabled` copy in public/shared deployments.
- Warning near `PROCESS_ALL`: may create burst load/cost.
- Warning near `POSTGRES_URL` and equivalent fields: restart/redeploy impact; redact secrets by default.
- Warning near `REINDEX_VECTORS` and `FLUSH_CACHE`: expected load and degraded behavior.

Acceptance criteria:

- No destructive or high-cost action appears without adjacent warning/help copy.
- Confirmation copy states reversibility and scope.
- Public/shared mode cannot imply that real mutations are available.

### P0-4. Privacy, redaction, retention, and screenshot-safety guide

Proposed artifact: `docs/dashboard/privacy-and-data-handling.md`

Audience: public demo maintainers, live-private operators, support staff, docs writers.

Why this is P0:

- Visible reviews observed message/session bodies, SQL-like snippets, peer-derived conclusions, context previews, webhook endpoint shapes, environment-like values, provider/config posture, and internal-looking operational details.
- Existing public/operator docs define the policy boundary, but dashboard users still need a practical guide for what is visible, exportable, screenshot-safe, and redacted.

Required content:

- What data may appear in each section: Workspaces, Peers, Sessions, Messages, Reasoning, Context, Webhooks, Instance, Diagnostics, Integrations, Config.
- Public/demo vs public protected vs live-private examples.
- Redaction rules for:
  - Message bodies.
  - Peer metadata.
  - Conclusions/peer cards/summaries.
  - Context previews.
  - Webhook URLs and headers.
  - Database URLs and env-derived config.
  - Logs, stack traces, filesystem paths, container paths, private hosts, LAN IPs.
- Screenshot/share guidance.
- Export/copy policy for IDs, logs, diagnostic bundles, config snippets, and message content.
- Retention/deletion/archival expectations, including how dashboard actions map to Honcho data lifecycle.
- Warning that derived memory outputs may be stale, inferred, or incorrect.

Inline UI copy/tooltips needed:

- Privacy banner in Messages, Sessions, Context, Diagnostics, Webhooks, Instance, and Config.
- Copy/export warnings and redaction labels.
- Tooltip for conclusions/peer cards explaining derived nature and correction/deletion path.

Acceptance criteria:

- Operators can tell which views are safe to screenshot in public docs.
- Public docs use placeholder values, not real internal-looking values.
- Message/context/conclusion views link to privacy guidance.

## P1 documentation backlog

### P1-1. Overview metrics and health interpretation guide

Proposed artifact: `docs/dashboard/overview.md`

Audience: operators using the dashboard landing view.

Required content:

- Meaning of each status card and metric: peers, sessions, messages, conclusions, queue, reads/writes/deletes, latency, throughput, peak ops, reasoning activity, recent sessions, instance status.
- Source/freshness/confidence grammar: demo, live, live-partial, stale, degraded, unknown, unavailable.
- Queue count scope: reasoning queue vs background queue vs combined operational tasks.
- Thresholds and recommended action when values look unhealthy.
- How overview quick links map to section pages and filters.
- What values are cached, sampled, synthetic, or live.

Inline UI copy/tooltips needed:

- Tooltips for uppercase labels such as `INSTANCE_OVERVIEW`, `MESSAGE_THROUGHPUT`, `REASONING_ACTIVITY`, `PEAK_OPS`.
- Freshness/source badges on metrics.
- `Why does this count differ?` help for queue/pending counts.

Acceptance criteria:

- Each overview metric has a definition, source, freshness rule, and operator action threshold.

### P1-2. Peers, Sessions, and Messages user guide

Proposed artifact: `docs/dashboard/peers-sessions-messages.md`

Audience: operators inspecting Honcho memory data.

Required content:

- Difference between user peers and agent peers.
- Peer lifecycle: create, inspect, update, archive/delete if supported.
- `observe_me` semantics and how it interacts with workspace/session config.
- Session lifecycle: create, inspect, status, archive/remove, restore if supported.
- Message stream: filters, statuses, token counts, message IDs, author/session links, reasoning relation.
- Why messages can be `completed`, `skipped`, `processing`, or failed.
- Empty/no-results behavior and filter reset guidance.
- Privacy/redaction and screenshot guidance.

Inline UI copy/tooltips needed:

- `No sessions found` empty state with query echo, active filters, reset action, and docs link.
- `What does skipped mean?` tooltip.
- `Reasoning disabled for this peer` explanation and remediation path.
- Accessible labels for icon-only peer/session/message controls.

Acceptance criteria:

- A user can inspect peer/session/message data without guessing what a status, token count, or action means.
- No-result states explain whether data is absent or filters are too narrow.

### P1-3. Reasoning operations guide

Proposed artifact: `docs/dashboard/reasoning-operations.md`

Audience: operators responsible for LLM reasoning queues, cost, and output quality.

Required content:

- Reasoning types: explicit, deductive, inductive, abductive, summary, peer card, consolidation; include output shape and intended use.
- Queue lifecycle: queued, processing, completed, failed, retried, canceled.
- Retry/cancel semantics and when each is safe.
- `PAUSE_QUEUE` and `PROCESS_ALL` runbooks.
- Batch threshold, token counts, workers, provider latency, and cost interactions.
- Common failures: LLM timeout, provider outage, auth/API-key problem, rate limit, malformed output, stale queue, worker not running.
- Backpressure and alert thresholds.
- Privacy implication of sending message/context content to model providers.

Inline UI copy/tooltips needed:

- Tooltips for queue badge, queue counts, `PAUSE_QUEUE`, `PROCESS_ALL`, `Retry`, `Cancel`, batch threshold, and token counts.
- Failed-job row links to troubleshooting steps.
- Cost/load warning before process-all or large retries.

Acceptance criteria:

- Operators can safely decide whether to retry, cancel, pause, or process jobs.
- Queue controls communicate cost/load/privacy risk.

### P1-4. Context assembly and truncation guide

Proposed artifact: `docs/dashboard/context-assembly.md`

Audience: operators debugging prompt context and derived memory.

Required content:

- How context is generated.
- Meaning of layers: peer card, conclusions, summaries, messages.
- Priority/truncation order and why lower-priority layers are dropped first.
- Token limit behavior and how changing the limit affects quality, cost, latency, and privacy.
- What disabling a layer does.
- Examples of good context previews and dangerous/over-broad previews.
- Difference between selected peer/session vs all-peers/all-sessions behavior.
- How to interpret `exceeds token limit` warnings.

Inline UI copy/tooltips needed:

- `Why is this truncated?` help link next to token warning.
- Privacy note near context preview.
- Clear copy if `all_peers` produces a specific peer preview or if a peer selection is required.

Acceptance criteria:

- Operators understand why generated agent context changes and how to avoid over-broad or sensitive context previews.

### P1-5. Webhooks integration and delivery runbook

Proposed artifact: `docs/dashboard/webhooks.md`

Audience: self-hosted operators integrating external systems.

Required content:

- Event catalog and payload schemas for each event type.
- Signing/secret validation, header names, timestamp/replay behavior if supported.
- Retry count, backoff, timeout, dead-letter/failure behavior.
- Local network reachability from the Honcho server, not from the browser.
- Gotchas: `localhost` means server-local, container networking, firewall, Docker bridge, TLS/self-signed certs, private DNS, reverse proxies.
- Creating, editing, deactivating, deleting, and testing endpoints.
- Failure triage: response codes, logs, delivery attempts, common errors.
- Security guidance for secrets and screenshotting endpoint URLs.

Inline UI copy/tooltips needed:

- `Test delivery` docs/help and, if implemented, button copy.
- Secret field explanation: optional vs recommended; how verification works.
- Warning that webhook URLs can expose internal topology.

Acceptance criteria:

- An operator can create and verify a webhook without needing tribal knowledge.
- Failure states link to concrete troubleshooting steps.

### P1-6. Configuration reference and edit semantics

Proposed artifact: `docs/dashboard/config-reference.md`

Audience: self-hosted operators, deployers, support, contributors.

Required content:

- Every dashboard-visible setting and its source of truth: env var, server config, dashboard value, workspace override, session/message override.
- Config hierarchy and precedence.
- Live vs restart/redeploy semantics.
- Safe ranges for worker counts, batch thresholds, max context tokens, queue settings.
- Provider/model compatibility matrix, including reasoning support and thinking-budget constraints.
- Validation failure modes and error messages.
- Rollback steps after bad edits.
- Secret handling: redact raw credentials and avoid exposing database URLs with credentials.

Inline UI copy/tooltips needed:

- Per-field help text and validation ranges.
- Unsaved/saved/requires-restart state.
- Secret redaction by default for database/provider values.
- Warning near fields that can cause outage, high cost, or data loss.

Acceptance criteria:

- Operators know whether a setting can be safely changed live and how to roll it back.
- Secret-bearing settings are not shown raw in public/shared contexts.

### P1-7. Diagnostics and incident response runbook

Proposed artifact: `docs/dashboard/diagnostics-runbook.md`

Audience: operators debugging self-hosted deployments.

Required content:

Convert dashboard troubleshooting cards into durable runbooks with:

- Symptom.
- Probable cause.
- How to confirm in dashboard/logs.
- Exact config/env category to inspect without exposing secrets.
- Safe remediation.
- Verification after remediation.
- Escalation path.

Required incident topics:

- Health checks failing.
- Queue growth or stuck deriver/reasoning worker.
- Provider/API-key/client failures.
- JWT/auth startup failures.
- Postgres/pgvector/migration mismatch.
- Redis missing or fallback behavior.
- Docker BuildKit/setup issues.
- Unexpected API/database errors.
- Stale data or degraded/live-partial state.
- Raw 404/deep-link failures.

Inline UI copy/tooltips needed:

- Warning-specific docs links.
- `Copy diagnostic bundle` / `Export logs` copy with privacy warning if those actions exist.
- Sanitized error summaries; no raw stack traces in public/shared mode.

Acceptance criteria:

- Each warning/error shown in Diagnostics has a docs link or matching runbook entry.
- The runbook avoids publishing secrets, raw paths, private hostnames, or private memory content.

## P2 documentation backlog

### P2-1. Workspaces guide and config inheritance documentation

Proposed artifact: `docs/dashboard/workspaces.md`

Required content:

- When to create separate workspaces.
- Production/staging/development separation patterns.
- Workspace-level config defaults and inheritance into peers/sessions/messages.
- Reasoning enable/disable implications for cost, privacy, and output availability.
- Workspace creation validation and persistence semantics.
- Workspace archival/deletion policy if supported.

Inline UI copy/tooltips needed:

- `Learn about workspaces` link near `NEW_WORKSPACE`.
- Tooltip for `Enable reasoning` in the creation modal.
- Copy explaining provider/model and config summary on workspace cards.

### P2-2. Integrations setup reference

Proposed artifact: `docs/dashboard/integrations.md`

Required content:

- Complete, copyable setup instructions for Hermes, OpenClaw, Claude Code, MCP, and any other listed integrations.
- Prerequisites, install/config commands, required environment variables, safe storage, verification command, troubleshooting link.
- Self-hosted vs hosted differences.
- Version compatibility notes.

Inline UI copy/tooltips needed:

- Fix empty setup list items observed in the visible browser review.
- Copy buttons for commands.
- Safety notes around env/secrets examples.

### P2-3. Global search and command-palette reference

Proposed artifact: `docs/dashboard/search.md`

Required content:

- Indexed objects: peers, sessions, messages, workspaces, conclusions, settings/docs/actions if supported.
- Query syntax and ranking rules, or a statement that search is plain text only.
- Keyboard shortcuts: Cmd/Ctrl+K, arrow keys, Enter, Escape.
- Empty state behavior.
- Permission/privacy scope for search results.
- Deep-link behavior for selected results.

Inline UI copy/tooltips needed:

- Search overlay footer with keyboard hints.
- Empty result copy.
- Result type explanations.
- Privacy note if message bodies are indexed.

### P2-4. Empty/error/loading state contributor reference

Proposed artifact: `docs/dashboard/states-and-copy.md`

Required content:

- Standard copy and component behavior for loading, error, empty dataset, no search results, unauthorized/protected, degraded/live-partial, stale, unknown, and mutation-disabled states.
- Query echo and active-filter display for no-results states.
- Reset filters and retry actions.
- Public/privacy-safe degraded messages that do not expose raw errors.

Inline UI copy/tooltips needed:

- Sessions no-result copy for queries like `no-such-session-xyz`.
- Form validation messages for blank required submissions.
- Action feedback/toasts for no-op or demo-only actions.

### P2-5. Accessibility and tooltip/help-copy inventory

Proposed artifact: `docs/dashboard/accessibility-and-help-copy.md`

Required content:

- Inventory of icon-only controls and required accessible names.
- Tooltip copy for technical labels: reasoning, conclusions, peer card, dream, deriver, dialectic, skipped/completed, token count, batch threshold, context layer, peak ops, live-partial, degraded.
- Contrast requirements for muted terminal-style labels.
- Keyboard/focus expectations for search, filters, drawers, tabs, modals, and horizontal overflow regions.

Inline UI copy/tooltips needed:

- Accessible names for every icon-only button.
- `aria-pressed`/selected state copy for toggles.
- Help text for filters and status chips.

## P3 documentation backlog

### P3-1. API and data-source mapping for dashboard contributors

Proposed artifact: `docs/dashboard/data-source-map.md`

Required content:

- Which Honcho API endpoints feed each dashboard route/panel.
- Which Kanban DB reads feed agent/current-work panels.
- How provenance, freshness, and confidence are derived.
- Which fields are redacted or intentionally not fetched in public/protected modes.
- Fixture/demo data ownership.

### P3-2. Example operator workflows

Proposed artifact: `docs/dashboard/operator-workflows.md`

Required content:

- Inspect a peer.
- Inspect a session and associated messages.
- Troubleshoot failed reasoning job.
- Add and test a webhook.
- Verify config after deploy.
- Prepare a safe public demo screenshot.
- Triage degraded/live-partial status.

### P3-3. Release checklist for documentation readiness

Proposed artifact: `docs/dashboard/release-docs-checklist.md`

Required content:

- Required docs present and linked from UI.
- Direct route tests passing or documented as intentionally unsupported.
- Public/privacy scan complete.
- Destructive-action warnings present.
- Diagnostics warnings link to runbooks.
- Search/empty/error states have copy.
- Screenshots use placeholders and redacted data.

## Cross-cutting inline copy backlog

These are not standalone pages, but they should be tracked with implementation work because the visible-browser reports repeatedly found that the UI looked powerful but under-explained.

### Mode and data-source labels

- `Demo data`: bundled sample state, no live Honcho memory.
- `Public privacy protected`: live private memory hidden by default.
- `Operator live-private`: live data visible; external access control required.
- `Mutations disabled`: controls are previews or read-only.
- `Live-partial/degraded`: some upstream reads failed; missing data is not inferred.
- `Stale`: value is from an older snapshot; show timestamp.

### Destructive/high-cost warning templates

- `This action affects [scope]. It is [reversible/irreversible]. Confirm only after [backup/check].`
- `This may create burst LLM/provider load and cost. Review queue size and provider health first.`
- `This setting requires restart/redeploy before it takes effect.`
- `Public/demo mode: this action does not mutate your real Honcho instance.`

### Empty/no-results template

- `No [objects] found for "[query]" in [workspace/filter scope]. Try clearing filters, checking workspace scope, or creating a new [object] if mutations are enabled.`

### Privacy warning templates

- `This view may include message bodies and derived memory. Avoid sharing screenshots unless public/demo mode is confirmed.`
- `Webhook URLs can reveal internal topology. Redact before sharing.`
- `Config values are redacted by default. Store secrets server-side only.`
- `Conclusions and peer cards are derived memory, not guaranteed facts; review source evidence before acting on them.`

## Suggested build order

1. Create `docs/dashboard/quickstart.md` and link it from Overview/help.
2. Create route/deep-link docs and fix/document direct-route behavior.
3. Create admin safety runbook and add confirmation/warning copy for destructive/high-cost actions.
4. Create privacy/data-handling guide and add privacy banners/links to sensitive views.
5. Create reasoning and context guides because they explain the most Honcho-specific concepts.
6. Create config, diagnostics, and webhooks runbooks because they are the highest-value self-hosted operator docs.
7. Fill in page references for overview, workspaces, peers/sessions/messages, integrations, search, and state-copy standards.
8. Add a release documentation checklist and require it before promoting the dashboard as self-serve.

## Gaps and decisions to resolve

Open product/documentation questions from the visible-browser evidence:

1. Is the gamma dashboard intended to be a public demo, a private operator console, or a hybrid? Current docs point toward a public/operator split, but the visible gamma UI reads as a live self-hosted console.
2. Which routing architecture is authoritative for the gamma/public deployment: root-only SPA, SPA with rewrites, hash routes, React Router BrowserRouter, or Next/App Router?
3. Should Diagnostics, Instance, Config, and Webhooks appear in public mode at all, or only as redacted/demo previews?
4. Which queue count should be canonical in top-level UI: reasoning queue, background queue, or combined operational workload?
5. What is the precise data-source label taxonomy for demo, sanitized snapshot, live, live-partial, stale, degraded, unavailable, and unknown?
6. Which actions are allowed to mutate local demo state, and which should always be disabled until authenticated/operator mode exists?
7. What should `all_peers` and `all_sessions` mean in context preview generation?
8. Which provider/model/version/config details are safe to show in public examples?

Until these are resolved, documentation should state conservative assumptions: public mode is read-only and redacted; operator live-private mode requires external access control; mutation-capable controls require explicit opt-in and warnings; direct route support is required for runbook-quality operator docs.

## Source-to-backlog traceability

- `t_43508928` D1 -> P0-1 quickstart/onboarding.
- `t_43508928` D2 -> P0-3 admin safety runbook.
- `t_43508928` D3 -> P1-3 reasoning operations.
- `t_43508928` D4 -> P1-4 context assembly.
- `t_43508928` D5 -> P1-5 webhooks.
- `t_43508928` D6 -> P1-6 config reference.
- `t_43508928` D7 -> P1-7 diagnostics runbook.
- `t_43508928` D8 -> P1-2 peers/sessions/messages and P0-4 privacy.
- `t_43508928` D9 -> P2-1 workspaces.
- `t_43508928` D10 -> P2-2 integrations.
- `t_43508928` D11 and `t_0a049132` direct-route findings -> P0-2 route/deep-link/deploy docs.
- `t_43508928` D12 -> P2-3 global search.
- `t_0a049132` empty-state findings -> P2-4 states/copy reference.
- `t_0a049132` technical label/contrast findings -> P2-5 accessibility/help copy inventory.

## Completion note

This backlog intentionally prioritizes docs that prevent unsafe or confusing operator behavior before general feature reference polish. The key release posture is: make data mode and route behavior honest, make high-impact actions safe, and give self-hosted operators enough runbooks to troubleshoot without relying on tribal knowledge.
