export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { Shell } from '../../components/shell';
import { getRouteScopedHonchoSnapshot } from '../../lib/honcho-client.js';
import { WebhooksView } from '../../components/views';
export default async function Page() { const snapshot = await getRouteScopedHonchoSnapshot('webhooks'); return <Shell snapshot={snapshot}><WebhooksView snapshot={snapshot}/></Shell>; }
