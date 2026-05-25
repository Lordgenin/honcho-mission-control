export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { Shell } from '../../components/shell';
import { getRouteScopedHonchoSnapshot } from '../../lib/honcho-client.js';
import { ContextView } from '../../components/views';
export default async function Page() { const snapshot = await getRouteScopedHonchoSnapshot('context'); return <Shell snapshot={snapshot}><ContextView snapshot={snapshot}/></Shell>; }
