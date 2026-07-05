import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getClient,
  contactsByClient,
  activitiesByClient,
  contractsByClient,
  invoicesByContract,
  invoicesByClient,
} from '@/lib/repo';
import { deleteClientAction } from '@/app/actions';
import {
  PageHeader,
  ClientStatusPill,
  ContractStatusPill,
  InvoiceStatusPill,
  SalesStagePill,
  SegmentPill,
  Detail,
  EmptyState,
  Pill,
} from '@/components/ui';
import { ConfirmForm } from '@/components/ConfirmForm';
import { RowLink } from '@/components/RowLink';
import { StatCard } from '@/components/Charts';
import { StageChanger } from '@/components/StageChanger';
import { ActivityTimeline } from '@/components/ActivityTimeline';
import { AddActivityForm } from '@/components/forms/AddActivityForm';
import { productLabel, productCategory } from '@/lib/products';
import {
  money, fmtDate, fmtNum, initials, BILLING_CYCLE, CLIENT_CATEGORY, CONTACT_ROLE,
} from '@/lib/format';
import type { ContactRole } from '@/lib/types';
import {
  IconPlus, IconEdit, IconTrash, IconContracts, IconFile, IconChevronRight,
  IconMail, IconPhone, IconPin, IconLinkedIn, IconBuilding, IconWarn, IconActivity,
} from '@/components/icons';

