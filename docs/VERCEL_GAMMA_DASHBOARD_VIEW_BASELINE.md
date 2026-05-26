# Honcho Dashboard View Baseline: Vercel Gamma Snapshot

Task: t_df6ac878
Observed target: https://honcho-dashboard-gamma.vercel.app/
Source evidence: browser/QA runs t_ee86a622 and t_c756a9e9
Audience: future Honcho dashboard contributors, QA reviewers, and product/engineering owners

## 1. Purpose and scope

This document captures the browser-observed Honcho dashboard experience on the public Vercel gamma deployment. It is a durable baseline of what a contributor saw in the application UI, not a statement of desired final architecture.

The snapshot should be used to:

- understand the current public dashboard information architecture;
- compare future redesigns against an observed baseline;
- preserve route, navigation, component, interaction, and QA findings from browser inspection;
- identify product, security/privacy, accessibility, and implementation risks before further public or operator-mode work.

Important scope note: the observed Vercel gamma deployment behaved like a single-page Vite-style app at `/`. The repository documentation may describe newer Next/App Router routes, but this baseline documents the public gamma site as inspected by QA.

## 2. Executive overview

The public Vercel gamma dashboard presents a polished terminal/self-hosted operations aesthetic for Honcho Mission Control. It loads quickly, renders without observed runtime JavaScript errors during normal navigation, and exposes a broad set of Honcho concepts: workspaces, peers, sessions, messages, reasoning, context assembly, webhooks, instance status, diagnostics, integrations, and config.

The main page model is a dashboard shell:

- fixed left navigation on desktop;
- compact top breadcrumb/search/admin header;
- main content area with terminal-window style panels;
- bottom status strip showing instance health, workspace/peer counts, queue count, PostgreSQL state, and Honcho version.

Major product strength: the app gives a strong mental model of a self-hosted Honcho operator console.

Major product risk: the public unauthenticated deployment displays internal-looking operational details, API/provider/key status language, local endpoints, database URL shapes, and active-looking admin controls. Even if the data is synthetic, it reads as live infrastructure state unless the UI clearly labels it as sanitized demo data.

Major implementation risk: visible sections are internal client state only. The browser URL remains `/` while navigating, and direct paths such as `/messages`, `/workspaces`, and `/settings` return raw Vercel 404 pages.

## 3. Evidence and screenshots

Primary QA reports:

- `qa-t_ee86a622/report.md` — broad visible-browser exploratory QA across all 12 visible sections.
- `qa-t_c756a9e9/findings.md` — Playwright/Chromium browser QA with route, accessibility, mobile, command-palette, and performance observations.
- `qa-t_c756a9e9/browser-evidence.json` — detailed page text, buttons, headings, route probes, console messages, and axe findings.
- `qa-t_c756a9e9/targeted-evidence.json` — targeted command palette, quick-link, mobile layout, and overflow evidence.

Screenshot references:

- `qa-t_ee86a622/screenshots/overview.png` — desktop overview page.
- `qa-t_ee86a622/screenshots/message-send.png` — message compose/send state.
- `qa-t_ee86a622/screenshots/diagnostics.png` — diagnostics exposure evidence.
- `qa-t_ee86a622/screenshots/config.png` — config page state.
- `qa-t_ee86a622/screenshots/diagnostics-config-validation.png` — diagnostics/config validation area.
- `qa-t_ee86a622/screenshots/search-alice-peers.png` — search navigation to Peers.
- `qa-t_c756a9e9/screenshots/desktop-home.png` — desktop home.
- `qa-t_c756a9e9/screenshots/mobile-home.png` — mobile home.
- `qa-t_c756a9e9/screenshots/mobile-nav-open.png` — mobile navigation drawer.
- `qa-t_c756a9e9/screenshots-targeted/mobile-messages.png` — mobile messages view.
- `qa-t_c756a9e9/screenshots-targeted/search-open.png`, `search-bob.png`, `ctrl-k.png` — search/command palette behavior.
- `qa-t_c756a9e9/screenshots/route--messages.png`, `route--workspaces.png`, etc. — direct route 404 evidence.

## 4. Visual and information architecture

### 4.1 Overall shell

Observed shell elements:

