import { notFound } from 'next/navigation';
import { getClient } from '@/lib/repo';
import { PageHeader } from '@/components/ui';
import { ContractForm } from '@/components/forms/ContractForm';

export default async function NewContractPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = getClient(Number(id));
  if (!client) notFound();

  return (
    <div>
      <PageHeader
        title="New Contract"
        crumbs={[{ href: '/clients', label: 'Clients' }, { href: `/clients/${client.id}`, label: client.name }, { label: 'New Contract' }]}
      />
      <div className="mx-auto max-w-[820px] px-5 py-5">
        <div className="rise">
          <ContractForm clientId={client.id} defaultCurrency={client.currency} />
        </div>
      </div>
    </div>
  );
}
