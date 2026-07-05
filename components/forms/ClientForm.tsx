'use client';

import Link from 'next/link';
import { useState } from 'react';
import { createClientAction, updateClientAction } from '@/app/actions';
import { SubmitButton } from '@/components/SubmitButton';
import {
  CLIENT_STATUS, CURRENCIES, SALES_STAGE, SALES_STAGE_ORDER,
  CLIENT_CATEGORY, CLIENT_SEGMENT, CONTACT_ROLE, LEAD_SOURCES,
} from '@/lib/format';
import type {
  Client, ClientStatus, SalesStage, ClientCategory, ClientSegment, Contact, ContactRole,
} from '@/lib/types';
import { IconPlus, IconTrash } from '@/components/icons';

interface ContactRow {
  role: ContactRole;
  name: string; email: string; phone: string; location: string; linkedin: string;
}

const DEFAULT_CONTACTS: ContactRow[] = [
  { role: 'poc', name: '', email: '', phone: '', location: '', linkedin: '' },
  { role: 'promoter', name: '', email: '', phone: '', location: '', linkedin: '' },
  { role: 'accounts', name: '', email: '', phone: '', location: '', linkedin: '' },
];

export function ClientForm({ client, contacts }: { client?: Client; contacts?: Contact[] }) {
  const editing = !!client;
  const action = editing ? updateClientAction : createClientAction;
  const backHref = editing ? `/clients/${client!.id}` : '/clients';

  const [nirf, setNirf] = useState(!!client?.nirf);
  const [qs, setQs] = useState(!!client?.qs_ranking);
  const [rows, setRows] = useState<ContactRow[]>(
    contacts?.length
      ? contacts.map((c) => ({ role: c.role, name: c.name ?? '', email: c.email ?? '', phone: c.phone ?? '', location: c.location ?? '', linkedin: c.linkedin ?? '' }))
      : DEFAULT_CONTACTS,
  );
  const setRow = (i: number, k: keyof ContactRow, v: string) => setRows((p) => p.map((x, j) => (j === i ? { ...x, [k]: v } : x)));

  return (
    <form action={action} className="flex flex-col gap-4">
      {editing && <input type="hidden" name="id" value={client!.id} />}

      {/* Identity */}
      <div className="card p-4">
        <h2 className="t-h4 mb-3">Identity</h2>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <label className="field sm:col-span-2">
            <span className="field-label">Institution / client name</span>
            <input name="name" required defaultValue={client?.name ?? ''} placeholder="Sharda University" className="input focus-ring" autoFocus />
          </label>
          <label className="field">
            <span className="field-label">Category</span>
            <select name="category" defaultValue={client?.category ?? ''} className="select focus-ring">
              <option value="">—</option>
              {(Object.keys(CLIENT_CATEGORY) as ClientCategory[]).map((k) => <option key={k} value={k}>{CLIENT_CATEGORY[k]}</option>)}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Type</span>
            <select name="segment" defaultValue={client?.segment ?? ''} className="select focus-ring">
              <option value="">—</option>
              {(Object.keys(CLIENT_SEGMENT) as ClientSegment[]).map((k) => <option key={k} value={k}>{CLIENT_SEGMENT[k].label}</option>)}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Website</span>
            <input name="website" type="url" defaultValue={client?.website ?? ''} placeholder="https://…" className="input focus-ring" />
          </label>
          <label className="field">
            <span className="field-label">Default currency</span>
            <select name="currency" defaultValue={client?.currency ?? 'INR'} className="select focus-ring">
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
        </div>
      </div>

      {/* Sales & engagement */}
      <div className="card p-4">
        <h2 className="t-h4 mb-3">Sales &amp; engagement</h2>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <label className="field">
            <span className="field-label">Sales stage</span>
            <select name="sales_stage" defaultValue={client?.sales_stage ?? 'untouched'} className="select focus-ring">
              {SALES_STAGE_ORDER.map((k: SalesStage) => <option key={k} value={k}>{SALES_STAGE[k].label}</option>)}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Account status</span>
            <select name="status" defaultValue={client?.status ?? 'prospective'} className="select focus-ring">
              {(Object.keys(CLIENT_STATUS) as ClientStatus[]).map((k) => <option key={k} value={k}>{CLIENT_STATUS[k].label}</option>)}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Source</span>
            <input name="source" list="lead-sources" defaultValue={client?.source ?? ''} placeholder="Where did this come from?" className="input focus-ring" />
            <datalist id="lead-sources">{LEAD_SOURCES.map((x) => <option key={x} value={x} />)}</datalist>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="field">
              <span className="field-label">Projected value</span>
              <input name="projected_value" type="number" step="0.01" min="0" defaultValue={client?.projected_value ?? ''} placeholder="0" className="input focus-ring num" />
            </label>
            <label className="field">
              <span className="field-label">Expected close</span>
              <input name="expected_close" type="date" defaultValue={client?.expected_close ?? ''} className="input focus-ring" />
            </label>
          </div>
          <label className="field">
            <span className="field-label">Engagement started</span>
            <input name="engagement_started" type="date" defaultValue={client?.engagement_started ?? ''} className="input focus-ring" />
          </label>
        </div>
      </div>

      {/* Institution profile */}
      <div className="card p-4">
        <h2 className="t-h4 mb-3">Institution profile</h2>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <label className="field">
            <span className="field-label">Total campuses</span>
            <input name="total_campuses" type="number" min="0" defaultValue={client?.total_campuses ?? ''} className="input focus-ring num" />
          </label>
          <label className="field">
            <span className="field-label">Location(s)</span>
            <input name="locations" defaultValue={client?.locations ?? ''} placeholder="Greater Noida, Agra" className="input focus-ring" />
          </label>
          <label className="field">
            <span className="field-label">Student strength</span>
            <input name="student_strength" type="number" min="0" defaultValue={client?.student_strength ?? ''} className="input focus-ring num" />
          </label>
          <label className="field">
            <span className="field-label">Faculty strength</span>
            <input name="faculty_strength" type="number" min="0" defaultValue={client?.faculty_strength ?? ''} className="input focus-ring num" />
          </label>

          {/* NIRF */}
          <div className="field sm:col-span-2">
            <label className="flex cursor-pointer items-center gap-2 text-[12.5px] font-medium text-muted select-none">
              <input type="checkbox" name="nirf" value="1" checked={nirf} onChange={(e) => setNirf(e.target.checked)} className="accent-[var(--accent)]" />
              NIRF ranked
            </label>
            {nirf && (
              <div className="mt-2 grid grid-cols-2 gap-3">
                <input name="nirf_category" defaultValue={client?.nirf_category ?? ''} placeholder="Category (e.g. Universities)" className="input focus-ring" />
                <input name="nirf_rank" type="number" min="1" defaultValue={client?.nirf_rank ?? ''} placeholder="Rank" className="input focus-ring num" />
              </div>
            )}
          </div>

          {/* QS */}
          <div className="field sm:col-span-2">
            <label className="flex cursor-pointer items-center gap-2 text-[12.5px] font-medium text-muted select-none">
              <input type="checkbox" name="qs_ranking" value="1" checked={qs} onChange={(e) => setQs(e.target.checked)} className="accent-[var(--accent)]" />
              QS ranked
            </label>
            {qs && (
              <input name="qs_details" defaultValue={client?.qs_details ?? ''} placeholder="QS ranking details (band / rank / subject)" className="input focus-ring mt-2" />
            )}
          </div>
        </div>
      </div>

      {/* Contacts */}
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="t-h4">Contacts</h2>
            <p className="t-small mt-0.5 text-faint">Point of Contact, Promoter/Leadership, Accounts — add as many as you need.</p>
          </div>
          <button type="button" onClick={() => setRows((p) => [...p, { role: 'other', name: '', email: '', phone: '', location: '', linkedin: '' }])} className="btn btn-secondary btn-sm focus-ring">
            <IconPlus width={13} height={13} /> Add contact
          </button>
        </div>
        <div className="mt-3 flex flex-col gap-3">
          {rows.map((r, i) => (
            <div key={i} className="rounded-md border border-border bg-panel-2/50 p-3">
              <div className="mb-2 flex items-center gap-2">
                <select value={r.role} name="contact_role" onChange={(e) => setRow(i, 'role', e.target.value)} className="select focus-ring !h-8 w-auto min-w-[168px] text-[12.5px]">
                  {(Object.keys(CONTACT_ROLE) as ContactRole[]).map((k) => <option key={k} value={k}>{CONTACT_ROLE[k]}</option>)}
                </select>
                <button type="button" onClick={() => setRows((p) => (p.length > 1 ? p.filter((_, j) => j !== i) : p))} className="btn btn-icon btn-ghost btn-sm focus-ring ml-auto text-faint hover:text-[var(--bad-text)]" aria-label="Remove contact">
                  <IconTrash width={13} height={13} />
                </button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <input name="contact_name" value={r.name} onChange={(e) => setRow(i, 'name', e.target.value)} placeholder="Name" className="input focus-ring" />
                <input name="contact_email" type="email" value={r.email} onChange={(e) => setRow(i, 'email', e.target.value)} placeholder="Email" className="input focus-ring" />
                <input name="contact_phone" value={r.phone} onChange={(e) => setRow(i, 'phone', e.target.value)} placeholder="Contact number" className="input focus-ring" />
                <input name="contact_location" value={r.location} onChange={(e) => setRow(i, 'location', e.target.value)} placeholder="Location (exact)" className="input focus-ring" />
                <input name="contact_linkedin" type="url" value={r.linkedin} onChange={(e) => setRow(i, 'linkedin', e.target.value)} placeholder="LinkedIn profile URL" className="input focus-ring sm:col-span-2" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Billing + notes */}
      <div className="card p-4">
        <h2 className="t-h4 mb-3">Billing &amp; notes</h2>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <label className="field">
            <span className="field-label">GSTIN</span>
            <input name="gst_number" defaultValue={client?.gst_number ?? ''} placeholder="27ABCDE1234F1Z5" className="input focus-ring num" style={{ fontFamily: 'var(--font-mono)' }} />
          </label>
          <label className="field">
            <span className="field-label">Billing address</span>
            <input name="address" defaultValue={client?.address ?? ''} placeholder="Street, City, State, PIN" className="input focus-ring" />
          </label>
          <label className="field sm:col-span-2">
            <span className="field-label">Issues / blockers</span>
            <textarea name="issues" defaultValue={client?.issues ?? ''} rows={2} placeholder="Anything holding this engagement back" className="textarea focus-ring" />
          </label>
          <label className="field sm:col-span-2">
            <span className="field-label">Internal notes</span>
            <textarea name="notes" defaultValue={client?.notes ?? ''} rows={2} className="textarea focus-ring" />
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
