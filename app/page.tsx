import Link from 'next/link';
import {
  counts, totals, monthlySeries, monthDeltas, revenueByCategory, recurringRevenue,
  recentInvoices, expiringContracts, recentActivities, pipelineFunnel, followUps,
  approvalCounts, listApprovals, getSettings,
} from '@/lib/repo';
import { PageHeader, EmptyState, InvoiceStatusPill, SalesStagePill, Pill } from '@/components/ui';
import { Donut } from '@/components/Charts';
import { Panel, CellGrid, ConsoleStat, Strip, DashedAddTile } from '@/components/console';
import { CollectionsChart } from '@/components/CollectionsChart';
import { ApprovalList } from '@/components/ApprovalList';
import { RowLink } from '@/components/RowLink';
import {
  money, moneyCompact, fmtDate, daysUntil, fmtRelative, SALES_STAGE, SALES_STAGE_ORDER,
} from '@/lib/format';
import { IconPlus, IconArrowRight } from '@/components/icons';

export const dynamic = 'force-dynamic';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CAT_COLOR: Record<string, string> = { pegasus: 'var(--info-solid)', iris: 'var(--pur-solid)', atlas: 'var(--warn-solid)', untagged: 'var(--neu-solid)' };
const CAT_LABEL: Record<string, string> = { pegasus: 'Pegasus', iris: 'Iris', atlas: 'Atlas', untagged: 'Untagged' };

