import { NextRequest, NextResponse } from 'next/server';
import { getDashboardEnv } from '../../../../lib/env.js';
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
async function proxy(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  const env = getDashboardEnv();
  if (MUTATING.has(request.method) && !env.ENABLE_MUTATIONS) return NextResponse.json({ ok: false, error: 'mutations-disabled', message: 'Set ENABLE_MUTATIONS=true to enable write operations.' }, { status: 403 });
  const { path = [] } = await context.params;
  const base = env.HONCHO_BASE_URL.endsWith('/') ? env.HONCHO_BASE_URL : env.HONCHO_BASE_URL + '/';
  const url = new URL(path.join('/'), base);
  request.nextUrl.searchParams.forEach((value, key) => url.searchParams.set(key, value));
  const headers: Record<string, string> = { accept: 'application/json' };
  if (env.HONCHO_API_KEY) headers.authorization = 'Bearer ' + env.HONCHO_API_KEY;
  const init: RequestInit = { method: request.method, headers, cache: 'no-store' };
  if (MUTATING.has(request.method)) { init.body = await request.text(); headers['content-type'] = request.headers.get('content-type') || 'application/json'; }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const body = await response.text();
    return new NextResponse(body, { status: response.status, headers: { 'content-type': response.headers.get('content-type') || 'application/json', 'cache-control': 'no-store' } });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.name === 'AbortError' ? 'timeout' : 'offline', message: 'Honcho API request failed safely.' }, { status: 502 });
  } finally { clearTimeout(timeout); }
}
export const GET = proxy; export const POST = proxy; export const PUT = proxy; export const PATCH = proxy; export const DELETE = proxy;
