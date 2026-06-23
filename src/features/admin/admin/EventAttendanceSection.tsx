import React, { useState, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';

interface PublicEvent {
  id: string;
  slug: string;
  title: string;
  event_date: string;
  location: string | null;
  is_open: boolean;
  created_at: string;
}

interface EventAttendee {
  id: string;
  event_id: string;
  full_name: string;
  email: string;
  district: string | null;
  created_at: string;
  public_events?: { event_date: string };
}

interface EventAttendanceSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  publicEvents: PublicEvent[];
  eventAttendees: EventAttendee[];
  allUsers: any[];
  formatDate: (date: any) => string;
  supabase: any;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  fetchPublicEvents: () => void;
  fetchEventAttendees: () => void;
}

function signInUrl(slug: string) {
  const base = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname || '/'}`
    : 'https://concernedcitizensofmc.com/';
  return `${base}?signin=${encodeURIComponent(slug)}`;
}

export const EventAttendanceSection: React.FC<EventAttendanceSectionProps> = ({
  isOpen,
  onToggle,
  publicEvents,
  eventAttendees,
  allUsers,
  formatDate,
  supabase,
  showToast,
  fetchPublicEvents,
  fetchEventAttendees,
}) => {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const sortedEvents = useMemo(
    () => [...publicEvents].sort((a, b) => b.event_date.localeCompare(a.event_date)),
    [publicEvents]
  );

  const selectedEvent = sortedEvents.find(e => e.id === selectedEventId) ?? sortedEvents[0] ?? null;

  useEffect(() => {
    if (selectedEvent && !selectedEventId) {
      setSelectedEventId(selectedEvent.id);
    }
  }, [selectedEvent, selectedEventId]);

  useEffect(() => {
    if (!selectedEvent) {
      setQrDataUrl(null);
      return;
    }
    QRCode.toDataURL(signInUrl(selectedEvent.slug), { width: 200, margin: 2 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [selectedEvent?.slug]);

  const attendeesForEvent = useMemo(() => {
    if (!selectedEvent) return [];
    return eventAttendees
      .filter(a => a.event_id === selectedEvent.id)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }, [eventAttendees, selectedEvent]);

  const registeredEmails = useMemo(() => {
    const set = new Set<string>();
    for (const u of allUsers) {
      // profiles use virtual_email; manual signups may use real email in auth - check common fields
      if (u.virtual_email) set.add(u.virtual_email.toLowerCase());
    }
    return set;
  }, [allUsers]);

  const attendeeStats = useMemo(() => {
    if (!selectedEvent) return { total: 0, newCount: 0, returningCount: 0 };

    let newCount = 0;
    let returningCount = 0;

    for (const att of attendeesForEvent) {
      const email = att.email.toLowerCase();
      const prior = eventAttendees.filter(a => {
        if (a.email.toLowerCase() !== email) return false;
        const ev = publicEvents.find(e => e.id === a.event_id);
        return ev && ev.event_date < selectedEvent.event_date;
      });
      if (prior.length === 0) newCount++;
      else returningCount++;
    }

    return { total: attendeesForEvent.length, newCount, returningCount };
  }, [attendeesForEvent, eventAttendees, publicEvents, selectedEvent]);

  const handleCreateEvent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsCreating(true);
    const fd = new FormData(e.currentTarget);
    const slug = (fd.get('slug') as string).trim();
    const title = (fd.get('title') as string).trim();
    const eventDate = fd.get('eventDate') as string;
    const location = (fd.get('location') as string).trim() || null;

    const { error } = await supabase.from('public_events').insert({
      slug,
      title,
      event_date: eventDate,
      location,
      is_open: true,
    });

    setIsCreating(false);
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    showToast('Event created');
    setShowCreateForm(false);
    fetchPublicEvents();
    (e.target as HTMLFormElement).reset();
  };

  const handleToggleOpen = async (event: PublicEvent) => {
    const { error } = await supabase
      .from('public_events')
      .update({ is_open: !event.is_open })
      .eq('id', event.id);

    if (error) {
      showToast(error.message, 'error');
      return;
    }
    showToast(event.is_open ? 'Sign-ins closed' : 'Sign-ins opened');
    fetchPublicEvents();
  };

  const copySignInLink = () => {
    if (!selectedEvent) return;
    const url = signInUrl(selectedEvent.slug);
    navigator.clipboard.writeText(url).then(
      () => showToast('Sign-in link copied'),
      () => showToast('Could not copy link', 'error')
    );
  };

  return (
    <section className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-8 flex justify-between items-center hover:bg-gray-50 transition-colors"
      >
        <div className="text-left flex items-center gap-4">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tighter leading-none">Event Attendance</h2>
            <p className="text-gray-400 font-bold text-[9px] uppercase mt-1">Public meeting sign-ins &amp; QR codes</p>
          </div>
          <span className="px-3 py-1 bg-indigo-100 text-indigo-600 rounded-full font-black text-[9px] uppercase">
            {publicEvents.length} events
          </span>
        </div>
        <i className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'} text-gray-300`} />
      </button>

      {isOpen && (
        <div className="p-8 border-t border-gray-50 bg-gray-50/30 space-y-8">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {sortedEvents.map(ev => (
                <button
                  key={ev.id}
                  onClick={() => setSelectedEventId(ev.id)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-colors ${
                    selectedEvent?.id === ev.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300'
                  }`}
                >
                  {ev.slug}
                  {!ev.is_open && ' (closed)'}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowCreateForm(v => !v)}
              className="px-5 py-2 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase"
            >
              {showCreateForm ? 'Cancel' : 'New Event'}
            </button>
          </div>

          {showCreateForm && (
            <form onSubmit={handleCreateEvent} className="bg-white p-6 rounded-2xl border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-gray-400 ml-1">Slug (URL key)</label>
                <input name="slug" required placeholder="2026-07-15" className="w-full p-3 bg-gray-50 rounded-xl text-sm font-bold border border-gray-100" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-gray-400 ml-1">Event Date</label>
                <input name="eventDate" type="date" required className="w-full p-3 bg-gray-50 rounded-xl text-sm font-bold border border-gray-100" />
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-[9px] font-black uppercase text-gray-400 ml-1">Title</label>
                <input name="title" required placeholder="Public Meeting – July 15, 2026" className="w-full p-3 bg-gray-50 rounded-xl text-sm font-bold border border-gray-100" />
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-[9px] font-black uppercase text-gray-400 ml-1">Location (optional)</label>
                <input name="location" placeholder="Community center" className="w-full p-3 bg-gray-50 rounded-xl text-sm font-bold border border-gray-100" />
              </div>
              <div className="md:col-span-2">
                <button type="submit" disabled={isCreating} className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase">
                  {isCreating ? 'Creating...' : 'Create Event'}
                </button>
              </div>
            </form>
          )}

          {selectedEvent && (
            <>
              <div className="bg-white p-6 rounded-2xl border border-gray-100 flex flex-wrap gap-6 items-start">
                <div className="shrink-0">
                  {qrDataUrl ? (
                    <img src={qrDataUrl} alt="Sign-in QR code" className="w-[200px] h-[200px] rounded-lg border border-gray-100" />
                  ) : (
                    <div className="w-[200px] h-[200px] bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs">QR loading...</div>
                  )}
                </div>
                <div className="flex-grow space-y-3 min-w-[200px]">
                  <h3 className="text-xl font-black uppercase">{selectedEvent.title}</h3>
                  <p className="text-sm text-gray-500 font-bold">{selectedEvent.event_date}</p>
                  <p className="text-xs text-gray-400 break-all font-mono">{signInUrl(selectedEvent.slug)}</p>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={copySignInLink} className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-xl text-[10px] font-black uppercase">
                      Copy Link
                    </button>
                    <button
                      onClick={() => handleToggleOpen(selectedEvent)}
                      className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-[10px] font-black uppercase"
                    >
                      {selectedEvent.is_open ? 'Close Sign-Ins' : 'Reopen Sign-Ins'}
                    </button>
                    <button
                      onClick={() => { fetchPublicEvents(); fetchEventAttendees(); showToast('Refreshed'); }}
                      className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-[10px] font-black uppercase"
                    >
                      Refresh
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-gray-100 text-center">
                  <p className="text-2xl font-black text-gray-900">{attendeeStats.total}</p>
                  <p className="text-[9px] font-black uppercase text-gray-400 mt-1">Total Signed In</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-100 text-center">
                  <p className="text-2xl font-black text-green-600">{attendeeStats.newCount}</p>
                  <p className="text-[9px] font-black uppercase text-gray-400 mt-1">New Visitors</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-100 text-center">
                  <p className="text-2xl font-black text-amber-600">{attendeeStats.returningCount}</p>
                  <p className="text-[9px] font-black uppercase text-gray-400 mt-1">Returning</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {attendeesForEvent.length === 0 ? (
                  <p className="text-center py-10 text-[10px] font-black uppercase text-gray-300">No sign-ins yet for this event.</p>
                ) : (
                  attendeesForEvent.map(att => {
                    const isRegistered = registeredEmails.has(att.email.toLowerCase());
                    return (
                      <div key={att.id} className="bg-white p-6 rounded-2xl border border-gray-100 flex flex-wrap justify-between gap-4">
                        <div>
                          <h4 className="font-black uppercase text-gray-900">{att.full_name}</h4>
                          <p className="text-sm font-bold text-indigo-600 mt-1">{att.email}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">
                            {att.district ? `District ${att.district}` : 'District unknown'} • {formatDate(att.created_at)}
                          </p>
                        </div>
                        {isRegistered && (
                          <span className="self-start px-3 py-1 bg-green-50 text-green-700 rounded-full text-[9px] font-black uppercase">
                            Registered user
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

          {sortedEvents.length === 0 && (
            <p className="text-center py-10 text-[10px] font-black uppercase text-gray-300">
              No events yet. Create one or run the database migration.
            </p>
          )}
        </div>
      )}
    </section>
  );
};
