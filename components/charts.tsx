'use client';
import { useEffect, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
export function PerformanceChart({ data }: { data: any[] }) {
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- avoids Recharts ResponsiveContainer SSR width warnings during static prerender.
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-72 rounded-xl border border-border bg-slate-950/40" />;
  return <div className="h-72"><ResponsiveContainer><AreaChart data={data}><defs><linearGradient id="latency" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#14b8a6" stopOpacity={0.8}/><stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#334155"/><XAxis dataKey="label" stroke="#94a3b8"/><YAxis stroke="#94a3b8"/><Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155' }}/><Area type="monotone" dataKey="latency_ms" stroke="#14b8a6" fill="url(#latency)" /></AreaChart></ResponsiveContainer></div>;
}