- Brand block: `HONCHO / SELF-HOSTED`.
- Sidebar sections: Overview, Workspaces, Peers, Sessions, Messages, Reasoning, Context, Webhooks, Instance, Diagnostics, Integrations, Config.
- Sidebar status card: instance status, status healthy, peers 1,304, queue 4, version v3.0.5.
- Header breadcrumb: `honcho / self-hosted / <section>`.
- Header search affordance: `search peers, sessions...` with `⌘ K` hint.
- Header admin/icon controls.
- Main H1 per section, typically with `v3.0.5`, `SELF-HOSTED`, and current clock time.
- Terminal-panel cards using bracketed titles like `[ MESSAGE_THROUGHPUT ]`, `[ SERVICE_STATUS ]`, `[ CURRENT_CONFIG ]`.
- Footer/status strip: `instance: healthy | workspaces: 3 | peers: 1,304 | queue: 4 pending | postgres: connected | honcho: v3.0.5`.

Design character:

- dark terminal motif;
- mono labels and uppercase action buttons;
- green/accent operational status language;
- small typography with high information density;
- panel chrome using `─ □ ×` decorative controls.

### 4.2 Data posture shown in UI

The site presents values that look like real self-hosted operational state:

- Honcho version `v3.0.5`;
- healthy instance status;
- PostgreSQL connected state;
- 3 workspaces, 1,304 peers, 252k+ messages, 90k+ conclusions;
- local DB URL shapes;
- local/private webhook endpoint examples;
- provider/key validity and not-configured statuses;
- auth-mode wording;
- background queue and deriver process details.

No raw secret token was reported by QA in this gamma pass, but the posture and topology details are still sensitive-looking and should be treated as public-demo trust risk.

## 5. Page and route inventory

### 5.1 Visible sidebar sections

The visible app contains 12 primary sections:

| Section | Observed internal state label | Primary purpose |
|---|---|---|
| Overview | `overview` / `INSTANCE_OVERVIEW` | High-level system metrics, message throughput, reasoning activity, recent sessions, instance status |
| Workspaces | `workspaces` | Workspace cards, counts, config summaries, workspace creation |
| Peers | `peers` | Peer list, search/filter, peer creation |
| Sessions | `sessions` | Session list, status filters, expandable details |
| Messages | `messages` | Message stream, filters, compose/send flow |
| Reasoning | `reasoning` | Background reasoning queue, controls, types, batching, activity |
| Context | `context` | Context layer assembly and preview generation |
| Webhooks | `webhooks` | Webhook endpoints, event types, self-hosted info |
| Instance | `instance` | Service status, instance stats, version, admin actions, connection info |
| Diagnostics | `diagnostics` | Health checks, logs/config/troubleshooting tabs, provider/auth/db status |
| Integrations | `integrations` | Integration docs for Hermes, OpenClaw, Claude Code, MCP, Docs |
| Config | `config` | Instance configuration fields, current config, hierarchy, environment summary |

### 5.2 Browser route behavior

Observed behavior:

- Clicking sidebar entries changes visible content and breadcrumb text.
- Browser location remains `https://honcho-dashboard-gamma.vercel.app/`.
- Browser back/forward does not provide reliable section-level navigation.
- Direct URLs return raw Vercel 404s for tested dashboard paths.
- `/favicon.ico` also returned 404 in the route probe.

Direct route probes that returned Vercel 404:

- `/workspaces`
- `/agents`
- `/sessions`
- `/messages`
- `/kanban`
- `/tasks`
- `/settings`
- a nonexistent route used for QA

Contributor implication: all observed pages are sections of one SPA view, not independent reload-safe routes. Future routing work should add shareable route state, reload restoration, and an app-level 404.

## 6. Navigation map

### 6.1 Primary navigation

Main sidebar path:

`Overview -> Workspaces -> Peers -> Sessions -> Messages -> Reasoning -> Context -> Webhooks -> Instance -> Diagnostics -> Integrations -> Config`

Behavior:

- Active section is highlighted with terminal-style marker such as `> OVERVIEW█`.
- Breadcrumb updates to `honcho / self-hosted / <section>`.
- URL remains `/`.
- Desktop sidebar stays visible.
- Mobile uses an `Open navigation` drawer; selecting a section closes the drawer and changes content.

### 6.2 Overview quick links

