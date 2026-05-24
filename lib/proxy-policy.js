const READ_ONLY_POST_SUFFIXES = new Set(['list', 'search']);
const PUBLIC_GET_PATHS = new Set(['health', 'v3/health']);

export function normalizeProxyPath(path = []) {
  return path.map((part) => String(part || '').trim()).filter(Boolean);
}

export function isAllowedProxyPath(path = []) {
  const normalized = normalizeProxyPath(path);
  if (normalized.length === 0) return false;
  const joined = normalized.join('/');
  if (PUBLIC_GET_PATHS.has(joined)) return true;
  return normalized[0] === 'v3';
}

export function isReadOnlyPostPath(path = []) {
  const normalized = normalizeProxyPath(path);
  if (!isAllowedProxyPath(normalized)) return false;
  const last = normalized[normalized.length - 1];
  return READ_ONLY_POST_SUFFIXES.has(last);
}
