export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { Shell } from '../../components/shell';
import { getRouteScopedHonchoSnapshot } from '../../lib/honcho-client.js';
import { ApiPlaygroundView } from '../../components/views';
export default async function Page() { const snapshot = await getRouteScopedHonchoSnapshot('api-playground'); return <Shell snapshot={snapshot}><ApiPlaygroundView snapshot={snapshot}/></Shell>; }
