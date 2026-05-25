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
  /(?:^|\s)(?:\/[A-Za-z0-9._-]+){2,}(?:\.[A-Za-z0-9._-]+)?/g,
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
  const isActive = session.is_active;
  return {
    ...session,
    id: session.id || session.session_id,
    workspace_id: session.workspace_id || workspaceId,
    peer_id: session.peer_id || metadata.peer_id || metadata.peer || '',
    title: session.title || metadata.title || metadata.name || session.id || session.session_id,
    status: typeof isActive === 'boolean' ? (isActive ? 'active' : 'inactive') : (session.status || metadata.status || 'available'),
    message_count: explicitCount === undefined ? asArray(messages).length : Number(explicitCount),
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
