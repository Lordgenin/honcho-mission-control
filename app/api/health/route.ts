export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json({ ok: true, service: 'honcho-mission-control' });
}
