'use client';

import { useActionState, useState } from 'react';
import { markPaidAction, type MarkPaidResult } from '@/app/actions';
import { PAYMENT_METHOD } from '@/lib/format';
import type { Account, PaymentMethod } from '@/lib/types';
import { IconCheck, IconFile } from '@/components/icons';

const initial: MarkPaidResult = { ok: false };

export function MarkPaidForm({
  invoiceId,
  accounts,
  defaultDate,
}: {
  invoiceId: number;
  accounts: Account[];
  defaultDate: string;
}) {
  const [open, setOpen] = useState(false);
  const [proofName, setProofName] = useState('');
  const [state, formAction, pending] = useActionState(
    async (_prev: MarkPaidResult, fd: FormData) => markPaidAction(fd),
    initial,
  );
  const errors = state.errors ?? {};

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn btn-primary focus-ring w-full justify-center">
        <IconCheck width={14} height={14} /> Record Payment
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3" noValidate>
      <input type="hidden" name="id" value={invoiceId} />
      <h3 className="t-h4">Record payment</h3>

      <label className="field">
        <span className="field-label">Paid on</span>
        <input name="paid_at" type="date" defaultValue={defaultDate} max={defaultDate} required aria-invalid={!!errors.paid_at} className="input focus-ring" />
        {errors.paid_at && <span className="field-hint !text-[var(--bad-text)]">{errors.paid_at}</span>}
      </label>

      <label className="field">
        <span className="field-label">Method</span>
        <select name="payment_method" className="select focus-ring" defaultValue="bank_transfer" aria-invalid={!!errors.payment_method}>
          {(Object.keys(PAYMENT_METHOD) as PaymentMethod[]).map((k) => (
            <option key={k} value={k}>{PAYMENT_METHOD[k]}</option>
          ))}
        </select>
        {errors.payment_method && <span className="field-hint !text-[var(--bad-text)]">{errors.payment_method}</span>}
      </label>

      <label className="field">
        <span className="field-label">Account paid to</span>
        <input name="payment_account" list="accounts-list" placeholder="e.g. HDFC •••1234" className="input focus-ring" />
        <datalist id="accounts-list">
          {accounts.map((a, i) => <option key={i} value={a.label}>{a.details}</option>)}
        </datalist>
      </label>

      <label className="field">
        <span className="field-label">Transaction reference</span>
        <input name="transaction_ref" placeholder="UTR / txn number" aria-invalid={!!errors.transaction_ref} className="input focus-ring num" style={{ fontFamily: 'var(--font-mono)' }} />
        {errors.transaction_ref && <span className="field-hint !text-[var(--bad-text)]">{errors.transaction_ref}</span>}
      </label>

      <div className="field">
        <span className="field-label">Transaction proof <span className="font-normal text-faint">(screenshot, optional)</span></span>
        <label className={`btn btn-secondary focus-ring w-full cursor-pointer !justify-start ${errors.proof ? 'border-[var(--bad-solid)]' : ''}`}>
          <IconFile width={13} height={13} className="text-faint" />
          <span className="truncate">{proofName || 'Attach image…'}</span>
          <input
            type="file"
            name="proof"
            accept="image/*"
            className="hidden"
            onChange={(e) => setProofName(e.target.files?.[0]?.name ?? '')}
          />
        </label>
        {errors.proof && <span className="field-hint !text-[var(--bad-text)]">{errors.proof}</span>}
      </div>

      <div className="flex items-center gap-2">
        <button type="submit" disabled={pending} aria-busy={pending} className="btn btn-primary focus-ring flex-1 justify-center">
          {pending ? 'Saving…' : 'Mark as Paid'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost focus-ring">Cancel</button>
      </div>
    </form>
  );
}