Overview contains quick cards/buttons:

- `3 WORKSPACES click to manage` -> Workspaces section.
- `1,304 PEERS click to manage` -> Peers section.
- `4 REASONING QUEUE click to manage` -> Reasoning section.
- `VIEW_ALL_SESSIONS` -> Sessions section.
- `VIEW_INSTANCE_DETAILS` -> Instance section.

These quick links change internal section state but do not push URL state.

### 6.3 Global search / command palette

Search entry points:

- desktop search button labeled visually as `search peers, sessions... ⌘ K`;
- `Ctrl+K`/command-palette shortcut worked in the targeted test;
- mobile icon search exists but had unlabeled-button/accessibility issues.

Observed search behavior:

- Opening search focuses the input.
- Typing `bob` showed a result: `PEER bob @production`.
- In broad QA, searching `alice` and selecting the peer result navigated to Peers.
- In targeted QA, pressing Enter on `bob` did not select/navigate.
- Escape did not visibly clear stale result text; stale `PEER bob @production` remained visible until other state changed.

Contributor implication: define exact command-palette semantics before expanding it. Expected behavior should include ArrowUp/ArrowDown, Enter selection, Escape close-and-clear, click-outside close, no-results state, and accessible focus management.

## 7. Page/component descriptions

### 7.1 Overview / `INSTANCE_OVERVIEW`

Observed sections:

- KPI cards:
  - Total peers: 1,304.
  - Active sessions: 3, 5 total.
  - Total messages: 252.6k, +2.4k today.
  - Conclusions: 90.5k, 4 reasoning pending.
- `[ MESSAGE_THROUGHPUT ]` panel:
  - label: real-time memory operations;
  - live total: 4,819;
  - delta: +13.6% vs previous period;
  - range buttons: 1H, 6H, 24H, 7D;
  - toggles/series: Reads, Writes, Deletes;
  - average latency and peak ops metrics.
- Quick navigation cards for Workspaces, Peers, Reasoning Queue.
- `[ REASONING_ACTIVITY ]` heatmap:
  - 52-week reasoning pass view;
  - total/average/peak values;
  - less/more legend.
- `[ RECENT_SESSIONS ]`:
  - list of recent sessions such as `sess_7f3a2b01`, `sess_8e4c1d02`, etc.;
  - peers, message counts, status.
- `[ INSTANCE_STATUS ]`:
  - uptime, DB size, vector count, queue pending;
  - link to instance details.

Notes:

- Strong first impression and visual hierarchy.
- Counts create trust issues when compared to other sections: Overview/sidebar queue says 4 pending while Instance/Diagnostics show 23 pending background tasks.

### 7.2 Workspaces

Purpose: top-level containers for peers, sessions, and data.

Observed elements:

- `NEW_WORKSPACE` action.
- Workspace cards for:
  - Production (`ws_prod_001`): 1,247 peers, 8,934 sessions, 245,678 messages, 89,234 conclusions, reasoning enabled, model `gpt-5.4`.
  - Staging (`ws_stag_002`): 45 peers, 234 sessions, 5,678 messages, 1,234 conclusions, reasoning enabled, model `sonnet-4.6`.
  - Development (`ws_dev_003`): 12 peers, 89 sessions, 1,234 messages, 0 conclusions, reasoning disabled, model `gpt-5.4-mini`.
- Per-workspace config summary:
  - reasoning enabled/disabled;
  - peer_card mode;
  - summary cadence;
  - dream enabled/disabled;
  - provider/model;
  - `VIEW_PEERS` action;
  - created date and id.

Interaction behavior:

- Clicking `NEW_WORKSPACE` opened a create form.
- Blank create produced no visible validation/error.
- Creating `qa workspace test` with reasoning unchecked added a client-side workspace card during the same session.
- New workspace appeared in the Create Peer workspace dropdown during the same browser session.

Risks:

- Empty required-field submissions silently no-op.
- It is unclear whether created workspaces persist, are demo-only, or are local client state.

### 7.3 Peers

Purpose: users and agents that interact within sessions.

Observed elements:

