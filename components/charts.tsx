'use client';
import { useEffect, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getPerformanceMetricConfig } from '../lib/data-utils.js';
export function PerformanceChart({ data }: { data: any[] }) {
  const [mounted, setMounted] = useState(false);
  const metric = getPerformanceMetricConfig(data);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- avoids Recharts ResponsiveContainer SSR width warnings during static prerender.
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-72 rounded-xl border border-border bg-slate-950/40" />;
  return <div><p className="mb-3 text-sm text-slate-400">Showing {metric.label}; unit: {metric.unit || 'n/a'}. Live latency is not inferred from queue counts.</p><div className="h-72"><ResponsiveContainer><AreaChart data={data}><defs><linearGradient id="metric" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#14b8a6" stopOpacity={0.8}/><stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#334155"/><XAxis dataKey="label" stroke="#94a3b8"/><YAxis stroke="#94a3b8"/><Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155' }}/><Area type="monotone" dataKey={metric.key} stroke="#14b8a6" fill="url(#metric)" /></AreaChart></ResponsiveContainer></div></div>;
}
