import { getDashboardEnv, getPublicDashboardEnv } from './env.js';
import { getDemoSnapshot } from './demo-data.js';
import { normalizeCollection, normalizeV3Message, normalizeV3Session, sanitizePublicValue } from './data-utils.js';

const TIMEOUT_MS = 8000;

function jsonBody(body = {}) {
  return { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) };
}

async function fetchJson(path, options = {}) {
  const env = getDashboardEnv();
  const url = new URL(path.replace(/^\//, ''), env.HONCHO_BASE_URL.endsWith('/') ? env.HONCHO_BASE_URL : env.HONCHO_BASE_URL + '/');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || TIMEOUT_MS);
  try {
    const headers = { accept: 'application/json', ...(options.headers || {}) };
    if (env.HONCHO_API_KEY) headers.authorization = 'Bearer ' + env.HONCHO_API_KEY;
    const response = await fetch(url, { ...options, headers, signal: controller.signal, cache: 'no-store' });
    const text = await response.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { return { ok: false, status: response.status, error: 'malformed-json', data: null, path }; }
    if (!response.ok) return { ok: false, status: response.status, error: response.status === 401 || response.status === 403 ? 'auth' : 'http-' + response.status, data: json, path };
    return { ok: true, status: response.status, error: null, data: json, path };
  } catch (error) {
    return { ok: false, status: 0, error: error?.name === 'AbortError' ? 'timeout' : 'offline', data: null, path };
  } finally { clearTimeout(timeout); }
}

async function tryCollection(path, keys, options = {}) {
  const result = await fetchJson(path, options);
  return { ...result, items: result.ok ? normalizeCollection(result.data, keys) : [] };
}

async function listV3(path, keys, body = {}) {
  return tryCollection(path, keys, jsonBody(body));
}

async function buildWorkspaceSnapshot(workspaceId, failures) {
  const [peers, rawSessions, conclusions] = await Promise.all([
    listV3(`/v3/workspaces/${workspaceId}/peers/list`, ['peers']),
    listV3(`/v3/workspaces/${workspaceId}/sessions/list`, ['sessions']),
    listV3(`/v3/workspaces/${workspaceId}/conclusions/list`, ['conclusions'])
  ]);
  failures.push(...[peers, rawSessions, conclusions].filter((r) => !r.ok));

  const messagePages = await Promise.all(rawSessions.items.map((session) => (
    listV3(`/v3/workspaces/${workspaceId}/sessions/${session.id || session.session_id}/messages/list`, ['messages'])
  )));
  failures.push(...messagePages.filter((r) => !r.ok));

  const messagesBySession = new Map();
  for (let index = 0; index < rawSessions.items.length; index += 1) {
    const session = rawSessions.items[index];
    const sessionId = session.id || session.session_id;
    const page = messagePages[index];
    const messages = page.items.map((message) => normalizeV3Message(message, workspaceId, sessionId));
    messagesBySession.set(sessionId, messages);
  }

  const sessions = rawSessions.items.map((session) => {
    const sessionId = session.id || session.session_id;
    return normalizeV3Session(session, workspaceId, messagesBySession.get(sessionId) || []);
  });
  const messages = Array.from(messagesBySession.values()).flat();

  return {
    peers: peers.items.map((peer) => ({ ...peer, workspace_id: peer.workspace_id || workspaceId })),
    sessions,
    messages,
    conclusions: conclusions.items.map((conclusion) => ({ ...conclusion, workspace_id: conclusion.workspace_id || workspaceId }))
  };
}

export async function getHonchoSnapshot() {
  const env = getDashboardEnv();
  const publicEnv = getPublicDashboardEnv();
  if (env.USE_DEMO_DATA || !env.ALLOW_LIVE_PUBLIC_DATA) return { source: 'demo', readOnly: !env.ENABLE_MUTATIONS, env: publicEnv, status: { ok: true }, ...getDemoSnapshot() };

  const failures = [];
  let workspaces = [];
  if (env.HONCHO_WORKSPACE_ID) {
    workspaces = [{ id: env.HONCHO_WORKSPACE_ID, workspace_id: env.HONCHO_WORKSPACE_ID, name: env.HONCHO_WORKSPACE_ID }];
  } else {
    const workspacePage = await listV3('/v3/workspaces/list', ['workspaces']);
    failures.push(...(workspacePage.ok ? [] : [workspacePage]));
    workspaces = workspacePage.items;
  }

  const workspaceIds = workspaces.map((workspace) => workspace.id || workspace.workspace_id).filter(Boolean);
  const scopedSnapshots = await Promise.all(workspaceIds.map((workspaceId) => buildWorkspaceSnapshot(workspaceId, failures)));

  return sanitizePublicValue({
    source: failures.length ? 'live-partial' : 'live',
    readOnly: !env.ENABLE_MUTATIONS,
    env: publicEnv,
    status: { ok: failures.length === 0, failures: failures.map((f) => ({ path: f.path, status: f.status, error: f.error })) },
    mode: 'live',
    generated_at: new Date().toISOString(),
    workspaces,
    peers: scopedSnapshots.flatMap((snapshot) => snapshot.peers),
    sessions: scopedSnapshots.flatMap((snapshot) => snapshot.sessions),
    messages: scopedSnapshots.flatMap((snapshot) => snapshot.messages),
    conclusions: scopedSnapshots.flatMap((snapshot) => snapshot.conclusions),
    webhooks: [],
    performance: []
  });
}
export { fetchJson };
