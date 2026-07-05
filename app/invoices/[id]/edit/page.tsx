import { notFound } from 'next/navigation';
import { getInvoice, itemsByInvoice, getSettings, getContract } from '@/lib/repo';
import { fileUrl } from '@/lib/format';
import { PageHeader } from '@/components/ui';
import { InvoiceForm } from '@/components/forms/InvoiceForm';

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const iv = await getInvoice(Number(id));
  if (!iv) notFound();
  const items = await itemsByInvoice(iv.id);
  const s = await getSettings();
  const ct = await getContract(iv.contract_id);

  return (
    <div>
      <PageHeader
        title={`Edit ${iv.invoice_number}`}
        crumbs={[{ href: '/invoices', label: 'Invoices' }, { href: `/invoices/${iv.id}`, label: iv.invoice_number }, { label: 'Edit' }]}
      />
      <div className="mx-auto max-w-[1280px] px-5 py-5">
        <div className="rise">
          <InvoiceForm
            contractId={iv.contract_id}
            clientId={iv.client_id}
            contractTitle={iv.contract_title}
            clientName={iv.client_name}
            org={{ name: s.org_name, tagline: s.org_tagline, address: s.org_address, gstin: s.org_gstin, email: s.org_email, phone: s.org_phone, logoUrl: fileUrl(s.org_logo) }}
            contract={ct ? { title: ct.title, amount: ct.amount, billing_cycle: ct.billing_cycle, tax_rate: ct.tax_rate } : undefined}
            invoice={iv}
            items={items}
          />
        </div>
      </div>
    </div>
  );
}