- `NEW_PEER` action.
- Search input.
- Workspace filter.
- Type filters: ALL, USER, AGENT.
- Peer cards:
  - `alice @production`, reasoning, 12 sessions, 347 messages, 89 conclusions.
  - `bob @production`, reasoning, 8 sessions, 156 messages, 34 conclusions.
  - `support_bot @production`, 156 sessions, 2,341 messages, 0 conclusions.
  - `charlie @staging`, reasoning, 5 sessions, 78 messages, 23 conclusions.
  - `assistant @production`, 234 sessions, 4,567 messages, 0 conclusions.
- Last active timestamps.
- Nested icon-only action buttons on peer cards.

Interaction behavior:

- Searching for a no-match value removed cards and showed `No peers found matching your filters`.
- `NEW_PEER` opened a create form with workspace dropdown, peer id input, user/agent selector, cancel/create controls.

Risks:

- Icon-only controls need accessible names.
- Create form validation/persistence state was not fully verified.

### 7.4 Sessions

Purpose: interaction threads between peers within workspaces.

Observed elements:

- `NEW_SESSION` action.
- Search input.
- Workspace filter.
- Status filters: ALL, ACTIVE, IDLE, ARCHIVED.
- Session cards for:
  - `sess_7f3a2b01 @production`, active, summary, 2 peers, 47 messages, 12.4k tokens.
  - `sess_8e4c1d02 @production`, active, 2 peers, 23 messages, 8.2k tokens.
  - `sess_9d5b2e03 @staging`, idle, summary, 1 peer, 156 messages, 45.1k tokens.
  - `sess_0c6a3f04 @production`, active, summary, 3 peers, 89 messages, 28.7k tokens.
  - `sess_1b7d4g05 @development`, archived, 1 peer, 12 messages, 3.8k tokens.

Interaction behavior:

- Clicking a session expanded inline details:
  - `SESSION_PEERS`;
  - `RECENT_MESSAGES`;
  - `VIEW_MESSAGES`;
  - `ARCHIVE`;
  - `REMOVE_SESSION`.
- Some message paragraphs appeared blank in one accessibility snapshot until expanded/re-rendered.

Risks:

- Destructive-looking actions appear active in public unauthenticated mode.
- Archive/remove actions need confirmation and demo/live clarity.

### 7.5 Messages

Purpose: view and create messages within sessions.

Observed elements:

- Search input.
- Session dropdown, default `all sessions`.
- Reasoning-status dropdown, default `all reasoning`.
- `[ MESSAGE_STREAM ]` panel:
  - sender;
  - session id;
  - timestamp;
  - message body;
  - reasoning status such as skipped/completed/processing;
  - token count;
  - message id.
- `[ COMPOSE_MESSAGE ]` panel:
  - prompts user to select a session before composing.
- `[ MESSAGE_STATS ]` panel:
  - total displayed;
  - pending reasoning;
  - processing;
  - completed.

Interaction behavior:

- Selecting session `sess_7f3a2b01`, selecting peer `alice (user)`, typing a body, and clicking `SEND_MESSAGE` inserted a new pending message at the top.
- Pending reasoning count updated to 1 after send.
- Clicking send without selected peer/body produced no visible validation.

Risks:

- Message send appears to mutate state but likely operates in client/demo state; UI should label this.
- Missing validation for incomplete sends.
- Mobile messages view is dense and long text blocks need responsive treatment.

### 7.6 Reasoning

Purpose: background inference tasks that build peer representations.

Observed elements:

- Controls: `PAUSE_QUEUE`, `PROCESS_ALL`.
- Summary cards:
  - queued 3;
  - processing 1;
  - completed 2;
  - failed 1;
  - tokens pending 7,442.
- Filters:
  - status: all;
  - type: all;
  - workspace: all.
- `[ REASONING_QUEUE ]` rows:
  - DEDUCTIVE alice;
  - EXPLICIT bob;
  - SUMMARY alice;
  - PEER_CARD charlie;
  - INDUCTIVE bob;
  - ABDUCTIVE alice with `LLM timeout after 30s`;
  - CONSOLIDATION charlie.
- `[ REASONING_TYPES ]` explainer:
  - EXP explicit extraction;
  - DED certain conclusions;
  - IND patterns;
  - ABD simplest explanations;
  - SUM summaries;
  - PCD peer-card updates;
  - CON consolidation.
