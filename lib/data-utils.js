export function asArray(value) { return Array.isArray(value) ? value : []; }
export function normalizeCollection(payload, keys = []) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  for (const key of keys) if (Array.isArray(payload[key])) return payload[key];
  for (const key of ['items', 'results', 'data', 'workspaces', 'peers', 'sessions', 'messages', 'conclusions']) if (Array.isArray(payload[key])) return payload[key];
  return [];
}
export function normalizeV3Message(message = {}, workspaceId = '', sessionId = '') {
  return {
    ...message,
    id: message.id || message.message_id || `${sessionId || 'message'}-${message.created_at || 'item'}`,
    workspace_id: message.workspace_id || workspaceId,
    session_id: message.session_id || sessionId,
    content: message.content || message.text || message.message || '',
    role: message.role || message.type || message.peer_id || 'message'
  };
}

export function normalizeConclusion(conclusion = {}, workspaceId = '') {
  const confidenceNumber = Number(conclusion.confidence);
  const hasConfidence = conclusion.confidence !== undefined && conclusion.confidence !== null && conclusion.confidence !== '' && Number.isFinite(confidenceNumber);
  const evidenceCount = Number(conclusion.evidence_count ?? conclusion.evidenceCount ?? conclusion.metadata?.evidence_count ?? conclusion.metadata?.evidenceCount);
  const lastUpdated = conclusion.updated_at || conclusion.created_at || conclusion.timestamp || '';
  return {
    ...conclusion,
    id: conclusion.id || conclusion.conclusion_id || `${workspaceId || 'workspace'}-${lastUpdated || 'conclusion'}`,
    workspace_id: conclusion.workspace_id || workspaceId,
    text: conclusion.text || conclusion.content || conclusion.summary || '',
    confidence: hasConfidence ? confidenceNumber : null,
    confidence_status: hasConfidence ? 'reported' : 'unavailable',
    confidence_reason: hasConfidence ? 'Reported by Honcho' : 'Honcho did not report confidence',
    evidence_count: Number.isFinite(evidenceCount) ? evidenceCount : null,
    last_updated: lastUpdated,
    provenance: {
      source: conclusion.source || 'honcho-conclusion',
      evidence_count: Number.isFinite(evidenceCount) ? evidenceCount : null,
      last_updated: lastUpdated,
      confidence_status: hasConfidence ? 'reported' : 'unavailable'
    }
  };
}

export function getConclusionProvenanceLabel(conclusion = {}) {
  const evidence = Number(conclusion.evidence_count ?? conclusion.provenance?.evidence_count);
  const evidenceLabel = Number.isFinite(evidence) ? `${evidence} evidence item${evidence === 1 ? '' : 's'}` : 'evidence count unavailable';
  const updated = conclusion.last_updated || conclusion.provenance?.last_updated || 'last update unavailable';
  if ((conclusion.confidence_status === 'reported' || conclusion.confidence_status === undefined) && conclusion.confidence !== null && conclusion.confidence !== undefined) {
    return `confidence ${conclusion.confidence} reported by Honcho · ${evidenceLabel} · ${updated}`;
  }
  return `confidence unavailable (${conclusion.confidence_reason || 'not reported'}) · ${evidenceLabel} · ${updated}`;
}

const PRIVATE_TEXT_PATTERNS = [
  /\b(?:HONCHO_BASE_URL|HONCHO_API_KEY|API[_-]?KEY|TOKEN|SECRET)\s*[:=]\s*[^\s,;)}\]]+/gi,
  /\b(?:api[_-]?key|token|secret)\s+[A-Za-z0-9._~+\/-]{8,}/gi,
  /\bBearer\s+[A-Za-z0-9._~+\/-]{20,}/gi,
  /\b(?:sk|pk|ghp|gho|github_pat|hf)_[A-Za-z0-9_\-]{16,}/gi,
  /https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?::\d+)?(?:\/[^\s<>'"]*)?/gi,
  /\b(?:localhost|127\.0\.0\.1|0\.0\.0\.0|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?::\d+)?\b/gi,
  /\/(?:root|home|Users|etc|var|usr|opt)(?:\/[A-Za-z0-9._-]+){1,}(?:\.[A-Za-z0-9._-]+)?/g,
  /\b(?:private operator|operator note|local network|Proxmox|LXC|CT\d{2,4}|root@[A-Za-z0-9._-]+)\b/gi,
  /\b(?:HONCHO_BASE_URL|HONCHO_API_KEY|JWT|raw context JSON)\b/gi
];

export const LIVE_MESSAGE_BODY_REDACTION = '[redacted: live message body hidden in public/unauthenticated mode]';
export const LIVE_MEMORY_TEXT_REDACTION = '[redacted: live memory text hidden in public/unauthenticated mode]';

export function sanitizePublicText(value = '') {
  let sanitized = String(value);
  for (const pattern of PRIVATE_TEXT_PATTERNS) sanitized = sanitized.replace(pattern, ' [redacted]');
  return sanitized.replace(/\s{2,}/g, ' ').trim();
}

export function sanitizePublicValue(value) {
  if (typeof value === 'string') return sanitizePublicText(value);
  if (Array.isArray(value)) return value.map((item) => sanitizePublicValue(item));
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => String(key).toLowerCase() !== 'raw')
    .map(([key, item]) => [key, sanitizePublicValue(item)]));
}

