export const dynamic = 'force-dynamic';

export function POST() {
  return Response.json(
    {
      ok: false,
      error: 'unsupported-proxy-path',
      message: 'Use the Honcho v3 read-only list endpoint instead.'
    },
    { status: 403 }
  );
}