- `[ CONCLUSIONS_STATS ]`.
- `[ BATCHING_CONFIG ]` with ~1,000 token threshold and current batch 7,442 tokens.
- Reasoning activity heatmap.

Interaction behavior:

- `PAUSE_QUEUE` click produced no obvious visible state change in QA.
- Queue actions such as Cancel/Retry were observed but destructive/side-effectful actions were not executed.

Risks:

- Queue counts are inconsistently scoped across UI.
- Admin queue controls need feedback and demo/live state clarity.

### 7.7 Context

Purpose: assemble LLM-ready context from peer representations, conclusions, summaries, and messages.

Observed elements:

- Token summary: 4,650 / 4,000 tokens.
- Selectors:
  - SESSION defaulting to `all_sessions`;
  - PEER defaulting to `all_peers`.
- Token limit control defaulting to 4,000.
- `GENERATE_CONTEXT` action.
- `[ CONTEXT_LAYERS ]`:
  - peer card: 150 tokens, 3 items;
  - conclusions: 800 tokens, 12 items;
  - summaries: 1,200 tokens, 4 items;
  - messages: 2,500 tokens, 47 items.
- Warning: enabled layer total exceeds token limit; lower-priority layers will be truncated.
- `[ CONTEXT_PREVIEW ]` initially says no context generated yet.
- `[ HOW_CONTEXT_WORKS ]` explains PCD, CON, SUM, MSG layers.
- `[ LAYER_STATS ]` shows effective total 4,000 / 4,000.

Interaction behavior:

- `GENERATE_CONTEXT` produced concrete context preview in broad QA.
- Output began with `peer: alice | session: all_sessions` while the UI still indicated `all_peers`.

Risks:

- `all_peers` selector producing a specific peer preview is misleading.
- Context view is especially sensitive because it may expose memory content; public mode should be demo/redacted only.

### 7.8 Webhooks

Purpose: webhook endpoint management for self-hosted Honcho instance.

Observed elements:

- `NEW_WEBHOOK` action.
- Summary: active 2, inactive 1, failures 7.
- `[ WEBHOOK_ENDPOINTS ]` list with local/private-looking endpoints and event types.
- Endpoint controls: Activate, Deactivate, Edit, Delete.
- `[ EVENT_TYPES ]` list:
  - message.created;
  - message.updated;
  - session.created;
  - session.updated;
  - peer.created;
  - peer.updated;
  - reasoning.completed;
  - reasoning.failed.
- `[ SELF_HOSTED_INFO ]` stating no API key required for self-hosted, webhooks target local endpoints only, endpoint guidance, retries, timeout.

Risks:

- Public page shows local endpoint shapes and local topology-style guidance.
- Admin actions look active without auth/demo explanation.

Recommended UI posture:

- Use obviously fake placeholders in public mode.
- Disable actions or route to demo-only toasts.
- Gate real endpoint management behind authenticated operator mode.

### 7.9 Instance

Purpose: self-hosted Honcho instance status and management.

Observed elements:

- `REFRESH` action.
- Status: `ALL_SYSTEMS_OPERATIONAL`.
- Uptime: 14d 7h 23m.
- `[ SERVICE_STATUS ]`:
  - api_server, PostgreSQL, reasoning_workers, vector_store, background_queue, storage;
  - latency/connection/count/status metadata.
- `[ INSTANCE_STATS ]`:
  - workspaces, peers, sessions, messages, conclusions, DB size, vectors, queue.
- `[ VERSION_INFO ]`:
  - honcho_version;
  - LLM provider/model;
  - reasoning workers;
  - batch threshold.
- `[ ADMIN_ACTIONS ]`:
  - EXPORT_BACKUP;
  - REINDEX_VECTORS;
  - FLUSH_CACHE;
  - last backup/reindex timestamps.
- `[ CONNECTION_INFO ]`:
  - PostgreSQL URL shape;
  - webhooks enabled.

Risks:

- This is the most operator-like page after Diagnostics.
- Public unauthenticated display of connection info and admin controls is not safe/trustworthy unless clearly demo/sanitized.

### 7.10 Diagnostics

Purpose: troubleshooting and health monitoring for self-hosted Honcho.

Observed elements:

