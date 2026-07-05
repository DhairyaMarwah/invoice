'use client';

import { useState } from 'react';
import { updateSettingsAction } from '@/app/actions';
import { SubmitButton } from '@/components/SubmitButton';
import { CURRENCIES } from '@/lib/format';
import type { Account, Settings } from '@/lib/types';
import { IconPlus, IconTrash } from '@/components/icons';

export function SettingsForm({ settings, accounts }: { settings: Settings; accounts: Account[] }) {
  const [rows, setRows] = useState<Account[]>(accounts.length ? accounts : [{ label: '', details: '' }]);
  const setRow = (i: number, k: keyof Account, v: string) => setRows((p) => p.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const [logoPreview, setLogoPreview] = useState<string | null>(settings.org_logo ? `/api/files/${settings.org_logo}` : null);
  const [removeLogo, setRemoveLogo] = useState(false);

  return (
    <form action={updateSettingsAction} className="flex flex-col gap-5">
      {/* Org profile */}
      <div className="card p-4">
        <h2 className="t-h3">Organisation profile</h2>
        <p className="t-small mt-0.5 text-faint">Appears as the “from” on every invoice — logo, GSTIN, and contact details included.</p>

        {/* Branding */}
        <div className="mt-4 flex items-center gap-4 rounded-md border border-border bg-panel-2/60 p-3">
          <div className="flex h-12 w-36 flex-none items-center justify-start overflow-hidden rounded-[5px] bg-white px-2" style={{ boxShadow: 'inset 0 0 0 1px var(--image-outline)' }}>
            {logoPreview && !removeLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoPreview} alt="Organisation logo" className="max-h-8 w-auto" />
            ) : (
              <span className="t-small text-faint">No logo</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="t-label">Logo</div>
            <p className="t-small text-faint">Shown top-left on every invoice. SVG or PNG on a light background works best.</p>
          </div>
          <label className="btn btn-secondary btn-sm focus-ring flex-none cursor-pointer">
            {logoPreview && !removeLogo ? 'Replace' : 'Upload'}
            <input
              type="file"
              name="logo"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) { setLogoPreview(URL.createObjectURL(f)); setRemoveLogo(false); }
              }}
            />
          </label>
          {logoPreview && !removeLogo && (
            <button type="button" onClick={() => setRemoveLogo(true)} className="btn btn-ghost btn-sm focus-ring flex-none text-faint">Remove</button>
          )}
          <input type="hidden" name="remove_logo" value={removeLogo ? '1' : '0'} />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="field"><span className="field-label">Organisation name</span><input name="org_name" defaultValue={settings.org_name} className="input focus-ring" /></label>
          <label className="field"><span className="field-label">Tagline</span><input name="org_tagline" defaultValue={settings.org_tagline} className="input focus-ring" /></label>
          <label className="field sm:col-span-2"><span className="field-label">Address</span><textarea name="org_address" defaultValue={settings.org_address} rows={2} className="textarea focus-ring" /></label>
          <label className="field"><span className="field-label">GSTIN</span><input name="org_gstin" defaultValue={settings.org_gstin} className="input focus-ring num" style={{ fontFamily: 'var(--font-mono)' }} /></label>
          <label className="field"><span className="field-label">Email</span><input name="org_email" type="email" defaultValue={settings.org_email} className="input focus-ring" /></label>
          <label className="field"><span className="field-label">Phone</span><input name="org_phone" defaultValue={settings.org_phone} className="input focus-ring" /></label>
        </div>
      </div>

      {/* Invoice defaults */}
      <div className="card p-4">
        <h2 className="t-h3">Invoice defaults</h2>
        <p className="t-small mt-0.5 text-faint">Used when auto-generating a new invoice.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <label className="field"><span className="field-label">Default currency</span>
            <select name="default_currency" defaultValue={settings.default_currency} className="select focus-ring">{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select>
          </label>
          <label className="field"><span className="field-label">Default tax / GST (%)</span><input name="default_tax_rate" type="number" step="0.01" defaultValue={settings.default_tax_rate} className="input focus-ring num" /></label>
          <label className="field"><span className="field-label">Payment terms (days)</span><input name="invoice_due_days" type="number" defaultValue={settings.invoice_due_days} className="input focus-ring num" /></label>
          <label className="field"><span className="field-label">Invoice prefix</span><input name="invoice_prefix" defaultValue={settings.invoice_prefix} className="input focus-ring num" style={{ fontFamily: 'var(--font-mono)' }} /></label>
          <label className="field"><span className="field-label">Next invoice number</span><input name="invoice_next_seq" type="number" min="1" defaultValue={settings.invoice_next_seq} className="input focus-ring num" /></label>
          <div className="field justify-end"><span className="field-hint">Next: <span className="num" style={{ fontFamily: 'var(--font-mono)' }}>{settings.invoice_prefix || 'INV'}-{new Date().getFullYear()}-{String(parseInt(settings.invoice_next_seq || '1', 10)).padStart(4, '0')}</span></span></div>
        </div>
      </div>

      {/* Accounts */}
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <div><h2 className="t-h3">Payout accounts</h2><p className="t-small mt-0.5 text-faint">Suggested when recording a payment.</p></div>
          <button type="button" onClick={() => setRows((p) => [...p, { label: '', details: '' }])} className="btn btn-secondary btn-sm focus-ring"><IconPlus width={14} height={14} /> Add account</button>
        </div>
        <div className="mt-4 flex flex-col gap-2.5">
          {rows.map((a, i) => (
            <div key={i} className="flex items-center gap-2">
              <input name="account_label" value={a.label} onChange={(e) => setRow(i, 'label', e.target.value)} placeholder="Label (e.g. HDFC Current)" className="input focus-ring w-1/3" />
              <input name="account_details" value={a.details} onChange={(e) => setRow(i, 'details', e.target.value)} placeholder="A/C ••••1234 · IFSC HDFC0000123" className="input focus-ring flex-1" />
              <button type="button" onClick={() => setRows((p) => (p.length > 1 ? p.filter((_, j) => j !== i) : p))} className="btn btn-icon btn-ghost focus-ring text-faint hover:text-[var(--bad-text)]" aria-label="Remove account"><IconTrash width={14} height={14} /></button>
            </div>
          ))}
        </div>
      </div>

      <div><SubmitButton>Save Settings</SubmitButton></div>
    </form>
  );
}
