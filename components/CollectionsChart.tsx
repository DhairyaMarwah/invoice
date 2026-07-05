'use client';

import { useState } from 'react';
import { AreaChart } from '@/components/AreaChart';
import { money } from '@/lib/format';

export interface MonthValue { label: string; value: number; invoiced: number }

/** Interactive collections chart with a mono range toggle (3M / 6M / 12M). */
export function CollectionsChart({ data, currency }: { data: MonthValue[]; currency: string }) {
  const [range, setRange] = useState<3 | 6 | 12>(12);
  const sliced = data.slice(-range);
  const collected = sliced.reduce((s, d) => s + d.value, 0);
  const invoiced = sliced.reduce((s, d) => s + d.invoiced, 0);
  const rate = invoiced > 0 ? Math.round((collected / invoiced) * 100) : 0;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 px-3.5 pt-3">
        <div className="flex gap-7">
          <div>
            <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
              <span className="h-2 w-2 bg-[var(--blue)]" /> Collected
            </div>
            <div className="num mt-1 text-[22px] font-semibold leading-none tracking-tight">{money(collected, currency)}</div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
              <span className="h-2 w-2 border border-border-strong bg-panel-2" /> Invoiced
            </div>
            <div className="num mt-1 text-[22px] font-semibold leading-none tracking-tight text-muted">{money(invoiced, currency)}</div>
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-faint">Collection</div>
            <div className="num mt-1 text-[22px] font-semibold leading-none tracking-tight text-[var(--ok-text)]">{rate}%</div>
          </div>
        </div>
        <div className="flex items-center gap-0.5 border border-border p-0.5">
          {([3, 6, 12] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`focus-ring px-2 py-0.5 font-mono text-[11px] transition-colors ${range === r ? 'bg-fg text-bg' : 'text-muted hover:text-fg'}`}
            >
              {r}M
            </button>
          ))}
        </div>
      </div>
      <div className="px-2 pb-2 pt-2">
        <AreaChart id="bc-collections" currency={currency} height={172} labelEvery={range > 6 ? 2 : 1} data={sliced.map((d) => ({ label: d.label, value: d.value }))} />
      </div>
    </div>
  );
}
