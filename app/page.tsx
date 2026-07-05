import Link from 'next/link';
import {
  counts,
  totals,
  monthlySeries,
  monthDeltas,
  revenueByCategory,
  recurringRevenue,
  recentInvoices,
  expiringContracts,
  getSettings,
} from '@/lib/repo';
import { PageHeader, EmptyState, InvoiceStatusPill, Pill } from '@/components/ui';
import { StatCard, AreaChart, Donut, Delta } from '@/components/Charts';
import { RowLink } from '@/components/RowLink';
import { PRODUCT_CATEGORIES } from '@/lib/products';
import { money, moneyCompact, fmtDate, daysUntil } from '@/lib/format';
import {
  IconPlus, IconArrowRight, IconClock, IconInvoices, IconCheck, IconWarn, IconBox, IconReports,
} from '@/components/icons';

export const dynamic = 'force-dynamic';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CAT_COLOR: Record<string, string> = {
  pegasus: 'var(--info-solid)',
  iris: 'var(--pur-solid)',
  atlas: 'var(--warn-solid)',
  untagged: 'var(--neu-solid)',
};
const CAT_LABEL: Record<string, string> = { pegasus: 'Pegasus', iris: 'Iris', atlas: 'Atlas', untagged: 'Untagged' };

export default function OverviewPage() {
  const c = counts();
  const cur = getSettings().default_currency || 'INR';
  const year = String(new Date().getFullYear());
  const yr = totals(year);
  const all = totals();
  const series = monthlySeries(12);
  const deltas = monthDeltas();
  const { arr } = recurringRevenue();
  const byCat = revenueByCategory(year);
  const recent = recentInvoices(6);
  const expiring = expiringContracts(60);
  const thisMonthName = MONTHS[new Date().getMonth()];

  const empty = c.clients === 0;
  const catTotal = byCat.reduce((s, x) => s + x.invoiced, 0);

  return (
    <div>
      <PageHeader
        title="Overview"
        subtitle={`Calendar year ${year}`}
        actions={
          <>
            <Link href="/clients/new" className="btn btn-secondary focus-ring"><IconPlus width={14} height={14} /> New Client</Link>
            <Link href="/invoices/new" className="btn btn-primary focus-ring"><IconPlus width={14} height={14} /> New Invoice</Link>
          </>
        }
      />

      <div className="mx-auto max-w-[1200px] px-5 py-5">
        {empty ? (
          <EmptyState
            icon={<IconInvoices width={22} height={22} />}
            title="Set up your first client"
            hint="Ledger organises everything as clients → contracts → invoices. Add a client, attach the signed contract, then generate invoices under it."
            action={<Link href="/clients/new" className="btn btn-primary btn-lg focus-ring"><IconPlus width={15} height={15} /> Add your first client</Link>}
          />
        ) : (
          <div className="flex flex-col gap-4">
            {/* KPI tiles — deltas are real month-over-month */}
            <div className="rise grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard
                icon={<IconCheck width={12} height={12} />}
                label={`Collected · ${thisMonthName}`}
                value={moneyCompact(deltas.collected.current, cur)}
                delta={deltas.collected.pct}
                sub="vs last month"
              />
              <StatCard
                icon={<IconInvoices width={12} height={12} />}
                label={`Invoiced · ${thisMonthName}`}
                value={moneyCompact(deltas.invoiced.current, cur)}
                delta={deltas.invoiced.pct}
                sub="vs last month"
              />
              <StatCard
                icon={<IconWarn width={12} height={12} />}
                label="Outstanding"
                value={moneyCompact(all.outstanding, cur)}
                sub={all.overdueCount > 0 ? `${money(all.overdue, cur)} overdue · ${all.overdueCount} invoice${all.overdueCount === 1 ? '' : 's'}` : 'Nothing overdue'}
              />
              <StatCard
                icon={<IconReports width={12} height={12} />}
                label="Recurring / yr"
                value={moneyCompact(arr, cur)}
                sub={`${c.activeContracts} active contract${c.activeContracts === 1 ? '' : 's'}`}
              />
            </div>

            {/* Trend + category mix */}
            <div className="rise grid gap-4 lg:grid-cols-[1.7fr_1fr]" style={{ animationDelay: '70ms' }}>
              <StatCard icon={<IconReports width={12} height={12} />} label="Collections — last 12 months">
                <div className="flex items-start justify-between gap-3 px-3.5 pt-3">
                  <div className="flex gap-7">
                    <div>
                      <div className="flex items-center gap-1.5 text-[11px] text-faint"><span className="h-2 w-2 rounded-full bg-[var(--blue)]" /> Collected · {year}</div>
                      <div className="num t-h1 mt-0.5">{money(yr.collected, cur)}</div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 text-[11px] text-faint"><span className="h-2 w-2 rounded-full border border-border-strong bg-panel-2" /> Invoiced · {year}</div>
                      <div className="num t-h1 mt-0.5 text-muted">{money(yr.invoiced, cur)}</div>
                    </div>
                  </div>
                  <Delta pct={deltas.collected.pct} className="mt-1" />
                </div>
                <div className="mt-2 px-2 pb-2">
                  <AreaChart
                    id="collections"
                    currency={cur}
                    height={180}
                    data={series.map((m) => ({ label: MONTHS[parseInt(m.month.slice(5), 10) - 1], value: m.collected }))}
                  />
                </div>
              </StatCard>

              <StatCard icon={<IconBox width={12} height={12} />} label={`Revenue by category · ${year}`}>
                <div className="flex flex-1 flex-col justify-center px-4 py-4">
                  {catTotal > 0 ? (
                    <Donut
                      currency={cur}
                      centerValue={moneyCompact(catTotal, cur)}
                      centerLabel="invoiced"
                      slices={byCat.filter((x) => x.invoiced > 0).map((x) => ({
                        label: CAT_LABEL[x.category] ?? x.category,
                        value: x.invoiced,
                        color: CAT_COLOR[x.category] ?? 'var(--neu-solid)',
                      }))}
                    />
                  ) : (
                    <p className="t-small py-8 text-center text-faint">No invoiced revenue this year yet.<br />Tag contracts with a product to see the split.</p>
                  )}
                </div>
                <div className="border-t border-border px-4 py-2">
                  <Link href="/reports" className="link t-small flex items-center gap-1">By product breakdown <IconArrowRight width={12} height={12} /></Link>
                </div>
              </StatCard>
            </div>

            {/* Recent + expiring */}
            <div className="rise grid gap-4 lg:grid-cols-[1.7fr_1fr]" style={{ animationDelay: '140ms' }}>
              <StatCard icon={<IconInvoices width={12} height={12} />} label="Recent invoices">
                {recent.length ? (
                  <table className="tbl">
                    <thead>
                      <tr><th>Invoice</th><th>Client</th><th className="text-right">Amount</th><th className="text-right">Status</th></tr>
                    </thead>
                    <tbody>
                      {recent.map((iv) => (
                        <RowLink key={iv.id} href={`/invoices/${iv.id}`}>
                          <td>
                            <span className="t-mono block text-[12px] font-medium">{iv.invoice_number}</span>
                            <span className="t-small text-faint">{fmtDate(iv.issue_date)}</span>
                          </td>
                          <td className="text-muted">{iv.client_name}</td>
                          <td className="num text-right font-medium">{money(iv.total, iv.currency)}</td>
                          <td className="text-right"><div className="flex justify-end"><InvoiceStatusPill status={iv.status} dueDate={iv.due_date} /></div></td>
                        </RowLink>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="t-small py-8 text-center text-faint">No invoices yet.</p>
                )}
                <div className="border-t border-border px-4 py-2">
                  <Link href="/invoices" className="link t-small flex items-center gap-1">All invoices <IconArrowRight width={12} height={12} /></Link>
                </div>
              </StatCard>

              <StatCard icon={<IconClock width={12} height={12} />} label="Contracts expiring · 60 days">
                {expiring.length ? (
                  <ul className="flex flex-col p-1.5">
                    {expiring.slice(0, 6).map((ct) => {
                      const d = daysUntil(ct.end_date);
                      return (
                        <li key={ct.id}>
                          <Link href={`/contracts/${ct.id}`} className="focus-ring flex items-center justify-between gap-2 rounded-[5px] px-2.5 py-2 transition-colors duration-100 hover:bg-panel-2">
                            <span className="min-w-0">
                              <span className="t-label block truncate">{ct.title}</span>
                              <span className="t-small text-faint">{ct.client_name}</span>
                            </span>
                            <Pill tone={d !== null && d <= 14 ? 'bad' : 'warn'} dot={false}>{d}d</Pill>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="t-small flex-1 px-4 py-8 text-center text-faint">No contracts expiring in the next 60 days.</p>
                )}
              </StatCard>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
