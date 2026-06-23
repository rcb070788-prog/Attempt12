import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { supabase } from '../supabaseClient';
import { signInUrl } from '../utils/eventSignIn';

interface PublicEvent {
  id: string;
  slug: string;
  title: string;
  event_date: string;
  location: string | null;
  is_open: boolean;
}

interface EventSignInPrintPageProps {
  slug: string;
}

export default function EventSignInPrintPage({ slug }: EventSignInPrintPageProps) {
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!supabase) {
        if (!cancelled) {
          setNotFound(true);
          setLoading(false);
        }
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
        setNotFound(true);
        setLoading(false);
        return;
      }
      setEvent(data);
      const url = signInUrl(slug);
      try {
        const qr = await QRCode.toDataURL(url, { width: 280, margin: 2 });
        if (!cancelled) setQrDataUrl(qr);
      } catch {
        if (!cancelled) setQrDataUrl(null);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  const formatEventDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="event-signin-print-page min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm font-black uppercase text-gray-400 tracking-widest">Loading handout...</p>
      </div>
    );
  }

  if (notFound || !event) {
    return (
      <div className="event-signin-print-page min-h-screen flex items-center justify-center bg-gray-50 p-8">
        <div className="text-center space-y-4">
          <h1 className="text-xl font-black uppercase text-gray-900">Handout Not Available</h1>
          <p className="text-gray-500 text-sm">This event sign-in link is invalid or has been closed.</p>
          <a href="/" className="text-indigo-600 font-black uppercase text-xs">Go to website</a>
        </div>
      </div>
    );
  }

  const url = signInUrl(slug);

  return (
    <div className="event-signin-print-page min-h-screen bg-gray-100 py-8 px-4">
      <div className="event-signin-print-no-print text-center mb-6">
        <button
          type="button"
          onClick={() => window.print()}
          className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-sm shadow-lg"
        >
          Print Handout
        </button>
      </div>

      <article className="event-signin-print-sheet max-w-2xl mx-auto bg-white rounded-2xl border border-gray-200 shadow-lg p-10 space-y-8">
        <header className="text-center space-y-2 border-b border-gray-100 pb-6">
          <p className="text-[10px] font-black uppercase text-indigo-600 tracking-widest">Concerned Citizens of Moore County</p>
          <h1 className="text-2xl font-black uppercase text-gray-900 leading-tight">{event.title}</h1>
          <p className="text-base font-bold text-gray-600">{formatEventDate(event.event_date)}</p>
          {event.location && (
            <p className="text-sm text-gray-500">{event.location}</p>
          )}
        </header>

        <div className="flex flex-col items-center space-y-4">
          <p className="text-sm font-black uppercase text-gray-700 tracking-wide">Scan to Sign In</p>
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="Event sign-in QR code"
              className="w-[280px] h-[280px]"
              width={280}
              height={280}
            />
          ) : (
            <div className="w-[280px] h-[280px] bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
              QR unavailable
            </div>
          )}
        </div>

        <div className="space-y-3 text-center">
          <p className="text-xs font-black uppercase text-gray-400">Or visit this link on any device</p>
          <p className="text-sm font-mono text-indigo-700 break-all leading-relaxed px-2">{url}</p>
        </div>

        <section className="space-y-3 text-sm text-gray-700 leading-relaxed">
          <h2 className="text-[10px] font-black uppercase text-gray-400 tracking-widest">How to sign in</h2>
          <ol className="list-decimal list-inside space-y-2 pl-1">
            <li>Scan the QR code with your phone camera to open the sign-in page.</li>
            <li>Or type the URL above on any phone, tablet, or computer.</li>
            <li>Enter your name, email address, and district (if known).</li>
          </ol>
          <p className="text-xs text-gray-500 pt-2">
            Signing in does not create a website account. For full access to polls and messaging, visit concernedcitizensofmc.com and complete voter verification.
          </p>
        </section>

        <footer className="text-center pt-4 border-t border-gray-100">
          <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">concernedcitizensofmc.com</p>
        </footer>
      </article>
    </div>
  );
}
