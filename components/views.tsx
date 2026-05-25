'use client';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { discoverAgents, statusTone } from '../lib/data-utils.js';
import { Badge, Button, Card, EmptyState } from './ui';
import { SearchList } from './search-list';
import { DataTable } from './data-table';
import { PerformanceChart } from './charts';

function Header({ title, body, eyebrow = 'Honcho Memory Ops' }: { title: string; body: string; eyebrow?: string }) {
  return <div className="mb-6">
    <p className="text-sm uppercase tracking-[0.35em] text-teal-300">{eyebrow}</p>
    <h2 className="mt-2 text-4xl font-bold">{title}</h2>
    <p className="mt-3 max-w-3xl text-slate-400">{body}</p>
  </div>;
}

function Stat({ label, value, helper }: { label: string; value: any; helper?: string }) {
  return <Card><p className="text-sm text-slate-400">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p>{helper ? <p className="mt-2 text-xs text-slate-500">{helper}</p> : null}</Card>;
}

function StatusBanner({ snapshot }: { snapshot: any }) {
  const live = snapshot.source?.startsWith('live');
  return <Card className="mb-6 border-teal-400/20 bg-teal-500/5">
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div><h3 className="text-lg font-semibold">System state</h3><p className="mt-1 text-sm text-slate-400">{snapshot.status?.ok ? 'Honcho responded successfully.' : 'Honcho is unavailable or the dashboard is intentionally using demo data.'}</p></div>
      <div className="flex flex-wrap gap-2">
        <Badge className={live ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300' : 'border-amber-400/30 bg-amber-500/10 text-amber-300'}>{snapshot.source || 'loading'} data</Badge>
        <Badge className={snapshot.status?.ok ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300' : 'border-rose-400/30 bg-rose-500/10 text-rose-300'}>{snapshot.status?.ok ? 'API OK' : 'API needs attention'}</Badge>
        <Badge className="border-sky-400/30 bg-sky-500/10 text-sky-300">{snapshot.readOnly === false ? 'mutations enabled' : 'read-only'}</Badge>
      </div>
    </div>
  </Card>;
}

function QuickStart() {
  return <Card className="mt-6">
    <h3 className="text-xl font-semibold">First-run checklist</h3>
    <ol className="mt-4 grid gap-3 text-sm text-slate-300 md:grid-cols-3">
      <li className="rounded-xl border border-border bg-slate-950/40 p-3"><span className="text-teal-300">1.</span> Copy .env.example and set your Honcho URL, workspace, and API key server-side.</li>
      <li className="rounded-xl border border-border bg-slate-950/40 p-3"><span className="text-teal-300">2.</span> Keep public deployments in read-only mode until mutations are explicitly needed.</li>
      <li className="rounded-xl border border-border bg-slate-950/40 p-3"><span className="text-teal-300">3.</span> Open Agents and Workspaces to confirm live peers are visible before sharing the dashboard.</li>
    </ol>
    <div className="mt-4 flex flex-wrap gap-3"><Link href="/settings"><Button>Review settings</Button></Link><Link href="/api-playground"><Button>Try API proxy</Button></Link></div>
  </Card>;
}

export function HomeView({ snapshot }: { snapshot: any }) {
  return <>
    <Header title="Self-hosted Honcho mission control" body="A public-safe dashboard for Hermes memory, discovered agents, sessions, conclusions, webhooks, and performance. Live API data is proxied server-side; demo/live/read-only states are visible before users drill in."/>
    <StatusBanner snapshot={snapshot}/>
    <div className="grid gap-4 md:grid-cols-4"><Stat label="Workspaces" value={snapshot.workspaces.length}/><Stat label="Agents" value={discoverAgents(snapshot.peers).length} helper="Discovered from metadata or Hermes peer IDs"/><Stat label="Sessions" value={snapshot.sessions.length}/><Stat label="Conclusions" value={snapshot.conclusions.length}/></div>
    <QuickStart/>
  </>;
}

export function DashboardView({ snapshot }: { snapshot: any }) {
  return <>
    <Header title="Dashboard" body="Live health, data volume, and recent memory activity across the configured Honcho service."/>
    <StatusBanner snapshot={snapshot}/>
    <div className="grid gap-4 md:grid-cols-4"><Stat label="Source" value={snapshot.source}/><Stat label="API health" value={snapshot.status?.ok ? 'OK' : 'Needs attention'}/><Stat label="Agents" value={discoverAgents(snapshot.peers).length}/><Stat label="Generated" value={new Date(snapshot.generated_at).toLocaleString()}/></div>
    <Card className="mt-6"><h3 className="mb-4 text-xl font-semibold">Recent messages</h3><MessageList messages={snapshot.messages.slice(0, 5)} /></Card>
  </>;
}

export function WorkspacesView({ snapshot }: { snapshot: any }) { return <><Header title="Workspaces" body="Browse Honcho workspaces. Search filters real nested fields instead of accepting no-op input."/><SearchList items={snapshot.workspaces} placeholder="Search workspaces..." render={(w) => <Card><Link href={'/workspaces/' + (w.id || w.workspace_id)} className="text-xl font-semibold text-teal-200">{w.name || w.id}</Link><p className="mt-2 text-slate-400">{w.summary || 'No summary available yet.'}</p><p className="mt-3 text-xs text-slate-500">{w.status ? `Status: ${w.status}` : 'Open to inspect peer and session activity.'}</p></Card>} /></>; }
export function WorkspaceDetail({ snapshot, workspaceId }: { snapshot: any; workspaceId: string }) { const w = snapshot.workspaces.find((item: any) => item.id === workspaceId || item.workspace_id === workspaceId); if (!w) notFound(); const peers = snapshot.peers.filter((p: any) => (p.workspace_id || workspaceId) === workspaceId); const sessions = snapshot.sessions.filter((s: any) => (s.workspace_id || workspaceId) === workspaceId); return <><Header title={w.name || workspaceId} body={w.summary || 'Workspace memory and peer activity.'}/><div className="grid gap-4 md:grid-cols-3"><Stat label="Peers" value={peers.length}/><Stat label="Agents" value={discoverAgents(peers).length}/><Stat label="Sessions" value={sessions.length}/></div><div className="mt-6 flex gap-3"><Link href={'/workspaces/'+workspaceId+'/peers'}><Button>Open peers</Button></Link><Link href={'/workspaces/'+workspaceId+'/sessions'}><Button>Open sessions</Button></Link></div></>; }
export function PeersView({ snapshot, workspaceId }: { snapshot: any; workspaceId: string }) { const peers = snapshot.peers.filter((p:any)=> (p.workspace_id || workspaceId) === workspaceId); return <><Header title="Peers" body={'Peers in workspace ' + workspaceId}/><SearchList items={peers} placeholder="Search peers..." render={(p) => <Card><Link className="text-lg font-semibold text-teal-200" href={'/workspaces/'+workspaceId+'/peers/'+(p.id || p.peer_id)}>{p.name || p.id}</Link><p className="text-sm text-slate-400">{p.metadata?.role || (String(p.id || '').startsWith('hermes') ? 'Hermes peer' : 'peer')}</p></Card>} /></>; }
export function PeerDetail({ snapshot, workspaceId, peerId }: { snapshot: any; workspaceId: string; peerId: string }) { const peer = snapshot.peers.find((p:any)=> (p.id === peerId || p.peer_id === peerId) && ((p.workspace_id || workspaceId) === workspaceId)); if (!peer) notFound(); return <><Header title={peer.name || peerId} body="Peer metadata and related memory."/><Card><pre className="overflow-auto text-sm text-slate-300">{JSON.stringify(peer, null, 2)}</pre></Card></>; }
export function SessionsView({ snapshot, workspaceId }: { snapshot: any; workspaceId: string }) { const sessions = snapshot.sessions.filter((s:any)=> (s.workspace_id || workspaceId) === workspaceId); return <><Header title="Sessions" body={'Sessions in workspace ' + workspaceId}/><SearchList items={sessions} placeholder="Search sessions..." render={(s) => <Card><Link className="text-lg font-semibold text-teal-200" href={'/workspaces/'+workspaceId+'/sessions/'+s.id}>{s.title || s.id}</Link><p className="text-sm text-slate-400">{Number.isFinite(Number(s.message_count)) ? Number(s.message_count) : 'unavailable'} messages · {s.status || 'available'}</p></Card>} /></>; }
export function SessionDetail({ snapshot, workspaceId, sessionId }: { snapshot: any; workspaceId: string; sessionId: string }) { const session = snapshot.sessions.find((s:any)=> s.id === sessionId); if (!session) notFound(); const messages = snapshot.messages.filter((m:any)=> m.session_id === sessionId); return <><Header title={session.title || sessionId} body="Session transcript and state."/><MessageList messages={messages}/></>; }
export function MessageList({ messages }: { messages: any[] }) { return messages.length ? <div className="space-y-3">{messages.map((m) => <Card key={m.id}><div className="flex items-center justify-between"><Badge className="border-slate-400/20 bg-slate-500/10 text-slate-300">{m.role || m.peer_id || 'message'}</Badge><span className="text-xs text-slate-500">{m.created_at || 'no timestamp'}</span></div><p className="mt-3 text-slate-200">{m.content || m.text || 'No content returned.'}</p></Card>)}</div> : <EmptyState title="No messages" body="Honcho returned no messages for this view. If this is first-run setup, create a session or confirm the selected workspace."/>; }
export function MessagesView({ snapshot }: { snapshot: any }) { return <><Header title="Messages" body="Searchable memory message stream."/><SearchList items={snapshot.messages} placeholder="Search messages..." render={(m) => <Card><p>{m.content || m.text || 'No content returned.'}</p><p className="mt-2 text-xs text-slate-500">{m.workspace_id || 'workspace unknown'} / {m.session_id || 'session unknown'}</p></Card>} /></>; }
export function ConclusionsView({ snapshot }: { snapshot: any }) { return <><Header title="Conclusions" body="Durable Honcho conclusions and confidence signals."/><SearchList items={snapshot.conclusions} placeholder="Search conclusions..." render={(c) => <Card><p>{c.text || c.content || 'No conclusion text returned.'}</p><p className="mt-2 text-xs text-slate-500">confidence {c.confidence ?? 'n/a'}</p></Card>} /></>; }
export function ContextView({ snapshot }: { snapshot: any }) { return <><Header title="Context" body="Combined workspace, peer, message, and conclusion context for operators."/><Card><pre className="max-h-[620px] overflow-auto text-xs text-slate-300">{JSON.stringify({ workspaces: snapshot.workspaces, agents: discoverAgents(snapshot.peers), recent_messages: snapshot.messages.slice(0, 10), conclusions: snapshot.conclusions }, null, 2)}</pre></Card></>; }
export function ApiPlaygroundView({ snapshot }: { snapshot: any }) { return <><Header title="API playground" body="Read-only endpoint explorer. Browser requests target the Next.js server proxy, never Honcho directly."/><Card><p className="text-slate-300">Try server proxy paths such as <code>/api/honcho/v3/workspaces/list</code>, <code>/api/honcho/v3/workspaces/{'{workspaceId}'}/peers/list</code>, or <code>/api/honcho/v3/workspaces/{'{workspaceId}'}/sessions/list</code>. Unsupported non-v3 paths are not proxied.</p><Button className="mt-4" disabled={snapshot.readOnly}>Mutating requests disabled unless ENABLE_MUTATIONS=true</Button></Card></>; }
export function WebhooksView({ snapshot }: { snapshot: any }) { return <><Header title="Webhooks" body="Webhook configuration preview with read-only safeguards."/><SearchList items={snapshot.webhooks} placeholder="Search webhooks..." render={(w) => <Card><p className="font-semibold">{w.event}</p><p className="text-sm text-slate-400">{w.url}</p><Button className="mt-3" disabled={snapshot.readOnly}>Send test delivery</Button></Card>} /></>; }
export function PerformanceView({ snapshot }: { snapshot: any }) { return <><Header title="Performance" body="Performance displays only traceable metrics. Live Honcho latency/request/error telemetry is not available from the current API, so the page stays empty instead of inferring latency from queue counts."/><Card>{snapshot.performance.length ? <PerformanceChart data={snapshot.performance}/> : <EmptyState title="No verified performance telemetry" body="Live Honcho metrics are not configured. Queue or demo samples must be explicitly labeled before display."/>}</Card></>; }
export function SettingsView({ snapshot }: { snapshot: any }) { return <><Header title="Settings" body="Runtime environment and deployment posture without exposing server-side secrets."/><Card><div className="grid gap-3 text-sm"><p>HONCHO_CONNECTION: {snapshot.env.honchoConnection || 'configured server-side'}</p><p>HONCHO_WORKSPACE_ID: {snapshot.env.HONCHO_WORKSPACE_ID || '(all)'}</p><p>USE_DEMO_DATA: {String(snapshot.env.USE_DEMO_DATA)}</p><p>ALLOW_LIVE_PUBLIC_DATA: {String(snapshot.env.liveDataAllowed)}</p><p>ENABLE_MUTATIONS: {String(snapshot.env.ENABLE_MUTATIONS)}</p><p>API_KEY_CONFIGURED: {String(Boolean(snapshot.env.hasHonchoApiKey))}</p></div></Card></>; }
export function AgentsView({ snapshot }: { snapshot: any }) { const agents = discoverAgents(snapshot.peers); return <><Header title="Hermes agents" body="Agents are discovered from explicit peer metadata or live Hermes peer IDs such as hermes-jarvis, so real self-hosted workspaces still render even when metadata is empty."/>{agents.length ? <><div className="mb-4 grid gap-4 md:grid-cols-3"><Stat label="Discovered agents" value={agents.length}/><Stat label="Live peers" value={snapshot.peers.length}/><Stat label="With capabilities" value={agents.filter((a:any)=>a.capabilities.length).length}/></div><div className="grid gap-4 md:grid-cols-2">{agents.map((a:any) => <Card key={a.id}><div className="flex items-center justify-between gap-3"><h3 className="text-xl font-semibold">{a.name}</h3><Badge className={statusTone(a.status)}>{a.status}</Badge></div><p className="mt-1 text-slate-400">{a.role} · {a.team}{a.inferred ? ' · inferred from peer ID' : ''}</p><p className="mt-3 text-sm">{a.current_goal || 'No current goal reported yet.'}</p><p className="mt-2 text-xs text-slate-500">Task: {a.assigned_task || 'none'} · last seen: {a.last_seen || a.heartbeat || 'unknown'}</p><div className="mt-3 flex flex-wrap gap-2">{a.capabilities.length ? a.capabilities.map((cap:string) => <Badge className="border-slate-400/20 bg-slate-500/10 text-slate-300" key={cap}>{cap}</Badge>) : <Badge className="border-slate-400/20 bg-slate-500/10 text-slate-300">capabilities not reported</Badge>}</div></Card>)}</div></> : <EmptyState title="No agents discovered" body="No Hermes peer IDs or agent metadata were found. Confirm the Honcho workspace has peers, then add metadata type=agent or use Hermes peer IDs like hermes-jarvis."/>}</>; }
export function TableView({ title, body, data }: { title: string; body: string; data: any[] }) { return <><Header title={title} body={body}/><DataTable data={data} columns={[{ accessorKey: 'id', header: 'ID' }, { accessorFn: (row) => row.name || row.title || row.status || row.role || '-', header: 'Summary' }, { accessorFn: (row) => row.workspace_id || '-', header: 'Workspace' }]}/></>; }
