'use client';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { discoverAgents, getAgentActivityLabel, getConclusionProvenanceLabel, getPeerDiscoveryFailure, getSessionMessageCountLabel, getSnapshotPosture, getSubsystemStatuses, statusTone } from '../lib/data-utils.js';
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
  const posture = getSnapshotPosture(snapshot);
  const subsystemStatuses = getSubsystemStatuses(snapshot);
  return <Card className="mb-6 border-teal-400/20 bg-teal-500/5">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-teal-300">Current posture</p>
        <h3 className="mt-2 text-2xl font-semibold">{posture.label}</h3>
        <p className="mt-2 max-w-3xl text-sm text-slate-300">{posture.summary}</p>
        <p className="mt-2 max-w-3xl text-sm text-teal-100"><span className="font-semibold">Next:</span> {posture.nextAction}</p>
        <div className="mt-4 grid gap-2 text-xs text-slate-300 md:grid-cols-5">
          {subsystemStatuses.map((item: any) => <div className="rounded-xl border border-border bg-slate-950/40 p-2" key={item.id}><p className="font-semibold text-slate-100">{item.label}</p><p className="mt-1 uppercase tracking-wide text-slate-400">{item.state}</p></div>)}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 lg:justify-end">
        <Badge className={posture.tone}>{snapshot.source || 'loading'} data</Badge>
        <Badge className={snapshot.status?.ok ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300' : 'border-rose-400/30 bg-rose-500/10 text-rose-300'}>{snapshot.status?.ok ? 'Honcho OK' : 'Honcho needs attention'}</Badge>
        <Badge className={snapshot.kanban?.available === false ? 'border-amber-400/30 bg-amber-500/10 text-amber-300' : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300'}>Kanban {snapshot.kanban?.state || 'unknown'}</Badge>
        <Badge className="border-sky-400/30 bg-sky-500/10 text-sky-300">{snapshot.env?.liveDataAllowed ? 'operator live data' : 'public privacy protected'}</Badge>
        <Badge className="border-sky-400/30 bg-sky-500/10 text-sky-300">{snapshot.readOnly === false ? 'mutations enabled' : 'read-only'}</Badge>
      </div>
    </div>
  </Card>;
}

function QuickStart() {
  return <Card className="mt-6">
    <h3 className="text-xl font-semibold">First-run checklist</h3>
    <ol className="mt-4 grid gap-3 text-sm text-slate-300 md:grid-cols-3">
      <li className="rounded-xl border border-border bg-slate-950/40 p-3"><span className="text-teal-300">1.</span> Configure the upstream Honcho connection and credentials server-side before exposing the dashboard.</li>
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
    <div className="grid gap-4 md:grid-cols-4"><Stat label="Workspaces connected" value={snapshot.workspaces.length} helper={snapshot.source?.startsWith('live') ? 'Loaded from Honcho API' : 'Demo fixture workspace count'}/><Stat label="Agents discovered" value={discoverAgents(snapshot.peers, snapshot.kanban).length} helper="Metadata agents plus Hermes peer IDs"/><Stat label="Sessions loaded" value={snapshot.sessions.length} helper="Message counts are labeled as reported or derived"/><Stat label="Conclusions loaded" value={snapshot.conclusions.length} helper="Confidence shows provenance/unavailable reason"/></div>
    <QuickStart/>
  </>;
}

export function DashboardView({ snapshot }: { snapshot: any }) {
  return <>
    <Header title="Dashboard" body="Live health, data volume, and recent memory activity across the configured Honcho service."/>
    <StatusBanner snapshot={snapshot}/>
    <div className="grid gap-4 md:grid-cols-4"><Stat label="Source" value={snapshot.source}/><Stat label="API health" value={snapshot.status?.ok ? 'OK' : 'Needs attention'}/><Stat label="Agents" value={discoverAgents(snapshot.peers, snapshot.kanban).length}/><Stat label="Generated" value={new Date(snapshot.generated_at).toLocaleString()}/></div>
    <Card className="mt-6"><h3 className="mb-4 text-xl font-semibold">Recent messages</h3><MessageList messages={snapshot.messages.slice(0, 5)} /></Card>
  </>;
}

export function WorkspacesView({ snapshot }: { snapshot: any }) { return <><Header title="Workspaces" body="Browse Honcho workspaces. Search filters real nested fields instead of accepting no-op input."/><SearchList items={snapshot.workspaces} placeholder="Search workspaces..." render={(w) => <Card><Link href={'/workspaces/' + (w.id || w.workspace_id)} className="text-xl font-semibold text-teal-200">{w.name || w.id}</Link><p className="mt-2 text-slate-400">{w.summary || 'No summary available yet.'}</p><p className="mt-3 text-xs text-slate-500">{w.status ? `Status: ${w.status}` : 'Open to inspect peer and session activity.'}</p></Card>} /></>; }
export function WorkspaceDetail({ snapshot, workspaceId }: { snapshot: any; workspaceId: string }) { const w = snapshot.workspaces.find((item: any) => item.id === workspaceId || item.workspace_id === workspaceId); if (!w) notFound(); const peers = snapshot.peers.filter((p: any) => (p.workspace_id || workspaceId) === workspaceId); const sessions = snapshot.sessions.filter((s: any) => (s.workspace_id || workspaceId) === workspaceId); return <><Header title={w.name || workspaceId} body={w.summary || 'Workspace memory and peer activity.'}/><div className="grid gap-4 md:grid-cols-3"><Stat label="Peers" value={peers.length}/><Stat label="Agents" value={discoverAgents(peers).length}/><Stat label="Sessions" value={sessions.length}/></div><div className="mt-6 flex gap-3"><Link href={'/workspaces/'+workspaceId+'/peers'}><Button>Open peers</Button></Link><Link href={'/workspaces/'+workspaceId+'/sessions'}><Button>Open sessions</Button></Link></div></>; }
export function PeersView({ snapshot, workspaceId }: { snapshot: any; workspaceId: string }) { const peers = snapshot.peers.filter((p:any)=> (p.workspace_id || workspaceId) === workspaceId); return <><Header title="Peers" body={'Peers in workspace ' + workspaceId}/><SearchList items={peers} placeholder="Search peers..." render={(p) => <Card><Link className="text-lg font-semibold text-teal-200" href={'/workspaces/'+workspaceId+'/peers/'+(p.id || p.peer_id)}>{p.name || p.id}</Link><p className="text-sm text-slate-400">{p.metadata?.role || (String(p.id || '').startsWith('hermes') ? 'Hermes peer' : 'peer')}</p></Card>} /></>; }
export function PeerDetail({ snapshot, workspaceId, peerId }: { snapshot: any; workspaceId: string; peerId: string }) { const peer = snapshot.peers.find((p:any)=> (p.id === peerId || p.peer_id === peerId) && ((p.workspace_id || workspaceId) === workspaceId)); if (!peer) notFound(); return <><Header title={peer.name || peerId} body="Peer metadata and related memory."/><Card><pre className="overflow-auto text-sm text-slate-300">{JSON.stringify(peer, null, 2)}</pre></Card></>; }
export function SessionsView({ snapshot, workspaceId }: { snapshot: any; workspaceId: string }) { const sessions = snapshot.sessions.filter((s:any)=> (s.workspace_id || workspaceId) === workspaceId); return <><Header title="Sessions" body={'Sessions in workspace ' + workspaceId + '. Message totals are labeled as reported by Honcho or derived from loaded messages.'}/><SearchList items={sessions} placeholder="Search sessions..." render={(s) => <Card><Link className="text-lg font-semibold text-teal-200" href={'/workspaces/'+workspaceId+'/sessions/'+s.id}>{s.title || s.id}</Link><p className="text-sm text-slate-400">{getSessionMessageCountLabel(s)} · {s.status || 'status unavailable'}</p></Card>} /></>; }
export function SessionDetail({ snapshot, workspaceId, sessionId }: { snapshot: any; workspaceId: string; sessionId: string }) { const session = snapshot.sessions.find((s:any)=> s.id === sessionId); if (!session) notFound(); const messages = snapshot.messages.filter((m:any)=> m.session_id === sessionId); return <><Header title={session.title || sessionId} body="Session transcript and state."/><MessageList messages={messages}/></>; }
export function MessageList({ messages }: { messages: any[] }) { return messages.length ? <div className="space-y-3">{messages.map((m) => <Card key={m.id}><div className="flex items-center justify-between"><Badge className="border-slate-400/20 bg-slate-500/10 text-slate-300">{m.role || m.peer_id || 'message'}</Badge><span className="text-xs text-slate-500">{m.created_at || 'no timestamp'}</span></div><p className="mt-3 text-slate-200">{m.content || m.text || 'No content returned.'}</p></Card>)}</div> : <EmptyState title="No messages" body="Honcho returned no messages for this view. If this is first-run setup, create a session or confirm the selected workspace."/>; }
export function MessagesView({ snapshot }: { snapshot: any }) { return <><Header title="Messages" body="Searchable memory message stream."/><SearchList items={snapshot.messages} placeholder="Search messages..." render={(m) => <Card><p>{m.content || m.text || 'No content returned.'}</p><p className="mt-2 text-xs text-slate-500">{m.workspace_id || 'workspace unknown'} / {m.session_id || 'session unknown'}</p></Card>} /></>; }
export function ConclusionsView({ snapshot }: { snapshot: any }) { return <><Header title="Conclusions" body="Durable Honcho conclusions with explicit confidence and provenance semantics. Missing confidence is labeled unavailable with evidence count/source instead of a placeholder."/><SearchList items={snapshot.conclusions} placeholder="Search conclusions..." render={(c) => <Card><p>{c.text || c.content || 'No conclusion text returned.'}</p><p className="mt-2 text-xs text-slate-500">{getConclusionProvenanceLabel(c)}</p></Card>} /></>; }
export function ContextView({ snapshot }: { snapshot: any }) {
  const summary = snapshot.context_summary || {};
  const agentStatuses = Array.isArray(summary.agent_statuses) ? summary.agent_statuses : [];
  return <>
    <Header title="Context" body="Public-safe context summary. Raw workspace/session/message identifiers and nested agent structures are minimized in public mode; trusted operator deployments are externally access-controlled."/>
    <StatusBanner snapshot={snapshot}/>
    <div className="grid gap-4 md:grid-cols-4"><Stat label="Workspaces" value={summary.workspace_count ?? 0}/><Stat label="Agents" value={summary.agent_count ?? 0}/><Stat label="Recent messages" value={summary.recent_message_count ?? 0}/><Stat label="Conclusions" value={summary.conclusion_count ?? 0}/></div>
    <Card className="mt-6"><h3 className="text-xl font-semibold">Minimized context posture</h3><p className="mt-2 text-sm text-slate-300">{summary.note || 'Context is route-scoped and minimized for unauthenticated browsers.'}</p><p className="mt-2 text-xs text-slate-500">Kanban state: {summary.kanban_state || 'unknown'} · Source: {summary.source || snapshot.source || 'unknown'}</p></Card>
    <Card className="mt-6"><h3 className="mb-3 text-xl font-semibold">Agent aggregate status</h3>{agentStatuses.length ? <div className="grid gap-3 md:grid-cols-2">{agentStatuses.map((agent: any, index: number) => <div className="rounded-xl border border-border bg-slate-950/40 p-3" key={`${agent.label}-${index}`}><div className="flex items-center justify-between gap-3"><p className="font-semibold text-slate-100">{agent.label || 'Agent'}</p><Badge className={statusTone(agent.status)}>{agent.status || 'unknown'}</Badge></div><p className="mt-1 text-xs text-slate-400">{agent.role || 'agent'} · {agent.team || 'team unknown'}</p><p className="mt-2 text-xs text-slate-500">Goal source: {agent.current_goal_source || 'not-reported'} · Task source: {agent.assigned_task_source || 'not-reported'}</p></div>)}</div> : <EmptyState title="No agent status summaries" body="No minimized agent status entries were available for this context snapshot."/>}</Card>
  </>;
}
export function ApiPlaygroundView({ snapshot }: { snapshot: any }) { return <><Header title="API playground" body="Read-only endpoint explorer. Browser requests target the Next.js server proxy, never Honcho directly."/><Card><p className="text-slate-300">Try server proxy paths such as <code>/api/honcho/v3/workspaces/list</code>, <code>/api/honcho/v3/workspaces/{'{workspaceId}'}/peers/list</code>, or <code>/api/honcho/v3/workspaces/{'{workspaceId}'}/sessions/list</code>. Unsupported non-v3 paths are not proxied.</p><Button className="mt-4" disabled={snapshot.readOnly}>Mutating requests disabled in public mode</Button></Card></>; }
export function WebhooksView({ snapshot }: { snapshot: any }) { return <><Header title="Webhooks" body="Webhook configuration preview with read-only safeguards."/><SearchList items={snapshot.webhooks} placeholder="Search webhooks..." render={(w) => <Card><p className="font-semibold">{w.event}</p><p className="text-sm text-slate-400">{w.url}</p><Button className="mt-3" disabled={snapshot.readOnly}>Send test delivery</Button></Card>} /></>; }
export function PerformanceView({ snapshot }: { snapshot: any }) {
  const performance = snapshot.performance || {};
  const legacySeries = Array.isArray(performance) ? performance : [];
  const series = Array.isArray(performance.timeseries) ? performance.timeseries : legacySeries;
  const health = performance.health || { state: 'unknown', label: 'Unknown', message: 'No telemetry payload is available.' };
  const freshness = performance.freshness || { state: 'unknown', generated_at: snapshot.generated_at };
  const requests = performance.requests || { total: series.length, succeeded: 0, failed: 0 };
  const latency = performance.latency || { samples: 0, avg_ms: null, max_ms: null };
  const errors = performance.errors || { total: 0, recent: [] };
  const slowEndpoints = Array.isArray(performance.slow_endpoints) ? performance.slow_endpoints : [];
  const history = performance.history || { available: series.length > 0, source: series.length ? 'provided-timeseries' : 'unavailable', reason: series.length ? null : 'insufficient-samples', detail: 'Trend history metadata unavailable.' };
  const trendTitle = history.source === 'live-aggregate-ring-buffer' ? 'Live aggregate trend' : 'Historical trend samples';
  const emptyTrendBody = history.reason === 'insufficient-samples'
    ? `Live request telemetry is summarized above, but this server process has not captured enough aggregate samples for a trend yet (${history.sample_count ?? 0}/${history.minimum_samples ?? 1}). Visit live Honcho routes and refresh to add samples.`
    : (history.detail || 'No historical time-series is available yet.');
  return <>
    <Header title="Performance" body="Actionable dashboard-to-Honcho telemetry with freshness, request health, latency, errors, and degraded/unknown states. Values are collected from server-side calls and labeled when they are demo or unavailable."/>
    <StatusBanner snapshot={snapshot}/>
    <div className="grid gap-4 md:grid-cols-4">
      <Stat label="Telemetry health" value={health.label || health.state || 'Unknown'} helper={health.message}/>
      <Stat label="Freshness" value={freshness.state || 'unknown'} helper={`generated ${freshness.generated_at || snapshot.generated_at || 'unknown'} · latest ${freshness.latest_observed_at || 'none'}`}/>
      <Stat label="Requests" value={`${requests.succeeded || 0}/${requests.total || 0} OK`} helper={`${requests.failed || 0} failed`}/>
      <Stat label="Latency" value={latency.avg_ms === null || latency.avg_ms === undefined ? 'n/a' : `${latency.avg_ms} ms`} helper={latency.max_ms === null || latency.max_ms === undefined ? 'No latency samples yet' : `max ${latency.max_ms} ms across ${latency.samples || 0} samples`}/>
    </div>
    <div className="mt-6 grid gap-4 lg:grid-cols-2">
      <Card><h3 className="mb-1 text-xl font-semibold">{trendTitle}</h3><p className="mb-3 text-xs text-slate-500">{history.detail || `source ${history.source || 'unknown'} · samples ${history.sample_count ?? series.length}`}</p>{series.length ? <PerformanceChart data={series}/> : <EmptyState title="Trend unavailable" body={emptyTrendBody}/>}</Card>
      <Card><h3 className="mb-3 text-xl font-semibold">Slow endpoints</h3>{slowEndpoints.length ? <div className="space-y-3 text-sm">{slowEndpoints.map((endpoint: any) => <div key={`${endpoint.path}-${endpoint.latency_ms}`} className="rounded-xl border border-border bg-slate-950/40 p-3"><div className="flex items-center justify-between gap-3"><span className="truncate text-slate-200">{endpoint.path}</span><Badge className={endpoint.ok ? statusTone('healthy') : statusTone('degraded')}>{endpoint.latency_ms} ms</Badge></div><p className="mt-1 text-xs text-slate-500">status {endpoint.status || 'unknown'}</p></div>)}</div> : <EmptyState title="No slow endpoints" body="No endpoint-level latency samples have been captured yet."/>}</Card>
    </div>
    <Card className="mt-6"><h3 className="mb-3 text-xl font-semibold">Recent errors</h3>{errors.recent?.length ? <div className="space-y-3 text-sm">{errors.recent.map((error: any) => <div key={`${error.path}-${error.observed_at}`} className="rounded-xl border border-rose-400/20 bg-rose-500/10 p-3"><p className="font-medium text-rose-200">{error.error || 'request failed'} · status {error.status || 'unknown'}</p><p className="mt-1 text-slate-300">{error.path}</p><p className="mt-1 text-xs text-slate-500">{error.observed_at || 'timestamp unavailable'}</p></div>)}</div> : <p className="text-sm text-slate-400">No recent telemetry errors reported.</p>}</Card>
  </>;
}

export function SettingsView({ snapshot }: { snapshot: any }) { return <><Header title="Settings" body="Public posture summary without exposing server-side configuration names, credentials, network hints, or paths."/><Card><div className="grid gap-3 text-sm"><p>Server connection: {snapshot.env.honchoConnection || 'configured server-side'}</p><p>Workspace scope: {snapshot.env.workspaceScope || 'public-safe aggregate'}</p><p>Data exposure: {snapshot.env.dataExposure || 'public privacy protected'}</p><p>Demo posture: {snapshot.env.demoData || 'live service configured with public protections'}</p><p>Mutation posture: {snapshot.env.mutations || 'disabled for public mode'}</p></div></Card></>; }
function PeerDiscoveryFailure({ failure }: { failure: any }) {
  return <Card className="border-rose-400/40 bg-rose-500/10">
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-rose-300">Peer discovery degraded</p>
        <h3 className="mt-2 text-2xl font-semibold text-rose-100">Could not load Honcho peers</h3>
        <p className="mt-2 max-w-3xl text-sm text-rose-100/80">The Agents page is not empty: Honcho peer discovery failed. Refresh this page after checking the upstream Honcho service, workspace id, API key, and network path.</p>
        <dl className="mt-4 grid gap-2 text-sm text-rose-50/80 md:grid-cols-3">
          <div><dt className="text-rose-200/70">Path</dt><dd className="break-all font-mono">{failure.path || 'peers/list'}</dd></div>
          <div><dt className="text-rose-200/70">Status</dt><dd>{failure.status ?? 'unknown'}</dd></div>
          <div><dt className="text-rose-200/70">Error</dt><dd>{failure.error || 'unknown'}</dd></div>
        </dl>
      </div>
      <Link href="/agents"><Button>Retry / refresh</Button></Link>
    </div>
  </Card>;
}

function SourceBadge({ source }: { source?: string }) {
  const label = source || 'fallback-not-reported';
  const tone = label.startsWith('kanban')
    ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300'
    : (label.startsWith('honcho') ? 'border-sky-400/30 bg-sky-500/10 text-sky-300' : 'border-slate-400/20 bg-slate-500/10 text-slate-300');
  return <Badge className={tone}>{label}</Badge>;
}

export function AgentsView({ snapshot }: { snapshot: any }) {
  const agents = discoverAgents(snapshot.peers, snapshot.kanban);
  const peerFailure = getPeerDiscoveryFailure(snapshot);
  const kanbanDegraded = snapshot.kanban?.available === false;
  const kanbanStaticSnapshot = snapshot.kanban?.state === 'static-snapshot' || snapshot.kanban?.snapshot?.mode === 'static-snapshot';
  const snapshotAge = snapshot.kanban?.freshness?.snapshot_age_seconds ?? snapshot.kanban?.snapshot?.age_seconds;
  return <>
    <Header title="Hermes agents" body="Current task, current goal, heartbeat, and last activity prefer Hermes Kanban runtime timestamps. Honcho peer metadata is explicit enrichment; Hermes profile/peer discovery is only fallback and is labeled per field."/>
    {kanbanDegraded ? <Card className="mb-4 border-amber-400/30 bg-amber-500/10"><p className="font-semibold text-amber-100">Kanban runtime degraded</p><p className="mt-1 text-sm text-amber-100/80">Activity/current-goal fields fall back to Honcho enrichment or unknown labels. Raw task bodies, comments, run metadata, heartbeat notes, host paths, and secrets are not rendered.</p></Card> : null}
    {kanbanStaticSnapshot ? <Card className="mb-4 border-amber-400/30 bg-amber-500/10"><p className="font-semibold text-amber-100">Kanban source is a static snapshot</p><p className="mt-1 text-sm text-amber-100/80">Task statuses may lag the active board because this dashboard is reading a copied SQLite snapshot, not a real-time board mount. Snapshot age: {typeof snapshotAge === 'number' ? `${snapshotAge}s` : 'not reported'} · reason: copied-db-snapshot. Raw DB paths, task bodies, comments, and heartbeat notes are hidden.</p></Card> : null}
    {peerFailure ? <PeerDiscoveryFailure failure={peerFailure}/> : agents.length ? <>
      <div className="mb-4 grid gap-4 md:grid-cols-4"><Stat label="Discovered agents" value={agents.length} helper="Kanban runtime plus Honcho peers"/><Stat label="Kanban state" value={snapshot.kanban?.state || 'not attached'} helper={snapshot.kanban?.source || 'source not reported'}/><Stat label="Latest Kanban signal" value={snapshot.kanban?.freshness?.latest_observed_at || snapshot.kanban?.freshness?.latest_event_at || 'not reported'} helper={`tasks ${snapshot.kanban?.freshness?.running_task_count ?? 'unknown'} running · source ${snapshot.kanban?.sources?.[0]?.label || 'not reported'}`}/><Stat label="Activity reported" value={agents.filter((a:any)=>a.last_seen || a.heartbeat).length} helper="Safe Kanban/Honcho timestamps only"/></div>
      <div className="grid gap-4 md:grid-cols-2">{agents.map((a:any) => <Card key={a.id}>
        <div className="flex items-center justify-between gap-3"><h3 className="text-xl font-semibold">{a.name}</h3><Badge className={statusTone(a.status)}>{a.status}</Badge></div>
        <p className="mt-1 text-slate-400">{a.role} · {a.team}{a.inferred ? ' · inferred from peer ID' : ''}</p>
        <div className="mt-4 space-y-3 text-sm">
          <div><div className="mb-1 flex flex-wrap items-center gap-2"><span className="font-semibold text-slate-200">Current goal</span><SourceBadge source={a.current_goal_source}/></div><p>{a.current_goal || 'Unknown: no Kanban task title or Honcho current_goal was reported.'}</p></div>
          <div><div className="mb-1 flex flex-wrap items-center gap-2"><span className="font-semibold text-slate-200">Task</span><SourceBadge source={a.assigned_task_source}/></div><p>{a.assigned_task || 'not reported'}{a.task_status ? ` · ${a.task_status}` : ''}</p></div>
          {Array.isArray(a.recent_tasks) && a.recent_tasks.length > 1 ? <div><div className="mb-1 flex flex-wrap items-center gap-2"><span className="font-semibold text-slate-200">Recent Kanban tasks</span><SourceBadge source="kanban-task-runtime"/></div><ul className="space-y-1 text-slate-300">{a.recent_tasks.map((task:any) => <li key={task.id}><span className="font-mono text-xs text-slate-400">{task.id}</span>{task.status ? ` · ${task.status}` : ''}{task.title ? ` · ${task.title}` : ''}</li>)}</ul></div> : null}
          <div><div className="mb-1 flex flex-wrap items-center gap-2"><span className="font-semibold text-slate-200">Heartbeat / activity</span><SourceBadge source={a.heartbeat_source || a.last_activity_source}/></div><p>{getAgentActivityLabel(a)}</p></div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">{a.capabilities.length ? a.capabilities.map((cap:string) => <Badge className="border-slate-400/20 bg-slate-500/10 text-slate-300" key={cap}>{cap}</Badge>) : <Badge className="border-slate-400/20 bg-slate-500/10 text-slate-300">capabilities not reported</Badge>}</div>
      </Card>)}</div>
    </> : <EmptyState title="No agents discovered" body="No Kanban runtime agents, Hermes peer IDs, or explicit Honcho agent metadata were found. Activity/current-goal remains unknown instead of inferred."/>}
  </>;
}
export function TableView({ title, body, data }: { title: string; body: string; data: any[] }) { return <><Header title={title} body={body}/><DataTable data={data} columns={[{ accessorKey: 'id', header: 'ID' }, { accessorFn: (row) => row.name || row.title || row.status || row.role || '-', header: 'Summary' }, { accessorFn: (row) => row.workspace_id || '-', header: 'Workspace' }]}/></>; }