export const dynamic = 'force-dynamic';

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await getClient(Number(id));
  if (!client) notFound();

  const contacts = await contactsByClient(client.id);
  const activities = await activitiesByClient(client.id);
  const contracts = await contractsByClient(client.id);
  const invByContract = new Map<number, Awaited<ReturnType<typeof invoicesByContract>>>();
  for (const ct of contracts) invByContract.set(ct.id, await invoicesByContract(ct.id));
  const allInvoices = await invoicesByClient(client.id);
  const invoiced = allInvoices.reduce((s, i) => s + i.total, 0);
  const collected = allInvoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.total, 0);
  const cur = client.currency || 'INR';

  const profileRows: [string, string][] = [];
  if (client.category) profileRows.push(['Category', CLIENT_CATEGORY[client.category]]);
  if (client.total_campuses != null) profileRows.push(['Campuses', fmtNum(client.total_campuses)]);
  if (client.locations) profileRows.push(['Locations', client.locations]);
  if (client.student_strength != null) profileRows.push(['Students', fmtNum(client.student_strength)]);
  if (client.faculty_strength != null) profileRows.push(['Faculty', fmtNum(client.faculty_strength)]);
  if (client.nirf) profileRows.push(['NIRF', [client.nirf_category, client.nirf_rank ? `#${client.nirf_rank}` : null].filter(Boolean).join(' · ') || 'Yes']);
  if (client.qs_ranking) profileRows.push(['QS', client.qs_details || 'Yes']);
  const hasProfile = profileRows.length > 0 || client.segment || client.website;

  return (
    <div>
      <PageHeader
        title={client.name}
        crumbs={[{ href: '/clients', label: 'Clients' }, { label: client.name }]}
        meta={<div className="flex items-center gap-1.5"><SalesStagePill stage={client.sales_stage} /><SegmentPill segment={client.segment} /></div>}
        subtitle={[client.email, client.phone].filter(Boolean).join(' · ') || undefined}
        actions={
          <>
            <Link href={`/clients/${client.id}/edit`} className="btn btn-ghost focus-ring"><IconEdit width={13} height={13} /> Edit</Link>
            <Link href={`/clients/${client.id}/contracts/new`} className="btn btn-primary focus-ring"><IconPlus width={14} height={14} /> New Contract</Link>
          </>
        }
      />

      <div className="mx-auto max-w-[1200px] px-5 py-5">
        {/* Sales snapshot */}
        <div className="rise card mb-5 flex flex-wrap items-center gap-x-8 gap-y-3 p-4">
          <div className="flex flex-col gap-1">
            <span className="t-eyebrow">Sales stage</span>
            <StageChanger clientId={client.id} stage={client.sales_stage} />
          </div>
          <Detail label="Source">{client.source || <span className="text-faint">—</span>}</Detail>
          <Detail label="Projected value">{client.projected_value != null ? <span className="num font-medium">{money(client.projected_value, cur)}</span> : <span className="text-faint">—</span>}</Detail>
          <Detail label="Expected close"><span className="num">{fmtDate(client.expected_close)}</span></Detail>
          <Detail label="Engaged since"><span className="num">{fmtDate(client.engagement_started)}</span></Detail>
          <div className="ml-auto"><Detail label="Account"><ClientStatusPill status={client.status} /></Detail></div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          {/* Main column */}
          <div className="flex min-w-0 flex-col gap-5">
            {client.issues && (
              <div className="rise card flex items-start gap-2.5 border-[var(--warn-border)] bg-[var(--warn-bg)] p-3.5">
                <IconWarn width={15} height={15} className="mt-0.5 flex-none text-[var(--warn-text)]" />
                <div><div className="t-h4 text-[var(--warn-text)]">Issues / blockers</div><p className="t-small mt-0.5 whitespace-pre-line text-muted">{client.issues}</p></div>
              </div>
            )}

            {/* Activity timeline */}
            <StatCard
              header={
                <div className="flex items-center gap-2 px-3 py-2">
                  <IconActivity width={13} height={13} className="flex-none text-faint" />
                  <span className="t-eyebrow !normal-case !text-[11px]">Communications &amp; activity</span>
                  <span className="ml-auto"><AddActivityForm clientId={client.id} /></span>
                </div>
              }
            >
              <div className="p-3.5"><ActivityTimeline activities={activities} /></div>
            </StatCard>

            {/* Estate: contracts + invoices */}
            <div>
              <div className="mb-2.5 flex items-center justify-between">
                <h2 className="t-h3">Contracts &amp; invoices</h2>
                <Link href={`/clients/${client.id}/contracts/new`} className="btn btn-secondary btn-sm focus-ring"><IconPlus width={13} height={13} /> New Contract</Link>
              </div>
              {contracts.length === 0 ? (
                <EmptyState
                  icon={<IconContracts width={20} height={20} />}
                  title="No contracts yet"
                  hint="Upload the signed PDF — Ledger reads it and pre-fills validity, amount, and key terms. Invoices are generated under it."
                  action={<Link href={`/clients/${client.id}/contracts/new`} className="btn btn-primary focus-ring"><IconPlus width={14} height={14} /> New Contract</Link>}
                />
              ) : (
                <div className="flex flex-col gap-3">
                  {contracts.map((ct) => {
                    const invs = invByContract.get(ct.id) ?? [];
                    const cat = productCategory(ct.product);
                    return (
                      <StatCard
                        key={ct.id}
                        header={
                          <div className="flex items-center gap-2.5 px-3 py-2">
                            <IconContracts width={13} height={13} className="flex-none text-faint" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <Link href={`/contracts/${ct.id}`} className="focus-ring t-h4 truncate rounded-sm hover:text-accent-text">{ct.title}</Link>
                                <ContractStatusPill status={ct.status} />
                                {ct.product && <Pill tone={cat?.tone ?? 'neu'} dot={false}>{productLabel(ct.product)}</Pill>}
                              </div>
                              <div className="t-small mt-0.5 flex flex-wrap gap-x-3 text-faint">
                                <span className="num">{money(ct.amount, ct.currency)}{BILLING_CYCLE[ct.billing_cycle].short}</span>
                                <span className="num">{fmtDate(ct.start_date)} → {fmtDate(ct.end_date)}</span>
                                {ct.pdf_file && <span className="flex items-center gap-1"><IconFile width={11} height={11} /> signed PDF</span>}
                              </div>
                            </div>
                            <Link href={`/contracts/${ct.id}/invoices/new`} className="btn btn-secondary btn-sm focus-ring flex-none"><IconPlus width={13} height={13} /> New Invoice</Link>
                            <Link href={`/contracts/${ct.id}`} className="btn btn-icon btn-ghost btn-sm focus-ring flex-none" aria-label={`Open ${ct.title}`}><IconChevronRight width={14} height={14} /></Link>
                          </div>
                        }
                      >
                        {invs.length === 0 ? (
                          <p className="t-small px-4 py-4 text-faint">No invoices under this contract yet — <Link href={`/contracts/${ct.id}/invoices/new`} className="link">generate the first one</Link>.</p>
                        ) : (
                          <table className="tbl">
                            <tbody>
                              {invs.map((iv) => (
                                <RowLink key={iv.id} href={`/invoices/${iv.id}`}>
                                  <td className="w-[130px]"><span className="t-mono text-[12px] font-medium">{iv.invoice_number}</span></td>
                                  <td className="num text-[12px] text-muted">{fmtDate(iv.issue_date)}</td>
                                  <td className="num text-right font-medium">{money(iv.total, iv.currency)}</td>
                                  <td className="w-[110px] text-right"><div className="flex justify-end"><InvoiceStatusPill status={iv.status} dueDate={iv.due_date} /></div></td>
                                </RowLink>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </StatCard>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <aside className="flex flex-col gap-3">
            {/* Contacts */}
            <div className="card p-3.5">
              <h3 className="t-eyebrow mb-3">Contacts</h3>
              {contacts.length === 0 ? (
                <p className="t-small text-faint">No contacts yet. <Link href={`/clients/${client.id}/edit`} className="link">Add one</Link>.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {contacts.map((c) => (
                    <li key={c.id} className="flex flex-col gap-1 border-b border-border-soft pb-3 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="t-label text-fg">{c.name || '—'}</span>
                        {c.linkedin && <a href={c.linkedin} target="_blank" rel="noreferrer" className="text-faint hover:text-accent-text" aria-label="LinkedIn"><IconLinkedIn width={14} height={14} /></a>}
                      </div>
                      <span className="t-eyebrow !normal-case !tracking-normal !text-[10.5px]">{CONTACT_ROLE[c.role as ContactRole] ?? c.role}</span>
                      <div className="mt-0.5 flex flex-col gap-1 text-[12px] text-muted">
                        {c.email && <a href={`mailto:${c.email}`} className="flex items-center gap-1.5 hover:text-accent-text"><IconMail width={12} height={12} className="flex-none text-faint" /> <span className="truncate">{c.email}</span></a>}
                        {c.phone && <a href={`tel:${c.phone}`} className="flex items-center gap-1.5 hover:text-accent-text"><IconPhone width={12} height={12} className="flex-none text-faint" /> {c.phone}</a>}
                        {c.location && <span className="flex items-center gap-1.5"><IconPin width={12} height={12} className="flex-none text-faint" /> {c.location}</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Institution profile */}
            {hasProfile && (
              <div className="card p-3.5">
                <h3 className="t-eyebrow mb-3 flex items-center gap-1.5"><IconBuilding width={12} height={12} /> Institution</h3>
                <dl className="flex flex-col gap-2.5">
                  {client.segment && <Detail label="Type"><SegmentPill segment={client.segment} /></Detail>}
                  {profileRows.map(([k, v]) => <Detail key={k} label={k}>{v}</Detail>)}
                  {client.website && <Detail label="Website"><a href={client.website} target="_blank" rel="noreferrer" className="link break-all">{client.website.replace(/^https?:\/\//, '')}</a></Detail>}
                </dl>
              </div>
            )}

            {/* Financials */}
            <div className="card p-3.5">
              <h3 className="t-eyebrow mb-2.5">Financials</h3>
              <dl className="flex flex-col gap-2">
                <div className="flex items-center justify-between"><dt className="t-small text-muted">Invoiced</dt><dd className="num font-medium">{money(invoiced, cur)}</dd></div>
                <div className="flex items-center justify-between"><dt className="t-small text-muted">Collected</dt><dd className="num font-medium text-[var(--ok-text)]">{money(collected, cur)}</dd></div>
                <div className="divider" />
                <div className="flex items-center justify-between"><dt className="t-small font-medium">Outstanding</dt><dd className="num t-h3">{money(invoiced - collected, cur)}</dd></div>
              </dl>
            </div>

            {/* Meta */}
            <div className="card p-3.5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-panel-2 text-[11px] font-semibold text-muted" style={{ boxShadow: 'inset 0 0 0 1px var(--border)' }}>{initials(client.name)}</span>
                <div className="min-w-0 text-[12px]">
                  <div className="text-faint">Client since {fmtDate(client.created_at)}</div>
                  {client.gst_number && <div className="t-mono mt-0.5">{client.gst_number}</div>}
                </div>
              </div>
              {client.notes && <><div className="divider my-3" /><p className="t-small whitespace-pre-line text-muted">{client.notes}</p></>}
            </div>

            <ConfirmForm
              action={deleteClientAction}
              hidden={{ id: client.id }}
              message={`Delete ${client.name}? This removes all its contracts, invoices, contacts, and activity. This cannot be undone.`}
              className="btn btn-danger focus-ring w-full justify-center"
            >
              <IconTrash width={13} height={13} /> Delete client
            </ConfirmForm>
          </aside>
        </div>
      </div>
    </div>
  );
}
