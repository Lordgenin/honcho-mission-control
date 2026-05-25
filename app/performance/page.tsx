export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { Shell } from '../../components/shell';
import { getRouteScopedHonchoSnapshot } from '../../lib/honcho-client.js';
import { PerformanceView } from '../../components/views';
export default async function Page() { const snapshot = await getRouteScopedHonchoSnapshot('performance'); return <Shell snapshot={snapshot}><PerformanceView snapshot={snapshot}/></Shell>; }
