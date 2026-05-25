import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const files = new Map();
const w = (path, content) => files.set(path, content.trimStart());

w('tsconfig.json', `{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
`);
w('next-env.d.ts', `/// <reference types="next" />
/// <reference types="next/image-types/global" />
`);
w('next.config.ts', `import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'standalone'
};

export default nextConfig;
`);
w('postcss.config.mjs', `const config = { plugins: { tailwindcss: {}, autoprefixer: {} } };
export default config;
`);
w('tailwind.config.ts', `import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))', foreground: 'hsl(var(--foreground))', border: 'hsl(var(--border))',
        card: 'hsl(var(--card))', muted: 'hsl(var(--muted))', accent: 'hsl(var(--accent))', primary: 'hsl(var(--primary))'
      },
      boxShadow: { glow: '0 0 40px rgba(20, 184, 166, 0.12)' }
    }
  },
  plugins: []
};
export default config;
`);
w('app/globals.css', `@tailwind base;
@tailwind components;
@tailwind utilities;

:root { --background: 222 47% 6%; --foreground: 210 40% 98%; --card: 222 38% 10%; --muted: 217 20% 18%; --accent: 174 72% 42%; --primary: 188 92% 45%; --border: 217 19% 23%; }
* { box-sizing: border-box; }
body { margin: 0; background: radial-gradient(circle at 20% 0%, rgba(20,184,166,.18), transparent 32%), hsl(var(--background)); color: hsl(var(--foreground)); }
a { color: inherit; text-decoration: none; }
`);

