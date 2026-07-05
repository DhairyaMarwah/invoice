import Link from 'next/link';
import { listClients, clientStatusCounts } from '@/lib/repo';
import { PageHeader, EmptyState, ClientStatusPill } from '@/components/ui';
import { FilterBar } from '@/components/FilterBar';
import { RowLink } from '@/components/RowLink';
import { StatCard } from '@/components/Charts';
import { money, initials, CLIENT_STATUS } from '@/lib/format';
import type { ClientStatus } from '@/lib/types';
import { IconPlus, IconClients } from '@/components/icons';

export const dynamic = 'force-dynamic';

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const clients = listClients({ status: sp.status, q: sp.q });
  const mix = clientStatusCounts();
  const total = Object.values(mix).reduce((a, b) => a + b, 0);

  const segments = [
    { value: 'all', label: 'All', count: total },
    ...(Object.keys(CLIENT_STATUS) as ClientStatus[]).map((k) => ({
      value: k,
      label: CLIENT_STATUS[k].label,
      count: mix[k] ?? 0,
    })),
  ];

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle="Every account, its contracts, and what it owes"
        actions={
          <Link href="/clients/new" className="btn btn-primary focus-ring">
            <IconPlus width={15} height={15} /> New Client
          </Link>
        }
      />
      <div className="mx-auto max-w-[1200px] px-5 py-5">
        <div className="mb-4">
          <FilterBar searchPlaceholder="Search clients…" segments={segments} />
        </div>

        {clients.length === 0 ? (
          <EmptyState
            icon={<IconClients width={22} height={22} />}
            title={sp.q || sp.status ? 'No clients match' : 'No clients yet'}
            hint={sp.q || sp.status ? 'Try clearing the filters or search.' : 'Add your first client to start housing contracts and invoices under it.'}
            action={<Link href="/clients/new" className="btn btn-primary focus-ring"><IconPlus width={15} height={15} /> New Client</Link>}
          />
        ) : (
          <div className="rise">
          <StatCard icon={<IconClients width={12} height={12} />} label={`Clients · ${clients.length}`}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Status</th>
                  <th className="text-right">Contracts</th>
                  <th className="text-right">Invoiced</th>
                  <th className="text-right">Collected</th>
                  <th className="text-right">Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <RowLink key={c.id} href={`/clients/${c.id}`}>
                    <td>
                      <Link href={`/clients/${c.id}`} className="flex items-center gap-3">
                        <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-panel-2 text-[11px] font-semibold text-muted" style={{ boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                          {initials(c.name)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-fg">{c.name}</span>
                          {c.email && <span className="block truncate text-[12px] text-faint">{c.email}</span>}
                        </span>
                      </Link>
                    </td>
                    <td><ClientStatusPill status={c.status} /></td>
                    <td className="num text-right text-muted">{c.contract_count}</td>
                    <td className="num text-right">{money(c.invoiced, c.currency)}</td>
                    <td className="num text-right text-[var(--ok-text)]">{money(c.collected, c.currency)}</td>
                    <td className="num text-right font-medium">{c.outstanding > 0 ? money(c.outstanding, c.currency) : <span className="text-faint">—</span>}</td>
                  </RowLink>
                ))}
              </tbody>
            </table>
          </StatCard>
          </div>
        )}
      </div>
    </div>
  );
}
