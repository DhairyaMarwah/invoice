import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Instrument_Serif } from 'next/font/google';

const instrumentSerif = Instrument_Serif({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-instrument-serif',
  display: 'swap',
});
import './globals.css';
import { Sidebar } from '@/components/Sidebar';
import { counts, getSettings, approvalCounts } from '@/lib/repo';

export const metadata: Metadata = {
  title: 'Ledger — Contracts & Invoices',
  description: 'Single point of management for clients, contracts, and invoices.',
};

// Set the theme before paint to avoid a flash of the wrong colour scheme.
const themeScript = `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');}}catch(e){}})();`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const c = { ...(await counts()), pendingApprovals: (await approvalCounts()).pending };
  const org = (await getSettings()).org_name;

  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} ${instrumentSerif.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <div className="flex h-screen overflow-hidden">
          <Sidebar counts={c} org={org} />
          <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}
