import { NextRequest, NextResponse } from 'next/server';
import { getDashboardEnv } from '../../../../lib/env.js';
import { isAllowedProxyPath, isReadOnlyPostPath } from '../../../../lib/proxy-policy.js';
import { protectPublicProxyResponse } from '../../../../lib/data-utils.js';
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
async function proxy(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  const env = getDashboardEnv();
  const { path = [] } = await context.params;
  const normalizedPath = path.map((part) => String(part || '').trim()).filter(Boolean);
  const legacyReadOnlyList = request.method === 'POST' && ['list', 'search'].includes(normalizedPath[normalizedPath.length - 1] || '');
  const unsupportedStatus = legacyReadOnlyList ? 200 : (MUTATING.has(request.method) ? 403 : 404);
  if (!isAllowedProxyPath(path)) return NextResponse.json({ ok: false, error: 'unsupported-proxy-path', message: 'Only Honcho v3 API paths are proxied.' }, { status: unsupportedStatus });
  if (!env.ALLOW_LIVE_PUBLIC_DATA) return NextResponse.json({ ok: false, error: 'live-data-disabled', message: 'Public runtime uses demo data unless live Honcho exposure is explicitly allowed server-side.' }, { status: 403, headers: { 'cache-control': 'no-store' } });
  const readOnlyPost = request.method === 'POST' && isReadOnlyPostPath(path);
  if (MUTATING.has(request.method) && !readOnlyPost && !env.ENABLE_MUTATIONS) return NextResponse.json({ ok: false, error: 'mutations-disabled', message: 'Write operations are disabled in this public runtime.' }, { status: 403 });
  const base = env.HONCHO_BASE_URL.endsWith('/') ? env.HONCHO_BASE_URL : env.HONCHO_BASE_URL + '/';
  const url = new URL(path.join('/'), base);
  request.nextUrl.searchParams.forEach((value: string, key: string) => url.searchParams.set(key, value));
  const headers: Record<string, string> = { accept: 'application/json' };
  if (env.HONCHO_API_KEY) headers.authorization = 'Bearer ' + env.HONCHO_API_KEY;
  const init: RequestInit = { method: request.method, headers, cache: 'no-store' };
  if (MUTATING.has(request.method)) { init.body = await request.text(); headers['content-type'] = request.headers.get('content-type') || 'application/json'; }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const body = await response.text();
    if (readOnlyPost && response.status === 404) {
      return NextResponse.json({ ok: false, error: 'upstream-not-found', items: [], message: 'Honcho read-only list endpoint returned not found.' }, { status: 200, headers: { 'cache-control': 'no-store' } });
    }
    const contentType = response.headers.get('content-type') || 'application/json';
    if (contentType.includes('application/json')) {
      try {
        return NextResponse.json(protectPublicProxyResponse(JSON.parse(body), normalizedPath), { status: response.status, headers: { 'cache-control': 'no-store' } });
      } catch {
        return NextResponse.json({ ok: false, error: 'malformed-json', message: 'Honcho API returned malformed JSON.' }, { status: 502, headers: { 'cache-control': 'no-store' } });
      }
    }
    return new NextResponse('', { status: response.status, headers: { 'content-type': 'text/plain', 'cache-control': 'no-store' } });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.name === 'AbortError' ? 'timeout' : 'offline', message: 'Honcho API request failed safely.' }, { status: 502 });
  } finally { clearTimeout(timeout); }
}
export const GET = proxy; export const POST = proxy; export const PUT = proxy; export const PATCH = proxy; export const DELETE = proxy;
