import Link from 'next/link';
import { Card } from '../components/ui';

export default function NotFound() {
  return <main className="min-h-screen bg-slate-950 p-6 text-slate-100">
    <div className="mx-auto flex min-h-[80vh] max-w-3xl items-center">
      <Card className="w-full border-teal-400/20 bg-slate-950/85">
        <p className="text-xs uppercase tracking-[0.35em] text-teal-300">Honcho Mission Control</p>
        <h1 className="mt-3 text-4xl font-bold">Route not found</h1>
        <p className="mt-3 text-slate-300">This is the app-level 404. The requested dashboard path is not a raw host error, and no private runtime details are exposed.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="rounded-lg border border-border bg-muted px-3 py-2 text-sm text-slate-100 transition hover:bg-accent/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300" href="/dashboard">Return to dashboard</Link>
          <Link className="rounded-lg border border-border px-3 py-2 text-sm text-slate-100 transition hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300" href="/settings">Review safe settings</Link>
        </div>
      </Card>
    </div>
  </main>;
}
