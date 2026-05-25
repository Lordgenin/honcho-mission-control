export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { Shell } from '../../../../components/shell';
import { getRouteScopedHonchoSnapshot } from '../../../../lib/honcho-client.js';
import { SessionsView } from '../../../../components/views';
export default async function Page({ params }: { params: Promise<{ workspaceId: string }> }) { const { workspaceId } = await params; const snapshot = await getRouteScopedHonchoSnapshot('sessions'); return <Shell snapshot={snapshot}><SessionsView snapshot={snapshot} workspaceId={workspaceId}/></Shell>; }
