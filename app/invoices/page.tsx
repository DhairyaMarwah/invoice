import Link from 'next/link';
import { listInvoices, invoiceYears, totals } from '@/lib/repo';
import { PageHeader, EmptyState, InvoiceStatusPill } from '@/components/ui';
import { FilterBar } from '@/components/FilterBar';
import { RowLink } from '@/components/RowLink';
import { StatCard } from '@/components/Charts';
import { money, fmtDate } from '@/lib/format';
import { IconPlus, IconInvoices, IconDownload } from '@/components/icons';

export const dynamic = 'force-dynamic';

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; year?: string }>;
}) {
  const sp = await searchParams;
  const invoices = listInvoices({ status: sp.status, q: sp.q, year: sp.year });
  const years = invoiceYears();
  const t = totals(sp.year);

  const segments = [
    { value: 'all', label: 'All' },
    { value: 'unpaid', label: 'Unpaid' },
    { value: 'paid', label: 'Paid' },
  ];
  const selects = [
    { key: 'year', label: 'Year', options: [{ value: 'all', label: 'All years' }, ...years.map((y) => ({ value: y, label: y }))] },
  ];

  const exportQs = new URLSearchParams();
  if (sp.status) exportQs.set('status', sp.status);
  if (sp.year) exportQs.set('year', sp.year);
  if (sp.q) exportQs.set('q', sp.q);

  return (
    <div>
      <PageHeader
        title="Invoices"
        subtitle={<span className="num">{money(t.collected)} collected · {money(t.outstanding)} outstanding</span>}
        actions={
          <>
            <a href={`/api/export/invoices?${exportQs}`} className="btn btn-ghost focus-ring" title="Download the current view as CSV">
              <IconDownload width={13} height={13} /> Export CSV
            </a>
            <Link href="/invoices/new" className="btn btn-primary focus-ring"><IconPlus width={14} height={14} /> New Invoice</Link>
          </>
        }
      />
      <div className="mx-auto max-w-[1200px] px-5 py-5">
        <div className="mb-3"><FilterBar searchPlaceholder="Search invoices…" segments={segments} selects={selects} /></div>

        {invoices.length === 0 ? (
          <EmptyState
            icon={<IconInvoices width={20} height={20} />}
            title={sp.q || sp.status || sp.year ? 'No invoices match' : 'No invoices yet'}
            hint="Generate an invoice under a contract — it pre-fills from the contract and your org profile."
            action={<Link href="/invoices/new" className="btn btn-primary focus-ring"><IconPlus width={14} height={14} /> New Invoice</Link>}
          />
        ) : (
          <div className="rise">
          <StatCard icon={<IconInvoices width={12} height={12} />} label={`Invoices · ${invoices.length}`}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Invoice</th><th>Client</th><th>Contract</th><th>Issued</th><th>Due</th>
                  <th className="text-right">Total</th><th className="text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((iv) => (
                  <RowLink key={iv.id} href={`/invoices/${iv.id}`}>
                    <td><Link href={`/invoices/${iv.id}`} className="t-mono text-[12px] font-medium hover:text-accent-text">{iv.invoice_number}</Link></td>
                    <td className="text-muted">{iv.client_name}</td>
                    <td className="max-w-[180px] truncate text-muted">{iv.contract_title}</td>
                    <td className="num text-[12px] text-muted">{fmtDate(iv.issue_date)}</td>
                    <td className="num text-[12px] text-muted">{fmtDate(iv.due_date)}</td>
                    <td className="num text-right font-medium">{money(iv.total, iv.currency)}</td>
                    <td className="text-right"><div className="flex justify-end"><InvoiceStatusPill status={iv.status} dueDate={iv.due_date} /></div></td>
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