w('lib/env.js', `const TRUE_VALUES = new Set(['true', '1', 'yes', 'on']);
export function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return TRUE_VALUES.has(String(value).toLowerCase());
}
export function getDashboardEnv(source = process.env) {
  const env = {
    HONCHO_BASE_URL: source.HONCHO_BASE_URL || 'http://localhost:8000',
    HONCHO_WORKSPACE_ID: source.HONCHO_WORKSPACE_ID || '',
    ENABLE_MUTATIONS: parseBoolean(source.ENABLE_MUTATIONS, false),
    USE_DEMO_DATA: parseBoolean(source.USE_DEMO_DATA, false),
    NEXT_PUBLIC_DASHBOARD_NAME: source.NEXT_PUBLIC_DASHBOARD_NAME || 'Honcho Mission Control'
  };
  Object.defineProperty(env, 'HONCHO_API_KEY', { value: source.HONCHO_API_KEY || '', enumerable: false });
  return env;
}
`);
w('lib/data-utils.js', `export function asArray(value) { return Array.isArray(value) ? value : []; }
export function normalizeCollection(payload, keys = []) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  for (const key of keys) if (Array.isArray(payload[key])) return payload[key];
  for (const key of ['items', 'results', 'data', 'workspaces', 'peers', 'sessions', 'messages', 'conclusions']) if (Array.isArray(payload[key])) return payload[key];
  return [];
}
function flatten(value) {
  if (value === null || value === undefined) return '';
  if (typeof value !== 'object') return String(value);
  return Object.values(value).map(flatten).join(' ');
}
export function filterCollection(items, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return items;
  return asArray(items).filter((item) => flatten(item).toLowerCase().includes(q));
}
export function discoverAgents(peers = []) {
  return asArray(peers)
    .filter((peer) => {
      const meta = peer?.metadata || {};
      return meta.type === 'agent' || meta.kind === 'agent' || meta.role === 'agent' || meta.agent === true;
    })
    .map((peer) => ({
      id: peer.id || peer.peer_id || peer.name || 'unknown-agent',
      name: peer.name || peer.id || peer.peer_id || 'Unknown agent',
      role: peer.metadata?.role || 'agent',
      team: peer.metadata?.team || 'unassigned',
      status: peer.metadata?.status || 'unknown',
      heartbeat: peer.metadata?.heartbeat || '',
      last_seen: peer.metadata?.last_seen || peer.last_seen || '',
      current_goal: peer.metadata?.current_goal || '',
      assigned_task: peer.metadata?.assigned_task || '',
      capabilities: Array.isArray(peer.metadata?.capabilities) ? peer.metadata.capabilities : [],
      raw: peer
    }));
}
export function statusTone(status = '') {
  const s = String(status).toLowerCase();
  if (['online', 'healthy', 'active', 'ready'].includes(s)) return 'text-emerald-300 bg-emerald-500/10 border-emerald-400/30';
  if (['degraded', 'busy', 'stale', 'warning'].includes(s)) return 'text-amber-300 bg-amber-500/10 border-amber-400/30';
  if (['offline', 'failed', 'error'].includes(s)) return 'text-rose-300 bg-rose-500/10 border-rose-400/30';
  return 'text-slate-300 bg-slate-500/10 border-slate-400/20';
}
`);
w('lib/demo-data.js', `const now = new Date('2026-05-23T20:30:00Z').toISOString();
export function getDemoSnapshot() {
  const workspaces = [
    { id: 'example-workspace', name: 'Example Workspace', summary: 'Sample operations workspace', peers: 6, sessions: 18, conclusions: 74, status: 'healthy' },
    { id: 'platform-lab', name: 'Platform Lab', summary: 'Sandbox for integration and gateway checks', peers: 4, sessions: 11, conclusions: 38, status: 'degraded' }
  ];
  const peers = [
    { id: 'builder-bot', name: 'Builder Bot', workspace_id: 'example-workspace', metadata: { type: 'agent', role: 'engineering lead', team: 'build', status: 'online', heartbeat: '2m ago', last_seen: now, current_goal: 'Ship the dashboard', assigned_task: 'TASK-123', capabilities: ['nextjs', 'typescript', 'devops'] } },
    { id: 'review-bot', name: 'Review Bot', workspace_id: 'example-workspace', metadata: { type: 'agent', role: 'qa/security reviewer', team: 'review', status: 'ready', heartbeat: '5m ago', last_seen: now, current_goal: 'Review dashboard behavior', assigned_task: 'TASK-124', capabilities: ['qa', 'security', 'playwright'] } },
    { id: 'planner-bot', name: 'Planner Bot', workspace_id: 'example-workspace', metadata: { type: 'agent', role: 'orchestrator', team: 'operations', status: 'online', heartbeat: '1m ago', last_seen: now, current_goal: 'Coordinate follow-up lanes', capabilities: ['planning', 'kanban'] } },
    { id: 'operator', name: 'Human operator', workspace_id: 'example-workspace', metadata: { type: 'human', role: 'owner' } }
  ];
  const sessions = [
    { id: 's-dashboard', workspace_id: 'example-workspace', peer_id: 'builder-bot', title: 'Production Next.js dashboard build', message_count: 42, updated_at: now, status: 'active' },
    { id: 's-memory', workspace_id: 'example-workspace', peer_id: 'planner-bot', title: 'Memory architecture planning', message_count: 28, updated_at: '2026-05-23T18:15:00Z', status: 'complete' },
    { id: 's-qa', workspace_id: 'example-workspace', peer_id: 'review-bot', title: 'Dashboard QA pass', message_count: 33, updated_at: '2026-05-23T19:00:00Z', status: 'complete' }
  ];
  const messages = [
    { id: 'm1', workspace_id: 'example-workspace', session_id: 's-dashboard', peer_id: 'builder-bot', role: 'assistant', content: 'Implementing App Router routes with server-side Honcho proxy and read-only defaults.', created_at: now },
    { id: 'm2', workspace_id: 'example-workspace', session_id: 's-qa', peer_id: 'review-bot', role: 'assistant', content: 'Top checks: mock state labeling, lifecycle coverage, disabled controls, unknown-route fallback, search.', created_at: '2026-05-23T19:05:00Z' },
    { id: 'm3', workspace_id: 'example-workspace', session_id: 's-memory', peer_id: 'planner-bot', role: 'assistant', content: 'The demo Honcho service runs locally at http://localhost:8000 with a documented request timeout.', created_at: '2026-05-23T18:20:00Z' }
  ];
  const conclusions = [
    { id: 'c1', workspace_id: 'example-workspace', peer_id: 'builder-bot', text: 'HONCHO_API_KEY must remain server-side; browser calls go through app/api/honcho.', confidence: 0.98, created_at: now },
    { id: 'c2', workspace_id: 'example-workspace', peer_id: 'review-bot', text: 'Dashboard controls must be disabled unless ENABLE_MUTATIONS=true and visibly labeled.', confidence: 0.94, created_at: '2026-05-23T19:12:00Z' }
  ];
  const webhooks = [
    { id: 'wh-kanban', url: 'https://example.invalid/hermes/kanban', event: 'task.completed', status: 'disabled-readonly', deliveries: 0 },
    { id: 'wh-memory', url: 'https://example.invalid/honcho/conclusions', event: 'conclusion.created', status: 'disabled-readonly', deliveries: 0 }
  ];
  const performance = [
    { label: '10:00', latency_ms: 82, requests: 44, errors: 0 }, { label: '11:00', latency_ms: 96, requests: 58, errors: 1 },
    { label: '12:00', latency_ms: 121, requests: 71, errors: 2 }, { label: '13:00', latency_ms: 88, requests: 63, errors: 0 },
    { label: '14:00', latency_ms: 104, requests: 82, errors: 1 }
  ];
  return { mode: 'demo', generated_at: now, workspaces, peers, sessions, messages, conclusions, webhooks, performance };
}
`);
w('lib/honcho-client.js', `import { getDashboardEnv } from './env.js';
import { getDemoSnapshot } from './demo-data.js';
import { normalizeCollection } from './data-utils.js';

const TIMEOUT_MS = 8000;
async function fetchJson(path, options = {}) {
  const env = getDashboardEnv();
  const url = new URL(path.replace(/^\\//, ''), env.HONCHO_BASE_URL.endsWith('/') ? env.HONCHO_BASE_URL : env.HONCHO_BASE_URL + '/');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || TIMEOUT_MS);
  try {
    const headers = { accept: 'application/json', ...(options.headers || {}) };
    if (env.HONCHO_API_KEY) headers.authorization = 'Bearer ' + env.HONCHO_API_KEY;
    const response = await fetch(url, { ...options, headers, signal: controller.signal, cache: 'no-store' });
    const text = await response.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { return { ok: false, status: response.status, error: 'malformed-json', data: null }; }
    if (!response.ok) return { ok: false, status: response.status, error: response.status === 401 || response.status === 403 ? 'auth' : 'http-' + response.status, data: json };
    return { ok: true, status: response.status, error: null, data: json };
  } catch (error) {
    return { ok: false, status: 0, error: error?.name === 'AbortError' ? 'timeout' : 'offline', data: null };
  } finally { clearTimeout(timeout); }
}
async function tryCollection(path, keys) {
  const result = await fetchJson(path);
  return { ...result, items: result.ok ? normalizeCollection(result.data, keys) : [] };
}
export async function getHonchoSnapshot() {
  const env = getDashboardEnv();
  if (env.USE_DEMO_DATA) return { source: 'demo', readOnly: !env.ENABLE_MUTATIONS, env, status: { ok: true }, ...getDemoSnapshot() };
  const [workspaces, peers, sessions, messages, conclusions] = await Promise.all([
    tryCollection('/workspaces', ['workspaces']), tryCollection('/peers', ['peers']), tryCollection('/sessions', ['sessions']),
    tryCollection('/messages', ['messages']), tryCollection('/conclusions', ['conclusions'])
  ]);
  const failures = [workspaces, peers, sessions, messages, conclusions].filter((r) => !r.ok);
  return {
    source: failures.length ? 'live-partial' : 'live', readOnly: !env.ENABLE_MUTATIONS, env,
    status: { ok: failures.length === 0, failures: failures.map((f) => ({ status: f.status, error: f.error })) },
    mode: 'live', generated_at: new Date().toISOString(),
    workspaces: workspaces.items, peers: peers.items, sessions: sessions.items, messages: messages.items, conclusions: conclusions.items,
    webhooks: [], performance: []
  };
}
export { fetchJson };
`);

