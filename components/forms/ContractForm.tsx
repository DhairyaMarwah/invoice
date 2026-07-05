'use client';

import Link from 'next/link';
import { useRef, useState, useTransition } from 'react';
import { createContractAction, updateContractAction, extractContractAction } from '@/app/actions';
import { SubmitButton } from '@/components/SubmitButton';
import { CONTRACT_STATUS, BILLING_CYCLE, CURRENCIES } from '@/lib/format';
import { PRODUCT_CATEGORIES } from '@/lib/products';
import type { Contract, ContractItem, BillingCycle, ContractStatus } from '@/lib/types';
import { IconPlus, IconTrash, IconSparkle, IconFile, IconCheck } from '@/components/icons';

interface Item { label: string; value: string }

export function ContractForm({
  clientId,
  contract,
  items: initialItems,
  defaultCurrency = 'INR',
}: {
  clientId: number;
  contract?: Contract;
  items?: ContractItem[];
  defaultCurrency?: string;
}) {
  const editing = !!contract;
  const action = editing ? updateContractAction : createContractAction;

  const [f, setF] = useState({
    title: contract?.title ?? '',
    party: contract?.party ?? '',
    billing_cycle: (contract?.billing_cycle ?? 'annual') as BillingCycle,
    amount: contract?.amount != null ? String(contract.amount) : '',
    currency: contract?.currency ?? defaultCurrency,
    tax_rate: contract?.tax_rate != null ? String(contract.tax_rate) : '18',
    start_date: contract?.start_date ?? '',
    end_date: contract?.end_date ?? '',
    status: (contract?.status ?? 'active') as ContractStatus,
    product: contract?.product ?? '',
    terms: contract?.terms ?? '',
    notes: contract?.notes ?? '',
  });
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  const [items, setItems] = useState<Item[]>(
    initialItems?.length ? initialItems.map((i) => ({ label: i.label, value: i.value ?? '' })) : [{ label: '', value: '' }],
  );
  const [useAI, setUseAI] = useState(true);
  const [fileName, setFileName] = useState(contract?.pdf_name ?? '');
  const [extracting, startExtract] = useTransition();
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function onExtract() {
    const file = fileRef.current?.files?.[0];
    if (!file) { setNote({ ok: false, text: 'Choose a PDF first, then extract.' }); return; }
    setNote(null);
    const fd = new FormData();
    fd.set('file', file);
    fd.set('useAI', useAI ? '1' : '0');
    startExtract(async () => {
      const res = await extractContractAction(fd);
      if ('error' in res) { setNote({ ok: false, text: res.error }); return; }
      const g = res.guess;
      setF((p) => ({
        ...p,
        title: p.title || (file.name.replace(/\.pdf$/i, '') ?? p.title),
        party: g.party ?? p.party,
        billing_cycle: (g.billing_cycle as BillingCycle) ?? p.billing_cycle,
        amount: g.amount != null ? String(g.amount) : p.amount,
        currency: g.currency ?? p.currency,
        tax_rate: g.tax_rate != null ? String(g.tax_rate) : p.tax_rate,
        start_date: g.start_date ?? p.start_date,
        end_date: g.end_date ?? p.end_date,
        terms: g.terms ?? p.terms,
      }));
      if (g.items && g.items.length) setItems(g.items.map((i) => ({ label: i.label, value: i.value ?? '' })));
      const filled = [g.party, g.start_date, g.end_date, g.amount, g.currency].filter(Boolean).length;
      setNote({ ok: true, text: `Extracted ${filled} field${filled === 1 ? '' : 's'} + ${g.items?.length ?? 0} items · via ${res.source === 'ai' ? 'AI (OCR)' : 'text heuristics'}. Review before saving.` });
    });
  }

  return (
    <form action={action} className="flex flex-col gap-5">
      {editing ? <input type="hidden" name="id" value={contract!.id} /> : <input type="hidden" name="client_id" value={clientId} />}

      {/* PDF upload + extraction */}
      <div className="card p-4">
        <h2 className="t-h3">Signed contract PDF</h2>
        <p className="t-small mt-0.5 text-faint">Upload the DocuSign (or similar) export. Ledger can read it and pre-fill the fields below for you to review.</p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="btn btn-secondary focus-ring cursor-pointer">
            <IconFile width={15} height={15} /> {fileName ? 'Replace PDF' : 'Choose PDF'}
            <input
              ref={fileRef}
              type="file"
              name="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? '')}
            />
          </label>
          {fileName && <span className="t-small flex items-center gap-1.5 text-muted"><IconCheck width={14} height={14} className="text-[var(--ok-solid)]" /> {fileName}</span>}

          <div className="ml-auto flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-1.5 text-[12.5px] text-muted select-none">
              <input type="checkbox" checked={useAI} onChange={(e) => setUseAI(e.target.checked)} className="accent-[var(--accent)]" />
              AI extraction (OCR)
            </label>
            <button type="button" onClick={onExtract} disabled={extracting} className="btn btn-secondary focus-ring">
              <IconSparkle width={15} height={15} /> {extracting ? 'Reading…' : 'Extract fields'}
            </button>
          </div>
        </div>

        {editing && contract?.pdf_file && (
          <a href={`/api/files/${contract.pdf_file}`} target="_blank" rel="noreferrer" className="link t-small mt-3 inline-block">
            View current PDF ↗
          </a>
        )}
        {note && (
          <div className={`mt-3 rounded-md border px-3 py-2 text-[12.5px] ${note.ok ? 'border-[var(--ok-border)] bg-[var(--ok-bg)] text-[var(--ok-text)]' : 'border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-text)]'}`}>
            {note.text}
          </div>
        )}
      </div>

      {/* Core fields */}
      <div className="card p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="field sm:col-span-2">
            <span className="field-label">Contract title</span>
            <input name="title" required value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="SaaS Subscription — Acme Platform" className="input focus-ring" />
          </label>
          <label className="field">
            <span className="field-label">Party involved</span>
            <input name="party" value={f.party} onChange={(e) => set('party', e.target.value)} placeholder="Acme Corp Pvt Ltd" className="input focus-ring" />
          </label>
          <label className="field">
            <span className="field-label">Status</span>
            <select name="status" value={f.status} onChange={(e) => set('status', e.target.value)} className="select focus-ring">
              {(Object.keys(CONTRACT_STATUS) as ContractStatus[]).map((k) => <option key={k} value={k}>{CONTRACT_STATUS[k].label}</option>)}
            </select>
          </label>

          <label className="field sm:col-span-2">
            <span className="field-label">Product</span>
            <select name="product" value={f.product} onChange={(e) => set('product', e.target.value)} className="select focus-ring">
              <option value="">— No product tag —</option>
              {PRODUCT_CATEGORIES.map((cat) => (
                <optgroup key={cat.key} label={cat.label}>
                  {cat.products.map((pr) => <option key={pr.key} value={pr.key}>{pr.label} — {pr.desc}</option>)}
                </optgroup>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field-label">Billing cycle</span>
            <select name="billing_cycle" value={f.billing_cycle} onChange={(e) => set('billing_cycle', e.target.value)} className="select focus-ring">
              {(Object.keys(BILLING_CYCLE) as BillingCycle[]).map((k) => <option key={k} value={k}>{BILLING_CYCLE[k].label}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="field">
              <span className="field-label">Amount</span>
              <input name="amount" type="number" step="0.01" min="0" value={f.amount} onChange={(e) => set('amount', e.target.value)} placeholder="0.00" className="input focus-ring num" />
            </label>
            <label className="field">
              <span className="field-label">Currency</span>
              <select name="currency" value={f.currency} onChange={(e) => set('currency', e.target.value)} className="select focus-ring">
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          </div>

          <label className="field">
            <span className="field-label">Validity — start</span>
            <input name="start_date" type="date" value={f.start_date} onChange={(e) => set('start_date', e.target.value)} className="input focus-ring" />
          </label>
          <label className="field">
            <span className="field-label">Validity — end</span>
            <input name="end_date" type="date" value={f.end_date} onChange={(e) => set('end_date', e.target.value)} className="input focus-ring" />
          </label>
          <label className="field">
            <span className="field-label">Default GST / tax rate (%)</span>
            <input name="tax_rate" type="number" step="0.01" min="0" value={f.tax_rate} onChange={(e) => set('tax_rate', e.target.value)} className="input focus-ring num" />
          </label>
        </div>
      </div>

      {/* Key items to adhere to */}
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="t-h3">Key items to adhere to</h2>
            <p className="t-small mt-0.5 text-faint">Obligations, SLAs, or deliverables pulled from the contract. Editable.</p>
          </div>
          <button type="button" onClick={() => setItems((p) => [...p, { label: '', value: '' }])} className="btn btn-secondary btn-sm focus-ring">
            <IconPlus width={14} height={14} /> Add item
          </button>
        </div>
        <div className="mt-4 flex flex-col gap-2.5">
          {items.map((it, i) => (
            <div key={i} className="flex items-center gap-2">
              <input name="item_label" value={it.label} onChange={(e) => setItems((p) => p.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} placeholder="Label (e.g. Uptime SLA)" className="input focus-ring w-1/3" />
              <input name="item_value" value={it.value} onChange={(e) => setItems((p) => p.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} placeholder="Value (e.g. 99.9% monthly)" className="input focus-ring flex-1" />
              <button type="button" onClick={() => setItems((p) => (p.length > 1 ? p.filter((_, j) => j !== i) : p))} className="btn btn-icon btn-ghost focus-ring text-faint hover:text-[var(--bad-text)]" aria-label="Remove item">
                <IconTrash width={14} height={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Terms + notes */}
      <div className="card p-4">
        <div className="grid gap-4">
          <label className="field">
            <span className="field-label">Terms &amp; conditions</span>
            <textarea name="terms" value={f.terms} onChange={(e) => set('terms', e.target.value)} rows={6} placeholder="Extracted contract text or a summary of the terms." className="textarea focus-ring" />
          </label>
          <label className="field">
            <span className="field-label">Internal notes</span>
            <textarea name="notes" value={f.notes} onChange={(e) => set('notes', e.target.value)} rows={2} className="textarea focus-ring" />
          </label>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <SubmitButton>{editing ? 'Save Changes' : 'Create Contract'}</SubmitButton>
        <Link href={editing ? `/contracts/${contract!.id}` : `/clients/${clientId}`} className="btn btn-ghost focus-ring">Cancel</Link>
      </div>
    </form>
  );
}
