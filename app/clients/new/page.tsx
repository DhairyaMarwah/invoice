import { PageHeader } from '@/components/ui';
import { ClientForm } from '@/components/forms/ClientForm';

export default function NewClientPage() {
  return (
    <div>
      <PageHeader title="New Client" crumbs={[{ href: '/clients', label: 'Clients' }, { label: 'New' }]} />
      <div className="mx-auto max-w-[820px] px-5 py-5">
        <div className="rise">
          <ClientForm />
        </div>
      </div>
    </div>
  );
}
