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
    USE_DEMO_DATA: parseBoolean(source.USE_DEMO_DATA, false),
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

  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
    return 'loopback/self-hosted';
  }
  if (
    hostname.endsWith('.local') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  ) {
    return 'private-network/self-hosted';
  }
  return 'remote Honcho service';
}

export function getPublicDashboardEnv(source = process.env) {
  const env = getDashboardEnv(source);
  return {
    HONCHO_WORKSPACE_ID: env.ALLOW_LIVE_PUBLIC_DATA ? env.HONCHO_WORKSPACE_ID : '',
    ENABLE_MUTATIONS: env.ENABLE_MUTATIONS,
    USE_DEMO_DATA: env.USE_DEMO_DATA,
    liveDataAllowed: env.ALLOW_LIVE_PUBLIC_DATA,
    NEXT_PUBLIC_DASHBOARD_NAME: env.NEXT_PUBLIC_DASHBOARD_NAME,
    hasHonchoApiKey: Boolean(env.HONCHO_API_KEY),
    honchoConnection: classifyHonchoConnection(env.HONCHO_BASE_URL)
  };
}
