import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getContract, itemsByContract, invoicesByContract } from '@/lib/repo';
import { deleteContractAction } from '@/app/actions';
import {
  PageHeader,
  ContractStatusPill,
  InvoiceStatusPill,
  Detail,
  Section,
} from '@/components/ui';
import { ConfirmForm } from '@/components/ConfirmForm';
import { money, fmtDate, daysUntil, BILLING_CYCLE, fileUrl } from '@/lib/format';
import { IconPlus, IconEdit, IconTrash, IconFile, IconExternal } from '@/components/icons';

export const dynamic = 'force-dynamic';

export default async function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ct = await getContract(Number(id));
  if (!ct) notFound();

  const items = await itemsByContract(ct.id);
  const invoices = await invoicesByContract(ct.id);
  const collected = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.total, 0);
  const invoiced = invoices.reduce((s, i) => s + i.total, 0);
  const daysLeft = daysUntil(ct.end_date);

  return (
    <div>
      <PageHeader
        title={ct.title}
        crumbs={[{ href: '/clients', label: 'Clients' }, { href: `/clients/${ct.client_id}`, label: ct.client_name }, { label: ct.title }]}
        meta={<ContractStatusPill status={ct.status} />}
        subtitle={<>{money(ct.amount, ct.currency)}<span className="text-faint">{BILLING_CYCLE[ct.billing_cycle].short}</span> · {ct.party || ct.client_name}</>}
        actions={
          <>
            <Link href={`/contracts/${ct.id}/edit`} className="btn btn-secondary focus-ring"><IconEdit width={14} height={14} /> Edit</Link>
            <Link href={`/contracts/${ct.id}/invoices/new`} className="btn btn-primary focus-ring"><IconPlus width={15} height={15} /> Generate Invoice</Link>
          </>
        }
      />

      <div className="mx-auto grid max-w-[1200px] gap-5 px-5 py-5 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-7">
          {/* PDF */}
          <Section title="Signed contract">
            {ct.pdf_file ? (
              <div className="card overflow-hidden">
                <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
                  <span className="flex items-center gap-2 text-[13px] font-medium"><IconFile width={15} height={15} className="text-faint" /> {ct.pdf_name}</span>
                  <a href={fileUrl(ct.pdf_file)!} target="_blank" rel="noreferrer" className="link t-small flex items-center gap-1">Open <IconExternal width={13} height={13} /></a>
                </div>
                <iframe src={fileUrl(ct.pdf_file)! + "#toolbar=0"} className="h-[460px] w-full bg-panel-2" title="Contract PDF" />
              </div>
            ) : (
              <p className="t-small rounded-md border border-dashed border-border-strong px-4 py-8 text-center text-faint">
                No PDF uploaded. <Link href={`/contracts/${ct.id}/edit`} className="link">Add one</Link> to keep the signed copy on file.
              </p>
            )}
          </Section>

          {/* Invoices */}
          <Section
            title="Invoices"
            sub={`${invoices.length} under this contract`}
            actions={<Link href={`/contracts/${ct.id}/invoices/new`} className="btn btn-secondary btn-sm focus-ring"><IconPlus width={14} height={14} /> Generate</Link>}
          >
            {invoices.length === 0 ? (
              <p className="t-small rounded-md border border-dashed border-border-strong px-4 py-8 text-center text-faint">
                No invoices yet. Generate one — it pre-fills from this contract and your org profile.
              </p>
            ) : (
              <div className="card overflow-hidden">
                <table className="tbl">
                  <thead>
                    <tr><th>Invoice</th><th>Issued</th><th>Due</th><th className="text-right">Total</th><th className="text-right">Status</th></tr>
                  </thead>
                  <tbody>
                    {invoices.map((iv) => (
                      <tr key={iv.id} className="row-link">
                        <td><Link href={`/invoices/${iv.id}`} className="t-mono text-[12.5px] hover:text-accent-text">{iv.invoice_number}</Link></td>
                        <td className="text-muted">{fmtDate(iv.issue_date)}</td>
                        <td className="text-muted">{fmtDate(iv.due_date)}</td>
                        <td className="num text-right font-medium">{money(iv.total, iv.currency)}</td>
                        <td className="text-right"><div className="flex justify-end"><InvoiceStatusPill status={iv.status} dueDate={iv.due_date} /></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          {/* Terms */}
          {ct.terms && (
            <Section title="Terms & conditions">
              <div className="card p-5">
                <p className="t-small max-h-72 overflow-y-auto whitespace-pre-line text-pretty leading-relaxed text-muted">{ct.terms}</p>
              </div>
            </Section>
          )}
        </div>

        {/* Sidebar */}
        <aside className="flex flex-col gap-4">
          <div className="card p-4">
            <h3 className="t-eyebrow mb-3">Contract</h3>
            <dl className="flex flex-col gap-3">
              <Detail label="Client"><Link href={`/clients/${ct.client_id}`} className="link">{ct.client_name}</Link></Detail>
              {ct.party && <Detail label="Party">{ct.party}</Detail>}
              <Detail label="Billing">{BILLING_CYCLE[ct.billing_cycle].label} · {money(ct.amount, ct.currency)}</Detail>
              <Detail label="Default tax rate"><span className="num">{ct.tax_rate}%</span></Detail>
              <Detail label="Validity">
                <span className="num">{fmtDate(ct.start_date)} → {fmtDate(ct.end_date)}</span>
                {daysLeft !== null && ct.status === 'active' && (
                  <span className={`ml-2 text-[12px] ${daysLeft < 0 ? 'text-[var(--bad-text)]' : daysLeft <= 30 ? 'text-[var(--warn-text)]' : 'text-faint'}`}>
                    {daysLeft < 0 ? `expired ${-daysLeft}d ago` : `${daysLeft}d left`}
                  </span>
                )}
              </Detail>
            </dl>
          </div>

          {items.length > 0 && (
            <div className="card p-4">
              <h3 className="t-eyebrow mb-3">Key items to adhere to</h3>
              <ul className="flex flex-col gap-2.5">
                {items.map((it) => (
                  <li key={it.id} className="flex flex-col gap-0.5">
                    <span className="t-label text-fg">{it.label}</span>
                    {it.value && <span className="t-small text-muted">{it.value}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="card p-4">
            <h3 className="t-eyebrow mb-3">Financials</h3>
            <dl className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between"><dt className="t-small text-muted">Invoiced</dt><dd className="num font-medium">{money(invoiced, ct.currency)}</dd></div>
              <div className="flex items-center justify-between"><dt className="t-small text-muted">Collected</dt><dd className="num font-medium text-[var(--ok-text)]">{money(collected, ct.currency)}</dd></div>
              <div className="divider" />
              <div className="flex items-center justify-between"><dt className="t-small font-medium">Outstanding</dt><dd className="num t-h4">{money(invoiced - collected, ct.currency)}</dd></div>
            </dl>
          </div>

          <ConfirmForm
            action={deleteContractAction}
            hidden={{ id: ct.id, client_id: ct.client_id }}
            message={`Delete "${ct.title}" and all its invoices? This cannot be undone.`}
            className="btn btn-ghost focus-ring w-full justify-center text-[var(--bad-text)] hover:!bg-[var(--bad-bg)]"
          >
            <IconTrash width={14} height={14} /> Delete contract
          </ConfirmForm>
        </aside>
      </div>
    </div>
  );
}
