# Hermes Memory View

The dashboard models Hermes memory through Honcho resources:

- Workspaces: operational memory domains such as `example-workspace`.
- Peers: humans and agents participating in a workspace.
- Sessions: conversations, task runs, councils, and investigations.
- Messages: raw exchange content and evidence.
- Conclusions: durable facts and synthesized memory.
- Agents: peers whose metadata marks them as `type=agent`, `kind=agent`, `role=agent`, or `agent=true`.

Agent cards are intentionally metadata-driven. Supported metadata fields include `role`, `team`, `status`, `heartbeat`, `last_seen`, `current_goal`, `assigned_task`, and `capabilities`.

Demo mode includes generic build, review, and planning agents as examples but live mode does not hardcode a fixed team.
