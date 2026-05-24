import * as React from 'react';
import { twMerge } from 'tailwind-merge';
import { clsx, type ClassValue } from 'clsx';
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn('rounded-2xl border border-border bg-card/80 p-5 shadow-glow backdrop-blur', className)} {...props} />; }
export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) { return <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium', className)} {...props} />; }
export function Button({ className, disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) { return <button disabled={disabled} className={cn('rounded-lg border border-border bg-muted px-3 py-2 text-sm transition hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-45', className)} {...props} />; }
export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) { return <input className="w-full rounded-xl border border-border bg-slate-950/60 px-3 py-2 text-sm outline-none ring-primary/40 focus:ring-2" {...props} />; }
export function EmptyState({ title, body }: { title: string; body: string }) { return <Card className="border-dashed text-center"><h3 className="text-lg font-semibold">{title}</h3><p className="mt-2 text-sm text-slate-400">{body}</p></Card>; }
