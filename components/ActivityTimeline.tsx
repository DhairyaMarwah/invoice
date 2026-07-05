import { deleteActivityAction } from '@/app/actions';
import { ConfirmForm } from '@/components/ConfirmForm';
import { ACTIVITY_KIND, fmtDate, fmtRelative, money } from '@/lib/format';
import type { Activity } from '@/lib/types';
import {
  IconFile, IconPhone, IconMail, IconClients, IconContracts, IconInvoices,
  IconCheck, IconSparkle, IconTrash, IconExternal, IconPipeline,
} from '@/components/icons';

const KIND_ICON: Record<string, typeof IconFile> = {
  note: IconSparkle,
  call: IconPhone,
  email: IconMail,
  meeting: IconClients,
  proposal: IconFile,
  file: IconFile,
  stage: IconPipeline,
  contract: IconContracts,
  invoice: IconInvoices,
  payment: IconCheck,
};

function meta(a: Activity): { from?: string; to?: string; total?: number; currency?: string } {
  try { return a.meta ? JSON.parse(a.meta) : {}; } catch { return {}; }
}

export function ActivityTimeline({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) {
    return <p className="t-small rounded-md border border-dashed border-border-strong px-4 py-8 text-center text-faint">No activity logged yet. Record the first call, email, or meeting.</p>;
  }
  return (
    <ol className="relative flex flex-col">
      {activities.map((a, i) => {
        const Icon = KIND_ICON[a.kind] ?? IconSparkle;
        const tone = ACTIVITY_KIND[a.kind]?.tone ?? 'neu';
        const m = meta(a);
        const last = i === activities.length - 1;
        return (
          <li key={a.id} className="group relative flex gap-3 pb-4">
            {!last && <span className="absolute left-[13px] top-7 h-full w-px bg-border" aria-hidden />}
            <span className={`pill tone-${tone} relative z-10 h-[26px] w-[26px] flex-none items-center justify-center !p-0`} style={{ borderRadius: 999 }}>
              <Icon width={13} height={13} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="t-label text-fg">{a.title || ACTIVITY_KIND[a.kind]?.label}</span>
                <span className="t-small text-faint">· {ACTIVITY_KIND[a.kind]?.label}</span>
                <span className="t-small ml-auto flex-none text-faint" title={fmtDate(a.occurred_at)}>{fmtRelative(a.occurred_at)}</span>
                <ConfirmForm action={deleteActivityAction} hidden={{ id: a.id, client_id: a.client_id }} message="Delete this activity?" className="btn btn-icon btn-ghost btn-sm focus-ring flex-none text-faint opacity-0 transition-opacity group-hover:opacity-100 hover:text-[var(--bad-text)]">
                  <IconTrash width={12} height={12} />
                </ConfirmForm>
              </div>
              {a.body && <p className="t-small mt-0.5 whitespace-pre-line text-muted">{a.body}</p>}
              {a.kind === 'stage' && m.to && (
                <p className="t-small mt-0.5 text-faint">Moved to <span className="text-fg">{m.to.replace(/_/g, ' ')}</span></p>
              )}
              {m.total != null && (
                <p className="num t-small mt-0.5 text-faint">{money(m.total, m.currency || 'INR')}</p>
              )}
              {a.file && (
                <a href={`/api/files/${a.file}`} target="_blank" rel="noreferrer" className="link t-small mt-1 inline-flex items-center gap-1">
                  <IconFile width={12} height={12} /> {a.file_name || 'Attachment'} <IconExternal width={11} height={11} />
                </a>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
