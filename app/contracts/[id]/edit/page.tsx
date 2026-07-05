import { notFound } from 'next/navigation';
import { getContract, itemsByContract } from '@/lib/repo';
import { PageHeader } from '@/components/ui';
import { ContractForm } from '@/components/forms/ContractForm';

export default async function EditContractPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ct = await getContract(Number(id));
  if (!ct) notFound();
  const items = await itemsByContract(ct.id);

  return (
    <div>
      <PageHeader
        title={`Edit ${ct.title}`}
        crumbs={[{ href: '/clients', label: 'Clients' }, { href: `/clients/${ct.client_id}`, label: ct.client_name }, { href: `/contracts/${ct.id}`, label: ct.title }, { label: 'Edit' }]}
      />
      <div className="mx-auto max-w-[820px] px-5 py-5">
        <div className="rise">
          <ContractForm clientId={ct.client_id} contract={ct} items={items} />
        </div>
      </div>
    </div>
  );
}
