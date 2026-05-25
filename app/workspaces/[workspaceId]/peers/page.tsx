export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { Shell } from '../../../../components/shell';
import { getRouteScopedHonchoSnapshot } from '../../../../lib/honcho-client.js';
import { PeersView } from '../../../../components/views';
export default async function Page({ params }: { params: Promise<{ workspaceId: string }> }) { const { workspaceId } = await params; const snapshot = await getRouteScopedHonchoSnapshot('peers'); return <Shell snapshot={snapshot}><PeersView snapshot={snapshot} workspaceId={workspaceId}/></Shell>; }
