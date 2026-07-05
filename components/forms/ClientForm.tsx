'use client';

import Link from 'next/link';
import { createClientAction, updateClientAction } from '@/app/actions';
import { SubmitButton } from '@/components/SubmitButton';
import { CLIENT_STATUS, CURRENCIES } from '@/lib/format';
import type { Client, ClientStatus } from '@/lib/types';

export function ClientForm({ client }: { client?: Client }) {
  const editing = !!client;
  const action = editing ? updateClientAction : createClientAction;
  const backHref = editing ? `/clients/${client!.id}` : '/clients';

  return (
    <form action={action} className="flex flex-col gap-5">
      {editing && <input type="hidden" name="id" value={client!.id} />}

      <div className="card p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="field sm:col-span-2">
            <span className="field-label">Client name</span>
            <input name="name" required defaultValue={client?.name ?? ''} placeholder="Acme Corp Pvt Ltd" className="input focus-ring" autoFocus />
          </label>

          <label className="field">
            <span className="field-label">Status</span>
            <select name="status" defaultValue={client?.status ?? 'prospective'} className="select focus-ring">
              {(Object.keys(CLIENT_STATUS) as ClientStatus[]).map((k) => (
                <option key={k} value={k}>{CLIENT_STATUS[k].label}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field-label">Default currency</span>
            <select name="currency" defaultValue={client?.currency ?? 'INR'} className="select focus-ring">
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>

          <label className="field">
            <span className="field-label">Email</span>
            <input name="email" type="email" defaultValue={client?.email ?? ''} placeholder="billing@acme.com" className="input focus-ring" />
          </label>

          <label className="field">
            <span className="field-label">Phone</span>
            <input name="phone" defaultValue={client?.phone ?? ''} placeholder="+91 98765 43210" className="input focus-ring" />
          </label>

          <label className="field sm:col-span-2">
            <span className="field-label">GSTIN</span>
            <input name="gst_number" defaultValue={client?.gst_number ?? ''} placeholder="27ABCDE1234F1Z5" className="input focus-ring font-mono uppercase" style={{ fontFamily: 'var(--font-mono)' }} />
          </label>

          <label className="field sm:col-span-2">
            <span className="field-label">Billing address</span>
            <textarea name="address" defaultValue={client?.address ?? ''} placeholder="Street, City, State, PIN" className="textarea focus-ring" rows={3} />
          </label>

          <label className="field sm:col-span-2">
            <span className="field-label">Notes</span>
            <textarea name="notes" defaultValue={client?.notes ?? ''} placeholder="Internal notes about this client" className="textarea focus-ring" rows={2} />
          </label>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <SubmitButton>{editing ? 'Save Changes' : 'Create Client'}</SubmitButton>
        <Link href={backHref} className="btn btn-ghost focus-ring">Cancel</Link>
      </div>
    </form>
  );
}
