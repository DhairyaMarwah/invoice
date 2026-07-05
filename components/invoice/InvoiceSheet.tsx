/* eslint-disable @next/next/no-img-element */
import { money, fmtDate, PAYMENT_METHOD } from '@/lib/format';
import type { PaymentMethod } from '@/lib/types';
import type { TemplateKey } from '@/lib/templates';

export interface SheetOrg {
  name: string;
  tagline?: string;
  address?: string;
  gstin?: string;
  email?: string;
  phone?: string;
  logoUrl?: string | null;
}

export interface SheetItem {
  description: string;
  qty: number;
  unit_price: number;
}

export type SheetMode = 'light' | 'dark';

export interface InvoiceSheetProps {
  org: SheetOrg;
  template?: TemplateKey | string;
  mode?: SheetMode | string;
  invoiceNumber: string;
  issueDate: string;
  dueDate?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  billTo: string;
  billToAddress?: string | null;
  billToGstin?: string | null;
  currency: string;
  taxRate: number;
  items: SheetItem[];
  notes?: string | null;
  paid?: { paidAt: string | null; method: string | null; account: string | null; ref: string | null } | null;
}

/* ------------------------------------------------ palette (black / white) */
function palette(mode: SheetMode) {
  return mode === 'dark'
    ? {
        paper: '#0a0a0a', ink: '#ededed', muted: '#a0a0a0', faint: '#6e6e6e',
        line: '#1f1f1f', soft: '#111111', ok: '#4ade80', okBg: 'rgba(0,202,80,.12)',
        bandInk: '#ededed',
      }
    : {
        paper: '#ffffff', ink: '#171717', muted: '#4d4d4d', faint: '#8f8f8f',
        line: '#ebebeb', soft: '#fafafa', ok: '#107d32', okBg: '#ecfdec',
        bandInk: '#ffffff',
      };
}

/* Per-template config for the standard (flow) layout. */
const T = {
  classic: { body: 'var(--font-sans)', display: 'var(--font-sans)', numFont: 'var(--font-mono)', boxes: true, itemsHead: 'rule' as const, zebra: false, displaySize: 15, displayWeight: 600, upper: false },
  ledger: { body: 'var(--font-sans)', display: 'var(--font-sans)', numFont: 'var(--font-mono)', boxes: false, itemsHead: 'band' as const, zebra: true, displaySize: 15, displayWeight: 600, upper: false },
  minimal: { body: 'var(--font-sans)', display: 'var(--font-sans)', numFont: 'var(--font-sans)', boxes: false, itemsHead: 'hairline' as const, zebra: false, displaySize: 14, displayWeight: 500, upper: false },
  serif: { body: 'var(--font-sans)', display: 'var(--font-serif)', numFont: 'var(--font-sans)', boxes: false, itemsHead: 'rule' as const, zebra: false, displaySize: 22, displayWeight: 400, upper: false },
  mono: { body: 'var(--font-mono)', display: 'var(--font-mono)', numFont: 'var(--font-mono)', boxes: false, itemsHead: 'band' as const, zebra: false, displaySize: 13, displayWeight: 600, upper: true },
};

const eyebrow = (P: ReturnType<typeof palette>) => ({
  fontSize: 9.5, fontWeight: 500 as const, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: P.faint,
});

function Logo({ org, mode, height = 24 }: { org: SheetOrg; mode: SheetMode; height?: number }) {
  if (!org.logoUrl) return null;
  return (
    <img
      src={org.logoUrl}
      alt={`${org.name} logo`}
      style={{ height, width: 'auto', display: 'block', filter: mode === 'dark' ? 'invert(1)' : 'none' }}
    />
  );
}

/* Symmetric Billed By / Billed To pair — the invoicelly system. */
function Parties({ p, P, boxed, nameFont }: { p: InvoiceSheetProps; P: ReturnType<typeof palette>; boxed: boolean; nameFont: string }) {
  const box = boxed
    ? { background: P.soft, borderRadius: 6, padding: 14 }
    : { borderTop: `1px solid ${P.ink}`, paddingTop: 10 };
  const cell = (title: string, name: string, addr?: string | null, gstin?: string | null, extra?: string) => (
    <div className="min-w-0 flex-1" style={box}>
      <div style={eyebrow(P)}>{title}</div>
      <div style={{ marginTop: 6, fontSize: 12.5, fontWeight: 600, lineHeight: '17px', fontFamily: nameFont }}>{name || '—'}</div>
      {addr && <div className="whitespace-pre-line" style={{ marginTop: 4, fontSize: 10.5, lineHeight: '15px', color: P.muted }}>{addr}</div>}
      {gstin && <div style={{ marginTop: 4, fontSize: 10.5, color: P.muted }}>GSTIN <span className="num" style={{ fontFamily: 'var(--font-mono)' }}>{gstin}</span></div>}
      {extra && <div style={{ marginTop: 4, fontSize: 10.5, color: P.muted }}>{extra}</div>}
    </div>
  );
  return (
    <div className="mt-7 flex gap-3">
      {cell('Billed by', p.org.name, p.org.address, p.org.gstin, [p.org.email, p.org.phone].filter(Boolean).join(' · ') || undefined)}
      {cell('Billed to', p.billTo, p.billToAddress, p.billToGstin)}
    </div>
  );
}

