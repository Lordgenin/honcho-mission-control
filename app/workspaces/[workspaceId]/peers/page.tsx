import { Shell } from '../../../../components/shell';
import { getHonchoSnapshot } from '../../../../lib/honcho-client.js';
import { PeersView } from '../../../../components/views';
export default async function Page({ params }: { params: Promise<{ workspaceId: string }> }) { const { workspaceId } = await params; const snapshot = await getHonchoSnapshot(); return <Shell snapshot={snapshot}><PeersView snapshot={snapshot} workspaceId={workspaceId}/></Shell>; }
