import Link from 'next/link';
import { listClients, clientStageCounts } from '@/lib/repo';
import { PageHeader, EmptyState, SalesStagePill, SegmentPill } from '@/components/ui';
import { FilterBar } from '@/components/FilterBar';
import { RowLink } from '@/components/RowLink';
import { StatCard } from '@/components/Charts';
import { money, initials, fmtRelative, SALES_STAGE, SALES_STAGE_ORDER, CLIENT_SEGMENT } from '@/lib/format';
import type { ClientSegment } from '@/lib/types';
import { IconPlus, IconClients } from '@/components/icons';

export const dynamic = 'force-dynamic';

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; stage?: string; segment?: string; q?: string }>;
}) {
  const sp = await searchParams;
  // The segmented filter drives sales stage; `status` param name is reused for it.
  const clients = listClients({ stage: sp.status, segment: sp.segment, q: sp.q });
  const mix = clientStageCounts();
  const total = Object.values(mix).reduce((a, b) => a + b, 0);

  const segments = [
    { value: 'all', label: 'All', count: total },
    ...SALES_STAGE_ORDER.map((k) => ({ value: k, label: SALES_STAGE[k].short, count: mix[k] ?? 0 })),
  ];
  const selects = [
    { key: 'segment', label: 'Type', options: [{ value: 'all', label: 'All types' }, ...(Object.keys(CLIENT_SEGMENT) as ClientSegment[]).map((k) => ({ value: k, label: CLIENT_SEGMENT[k].label }))] },
  ];

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle="Every account — pipeline stage, engagement, and what it owes"
        actions={<Link href="/clients/new" className="btn btn-primary focus-ring"><IconPlus width={15} height={15} /> New Client</Link>}
      />
      <div className="mx-auto max-w-[1200px] px-5 py-5">
        <div className="mb-4"><FilterBar searchPlaceholder="Search clients…" segments={segments} selects={selects} /></div>

        {clients.length === 0 ? (
          <EmptyState
            icon={<IconClients width={22} height={22} />}
            title={sp.q || sp.status || sp.segment ? 'No clients match' : 'No clients yet'}
            hint={sp.q || sp.status || sp.segment ? 'Try clearing the filters or search.' : 'Add your first client to start tracking the engagement, contracts, and invoices.'}
            action={<Link href="/clients/new" className="btn btn-primary focus-ring"><IconPlus width={15} height={15} /> New Client</Link>}
          />
        ) : (
          <div className="rise">
            <StatCard icon={<IconClients width={12} height={12} />} label={`Clients · ${clients.length}`}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Stage</th>
                    <th>Type</th>
                    <th>Source</th>
                    <th>Last activity</th>
                    <th className="text-right">Projected</th>
                    <th className="text-right">Outstanding</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c) => (
                    <RowLink key={c.id} href={`/clients/${c.id}`}>
                      <td>
                        <span className="flex items-center gap-3">
                          <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-panel-2 text-[11px] font-semibold text-muted" style={{ boxShadow: 'inset 0 0 0 1px var(--border)' }}>{initials(c.name)}</span>
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-fg">{c.name}</span>
                            {c.locations && <span className="block truncate text-[12px] text-faint">{c.locations}</span>}
                          </span>
                        </span>
                      </td>
                      <td><SalesStagePill stage={c.sales_stage} short /></td>
                      <td>{c.segment ? <SegmentPill segment={c.segment} /> : <span className="text-faint">—</span>}</td>
                      <td className="text-[12.5px] text-muted">{c.source || <span className="text-faint">—</span>}</td>
                      <td className="text-[12px] text-faint">{c.last_activity_at ? fmtRelative(c.last_activity_at) : '—'}</td>
                      <td className="num text-right">{c.projected_value != null ? money(c.projected_value, c.currency) : <span className="text-faint">—</span>}</td>
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
