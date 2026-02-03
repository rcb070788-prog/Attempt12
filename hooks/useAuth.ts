import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export const useAuth = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [sessionHydrated, setSessionHydrated] = useState(false);

  const fetchProfile = async (userId: string) => {
    if (!supabase) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (data) setProfile(data);
  };

  useEffect(() => {
    if (!supabase) return;

    let cancelled = false;

    // Establish initial session from storage first (avoids race with onAuthStateChange)
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      setUser(session?.user ?? null);
      if (session?.user) await fetchProfile(session.user.id);
      setSessionHydrated(true);
    };

    initSession();

    // Then listen for auth changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return { user, profile, setProfile, setUser, sessionHydrated };
};
