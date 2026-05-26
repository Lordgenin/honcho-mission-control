# Public/operator release policy

Date: 2026-05-26
Owner: Nexus Prime product/routing decision for task `t_d2143c04`
Inputs:
- `docs/COUNCIL_REVIEW_VERCEL_GAMMA_DASHBOARD.md`
- `docs/PUBLIC_OPERATOR_MODES.md`
- `docs/LIVE_PRIVATE_DASHBOARD_REQUIREMENTS.md`

## Product decision

Public Vercel is a sanitized product demo, not an unauthenticated operator console preview.

The public release should teach the Honcho Mission Control value proposition, safety model, and self-hosting path using demo/sanitized data. Private/local deployments such as CT122 may act as operator consoles only when the operator deliberately enables live-private mode server-side and protects the deployment with their own access boundary. Read-only live-private operation is in scope; mutation-enabled operation remains a separately reviewed future gate.

## Public section visibility

Public Vercel may show these sections only as sanitized demo/protected previews:

| Section | Public Vercel policy | Public content allowed | Public content forbidden |
| --- | --- | --- | --- |
| Diagnostics / health / performance | Show high-level posture and sanitized source/freshness/degraded labels. | Demo health, public privacy posture, read-only/mutations-disabled status, sanitized live-partial/degraded reasons, demo or clearly unavailable/insufficient telemetry. | Raw hostnames, LAN IPs, private origins, stack traces, raw exception text, env names that imply configured secrets, local paths, token/API-key status. |
| Instance / runtime | Show safe deployment posture only. | `demo data`, `public privacy protected`, `server-side connection configured`, `read-only`, `mutations disabled`, `configured-list`, `container-mounted-db`, `degraded`, `unknown`, `unavailable`. | Raw filesystem/container paths, database URL shapes, internal ports, migration internals, provider key flags, private topology strings. |
| Config / settings | Show public-safe configuration grammar and first-run guidance. | Mode label, workspace-scope summary, source grammar, docs links, placeholder values. | Raw env variables/values, tokens, cookies, private workspace ids, API keys, bearer tokens, raw Honcho origins, private deployment notes. |
| Webhooks / API playground / admin controls | Show disabled or demo-only previews. | Documentation-safe examples, disabled controls, demo-only toasts, read-only proxy guidance. | Public writes, destructive actions, live webhook mutations, enabled admin controls, secret webhook URLs, live operator actions without private gate. |

Public pages may show sanitized Kanban activity only when it excludes task bodies, comments, heartbeat notes, raw errors, private paths, hostnames, secrets, and private operational message bodies. Public pages must not show raw Honcho message/conclusion bodies.

## Exact mode label taxonomy

Use the following labels consistently in UI, docs, health/settings payloads, and QA language:

1. `public-demo`
   - Meaning: bundled synthetic/sample data; no live private Honcho memory connected to the browser-visible experience.
   - Typical settings: `USE_DEMO_DATA=true` or live settings absent.
   - Required UI phrase: `SANITIZED DEMO DATA — no live private instance connected`.

2. `public-protected`
   - Meaning: a public/shared deployment may have server-side services configured, but live private data is fail-closed.
   - Typical settings: `ALLOW_LIVE_PUBLIC_DATA=false`.
   - Required UI phrase: `PUBLIC PRIVACY PROTECTED — live memory hidden`.

3. `operator-live-private`
   - Meaning: trusted self-hosted/operator deployment with deliberate server-side live-data opt-in and external access boundary.
   - Typical settings: `USE_DEMO_DATA=false`, `ALLOW_LIVE_PUBLIC_DATA=true`, `ENABLE_MUTATIONS=false`.
   - Required UI phrase: `OPERATOR LIVE-PRIVATE — scoped live data, read-only`.

4. `operator-live-partial`
   - Meaning: live-private mode is enabled, but one or more upstream sources are unavailable, degraded, timed out, or unsupported.
   - Required UI phrase: `OPERATOR LIVE-PARTIAL — some sources unavailable` plus sanitized degraded reasons.

5. `operator-mutation-enabled`
   - Meaning: trusted private deployment with explicitly reviewed write-capable routes enabled.
   - Typical settings: `ENABLE_MUTATIONS=true` after review.
   - Required UI phrase: `OPERATOR MUTATION ENABLED — write actions active` plus confirmation/feedback for each write.

Do not use `ALLOW_LIVE_PUBLIC_DATA=true` as a public-readiness label. It is a server-side live-private opt-in flag, not authentication and not a public safety claim.

## Action policy by mode

| Action class | `public-demo` | `public-protected` | `operator-live-private` | `operator-mutation-enabled` |
| --- | --- | --- | --- | --- |
| Navigation, search, filtering, copy docs links | Allowed. | Allowed. | Allowed. | Allowed. |
| Read-only data refresh | Demo/sanitized refresh only. | Sanitized posture/health/Kanban refresh only; raw Honcho memory remains hidden. | Allowed for configured scoped Honcho/Kanban sources. | Allowed. |
| Command palette / form controls that look operational | Allowed only if local UI state or demo-only; show demo toast. | Disabled or documentation-only; show protected-mode explanation. | Read-only controls allowed; write-looking controls disabled with mutation-gate explanation. | Allowed only for explicitly reviewed routes with validation, confirmation, success/failure feedback, and audit-safe copy. |
| Webhook/API/admin/destructive mutations | Forbidden; disabled or demo-toasted. | Forbidden; disabled. | Forbidden unless separately reviewed and gated. | Allowed only after explicit route-level review and `ENABLE_MUTATIONS=true`. |
| Browser-visible secrets or raw diagnostics | Forbidden. | Forbidden. | Forbidden. | Forbidden. |

Every visible action must communicate one of: real read-only action, demo-only action, disabled preview, live-private read-only action, or mutation-enabled write action. Ambiguous active-looking controls are not acceptable for public release.

## Routing strategy owner/path

Owner: Hermes-Jarvis implementation lane, with Breach QA after implementation.

Chosen path: honor the documented Next.js App Router strategy in `docs/ROUTES.md` rather than introducing an ambiguous SPA-only fallback. Primary sections should have durable route-backed URLs, direct deep links, refresh/back-forward support, and a branded app-level 404 for unknown routes. If engineering discovers a blocking App Router constraint, the fallback is an explicitly documented Vercel rewrite/hash strategy, not silent root-only SPA behavior.

Existing implementation follow-up `t_ac610240` should use this policy plus `docs/ROUTES.md` as the routing/action/accessibility source of truth.

## Public release claim

Approved public claim after trust/routing/accessibility remediation:

`Honcho Mission Control is a safe self-hostable dashboard demo for understanding agent memory operations. Public Vercel uses sanitized demo/protected data; private self-hosted deployments can opt into scoped read-only live data behind the operator's own access boundary.`

Do not claim the public Vercel link is a production operator console, live private dashboard, authenticated admin surface, or mutation-capable control plane.

## Follow-up routing decision

This decision aligns with the Monarch council recommendation. No additional follow-up card is required solely due to policy drift. The already-created implementation cards remain the correct next path:

- `t_ae2fd995`: implement public-demo trust fixes using this policy for section visibility, mode labels, and action posture.
- `t_ac610240`: implement route-backed behavior, accessibility, and action-feedback credibility fixes using this policy for routing and action semantics.
