'use client';

import { useRef } from 'react';
import { setStageAction } from '@/app/actions';
import { SALES_STAGE, SALES_STAGE_ORDER } from '@/lib/format';
import type { SalesStage } from '@/lib/types';

/** Inline sales-stage selector — submits on change and logs a stage activity. */
export function StageChanger({ clientId, stage }: { clientId: number; stage: SalesStage }) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form ref={ref} action={setStageAction} className="flex items-center gap-1.5">
      <input type="hidden" name="client_id" value={clientId} />
      <select
        name="stage"
        defaultValue={stage}
        onChange={() => ref.current?.requestSubmit()}
        className="select focus-ring !h-8 w-auto text-[12.5px] font-medium"
        aria-label="Sales stage"
      >
        {SALES_STAGE_ORDER.map((k) => <option key={k} value={k}>{SALES_STAGE[k].label}</option>)}
      </select>
    </form>
  );
}
