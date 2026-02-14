import React, { useState } from 'react';

interface SyncRegistrySectionProps {
  isOpen: boolean;
  onToggle: () => void;
  supabase: any;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  fetchUsers: () => void;
}

export const SyncRegistrySection: React.FC<SyncRegistrySectionProps> = ({
  isOpen,
  onToggle,
  supabase,
  showToast,
  fetchUsers,
}) => {
  const [syncing, setSyncing] = useState(false);
  const [dryRunResult, setDryRunResult] = useState<any>(null);

  const runSync = async (dryRun: boolean) => {
    if (!supabase) return;
    setSyncing(true);
    setDryRunResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        showToast('Session expired. Please log in again.', 'error');
        return;
      }
      const res = await fetch('/.netlify/functions/sync-voter-registry', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dryRun }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Sync failed', 'error');
        return;
      }
      if (dryRun) {
        setDryRunResult(data);
        showToast(`Dry run: ${data.toRemove} to remove, ${data.toUpdate} to update`);
      } else {
        showToast(`Sync complete: ${data.removed} removed, ${data.updated} updated`);
        fetchUsers();
      }
    } catch (err: any) {
      showToast(err?.message || 'Sync failed', 'error');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <section className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-8 flex justify-between items-center hover:bg-gray-50 transition-colors"
      >
        <div className="text-left">
          <h2 className="text-3xl font-black uppercase tracking-tighter leading-none">Voter Registry Sync</h2>
          <p className="text-gray-400 font-bold text-[18.66px] uppercase mt-1">Reconcile profiles with monthly registry</p>
        </div>
        <i className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'} text-gray-300 text-xl`}></i>
      </button>

      {isOpen && (
        <div className="border-t border-gray-50 p-8">
          <p className="text-gray-600 font-medium mb-6">
            After uploading the new voter registry CSV to Supabase, run this sync to:
          </p>
          <ul className="list-disc list-inside text-gray-600 mb-6 space-y-2">
            <li>Remove auth access for voters no longer in registry (profiles kept 5 years for history)</li>
            <li>Update name, virtual email, and district for voters with changes</li>
          </ul>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => runSync(true)}
              disabled={syncing}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-black uppercase hover:bg-gray-200 disabled:opacity-50"
            >
              {syncing ? 'Running...' : 'Dry Run (Preview)'}
            </button>
            <button
              onClick={() => runSync(false)}
              disabled={syncing}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase hover:bg-indigo-700 disabled:opacity-50"
            >
              {syncing ? 'Syncing...' : 'Run Sync'}
            </button>
          </div>
          {dryRunResult && (
            <div className="mt-6 p-4 bg-gray-50 rounded-xl text-sm">
              <p className="font-bold mb-2">Dry run results:</p>
              <p>To remove (auth deleted, profile scheduled for 5-yr cleanup): {dryRunResult.toRemove}</p>
              <p>To update (name/district changes): {dryRunResult.toUpdate}</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
