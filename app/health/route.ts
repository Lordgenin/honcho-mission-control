import { getHealthPayload } from '../../lib/health.js';

export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json(getHealthPayload());
}
