export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { Shell } from '../../../../../components/shell';
import { getHonchoSnapshot } from '../../../../../lib/honcho-client.js';
import { SessionDetail } from '../../../../../components/views';
export default async function Page({ params }: { params: Promise<{ workspaceId: string; sessionId: string }> }) { const { workspaceId, sessionId } = await params; const snapshot = await getHonchoSnapshot(); return <Shell snapshot={snapshot}><SessionDetail snapshot={snapshot} workspaceId={workspaceId} sessionId={sessionId}/></Shell>; }