export function templateEndpointPath(path = '') {
  const value = String(path || 'unknown');
  return value
    .replace(/\/v3\/workspaces\/[^/\s?#]+/g, '/v3/workspaces/{workspace}')
    .replace(/\/sessions\/(?!list(?:[/?#]|$))[^/\s?#]+/g, '/sessions/{session}')
    .replace(/\/peers\/(?!list(?:[/?#]|$))[^/\s?#]+/g, '/peers/{peer}')
    .replace(/\/messages\/(?!list(?:[/?#]|$))[^/\s?#]+/g, '/messages/{message}')
    .replace(/\/conclusions\/(?!list(?:[/?#]|$))[^/\s?#]+/g, '/conclusions/{conclusion}');
}

function safeWorkspace(workspace = {}) {
  const id = workspace.id || workspace.workspace_id || '';
  return {
    id,
    workspace_id: workspace.workspace_id || id,
    name: workspace.name || id || 'workspace',
    status: workspace.status || 'live-summary',
    summary: 'Live workspace details are hidden in public/unauthenticated mode.'
  };
}

function safePeer(peer = {}) {
  const meta = peer.metadata || {};
  return {
    id: peer.id || peer.peer_id || peer.name || 'peer',
    peer_id: peer.peer_id || peer.id || '',
    name: peer.name || meta.name || peer.id || peer.peer_id || 'peer',
    workspace_id: peer.workspace_id || '',
    status: peer.status || meta.status || 'live-summary',
    metadata: {
      type: meta.type,
      kind: meta.kind,
      role: meta.role,
      team: meta.team,
      status: meta.status,
      last_seen: meta.last_seen,
      capabilities: Array.isArray(meta.capabilities) ? meta.capabilities : undefined
    }
  };
}

function safeSession(session = {}) {
  return {
    id: session.id || session.session_id || 'session',
    session_id: session.session_id || session.id || '',
    workspace_id: session.workspace_id || '',
    peer_id: session.peer_id || '',
    title: 'Live session details hidden in public/unauthenticated mode',
    status: session.status || 'available',
    message_count: session.message_count ?? null,
    message_count_source: session.message_count_source || 'unknown',
    updated_at: session.updated_at || session.created_at || ''
  };
}

function safeMessage(message = {}) {
  return {
    id: message.id || message.message_id || 'message',
    workspace_id: message.workspace_id || '',
    session_id: message.session_id || '',
    role: message.role || message.peer_id || 'message',
    created_at: message.created_at || '',
    content: LIVE_MESSAGE_BODY_REDACTION,
    text: LIVE_MESSAGE_BODY_REDACTION
  };
}

function safeConclusion(conclusion = {}) {
  return {
    id: conclusion.id || conclusion.conclusion_id || 'conclusion',
    workspace_id: conclusion.workspace_id || '',
    text: LIVE_MEMORY_TEXT_REDACTION,
    content: LIVE_MEMORY_TEXT_REDACTION,
    confidence: conclusion.confidence ?? null,
    confidence_status: conclusion.confidence_status || 'unavailable',
    confidence_reason: conclusion.confidence_reason || 'Live memory text hidden in public/unauthenticated mode',
    evidence_count: conclusion.evidence_count ?? null,
    last_updated: conclusion.last_updated || conclusion.updated_at || conclusion.created_at || '',
    provenance: conclusion.provenance ? {
      source: conclusion.provenance.source || 'honcho-conclusion',
      evidence_count: conclusion.provenance.evidence_count ?? conclusion.evidence_count ?? null,
      last_updated: conclusion.provenance.last_updated || conclusion.last_updated || conclusion.updated_at || conclusion.created_at || '',
      confidence_status: conclusion.provenance.confidence_status || conclusion.confidence_status || 'unavailable'
    } : undefined
  };
}

function isProxyResourcePath(path = [], resource = '') {
  const normalized = path.map((part) => String(part || '').trim()).filter(Boolean);
  return normalized.includes(resource);
}

function protectResourceCollectionPayload(payload, mapper) {
  if (Array.isArray(payload)) return sanitizePublicValue(payload.map((item) => mapper(item)));
  if (!payload || typeof payload !== 'object') return sanitizePublicValue(payload);
  const collectionKeys = new Set(['items', 'results', 'data', 'messages', 'conclusions']);
  const hasCollection = Object.entries(payload).some(([key, value]) => Array.isArray(value) && collectionKeys.has(String(key)));
  if (!hasCollection && (Object.prototype.hasOwnProperty.call(payload, 'content') || Object.prototype.hasOwnProperty.call(payload, 'text'))) return sanitizePublicValue(mapper(payload));
  return sanitizePublicValue(Object.fromEntries(Object.entries(payload)
    .filter(([key]) => String(key).toLowerCase() !== 'raw')
    .map(([key, value]) => [
      key,
      Array.isArray(value) && collectionKeys.has(String(key)) ? value.map((item) => mapper(item)) : value
    ])));
}

export function protectPublicProxyResponse(payload, path = [], viewerContext = {}) {
  if (viewerContext?.authenticatedOperator === true) return sanitizePublicValue(payload);
  if (isProxyResourcePath(path, 'messages')) return protectResourceCollectionPayload(payload, safeMessage);
  if (isProxyResourcePath(path, 'conclusions')) return protectResourceCollectionPayload(payload, safeConclusion);
  return sanitizePublicValue(payload);
}

export function protectUnauthenticatedLiveSnapshot(snapshot = {}) {
  return sanitizePublicValue({
    ...snapshot,
    readOnly: true,
    workspaces: asArray(snapshot.workspaces).map(safeWorkspace),
    peers: asArray(snapshot.peers).map(safePeer),
    sessions: asArray(snapshot.sessions).map(safeSession),
    messages: asArray(snapshot.messages).map(safeMessage),
    conclusions: asArray(snapshot.conclusions).map(safeConclusion)
  });
}

function compactWorkspace(workspace = {}) {
  return {
    id: workspace.id || workspace.workspace_id || '',
    workspace_id: workspace.workspace_id || workspace.id || '',
    name: workspace.name || workspace.id || workspace.workspace_id || 'workspace',
    status: workspace.status || 'available',
    summary: workspace.summary || 'Workspace summary unavailable.'
  };
}

function compactPeer(peer = {}) {
  const meta = peer.metadata || {};
  return {
    id: peer.id || peer.peer_id || peer.name || 'peer',
    peer_id: peer.peer_id || peer.id || '',
    name: peer.name || meta.name || peer.id || peer.peer_id || 'peer',
    workspace_id: peer.workspace_id || '',
    status: peer.status || meta.status || 'unknown',
    metadata: {
      type: meta.type,
      kind: meta.kind,
      role: meta.role,
      team: meta.team,
      status: meta.status,
      last_seen: meta.last_seen,
      capabilities: Array.isArray(meta.capabilities) ? meta.capabilities.slice(0, 8) : undefined
    }
  };
}

function compactSession(session = {}) {
  return {
    id: session.id || session.session_id || 'session',
    session_id: session.session_id || session.id || '',
    workspace_id: session.workspace_id || '',
    peer_id: session.peer_id || '',
    title: session.title || 'Session summary unavailable',
    status: session.status || 'unknown',
    message_count: session.message_count ?? null,
    message_count_source: session.message_count_source || 'unknown',
    updated_at: session.updated_at || session.created_at || ''
  };
}

function compactMessage(message = {}) {
  return {
    id: message.id || message.message_id || 'message',
    workspace_id: message.workspace_id || '',
    session_id: message.session_id || '',
    role: message.role || message.peer_id || 'message',
    created_at: message.created_at || '',
    content: message.content || message.text || ''
  };
}

function compactConclusion(conclusion = {}) {
  return {
    id: conclusion.id || conclusion.conclusion_id || 'conclusion',
    workspace_id: conclusion.workspace_id || '',
    text: conclusion.text || conclusion.content || '',
    content: conclusion.content || conclusion.text || '',
    confidence: conclusion.confidence ?? null,
    confidence_status: conclusion.confidence_status || 'unavailable',
    confidence_reason: conclusion.confidence_reason || '',
    evidence_count: conclusion.evidence_count ?? null,
    last_updated: conclusion.last_updated || conclusion.updated_at || conclusion.created_at || '',
    provenance: conclusion.provenance ? {
      source: conclusion.provenance.source || 'honcho-conclusion',
      evidence_count: conclusion.provenance.evidence_count ?? conclusion.evidence_count ?? null,
      last_updated: conclusion.provenance.last_updated || conclusion.last_updated || conclusion.updated_at || conclusion.created_at || '',
      confidence_status: conclusion.provenance.confidence_status || conclusion.confidence_status || 'unavailable'
    } : undefined
  };
}

function compactKanban(kanban = null, { includeAgents = false } = {}) {
  if (!kanban || typeof kanban !== 'object') return kanban;
  return {
    available: kanban.available,
    state: kanban.state,
    source: kanban.source,
    generated_at: kanban.generated_at,
    freshness: kanban.freshness,
    snapshot: kanban.snapshot,
    sources: asArray(kanban.sources).slice(0, 3),
    agents: includeAgents ? asArray(kanban.agents).slice(0, 50).map((agent) => ({
      id: agent.id,
      profile: agent.profile,
      status: agent.status,
      status_source: agent.status_source,
      heartbeat: agent.heartbeat,
      heartbeat_at: agent.heartbeat_at,
      heartbeat_source: agent.heartbeat_source,
      last_seen: agent.last_seen,
      last_activity_at: agent.last_activity_at,
      last_activity_source: agent.last_activity_source,
      current_goal: agent.current_goal,
      current_goal_source: agent.current_goal_source,
      assigned_task: agent.assigned_task,
      assigned_task_source: agent.assigned_task_source,
      task_status: agent.task_status,
      task_status_source: agent.task_status_source,
      recent_tasks: asArray(agent.recent_tasks).slice(0, 3)
    })) : []
  };
}

function baseRouteSnapshot(snapshot = {}) {
  return {
    source: snapshot.source,
    readOnly: snapshot.readOnly,
    env: snapshot.env || {},
    status: snapshot.status || { ok: false },
    mode: snapshot.mode,
    generated_at: snapshot.generated_at,
    workspaces: [],
    peers: [],
    sessions: [],
    messages: [],
    conclusions: [],
    kanban: compactKanban(snapshot.kanban, { includeAgents: false }),
    webhooks: [],
    performance: null,
    context_summary: null
  };
}

export function createRouteScopedSnapshot(snapshot = {}, route = 'summary') {
  const scoped = baseRouteSnapshot(snapshot);
  const routeKey = String(route || 'summary').replace(/^\//, '').split('/')[0] || 'home';
  const workspaces = asArray(snapshot.workspaces).map(compactWorkspace);
  const peers = asArray(snapshot.peers).map(compactPeer);
  const sessions = asArray(snapshot.sessions).map(compactSession);
  const messages = asArray(snapshot.messages).map(compactMessage);
  const conclusions = asArray(snapshot.conclusions).map(compactConclusion);

  if (routeKey === 'home' || routeKey === 'dashboard') {
    scoped.workspaces = workspaces;
    scoped.peers = peers;
    scoped.sessions = sessions;
    scoped.conclusions = routeKey === 'home' ? conclusions.map((conclusion) => ({ id: conclusion.id, workspace_id: conclusion.workspace_id })) : [];
    scoped.messages = routeKey === 'dashboard' ? messages.slice(0, 5) : [];
    scoped.kanban = compactKanban(snapshot.kanban, { includeAgents: true });
    scoped.performance = routeKey === 'home' ? snapshot.performance : null;
  } else if (routeKey === 'agents') {
    scoped.peers = peers;
    scoped.kanban = compactKanban(snapshot.kanban, { includeAgents: true });
  } else if (routeKey === 'workspaces') {
    scoped.workspaces = workspaces;
  } else if (routeKey === 'workspace-detail') {
    scoped.workspaces = workspaces;
    scoped.peers = peers;
    scoped.sessions = sessions;
  } else if (routeKey === 'peers' || routeKey === 'peer-detail') {
    scoped.workspaces = workspaces;
    scoped.peers = peers;
  } else if (routeKey === 'sessions') {
    scoped.workspaces = workspaces;
    scoped.sessions = sessions;
  } else if (routeKey === 'session-detail') {
    scoped.sessions = sessions;
    scoped.messages = messages.slice(0, 50);
  } else if (routeKey === 'messages') {
    scoped.messages = messages.slice(0, 50);
  } else if (routeKey === 'conclusions') {
    scoped.conclusions = conclusions.slice(0, 50);
  } else if (routeKey === 'context') {
    const agents = discoverAgents(peers, snapshot.kanban);
    scoped.context_summary = {
      data_minimized: true,
      note: 'Unauthenticated context view intentionally exposes counts and aggregate states only. Raw workspace/session/message identifiers and nested agent structures are hidden.',
      workspace_count: workspaces.length,
      agent_count: agents.length,
      recent_message_count: messages.length,
      conclusion_count: conclusions.length,
      kanban_state: snapshot.kanban?.state || 'unknown',
      source: snapshot.source || 'unknown',
      agent_statuses: agents.slice(0, 20).map((agent) => ({
        label: agent.name || 'Agent',
        status: agent.status || 'unknown',
        role: agent.role || 'agent',
        team: agent.team || 'unknown',
        current_goal_source: agent.current_goal_source || 'not-reported',
        assigned_task_source: agent.assigned_task_source || 'not-reported'
      }))
    };
    scoped.kanban = compactKanban(snapshot.kanban, { includeAgents: false });
  } else if (routeKey === 'performance') {
    scoped.performance = snapshot.performance || null;
  } else if (routeKey === 'webhooks') {
    scoped.webhooks = asArray(snapshot.webhooks).slice(0, 20);
  }

  return sanitizePublicValue(scoped);
}
export function normalizeV3Session(session = {}, workspaceId = '', messages = []) {
  const metadata = session.metadata || {};
  const explicitCount = [session.message_count, session.messages_count, session.total_messages, metadata.message_count]
    .find((value) => Number.isFinite(Number(value)));
  const loadedMessageCount = asArray(messages).length;
  const isActive = session.is_active;
  return {
    ...session,
    id: session.id || session.session_id,
    workspace_id: session.workspace_id || workspaceId,
    peer_id: session.peer_id || metadata.peer_id || metadata.peer || '',
    title: session.title || metadata.title || metadata.name || session.id || session.session_id,
    status: typeof isActive === 'boolean' ? (isActive ? 'active' : 'inactive') : (session.status || metadata.status || 'available'),
    message_count: explicitCount === undefined ? loadedMessageCount : Number(explicitCount),
    message_count_source: explicitCount === undefined ? (loadedMessageCount ? 'derived' : 'unknown') : 'api',
    updated_at: session.updated_at || session.created_at || metadata.updated_at || ''
  };
}
export function getPerformanceMetricConfig(data = []) {
  const sample = asArray(data).find((point) => point && typeof point === 'object') || {};
  if (Object.prototype.hasOwnProperty.call(sample, 'pending_work_units')) return { key: 'pending_work_units', label: 'Pending work units', unit: 'work units' };
  if (Object.prototype.hasOwnProperty.call(sample, 'completed_work_units')) return { key: 'completed_work_units', label: 'Completed work units', unit: 'work units' };
  if (Object.prototype.hasOwnProperty.call(sample, 'total_work_units')) return { key: 'total_work_units', label: 'Total work units', unit: 'work units' };
  if (Object.prototype.hasOwnProperty.call(sample, 'avg_latency_ms')) return { key: 'avg_latency_ms', label: 'Live average latency (ms)', unit: 'ms' };
  if (Object.prototype.hasOwnProperty.call(sample, 'latency_ms')) return { key: 'latency_ms', label: 'Demo latency (ms)', unit: 'ms' };
  return { key: 'value', label: 'Metric value', unit: '' };
}

const PERFORMANCE_HISTORY_LIMIT = 60;
let performanceTelemetryHistory = [];

export function resetPerformanceTelemetryHistory() {
  performanceTelemetryHistory = [];
}

function labelForTimestamp(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value || 'sample');
  return parsed.toISOString().slice(11, 19);
}

function aggregateTelemetrySample({ records = [], generatedAt = new Date().toISOString(), source = 'unknown' } = {}) {
  const requestRecords = asArray(records).filter((record) => record && typeof record === 'object');
  if (!requestRecords.length) return null;
  const latencyValues = requestRecords.map((record) => Number(record.latency_ms)).filter(Number.isFinite);
  const failedRecords = requestRecords.filter((record) => record.ok === false || Number(record.status) >= 400 || record.error);
  return {
    label: labelForTimestamp(generatedAt),
    observed_at: generatedAt,
    source: String(source || 'unknown').startsWith('live') ? source : 'unknown',
    request_count: requestRecords.length,
    succeeded_count: requestRecords.length - failedRecords.length,
    failed_count: failedRecords.length,
    avg_latency_ms: latencyValues.length ? roundNumber(latencyValues.reduce((sum, value) => sum + value, 0) / latencyValues.length) : null,
    max_latency_ms: latencyValues.length ? Math.max(...latencyValues) : null
  };
}

function recordPerformanceTelemetryHistory({ records = [], generatedAt = new Date().toISOString(), source = 'unknown' } = {}) {
  const sample = aggregateTelemetrySample({ records, generatedAt, source });
  if (!sample) return performanceTelemetryHistory.slice();
  performanceTelemetryHistory = [...performanceTelemetryHistory, sample].slice(-PERFORMANCE_HISTORY_LIMIT);
  return performanceTelemetryHistory.slice();
}

function getPerformanceHistoryMetadata(timeseries = [], source = 'unknown') {
  const points = asArray(timeseries);
  const minimumSamples = 1;
  return {
    available: points.length >= minimumSamples,
    source: points.length ? 'live-aggregate-ring-buffer' : 'unavailable',
    sample_count: points.length,
    minimum_samples: minimumSamples,
    reason: points.length >= minimumSamples ? null : 'insufficient-samples',
    detail: points.length >= minimumSamples
      ? 'Live trend uses sanitized aggregate dashboard-to-Honcho request samples from this server process.'
      : `Need ${minimumSamples} aggregate sample; currently ${points.length}/${minimumSamples}. Visit live Honcho routes and refresh to add samples.`,
    telemetry_source: source
  };
}

function roundNumber(value) {
  return Math.round(Number(value) * 100) / 100;
}

function freshnessState(generatedAt, latestObservedAt) {
  const generatedMs = Date.parse(generatedAt || '');
  const observedMs = Date.parse((latestObservedAt || generatedAt) || '');
  if (!Number.isFinite(generatedMs) || !Number.isFinite(observedMs)) return 'unknown';
  const ageSeconds = Math.max(0, Math.round((generatedMs - observedMs) / 1000));
  if (ageSeconds <= 120) return 'live';
  if (ageSeconds <= 900) return 'stale';
  return 'unknown';
}

export function summarizePerformanceTelemetry({ records = [], generatedAt = new Date().toISOString(), source = 'unknown', timeseries = [] } = {}) {
  const requestRecords = asArray(records).filter((record) => record && typeof record === 'object');
  const explicitTimeseries = asArray(timeseries);
  const derivedTimeseries = explicitTimeseries.length ? explicitTimeseries : (String(source || '').startsWith('live') ? recordPerformanceTelemetryHistory({ records: requestRecords, generatedAt, source }) : []);
  const latencyValues = requestRecords.map((record) => Number(record.latency_ms)).filter(Number.isFinite);
  const failedRecords = requestRecords.filter((record) => record.ok === false || Number(record.status) >= 400 || record.error);
  const latestObservedAt = requestRecords
    .map((record) => record.observed_at)
    .filter(Boolean)
    .sort()
    .at(-1) || generatedAt;
  const state = requestRecords.length === 0 ? 'unknown' : (failedRecords.length ? 'degraded' : 'healthy');
  const avgLatency = latencyValues.length ? roundNumber(latencyValues.reduce((sum, value) => sum + value, 0) / latencyValues.length) : null;
  const maxLatency = latencyValues.length ? Math.max(...latencyValues) : null;

  return {
    health: {
      state,
      label: state === 'healthy' ? 'Healthy' : (state === 'degraded' ? 'Degraded' : 'Unknown'),
      source,
      message: state === 'healthy'
        ? 'All sampled dashboard-to-Honcho requests completed successfully.'
        : (state === 'degraded' ? 'One or more sampled Honcho requests failed; inspect errors and slow endpoints.' : 'No live request telemetry has been captured yet.')
    },
    freshness: {
      generated_at: generatedAt,
      latest_observed_at: latestObservedAt || null,
      state: freshnessState(generatedAt, latestObservedAt)
    },
    requests: {
      total: requestRecords.length,
      succeeded: requestRecords.length - failedRecords.length,
      failed: failedRecords.length
    },
    latency: {
      samples: latencyValues.length,
      avg_ms: avgLatency,
      max_ms: maxLatency
    },
    errors: {
      total: failedRecords.length,
      recent: failedRecords.slice(-5).map((record) => ({ path: templateEndpointPath(record.path || 'unknown'), status: record.status ?? 0, error: record.error || 'http-' + record.status, observed_at: record.observed_at || generatedAt }))
    },
    slow_endpoints: requestRecords
      .filter((record) => Number.isFinite(Number(record.latency_ms)))
      .sort((a, b) => Number(b.latency_ms) - Number(a.latency_ms))
      .slice(0, 5)
      .map((record) => ({ path: templateEndpointPath(record.path || 'unknown'), latency_ms: Number(record.latency_ms), status: record.status ?? 0, ok: record.ok !== false })),
    timeseries: derivedTimeseries,
    history: explicitTimeseries.length
      ? { available: true, source: 'provided-timeseries', sample_count: explicitTimeseries.length, reason: null, detail: 'Timeseries was provided by the snapshot source.', telemetry_source: source }
      : getPerformanceHistoryMetadata(derivedTimeseries, source)
  };
}
function flatten(value) {
  if (value === null || value === undefined) return '';
  if (typeof value !== 'object') return String(value);
  return Object.values(value).map(flatten).join(' ');
}
export function filterCollection(items, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return items;
  return asArray(items).filter((item) => flatten(item).toLowerCase().includes(q));
}
function isExplicitAgent(meta = {}) {
  return meta.type === 'agent' || meta.kind === 'agent' || meta.role === 'agent' || meta.agent === true;
}

function isHermesAgentPeer(peer = {}) {
  const id = String(peer.id || peer.peer_id || peer.name || '').toLowerCase();
  if (!id || id === 'user') return false;
  return id === 'hermes' || id.startsWith('hermes-');
}

function humanizeAgentName(peer = {}) {
  const meta = peer.metadata || {};
  const raw = peer.name || meta.name || peer.id || peer.peer_id || 'Unknown agent';
  const withoutPrefix = String(raw).replace(/^hermes[-_]?/i, '') || 'Hermes';
  return withoutPrefix
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function getPeerDiscoveryFailure(snapshot = {}) {
  const failures = asArray(snapshot.status?.failures);
  return failures.find((failure) => String(failure?.path || '').includes('/peers/list')) || null;
}

export function getSubsystemStatuses(snapshot = {}) {
  const source = String(snapshot.source || snapshot.mode || 'unknown');
  const honchoDegraded = source.includes('partial') || snapshot.status?.ok === false;
  const honchoState = source === 'demo' ? 'demo' : (honchoDegraded ? 'degraded' : (source.startsWith('live') && snapshot.status?.ok ? 'healthy' : 'unknown'));
  const kanbanState = snapshot.kanban?.available === false ? 'degraded' : (snapshot.kanban?.state || 'unknown');
  const freshnessState = snapshot.performance?.freshness?.state || snapshot.kanban?.freshness?.state || 'unknown';
  const gatewayState = kanbanState === 'degraded' ? 'unknown' : (['available', 'empty'].includes(kanbanState) ? 'observable' : 'unknown');
  const browserState = freshnessState === 'live' ? 'fresh' : (freshnessState === 'stale' ? 'stale' : 'unknown');
  const privacyState = snapshot.env?.liveDataAllowed ? 'operator-live' : 'protected';
  return [
    { id: 'honcho', label: 'Honcho', state: honchoState, detail: honchoDegraded ? 'One or more Honcho reads failed.' : (source === 'demo' ? 'Demo data; live Honcho disabled.' : 'Honcho status reported separately.') },
    { id: 'kanban', label: 'Kanban', state: kanbanState, detail: snapshot.kanban?.source || 'Kanban source not attached.' },
    { id: 'gateway-dispatcher', label: 'Gateway/dispatcher', state: gatewayState, detail: 'Derived from safe Kanban runtime signals only.' },
    { id: 'browser-runtime', label: 'Browser/runtime', state: browserState, detail: freshnessState === 'stale' ? 'Refresh/polling should update stale server-rendered data.' : 'Client refresh hook polls dynamic pages.' },
    { id: 'public-privacy', label: 'Public privacy', state: privacyState, detail: snapshot.env?.liveDataAllowed ? 'Live public data explicitly enabled server-side.' : 'Fail-closed demo/redacted mode.' }
  ];
}

export function getSnapshotPosture(snapshot = {}) {
  const failures = asArray(snapshot.status?.failures);
  const source = String(snapshot.source || snapshot.mode || 'loading');
  const isLive = source.startsWith('live');
  const isDegraded = source.includes('partial') || snapshot.status?.ok === false;
  if (isDegraded) {
    const failureCount = failures.length;
    const failedChecks = `${failureCount || 'one or more'} upstream check${failureCount === 1 ? '' : 's'} failed`;
    const peerFailure = getPeerDiscoveryFailure(snapshot);
    return {
      label: isLive ? 'Live but degraded' : 'Degraded',
      tone: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
      summary: `${failedChecks}. Some live panels may be incomplete; no missing data is inferred.`,
      nextAction: peerFailure ? 'Open Agents to inspect peer discovery details, then verify Honcho URL, workspace, API key, and network path.' : 'Open Settings and API playground to inspect the failing upstream check.'
    };
  }
  if (isLive && snapshot.status?.ok) {
    return {
      label: 'Honcho live OK',
      tone: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200',
      summary: 'Honcho API is reachable; Kanban, browser refresh, gateway/dispatcher, and privacy posture are reported separately.',
      nextAction: 'Review Agents and subsystem badges to confirm the expected Kanban source, sessions, and conclusions are visible.'
    };
  }
  if (source === 'demo') {
    return {
      label: 'Demo mode',
      tone: 'border-sky-400/30 bg-sky-500/10 text-sky-200',
      summary: 'The dashboard is using bundled sample data; it is safe to explore but not connected to your Honcho service.',
      nextAction: 'Connect live Honcho by setting server-side environment variables, then enable live public data intentionally.'
    };
  }
  return {
    label: 'Loading',
    tone: 'border-slate-400/30 bg-slate-500/10 text-slate-200',
    summary: 'Dashboard data has not finished loading yet.',
    nextAction: 'Refresh once the server has completed the Honcho snapshot request.'
  };
}

export function getSessionMessageCountLabel(session = {}) {
  const count = Number(session.message_count);
  if (!Number.isFinite(count) || session.message_count_source === 'unknown') return 'message count unavailable (Honcho did not report it)';
  const noun = count === 1 ? 'message' : 'messages';
  if (session.message_count_source === 'derived') return `${count} ${noun} (derived from loaded messages)`;
  return `${count} ${noun} (reported by Honcho)`;
}

export function getAgentActivityLabel(agent = {}) {
  if (agent.heartbeat) return `Heartbeat timestamp: ${agent.heartbeat}`;
  if (agent.last_activity_at) return `Last activity timestamp: ${agent.last_activity_at}`;
  if (agent.last_seen) return `Last activity timestamp: ${agent.last_seen}`;
  return 'Activity unknown: Kanban and Honcho did not report a safe timestamp.';
}

function peerIdForRuntimeAgent(agent = {}) {
  return String(agent.id || (agent.profile ? `hermes-${agent.profile}` : '')).toLowerCase();
}

function normalizeKanbanRuntimeAgents(kanbanRuntime = null) {
  if (!kanbanRuntime || kanbanRuntime.available === false) return [];
  return asArray(kanbanRuntime.agents).filter((agent) => agent && typeof agent === 'object');
}

function fallbackSource(value, source, fallback = 'fallback-not-reported') {
  return value ? (source || 'honcho-peer-enrichment') : fallback;
}

function agentFromPeer(peer = {}, runtimeById = new Map(), runtimeAvailable = false) {
  const meta = peer.metadata || {};
  const id = peer.id || peer.peer_id || peer.name || 'unknown-agent';
  const inferredHermes = isHermesAgentPeer(peer) && !isExplicitAgent(meta);
  const runtime = runtimeById.get(String(id).toLowerCase()) || null;
  const currentGoal = runtime?.current_goal || meta.current_goal || '';
  const assignedTask = runtime?.assigned_task || meta.assigned_task || '';
  const heartbeat = runtime?.heartbeat || runtime?.heartbeat_at || '';
  const lastSeen = runtime?.last_activity_at || runtime?.last_seen || meta.last_seen || peer.last_seen || peer.updated_at || peer.created_at || '';
  return {
    id,
    name: peer.name || meta.name || runtime?.profile || (inferredHermes ? humanizeAgentName(peer) : (peer.id || peer.peer_id || 'Unknown agent')),
    role: meta.role || (inferredHermes || runtime ? 'Hermes agent' : 'agent'),
    team: meta.team || (inferredHermes || runtime ? 'hermes' : 'unassigned'),
    status: runtime?.status || meta.status || peer.status || (inferredHermes ? (runtimeAvailable ? 'unknown' : 'discovered') : 'unknown'),
    status_source: runtime?.status_source || fallbackSource(meta.status || peer.status, 'honcho-peer-enrichment', inferredHermes ? (runtimeAvailable ? 'kanban-no-current-task' : 'static-hermes-peer-fallback') : 'fallback-not-reported'),
    heartbeat,
    heartbeat_at: heartbeat,
    heartbeat_source: runtime?.heartbeat_source || fallbackSource(meta.heartbeat, 'honcho-peer-enrichment'),
    last_seen: lastSeen,
    last_activity_at: lastSeen,
    last_activity_source: runtime?.last_activity_source || fallbackSource(lastSeen, meta.last_seen || peer.last_seen || peer.updated_at || peer.created_at ? 'honcho-peer-enrichment' : ''),
    current_goal: currentGoal,
    current_goal_source: runtime?.current_goal_source || fallbackSource(meta.current_goal, 'honcho-peer-enrichment'),
    assigned_task: assignedTask,
    assigned_task_source: runtime?.assigned_task_source || fallbackSource(meta.assigned_task, 'honcho-peer-enrichment'),
    task_status: runtime?.task_status || '',
    task_status_source: runtime?.task_status_source || fallbackSource(runtime?.task_status, runtime?.task_status_source),
    recent_tasks: asArray(runtime?.recent_tasks),
    metadata_source: Object.keys(meta).length ? 'honcho-peer-enrichment' : (runtime ? 'kanban-runtime' : 'fallback'),
    capabilities: Array.isArray(meta.capabilities) ? meta.capabilities : [],
    inferred: inferredHermes,
    raw: peer
  };
}

function agentFromRuntime(runtime = {}) {
  return {
    id: runtime.id,
    name: runtime.profile ? humanizeAgentName({ id: runtime.id || `hermes-${runtime.profile}` }) : (runtime.id || 'Unknown agent'),
    role: 'Hermes agent',
    team: 'hermes',
    status: runtime.status || 'unknown',
    status_source: runtime.status_source || 'kanban-task-runtime',
    heartbeat: runtime.heartbeat || runtime.heartbeat_at || '',
    heartbeat_at: runtime.heartbeat_at || runtime.heartbeat || '',
    heartbeat_source: runtime.heartbeat_source || 'fallback-not-reported',
    last_seen: runtime.last_activity_at || runtime.last_seen || '',
    last_activity_at: runtime.last_activity_at || runtime.last_seen || '',
    last_activity_source: runtime.last_activity_source || 'fallback-not-reported',
    current_goal: runtime.current_goal || '',
    current_goal_source: runtime.current_goal_source || 'fallback-not-reported',
    assigned_task: runtime.assigned_task || '',
    assigned_task_source: runtime.assigned_task_source || 'fallback-not-reported',
    task_status: runtime.task_status || '',
    task_status_source: runtime.task_status_source || 'fallback-not-reported',
    recent_tasks: asArray(runtime.recent_tasks),
    metadata_source: 'kanban-runtime',
    capabilities: [],
    inferred: false,
    raw: {}
  };
}

export function discoverAgents(peers = [], kanbanRuntime = null) {
  const runtimeAgents = normalizeKanbanRuntimeAgents(kanbanRuntime);
  const runtimeById = new Map(runtimeAgents.map((agent) => [peerIdForRuntimeAgent(agent), agent]));
  const peerAgents = asArray(peers)
    .filter((peer) => {
      const meta = peer?.metadata || {};
      return isExplicitAgent(meta) || isHermesAgentPeer(peer) || runtimeById.has(String(peer?.id || peer?.peer_id || peer?.name || '').toLowerCase());
    })
    .map((peer) => agentFromPeer(peer, runtimeById, runtimeAgents.length > 0));
  const seen = new Set(peerAgents.map((agent) => String(agent.id).toLowerCase()));
  const runtimeOnlyAgents = runtimeAgents
    .filter((agent) => !seen.has(peerIdForRuntimeAgent(agent)))
    .map(agentFromRuntime);
  return [...peerAgents, ...runtimeOnlyAgents];
}
export function statusTone(status = '') {
  const s = String(status).toLowerCase();
  if (['online', 'healthy', 'active', 'ready'].includes(s)) return 'text-emerald-300 bg-emerald-500/10 border-emerald-400/30';
  if (['degraded', 'busy', 'stale', 'warning'].includes(s)) return 'text-amber-300 bg-amber-500/10 border-amber-400/30';
  if (['offline', 'failed', 'error'].includes(s)) return 'text-rose-300 bg-rose-500/10 border-rose-400/30';
  return 'text-slate-300 bg-slate-500/10 border-slate-400/20';
}