function PaidPill({ p, P }: { p: InvoiceSheetProps; P: ReturnType<typeof palette> }) {
  if (!p.paid) return null;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 10px', borderRadius: 999,
      border: `1px solid ${P.ok}`, color: P.ok, background: P.okBg,
      fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em',
    }}>
      Paid{p.paid.paidAt ? ` · ${fmtDate(p.paid.paidAt)}` : ''}
    </div>
  );
}

function PaymentRecord({ p, P }: { p: InvoiceSheetProps; P: ReturnType<typeof palette> }) {
  if (!p.paid) return null;
  return (
    <div style={{ background: P.okBg, borderRadius: 6, padding: '10px 14px' }}>
      <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: P.ok }}>Payment received</div>
      <div className="flex flex-wrap gap-x-4 gap-y-0.5" style={{ marginTop: 4, fontSize: 10.5, color: P.muted }}>
        {p.paid.paidAt && <span>{fmtDate(p.paid.paidAt)}</span>}
        {p.paid.method && <span>{PAYMENT_METHOD[p.paid.method as PaymentMethod] ?? p.paid.method}</span>}
        {p.paid.account && <span>to {p.paid.account}</span>}
        {p.paid.ref && <span className="num" style={{ fontFamily: 'var(--font-mono)' }}>ref {p.paid.ref}</span>}
      </div>
    </div>
  );
}

