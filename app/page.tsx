export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { Shell } from '../components/shell';
import { getRouteScopedHonchoSnapshot } from '../lib/honcho-client.js';
import { HomeView } from '../components/views';
export default async function Page() { const snapshot = await getRouteScopedHonchoSnapshot('home'); return <Shell snapshot={snapshot}><HomeView snapshot={snapshot}/></Shell>; }
