import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getInvoice, itemsByInvoice, getSettings, getAccounts } from '@/lib/repo';
import { deleteInvoiceAction, markUnpaidAction } from '@/app/actions';
import { PageHeader, InvoiceStatusPill, Detail } from '@/components/ui';
import { ConfirmForm } from '@/components/ConfirmForm';
import { PrintButton } from '@/components/PrintButton';
import { MarkPaidForm } from '@/components/forms/MarkPaidForm';
import { A4Frame } from '@/components/invoice/A4Frame';
import { InvoiceSheet } from '@/components/invoice/InvoiceSheet';
import { money, fmtDate, todayISO, PAYMENT_METHOD, daysUntil, fileUrl } from '@/lib/format';
import type { PaymentMethod } from '@/lib/types';
import { IconEdit, IconTrash, IconClock } from '@/components/icons';

export const dynamic = 'force-dynamic';

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const iv = await getInvoice(Number(id));
  if (!iv) notFound();
  const items = await itemsByInvoice(iv.id);
  const s = await getSettings();
  const accounts = await getAccounts();
  const paid = iv.status === 'paid';
  const overdue = !paid && iv.due_date && (daysUntil(iv.due_date) ?? 0) < 0;

  return (
    <div>
      <PageHeader
        title={<span className="num" style={{ fontFamily: 'var(--font-mono)' }}>{iv.invoice_number}</span>}
        crumbs={[{ href: '/invoices', label: 'Invoices' }, { label: iv.invoice_number }]}
        meta={<InvoiceStatusPill status={iv.status} dueDate={iv.due_date} />}
        subtitle={<>{iv.client_name} · {iv.contract_title}</>}
        actions={
          <>
            <Link href={`/invoices/${iv.id}/edit`} className="btn btn-ghost focus-ring"><IconEdit width={13} height={13} /> Edit</Link>
            <PrintButton />
          </>
        }
      />

      <div className="print-area mx-auto max-w-[1100px] px-5 py-5">
        <div className="print-grid grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_288px]">
          {/* The document */}
          <div className="rise mx-auto w-full max-w-[720px]">
            <A4Frame>
              <InvoiceSheet
                template={iv.template}
                mode={iv.template_mode}
                org={{ name: s.org_name, tagline: s.org_tagline, address: s.org_address, gstin: s.org_gstin, email: s.org_email, phone: s.org_phone, logoUrl: fileUrl(s.org_logo) }}
                invoiceNumber={iv.invoice_number}
                issueDate={iv.issue_date}
                dueDate={iv.due_date}
                periodStart={iv.period_start}
                periodEnd={iv.period_end}
                billTo={iv.bill_to_name || iv.client_name}
                billToAddress={iv.client_address}
                billToGstin={iv.gst_number}
                currency={iv.currency}
                taxRate={iv.tax_rate}
                items={items}
                notes={iv.notes}
                paid={paid ? { paidAt: iv.paid_at, method: iv.payment_method, account: iv.payment_account, ref: iv.transaction_ref } : null}
              />
            </A4Frame>
          </div>

          {/* Payment + meta panel */}
          <aside className="no-print flex flex-col gap-3">
            <div className={`card p-3.5 ${overdue ? 'border-[var(--bad-border)]' : ''}`}>
              <div className="mb-2.5 flex items-center justify-between">
                <h3 className="t-eyebrow">Payment</h3>
                <InvoiceStatusPill status={iv.status} dueDate={iv.due_date} />
              </div>
              {paid ? (
                <div className="flex flex-col gap-3">
                  <dl className="flex flex-col gap-2.5">
                    <Detail label="Paid on"><span className="num">{fmtDate(iv.paid_at)}</span></Detail>
                    <Detail label="Method">{PAYMENT_METHOD[(iv.payment_method as PaymentMethod) ?? 'other'] ?? '—'}</Detail>
                    {iv.payment_account && <Detail label="Account">{iv.payment_account}</Detail>}
                    {iv.transaction_ref && <Detail label="Transaction"><span className="num" style={{ fontFamily: 'var(--font-mono)' }}>{iv.transaction_ref}</span></Detail>}
                    {iv.payment_proof && (
                      <Detail label="Proof">
                        <a href={fileUrl(iv.payment_proof)!} target="_blank" rel="noreferrer" className="link">View transaction proof ↗</a>
                      </Detail>
                    )}
                  </dl>
                  <ConfirmForm action={markUnpaidAction} hidden={{ id: iv.id }} message="Mark this invoice as unpaid? Payment details will be cleared." className="btn btn-secondary focus-ring w-full justify-center">
                    <IconClock width={13} height={13} /> Mark as Unpaid
                  </ConfirmForm>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex items-baseline justify-between">
                    <span className="t-small text-muted">Amount due</span>
                    <span className="num t-h2">{money(iv.total, iv.currency)}</span>
                  </div>
                  {overdue && <p className="t-small text-[var(--bad-text)]">Overdue since {fmtDate(iv.due_date)}</p>}
                  <MarkPaidForm invoiceId={iv.id} accounts={accounts} defaultDate={todayISO()} />
                </div>
              )}
            </div>

            <div className="card p-3.5">
              <h3 className="t-eyebrow mb-2.5">Linked to</h3>
              <dl className="flex flex-col gap-2.5">
                <Detail label="Client"><Link href={`/clients/${iv.client_id}`} className="link">{iv.client_name}</Link></Detail>
                <Detail label="Contract"><Link href={`/contracts/${iv.contract_id}`} className="link">{iv.contract_title}</Link></Detail>
                <Detail label="Created"><span className="num">{fmtDate(iv.created_at)}</span></Detail>
              </dl>
            </div>

            <ConfirmForm action={deleteInvoiceAction} hidden={{ id: iv.id, back: '/invoices' }} message={`Delete invoice ${iv.invoice_number}? This cannot be undone.`} className="btn btn-danger focus-ring w-full justify-center">
              <IconTrash width={13} height={13} /> Delete invoice
            </ConfirmForm>
          </aside>
        </div>
      </div>
    </div>
  );
}
