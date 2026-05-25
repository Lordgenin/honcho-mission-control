'use client';
import { useMemo, useState } from 'react';
import { filterCollection } from '../lib/data-utils.js';
import { EmptyState, Input } from './ui';
export function SearchList({ items, render, placeholder = 'Search...' }: { items: any[]; render: (item: any) => React.ReactNode; placeholder?: string }) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => filterCollection(items, query) as any[], [items, query]);
  if (!items.length) return <EmptyState title="No records yet" body="Honcho returned an empty list for this view. Check the dashboard status or connect a workspace to populate it." />;
  return <div className="space-y-4"><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={placeholder} aria-label="Search" />{filtered.length ? <div className="grid gap-3">{filtered.map((item, index) => <div key={item.id || index}>{render(item)}</div>)}</div> : <EmptyState title="No matches" body="Search is active; adjust the query or clear it to see all records." />}</div>;
}
