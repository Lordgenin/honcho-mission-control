export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { Shell } from '../../components/shell';
import { getHonchoSnapshot } from '../../lib/honcho-client.js';
import { AgentsView } from '../../components/views';
export default async function Page() { const snapshot = await getHonchoSnapshot(); return <Shell snapshot={snapshot}><AgentsView snapshot={snapshot}/></Shell>; }
