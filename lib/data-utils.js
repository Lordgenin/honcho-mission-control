export function asArray(value) { return Array.isArray(value) ? value : []; }
export function normalizeCollection(payload, keys = []) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  for (const key of keys) if (Array.isArray(payload[key])) return payload[key];
  for (const key of ['items', 'results', 'data', 'workspaces', 'peers', 'sessions', 'messages', 'conclusions']) if (Array.isArray(payload[key])) return payload[key];
  return [];
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
export function discoverAgents(peers = []) {
  return asArray(peers)
    .filter((peer) => {
      const meta = peer?.metadata || {};
      return meta.type === 'agent' || meta.kind === 'agent' || meta.role === 'agent' || meta.agent === true;
    })
    .map((peer) => ({
      id: peer.id || peer.peer_id || peer.name || 'unknown-agent',
      name: peer.name || peer.id || peer.peer_id || 'Unknown agent',
      role: peer.metadata?.role || 'agent',
      team: peer.metadata?.team || 'unassigned',
      status: peer.metadata?.status || 'unknown',
      heartbeat: peer.metadata?.heartbeat || '',
      last_seen: peer.metadata?.last_seen || peer.last_seen || '',
      current_goal: peer.metadata?.current_goal || '',
      assigned_task: peer.metadata?.assigned_task || '',
      capabilities: Array.isArray(peer.metadata?.capabilities) ? peer.metadata.capabilities : [],
      raw: peer
    }));
}
export function statusTone(status = '') {
  const s = String(status).toLowerCase();
  if (['online', 'healthy', 'active', 'ready'].includes(s)) return 'text-emerald-300 bg-emerald-500/10 border-emerald-400/30';
  if (['degraded', 'busy', 'stale', 'warning'].includes(s)) return 'text-amber-300 bg-amber-500/10 border-amber-400/30';
  if (['offline', 'failed', 'error'].includes(s)) return 'text-rose-300 bg-rose-500/10 border-rose-400/30';
  return 'text-slate-300 bg-slate-500/10 border-slate-400/20';
}
