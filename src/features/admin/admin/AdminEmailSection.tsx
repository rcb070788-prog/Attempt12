import React, { useMemo, useState } from 'react';

interface AdminEmailSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  allUsers: any[];
  supabase: any;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseRecipientList(raw: string): string[] {
  const seen = new Set<string>();
  const valid: string[] = [];
  for (const entry of raw.split(/[\s,;]+/)) {
    const email = entry.trim().toLowerCase();
    if (email && email.includes('@') && EMAIL_REGEX.test(email) && !seen.has(email)) {
      seen.add(email);
      valid.push(email);
    }
  }
  return valid;
}

export const AdminEmailSection: React.FC<AdminEmailSectionProps> = ({
  isOpen, onToggle, allUsers, supabase, showToast
}) => {
  const [broadcastMode, setBroadcastMode] = useState<'real' | 'virtual' | 'external'>('real');
  const [broadcastSubject, setBroadcastSubject] = useState('');
  const [broadcastContent, setBroadcastContent] = useState('');
  const [externalRecipients, setExternalRecipients] = useState('');
  const [broadcastConfirmOpen, setBroadcastConfirmOpen] = useState(false);
  const [broadcastSending, setBroadcastSending] = useState(false);

  const [oneOffRecipients, setOneOffRecipients] = useState('');
  const [oneOffSubject, setOneOffSubject] = useState('');
  const [oneOffContent, setOneOffContent] = useState('');
  const [oneOffSending, setOneOffSending] = useState(false);

  const virtualCount = (allUsers || []).filter(u => u.virtual_email && u.virtual_email.includes('@')).length;
  const externalRecipientCount = useMemo(
    () => parseRecipientList(externalRecipients).length,
    [externalRecipients]
  );

  const broadcastReady = broadcastSubject.trim() && broadcastContent.trim()
    && (broadcastMode !== 'external' || externalRecipientCount > 0);

  const handleBroadcastSend = async () => {
    if (!broadcastSubject.trim() || !broadcastContent.trim()) {
      showToast('Subject and content are required', 'error');
      return;
    }
    if (broadcastMode === 'external' && externalRecipientCount === 0) {
      showToast('At least one valid external recipient is required', 'error');
      return;
    }
    setBroadcastSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        showToast('Session expired. Please log in again.', 'error');
        return;
      }
      const body: Record<string, unknown> = {
        mode: broadcastMode,
        subject: broadcastSubject.trim(),
        content: broadcastContent.trim(),
      };
      if (broadcastMode === 'external') {
        body.recipients = parseRecipientList(externalRecipients);
      }
      const { data, error } = await supabase.functions.invoke('send-admin-broadcast', { body });
      if (error) throw new Error(error.message || 'Failed to send broadcast');
      if (data?.error) throw new Error(data.error);
      showToast(`Broadcast sent to ${data?.sent ?? 0} recipients`);
      setBroadcastConfirmOpen(false);
      setBroadcastSubject('');
      setBroadcastContent('');
      setExternalRecipients('');
    } catch (err: any) {
      showToast(err?.message || 'Failed to send broadcast', 'error');
    } finally {
      setBroadcastSending(false);
    }
  };

  const handleOneOffSend = async () => {
    const recipients = oneOffRecipients.split(/[\s,;]+/).map(e => e.trim()).filter(Boolean);
    if (recipients.length === 0 || !oneOffSubject.trim() || !oneOffContent.trim()) {
      showToast('Recipients, subject, and content are required', 'error');
      return;
    }
    setOneOffSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        showToast('Session expired. Please log in again.', 'error');
        return;
      }
      const { data, error } = await supabase.functions.invoke('send-admin-one-off', {
        body: {
          recipients,
          subject: oneOffSubject.trim(),
          content: oneOffContent.trim(),
        },
      });
      if (error) throw new Error(error.message || 'Failed to send email');
      if (data?.error) throw new Error(data.error);
      showToast(`Email sent to ${data?.sent ?? 0} recipient(s)`);
      setOneOffRecipients('');
      setOneOffSubject('');
      setOneOffContent('');
    } catch (err: any) {
      showToast(err?.message || 'Failed to send email', 'error');
    } finally {
      setOneOffSending(false);
    }
  };

  const broadcastTargetLabel = broadcastMode === 'virtual'
    ? `~${virtualCount} users`
    : broadcastMode === 'external'
      ? `${externalRecipientCount} external address${externalRecipientCount === 1 ? '' : 'es'}`
      : 'all registered users';

  return (
    <section className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-8 flex justify-between items-center hover:bg-gray-50 transition-colors"
      >
        <div className="text-left flex items-center gap-4">
          <div>
            <h2 className="text-3xl font-black uppercase tracking-tighter leading-none">Admin Email</h2>
            <p className="text-gray-400 font-bold text-[18.66px] uppercase mt-1">Broadcast and one-off emails</p>
          </div>
        </div>
        <i className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'} text-gray-300 text-xl`}></i>
      </button>

      {isOpen && (
        <div className="border-t border-gray-50 p-8 space-y-12">
          {/* Broadcast to all users */}
          <div className="space-y-4">
            <h3 className="text-xl font-black uppercase text-gray-900">Broadcast to all users</h3>
            <div className="flex flex-wrap gap-4 items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="broadcastMode"
                  checked={broadcastMode === 'real'}
                  onChange={() => setBroadcastMode('real')}
                  className="text-indigo-600"
                />
                <span className="font-bold uppercase text-sm">Real emails</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="broadcastMode"
                  checked={broadcastMode === 'virtual'}
                  onChange={() => setBroadcastMode('virtual')}
                  className="text-indigo-600"
                />
                <span className="font-bold uppercase text-sm">Virtual emails (@concernedcitizensofmc.com)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="broadcastMode"
                  checked={broadcastMode === 'external'}
                  onChange={() => setBroadcastMode('external')}
                  className="text-indigo-600"
                />
                <span className="font-bold uppercase text-sm">External emails (non-users)</span>
              </label>
            </div>
            <p className="text-sm text-gray-500">
              {broadcastMode === 'virtual'
                ? `Will send to ~${virtualCount} users`
                : broadcastMode === 'external'
                  ? externalRecipientCount > 0
                    ? `Will send to ${externalRecipientCount} external address${externalRecipientCount === 1 ? '' : 'es'} (no-reply)`
                    : 'Paste external addresses below (informational, no-reply from noreply@concernedcitizensofmc.com)'
                  : 'Will send to all registered users'}
            </p>
            {broadcastMode === 'external' && (
              <textarea
                placeholder="External recipients (e.g. official@county.gov, contact@example.org)"
                value={externalRecipients}
                onChange={e => setExternalRecipients(e.target.value)}
                rows={3}
                className="w-full p-4 bg-gray-50 rounded-xl border border-gray-100 font-bold outline-none focus:ring-2 ring-indigo-500/20 resize-y"
              />
            )}
            <input
              type="text"
              placeholder="Subject"
              value={broadcastSubject}
              onChange={e => setBroadcastSubject(e.target.value)}
              className="w-full p-4 bg-gray-50 rounded-xl border border-gray-100 font-bold outline-none focus:ring-2 ring-indigo-500/20"
            />
            <textarea
              placeholder="Message content"
              value={broadcastContent}
              onChange={e => setBroadcastContent(e.target.value)}
              rows={6}
              className="w-full p-4 bg-gray-50 rounded-xl border border-gray-100 font-bold outline-none focus:ring-2 ring-indigo-500/20 resize-y"
            />
            <button
              onClick={() => setBroadcastConfirmOpen(true)}
              disabled={!broadcastReady}
              className="px-8 py-4 bg-indigo-600 text-white rounded-xl font-black uppercase text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send broadcast
            </button>
          </div>

          {/* One-off email */}
          <div className="pt-8 border-t border-gray-100 space-y-4">
            <h3 className="text-xl font-black uppercase text-gray-900">One-off email</h3>
            <p className="text-sm text-gray-500">Comma, space, or newline separated</p>
            <textarea
              placeholder="Recipients (e.g. user@example.com, other@domain.org)"
              value={oneOffRecipients}
              onChange={e => setOneOffRecipients(e.target.value)}
              rows={2}
              className="w-full p-4 bg-gray-50 rounded-xl border border-gray-100 font-bold outline-none focus:ring-2 ring-indigo-500/20 resize-y"
            />
            <input
              type="text"
              placeholder="Subject"
              value={oneOffSubject}
              onChange={e => setOneOffSubject(e.target.value)}
              className="w-full p-4 bg-gray-50 rounded-xl border border-gray-100 font-bold outline-none focus:ring-2 ring-indigo-500/20"
            />
            <textarea
              placeholder="Message content"
              value={oneOffContent}
              onChange={e => setOneOffContent(e.target.value)}
              rows={6}
              className="w-full p-4 bg-gray-50 rounded-xl border border-gray-100 font-bold outline-none focus:ring-2 ring-indigo-500/20 resize-y"
            />
            <button
              onClick={handleOneOffSend}
              disabled={oneOffSending || !oneOffRecipients.trim() || !oneOffSubject.trim() || !oneOffContent.trim()}
              className="px-8 py-4 bg-indigo-600 text-white rounded-xl font-black uppercase text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {oneOffSending ? 'Sending...' : 'Send email'}
            </button>
          </div>

          {/* Broadcast confirmation modal */}
          {broadcastConfirmOpen && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl">
                <h4 className="text-xl font-black uppercase mb-4">Confirm broadcast</h4>
                <p className="text-gray-600 mb-6">
                  {broadcastMode === 'external'
                    ? `Send this informational no-reply email to ${broadcastTargetLabel}?`
                    : `Send this email to ${broadcastTargetLabel}?`}
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={() => setBroadcastConfirmOpen(false)}
                    disabled={broadcastSending}
                    className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-black uppercase text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBroadcastSend}
                    disabled={broadcastSending}
                    className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase text-sm hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {broadcastSending ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
