import Link from 'next/link';
import {
  totals,
  revenueByYear,
  revenueByMonth,
  revenueByWeek,
  revenueByClient,
  revenueByCategory,
  revenueByProduct,
  recurringRevenue,
  invoiceYears,
  getSettings,
} from '@/lib/repo';
import { PageHeader, EmptyState, KPI, Pill } from '@/components/ui';
import { Bars, ChartLegend, Donut, StatCard } from '@/components/Charts';
import { productLabel, productCategory } from '@/lib/products';
import { money, moneyCompact, CLIENT_STATUS } from '@/lib/format';
import type { ClientStatus } from '@/lib/types';
import { IconReports, IconBox, IconClients } from '@/components/icons';

export const dynamic = 'force-dynamic';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const sp = await searchParams;
  const cur = (await getSettings()).default_currency || 'INR';
  const years = await invoiceYears();
  const thisYear = String(new Date().getFullYear());

  if (years.length === 0) {
    return (
      <div>
        <PageHeader title="Reports" subtitle="Revenue, collections, and recurring value" />
        <div className="mx-auto max-w-[1200px] px-5 py-5">
          <EmptyState icon={<IconReports width={22} height={22} />} title="Nothing to report yet" hint="Once you issue invoices, this page breaks revenue down by year, month, week, and client." />
        </div>
      </div>
    );
  }

  const selected = sp.year && sp.year !== 'all' ? sp.year : years.includes(thisYear) ? thisYear : years[0];
  const scope = sp.year === 'all' ? undefined : selected;

  const t = await totals(scope);
  const byYear = await revenueByYear();
  const byMonth = await revenueByMonth(selected);
  const byWeek = await revenueByWeek(12);
  const byClient = await revenueByClient(scope);
  const byCat = await revenueByCategory(scope);
  const byProduct = await revenueByProduct(scope);
  const { arr } = await recurringRevenue();
  const CAT_COLOR: Record<string, string> = { pegasus: 'var(--info-solid)', iris: 'var(--pur-solid)', atlas: 'var(--warn-solid)', untagged: 'var(--neu-solid)' };
  const CAT_LABEL: Record<string, string> = { pegasus: 'Pegasus', iris: 'Iris', atlas: 'Atlas', untagged: 'Untagged' };
  const catTotal = byCat.reduce((a, b) => a + b.invoiced, 0);

  const yearTabs = [{ v: 'all', label: 'All time' }, ...years.map((y) => ({ v: y, label: y }))];
  const activeTab = sp.year === 'all' ? 'all' : selected;

  return (
    <div>
      <PageHeader title="Reports" subtitle="Revenue bifurcated by year, month, week, and client" />
      <div className="mx-auto flex max-w-[1200px] flex-col gap-5 px-5 py-5">
        {/* Year filter */}
        <div className="flex flex-wrap items-center gap-0.5 rounded-md border border-border bg-panel p-0.5">
          {yearTabs.map((y) => (
            <Link
              key={y.v}
              href={`/reports?year=${y.v}`}
              className={`focus-ring num rounded-[5px] px-3 py-1 text-[12.5px] font-medium transition-colors ${activeTab === y.v ? 'bg-panel-2 text-fg shadow-[var(--shadow-card)]' : 'text-muted hover:text-fg'}`}
            >
              {y.label}
            </Link>
          ))}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KPI label="Invoiced" tone="info" value={moneyCompact(t.invoiced, cur)} sub={`${t.count} invoices`} />
          <KPI label="Collected" tone="ok" value={moneyCompact(t.collected, cur)} sub={`${t.paidCount} paid`} />
          <KPI label="Outstanding" tone="warn" value={moneyCompact(t.outstanding, cur)} sub={t.overdueCount ? `${money(t.overdue, cur)} overdue` : 'On track'} />
          <KPI label="Recurring / yr" tone="pur" value={moneyCompact(arr, cur)} sub="active contracts" />
        </div>

        {/* Year chart */}
        <div className="card p-4">
          <div className="mb-4 flex items-center justify-between">
            <div><h2 className="t-h3">Revenue by year</h2><p className="t-small mt-0.5 text-faint">Every calendar year, invoiced vs. collected</p></div>
            <ChartLegend />
          </div>
          <Bars data={byYear.map((r) => ({ label: r.period, invoiced: r.invoiced, collected: r.collected }))} currency={cur} />
        </div>

        {/* Month + Week */}
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card p-4">
            <div className="mb-4 flex items-center justify-between">
              <div><h2 className="t-h3">Monthly · {selected}</h2><p className="t-small mt-0.5 text-faint">By month of issue</p></div>
              <ChartLegend />
            </div>
            <Bars data={byMonth.map((r, i) => ({ label: MONTHS[i], invoiced: r.invoiced, collected: r.collected }))} currency={cur} height={150} />
          </div>
          <div className="card p-4">
            <div className="mb-4 flex items-center justify-between">
              <div><h2 className="t-h3">Weekly</h2><p className="t-small mt-0.5 text-faint">Last 12 weeks</p></div>
              <ChartLegend />
            </div>
            {byWeek.length ? (
              <Bars data={byWeek.map((r) => ({ label: r.period.split('-W')[1] ?? r.period, invoiced: r.invoiced, collected: r.collected }))} currency={cur} height={150} />
            ) : (
              <p className="t-small py-12 text-center text-faint">No invoices in the last 12 weeks.</p>
            )}
          </div>
        </div>

        {/* By product */}
        <div className="grid gap-5 lg:grid-cols-[1fr_1.6fr]">
          <StatCard icon={<IconBox width={12} height={12} />} label={`By category ${sp.year === 'all' ? '· all time' : `· ${selected}`}`}>
          <div className="p-4">
            {catTotal > 0 ? (
              <Donut
                currency={cur}
                centerValue={moneyCompact(catTotal, cur)}
                centerLabel="invoiced"
                slices={byCat.filter((x) => x.invoiced > 0).map((x) => ({ label: CAT_LABEL[x.category] ?? x.category, value: x.invoiced, color: CAT_COLOR[x.category] ?? 'var(--neu-solid)' }))}
              />
            ) : (
              <p className="t-small py-10 text-center text-faint">No invoiced revenue in this period.</p>
            )}
          </div>
          </StatCard>
          <StatCard icon={<IconBox width={12} height={12} />} label="By product">
            <table className="tbl">
              <thead>
                <tr><th>Product</th><th className="text-right">Invoices</th><th className="text-right">Invoiced</th><th className="text-right">Collected</th></tr>
              </thead>
              <tbody>
                {byProduct.length === 0 && <tr><td colSpan={4} className="t-small py-8 text-center text-faint">No invoiced revenue in this period.</td></tr>}
                {byProduct.map((r, i) => (
                  <tr key={i}>
                    <td>
                      {r.product ? (
                        <span className="flex items-center gap-2">
                          <Pill tone={productCategory(r.product)?.tone ?? 'neu'} dot={false}>{productCategory(r.product)?.label}</Pill>
                          <span className="font-medium">{productLabel(r.product)}</span>
                        </span>
                      ) : (
                        <span className="text-faint">Untagged contracts</span>
                      )}
                    </td>
                    <td className="num text-right text-muted">{r.invoices}</td>
                    <td className="num text-right">{money(r.invoiced, cur)}</td>
                    <td className="num text-right text-[var(--ok-text)]">{money(r.collected, cur)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </StatCard>
        </div>

        {/* By client */}
        <StatCard icon={<IconClients width={12} height={12} />} label={`By client ${sp.year === 'all' ? '· all time' : `· ${selected}`}`}>
          {byClient.length === 0 ? (
            <p className="t-small px-4 py-8 text-center text-faint">No invoiced revenue in this period.</p>
          ) : (
              <table className="tbl">
                <thead>
                  <tr><th>Client</th><th>Status</th><th className="text-right">Invoiced</th><th className="text-right">Collected</th><th className="text-right">Outstanding</th><th className="text-right">Collection</th></tr>
                </thead>
                <tbody>
                  {byClient.map((c) => {
                    const rate = c.invoiced > 0 ? Math.round((c.collected / c.invoiced) * 100) : 0;
                    return (
                      <tr key={c.id} className="row-link">
                        <td><Link href={`/clients/${c.id}`} className="font-medium hover:text-accent-text">{c.name}</Link></td>
                        <td className="t-small text-muted">{CLIENT_STATUS[c.status as ClientStatus]?.label ?? c.status}</td>
                        <td className="num text-right">{money(c.invoiced, cur)}</td>
                        <td className="num text-right text-[var(--ok-text)]">{money(c.collected, cur)}</td>
                        <td className="num text-right">{c.outstanding > 0 ? money(c.outstanding, cur) : <span className="text-faint">—</span>}</td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="h-1.5 w-16 overflow-hidden rounded-full bg-panel-2"><span className="block h-full rounded-full bg-[var(--accent)]" style={{ width: `${rate}%` }} /></span>
                            <span className="num w-8 text-right text-[12px] text-muted">{rate}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
          )}
        </StatCard>
      </div>
    </div>
  );
}