export default function BusinessCentralPage() {
  const c = counts();
  const cur = getSettings().default_currency || 'INR';
  const year = String(new Date().getFullYear());
  const yr = totals(year);
  const all = totals();
  const series = monthlySeries(12);
  const deltas = monthDeltas();
  const { arr } = recurringRevenue();
  const byCat = revenueByCategory(year);
  const recentInv = recentInvoices(5);
  const expiring = expiringContracts(60);
  const activity = recentActivities(8);
  const funnel = pipelineFunnel();
  const fups = followUps(6);
  const appr = approvalCounts();
  const pendingApprovals = listApprovals('pending').slice(0, 3);
  const thisMonthName = MONTHS[new Date().getMonth()].toUpperCase();

  const empty = c.clients === 0;
  const catTotal = byCat.reduce((s, x) => s + x.invoiced, 0);
  const openStages = SALES_STAGE_ORDER.filter((k) => SALES_STAGE[k].open);
  const funnelMap = new Map(funnel.map((f) => [f.stage, f]));
  const maxStageCount = Math.max(1, ...openStages.map((k) => funnelMap.get(k)?.count ?? 0));
  const openProjected = openStages.reduce((s, k) => s + (funnelMap.get(k)?.projected ?? 0), 0);
  const chartData = series.map((m) => ({ label: MONTHS[parseInt(m.month.slice(5), 10) - 1], value: m.collected, invoiced: m.invoiced }));

  return (
    <div>
      <PageHeader
        title="Business Central"
        subtitle={<span className="font-mono text-[11px] uppercase tracking-[0.12em]">Command console · CY {year}</span>}
        actions={
          <>
            <Link href="/clients/new" className="btn btn-secondary focus-ring"><IconPlus width={14} height={14} /> New Client</Link>
            <Link href="/invoices/new" className="btn btn-primary focus-ring"><IconPlus width={14} height={14} /> New Invoice</Link>
          </>
        }
      />

      <div className="mx-auto max-w-[1240px] px-6 py-6">
        {empty ? (
          <EmptyState
            icon={<IconPlus width={22} height={22} />}
            title="Set up your first client"
            hint="The console tracks the whole journey — pipeline stage, contacts, conversations, contracts, and invoices."
            action={<Link href="/clients/new" className="btn btn-primary btn-lg focus-ring"><IconPlus width={15} height={15} /> Add your first client</Link>}
          />
        ) : (
          <div className="flex flex-col gap-6">
            {/* ACTIONABLES */}
            <Panel label="Actionables" tag="now" className="rise">
              <CellGrid>
                <ConsoleStat href="/approvals" label="Pending approvals" value={appr.pending} sub="awaiting sign-off" accent="var(--warn-solid)" />
                <ConsoleStat href="/clients" label="Follow-ups due" value={fups.length} sub="going stale / closing" accent="var(--info-solid)" />
                <ConsoleStat href="/invoices?status=unpaid" label="Overdue" value={moneyCompact(all.overdue, cur)} sub={`${all.overdueCount} invoice${all.overdueCount === 1 ? '' : 's'}`} accent="var(--bad-solid)" />
                <ConsoleStat href="/pipeline" label="Open pipeline" value={moneyCompact(openProjected, cur)} sub="projected value" accent="var(--pur-solid)" />
              </CellGrid>
            </Panel>

            {/* QUICK ADD — dashed + tiles */}
            <Panel label="Quick add" tag="create" className="rise" bodyClass="grid grid-cols-2 gap-2 p-3 lg:grid-cols-4">
              <DashedAddTile href="/clients/new" label="New client" />
              <DashedAddTile href="/contracts/new" label="New contract" />
              <DashedAddTile href="/invoices/new" label="New invoice" kbd="I" />
              <DashedAddTile href="/approvals" label="Raise approval" />
            </Panel>

            {/* REVENUE + MIX */}
            <div className="rise grid gap-6 lg:grid-cols-[1.75fr_1fr]" style={{ animationDelay: '60ms' }}>
              <Panel label="Revenue" tag="collections" action={<Link href="/reports" className="font-mono text-[10px] uppercase tracking-[0.12em] text-faint hover:text-fg">reports →</Link>}>
                <CollectionsChart data={chartData} currency={cur} />
              </Panel>
              <Panel label="Mix" tag={`by category · ${year}`}>
                <div className="flex flex-1 flex-col justify-center p-4">
                  {catTotal > 0 ? (
                    <Donut currency={cur} centerValue={moneyCompact(catTotal, cur)} centerLabel="invoiced"
                      slices={byCat.filter((x) => x.invoiced > 0).map((x) => ({ label: CAT_LABEL[x.category] ?? x.category, value: x.invoiced, color: CAT_COLOR[x.category] ?? 'var(--neu-solid)' }))} />
                  ) : (
                    <p className="t-small py-8 text-center text-faint">No invoiced revenue yet this year.</p>
                  )}
                </div>
              </Panel>
            </div>

            {/* PIPELINE + FOLLOW-UPS */}
            <div className="rise grid gap-6 lg:grid-cols-[1.6fr_1fr]" style={{ animationDelay: '100ms' }}>
              <Panel label="Pipeline" tag="open stages" action={<Link href="/pipeline" className="font-mono text-[10px] uppercase tracking-[0.12em] text-faint hover:text-fg">board →</Link>}>
                <div className="border-b border-dashed border-border px-3.5 py-3">
                  <Strip height={4} segments={openStages.map((k) => ({ value: funnelMap.get(k)?.count ?? 0, color: `var(--${SALES_STAGE[k].tone}-solid)`, label: `${SALES_STAGE[k].short} · ${funnelMap.get(k)?.count ?? 0}` }))} />
                </div>
                <div className="flex flex-col">
                  {openStages.map((k, idx) => {
                    const f = funnelMap.get(k);
                    const count = f?.count ?? 0;
                    const s = SALES_STAGE[k];
                    return (
                      <Link key={k} href="/pipeline" className={`focus-ring group grid grid-cols-[128px_1fr_auto] items-center gap-3 px-3.5 py-2 transition-colors hover:bg-panel-2 ${idx > 0 ? 'border-t border-dashed border-border' : ''}`}>
                        <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.06em] text-muted group-hover:text-fg">
                          <span className="h-2 w-2 flex-none" style={{ background: `var(--${s.tone}-solid)` }} />
                          <span className="truncate">{s.short}</span>
                        </span>
                        <span className="relative h-2.5 overflow-hidden bg-panel-2">
                          <span className="absolute inset-y-0 left-0" style={{ width: `${(count / maxStageCount) * 100}%`, background: `var(--${s.tone}-solid)`, opacity: 0.85 }} />
                        </span>
                        <span className="flex items-center gap-3">
                          <span className="num w-5 text-right text-[13px] font-semibold">{count}</span>
                          <span className="num w-16 text-right font-mono text-[11px] text-faint">{f && f.projected > 0 ? moneyCompact(f.projected, cur) : '—'}</span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </Panel>

              <Panel label="Follow-ups" tag="due">
                {fups.length === 0 ? (
                  <p className="t-small px-3 py-8 text-center text-faint">Nothing needs chasing.</p>
                ) : (
                  <ul className="flex flex-col">
                    {fups.map((f, i) => (
                      <li key={f.id} className={i > 0 ? 'border-t border-dashed border-border' : ''}>
                        <Link href={`/clients/${f.id}`} className="focus-ring flex items-center justify-between gap-2 px-3.5 py-2 hover:bg-panel-2">
                          <span className="min-w-0">
                            <span className="t-label block truncate">{f.name}</span>
                            <span className="t-small text-faint">{f.reason}</span>
                          </span>
                          <SalesStagePill stage={f.sales_stage} short />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>

            {/* ACTIVITY + APPROVALS */}
            <div className="rise grid gap-6 lg:grid-cols-[1.6fr_1fr]" style={{ animationDelay: '140ms' }}>
              <Panel label="Activity" tag="recent" action={<Link href="/clients" className="font-mono text-[10px] uppercase tracking-[0.12em] text-faint hover:text-fg">clients →</Link>}>
                {activity.length === 0 ? (
                  <p className="t-small py-8 text-center text-faint">No activity yet.</p>
                ) : (
                  <ol className="flex flex-col">
                    {activity.map((a, i) => (
                      <li key={a.id} className={`flex items-baseline gap-2.5 px-3.5 py-2 ${i > 0 ? 'border-t border-dashed border-border' : ''}`}>
                        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-faint">{a.kind.slice(0, 4)}</span>
                        <div className="min-w-0 flex-1">
                          <Link href={`/clients/${a.client_id}`} className="t-small"><span className="font-medium text-fg hover:text-accent-text">{a.client_name}</span> <span className="text-muted">— {a.title}</span></Link>
                        </div>
                        <span className="num flex-none font-mono text-[11px] text-faint">{fmtRelative(a.occurred_at)}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </Panel>

              <Panel label="Approvals" tag={`${appr.pending} pending`} action={<Link href="/approvals" className="font-mono text-[10px] uppercase tracking-[0.12em] text-faint hover:text-fg">review →</Link>}>
                <div className="p-3">
                  {pendingApprovals.length === 0 ? (
                    <p className="t-small py-6 text-center text-faint">Nothing awaiting approval.</p>
                  ) : (
                    <ApprovalList approvals={pendingApprovals} />
                  )}
                </div>
              </Panel>
            </div>

            {/* KPI STRIP */}
            <Panel label="Revenue" tag="key figures" className="rise">
              <CellGrid>
                <ConsoleStat label={`Collected · ${thisMonthName}`} value={moneyCompact(deltas.collected.current, cur)} delta={deltas.collected.pct} sub="vs last month" />
                <ConsoleStat label={`Invoiced · ${thisMonthName}`} value={moneyCompact(deltas.invoiced.current, cur)} delta={deltas.invoiced.pct} sub="vs last month" />
                <ConsoleStat label="Outstanding" value={moneyCompact(all.outstanding, cur)} sub={`${year} collected ${moneyCompact(yr.collected, cur)}`} />
                <ConsoleStat label="Recurring / yr" value={moneyCompact(arr, cur)} sub={`${c.activeContracts} active contract${c.activeContracts === 1 ? '' : 's'}`} />
              </CellGrid>
              <div className="border-t border-dashed border-border px-3.5 py-2.5">
                <div className="mb-1.5 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 bg-[var(--ok-solid)]" /> Collected {moneyCompact(all.collected, cur)}</span>
                  <span className="flex items-center gap-1.5">Outstanding {moneyCompact(all.outstanding, cur)} <span className="h-2 w-2 bg-[var(--warn-solid)]" /></span>
                </div>
                <Strip height={5} segments={[{ value: all.collected, color: 'var(--ok-solid)', label: 'Collected' }, { value: all.outstanding, color: 'var(--warn-solid)', label: 'Outstanding' }]} />
              </div>
            </Panel>

            {/* RECENT INVOICES + EXPIRING */}
            <div className="rise grid gap-6 lg:grid-cols-[1.7fr_1fr]" style={{ animationDelay: '180ms' }}>
              <Panel label="Invoices" tag="recent" action={<Link href="/invoices" className="font-mono text-[10px] uppercase tracking-[0.12em] text-faint hover:text-fg">all →</Link>}>
                {recentInv.length ? (
                  <table className="tbl">
                    <thead><tr><th>Invoice</th><th>Client</th><th className="text-right">Amount</th><th className="text-right">Status</th></tr></thead>
                    <tbody>
                      {recentInv.map((iv) => (
                        <RowLink key={iv.id} href={`/invoices/${iv.id}`}>
                          <td><span className="t-mono block text-[12px] font-medium">{iv.invoice_number}</span><span className="t-small text-faint">{fmtDate(iv.issue_date)}</span></td>
                          <td className="text-muted">{iv.client_name}</td>
                          <td className="num text-right font-medium">{money(iv.total, iv.currency)}</td>
                          <td className="text-right"><div className="flex justify-end"><InvoiceStatusPill status={iv.status} dueDate={iv.due_date} /></div></td>
                        </RowLink>
                      ))}
                    </tbody>
                  </table>
                ) : <p className="t-small py-8 text-center text-faint">No invoices yet.</p>}
              </Panel>

              <Panel label="Contracts" tag="expiring · 60d">
                {expiring.length ? (
                  <ul className="flex flex-col">
                    {expiring.slice(0, 6).map((ct, i) => {
                      const d = daysUntil(ct.end_date);
                      return (
                        <li key={ct.id} className={i > 0 ? 'border-t border-dashed border-border' : ''}>
                          <Link href={`/contracts/${ct.id}`} className="focus-ring flex items-center justify-between gap-2 px-3.5 py-2 hover:bg-panel-2">
                            <span className="min-w-0"><span className="t-label block truncate">{ct.title}</span><span className="t-small text-faint">{ct.client_name}</span></span>
                            <Pill tone={d !== null && d <= 14 ? 'bad' : 'warn'} dot={false}>{d}d</Pill>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                ) : <p className="t-small px-3 py-8 text-center text-faint">Nothing expiring in 60 days.</p>}
              </Panel>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
