import { createClient } from '@supabase/supabase-js';
import { safeAuthStorage, isAuthStoragePersistent } from './lib/safeAuthStorage';

export { isAuthStoragePersistent };

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        storage: safeAuthStorage,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
