import React from 'react';
import { SupabaseClient } from '@supabase/supabase-js';

// The "Remote Controls" (Props) this page needs to talk to the rest of the app
interface LoginPageProps {
  supabase: SupabaseClient | null;
  setCurrentPage: (page: string) => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

export default function LoginPage({ supabase, setCurrentPage, showToast }: LoginPageProps) {
  
  // The "Submit Button" Brain
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = fd.get('email') as string;
    const password = fd.get('password') as string;

    if (!supabase) return;

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      showToast(error.message, 'error');
    } else {
      setCurrentPage('home');
    }
  };

  return (
    <div className="max-w-lg mx-auto py-10 bg-white p-8 rounded-[3rem] shadow-2xl text-center">
      <h2 className="text-2xl font-black uppercase text-indigo-600 mb-8">Secure Access</h2>
      <form className="space-y-4" onSubmit={handleLogin}>
        <input 
          name="email" 
          type="email" 
          placeholder="EMAIL" 
          required 
          className="w-full p-4 bg-gray-50 rounded-xl text-[18.66px] font-bold" 
        />
        <input 
          name="password" 
          type="password" 
          placeholder="PASSWORD" 
          required 
          className="w-full p-4 bg-gray-50 rounded-xl text-[18.66px] font-bold" 
        />
        <button className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-[18.66px] uppercase shadow-xl tracking-tighter">
          Enter Portal
        </button>
      </form>
      <button 
        onClick={() => setCurrentPage('signup')} 
        className="mt-6 text-[10px] font-black uppercase text-gray-400"
      >
        Need to register as a voter?
      </button>
    </div>
  );
}