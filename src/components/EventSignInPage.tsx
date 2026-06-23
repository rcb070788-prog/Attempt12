import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import homescreenUrl from '../assets/homescreen.png';

interface PublicEvent {
  id: string;
  slug: string;
  title: string;
  event_date: string;
  location: string | null;
  is_open: boolean;
}

interface EventSignInPageProps {
  slug: string;
}

type PageState = 'loading' | 'form' | 'success' | 'closed' | 'not_found';

export default function EventSignInPage({ slug }: EventSignInPageProps) {
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [pageState, setPageState] = useState<PageState>('loading');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!supabase) {
        if (!cancelled) setPageState('not_found');
        return;
      }
      const { data, error } = await supabase
        .from('public_events')
        .select('id, slug, title, event_date, location, is_open')
        .eq('slug', slug)
        .eq('is_open', true)
        .maybeSingle();

      if (cancelled) return;
      if (error || !data) {
        setPageState('not_found');
        return;
      }
      setEvent(data);
      setPageState('form');
    })();
    return () => { cancelled = true; };
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!supabase || !event) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    const fd = new FormData(e.currentTarget);
    const district = (fd.get('district') as string) || null;

    const { error } = await supabase.from('event_attendees').insert({
      event_id: event.id,
      full_name: (fd.get('fullName') as string).trim(),
      email: (fd.get('email') as string).trim().toLowerCase(),
      district: district || null,
    });

    setIsSubmitting(false);
    if (error) {
      if (error.code === '23505') {
        setErrorMsg("You're already signed in for this event. Thank you!");
        setPageState('success');
        return;
      }
      setErrorMsg(error.message);
      return;
    }
    setPageState('success');
  };

  const formatEventDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  return (
    <div
      className="fixed inset-0 z-[100] event-signin-bg flex flex-col overflow-y-auto h-[100dvh]"
      style={{ ['--homescreen-url' as string]: `url(${homescreenUrl})` }}
    >
      <div className="flex-grow flex flex-col justify-center px-4 py-8 max-w-lg mx-auto w-full">
        {pageState === 'loading' && (
          <div className="text-center py-20">
            <i className="fa-solid fa-spinner animate-spin text-3xl text-indigo-600" />
            <p className="mt-4 text-sm font-black uppercase text-gray-400 tracking-widest">Loading...</p>
          </div>
        )}

        {pageState === 'not_found' && (
          <div className="bg-white rounded-[2rem] shadow-xl p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto">
              <i className="fa-solid fa-calendar-xmark text-2xl" />
            </div>
            <h1 className="text-2xl font-black uppercase text-gray-900">Sign-In Not Available</h1>
            <p className="text-gray-500 text-sm">
              This event sign-in link is invalid or has been closed.
            </p>
            <a href="/" className="inline-block mt-4 text-indigo-600 font-black uppercase text-xs tracking-widest">
              Go to website
            </a>
          </div>
        )}

        {pageState === 'success' && (
          <div className="bg-white rounded-[2rem] shadow-xl p-8 text-center space-y-4 animate-slide-up">
            <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto">
              <i className="fa-solid fa-check text-2xl" />
            </div>
            <h1 className="text-2xl font-black uppercase text-gray-900">You&apos;re Signed In</h1>
            <p className="text-gray-500 text-sm">
              {errorMsg || "Thank you for attending! We've recorded your interest."}
            </p>
            {event && (
              <p className="text-indigo-600 font-bold text-sm">{event.title}</p>
            )}
          </div>
        )}

        {pageState === 'form' && event && (
          <div className="bg-white rounded-[2rem] shadow-xl p-6 md:p-8 space-y-6 animate-slide-up">
            <div className="text-center space-y-2">
              <p className="text-[10px] font-black uppercase text-indigo-600 tracking-widest">Event Sign-In</p>
              <h1 className="text-2xl font-black uppercase text-gray-900 leading-tight">{event.title}</h1>
              <p className="text-sm font-bold text-gray-400">{formatEventDate(event.event_date)}</p>
              {event.location && (
                <p className="text-sm text-gray-500">{event.location}</p>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Full Name</label>
                <input
                  name="fullName"
                  required
                  autoComplete="name"
                  placeholder="Your name"
                  className="w-full p-4 bg-gray-50 rounded-xl border border-gray-100 text-base font-bold outline-none focus:ring-2 ring-indigo-500/20"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Email Address</label>
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="w-full p-4 bg-gray-50 rounded-xl border border-gray-100 text-base font-bold outline-none focus:ring-2 ring-indigo-500/20"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-2">District (if known)</label>
                <select
                  name="district"
                  className="w-full p-4 bg-gray-50 rounded-xl border border-gray-100 text-base font-bold outline-none focus:ring-2 ring-indigo-500/20"
                  defaultValue=""
                >
                  <option value="">Not sure / prefer not to say</option>
                  <option value="1">District 1</option>
                  <option value="2">District 2</option>
                  <option value="3">District 3</option>
                  <option value="4">District 4</option>
                  <option value="5">District 5</option>
                </select>
              </div>

              {errorMsg && (
                <p className="text-red-600 text-sm font-bold text-center">{errorMsg}</p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-sm shadow-xl shadow-indigo-100 disabled:opacity-60"
              >
                {isSubmitting ? <i className="fa-solid fa-spinner animate-spin" /> : 'Sign In to Event'}
              </button>
            </form>

            <p className="text-center text-[10px] text-gray-400 leading-relaxed">
              Want full access to polls and messaging?{' '}
              <a href="/#signup" className="text-indigo-600 font-black uppercase">Sign up</a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
