import { notFound } from 'next/navigation';
import { getContract, getClient, getSettings, peekInvoiceNumber } from '@/lib/repo';
import { PageHeader } from '@/components/ui';
import { InvoiceForm, type InvoiceDefaults } from '@/components/forms/InvoiceForm';
import { todayISO, addDays, BILLING_CYCLE, fileUrl } from '@/lib/format';

function periodEnd(start: string, cycle: string): string {
  const d = new Date(start + 'T00:00:00');
  if (cycle === 'annual') d.setFullYear(d.getFullYear() + 1);
  else if (cycle === 'monthly') d.setMonth(d.getMonth() + 1);
  else if (cycle === 'weekly') d.setDate(d.getDate() + 7);
  else return '';
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export default async function NewInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ct = await getContract(Number(id));
  if (!ct) notFound();
  const client = (await getClient(ct.client_id))!;
  const s = await getSettings();

  const issue = todayISO();
  const defaults: InvoiceDefaults = {
    invoice_number: await peekInvoiceNumber(issue),
    issue_date: issue,
    due_date: addDays(issue, parseInt(s.invoice_due_days || '15', 10) || 15),
    period_start: ct.billing_cycle === 'one_time' ? '' : issue,
    period_end: ct.billing_cycle === 'one_time' ? '' : periodEnd(issue, ct.billing_cycle),
    bill_to_name: client.name,
    client_address: client.address ?? '',
    gst_number: client.gst_number ?? '',
    currency: ct.currency,
    tax_rate: String(ct.tax_rate),
    notes: '',
    lines: [
      {
        description: `${ct.title}${BILLING_CYCLE[ct.billing_cycle].label ? ` — ${BILLING_CYCLE[ct.billing_cycle].label}` : ''}`,
        qty: '1',
        unit_price: String(ct.amount || 0),
      },
    ],
  };

  return (
    <div>
      <PageHeader
        title="New Invoice"
        crumbs={[{ href: '/clients', label: 'Clients' }, { href: `/clients/${ct.client_id}`, label: ct.client_name }, { href: `/contracts/${ct.id}`, label: ct.title }, { label: 'New Invoice' }]}
        subtitle="Pre-filled from the contract — everything is editable"
      />
      <div className="mx-auto max-w-[1280px] px-5 py-5">
        <div className="rise">
          <InvoiceForm
            contractId={ct.id}
            clientId={ct.client_id}
            contractTitle={ct.title}
            clientName={ct.client_name}
            org={{ name: s.org_name, tagline: s.org_tagline, address: s.org_address, gstin: s.org_gstin, email: s.org_email, phone: s.org_phone, logoUrl: fileUrl(s.org_logo) }}
            contract={{ title: ct.title, amount: ct.amount, billing_cycle: ct.billing_cycle, tax_rate: ct.tax_rate }}
            defaults={defaults}
            bumpSeq
          />
        </div>
      </div>
    </div>
  );
}
