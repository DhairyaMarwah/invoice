import { getSettings, getAccounts } from '@/lib/repo';
import { PageHeader } from '@/components/ui';
import { SettingsForm } from '@/components/forms/SettingsForm';
import { IconCheck } from '@/components/icons';

export const dynamic = 'force-dynamic';

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const sp = await searchParams;
  const settings = getSettings();
  const accounts = getAccounts();

  return (
    <div>
      <PageHeader title="Settings" subtitle="Your organisation profile, invoice numbering, and payout accounts" />
      <div className="mx-auto max-w-[820px] px-5 py-5">
        {sp.saved && (
          <div className="rise mb-4 flex items-center gap-2 rounded-md border border-[var(--ok-border)] bg-[var(--ok-bg)] px-3 py-2 text-[13px] text-[var(--ok-text)]">
            <IconCheck width={15} height={15} /> Settings saved
          </div>
        )}
        <div className="rise">
          <SettingsForm settings={settings} accounts={accounts} />
        </div>
      </div>
    </div>
  );
}
