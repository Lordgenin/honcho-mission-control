import Link from 'next/link';
import { Card } from '../components/ui';
export default function NotFound() { return <div className="p-8"><Card><h1 className="text-3xl font-bold">Route not found</h1><p className="mt-2 text-slate-400">Unknown routes intentionally render this fallback instead of the dashboard overview.</p><Link className="mt-4 inline-block text-teal-300" href="/dashboard">Return to dashboard</Link></Card></div>; }
