export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { Shell } from '../../components/shell';
import { getHonchoSnapshot } from '../../lib/honcho-client.js';
import { WorkspacesView } from '../../components/views';
export default async function Page() { const snapshot = await getHonchoSnapshot(); return <Shell snapshot={snapshot}><WorkspacesView snapshot={snapshot}/></Shell>; }
