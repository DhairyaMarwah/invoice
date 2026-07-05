import type { ReactNode } from 'react';
import { money } from '@/lib/format';
import { IconArrowUp, IconArrowDown } from './icons';

export { AreaChart, type AreaPoint } from './AreaChart';

/* ----------------------------------------------------------------- Delta */
/** MoM movement badge — filled dot arrow, emerald/red, tabular. `pct: null` renders an honest em-dash. */
export function Delta({ pct, className = '' }: { pct: number | null; className?: string }) {
  if (pct === null) return <span className={`t-small num text-faint ${className}`} title="No data in the previous month">—</span>;
  const up = pct >= 0;
  const solid = up ? 'var(--ok-solid)' : 'var(--bad-solid)';
  const text = up ? 'var(--ok-text)' : 'var(--bad-text)';
  return (
    <span className={`num inline-flex items-center gap-1 text-[11.5px] font-medium ${className}`} style={{ color: text }}>
      <span className="inline-flex h-3 w-3 flex-none items-center justify-center rounded-full" style={{ background: solid }}>
        {up ? <IconArrowUp width={7} height={7} strokeWidth={3.5} className="text-bg" /> : <IconArrowDown width={7} height={7} strokeWidth={3.5} className="text-bg" />}
      </span>
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

/* -------------------------------------------------------------- StatCard */
/** Nested stat card: muted outer shell with an eyebrow header, elevated inner body. */
export function StatCard({ icon, label, header, value, delta, sub, children, className = '' }: {
  icon?: ReactNode;
  label?: string;
  /** Rich header row — replaces the icon+label eyebrow when given. */
  header?: ReactNode;
  value?: ReactNode;
  delta?: number | null;
  sub?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col rounded-md border border-border bg-panel-2 ${className}`}>
      {header ?? (
        <div className="flex h-7 items-center gap-1.5 px-3 text-faint">
          {icon}
          <span className="t-eyebrow !normal-case !text-[11px] !tracking-[0.02em]">{label}</span>
        </div>
      )}
      <div className="-m-px flex min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-panel shadow-[var(--shadow-card)]">
        {value !== undefined && (
          <div className="flex items-start justify-between gap-2 px-3.5 pb-3 pt-3">
            <div className="min-w-0">
              <div className="num t-h1 truncate">{value}</div>
              {sub && <div className="t-small mt-0.5 text-faint">{sub}</div>}
            </div>
            {delta !== undefined && <Delta pct={delta} className="mt-1 flex-none" />}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Donut */
export interface DonutSlice {
  label: string;
  value: number;
  color: string; // css color
}

/** Conic-gradient donut with the reference's bar-legend. */
export function Donut({ slices, centerValue, centerLabel, currency }: {
  slices: DonutSlice[];
  centerValue: string;
  centerLabel: string;
  currency?: string;
}) {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  let acc = 0;
  const stops = slices.map((s) => {
    const from = (acc / total) * 360;
    acc += s.value;
    const to = (acc / total) * 360;
    return `${s.color} ${from.toFixed(2)}deg ${to.toFixed(2)}deg`;
  });

  return (
    <div className="grid grid-cols-[auto_1fr] items-center gap-5">
      <div className="relative h-36 w-36 flex-none rounded-full" style={{ background: `conic-gradient(${stops.join(', ')})` }} role="img" aria-label={`${centerValue} ${centerLabel}`}>
        <div className="absolute inset-[22px] flex flex-col items-center justify-center rounded-full bg-panel">
          <span className="num t-h2">{centerValue}</span>
          <span className="text-[10.5px] text-faint">{centerLabel}</span>
        </div>
      </div>
      <ul className="flex min-w-0 flex-col justify-center gap-2.5">
        {slices.map((s, i) => (
          <li key={i} className="group flex items-center gap-2.5 rounded-[5px] px-1 py-0.5 text-[12.5px] transition-colors duration-100 hover:bg-panel-2" title={`${s.label} — ${((s.value / total) * 100).toFixed(1)}% of total`}>
            <span aria-hidden className="h-6 w-1 flex-none rounded-full" style={{ background: s.color }} />
            <span className="min-w-0 flex-1 truncate text-muted group-hover:text-fg">{s.label}</span>
            <span className="num flex-none text-[11px] text-faint">{((s.value / total) * 100).toFixed(0)}%</span>
            <span className="num flex-none font-medium">{currency ? money(s.value, currency) : s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------- Bars (reports, kept) */
export interface BarDatum {
  label: string;
  invoiced: number;
  collected: number;
}

/** Grouped bar: full bar = invoiced; the accent fill inside = collected. */
export function Bars({ data, currency = 'INR', height = 176 }: {
  data: BarDatum[];
  currency?: string;
  height?: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.invoiced));
  return (
    <div>
      <div className="flex items-end gap-1.5" style={{ height }}>
        {data.map((d, i) => {
          const invH = (d.invoiced / max) * 100;
          const colH = d.invoiced > 0 ? (d.collected / d.invoiced) * 100 : 0;
          return (
            <div key={i} className="group relative flex h-full flex-1 flex-col justify-end">
              <div className="pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-border bg-panel px-2.5 py-1.5 opacity-0 shadow-[var(--shadow-pop)] transition-opacity duration-150 group-hover:opacity-100">
                <div className="t-eyebrow mb-0.5">{d.label}</div>
                <div className="num t-small">Invoiced {money(d.invoiced, currency)}</div>
                <div className="num t-small text-accent-text">Collected {money(d.collected, currency)}</div>
              </div>
              <div className="relative w-full rounded-[4px] border border-border bg-panel-2" style={{ height: `${Math.max(invH, d.invoiced > 0 ? 2 : 0)}%` }}>
                <div className="absolute bottom-0 left-0 w-full rounded-[3px] bg-[var(--blue)]" style={{ height: `${colH}%`, opacity: 0.85 }} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-1.5">
        {data.map((d, i) => (
          <div key={i} className="num flex-1 text-center text-[10.5px] text-faint">{d.label}</div>
        ))}
      </div>
    </div>
  );
}

export function ChartLegend({ collectedLabel = 'Collected', invoicedLabel = 'Invoiced' }: { collectedLabel?: string; invoicedLabel?: string }) {
  return (
    <div className="flex items-center gap-4 text-[11.5px] text-faint">
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-[3px] bg-[var(--blue)]" /> {collectedLabel}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-[3px] border border-border bg-panel-2" /> {invoicedLabel}
      </span>
    </div>
  );
}
