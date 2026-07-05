import Link from 'next/link';
import { listContracts } from '@/lib/repo';
import { PageHeader, EmptyState, ContractStatusPill } from '@/components/ui';
import { money, BILLING_CYCLE } from '@/lib/format';
import { IconArrowRight, IconInvoices } from '@/components/icons';

export const dynamic = 'force-dynamic';

export default async function PickContractPage() {
  const contracts = await listContracts();

  return (
    <div>
      <PageHeader
        title="Generate Invoice"
        crumbs={[{ href: '/invoices', label: 'Invoices' }, { label: 'New' }]}
        subtitle="Choose the contract this invoice belongs to"
      />
      <div className="mx-auto max-w-[760px] px-5 py-5">
        {contracts.length === 0 ? (
          <EmptyState
            icon={<IconInvoices width={22} height={22} />}
            title="No contracts to invoice"
            hint="Invoices are generated under a contract. Add a client and a contract first."
            action={<Link href="/clients" className="btn btn-primary focus-ring">Go to clients</Link>}
          />
        ) : (
          <div className="rise flex flex-col gap-2.5">
            {contracts.map((ct) => (
              <Link key={ct.id} href={`/contracts/${ct.id}/invoices/new`} className="card focus-ring group flex items-center gap-4 p-4 transition-[border-color] hover:border-border-strong">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2"><span className="truncate font-medium">{ct.title}</span><ContractStatusPill status={ct.status} /></div>
                  <div className="t-small mt-0.5 text-faint">{ct.client_name}</div>
                </div>
                <span className="num text-right text-[13px] font-medium">{money(ct.amount, ct.currency)}<span className="text-faint">{BILLING_CYCLE[ct.billing_cycle].short}</span></span>
                <IconArrowRight width={16} height={16} className="flex-none text-faint transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
