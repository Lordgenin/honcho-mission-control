# Routes

- `/` - landing and guardrail summary.
- `/dashboard` - health, mode, and recent messages.
- `/workspaces` - searchable workspace list.
- `/workspaces/[workspaceId]` - workspace metrics and links.
- `/workspaces/[workspaceId]/peers` - peers in a workspace.
- `/workspaces/[workspaceId]/peers/[peerId]` - peer metadata detail.
- `/workspaces/[workspaceId]/sessions` - sessions in a workspace.
- `/workspaces/[workspaceId]/sessions/[sessionId]` - session transcript.
- `/messages` - searchable global message stream.
- `/conclusions` - searchable conclusions.
- `/context` - combined memory context JSON for operators.
- `/api-playground` - read-only proxy endpoint guidance.
- `/webhooks` - webhook configuration preview; actions disabled by default.
- `/performance` - Recharts latency chart when data exists.
- `/settings` - safe runtime environment view; API key is never printed.
- `/agents` - Hermes agents discovered from Honcho peer metadata.

Unknown routes render `app/not-found.tsx` instead of falling back to the overview.
