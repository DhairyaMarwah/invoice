import Link from 'next/link';
import { listContracts } from '@/lib/repo';
import { PageHeader, EmptyState, ContractStatusPill, Pill } from '@/components/ui';
import { FilterBar } from '@/components/FilterBar';
import { RowLink } from '@/components/RowLink';
import { StatCard } from '@/components/Charts';
import { productLabel, productCategory } from '@/lib/products';
import { money, fmtDate, BILLING_CYCLE, CONTRACT_STATUS } from '@/lib/format';
import type { ContractStatus } from '@/lib/types';
import { IconContracts, IconPlus } from '@/components/icons';

export const dynamic = 'force-dynamic';

export default async function ContractsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const contracts = await listContracts({ status: sp.status, q: sp.q });

  const segments = [
    { value: 'all', label: 'All' },
    ...(Object.keys(CONTRACT_STATUS) as ContractStatus[]).map((k) => ({ value: k, label: CONTRACT_STATUS[k].label })),
  ];

  return (
    <div>
      <PageHeader
        title="Contracts"
        subtitle="Every contract across all clients"
        actions={<Link href="/contracts/new" className="btn btn-primary focus-ring"><IconPlus width={14} height={14} /> New Contract</Link>}
      />
      <div className="mx-auto max-w-[1200px] px-5 py-5">
        <div className="mb-3"><FilterBar searchPlaceholder="Search contracts…" segments={segments} /></div>

        {contracts.length === 0 ? (
          <EmptyState
            icon={<IconContracts width={20} height={20} />}
            title={sp.q || sp.status ? 'No contracts match' : 'No contracts yet'}
            hint="Pick the client, upload the signed PDF, and Ledger pre-fills the rest."
            action={<Link href="/contracts/new" className="btn btn-primary focus-ring"><IconPlus width={14} height={14} /> New Contract</Link>}
          />
        ) : (
          <div className="rise">
          <StatCard icon={<IconContracts width={12} height={12} />} label={`Contracts · ${contracts.length}`}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Contract</th><th>Client</th><th>Product</th><th>Billing</th><th>Validity</th>
                  <th className="text-right">Value</th><th className="text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((ct) => (
                  <RowLink key={ct.id} href={`/contracts/${ct.id}`}>
                    <td><span className="block max-w-[220px] truncate font-medium text-fg">{ct.title}</span>{ct.party && <span className="t-small block truncate text-faint">{ct.party}</span>}</td>
                    <td className="text-muted"><Link href={`/clients/${ct.client_id}`} className="hover:text-accent-text">{ct.client_name}</Link></td>
                    <td>{ct.product ? <Pill tone={productCategory(ct.product)?.tone ?? 'neu'} dot={false}>{productLabel(ct.product)}</Pill> : <span className="text-faint">—</span>}</td>
                    <td className="text-muted">{BILLING_CYCLE[ct.billing_cycle].label}</td>
                    <td className="num text-[12px] text-muted">{fmtDate(ct.start_date)} → {fmtDate(ct.end_date)}</td>
                    <td className="num text-right font-medium">{money(ct.amount, ct.currency)}<span className="text-faint">{BILLING_CYCLE[ct.billing_cycle].short}</span></td>
                    <td className="text-right"><div className="flex justify-end"><ContractStatusPill status={ct.status} /></div></td>
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