- `RUN_CHECKS` action.
- Summary: 2 warnings, 10/12 checks passing.
- Tabs: Health Checks, Logs, Config Validation, Troubleshooting.
- Health checks:
  - PostgreSQL connection;
  - database migrations;
  - pgvector extension;
  - API server;
  - API functionality;
  - deriver process;
  - Google Gemini API;
  - Anthropic API;
  - OpenAI API;
  - Redis cache;
  - authentication config;
  - database config.

Risks:

- Diagnostics exposes highly reconnaissance-useful operational/security posture:
  - provider API status language;
  - auth mode wording;
  - DB connection format;
  - service port;
  - queue/worker state;
  - migration revision;
  - API functionality test details.
- No raw secrets were reported, but public diagnostics should be redacted, summarized, or authenticated-only.

### 7.11 Integrations

Purpose: docs-style integration guidance.

Observed elements:

- Integration tabs: Hermes, OpenClaw, Claude Code, MCP, Docs.
- Search input.
- Subtabs/sections such as Overview, Tools, Setup, Self-hosted.
- Hermes Agent description:
  - open-source AI agent;
  - dual-peer architecture;
  - multi-platform;
  - tool calling;
  - skills system.
- Honcho fit:
  - persistent cross-session memory;
  - prompt-time context injection;
  - durable writeback.
- Configuration snippets and self-hosting requirements.
- Quick links: Self-Hosting Guide, Troubleshooting, Architecture, API Reference.

Notes:

- Strong informational hierarchy.
- Search was present but not deeply exercised due browser state/ref instability after navigation.

Risks:

- Any config snippets in public view should use documentation-safe values only.

### 7.12 Config

Purpose: instance configuration and settings.

Observed elements:

- `[ LLM_CONFIGURATION ]`:
  - LLM provider;
  - LLM model;
  - explanatory copy.
- `[ REASONING_CONFIGURATION ]`:
  - reasoning workers;
  - batch threshold;
  - max context tokens.
- `[ DATABASE_CONFIGURATION ]`:
  - Postgres URL field/copy.
- `[ FEATURE_FLAGS ]`:
  - `webhooks_enabled`.
- `[ CURRENT_CONFIG ]`:
  - version, provider, model, workers, batch, max_context, webhooks.
- `[ CONFIG_HIERARCHY ]`:
  - instance -> workspace -> session -> message override chain;
  - peer observe_me override note;
  - config schema sample.
- `[ ENVIRONMENT ]`:
  - high-level env-style values such as Honcho version/provider/model/workers/batch.

Interaction behavior:

- Clicking/toggling within config could show `RESET`, `SAVE_CHANGES`, and `You have unsaved changes`.
- Fields appeared editable or interactive, but save/apply/cancel semantics were not clear from accessible snapshot.

Risks:

- Public config should not expose raw env labels, local connection strings, private paths, or provider posture.
- Editable controls need clear demo/live persistence semantics.

## 8. Interaction behavior summary

Tested and working or partially working:

- Sidebar navigation across all visible sections.
- Overview quick-link navigation to Workspaces, Sessions, Instance, etc.
- Peer search empty state.
- Workspace creation in client-side state.
- Peer create form opening.
- Session row expansion.
- Message compose and send when valid inputs are selected.
- Global search result navigation for at least one peer (`alice`) in broad QA.
- Mobile navigation drawer open/select/close behavior.

Observed gaps:

- Browser URL does not change for internal navigation.
- Direct section URLs return Vercel 404.
- Command palette Enter/Escape behavior inconsistent/incomplete.
- Empty/incomplete form submissions can silently no-op.
- Several action buttons have no visible feedback.
- Destructive/admin controls appear active in public unauthenticated mode.
- Queue counts and pending counts use unclear scopes.
- Context generation with all-peers selector can produce specific-peer output.
- Some mobile regions overflow or are cramped.

## 9. Accessibility baseline

Axe/browser accessibility observations from t_c756a9e9:

- Critical: unlabeled icon-only buttons (`button-name`) on desktop/mobile.
- Serious: color contrast failures for muted gray text on dark backgrounds, especially tiny mono labels.
- Serious: mobile horizontal breadcrumb/overflow region not keyboard focusable.
- Moderate: decorative canvas treated as page content outside landmarks.

Recommended fixes:

