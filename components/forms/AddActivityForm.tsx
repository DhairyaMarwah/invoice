'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { addActivityAction } from '@/app/actions';
import { ACTIVITY_KIND, todayISO } from '@/lib/format';
import type { ActivityKind } from '@/lib/types';
import { IconPlus, IconFile } from '@/components/icons';

const KINDS: ActivityKind[] = ['note', 'call', 'email', 'meeting', 'proposal', 'file'];

export function AddActivityForm({ clientId }: { clientId: number }) {
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const [stamp, formAction, pending] = useActionState(
    async (_prev: number, fd: FormData) => { await addActivityAction(fd); return Date.now(); },
    0,
  );

  useEffect(() => {
    if (stamp) { formRef.current?.reset(); setFileName(''); setOpen(false); }
  }, [stamp]);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn btn-secondary btn-sm focus-ring">
        <IconPlus width={13} height={13} /> Log activity
      </button>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="card flex flex-col gap-2.5 p-3">
      <input type="hidden" name="client_id" value={clientId} />
      <div className="flex items-center gap-2">
        <select name="kind" defaultValue="note" className="select focus-ring !h-8 w-auto text-[12.5px]">
          {KINDS.map((k) => <option key={k} value={k}>{ACTIVITY_KIND[k].label}</option>)}
        </select>
        <input name="title" placeholder="What happened? (e.g. Intro call with Dean)" className="input focus-ring !h-8 flex-1" required />
        <input name="occurred_at" type="date" defaultValue={todayISO()} className="input focus-ring !h-8 w-auto" />
      </div>
      <textarea name="body" rows={2} placeholder="Notes, next steps, what was discussed / proposed…" className="textarea focus-ring !min-h-0" />
      <div className="flex items-center gap-2">
        <label className="btn btn-ghost btn-sm focus-ring cursor-pointer text-muted">
          <IconFile width={13} height={13} /> {fileName || 'Attach file'}
          <input type="file" name="file" className="hidden" onChange={(e) => setFileName(e.target.files?.[0]?.name ?? '')} />
        </label>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost btn-sm focus-ring">Cancel</button>
          <button type="submit" disabled={pending} aria-busy={pending} className="btn btn-primary btn-sm focus-ring">
            {pending ? 'Saving…' : 'Add to timeline'}
          </button>
        </div>
      </div>
    </form>
  );
}
