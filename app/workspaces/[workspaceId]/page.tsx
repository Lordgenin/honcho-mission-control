export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { Shell } from '../../../components/shell';
import { getHonchoSnapshot } from '../../../lib/honcho-client.js';
import { WorkspaceDetail } from '../../../components/views';
export default async function Page({ params }: { params: Promise<{ workspaceId: string }> }) { const { workspaceId } = await params; const snapshot = await getHonchoSnapshot(); return <Shell snapshot={snapshot}><WorkspaceDetail snapshot={snapshot} workspaceId={workspaceId}/></Shell>; }
