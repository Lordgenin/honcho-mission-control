# Council review: Vercel gamma Honcho dashboard

Source baseline: `docs/VERCEL_GAMMA_DASHBOARD_VIEW_BASELINE.md`
Reviewed by: Monarch / council lens

## Council verdict

Proceed, but do not position the current Vercel gamma dashboard as production-ready public operator software yet. It is strategically valuable as a visual and conceptual prototype: it makes Honcho Mission Control legible, broad, and memorable. The release risk is not core product promise; it is trust. A public page that looks like a live self-hosted operations console, shows internal-looking diagnostics, and exposes active-looking admin controls will make users question whether the project understands privacy and operational boundaries.

The right direction is a firm split:

1. Public demo: safe, obviously synthetic, marketing/evaluation oriented, no live-private details.
2. Public protected/read-only: high-level posture only, sanitized runtime signals where safe.
3. Operator live-private: real scoped data only behind the operator's own access boundary, still read-only by default.
4. Mutation-enabled operator: separate future gate after explicit review.

## Priority recommendations

### P0 — Make public trust impossible to misunderstand

Recommendation: Before promoting the Vercel gamma link, add persistent public-mode labeling and remove or mask operational posture details that look like real infrastructure: provider key status, auth mode wording, local/private endpoints, database URL shapes, migration/internal-port details, raw topology-like strings, and action controls that look live.

Rationale: Honcho is a memory system. The buyer/user fear is private memory leakage. Even synthetic data that resembles live infrastructure weakens credibility. The dashboard must over-communicate safety: `SANITIZED DEMO DATA — no live instance connected` is not cosmetic; it is product trust infrastructure.

### P0 — Decide the dashboard's primary public promise

Recommendation: The team should decide whether the public site is primarily a demo/marketing surface or an operator console preview. Do not leave it as an ambiguous hybrid.

Rationale: A marketing demo should teach value and safety. An operator console should support authenticated, reload-safe, scoped workflows. Trying to imply both on an unauthenticated public URL creates the exact conflict the QA found: impressive breadth, but unclear truth status.

Council position: Public Vercel should be a sanitized product demo. CT122/local/private deployments may be operator consoles.

### P1 — Fix routing before asking contributors or evaluators to treat it as an app

Recommendation: Implement route-backed sections, direct deep links, refresh/back-forward behavior, and a branded app-level 404. Align deployed behavior with the current Next/App Router route documentation or explicitly choose an SPA hash/path strategy with Vercel rewrites.

Rationale: Route durability is not just polish. It is how teams share defects, docs, screenshots, and operational state. The current single-root SPA behavior makes the app feel unfinished and increases QA/support friction.

### P1 — Accessibility pass belongs in the credibility tranche, not later polish

Recommendation: Fix unlabeled icon buttons, contrast failures, keyboard-inaccessible mobile overflow, decorative canvas semantics, and selected/pressed states while routing/public-mode work is underway.

Rationale: The terminal aesthetic is strong, but tiny muted controls and unlabeled icons turn style into exclusion. Public-facing open-source credibility depends on basic WCAG hygiene.

### P1 — Define command/action semantics

Recommendation: Create an explicit rule for every visible action: real read-only action, demo-only local mutation, disabled preview, or live-private/mutation-gated action. Add visible toasts/inline feedback, validation, and confirmations accordingly.

Rationale: The current UI has many controls that appear powerful but do not clearly act. In a memory-ops console, uncertainty about whether a button did anything is a product flaw and a safety flaw.

### P2 — Normalize operational language and metrics

Recommendation: Standardize source/freshness/scope labels and metric definitions, especially queue counts. `reasoning queue`, `background tasks`, and `pending operations` should not appear as competing truths without labels.

Rationale: The dashboard's purpose is operational confidence. Conflicting counts or ambiguous context generation semantics tell operators not to trust the data.

## Priority conflicts

1. Visual ambition vs. trust restraint: The UI is compelling because it looks live. For a public demo, that strength becomes a liability unless every live-looking surface is labeled, sanitized, or gated.
2. Breadth vs. maturity: Showing 12 sections proves product scope, but routing, accessibility, and action semantics must catch up before the breadth helps adoption.
3. Public evaluator needs vs. private operator needs: Public users need safety and explanation; private operators need real data and diagnostics. These are different products sharing components, not one undifferentiated mode.
4. Read-only visibility vs. mutations: Keep mutations out of the near-term release. Read-only live-private mode is already enough strategic surface area.

## Go / no-go concerns

Go for continued development and private/local operator testing.

No-go for broad public promotion until:

- public demo mode is visibly labeled and sanitized;
- live/operator mode is explicitly gated by deployment/access boundary language;
- route/deep-link behavior works or the SPA strategy is documented and implemented;
- admin/destructive controls are disabled, demo-toasted, or confirmed based on mode;
- the accessibility basics are fixed enough that the shell is navigable and labeled.

## Top decisions the team should make next

1. Public mode scope: Should public Vercel show Diagnostics, Instance, Config, and Webhooks at all, or only sanitized previews of those sections?
2. Mode labels: What exact taxonomy appears in the UI: `demo`, `public protected`, `live-private`, `live-partial`, `mutation-enabled`?
3. Routing strategy: Commit to Next/App Router pages, SPA BrowserRouter with Vercel rewrites, or hash routes. Current docs and deployment behavior should not diverge.
4. Action policy: Which actions are allowed in public demo, which show demo-only toasts, which are disabled, and which require live-private plus `ENABLE_MUTATIONS=true`?
5. Data-source language: What metric source/freshness/scope labels are mandatory on every operational panel?
6. Release claim: Should the next public claim be `safe self-hostable dashboard demo` or `operator console for private deployments`? The council recommends the former publicly, the latter privately.

## Recommended execution order

1. Lock the mode/release decision and action policy.
2. Implement public-demo trust fixes and section visibility/sanitization.
3. Implement routing/deep links/app-level 404.
4. Ship accessibility and command/action feedback fixes in the same credibility tranche.
5. Run Breach QA on public demo mode, protected mode, and at least one live-private local deployment.

## Council close

The dashboard has enough product energy to continue. The team should not dilute it into a bland admin panel. Keep the terminal mission-control identity, but make the boundary between theater, demo, read-only truth, and live-private operation unmistakable. Trust is the product surface now.
