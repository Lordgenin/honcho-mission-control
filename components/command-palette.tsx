'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { filterCollection } from '../lib/data-utils.js';
import { cn } from './ui';

export type CommandTarget = {
  href: string;
  label: string;
  group: string;
  description: string;
  keywords?: string[];
};

const MAX_RESULTS = 8;

export const commandTargets: CommandTarget[] = [
  { href: '/', label: 'Home', group: 'Overview', description: 'Landing page and first-run orientation', keywords: ['start', 'overview'] },
  { href: '/dashboard', label: 'Dashboard', group: 'Overview', description: 'System status, health, freshness, and recent activity', keywords: ['health', 'status'] },
  { href: '/workspaces', label: 'Workspaces', group: 'Memory', description: 'Browse workspace records and drill into peers or sessions', keywords: ['workspace', 'project'] },
  { href: '/agents', label: 'Agents', group: 'Memory', description: 'Hermes agents, current tasks, heartbeat, and activity', keywords: ['peers', 'kanban', 'tasks'] },
  { href: '/messages', label: 'Messages', group: 'Memory', description: 'Search the message stream', keywords: ['chat', 'transcript'] },
  { href: '/conclusions', label: 'Conclusions', group: 'Memory', description: 'Durable memory conclusions with provenance labels', keywords: ['memory', 'facts'] },
  { href: '/context', label: 'Context', group: 'Memory', description: 'Minimized operator context summary', keywords: ['summary', 'prompt'] },
  { href: '/api-playground', label: 'API playground', group: 'Operations', description: 'Read-only proxy endpoint guidance', keywords: ['proxy', 'endpoint'] },
  { href: '/webhooks', label: 'Webhooks', group: 'Operations', description: 'Webhook preview with mutation safeguards', keywords: ['events', 'delivery'] },
  { href: '/performance', label: 'Performance', group: 'Operations', description: 'Request telemetry and trend availability', keywords: ['latency', 'errors'] },
  { href: '/settings', label: 'Settings', group: 'Operations', description: 'Runtime posture without secrets or private paths', keywords: ['config', 'posture'] }
];

export function CommandPalette() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  const results = useMemo(() => {
    const filtered = filterCollection(commandTargets, query) as CommandTarget[];
    return filtered.slice(0, MAX_RESULTS);
  }, [query]);

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === 'Escape') {
        setOpen(false);
        setQuery('');
        setActiveIndex(0);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setOpen(false);
      setQuery('');
      setActiveIndex(0);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    const timer = window.setTimeout(() => setActiveIndex(0), 0);
    return () => window.clearTimeout(timer);
  }, [query]);

  const close = () => {
    setOpen(false);
    setQuery('');
    setActiveIndex(0);
  };

  const onInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => results.length ? (index + 1) % results.length : 0);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => results.length ? (index - 1 + results.length) % results.length : 0);
      return;
    }
    if (event.key === 'Enter') {
      if (!results.length) return;
      event.preventDefault();
      window.location.assign(results[activeIndex]?.href || results[0].href);
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  };

  return <>
    <button
      type="button"
      className="inline-flex items-center gap-2 rounded-xl border border-border bg-slate-950/70 px-3 py-2 text-sm text-slate-200 transition hover:border-teal-400/40 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
      aria-label="Open command palette"
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={() => setOpen(true)}
    >
      <Search aria-hidden="true" className="h-4 w-4" />
      <span className="hidden sm:inline">Search routes and actions</span>
      <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[0.65rem] text-slate-300">Ctrl K</kbd>
    </button>
    {open ? <div
      className="fixed inset-0 z-50 bg-slate-950/75 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="mx-auto mt-20 max-w-2xl rounded-2xl border border-border bg-slate-950 shadow-2xl shadow-black/40"
      >
        <div className="flex items-center gap-3 border-b border-border p-4">
          <Search aria-hidden="true" className="h-5 w-5 text-teal-300" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onInputKeyDown}
            aria-label="Search command targets"
            aria-controls="command-palette-results"
            aria-activedescendant={results.length ? `command-result-${activeIndex}` : undefined}
            className="min-w-0 flex-1 bg-transparent text-base text-slate-100 outline-none placeholder:text-slate-500"
            placeholder="Search pages, agents, messages, settings..."
          />
          <button type="button" aria-label="Close command palette" className="rounded-lg p-2 text-slate-300 hover:bg-muted hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300" onClick={close}>
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
        <div id="command-palette-results" role="listbox" aria-label="Command palette results" className="max-h-[60vh] overflow-y-auto p-2" tabIndex={-1}>
          {results.length ? results.map((item, index) => <Link
            id={`command-result-${index}`}
            role="option"
            aria-selected={index === activeIndex}
            className={cn('block rounded-xl p-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300', index === activeIndex ? 'bg-teal-500/15 text-teal-50' : 'text-slate-200 hover:bg-muted/70')}
            href={item.href}
            key={item.href}
            onMouseEnter={() => setActiveIndex(index)}
            onClick={close}
          >
            <span className="text-xs uppercase tracking-[0.25em] text-teal-300">{item.group}</span>
            <span className="mt-1 block font-semibold">{item.label}</span>
            <span className="mt-1 block text-sm text-slate-400">{item.description}</span>
          </Link>) : <div className="rounded-xl border border-dashed border-border p-6 text-center" role="status">
            <p className="font-semibold text-slate-100">No results</p>
            <p className="mt-2 text-sm text-slate-400">No route or command matches “{query}”. Escape closes and clears the palette.</p>
          </div>}
        </div>
      </div>
    </div> : null}
  </>;
}
