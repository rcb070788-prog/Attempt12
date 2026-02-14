import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';

export type UseAuthOptions = {
  onProfileNotFound?: () => void;
  onVoterRemoved?: () => void;
};

export const useAuth = (options?: UseAuthOptions) => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [sessionHydrated, setSessionHydrated] = useState(false);
  const onProfileNotFound = options?.onProfileNotFound;
  const onVoterRemoved = options?.onVoterRemoved;

  const fetchProfile = async (userId: string) => {
    if (!supabase) return;
    // Force client to have latest session before first request (helps mobile tab)
    await supabase.auth.getSession();
    const delays = [0, 500, 1000, 2000, 3500];
    for (const delay of delays) {
      if (delay > 0) await new Promise((r) => setTimeout(r, delay));
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      if (data) {
        setProfile(data);
        return;
      }
    }
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

  // When user exists but profile is still null (e.g. mobile tab race), retry at 1s, 2s, 4s, 6s, 8s; then sign out if no profile
  useEffect(() => {
    if (!user?.id || profile != null || !supabase) return;
    const delays = [1000, 2000, 4000, 6000, 8000];
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < delays.length; i++) {
      const isLast = i === delays.length - 1;
      timers.push(
        setTimeout(() => {
          supabase.from('profiles').select('*').eq('id', user.id).maybeSingle().then(({ data }) => {
            if (data) {
              setProfile(data);
            } else if (isLast) {
              onProfileNotFound?.();
              supabase.auth.signOut().then(() => {
                setUser(null);
                setProfile(null);
              });
            }
          });
        }, delays[i])
      );
    }
    return () => timers.forEach((t) => clearTimeout(t));
  }, [user?.id, profile, onProfileNotFound]);

  // When profile is loaded, verify voter is still in registry (skip for admins or profiles without voter_id)
  useEffect(() => {
    if (!profile?.voter_id || profile?.is_admin === true) return;
    let cancelled = false;
    const verifyVoterStatus = async () => {
      try {
        const res = await fetch('/.netlify/functions/verify-voter-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ voterId: profile.voter_id }),
        });
        if (cancelled) return;
        if (res.status === 401 && supabase) {
          onVoterRemoved?.();
          await supabase.auth.signOut();
          setUser(null);
          setProfile(null);
        }
      } catch {
        // Network error: allow access to avoid locking out users due to transient failures
      }
    };
    verifyVoterStatus();
    return () => { cancelled = true; };
  }, [profile?.id, profile?.voter_id, profile?.is_admin, onVoterRemoved]);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Sign out failed:', err);
    }
    setUser(null);
    setProfile(null);
  }, []);

  return { user, profile, setProfile, setUser, sessionHydrated, signOut };
};
