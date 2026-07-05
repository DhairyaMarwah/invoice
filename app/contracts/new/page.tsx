import Link from 'next/link';
import { listClients } from '@/lib/repo';
import { PageHeader, EmptyState, ClientStatusPill } from '@/components/ui';
import { initials } from '@/lib/format';
import { IconArrowRight, IconClients, IconPlus } from '@/components/icons';

export const dynamic = 'force-dynamic';

export default function PickClientForContractPage() {
  const clients = listClients();

  return (
    <div>
      <PageHeader
        title="New Contract"
        crumbs={[{ href: '/contracts', label: 'Contracts' }, { label: 'New' }]}
        subtitle="A contract lives under a client — pick who it's with"
      />
      <div className="mx-auto max-w-[720px] px-5 py-5">
        {clients.length === 0 ? (
          <EmptyState
            icon={<IconClients width={20} height={20} />}
            title="No clients yet"
            hint="Create the client first, then attach their signed contract."
            action={<Link href="/clients/new" className="btn btn-primary focus-ring"><IconPlus width={14} height={14} /> New Client</Link>}
          />
        ) : (
          <div className="rise flex flex-col gap-2">
            {clients.map((c) => (
              <Link key={c.id} href={`/clients/${c.id}/contracts/new`} className="card focus-ring group flex items-center gap-3 p-3 transition-[border-color] duration-100 hover:border-border-strong">
                <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-panel-2 text-[11px] font-semibold text-muted" style={{ boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                  {initials(c.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2"><span className="truncate text-[13px] font-medium">{c.name}</span><ClientStatusPill status={c.status} /></span>
                  <span className="t-small text-faint">{c.contract_count} contract{c.contract_count === 1 ? '' : 's'}</span>
                </span>
                <IconArrowRight width={15} height={15} className="flex-none text-faint transition-transform duration-100 group-hover:translate-x-0.5" />
              </Link>
            ))}
            <Link href="/clients/new" className="focus-ring flex items-center justify-center gap-2 rounded-md border border-dashed border-border-strong py-3 text-[12.5px] font-medium text-faint transition-colors duration-100 hover:border-fg-faint hover:text-fg">
              <IconPlus width={13} height={13} /> New client
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
