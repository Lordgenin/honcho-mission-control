# Vercel Gamma Dashboard Review Synthesis

Task: t_bb6ba563
Target: https://honcho-dashboard-gamma.vercel.app/
Role: Nexus Prime root synthesis after browser QA, documentation, and council review

## Completed workstream

This task was decomposed into four lanes and all lanes completed:

1. Visible-browser exploratory QA across all visible dashboard sections.
   - Artifact: `qa-t_ee86a622/report.md`
   - Screenshots: `qa-t_ee86a622/screenshots/`

2. Playwright/browser product QA with targeted evidence for routing, accessibility, command palette, mobile, and public-data posture.
   - Artifact: `qa-t_c756a9e9/findings.md`
   - Evidence JSON: `qa-t_c756a9e9/browser-evidence.json`
   - Targeted evidence JSON: `qa-t_c756a9e9/targeted-evidence.json`
   - Screenshots: `qa-t_c756a9e9/screenshots/` and `qa-t_c756a9e9/screenshots-targeted/`

3. Durable contributor baseline documentation consolidating the browser-observed view of the site.
   - Artifact: `docs/VERCEL_GAMMA_DASHBOARD_VIEW_BASELINE.md`
   - Linked from: `README.md`

4. Council review using the Monarch/council lens.
   - Artifact: `docs/COUNCIL_REVIEW_VERCEL_GAMMA_DASHBOARD.md`

## Root synthesis

The Vercel gamma dashboard is a strong visual and conceptual prototype for Honcho Mission Control. It successfully communicates the shape of a self-hosted memory-operations console: workspaces, peers, sessions, messages, reasoning, context assembly, webhooks, instance state, diagnostics, integrations, and config are all made visible in one coherent mission-control shell.

The main risk is not lack of product imagination. The main risk is trust ambiguity. A public unauthenticated dashboard that looks live, shows operational-looking config and diagnostics, and exposes active-looking controls can make evaluators wonder whether Honcho understands the privacy boundary around memory infrastructure. Even synthetic data should not look like accidentally exposed live infrastructure.

Council recommendation: continue development and private/operator testing, but do not broadly promote the public Vercel gamma site as production-ready operator software until the public-demo and live-private boundaries are unmistakable.

## Priority decision

Public Vercel should be treated as a sanitized product demo.

CT122/local/private deployments can be operator consoles only when served behind the operator's own access boundary and explicitly configured for live-private data. Mutation-enabled operator mode should stay gated behind a later review.

## Highest-priority improvements

### P0: Public trust and data posture

- Add a persistent public-mode banner such as `SANITIZED DEMO DATA — no live instance connected`.
- Hide or sanitize provider-key validity, auth mode wording, local/private endpoints, DB URL shapes, migration/internal-port details, and topology-like strings in public unauthenticated mode.
- Make Diagnostics, Instance, Config, and Webhooks safe for public demo mode, or move sensitive versions of those views to private/operator mode only.
- Disable, hide, or demo-toast destructive/admin controls in public mode.

### P1: Routing and app credibility

- Implement URL-backed route state for all primary sections.
- Ensure direct URLs such as `/messages`, `/workspaces`, and `/settings` work or intentionally route through a documented SPA strategy.
- Add a branded app-level 404 instead of raw Vercel 404s.
- Preserve section state across refresh/back/forward.

### P1: Interaction and accessibility

- Fix command palette behavior: keyboard navigation, Enter select, Escape close/clear, click-outside close, and no-results state.
- Add visible feedback for every action button.
- Add form validation for required inputs.
- Fix unlabeled icon buttons, low contrast text, decorative canvas semantics, keyboard focusability for overflow regions, and selected/pressed states.

### P2: Operational clarity

- Normalize queue/pending counts or label each count by scope.
- Label every operational metric with source/freshness/scope: demo, snapshot, live, stale, degraded, or live-partial.
- Add tooltips or inline copy for Honcho terms such as peer card, dream, deriver, dialectic, explicit/deductive/inductive/abductive reasoning.

## Follow-up routing already created by council lane

The council lane created follow-up work for:

- locking public/operator release policy and mode/action/routing decisions;
- implementing public-demo trust labeling/sanitization and admin-control framing;
- implementing routing, deep links, app-level 404, accessibility, command/action feedback fixes;
- running Breach QA after trust/routing/accessibility remediations.

Those follow-ups should be treated as the execution wave after this review task.

## Contributor read order

1. `docs/VERCEL_GAMMA_DASHBOARD_VIEW_BASELINE.md`
2. `qa-t_ee86a622/report.md`
3. `qa-t_c756a9e9/findings.md`
4. `docs/COUNCIL_REVIEW_VERCEL_GAMMA_DASHBOARD.md`
5. Existing desired-state docs: `docs/PUBLIC_OPERATOR_MODES.md`, `docs/LIVE_PRIVATE_DASHBOARD_REQUIREMENTS.md`, `docs/ROUTES.md`

## Final call

Go: continued development, local/private operator testing, and execution of the follow-up remediation wave.

No-go: broad public promotion as a production-ready operator console until public demo mode is unmistakably synthetic/sanitized, route behavior is durable, admin actions are clearly framed, and accessibility basics pass.