w('components/ui.tsx', `import * as React from 'react';
import { twMerge } from 'tailwind-merge';
import { clsx, type ClassValue } from 'clsx';
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn('rounded-2xl border border-border bg-card/80 p-5 shadow-glow backdrop-blur', className)} {...props} />; }
export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) { return <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium', className)} {...props} />; }
export function Button({ className, disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) { return <button disabled={disabled} className={cn('rounded-lg border border-border bg-muted px-3 py-2 text-sm transition hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-45', className)} {...props} />; }
export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) { return <input className="w-full rounded-xl border border-border bg-slate-950/60 px-3 py-2 text-sm outline-none ring-primary/40 focus:ring-2" {...props} />; }
export function EmptyState({ title, body }: { title: string; body: string }) { return <Card className="border-dashed text-center"><h3 className="text-lg font-semibold">{title}</h3><p className="mt-2 text-sm text-slate-400">{body}</p></Card>; }
`);
w('components/search-list.tsx', `'use client';
import { useMemo, useState } from 'react';
import { filterCollection } from '../lib/data-utils.js';
import { EmptyState, Input } from './ui';
export function SearchList({ items, render, placeholder = 'Search...' }: { items: any[]; render: (item: any) => React.ReactNode; placeholder?: string }) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => filterCollection(items, query), [items, query]);
  return <div className="space-y-4"><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={placeholder} aria-label="Search" />{filtered.length ? <div className="grid gap-3">{filtered.map((item, index) => <div key={item.id || index}>{render(item)}</div>)}</div> : <EmptyState title="No matches" body="Search is active; adjust the query or clear it to see all records." />}</div>;
}
`);
w('components/data-table.tsx', `'use client';
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table';
export function DataTable({ data, columns }: { data: any[]; columns: ColumnDef<any>[] }) {
  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });
  return <div className="overflow-hidden rounded-xl border border-border"><table className="w-full text-left text-sm"><thead className="bg-muted/60">{table.getHeaderGroups().map((hg) => <tr key={hg.id}>{hg.headers.map((h) => <th className="px-4 py-3" key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</th>)}</tr>)}</thead><tbody>{table.getRowModel().rows.map((row) => <tr className="border-t border-border" key={row.id}>{row.getVisibleCells().map((cell) => <td className="px-4 py-3 text-slate-300" key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>)}</tbody></table></div>;
}
`);
w('components/charts.tsx', `'use client';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
export function PerformanceChart({ data }: { data: any[] }) {
  return <div className="h-72"><ResponsiveContainer><AreaChart data={data}><defs><linearGradient id="latency" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#14b8a6" stopOpacity={0.8}/><stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#334155"/><XAxis dataKey="label" stroke="#94a3b8"/><YAxis stroke="#94a3b8"/><Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155' }}/><Area type="monotone" dataKey="latency_ms" stroke="#14b8a6" fill="url(#latency)" /></AreaChart></ResponsiveContainer></div>;
}
`);