- Add `aria-label` or visible text to every icon-only button.
- Add accessible labels for search/admin/notification/window-control style buttons.
- Improve muted text contrast tokens or increase size/weight.
- Mark decorative canvas `aria-hidden="true" role="presentation"`.
- Make horizontal scroll regions keyboard-focusable with labels, or avoid horizontal scrolling.
- Add `aria-pressed`/selected states for toggles and range buttons.

## 10. Performance and technical observations

Observed by t_c756a9e9:

- First load felt fast in Chromium.
- DOMContentLoaded/load: approximately 0.56 seconds after network setup.
- Main JS transfer: roughly 162 KB.
- Main CSS transfer: roughly 8 KB.
- Static asset names such as `/assets/index-*.js` and `/assets/index-*.css` suggest a Vite-style SPA deployment on the inspected Vercel target.
- Normal UI navigation did not produce major runtime JS console errors.
- Console errors from route probes were expected 404s for direct path attempts and favicon.

Technical implication:

- The gamma target likely lacks SPA rewrite rules or route files for direct section paths.
- If continuing the SPA approach, configure Vercel rewrites to serve `index.html` for app paths and implement client route state.
- If migrating to Next/App Router, ensure route segments and app-level `not-found` behavior match documented route expectations.

## 11. Defects and risks

### P0 — Browser routing is not shareable or reload-safe

Evidence:

- Sidebar clicks update content but keep URL at `/`.
- Direct paths such as `/messages` and `/workspaces` return raw Vercel 404.

Impact:

- Operators cannot share links to a page/state.
- Refresh loses current section.
- Browser back/forward is weak.
- Public route errors look unfinished.

### P0 — Public demo exposes internal-looking operational data

Evidence:

- Diagnostics, Instance, Webhooks, and Config show local URLs, provider statuses, auth mode language, database URL shapes, migration/queue/worker details, and admin-looking controls.

Impact:

- Even synthetic data can erode trust if it looks like a real exposed self-hosted instance.
- Public attackers or prospects may read it as reconnaissance material.

### P1 — Command palette behavior incomplete

Evidence:

- Search opens and shows results.
- Enter did not reliably select/navigate.
- Escape left stale result text visible in targeted test.

Impact:

- Keyboard users get inconsistent behavior.
- Search state can visually leak into page content after modal close attempts.

### P1 — Accessibility basics need pass

Evidence:

- Unlabeled buttons, color contrast, scrollable-region focusability, decorative canvas landmark issue.

Impact:

- Screen reader and keyboard users cannot reliably operate dashboard controls.
- WCAG AA risk for public-facing dashboard.

### P1 — Mobile/content density needs polish

Evidence:

- Mobile drawer works, but content remains dense.
- Message stream/footer/breadcrumb have overflow/density issues.

Impact:

- Mobile operators can navigate but may struggle to parse dense operational data.

### P2 — Admin/destructive controls lack feedback and safety framing

Evidence:

- Pause queue, process all, export backup, reindex vectors, flush cache, archive/remove, webhook delete/edit appear active.
- Some clicks produce no visible feedback.

Impact:

- In demo mode users do not know whether actions are real, disabled, or silently ignored.
- In live mode destructive controls need confirmation.

### P2 — Form validation is not visible

Evidence:

- Blank workspace create and incomplete message send produced no visible validation.

Impact:

- Users cannot distinguish invalid input from broken UI or loading state.

### P2 — Data definitions/counts are unclear

Evidence:

- Sidebar/Overview reasoning queue: 4.
- Reasoning page: queued 3 + processing 1.
- Instance/Diagnostics background queue: 23 pending.

Impact:

- Operators may mistrust operational counts unless scope is labeled.

## 12. Improvement backlog

### Immediate / release-blocking for public trust

1. Add persistent public-mode banner: `SANITIZED DEMO DATA — no live instance connected`.
2. Sanitize or hide public diagnostics/config/instance/webhook operational details.
3. Replace internal-looking endpoints/DB URLs with documentation-safe placeholders.
4. Hide provider-key validity, auth mode, migration revisions, internal ports, local DB URLs, and live topology details from public unauthenticated mode.
5. Disable or demo-toast all destructive/admin controls in public mode.

### Navigation and routing

