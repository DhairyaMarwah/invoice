import Link from 'next/link';
import { deleteApprovalAction } from '@/app/actions';
import { ApprovalDecision } from '@/components/forms/ApprovalControls';
import { ConfirmForm } from '@/components/ConfirmForm';
import { Pill } from '@/components/ui';
import { APPROVAL_STATUS, APPROVAL_KIND, money, fmtRelative, fmtDate } from '@/lib/format';
import type { ApprovalStatus } from '@/lib/types';
import type { ApprovalRow } from '@/lib/repo';
import { IconTrash } from '@/components/icons';

export function ApprovalList({ approvals, emptyHint }: { approvals: ApprovalRow[]; emptyHint?: string }) {
  if (approvals.length === 0) {
    return <p className="t-small rounded-md border border-dashed border-border-strong px-4 py-8 text-center text-faint">{emptyHint ?? 'Nothing here.'}</p>;
  }
  return (
    <div className="flex flex-col gap-2">
      {approvals.map((a) => {
        const st = APPROVAL_STATUS[a.status as ApprovalStatus];
        return (
          <div key={a.id} className="card p-3.5">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="t-h4">{a.title}</span>
                  <Pill tone={st.tone} dot={false}>{st.label}</Pill>
                  <Pill tone="neu" dot={false}>{APPROVAL_KIND[a.kind]}</Pill>
                  {a.amount != null && <span className="num t-small font-medium">{money(a.amount, a.currency || 'INR')}</span>}
                </div>
                <div className="t-small mt-1 flex flex-wrap items-center gap-x-3 text-faint">
                  {a.client_name && <Link href={`/clients/${a.client_id}`} className="hover:text-accent-text">{a.client_name}</Link>}
                  <span>raised {fmtRelative(a.created_at)}</span>
                  {a.decided_at && <span>· {st.label.toLowerCase()} {fmtDate(a.decided_at)}</span>}
                </div>
                {a.detail && <p className="t-small mt-1.5 whitespace-pre-line text-muted">{a.detail}</p>}
                {a.decision_note && <p className="t-small mt-1.5 text-muted"><span className="text-faint">Note:</span> {a.decision_note}</p>}
              </div>
              <div className="flex flex-none items-center gap-1">
                {a.status === 'pending' ? (
                  <ApprovalDecision id={a.id} />
                ) : (
                  <ConfirmForm action={deleteApprovalAction} hidden={{ id: a.id }} message="Delete this approval record?" className="btn btn-icon btn-ghost btn-sm focus-ring text-faint hover:text-[var(--bad-text)]">
                    <IconTrash width={13} height={13} />
                  </ConfirmForm>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
