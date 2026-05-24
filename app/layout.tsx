import './globals.css';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Honcho Mission Control', description: 'Self-hosted Honcho dashboard for Hermes memory orchestration' };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en" className="dark"><body>{children}</body></html>; }
