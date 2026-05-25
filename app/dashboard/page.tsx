export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { Shell } from '../../components/shell';
import { getRouteScopedHonchoSnapshot } from '../../lib/honcho-client.js';
import { DashboardView } from '../../components/views';
export default async function Page() { const snapshot = await getRouteScopedHonchoSnapshot('dashboard'); return <Shell snapshot={snapshot}><DashboardView snapshot={snapshot}/></Shell>; }