w('components/shell.tsx', `import Link from 'next/link';
import { Activity, Bot, Brain, Gauge, Home, MessageSquare, Network, Settings, TestTube, Webhook } from 'lucide-react';
import { Badge } from './ui';
const nav = [ ['/', Home, 'Home'], ['/dashboard', Gauge, 'Dashboard'], ['/workspaces', Network, 'Workspaces'], ['/agents', Bot, 'Agents'], ['/messages', MessageSquare, 'Messages'], ['/conclusions', Brain, 'Conclusions'], ['/context', Activity, 'Context'], ['/api-playground', TestTube, 'API'], ['/webhooks', Webhook, 'Webhooks'], ['/performance', Activity, 'Performance'], ['/settings', Settings, 'Settings'] ];
export function Shell({ children, snapshot }: { children: React.ReactNode; snapshot?: any }) {
  const name = snapshot?.env?.NEXT_PUBLIC_DASHBOARD_NAME || process.env.NEXT_PUBLIC_DASHBOARD_NAME || 'Honcho Mission Control';
  return <div className="min-h-screen"><aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-border bg-slate-950/70 p-5 backdrop-blur lg:block"><div className="mb-8"><p className="text-xs uppercase tracking-[0.4em] text-teal-300">Hermes</p><h1 className="mt-2 text-2xl font-bold">{name}</h1></div><nav className="space-y-1">{nav.map(([href, Icon, label]) => <Link className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-300 hover:bg-muted hover:text-white" href={href as string} key={href as string}><Icon className="h-4 w-4" />{label}</Link>)}</nav><div className="absolute bottom-5 left-5 right-5 space-y-2"><Badge className={snapshot?.source?.startsWith('live') ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300' : 'border-amber-400/30 bg-amber-500/10 text-amber-300'}>{snapshot?.source || 'loading'} mode</Badge><Badge className="ml-2 border-sky-400/30 bg-sky-500/10 text-sky-300">{snapshot?.readOnly === false ? 'mutations enabled' : 'read-only'}</Badge></div></aside><main className="lg:pl-72"><div className="mx-auto max-w-7xl p-5 lg:p-8">{children}</div></main></div>;
}
`);