6. Implement URL-backed route state for every primary section.
7. Add Vercel rewrite/fallback or route files so direct section URLs do not raw-404.
8. Add app-level branded 404 with navigation back to Overview.
9. Ensure browser Back/Forward and refresh preserve current section.
10. Preserve useful filter/search/detail state in route query/hash where practical.

### Interaction quality

11. Define and implement command palette behavior: keyboard navigation, Enter select, Escape close/clear, click-outside close, no-results state.
12. Add toast/inline feedback for every action button.
13. Add confirmation for destructive actions.
14. Add clear demo/live persistence copy for create/send/config actions.
15. Add visible validation to required forms.

### Accessibility

16. Add labels to icon-only controls.
17. Improve contrast tokens for muted text.
18. Mark decorative canvas as presentation/hidden.
19. Make scrollable breadcrumb/overflow regions keyboard accessible.
20. Add pressed/selected states to toggles.

### Product clarity

21. Normalize queue/pending counts or label scopes precisely.
22. Label metric source/freshness: demo, snapshot, live, stale, degraded.
23. Add tooltips for Honcho-specific terms: peer_card, dream, deriver, dialectic, explicit/deductive/inductive/abductive reasoning.
24. Add drilldowns from overview KPIs to filtered lists.
25. Add copy-to-clipboard for IDs and sanitized config snippets.

### Responsive/mobile

26. Add collapsed message cards on mobile.
27. Stack or wrap footer/status strip cleanly.
28. Add sticky filters for long list pages.
29. Reduce metadata density in mobile message/session rows.
30. Add Playwright mobile coverage for drawer, section navigation, and dense views.

### QA/test coverage

31. Add Playwright tests for section routes/deep links.
32. Add Playwright tests for command palette behavior.
33. Add axe checks for desktop and mobile shell.
34. Add fixtures/stories for loading, empty, no-results, API error, unauthorized, public-protected, live-partial/degraded states.
35. Add regression checks for public-mode sanitization.

## 13. Open questions

1. Is the Vercel gamma dashboard intended as a public demo, an operator console, or a hybrid? The UI currently reads like an operator console exposed publicly.
2. Which route architecture is intended for the gamma/public deployment: SPA with rewrites, hash routes, React Router BrowserRouter, or Next/App Router?
3. Should public deployments ever show Diagnostics, Instance, Config, and Webhooks sections, or should those be private/operator-only?
4. What is the authoritative data-source label taxonomy: demo, mock, sanitized snapshot, live, live-partial, stale, degraded?
5. Which actions are allowed in demo mode, and should they mutate local client state, server demo state, or only show toasts?
6. Which queue count is the canonical user-facing queue: reasoning queue count, background queue count, or combined operational tasks?
7. For Context generation, what should `all_peers` mean: aggregated context, no peer selected, random/sample peer, or a required peer selector?
8. Should Workspaces/Peers/Sessions/Messages create flows exist in public demo mode, or should they be moved behind private operator mode?
9. What level of provider/model/version detail is safe in public mode?
10. Should the design optimize first for desktop operators, mobile status checks, or both equally?

## 14. Suggested contributor read order

For a new contributor working on this dashboard:

1. Read this baseline first to understand observed gamma behavior.
2. Open screenshot references for Overview, Diagnostics, Message Send, Config, and Mobile Nav.
3. Read `qa-t_ee86a622/report.md` for broad manual QA details.
4. Read `qa-t_c756a9e9/findings.md` for prioritized route/accessibility/mobile/security findings.
5. Compare against current repo docs such as `docs/ROUTES.md`, `docs/PUBLIC_OPERATOR_MODES.md`, and `docs/LIVE_PRIVATE_DASHBOARD_REQUIREMENTS.md` to identify drift between desired and deployed behavior.

## 15. Baseline verdict

The Vercel gamma dashboard is a strong visual and conceptual prototype for Honcho Mission Control. It successfully communicates the breadth of a self-hosted memory-operations console and gives contributors a clear foundation to improve.

Before it should be treated as production-quality public/operator UI, it needs explicit public-demo framing, safer public data posture, reload-safe routes, command-palette cleanup, action feedback/validation, and an accessibility pass. The safest direction is a clear split between sanitized public demo mode and authenticated live-private operator mode, with route/state/freshness labels making that split visible everywhere.
