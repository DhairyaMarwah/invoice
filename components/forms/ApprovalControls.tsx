'use client';

import { useState } from 'react';
import { createApprovalAction, decideApprovalAction } from '@/app/actions';
import { APPROVAL_KIND, CURRENCIES } from '@/lib/format';
import type { ApprovalKind } from '@/lib/types';
import { IconPlus, IconCheck, IconClose } from '@/components/icons';

/** Raise an approval — inline expanding composer. */
export function RaiseApprovalForm({ clients }: { clients: { id: number; name: string }[] }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn btn-secondary btn-sm focus-ring">
        <IconPlus width={13} height={13} /> Raise approval
      </button>
    );
  }
  return (
    <form action={createApprovalAction} className="card flex flex-col gap-2.5 p-3">
      <div className="flex items-center gap-2">
        <input name="title" required placeholder="What needs sign-off? (e.g. 15% discount for Sharda)" className="input focus-ring !h-8 flex-1" autoFocus />
        <select name="kind" defaultValue="proposal" className="select focus-ring !h-8 w-auto text-[12.5px]">
          {(Object.keys(APPROVAL_KIND) as ApprovalKind[]).map((k) => <option key={k} value={k}>{APPROVAL_KIND[k]}</option>)}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <select name="client_id" defaultValue="" className="select focus-ring !h-8 flex-1 text-[12.5px]">
          <option value="">No client link</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input name="amount" type="number" step="0.01" min="0" placeholder="Amount" className="input focus-ring num !h-8 w-28" />
        <select name="currency" defaultValue="INR" className="select focus-ring !h-8 w-auto text-[12.5px]">
          {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <textarea name="detail" rows={2} placeholder="Context for whoever approves this…" className="textarea focus-ring !min-h-0" />
      <div className="flex items-center justify-end gap-2">
        <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost btn-sm focus-ring">Cancel</button>
        <button type="submit" className="btn btn-primary btn-sm focus-ring">Raise for approval</button>
      </div>
    </form>
  );
}

/** Approve / reject with an optional note. */
export function ApprovalDecision({ id }: { id: number }) {
  const [mode, setMode] = useState<null | 'approved' | 'rejected'>(null);

  if (!mode) {
    return (
      <div className="flex items-center gap-1.5">
        <button onClick={() => setMode('rejected')} className="btn btn-ghost btn-sm focus-ring text-[var(--bad-text)]">
          <IconClose width={13} height={13} /> Reject
        </button>
        <button onClick={() => setMode('approved')} className="btn btn-primary btn-sm focus-ring">
          <IconCheck width={13} height={13} /> Approve
        </button>
      </div>
    );
  }

  return (
    <form action={decideApprovalAction} className="flex items-center gap-1.5">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={mode} />
      <input name="note" placeholder={mode === 'approved' ? 'Note (optional)' : 'Reason (optional)'} className="input focus-ring !h-8 w-44" autoFocus />
      <button type="button" onClick={() => setMode(null)} className="btn btn-ghost btn-sm focus-ring">Cancel</button>
      <button type="submit" className={`btn btn-sm focus-ring ${mode === 'approved' ? 'btn-primary' : 'btn-danger'}`}>
        {mode === 'approved' ? 'Confirm approve' : 'Confirm reject'}
      </button>
    </form>
  );
}
