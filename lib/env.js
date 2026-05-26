const TRUE_VALUES = new Set(['true', '1', 'yes', 'on']);
export function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return TRUE_VALUES.has(String(value).toLowerCase());
}
export function getDashboardEnv(source = process.env) {
  const env = {
    HONCHO_BASE_URL: source.HONCHO_BASE_URL || 'http://localhost:8000',
    HONCHO_API_KEY: source.HONCHO_API_KEY || '',
    HONCHO_WORKSPACE_ID: source.HONCHO_WORKSPACE_ID || '',
    ENABLE_MUTATIONS: parseBoolean(source.ENABLE_MUTATIONS, false),
    USE_DEMO_DATA: parseBoolean(source.USE_DEMO_DATA, true),
    ALLOW_LIVE_PUBLIC_DATA: parseBoolean(source.ALLOW_LIVE_PUBLIC_DATA, false),
    NEXT_PUBLIC_DASHBOARD_NAME: source.NEXT_PUBLIC_DASHBOARD_NAME || 'Honcho Mission Control'
  };
  Object.defineProperty(env, 'HONCHO_API_KEY', { value: env.HONCHO_API_KEY, enumerable: false });
  return env;
}

function classifyHonchoConnection(rawBaseUrl) {
  let hostname = '';
  try {
    hostname = new URL(rawBaseUrl).hostname.toLowerCase();
  } catch {
    return 'configured server-side';
  }

  if (!hostname) return 'configured server-side';
  return 'server-side connection configured';
}

export function getPublicDashboardEnv(source = process.env) {
  const env = getDashboardEnv(source);
  return {
    liveDataAllowed: env.ALLOW_LIVE_PUBLIC_DATA,
    NEXT_PUBLIC_DASHBOARD_NAME: env.NEXT_PUBLIC_DASHBOARD_NAME,
    honchoConnection: classifyHonchoConnection(env.HONCHO_BASE_URL),
    dataExposure: env.ALLOW_LIVE_PUBLIC_DATA ? 'operator-live-private read-only' : 'public privacy protected',
    demoData: env.USE_DEMO_DATA ? 'SANITIZED DEMO DATA — no live private instance connected' : 'PUBLIC PRIVACY PROTECTED — live memory hidden unless this deployment is privately gated',
    mutations: env.ENABLE_MUTATIONS ? 'operator-mutation-enabled after route review' : 'mutations disabled',
    workspaceScope: env.ALLOW_LIVE_PUBLIC_DATA && env.HONCHO_WORKSPACE_ID ? 'operator-scoped workspace placeholder' : 'public-safe aggregate'
  };
}
