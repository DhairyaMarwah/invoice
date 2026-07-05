import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getClient,
  contractsByClient,
  invoicesByContract,
  invoicesByClient,
} from '@/lib/repo';
import { deleteClientAction } from '@/app/actions';
import {
  PageHeader,
  ClientStatusPill,
  ContractStatusPill,
  InvoiceStatusPill,
  Detail,
  EmptyState,
  Pill,
} from '@/components/ui';
import { ConfirmForm } from '@/components/ConfirmForm';
import { RowLink } from '@/components/RowLink';
import { StatCard } from '@/components/Charts';
import { productLabel, productCategory } from '@/lib/products';
import { money, fmtDate, initials, BILLING_CYCLE } from '@/lib/format';
import { IconPlus, IconEdit, IconTrash, IconContracts, IconFile, IconChevronRight } from '@/components/icons';

export const dynamic = 'force-dynamic';

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = getClient(Number(id));
  if (!client) notFound();

  const contracts = contractsByClient(client.id);
  const allInvoices = invoicesByClient(client.id);
  const invoiced = allInvoices.reduce((s, i) => s + i.total, 0);
  const collected = allInvoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.total, 0);

  return (
    <div>
      <PageHeader
        title={client.name}
        crumbs={[{ href: '/clients', label: 'Clients' }, { label: client.name }]}
        meta={<ClientStatusPill status={client.status} />}
        subtitle={[client.email, client.phone].filter(Boolean).join(' · ') || undefined}
        actions={
          <>
            <Link href={`/clients/${client.id}/edit`} className="btn btn-ghost focus-ring"><IconEdit width={13} height={13} /> Edit</Link>
            <Link href={`/clients/${client.id}/contracts/new`} className="btn btn-primary focus-ring"><IconPlus width={14} height={14} /> New Contract</Link>
          </>
        }
      />

      <div className="mx-auto grid max-w-[1200px] gap-5 px-5 py-5 lg:grid-cols-[1fr_300px]">
        {/* The estate: contracts, each with its invoices nested under it */}
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="t-small text-faint">
              Everything for this client lives under a <strong className="font-medium text-muted">contract</strong> — upload the signed agreement, then generate its invoices.
            </p>
          </div>

          {contracts.length === 0 ? (
            <EmptyState
              icon={<IconContracts width={20} height={20} />}
              title="Start with a contract"
              hint="Upload the signed PDF — Ledger reads it and pre-fills the validity, amount, and key terms. Invoices are generated under it."
              action={<Link href={`/clients/${client.id}/contracts/new`} className="btn btn-primary focus-ring"><IconPlus width={14} height={14} /> New Contract</Link>}
            />
          ) : (
            contracts.map((ct) => {
              const invs = invoicesByContract(ct.id);
              const cat = productCategory(ct.product);
              return (
                <div key={ct.id} className="rise">
                <StatCard
                  header={
                    <div className="flex items-center gap-2.5 px-3 py-2">
                      <IconContracts width={13} height={13} className="flex-none text-faint" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Link href={`/contracts/${ct.id}`} className="focus-ring t-h4 truncate rounded-sm hover:text-accent-text">{ct.title}</Link>
                          <ContractStatusPill status={ct.status} />
                          {ct.product && <Pill tone={cat?.tone ?? 'neu'} dot={false}>{productLabel(ct.product)}</Pill>}
                        </div>
                        <div className="t-small mt-0.5 flex flex-wrap gap-x-3 text-faint">
                          <span className="num">{money(ct.amount, ct.currency)}{BILLING_CYCLE[ct.billing_cycle].short}</span>
                          <span className="num">{fmtDate(ct.start_date)} → {fmtDate(ct.end_date)}</span>
                          {ct.pdf_file && <span className="flex items-center gap-1"><IconFile width={11} height={11} /> signed PDF</span>}
                        </div>
                      </div>
                      <Link href={`/contracts/${ct.id}/invoices/new`} className="btn btn-secondary btn-sm focus-ring flex-none">
                        <IconPlus width={13} height={13} /> New Invoice
                      </Link>
                      <Link href={`/contracts/${ct.id}`} className="btn btn-icon btn-ghost btn-sm focus-ring flex-none" aria-label={`Open ${ct.title}`}>
                        <IconChevronRight width={14} height={14} />
                      </Link>
                    </div>
                  }
                >
                  {invs.length === 0 ? (
                    <p className="t-small px-4 py-4 text-faint">
                      No invoices under this contract yet — <Link href={`/contracts/${ct.id}/invoices/new`} className="link">generate the first one</Link>.
                    </p>
                  ) : (
                    <table className="tbl">
                      <tbody>
                        {invs.map((iv) => (
                          <RowLink key={iv.id} href={`/invoices/${iv.id}`}>
                            <td className="w-[130px]"><span className="t-mono text-[12px] font-medium">{iv.invoice_number}</span></td>
                            <td className="num text-[12px] text-muted">{fmtDate(iv.issue_date)}</td>
                            <td className="num text-right font-medium">{money(iv.total, iv.currency)}</td>
                            <td className="w-[110px] text-right"><div className="flex justify-end"><InvoiceStatusPill status={iv.status} dueDate={iv.due_date} /></div></td>
                          </RowLink>
                        ))}
                      </tbody>
                    </table>
                  )}
                </StatCard>
                </div>
              );
            })
          )}

          {contracts.length > 0 && (
            <Link href={`/clients/${client.id}/contracts/new`} className="focus-ring flex items-center justify-center gap-2 rounded-md border border-dashed border-border-strong py-3 text-[12.5px] font-medium text-faint transition-colors duration-100 hover:border-fg-faint hover:text-fg">
              <IconPlus width={13} height={13} /> Add another contract
            </Link>
          )}
        </div>

        {/* Sidebar */}
        <aside className="flex flex-col gap-3">
          <div className="card p-3.5">
            <div className="mb-3 flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-panel-2 text-[11px] font-semibold text-muted" style={{ boxShadow: 'inset 0 0 0 1px var(--border)' }}>{initials(client.name)}</span>
              <div className="min-w-0"><div className="truncate text-[13px] font-medium">{client.name}</div><div className="t-small text-faint">Client since {fmtDate(client.created_at)}</div></div>
            </div>
            <div className="divider my-3" />
            <dl className="flex flex-col gap-3">
              {client.gst_number && <Detail label="GSTIN"><span className="t-mono text-[12px]">{client.gst_number}</span></Detail>}
              {client.address && <Detail label="Billing address"><span className="whitespace-pre-line text-[12.5px] text-muted">{client.address}</span></Detail>}
              <Detail label="Currency"><span className="t-mono text-[12px]">{client.currency}</span></Detail>
              {client.notes && <Detail label="Notes"><span className="whitespace-pre-line text-[12.5px] text-muted">{client.notes}</span></Detail>}
            </dl>
          </div>

          <div className="card p-3.5">
            <h3 className="t-eyebrow mb-2.5">Financials</h3>
            <dl className="flex flex-col gap-2">
              <div className="flex items-center justify-between"><dt className="t-small text-muted">Invoiced</dt><dd className="num font-medium">{money(invoiced, client.currency)}</dd></div>
              <div className="flex items-center justify-between"><dt className="t-small text-muted">Collected</dt><dd className="num font-medium text-[var(--ok-text)]">{money(collected, client.currency)}</dd></div>
              <div className="divider" />
              <div className="flex items-center justify-between"><dt className="t-small font-medium">Outstanding</dt><dd className="num t-h3">{money(invoiced - collected, client.currency)}</dd></div>
            </dl>
          </div>

          <ConfirmForm
            action={deleteClientAction}
            hidden={{ id: client.id }}
            message={`Delete ${client.name}? This removes all its contracts and invoices. This cannot be undone.`}
            className="btn btn-danger focus-ring w-full justify-center"
          >
            <IconTrash width={13} height={13} /> Delete client
          </ConfirmForm>
        </aside>
      </div>
    </div>
  );
}
