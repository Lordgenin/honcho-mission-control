'use client';
import { Button, Card } from '../components/ui';
export default function Error({ error, reset }: { error: Error; reset: () => void }) { return <div className="p-8"><Card><h1 className="text-2xl font-bold">Dashboard error</h1><p className="mt-2 text-slate-400">{error.message}</p><Button className="mt-4" onClick={reset}>Retry</Button></Card></div>; }
