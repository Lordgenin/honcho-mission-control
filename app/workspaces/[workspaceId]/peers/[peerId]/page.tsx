export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { Shell } from '../../../../../components/shell';
import { getHonchoSnapshot } from '../../../../../lib/honcho-client.js';
import { PeerDetail } from '../../../../../components/views';
export default async function Page({ params }: { params: Promise<{ workspaceId: string; peerId: string }> }) { const { workspaceId, peerId } = await params; const snapshot = await getHonchoSnapshot(); return <Shell snapshot={snapshot}><PeerDetail snapshot={snapshot} workspaceId={workspaceId} peerId={peerId}/></Shell>; }
