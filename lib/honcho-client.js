import { getDashboardEnv } from './env.js';
import { getDemoSnapshot } from './demo-data.js';
import { normalizeCollection } from './data-utils.js';

const TIMEOUT_MS = 8000;
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
    try { json = text ? JSON.parse(text) : null; } catch { return { ok: false, status: response.status, error: 'malformed-json', data: null }; }
    if (!response.ok) return { ok: false, status: response.status, error: response.status === 401 || response.status === 403 ? 'auth' : 'http-' + response.status, data: json };
    return { ok: true, status: response.status, error: null, data: json };
  } catch (error) {
    return { ok: false, status: 0, error: error?.name === 'AbortError' ? 'timeout' : 'offline', data: null };
  } finally { clearTimeout(timeout); }
}
async function tryCollection(path, keys) {
  const result = await fetchJson(path);
  return { ...result, items: result.ok ? normalizeCollection(result.data, keys) : [] };
}
export async function getHonchoSnapshot() {
  const env = getDashboardEnv();
  if (env.USE_DEMO_DATA) return { source: 'demo', readOnly: !env.ENABLE_MUTATIONS, env, status: { ok: true }, ...getDemoSnapshot() };
  const [workspaces, peers, sessions, messages, conclusions] = await Promise.all([
    tryCollection('/workspaces', ['workspaces']), tryCollection('/peers', ['peers']), tryCollection('/sessions', ['sessions']),
    tryCollection('/messages', ['messages']), tryCollection('/conclusions', ['conclusions'])
  ]);
  const failures = [workspaces, peers, sessions, messages, conclusions].filter((r) => !r.ok);
  return {
    source: failures.length ? 'live-partial' : 'live', readOnly: !env.ENABLE_MUTATIONS, env,
    status: { ok: failures.length === 0, failures: failures.map((f) => ({ status: f.status, error: f.error })) },
    mode: 'live', generated_at: new Date().toISOString(),
    workspaces: workspaces.items, peers: peers.items, sessions: sessions.items, messages: messages.items, conclusions: conclusions.items,
    webhooks: [], performance: []
  };
}
export { fetchJson };
