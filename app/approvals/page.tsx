import Link from 'next/link';
import { listApprovals, approvalCounts, listClients } from '@/lib/repo';
import { PageHeader } from '@/components/ui';
import { ApprovalList } from '@/components/ApprovalList';
import { RaiseApprovalForm } from '@/components/forms/ApprovalControls';
import type { ApprovalStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

const TABS: { key: ApprovalStatus; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Completed' },
  { key: 'rejected', label: 'Rejected' },
];

export default async function ApprovalsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const sp = await searchParams;
  const tab = (TABS.find((t) => t.key === sp.tab)?.key ?? 'pending') as ApprovalStatus;
  const counts = approvalCounts();
  const approvals = listApprovals(tab);
  const clients = listClients().map((c) => ({ id: c.id, name: c.name }));

  return (
    <div>
      <PageHeader title="Approvals" subtitle="Sign-off on proposals, discounts, and spend" />
      <div className="mx-auto max-w-[900px] px-5 py-5">
        <div className="mb-3 flex items-center gap-0.5 rounded-md border border-border bg-panel p-0.5 w-fit">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/approvals?tab=${t.key}`}
              className={`focus-ring flex items-center gap-1.5 rounded-[5px] px-3 py-1 text-[12.5px] font-medium transition-colors ${tab === t.key ? 'bg-panel-2 text-fg shadow-[var(--shadow-card)]' : 'text-muted hover:text-fg'}`}
            >
              {t.label}
              <span className="num text-faint">{counts[t.key]}</span>
            </Link>
          ))}
        </div>

        <div className="mb-4"><RaiseApprovalForm clients={clients} /></div>

        <div className="rise">
          <ApprovalList
            approvals={approvals}
            emptyHint={tab === 'pending' ? 'No pending approvals — you’re all caught up.' : `No ${tab === 'approved' ? 'completed' : 'rejected'} approvals.`}
          />
        </div>
      </div>
    </div>
  );
}
