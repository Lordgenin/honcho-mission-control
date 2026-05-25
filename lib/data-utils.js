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

const PRIVATE_TEXT_PATTERNS = [
  /\b(?:HONCHO_BASE_URL|HONCHO_API_KEY|API[_-]?KEY|TOKEN|SECRET)\s*=\s*[^\s,;)}\]]+/gi,
  /\bBearer\s+[A-Za-z0-9._~+\/-]{20,}/gi,
  /\b(?:sk|pk|ghp|gho|github_pat|hf)_[A-Za-z0-9_\-]{16,}/gi,
  /https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?::\d+)?(?:\/[^\s<>'"]*)?/gi,
  /\b(?:localhost|127\.0\.0\.1|0\.0\.0\.0|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?::\d+)?\b/gi,
  /\/(?:root|home|Users|etc|var|usr|opt)(?:\/[A-Za-z0-9._-]+){1,}(?:\.[A-Za-z0-9._-]+)?/g,
  /\b(?:private operator|operator note|local network|Proxmox|LXC|CT\d{2,4}|root@[A-Za-z0-9._-]+)\b/gi,
  /\b(?:HONCHO_BASE_URL|HONCHO_API_KEY)\b/gi
];

export function sanitizePublicText(value = '') {
  let sanitized = String(value);
  for (const pattern of PRIVATE_TEXT_PATTERNS) sanitized = sanitized.replace(pattern, ' [redacted]');
  return sanitized.replace(/\s{2,}/g, ' ').trim();
}

export function sanitizePublicValue(value) {
  if (typeof value === 'string') return sanitizePublicText(value);
  if (Array.isArray(value)) return value.map((item) => sanitizePublicValue(item));
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitizePublicValue(item)]));
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
  if (Object.prototype.hasOwnProperty.call(sample, 'latency_ms')) return { key: 'latency_ms', label: 'Demo latency (ms)', unit: 'ms' };
  return { key: 'value', label: 'Metric value', unit: '' };
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
      recent: failedRecords.slice(-5).map((record) => ({ path: record.path || 'unknown', status: record.status ?? 0, error: record.error || 'http-' + record.status, observed_at: record.observed_at || generatedAt }))
    },
    slow_endpoints: requestRecords
      .filter((record) => Number.isFinite(Number(record.latency_ms)))
      .sort((a, b) => Number(b.latency_ms) - Number(a.latency_ms))
      .slice(0, 5)
      .map((record) => ({ path: record.path || 'unknown', latency_ms: Number(record.latency_ms), status: record.status ?? 0, ok: record.ok !== false })),
    timeseries: asArray(timeseries)
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
      label: 'Live and healthy',
      tone: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200',
      summary: 'Honcho API is reachable and the dashboard is rendering live data from the server proxy.',
      nextAction: 'Review Agents and Workspaces to confirm the expected peers, sessions, and conclusions are visible.'
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
  if (agent.heartbeat) return `Heartbeat reported: ${agent.heartbeat}`;
  if (agent.last_seen) return `Last activity timestamp: ${agent.last_seen}`;
  return 'Activity unknown: Honcho did not report heartbeat or last_seen.';
}

export function discoverAgents(peers = []) {
  return asArray(peers)
    .filter((peer) => {
      const meta = peer?.metadata || {};
      return isExplicitAgent(meta) || isHermesAgentPeer(peer);
    })
    .map((peer) => {
      const meta = peer.metadata || {};
      const inferredHermes = isHermesAgentPeer(peer) && !isExplicitAgent(meta);
      return {
        id: peer.id || peer.peer_id || peer.name || 'unknown-agent',
        name: peer.name || meta.name || (inferredHermes ? humanizeAgentName(peer) : (peer.id || peer.peer_id || 'Unknown agent')),
        role: meta.role || (inferredHermes ? 'Hermes agent' : 'agent'),
        team: meta.team || (inferredHermes ? 'hermes' : 'unassigned'),
        status: meta.status || peer.status || (inferredHermes ? 'discovered' : 'unknown'),
        heartbeat: meta.heartbeat || '',
        last_seen: meta.last_seen || peer.last_seen || peer.updated_at || peer.created_at || '',
        current_goal: meta.current_goal || '',
        assigned_task: meta.assigned_task || '',
        capabilities: Array.isArray(meta.capabilities) ? meta.capabilities : [],
        inferred: inferredHermes,
        raw: peer
      };
    });
}
export function statusTone(status = '') {
  const s = String(status).toLowerCase();
  if (['online', 'healthy', 'active', 'ready'].includes(s)) return 'text-emerald-300 bg-emerald-500/10 border-emerald-400/30';
  if (['degraded', 'busy', 'stale', 'warning'].includes(s)) return 'text-amber-300 bg-amber-500/10 border-amber-400/30';
  if (['offline', 'failed', 'error'].includes(s)) return 'text-rose-300 bg-rose-500/10 border-rose-400/30';
  return 'text-slate-300 bg-slate-500/10 border-slate-400/20';
}