w('components/views.tsx', `import Link from 'next/link';
import { notFound } from 'next/navigation';
import { discoverAgents, statusTone } from '../lib/data-utils.js';
import { Badge, Button, Card, EmptyState } from './ui';
import { SearchList } from './search-list';
import { DataTable } from './data-table';
import { PerformanceChart } from './charts';
function Header({ title, body }: { title: string; body: string }) { return <div className="mb-6"><p className="text-sm uppercase tracking-[0.35em] text-teal-300">Honcho Memory Ops</p><h2 className="mt-2 text-4xl font-bold">{title}</h2><p className="mt-3 max-w-3xl text-slate-400">{body}</p></div>; }
function Stat({ label, value }: { label: string; value: any }) { return <Card><p className="text-sm text-slate-400">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p></Card>; }
export function HomeView({ snapshot }: { snapshot: any }) { return <><Header title="Self-hosted Honcho mission control" body="A production Next.js dashboard for Hermes memory, agents, sessions, conclusions, webhooks, and performance. Live API data is proxied server-side; demo mode is explicitly labeled."/><div className="grid gap-4 md:grid-cols-4"><Stat label="Workspaces" value={snapshot.workspaces.length}/><Stat label="Peers" value={snapshot.peers.length}/><Stat label="Sessions" value={snapshot.sessions.length}/><Stat label="Conclusions" value={snapshot.conclusions.length}/></div><Card className="mt-6"><h3 className="text-xl font-semibold">Operational guardrails</h3><div className="mt-4 grid gap-3 md:grid-cols-3"><Badge className="border-teal-400/30 bg-teal-500/10 text-teal-300">HONCHO_API_KEY server-side only</Badge><Badge className="border-sky-400/30 bg-sky-500/10 text-sky-300">CORS avoided via /api/honcho proxy</Badge><Badge className="border-amber-400/30 bg-amber-500/10 text-amber-300">Mutations disabled by default</Badge></div></Card></>; }
export function DashboardView({ snapshot }: { snapshot: any }) { return <><Header title="Dashboard" body="Live health, data volume, and recent memory activity across the configured Honcho service."/><div className="grid gap-4 md:grid-cols-3"><Stat label="Source" value={snapshot.source}/><Stat label="API health" value={snapshot.status?.ok ? 'OK' : 'Needs attention'}/><Stat label="Generated" value={new Date(snapshot.generated_at).toLocaleString()}/></div><Card className="mt-6"><h3 className="mb-4 text-xl font-semibold">Recent messages</h3><MessageList messages={snapshot.messages.slice(0, 5)} /></Card></>; }
export function WorkspacesView({ snapshot }: { snapshot: any }) { return <><Header title="Workspaces" body="Browse Honcho workspaces. Search filters real nested fields instead of accepting no-op input."/><SearchList items={snapshot.workspaces} placeholder="Search workspaces..." render={(w) => <Card><Link href={'/workspaces/' + (w.id || w.workspace_id)} className="text-xl font-semibold text-teal-200">{w.name || w.id}</Link><p className="mt-2 text-slate-400">{w.summary || 'No summary available.'}</p></Card>} /></>; }
export function WorkspaceDetail({ snapshot, workspaceId }: { snapshot: any; workspaceId: string }) { const w = snapshot.workspaces.find((item: any) => item.id === workspaceId || item.workspace_id === workspaceId); if (!w) notFound(); const peers = snapshot.peers.filter((p: any) => (p.workspace_id || workspaceId) === workspaceId); const sessions = snapshot.sessions.filter((s: any) => (s.workspace_id || workspaceId) === workspaceId); return <><Header title={w.name || workspaceId} body={w.summary || 'Workspace memory and peer activity.'}/><div className="grid gap-4 md:grid-cols-3"><Stat label="Peers" value={peers.length}/><Stat label="Sessions" value={sessions.length}/><Stat label="Conclusions" value={snapshot.conclusions.filter((c:any)=> (c.workspace_id || workspaceId) === workspaceId).length}/></div><div className="mt-6 flex gap-3"><Link href={'/workspaces/'+workspaceId+'/peers'}><Button>Open peers</Button></Link><Link href={'/workspaces/'+workspaceId+'/sessions'}><Button>Open sessions</Button></Link></div></>; }
export function PeersView({ snapshot, workspaceId }: { snapshot: any; workspaceId: string }) { const peers = snapshot.peers.filter((p:any)=> (p.workspace_id || workspaceId) === workspaceId); return <><Header title="Peers" body={'Peers in workspace ' + workspaceId}/><SearchList items={peers} placeholder="Search peers..." render={(p) => <Card><Link className="text-lg font-semibold text-teal-200" href={'/workspaces/'+workspaceId+'/peers/'+(p.id || p.peer_id)}>{p.name || p.id}</Link><p className="text-sm text-slate-400">{p.metadata?.role || 'peer'}</p></Card>} /></>; }
export function PeerDetail({ snapshot, workspaceId, peerId }: { snapshot: any; workspaceId: string; peerId: string }) { const peer = snapshot.peers.find((p:any)=> (p.id === peerId || p.peer_id === peerId) && ((p.workspace_id || workspaceId) === workspaceId)); if (!peer) notFound(); return <><Header title={peer.name || peerId} body="Peer metadata and related memory."/><Card><pre className="overflow-auto text-sm text-slate-300">{JSON.stringify(peer, null, 2)}</pre></Card></>; }
export function SessionsView({ snapshot, workspaceId }: { snapshot: any; workspaceId: string }) { const sessions = snapshot.sessions.filter((s:any)=> (s.workspace_id || workspaceId) === workspaceId); return <><Header title="Sessions" body={'Sessions in workspace ' + workspaceId}/><SearchList items={sessions} placeholder="Search sessions..." render={(s) => <Card><Link className="text-lg font-semibold text-teal-200" href={'/workspaces/'+workspaceId+'/sessions/'+s.id}>{s.title || s.id}</Link><p className="text-sm text-slate-400">{s.message_count || 0} messages · {s.status || 'unknown'}</p></Card>} /></>; }
export function SessionDetail({ snapshot, workspaceId, sessionId }: { snapshot: any; workspaceId: string; sessionId: string }) { const session = snapshot.sessions.find((s:any)=> s.id === sessionId); if (!session) notFound(); const messages = snapshot.messages.filter((m:any)=> m.session_id === sessionId); return <><Header title={session.title || sessionId} body="Session transcript and state."/><MessageList messages={messages}/></>; }
export function MessageList({ messages }: { messages: any[] }) { return messages.length ? <div className="space-y-3">{messages.map((m) => <Card key={m.id}><div className="flex items-center justify-between"><Badge className="border-slate-400/20 bg-slate-500/10 text-slate-300">{m.role || m.peer_id || 'message'}</Badge><span className="text-xs text-slate-500">{m.created_at}</span></div><p className="mt-3 text-slate-200">{m.content || m.text}</p></Card>)}</div> : <EmptyState title="No messages" body="Honcho returned no messages for this view."/>; }
export function MessagesView({ snapshot }: { snapshot: any }) { return <><Header title="Messages" body="Searchable memory message stream."/><SearchList items={snapshot.messages} placeholder="Search messages..." render={(m) => <Card><p>{m.content || m.text}</p><p className="mt-2 text-xs text-slate-500">{m.workspace_id} / {m.session_id}</p></Card>} /></>; }
export function ConclusionsView({ snapshot }: { snapshot: any }) { return <><Header title="Conclusions" body="Durable Honcho conclusions and confidence provenance."/><SearchList items={snapshot.conclusions} placeholder="Search conclusions..." render={(c) => <Card><p>{c.text || c.content}</p><p className="mt-2 text-xs text-slate-500">confidence {c.confidence ?? 'unavailable'} · provenance {c.source || 'not reported'}</p></Card>} /></>; }
export function ContextView({ snapshot }: { snapshot: any }) { return <><Header title="Context" body="Combined workspace, peer, message, and conclusion context for operators."/><Card><pre className="max-h-[620px] overflow-auto text-xs text-slate-300">{JSON.stringify({ workspaces: snapshot.workspaces, agents: discoverAgents(snapshot.peers), recent_messages: snapshot.messages.slice(0, 10), conclusions: snapshot.conclusions }, null, 2)}</pre></Card></>; }
export function ApiPlaygroundView({ snapshot }: { snapshot: any }) { return <><Header title="API playground" body="Read-only endpoint explorer. Browser requests target the Next.js server proxy, never Honcho directly."/><Card><p className="text-slate-300">Try server proxy paths such as <code>/api/honcho/workspaces</code>, <code>/api/honcho/peers</code>, or <code>/api/honcho/sessions</code>.</p><Button className="mt-4" disabled={snapshot.readOnly}>Mutating requests disabled unless ENABLE_MUTATIONS=true</Button></Card></>; }
export function WebhooksView({ snapshot }: { snapshot: any }) { return <><Header title="Webhooks" body="Webhook configuration preview with read-only safeguards."/><SearchList items={snapshot.webhooks} placeholder="Search webhooks..." render={(w) => <Card><p className="font-semibold">{w.event}</p><p className="text-sm text-slate-400">{w.url}</p><Button className="mt-3" disabled={snapshot.readOnly}>Send test delivery</Button></Card>} /></>; }
export function PerformanceView({ snapshot }: { snapshot: any }) { return <><Header title="Performance" body="Latency, request volume, and error trends."/><Card>{snapshot.performance.length ? <PerformanceChart data={snapshot.performance}/> : <EmptyState title="No performance data" body="Live Honcho metrics endpoint is not configured yet."/>}</Card></>; }
export function SettingsView({ snapshot }: { snapshot: any }) { return <><Header title="Settings" body="Runtime environment and deployment posture without exposing server-side secrets."/><Card><div className="grid gap-3 text-sm"><p>HONCHO_BASE_URL: {snapshot.env.HONCHO_BASE_URL}</p><p>HONCHO_WORKSPACE_ID: {snapshot.env.HONCHO_WORKSPACE_ID || '(all)'}</p><p>USE_DEMO_DATA: {String(snapshot.env.USE_DEMO_DATA)}</p><p>ENABLE_MUTATIONS: {String(snapshot.env.ENABLE_MUTATIONS)}</p><p>HONCHO_API_KEY: {snapshot.env.HONCHO_API_KEY ? 'configured server-side' : 'not configured'}</p></div></Card></>; }
export function AgentsView({ snapshot }: { snapshot: any }) { const agents = discoverAgents(snapshot.peers); return <><Header title="Hermes agents" body="Agents are discovered from peer metadata (type/kind=agent, role, team, status, heartbeat, current goal, assigned task, capabilities); no fixed team is hardcoded."/>{agents.length ? <div className="grid gap-4 md:grid-cols-2">{agents.map((a:any) => <Card key={a.id}><div className="flex items-center justify-between"><h3 className="text-xl font-semibold">{a.name}</h3><Badge className={statusTone(a.status)}>{a.status}</Badge></div><p className="mt-1 text-slate-400">{a.role} · {a.team}</p><p className="mt-3 text-sm">{a.current_goal || 'No current goal reported.'}</p><p className="mt-2 text-xs text-slate-500">Task: {a.assigned_task || 'none'} · heartbeat: {a.heartbeat || 'unknown'}</p><div className="mt-3 flex flex-wrap gap-2">{a.capabilities.map((cap:string) => <Badge className="border-slate-400/20 bg-slate-500/10 text-slate-300" key={cap}>{cap}</Badge>)}</div></Card>)}</div> : <EmptyState title="No agents discovered" body="Add peer metadata type=agent or kind=agent to surface Hermes agents here."/>}</>; }
export function TableView({ title, body, data }: { title: string; body: string; data: any[] }) { return <><Header title={title} body={body}/><DataTable data={data} columns={[{ accessorKey: 'id', header: 'ID' }, { accessorFn: (row) => row.name || row.title || row.status || row.role || '-', header: 'Summary' }, { accessorFn: (row) => row.workspace_id || '-', header: 'Workspace' }]}/></>; }
`);

