export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { Shell } from '../../components/shell';
import { getRouteScopedHonchoSnapshot } from '../../lib/honcho-client.js';
import { ConclusionsView } from '../../components/views';
export default async function Page() { const snapshot = await getRouteScopedHonchoSnapshot('conclusions'); return <Shell snapshot={snapshot}><ConclusionsView snapshot={snapshot}/></Shell>; }
