export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { Shell } from '../../components/shell';
import { getRouteScopedHonchoSnapshot } from '../../lib/honcho-client.js';
import { MessagesView } from '../../components/views';
export default async function Page() { const snapshot = await getRouteScopedHonchoSnapshot('messages'); return <Shell snapshot={snapshot}><MessagesView snapshot={snapshot}/></Shell>; }
