import Link from 'next/link';
import { pipelineClients, pipelineFunnel, getSettings } from '@/lib/repo';
import { PageHeader, EmptyState } from '@/components/ui';
import { PipelineBoard } from '@/components/PipelineBoard';
import { SALES_STAGE } from '@/lib/format';
import { moneyCompact } from '@/lib/format';
import { IconPlus, IconClients } from '@/components/icons';

export const dynamic = 'force-dynamic';

export default function PipelinePage() {
  const cur = getSettings().default_currency || 'INR';
  const clients = pipelineClients();
  const funnel = pipelineFunnel();
  const openProjected = funnel
    .filter((f) => SALES_STAGE[f.stage]?.open)
    .reduce((s, f) => s + f.projected, 0);
  const openCount = funnel.filter((f) => SALES_STAGE[f.stage]?.open).reduce((s, f) => s + f.count, 0);

  return (
    <div>
      <PageHeader
        title="Pipeline"
        subtitle={<span className="num">{openCount} open · {moneyCompact(openProjected, cur)} projected</span>}
        actions={<Link href="/clients/new" className="btn btn-primary focus-ring"><IconPlus width={14} height={14} /> New Client</Link>}
      />
      <div className="mx-auto max-w-[1400px] px-5 py-5">
        {clients.length === 0 ? (
          <EmptyState
            icon={<IconClients width={20} height={20} />}
            title="No clients in the pipeline"
            hint="Every client sits in a sales stage. Add one and drag it across the board as the deal progresses."
            action={<Link href="/clients/new" className="btn btn-primary focus-ring"><IconPlus width={14} height={14} /> New Client</Link>}
          />
        ) : (
          <div className="rise">
            <p className="t-small mb-3 text-faint">Drag a client card between columns to move its sales stage — each move is logged to the client&apos;s timeline.</p>
            <PipelineBoard clients={clients} currency={cur} />
          </div>
        )}
      </div>
    </div>
  );
}