w('app/layout.tsx', `import './globals.css';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Honcho Mission Control', description: 'Self-hosted Honcho dashboard for Hermes memory orchestration' };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en" className="dark"><body>{children}</body></html>; }
`);
w('app/loading.tsx', `import { Card } from '../components/ui';
export default function Loading() { return <div className="p-8"><Card><p className="animate-pulse text-slate-300">Loading Honcho Mission Control...</p></Card></div>; }
`);
w('app/error.tsx', `'use client';
import { Button, Card } from '../components/ui';
export default function Error({ error, reset }: { error: Error; reset: () => void }) { return <div className="p-8"><Card><h1 className="text-2xl font-bold">Dashboard error</h1><p className="mt-2 text-slate-400">{error.message}</p><Button className="mt-4" onClick={reset}>Retry</Button></Card></div>; }
`);
w('app/not-found.tsx', `import Link from 'next/link';
import { Card } from '../components/ui';
export default function NotFound() { return <div className="p-8"><Card><h1 className="text-3xl font-bold">Route not found</h1><p className="mt-2 text-slate-400">Unknown routes intentionally render this fallback instead of the dashboard overview.</p><Link className="mt-4 inline-block text-teal-300" href="/dashboard">Return to dashboard</Link></Card></div>; }
`);

const page = (view, importName = view) => `import { Shell } from '../components/shell';\nimport { getHonchoSnapshot } from '../lib/honcho-client.js';\nimport { ${importName} } from '../components/views';\nexport default async function Page() { const snapshot = await getHonchoSnapshot(); return <Shell snapshot={snapshot}><${view} snapshot={snapshot}/></Shell>; }`;
w('app/page.tsx', page('HomeView'));
w('app/dashboard/page.tsx', page('DashboardView'));
w('app/workspaces/page.tsx', page('WorkspacesView'));
w('app/messages/page.tsx', page('MessagesView'));
w('app/conclusions/page.tsx', page('ConclusionsView'));
w('app/context/page.tsx', page('ContextView'));
w('app/api-playground/page.tsx', page('ApiPlaygroundView'));
w('app/webhooks/page.tsx', page('WebhooksView'));
w('app/performance/page.tsx', page('PerformanceView'));
w('app/settings/page.tsx', page('SettingsView'));
w('app/agents/page.tsx', page('AgentsView'));
w('app/workspaces/[workspaceId]/page.tsx', `import { Shell } from '../../../components/shell';
import { getHonchoSnapshot } from '../../../lib/honcho-client.js';
import { WorkspaceDetail } from '../../../components/views';
export default async function Page({ params }: { params: Promise<{ workspaceId: string }> }) { const { workspaceId } = await params; const snapshot = await getHonchoSnapshot(); return <Shell snapshot={snapshot}><WorkspaceDetail snapshot={snapshot} workspaceId={workspaceId}/></Shell>; }
`);
w('app/workspaces/[workspaceId]/peers/page.tsx', `import { Shell } from '../../../../components/shell';
import { getHonchoSnapshot } from '../../../../lib/honcho-client.js';
import { PeersView } from '../../../../components/views';
export default async function Page({ params }: { params: Promise<{ workspaceId: string }> }) { const { workspaceId } = await params; const snapshot = await getHonchoSnapshot(); return <Shell snapshot={snapshot}><PeersView snapshot={snapshot} workspaceId={workspaceId}/></Shell>; }
`);
w('app/workspaces/[workspaceId]/peers/[peerId]/page.tsx', `import { Shell } from '../../../../../components/shell';
import { getHonchoSnapshot } from '../../../../../lib/honcho-client.js';
import { PeerDetail } from '../../../../../components/views';
export default async function Page({ params }: { params: Promise<{ workspaceId: string; peerId: string }> }) { const { workspaceId, peerId } = await params; const snapshot = await getHonchoSnapshot(); return <Shell snapshot={snapshot}><PeerDetail snapshot={snapshot} workspaceId={workspaceId} peerId={peerId}/></Shell>; }
`);
w('app/workspaces/[workspaceId]/sessions/page.tsx', `import { Shell } from '../../../../components/shell';
import { getHonchoSnapshot } from '../../../../lib/honcho-client.js';
import { SessionsView } from '../../../../components/views';
export default async function Page({ params }: { params: Promise<{ workspaceId: string }> }) { const { workspaceId } = await params; const snapshot = await getHonchoSnapshot(); return <Shell snapshot={snapshot}><SessionsView snapshot={snapshot} workspaceId={workspaceId}/></Shell>; }
`);
w('app/workspaces/[workspaceId]/sessions/[sessionId]/page.tsx', `import { Shell } from '../../../../../components/shell';
import { getHonchoSnapshot } from '../../../../../lib/honcho-client.js';
import { SessionDetail } from '../../../../../components/views';
export default async function Page({ params }: { params: Promise<{ workspaceId: string; sessionId: string }> }) { const { workspaceId, sessionId } = await params; const snapshot = await getHonchoSnapshot(); return <Shell snapshot={snapshot}><SessionDetail snapshot={snapshot} workspaceId={workspaceId} sessionId={sessionId}/></Shell>; }
`);
w('app/api/honcho/[...path]/route.ts', `import { NextRequest, NextResponse } from 'next/server';
import { getDashboardEnv } from '../../../../lib/env.js';
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
async function proxy(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  const env = getDashboardEnv();
  if (MUTATING.has(request.method) && !env.ENABLE_MUTATIONS) return NextResponse.json({ ok: false, error: 'mutations-disabled', message: 'Set ENABLE_MUTATIONS=true to enable write operations.' }, { status: 403 });
  const { path = [] } = await context.params;
  const base = env.HONCHO_BASE_URL.endsWith('/') ? env.HONCHO_BASE_URL : env.HONCHO_BASE_URL + '/';
  const url = new URL(path.join('/'), base);
  request.nextUrl.searchParams.forEach((value, key) => url.searchParams.set(key, value));
  const headers: Record<string, string> = { accept: 'application/json' };
  if (env.HONCHO_API_KEY) headers.authorization = 'Bearer ' + env.HONCHO_API_KEY;
  const init: RequestInit = { method: request.method, headers, cache: 'no-store' };
  if (MUTATING.has(request.method)) { init.body = await request.text(); headers['content-type'] = request.headers.get('content-type') || 'application/json'; }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const body = await response.text();
    return new NextResponse(body, { status: response.status, headers: { 'content-type': response.headers.get('content-type') || 'application/json', 'cache-control': 'no-store' } });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.name === 'AbortError' ? 'timeout' : 'offline', message: 'Honcho API request failed safely.' }, { status: 502 });
  } finally { clearTimeout(timeout); }
}
export const GET = proxy; export const POST = proxy; export const PUT = proxy; export const PATCH = proxy; export const DELETE = proxy;
`);

