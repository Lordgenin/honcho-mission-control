import { summarizePerformanceTelemetry } from './data-utils.js';

const now = new Date('2026-05-23T20:30:00Z').toISOString();
export function getDemoSnapshot() {
  const workspaces = [
    { id: 'example-workspace', name: 'Example Workspace', summary: 'Sample operations workspace', peers: 6, sessions: 18, conclusions: 74, status: 'healthy' },
    { id: 'platform-lab', name: 'Platform Lab', summary: 'Sandbox for integration and gateway checks', peers: 4, sessions: 11, conclusions: 38, status: 'degraded' }
  ];
  const peers = [
    { id: 'builder-bot', name: 'Builder Bot', workspace_id: 'example-workspace', metadata: { type: 'agent', role: 'engineering lead', team: 'build', status: 'online', heartbeat: '2m ago', last_seen: now, current_goal: 'Ship the dashboard', assigned_task: 'TASK-123', capabilities: ['nextjs', 'typescript', 'devops'] } },
    { id: 'review-bot', name: 'Review Bot', workspace_id: 'example-workspace', metadata: { type: 'agent', role: 'qa/security reviewer', team: 'review', status: 'ready', heartbeat: '5m ago', last_seen: now, current_goal: 'Review dashboard behavior', assigned_task: 'TASK-124', capabilities: ['qa', 'security', 'playwright'] } },
    { id: 'planner-bot', name: 'Planner Bot', workspace_id: 'example-workspace', metadata: { type: 'agent', role: 'orchestrator', team: 'operations', status: 'online', heartbeat: '1m ago', last_seen: now, current_goal: 'Coordinate follow-up lanes', capabilities: ['planning', 'kanban'] } },
    { id: 'operator', name: 'Human operator', workspace_id: 'example-workspace', metadata: { type: 'human', role: 'owner' } }
  ];
  const sessions = [
    { id: 's-dashboard', workspace_id: 'example-workspace', peer_id: 'builder-bot', title: 'Production Next.js dashboard build', message_count: 42, updated_at: now, status: 'active' },
    { id: 's-memory', workspace_id: 'example-workspace', peer_id: 'planner-bot', title: 'Memory architecture planning', message_count: 28, updated_at: '2026-05-23T18:15:00Z', status: 'complete' },
    { id: 's-qa', workspace_id: 'example-workspace', peer_id: 'review-bot', title: 'Dashboard QA pass', message_count: 33, updated_at: '2026-05-23T19:00:00Z', status: 'complete' }
  ];
  const messages = [
    { id: 'm1', workspace_id: 'example-workspace', session_id: 's-dashboard', peer_id: 'builder-bot', role: 'assistant', content: 'Implementing App Router routes with server-side Honcho proxy and read-only defaults.', created_at: now },
    { id: 'm2', workspace_id: 'example-workspace', session_id: 's-qa', peer_id: 'review-bot', role: 'assistant', content: 'Top checks: mock state labeling, lifecycle coverage, disabled controls, unknown-route fallback, search.', created_at: '2026-05-23T19:05:00Z' },
    { id: 'm3', workspace_id: 'example-workspace', session_id: 's-memory', peer_id: 'planner-bot', role: 'assistant', content: 'The demo Honcho service uses a documented request timeout and server-side configuration.', created_at: '2026-05-23T18:20:00Z' }
  ];
  const conclusions = [
    { id: 'c1', workspace_id: 'example-workspace', peer_id: 'builder-bot', text: 'Honcho API credentials must remain server-side; browser calls go through app/api/honcho.', confidence: 0.98, created_at: now },
    { id: 'c2', workspace_id: 'example-workspace', peer_id: 'review-bot', text: 'Dashboard controls must be disabled unless ENABLE_MUTATIONS=true and visibly labeled.', confidence: 0.94, created_at: '2026-05-23T19:12:00Z' }
  ];
  const webhooks = [
    { id: 'wh-kanban', url: 'https://example.invalid/hermes/kanban', event: 'task.completed', status: 'disabled-readonly', deliveries: 0 },
    { id: 'wh-memory', url: 'https://example.invalid/honcho/conclusions', event: 'conclusion.created', status: 'disabled-readonly', deliveries: 0 }
  ];
  const performanceSamples = [
    { label: '10:00', latency_ms: 82, requests: 44, errors: 0 }, { label: '11:00', latency_ms: 96, requests: 58, errors: 1 },
    { label: '12:00', latency_ms: 121, requests: 71, errors: 2 }, { label: '13:00', latency_ms: 88, requests: 63, errors: 0 },
    { label: '14:00', latency_ms: 104, requests: 82, errors: 1 }
  ];
  const performance = summarizePerformanceTelemetry({
    generatedAt: now,
    source: 'demo',
    timeseries: performanceSamples,
    records: [
      { path: '/v3/workspaces/list', ok: true, status: 200, latency_ms: 82, observed_at: now },
      { path: '/v3/workspaces/example-workspace/sessions/list', ok: true, status: 200, latency_ms: 121, observed_at: now },
      { path: '/v3/workspaces/platform-lab/conclusions/list', ok: false, status: 503, error: 'demo-upstream-warning', latency_ms: 186, observed_at: now }
    ]
  });
  return { mode: 'demo', generated_at: now, workspaces, peers, sessions, messages, conclusions, webhooks, performance };
}
