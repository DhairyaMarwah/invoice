'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setStageAction } from '@/app/actions';
import { SALES_STAGE, SALES_STAGE_ORDER, money, moneyCompact, fmtRelative } from '@/lib/format';
import { SegmentPill } from '@/components/ui';
import type { SalesStage, ClientSegment } from '@/lib/types';

export interface PipelineCard {
  id: number;
  name: string;
  sales_stage: SalesStage;
  segment: string | null;
  source: string | null;
  projected_value: number | null;
  currency: string;
  expected_close: string | null;
  last_activity_at: string | null;
  outstanding: number;
}

export function PipelineBoard({ clients, currency }: { clients: PipelineCard[]; currency: string }) {
  const router = useRouter();
  const [items, setItems] = useState(clients);
  const [dragId, setDragId] = useState<number | null>(null);
  const [overStage, setOverStage] = useState<SalesStage | null>(null);
  const [, startTransition] = useTransition();

  // Reconcile with server truth after refresh.
  useEffect(() => { setItems(clients); }, [clients]);

  function move(id: number, stage: SalesStage) {
    const card = items.find((c) => c.id === id);
    if (!card || card.sales_stage === stage) return;
    setItems((p) => p.map((c) => (c.id === id ? { ...c, sales_stage: stage } : c)));
    const fd = new FormData();
    fd.set('client_id', String(id));
    fd.set('stage', stage);
    startTransition(async () => {
      await setStageAction(fd);
      router.refresh();
    });
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-3">
      {SALES_STAGE_ORDER.map((stage) => {
        const col = items.filter((c) => c.sales_stage === stage);
        const projected = col.reduce((s, c) => s + (c.projected_value || 0), 0);
        const s = SALES_STAGE[stage];
        const isOver = overStage === stage;
        return (
          <section
            key={stage}
            onDragOver={(e) => { e.preventDefault(); setOverStage(stage); }}
            onDragLeave={() => setOverStage((o) => (o === stage ? null : o))}
            onDrop={(e) => { e.preventDefault(); const id = Number(e.dataTransfer.getData('id')); setOverStage(null); setDragId(null); if (id) move(id, stage); }}
            className={`flex w-[248px] flex-none flex-col rounded-md border bg-panel-2 transition-colors ${isOver ? 'border-[var(--ring)]' : 'border-border'}`}
          >
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <span className="h-2 w-2 flex-none rounded-full" style={{ background: `var(--${s.tone}-solid)` }} />
              <span className="t-label truncate">{s.short}</span>
              <span className="num ml-auto text-[11px] text-faint">{col.length}</span>
            </div>
            <div className="border-b border-border px-3 py-1.5">
              <span className="num t-small text-faint">{projected > 0 ? `${moneyCompact(projected, currency)} projected` : '—'}</span>
            </div>
            <div className="flex min-h-[80px] flex-1 flex-col gap-2 p-2">
              {col.map((c) => (
                <a
                  key={c.id}
                  href={`/clients/${c.id}`}
                  draggable
                  onDragStart={(e) => { e.dataTransfer.setData('id', String(c.id)); e.dataTransfer.effectAllowed = 'move'; setDragId(c.id); }}
                  onDragEnd={() => { setDragId(null); setOverStage(null); }}
                  className={`focus-ring block cursor-grab rounded-[5px] border border-border bg-panel p-2.5 shadow-[var(--shadow-card)] transition-opacity active:cursor-grabbing ${dragId === c.id ? 'opacity-40' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="t-label line-clamp-2 text-fg">{c.name}</span>
                    <SegmentPill segment={c.segment as ClientSegment | null} />
                  </div>
                  {c.projected_value ? <div className="num mt-1.5 text-[13px] font-medium">{money(c.projected_value, c.currency)}</div> : null}
                  <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-faint">
                    <span className="truncate">{c.source || '—'}</span>
                    <span className="flex-none">{c.last_activity_at ? fmtRelative(c.last_activity_at) : 'no activity'}</span>
                  </div>
                  {c.outstanding > 0 && (
                    <div className="num mt-1 text-[11px] text-[var(--warn-text)]">{money(c.outstanding, c.currency)} outstanding</div>
                  )}
                </a>
              ))}
              {col.length === 0 && <div className="flex flex-1 items-center justify-center rounded-[5px] border border-dashed border-border py-4 text-[11px] text-faint">Drop here</div>}
            </div>
          </section>
        );
      })}
    </div>
  );
}
