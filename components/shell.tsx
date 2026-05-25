'use client';

import type { ComponentType, ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, Bot, Brain, Gauge, Home, MessageSquare, Network, Settings, TestTube, Webhook } from 'lucide-react';
import { Badge, cn } from './ui';

type NavItem = [href: string, Icon: ComponentType<{ className?: string }>, label: string];

const navGroups: { label: string; items: NavItem[] }[] = [
  { label: 'Overview', items: [ ['/', Home, 'Home'], ['/dashboard', Gauge, 'Dashboard'], ['/workspaces', Network, 'Workspaces'], ['/agents', Bot, 'Agents'] ] },
  { label: 'Memory', items: [ ['/messages', MessageSquare, 'Messages'], ['/conclusions', Brain, 'Conclusions'], ['/context', Activity, 'Context'] ] },
  { label: 'Operations', items: [ ['/api-playground', TestTube, 'API'], ['/webhooks', Webhook, 'Webhooks'], ['/performance', Activity, 'Performance'], ['/settings', Settings, 'Settings'] ] }
];
const navItems = navGroups.flatMap((group) => group.items);

export function Shell({ children, snapshot }: { children: ReactNode; snapshot?: any }) {
  const name = snapshot?.env?.NEXT_PUBLIC_DASHBOARD_NAME || 'Honcho Mission Control';
  const pathname = usePathname();
  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href);
  const modeClass = snapshot?.source?.startsWith('live') ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300' : 'border-amber-400/30 bg-amber-500/10 text-amber-300';

  return <div className="min-h-screen">
    <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-border bg-slate-950/80 p-5 backdrop-blur lg:block">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.4em] text-teal-300">Hermes</p>
        <h1 className="mt-2 text-2xl font-bold">{name}</h1>
        <p className="mt-2 text-xs text-slate-500">Public-safe control room for Honcho memory and agents.</p>
      </div>
      <nav className="space-y-5">
        {navGroups.map((group) => <div key={group.label}>
          <p className="mb-2 px-3 text-[0.65rem] uppercase tracking-[0.25em] text-slate-500">{group.label}</p>
          <div className="space-y-1">
            {group.items.map(([href, Icon, label]) => <Link aria-current={isActive(href) ? 'page' : undefined} className={cn('flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-300 transition hover:bg-muted hover:text-white', isActive(href) && 'bg-teal-500/10 text-teal-100 ring-1 ring-teal-400/20')} href={href} key={href}><Icon className="h-4 w-4" />{label}</Link>)}
          </div>
        </div>)}
      </nav>
      <div className="absolute bottom-5 left-5 right-5 space-y-2">
        <Badge className={modeClass}>{snapshot?.source || 'loading'} mode</Badge>
        <Badge className="ml-2 border-sky-400/30 bg-sky-500/10 text-sky-300">{snapshot?.readOnly === false ? 'mutations enabled' : 'read-only'}</Badge>
        <p className="text-xs text-slate-500">{snapshot?.status?.ok ? 'Honcho API reachable' : 'Using fallback or waiting on Honcho'}</p>
      </div>
    </aside>
    <div className="sticky top-0 z-10 border-b border-border bg-slate-950/85 p-3 backdrop-blur lg:hidden">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div><p className="text-xs uppercase tracking-[0.3em] text-teal-300">Hermes</p><h1 className="font-semibold">{name}</h1></div>
        <Badge className={modeClass}>{snapshot?.source || 'loading'}</Badge>
      </div>
      <nav className="flex gap-2 overflow-x-auto pb-1">
        {navItems.map(([href, Icon, label]) => <Link className={cn('flex shrink-0 items-center gap-2 rounded-full border border-border px-3 py-2 text-xs text-slate-300', isActive(href) && 'border-teal-400/40 bg-teal-500/10 text-teal-100')} href={href} key={href}><Icon className="h-3.5 w-3.5" />{label}</Link>)}
      </nav>
    </div>
    <main className="lg:pl-72"><div className="mx-auto max-w-7xl p-5 lg:p-8">{children}</div></main>
  </div>;
}
