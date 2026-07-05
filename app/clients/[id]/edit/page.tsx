import { notFound } from 'next/navigation';
import { getClient } from '@/lib/repo';
import { PageHeader } from '@/components/ui';
import { ClientForm } from '@/components/forms/ClientForm';

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = getClient(Number(id));
  if (!client) notFound();

  return (
    <div>
      <PageHeader
        title={`Edit ${client.name}`}
        crumbs={[{ href: '/clients', label: 'Clients' }, { href: `/clients/${client.id}`, label: client.name }, { label: 'Edit' }]}
      />
      <div className="mx-auto max-w-[720px] px-5 py-5">
        <div className="rise">
          <ClientForm client={client} />
        </div>
      </div>
    </div>
  );
}