w('.env.example', `HONCHO_BASE_URL=http://localhost:8000
HONCHO_API_KEY=
HONCHO_WORKSPACE_ID=
ENABLE_MUTATIONS=false
USE_DEMO_DATA=false
NEXT_PUBLIC_DASHBOARD_NAME=Honcho Mission Control
`);
w('Dockerfile', `FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci
FROM deps AS builder
WORKDIR /app
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
`);
w('docker-compose.dashboard.yml', `services:
  honcho-mission-control:
    build: .
    ports: ["3000:3000"]
    environment:
      HONCHO_BASE_URL: "\${HONCHO_BASE_URL:-http://localhost:8000}"
      HONCHO_API_KEY: "\${HONCHO_API_KEY:-}"
      HONCHO_WORKSPACE_ID: "\${HONCHO_WORKSPACE_ID:-example-workspace}"
      ENABLE_MUTATIONS: "\${ENABLE_MUTATIONS:-false}"
      USE_DEMO_DATA: "\${USE_DEMO_DATA:-false}"
      NEXT_PUBLIC_DASHBOARD_NAME: "\${NEXT_PUBLIC_DASHBOARD_NAME:-Honcho Mission Control}"
    restart: unless-stopped
`);
w('public/.gitkeep', `keep
`);

for (const [path, content] of files) { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, content.endsWith('\n') ? content : content + '\n'); }
console.log(`wrote ${files.size} files`);
