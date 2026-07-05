'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { createInvoiceAction, updateInvoiceAction } from '@/app/actions';
import { SubmitButton } from '@/components/SubmitButton';
import { A4Frame } from '@/components/invoice/A4Frame';
import { InvoiceSheet, type SheetOrg } from '@/components/invoice/InvoiceSheet';
import { money, CURRENCIES, BILLING_CYCLE } from '@/lib/format';
import { TEMPLATES, isTemplate, type TemplateKey } from '@/lib/templates';
import type { BillingCycle, Invoice, InvoiceItem } from '@/lib/types';
import { IconPlus, IconTrash, IconContracts } from '@/components/icons';

export interface ContractSummary {
  title: string;
  amount: number;
  billing_cycle: BillingCycle;
  tax_rate: number;
}

interface Line { description: string; qty: string; unit_price: string }

export interface InvoiceDefaults {
  invoice_number: string;
  issue_date: string;
  due_date: string;
  period_start: string;
  period_end: string;
  bill_to_name: string;
  client_address: string;
  gst_number: string;
  currency: string;
  tax_rate: string;
  notes: string;
  lines: Line[];
}

export function InvoiceForm({
  contractId,
  clientId,
  contractTitle,
  clientName,
  org,
  contract,
  invoice,
  items,
  defaults,
  bumpSeq = false,
}: {
  contractId: number;
  clientId: number;
  contractTitle: string;
  clientName: string;
  org: SheetOrg;
  contract?: ContractSummary;
  invoice?: Invoice;
  items?: InvoiceItem[];
  defaults?: InvoiceDefaults;
  bumpSeq?: boolean;
}) {
  const editing = !!invoice;
  const action = editing ? updateInvoiceAction : createInvoiceAction;

  const init: InvoiceDefaults = editing
    ? {
        invoice_number: invoice!.invoice_number,
        issue_date: invoice!.issue_date,
        due_date: invoice!.due_date ?? '',
        period_start: invoice!.period_start ?? '',
        period_end: invoice!.period_end ?? '',
        bill_to_name: invoice!.bill_to_name ?? '',
        client_address: invoice!.client_address ?? '',
        gst_number: invoice!.gst_number ?? '',
        currency: invoice!.currency,
        tax_rate: String(invoice!.tax_rate),
        notes: invoice!.notes ?? '',
        lines: (items ?? []).map((it) => ({ description: it.description, qty: String(it.qty), unit_price: String(it.unit_price) })),
      }
    : defaults!;

  const [f, setF] = useState(init);
  const [template, setTemplate] = useState<TemplateKey>(isTemplate(invoice?.template) ? invoice!.template as TemplateKey : 'geist');
  const [mode, setMode] = useState<'light' | 'dark'>(invoice?.template_mode === 'dark' ? 'dark' : 'light');
  const [lines, setLines] = useState<Line[]>(init.lines.length ? init.lines : [{ description: '', qty: '1', unit_price: '' }]);
  const set = (k: keyof InvoiceDefaults, v: string) => setF((p) => ({ ...p, [k]: v }));
  const setLine = (i: number, k: keyof Line, v: string) => setLines((p) => p.map((x, j) => (j === i ? { ...x, [k]: v } : x)));

  /** Pull amount, tax, and the standard line straight from the contract. */
  function importFromContract() {
    if (!contract) return;
    setLines([{
      description: `${contract.title}${BILLING_CYCLE[contract.billing_cycle]?.label ? ` — ${BILLING_CYCLE[contract.billing_cycle].label}` : ''}`,
      qty: '1',
      unit_price: String(contract.amount || 0),
    }]);
    set('tax_rate', String(contract.tax_rate ?? 0));
  }

  const total = useMemo(() => {
    const sub = lines.reduce((s, l) => s + (parseFloat(l.qty) || 0) * (parseFloat(l.unit_price) || 0), 0);
    return sub + sub * (parseFloat(f.tax_rate) || 0) / 100;
  }, [lines, f.tax_rate]);

  const sheetItems = useMemo(
    () => lines.map((l) => ({ description: l.description, qty: parseFloat(l.qty) || 0, unit_price: parseFloat(l.unit_price) || 0 })),
    [lines],
  );

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(340px,44%)]">
      {/* ------------------------------------------------ Form */}
      <form action={action} className="flex min-w-0 flex-col gap-4">
        {editing ? <input type="hidden" name="id" value={invoice!.id} /> : <input type="hidden" name="bump_seq" value={bumpSeq ? '1' : '0'} />}
        <input type="hidden" name="contract_id" value={contractId} />
        <input type="hidden" name="client_id" value={clientId} />
        <input type="hidden" name="template" value={template} />
        <input type="hidden" name="template_mode" value={mode} />

        <div className="card p-4">
          <div className="grid gap-3.5 sm:grid-cols-3">
            <label className="field">
              <span className="field-label">Invoice number</span>
              <input name="invoice_number" required value={f.invoice_number} onChange={(e) => set('invoice_number', e.target.value)} className="input focus-ring num" style={{ fontFamily: 'var(--font-mono)' }} />
            </label>
            <label className="field">
              <span className="field-label">Issue date</span>
              <input name="issue_date" type="date" required value={f.issue_date} onChange={(e) => set('issue_date', e.target.value)} className="input focus-ring" />
            </label>
            <label className="field">
              <span className="field-label">Due date</span>
              <input name="due_date" type="date" value={f.due_date} onChange={(e) => set('due_date', e.target.value)} className="input focus-ring" />
            </label>

            <label className="field">
              <span className="field-label">Period — from</span>
              <input name="period_start" type="date" value={f.period_start} onChange={(e) => set('period_start', e.target.value)} className="input focus-ring" />
            </label>
            <label className="field">
              <span className="field-label">Period — to</span>
              <input name="period_end" type="date" value={f.period_end} onChange={(e) => set('period_end', e.target.value)} className="input focus-ring" />
            </label>
            <label className="field">
              <span className="field-label">Currency</span>
              <select name="currency" value={f.currency} onChange={(e) => set('currency', e.target.value)} className="select focus-ring">
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="t-h4">Bill to</h2>
            <span className="t-small text-faint">pre-filled from the client — editable per invoice</span>
          </div>
          <div className="mt-3 grid gap-3.5 sm:grid-cols-2">
            <label className="field">
              <span className="field-label">Name</span>
              <input name="bill_to_name" value={f.bill_to_name} onChange={(e) => set('bill_to_name', e.target.value)} placeholder={clientName} className="input focus-ring" />
            </label>
            <label className="field">
              <span className="field-label">GSTIN</span>
              <input name="gst_number" value={f.gst_number} onChange={(e) => set('gst_number', e.target.value)} className="input focus-ring" style={{ fontFamily: 'var(--font-mono)' }} />
            </label>
            <label className="field sm:col-span-2">
              <span className="field-label">Address</span>
              <textarea name="client_address" value={f.client_address} onChange={(e) => set('client_address', e.target.value)} rows={2} className="textarea focus-ring" />
            </label>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between">
            <h2 className="t-h4">Line items</h2>
            <div className="flex items-center gap-1">
              {contract && (
                <button type="button" onClick={importFromContract} className="btn btn-ghost btn-sm focus-ring" title={`Replace lines with the contract's billing: ${money(contract.amount, f.currency)}${BILLING_CYCLE[contract.billing_cycle]?.short ?? ''}`}>
                  <IconContracts width={13} height={13} /> Import from contract
                </button>
              )}
              <button type="button" onClick={() => setLines((p) => [...p, { description: '', qty: '1', unit_price: '' }])} className="btn btn-ghost btn-sm focus-ring">
                <IconPlus width={13} height={13} /> Add line
              </button>
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-1.5">
            {lines.map((l, i) => (
              <div key={i} className="grid grid-cols-[minmax(0,1fr)_60px_104px_30px] items-center gap-1.5">
                <input name="desc" value={l.description} onChange={(e) => setLine(i, 'description', e.target.value)} placeholder="Annual SaaS subscription" className="input focus-ring" aria-label="Description" />
                <input name="qty" type="number" step="0.01" min="0" value={l.qty} onChange={(e) => setLine(i, 'qty', e.target.value)} className="input focus-ring num text-right" aria-label="Quantity" />
                <input name="price" type="number" step="0.01" min="0" value={l.unit_price} onChange={(e) => setLine(i, 'unit_price', e.target.value)} placeholder="0.00" className="input focus-ring num text-right" aria-label="Unit price" />
                <button type="button" onClick={() => setLines((p) => (p.length > 1 ? p.filter((_, j) => j !== i) : p))} className="btn btn-icon btn-ghost btn-sm focus-ring text-faint hover:text-[var(--bad-text)]" aria-label="Remove line">
                  <IconTrash width={13} height={13} />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
            <label className="flex items-center gap-1.5 text-[12px] text-muted">
              GST
              <input name="tax_rate" type="number" step="0.01" min="0" value={f.tax_rate} onChange={(e) => set('tax_rate', e.target.value)} className="input focus-ring num !h-[26px] w-14 !px-1.5 text-right" aria-label="Tax rate" />
              %
            </label>
            <div className="flex items-baseline gap-2">
              <span className="t-small text-faint">Total</span>
              <span className="num t-h3">{money(total, f.currency)}</span>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <label className="field">
            <span className="field-label">Notes</span>
            <textarea name="notes" value={f.notes} onChange={(e) => set('notes', e.target.value)} rows={2} placeholder="Payment terms, PO number…" className="textarea focus-ring" />
          </label>
        </div>

        <div className="flex items-center gap-2">
          <SubmitButton>{editing ? 'Save Changes' : 'Create Invoice'}</SubmitButton>
          <Link href={editing ? `/invoices/${invoice!.id}` : `/contracts/${contractId}`} className="btn btn-ghost focus-ring">Cancel</Link>
          <span className="t-small ml-auto hidden truncate text-faint sm:block">{contractTitle}</span>
        </div>
      </form>

      {/* ------------------------------------------------ Live A4 preview */}
      <aside className="sticky top-[60px] hidden min-w-0 lg:block" aria-label="Invoice preview">
        <div className="mb-2 flex items-center gap-1.5">
          <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto rounded-md border border-border bg-panel p-0.5" role="radiogroup" aria-label="Invoice template">
            {TEMPLATES.map((t) => (
              <button
                key={t.key}
                type="button"
                role="radio"
                aria-checked={template === t.key}
                onClick={() => setTemplate(t.key)}
                title={t.hint}
                className={`focus-ring flex-1 whitespace-nowrap rounded-[5px] px-2 py-1 text-[12px] font-medium transition-colors ${template === t.key ? 'bg-panel-2 text-fg shadow-[var(--shadow-card)]' : 'text-muted hover:text-fg'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex flex-none items-center gap-0.5 rounded-md border border-border bg-panel p-0.5" role="radiogroup" aria-label="Invoice paper">
            {(['light', 'dark'] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                onClick={() => setMode(m)}
                title={m === 'light' ? 'White paper' : 'Black paper'}
                className={`focus-ring flex h-6 w-7 items-center justify-center rounded-[5px] transition-colors ${mode === m ? 'bg-panel-2 shadow-[var(--shadow-card)]' : 'hover:bg-panel-2/60'}`}
              >
                <span className={`h-3 w-3 rounded-full border ${m === 'light' ? 'border-[#c9c9c9] bg-white' : 'border-[#333] bg-[#0a0a0a]'}`} />
              </button>
            ))}
          </div>
        </div>
        <A4Frame>
          <InvoiceSheet
            org={org}
            template={template}
            mode={mode}
            invoiceNumber={f.invoice_number}
            issueDate={f.issue_date}
            dueDate={f.due_date || null}
            periodStart={f.period_start || null}
            periodEnd={f.period_end || null}
            billTo={f.bill_to_name || clientName}
            billToAddress={f.client_address || null}
            billToGstin={f.gst_number || null}
            currency={f.currency}
            taxRate={parseFloat(f.tax_rate) || 0}
            items={sheetItems}
            notes={f.notes || null}
          />
        </A4Frame>
        <p className="t-small mt-2 text-center text-faint">Live preview · A4 · {TEMPLATES.find((t) => t.key === template)?.label}</p>
      </aside>
    </div>
  );
}
