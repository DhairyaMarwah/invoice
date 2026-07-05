'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  IconOverview,
  IconClients,
  IconContracts,
  IconInvoices,
  IconReports,
  IconSettings,
  IconPlus,
} from './icons';
import { ThemeToggle } from './ThemeToggle';

interface NavCounts {
  clients: number;
  contracts: number;
  invoices: number;
}

const NAV = [
  { href: '/', label: 'Overview', Icon: IconOverview, key: null },
  { href: '/clients', label: 'Clients', Icon: IconClients, key: 'clients' as const },
  { href: '/contracts', label: 'Contracts', Icon: IconContracts, key: 'contracts' as const },
  { href: '/invoices', label: 'Invoices', Icon: IconInvoices, key: 'invoices' as const },
  { href: '/reports', label: 'Reports', Icon: IconReports, key: null },
];

export function Sidebar({ counts, org }: { counts: NavCounts; org: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/');

  // "i" anywhere (outside a field) → new invoice. Keeps the kbd hint honest.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      if (e.key === 'i' || e.key === 'I') { e.preventDefault(); router.push('/invoices/new'); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router]);

  return (
    <aside className="no-print flex h-screen w-[220px] flex-none flex-col border-r border-border bg-bg-subtle px-2 pb-2 pt-2.5">
      <Link href="/" className="focus-ring mb-2.5 flex items-center gap-2 rounded-md px-1.5 py-1">
        <span className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-[5px] bg-fg text-bg">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 18c4-9 12-9 16 0" /><path d="M12 4v14" />
          </svg>
        </span>
        <span className="t-h4 truncate">{org || 'Ledger'}</span>
        <span className="t-eyebrow ml-auto pr-0.5 !text-[9.5px]">Ledger</span>
      </Link>

      <Link href="/invoices/new" className="btn btn-secondary focus-ring mb-3 w-full !justify-start !gap-2 !px-2.5 text-muted">
        <IconPlus width={14} height={14} />
        New Invoice
        <span className="kbd ml-auto">I</span>
      </Link>

      <nav className="flex flex-col gap-px" aria-label="Main">
        {NAV.map(({ href, label, Icon, key }) => (
          <Link key={href} href={href} className={`nav-item focus-ring ${isActive(href) ? 'active' : ''}`} aria-current={isActive(href) ? 'page' : undefined}>
            <Icon width={15} height={15} />
            <span>{label}</span>
            {key && <span className="nav-count">{counts[key]}</span>}
          </Link>
        ))}
      </nav>

      <div className="flex-1" />

      <div className="flex flex-col gap-px border-t border-border pt-1.5">
        <Link href="/settings" className={`nav-item focus-ring ${isActive('/settings') ? 'active' : ''}`}>
          <IconSettings width={15} height={15} />
          <span>Settings</span>
        </Link>
        <ThemeToggle />
      </div>
    </aside>
  );
}