/* ===================================================== Geist grid template */
/* Full-bleed hairline cell grid on paper — modeled on invoicelly's Vercel PDF. */
function GeistSheet({ p, P, mode }: { p: InvoiceSheetProps; P: ReturnType<typeof palette>; mode: SheetMode }) {
  const lines = p.items.filter((it) => it.description.trim() || it.qty || it.unit_price);
  const subtotal = lines.reduce((s, it) => s + (it.qty || 0) * (it.unit_price || 0), 0);
  const tax = subtotal * (p.taxRate || 0) / 100;
  const total = subtotal + tax;
  const cellLine = `1px solid ${P.line}`;
  const metaRow = (label: string, value: string) => (
    <div className="flex items-baseline gap-2">
      <span style={{ fontSize: 10, color: P.faint, minWidth: 88 }}>{label}</span>
      <span className="num" style={{ fontSize: 10, color: P.muted, fontFamily: 'var(--font-mono)' }}>{value}</span>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col" style={{ background: P.paper, color: P.ink, fontFamily: 'var(--font-sans)' }}>
      {/* Number band */}
      <div className="flex items-center justify-between" style={{ borderBottom: cellLine, padding: '20px 24px' }}>
        <span className="num" style={{ fontSize: 30, lineHeight: '32px', fontWeight: 500, letterSpacing: '-0.04em', fontFamily: 'var(--font-mono)' }}>
          {p.invoiceNumber || '—'}
        </span>
        <PaidPill p={p} P={P} />
      </div>

      {/* Meta cell + logo cell */}
      <div className="flex" style={{ borderBottom: cellLine }}>
        <div className="flex flex-1 flex-col gap-1.5" style={{ padding: '16px 24px' }}>
          {metaRow('Issued', fmtDate(p.issueDate))}
          {metaRow('Due', fmtDate(p.dueDate))}
          {(p.periodStart || p.periodEnd) && metaRow('Period', `${fmtDate(p.periodStart)} – ${fmtDate(p.periodEnd)}`)}
          {metaRow('Currency', p.currency)}
          {metaRow('GST', `${p.taxRate || 0}%`)}
        </div>
        <div className="flex w-[220px] flex-none items-center justify-center" style={{ borderLeft: cellLine, padding: 16 }}>
          {p.org.logoUrl ? <Logo org={p.org} mode={mode} height={30} /> : (
            <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.02em' }}>{p.org.name}</span>
          )}
        </div>
      </div>

      {/* Symmetric billed by / to cells */}
      <div className="flex" style={{ borderBottom: cellLine }}>
        {[
          { title: 'Billed by', name: p.org.name, addr: p.org.address, gstin: p.org.gstin, extra: [p.org.email, p.org.phone].filter(Boolean).join(' · ') },
          { title: 'Billed to', name: p.billTo, addr: p.billToAddress ?? undefined, gstin: p.billToGstin ?? undefined, extra: '' },
        ].map((c, i) => (
          <div key={i} className="w-1/2 min-w-0" style={{ padding: '16px 24px', borderLeft: i === 1 ? cellLine : 'none' }}>
            <div style={{ fontSize: 10, color: P.faint }}>{c.title}</div>
            <div style={{ marginTop: 5, fontSize: 13, fontWeight: 600 }}>{c.name || '—'}</div>
            {c.addr && <div className="whitespace-pre-line" style={{ marginTop: 3, fontSize: 10, lineHeight: '14px', color: P.muted }}>{c.addr}</div>}
            {c.gstin && <div style={{ marginTop: 3, fontSize: 10, color: P.muted }}>GSTIN <span className="num" style={{ fontFamily: 'var(--font-mono)' }}>{c.gstin}</span></div>}
            {c.extra && <div style={{ marginTop: 3, fontSize: 10, color: P.muted }}>{c.extra}</div>}
          </div>
        ))}
      </div>

      {/* Items */}
      <div className="min-h-0 flex-1">
        <div className="flex" style={{ borderBottom: cellLine, background: P.soft, padding: '9px 24px' }}>
          <span style={{ width: '55%', fontSize: 10.5, fontWeight: 600 }}>Item</span>
          <span style={{ width: '10%', fontSize: 10.5, fontWeight: 600, textAlign: 'center' }}>Qty</span>
          <span style={{ width: '17.5%', fontSize: 10.5, fontWeight: 600, textAlign: 'right' }}>Rate</span>
          <span style={{ width: '17.5%', fontSize: 10.5, fontWeight: 600, textAlign: 'right' }}>Amount</span>
        </div>
        {lines.length === 0 && (
          <div style={{ padding: '22px 24px', textAlign: 'center', fontSize: 11, color: P.faint }}>No line items yet</div>
        )}
        {lines.map((it, i) => (
          <div key={i} className="flex items-baseline" style={{ borderBottom: cellLine, padding: '11px 24px', background: i % 2 === 0 ? 'transparent' : P.soft }}>
            <span style={{ width: '55%', fontSize: 11.5, lineHeight: '15px', paddingRight: 12 }}>{it.description || '—'}</span>
            <span className="num" style={{ width: '10%', fontSize: 11, textAlign: 'center', color: P.muted, fontFamily: 'var(--font-mono)' }}>{it.qty || 0}</span>
            <span className="num" style={{ width: '17.5%', fontSize: 11, textAlign: 'right', color: P.muted, fontFamily: 'var(--font-mono)' }}>{money(it.unit_price || 0, p.currency)}</span>
            <span className="num" style={{ width: '17.5%', fontSize: 11, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{money((it.qty || 0) * (it.unit_price || 0), p.currency)}</span>
          </div>
        ))}
      </div>

      {/* Bottom split: notes | totals */}
      <div className="flex" style={{ borderTop: cellLine }}>
        <div className="flex w-1/2 min-w-0 flex-col" style={{ borderRight: cellLine }}>
          {p.paid && (
            <div style={{ padding: '14px 24px', borderBottom: p.notes ? cellLine : 'none' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: P.ok }}>Payment received</div>
              <div style={{ marginTop: 4, fontSize: 10, color: P.muted, lineHeight: '15px' }}>
                {[p.paid.paidAt && fmtDate(p.paid.paidAt), p.paid.method && (PAYMENT_METHOD[p.paid.method as PaymentMethod] ?? p.paid.method), p.paid.account && `to ${p.paid.account}`, p.paid.ref && `ref ${p.paid.ref}`].filter(Boolean).join(' · ')}
              </div>
            </div>
          )}
          {p.notes && (
            <div style={{ padding: '14px 24px' }}>
              <div style={{ fontSize: 11, fontWeight: 600 }}>Notes</div>
              <p className="whitespace-pre-line" style={{ marginTop: 4, fontSize: 10, lineHeight: '14px', color: P.muted }}>{p.notes}</p>
            </div>
          )}
        </div>
        <div className="flex w-1/2 flex-col">
          <div className="flex flex-col gap-1.5" style={{ padding: '14px 24px' }}>
            <div className="flex items-baseline justify-between">
              <span style={{ fontSize: 10.5, color: P.faint }}>Subtotal</span>
              <span className="num" style={{ fontSize: 10.5, color: P.muted, fontFamily: 'var(--font-mono)' }}>{money(subtotal, p.currency)}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span style={{ fontSize: 10.5, color: P.faint }}>GST ({p.taxRate || 0}%)</span>
              <span className="num" style={{ fontSize: 10.5, color: P.muted, fontFamily: 'var(--font-mono)' }}>{money(tax, p.currency)}</span>
            </div>
          </div>
          <div className="flex items-center justify-between" style={{ borderTop: cellLine, padding: '13px 24px' }}>
            <span style={{ fontSize: 11, color: P.faint }}>Total due</span>
            <span className="num" style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em', fontFamily: 'var(--font-mono)' }}>{money(total, p.currency)}</span>
          </div>
        </div>
      </div>

      {/* Footer band */}
      <div className="flex items-center justify-between" style={{ borderTop: cellLine, padding: '12px 24px' }}>
        <span style={{ fontSize: 10, color: P.faint }}>Thank you for your business.</span>
        <span style={{ fontSize: 10, color: P.faint }}>{p.org.name}{p.org.tagline ? ` — ${p.org.tagline}` : ''}</span>
      </div>
    </div>
  );
}

/* ========================================================= Standard flow */
export function InvoiceSheet(p: InvoiceSheetProps) {
  const mode: SheetMode = p.mode === 'dark' ? 'dark' : 'light';
  const P = palette(mode);

  if (p.template === 'geist') return <GeistSheet p={p} P={P} mode={mode} />;

  const c = T[(p.template as keyof typeof T) in T ? (p.template as keyof typeof T) : 'classic'] ?? T.classic;
  const lines = p.items.filter((it) => it.description.trim() || it.qty || it.unit_price);
  const subtotal = lines.reduce((s, it) => s + (it.qty || 0) * (it.unit_price || 0), 0);
  const tax = subtotal * (p.taxRate || 0) / 100;
  const total = subtotal + tax;
  const eb = eyebrow(P);
  const docTitle = p.billToGstin || p.org.gstin ? 'Tax Invoice' : 'Invoice';

  const itemsHeadCell = (align: 'left' | 'right', label: string, w?: number) => (
    <th
      style={{
        ...(c.itemsHead === 'band'
          ? { fontSize: 9.5, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: P.bandInk === P.ink ? P.paper : P.bandInk, padding: '6px 10px' }
          : { ...eb, paddingBottom: 8 }),
        textAlign: align,
        width: w,
      }}
    >
      {label}
    </th>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col px-12 pb-10 pt-12" style={{ background: P.paper, color: P.ink, fontFamily: c.body }}>
      {/* Header: logo/name left · doc title + number right */}
      <div className="flex items-start justify-between gap-8">
        <div className="min-w-0">
          {p.org.logoUrl ? (
            <Logo org={p.org} mode={mode} height={26} />
          ) : (
            <div style={{ fontSize: c.displaySize + 4, lineHeight: 1.25, fontWeight: c.displayWeight, fontFamily: c.display, textTransform: c.upper ? 'uppercase' : 'none', letterSpacing: '-0.02em' }}>
              {p.org.name || '—'}
            </div>
          )}
          {p.org.tagline && <div style={{ marginTop: 6, fontSize: 10.5, color: P.faint }}>{p.org.tagline}</div>}
        </div>
        <div className="flex-none text-right">
          <div style={eb}>{docTitle}</div>
          <div className="num" style={{ marginTop: 4, fontFamily: c.numFont, fontSize: 15, fontWeight: 500 }}>{p.invoiceNumber || '—'}</div>
          <div className="mt-2"><PaidPill p={p} P={P} /></div>
        </div>
      </div>

      {/* Meta strip — symmetric label/value trio */}
      <div className="mt-7 flex gap-8" style={{ borderTop: `1px solid ${P.line}`, borderBottom: `1px solid ${P.line}`, padding: '10px 0' }}>
        <div><span style={eb}>Issued</span><div className="num" style={{ marginTop: 2, fontSize: 11, fontWeight: 500 }}>{fmtDate(p.issueDate)}</div></div>
        <div><span style={eb}>Due</span><div className="num" style={{ marginTop: 2, fontSize: 11, fontWeight: 500 }}>{fmtDate(p.dueDate)}</div></div>
        {(p.periodStart || p.periodEnd) && (
          <div><span style={eb}>Period</span><div className="num" style={{ marginTop: 2, fontSize: 11 }}>{fmtDate(p.periodStart)} – {fmtDate(p.periodEnd)}</div></div>
        )}
        <div className="ml-auto text-right"><span style={eb}>Currency</span><div className="num" style={{ marginTop: 2, fontSize: 11, fontWeight: 500 }}>{p.currency}</div></div>
      </div>

      <Parties p={p} P={P} boxed={c.boxes} nameFont={c.display === 'var(--font-serif)' ? 'var(--font-serif)' : c.display} />

      {/* Line items */}
      <table className="mt-7 w-full border-collapse">
        <thead>
          <tr style={c.itemsHead === 'band' ? { background: P.ink } : c.itemsHead === 'rule' ? { borderBottom: `1px solid ${P.ink}` } : { borderBottom: `1px solid ${P.line}` }}>
            {itemsHeadCell('left', 'Description')}
            {itemsHeadCell('right', 'Qty', 64)}
            {itemsHeadCell('right', 'Rate', 110)}
            {itemsHeadCell('right', 'Amount', 120)}
          </tr>
        </thead>
        <tbody>
          {lines.length === 0 && (
            <tr><td colSpan={4} style={{ padding: '24px 0', textAlign: 'center', fontSize: 11, color: P.faint }}>No line items yet</td></tr>
          )}
          {lines.map((it, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${P.line}`, background: c.zebra && i % 2 === 1 ? P.soft : 'transparent' }}>
              <td style={{ padding: c.itemsHead === 'band' ? '9px 10px' : '10px 16px 10px 0', fontSize: 11.5, lineHeight: '16px' }}>{it.description || '—'}</td>
              <td className="num" style={{ padding: c.itemsHead === 'band' ? '9px 10px' : '10px 0', textAlign: 'right', fontSize: 11, color: P.muted }}>{it.qty || 0}</td>
              <td className="num" style={{ padding: c.itemsHead === 'band' ? '9px 10px' : '10px 0', textAlign: 'right', fontSize: 11, color: P.muted, fontFamily: c.numFont }}>{money(it.unit_price || 0, p.currency)}</td>
              <td className="num" style={{ padding: c.itemsHead === 'band' ? '9px 10px' : '10px 0', textAlign: 'right', fontSize: 11.5, fontWeight: 500, fontFamily: c.numFont }}>{money((it.qty || 0) * (it.unit_price || 0), p.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="mt-4 flex justify-end">
        <div className="w-[264px] space-y-1.5">
          <div className="flex items-baseline justify-between">
            <span style={{ fontSize: 11, color: P.muted }}>Subtotal</span>
            <span className="num" style={{ fontSize: 11, fontFamily: c.numFont }}>{money(subtotal, p.currency)}</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span style={{ fontSize: 11, color: P.muted }}>GST ({p.taxRate || 0}%)</span>
            <span className="num" style={{ fontSize: 11, fontFamily: c.numFont }}>{money(tax, p.currency)}</span>
          </div>
          <div style={{ margin: '8px 0', height: 1, background: P.ink }} />
          <div className="flex items-baseline justify-between">
            <span style={{ fontSize: 12, fontWeight: 600 }}>Total due</span>
            <span className="num" style={{ fontSize: c.display === 'var(--font-serif)' ? 18 : 16, fontWeight: 600, letterSpacing: '-0.01em', fontFamily: c.display === 'var(--font-serif)' ? 'var(--font-serif)' : c.numFont }}>
              {money(total, p.currency)}
            </span>
          </div>
        </div>
      </div>

      {p.paid && <div className="mt-6"><PaymentRecord p={p} P={P} /></div>}

      {p.notes && (
        <div className="mt-6">
          <div style={eb}>Notes</div>
          <p className="whitespace-pre-line" style={{ marginTop: 4, maxWidth: 480, fontSize: 10.5, lineHeight: '15px', color: P.muted }}>{p.notes}</p>
        </div>
      )}

      <div className="mt-auto pt-8">
        <div className="flex items-baseline justify-between" style={{ borderTop: `1px solid ${P.line}`, paddingTop: 12, fontSize: 10, color: P.faint }}>
          <span>Thank you for your business.</span>
          <span style={{ fontFamily: c.display, textTransform: c.upper ? 'uppercase' : 'none' }}>{p.org.name}</span>
        </div>
      </div>
    </div>
  );
}
