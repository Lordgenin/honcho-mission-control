export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { Shell } from '../../components/shell';
import { SettingsView } from '../../components/views';
import { getDashboardEnv, getPublicDashboardEnv } from '../../lib/env.js';

export default async function Page() {
  const runtime = getDashboardEnv();
  const env = getPublicDashboardEnv();
  const snapshot = {
    source: runtime.USE_DEMO_DATA ? 'demo' : 'live-settings',
    readOnly: !runtime.ENABLE_MUTATIONS,
    env,
    status: { ok: true },
    mode: runtime.USE_DEMO_DATA ? 'demo' : 'live',
    generated_at: new Date().toISOString(),
    workspaces: [],
    peers: [],
    sessions: [],
    messages: [],
    conclusions: [],
    webhooks: [],
    performance: []
  };
  return <Shell snapshot={snapshot}><SettingsView snapshot={snapshot}/></Shell>;
}
