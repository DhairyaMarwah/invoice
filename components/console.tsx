import Link from 'next/link';
import type { ReactNode } from 'react';
import { Delta } from '@/components/Charts';

/** Blueprint-style crosshair "+" marks at the four corners of a panel. */
export function PlusCorners() {
  const pos = ['-left-[5px] -top-[5px]', '-right-[5px] -top-[5px]', '-left-[5px] -bottom-[5px]', '-right-[5px] -bottom-[5px]'];
  return (
    <>
      {pos.map((p, i) => (
        <span key={i} className={`pointer-events-none absolute z-20 ${p} text-faint`} aria-hidden>
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1">
            <path d="M4.5 0.5v8M0.5 4.5h8" />
          </svg>
        </span>
      ))}
    </>
  );
}

/** A bordered console panel with a mono eyebrow header and corner crosshairs. */
export function Panel({
  label, tag, action, children, dashed = false, className = '', bodyClass = '',
}: {
  label?: string;
  tag?: string;
  action?: ReactNode;
  children: ReactNode;
  dashed?: boolean;
  className?: string;
  bodyClass?: string;
}) {
  return (
    <section className={`relative border ${dashed ? 'border-dashed' : ''} border-border-strong bg-panel ${className}`}>
      <PlusCorners />
      {(label || action) && (
        <div className="flex items-center justify-between gap-2 border-b border-dashed border-border px-3 py-2">
          {label && (
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
              {label}{tag && <span className="ml-1.5 text-fg/40">// {tag}</span>}
            </span>
          )}
          {action}
        </div>
      )}
      <div className={bodyClass}>{children}</div>
    </section>
  );
}

/** Hairline-separated grid of cells (the `gap-px bg-border` motif). */
export function CellGrid({ cols = 'grid-cols-2 lg:grid-cols-4', children }: { cols?: string; children: ReactNode }) {
  return <div className={`grid ${cols} gap-px bg-border`}>{children}</div>;
}

/** A single console stat cell — mono label, big tabular value, optional delta. */
export function ConsoleStat({
  label, value, delta, sub, href, accent,
}: {
  label: string;
  value: ReactNode;
  delta?: number | null;
  sub?: ReactNode;
  href?: string;
  accent?: string; // css color for the label tick
}) {
  const inner = (
    <>
      <div className="flex items-center gap-1.5">
        {accent && <span className="h-2 w-2 flex-none" style={{ background: accent }} />}
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">{label}</span>
        {delta !== undefined && <span className="ml-auto"><Delta pct={delta} /></span>}
      </div>
      <div className="num mt-2 text-[26px] font-semibold leading-none tracking-tight">{value}</div>
      {sub && <div className="t-small mt-1.5 text-faint">{sub}</div>}
    </>
  );
  const cls = 'group relative block bg-panel p-3.5 transition-colors duration-100';
  return href ? (
    <Link href={href} className={`${cls} focus-ring hover:bg-panel-2`}>
      {inner}
      <span className="pointer-events-none absolute right-3 top-3.5 text-faint opacity-0 transition-opacity group-hover:opacity-100">→</span>
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

/** Thin proportional segmented bar — the tracker's `.pbar` progress strip. */
export function Strip({ segments, height = 3 }: { segments: { value: number; color: string; label?: string }[]; height?: number }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <div className="flex w-full overflow-hidden rounded-[1px]" style={{ height, background: 'var(--border)' }}>
      {segments.filter((s) => s.value > 0).map((s, i) => (
        <span key={i} style={{ width: `${(s.value / total) * 100}%`, background: s.color }} title={s.label} />
      ))}
    </div>
  );
}

/** Dashed "+" add tile — the tracker's add affordance. */
export function DashedAddTile({ href, label, kbd }: { href: string; label: string; kbd?: string }) {
  return (
    <Link href={href} className="focus-ring group flex items-center gap-2.5 border border-dashed border-border-strong bg-panel px-3 py-2.5 transition-colors duration-100 hover:border-fg-faint hover:bg-panel-2">
      <span className="flex h-5 w-5 flex-none items-center justify-center border border-dashed border-border-strong text-faint transition-colors group-hover:border-fg-faint group-hover:text-fg">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
      </span>
      <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted group-hover:text-fg">{label}</span>
      {kbd && <span className="kbd ml-auto">{kbd}</span>}
    </Link>
  );
}
