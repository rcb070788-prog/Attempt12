import React, { useState } from 'react';

interface AdminEmailSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  allUsers: any[];
  supabase: any;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const AdminEmailSection: React.FC<AdminEmailSectionProps> = ({
  isOpen, onToggle, allUsers, supabase, showToast
}) => {
  const [broadcastMode, setBroadcastMode] = useState<'real' | 'virtual'>('real');
  const [broadcastSubject, setBroadcastSubject] = useState('');
  const [broadcastContent, setBroadcastContent] = useState('');
  const [broadcastConfirmOpen, setBroadcastConfirmOpen] = useState(false);
  const [broadcastSending, setBroadcastSending] = useState(false);

  const [oneOffRecipients, setOneOffRecipients] = useState('');
  const [oneOffSubject, setOneOffSubject] = useState('');
  const [oneOffContent, setOneOffContent] = useState('');
  const [oneOffSending, setOneOffSending] = useState(false);

  const virtualCount = (allUsers || []).filter(u => u.virtual_email && u.virtual_email.includes('@')).length;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  const handleBroadcastSend = async () => {
    if (!broadcastSubject.trim() || !broadcastContent.trim()) {
      showToast('Subject and content are required', 'error');
      return;
    }
    if (!supabaseUrl) {
      showToast('Supabase URL not configured', 'error');
      return;
    }
    setBroadcastSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        showToast('Session expired. Please log in again.', 'error');
        return;
      }
      const res = await fetch(`${supabaseUrl}/functions/v1/send-admin-broadcast`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: supabaseAnonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode: broadcastMode,
          subject: broadcastSubject.trim(),
          content: broadcastContent.trim(),
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to send broadcast');
      if (result?.error) throw new Error(result.error);
      showToast(`Broadcast sent to ${result?.sent ?? 0} recipients`);
      setBroadcastConfirmOpen(false);
      setBroadcastSubject('');
      setBroadcastContent('');
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
    if (!supabaseUrl) {
      showToast('Supabase URL not configured', 'error');
      return;
    }
    setOneOffSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        showToast('Session expired. Please log in again.', 'error');
        return;
      }
      const res = await fetch(`${supabaseUrl}/functions/v1/send-admin-one-off`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: supabaseAnonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipients,
          subject: oneOffSubject.trim(),
          content: oneOffContent.trim(),
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to send email');
      if (result?.error) throw new Error(result.error);
      showToast(`Email sent to ${result?.sent ?? 0} recipient(s)`);
      setOneOffRecipients('');
      setOneOffSubject('');
      setOneOffContent('');
    } catch (err: any) {
      showToast(err?.message || 'Failed to send email', 'error');
    } finally {
      setOneOffSending(false);
    }
  };

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
            </div>
            <p className="text-sm text-gray-500">
              {broadcastMode === 'virtual'
                ? `Will send to ~${virtualCount} users`
                : 'Will send to all registered users'}
            </p>
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
              disabled={!broadcastSubject.trim() || !broadcastContent.trim()}
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
                  Send this email to {broadcastMode === 'virtual' ? `~${virtualCount} users` : 'all registered users'}?
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
