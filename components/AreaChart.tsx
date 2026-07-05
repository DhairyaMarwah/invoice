'use client';

import { useRef, useState } from 'react';
import { money } from '@/lib/format';

export interface AreaPoint {
  label: string;
  value: number;
}

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const mag = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 2, 2.5, 5, 10]) if (v <= m * mag) return m * mag;
  return 10 * mag;
}

function compact(v: number, currency?: string): string {
  try {
    if (currency) {
      return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', { style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1 }).format(v);
    }
  } catch { /* fall through */ }
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(v);
}

/**
 * Interactive SVG area chart — gradient fill, dashed row grid, edge-faded
 * stroke, and a pointer-tracked crosshair + tooltip (keyboard: focus + arrows).
 */
export function AreaChart({ data, currency, height = 190, id, labelEvery = 1, seriesLabel = 'Collected' }: {
  data: AreaPoint[];
  currency?: string;
  height?: number;
  id: string;
  labelEvery?: number;
  seriesLabel?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);

  const W = 720;
  const H = height;
  const padTop = 12;
  const max = niceMax(Math.max(1, ...data.map((d) => d.value)));
  const n = Math.max(1, data.length - 1);
  const x = (i: number) => (i / n) * W;
  const y = (v: number) => padTop + (1 - v / max) * (H - padTop);
  const pts = data.map((d, i) => `${x(i).toFixed(1)},${y(d.value).toFixed(1)}`);
  const line = `M${pts.join('L')}`;
  const area = `${line}L${W},${H}L0,${H}Z`;
  const rows = [0.25, 0.5, 0.75, 1];

  function onMove(e: React.PointerEvent) {
    const el = wrapRef.current;
    if (!el || data.length === 0) return;
    const rect = el.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    setActive(Math.round(frac * n));
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowRight') { e.preventDefault(); setActive((a) => Math.min(data.length - 1, (a ?? -1) + 1)); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); setActive((a) => Math.max(0, (a ?? data.length) - 1)); }
    else if (e.key === 'Escape') setActive(null);
  }

  const a = active !== null ? data[active] : null;
  const axPct = active !== null ? (x(active) / W) * 100 : 0;
  const ayPct = a ? (y(a.value) / H) * 100 : 0;

  return (
    <div className="min-w-0">
      <div
        ref={wrapRef}
        className="focus-ring relative cursor-crosshair rounded-sm outline-none"
        onPointerMove={onMove}
        onPointerLeave={() => setActive(null)}
        onKeyDown={onKey}
        onBlur={() => setActive(null)}
        tabIndex={0}
        role="img"
        aria-label={`${seriesLabel} trend, ${data.length} points, peak ${compact(max, currency)}. Use arrow keys to inspect.`}
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" aria-hidden preserveAspectRatio="none">
          <defs>
            <linearGradient id={`${id}-fill`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--blue)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--blue)" stopOpacity="0" />
            </linearGradient>
            <linearGradient id={`${id}-stroke`} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="var(--blue)" stopOpacity="0" />
              <stop offset="8%" stopColor="var(--blue)" stopOpacity="1" />
              <stop offset="92%" stopColor="var(--blue)" stopOpacity="1" />
              <stop offset="100%" stopColor="var(--blue)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {rows.map((r) => (
            <line key={r} x1="0" x2={W} y1={y(max * (1 - r))} y2={y(max * (1 - r))} stroke="var(--border)" strokeDasharray="4 4" strokeWidth="1" />
          ))}
          <path d={area} fill={`url(#${id}-fill)`} />
          <path d={line} fill="none" stroke={`url(#${id}-stroke)`} strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          {active !== null && (
            <line x1={x(active)} x2={x(active)} y1={padTop / 2} y2={H} stroke="var(--fg-faint)" strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
          )}
        </svg>

        {/* Active dot + tooltip (HTML, so text stays crisp) */}
        {a && (
          <>
            <span
              className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-bg bg-[var(--blue)]"
              style={{ left: `${axPct}%`, top: `${ayPct}%` }}
            />
            <div
              className="pointer-events-none absolute z-10 -translate-y-full whitespace-nowrap rounded-md border border-border bg-panel px-2.5 py-1.5 shadow-[var(--shadow-pop)]"
              style={{
                left: `clamp(8px, ${axPct}%, calc(100% - 8px))`,
                top: `calc(${ayPct}% - 10px)`,
                transform: `translateX(${axPct > 78 ? '-100%' : axPct < 22 ? '0%' : '-50%'}) translateY(-100%)`,
              }}
              aria-live="polite"
            >
              <div className="t-eyebrow mb-0.5">{a.label}</div>
              <div className="num flex items-center gap-1.5 text-[12px] font-medium">
                <span className="h-2 w-2 rounded-[3px] bg-[var(--blue)]" />
                {seriesLabel} <span className="ml-1">{currency ? money(a.value, currency) : a.value}</span>
              </div>
            </div>
          </>
        )}

        <span className="num pointer-events-none absolute left-1 top-0 text-[10px] text-faint">{compact(max, currency)}</span>
      </div>

      <div className="mt-1.5 flex">
        {data.map((d, i) => (
          <span key={i} className={`num flex-1 text-center text-[10.5px] transition-colors duration-100 ${active === i ? 'font-medium text-fg' : 'text-faint'}`}>
            {i % labelEvery === 0 ? d.label : ''}
          </span>
        ))}
      </div>
    </div>
  );
}
