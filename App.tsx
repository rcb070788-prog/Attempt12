
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { CATEGORIES, DASHBOARDS, TN_VOTER_LOOKUP_URL } from './constants.ts';

// 1. SAFE INITIALIZATION
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

const Toast = ({ message, type }: { message: string, type: 'success' | 'error' }) => (
  <div className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-xl text-white z-[100] transition-all transform animate-bounce ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
    <i className={`fa-solid ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'} mr-2`}></i>
    {message}
  </div>
);

export default function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [user, setUser] = useState<any>(null);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  if (!supabase) {
    return (
      <div className="min-h-screen bg-indigo-900 flex items-center justify-center p-6 text-white text-center font-sans">
        <div className="max-w-md">
          <i className="fa-solid fa-key text-6xl mb-6 text-yellow-400"></i>
          <h1 className="text-3xl font-black mb-4">Setup Required</h1>
          <p className="text-indigo-200 mb-8 leading-relaxed">
            I can't find your <strong>Supabase URL</strong> or <strong>Anon Key</strong>. 
          </p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      showToast(error.message, "error");
    } else {
      showToast("Welcome back!", "success");
      setCurrentPage('home');
    }
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsVerifying(true);
    
    const formData = new FormData(e.currentTarget);
    // We convert everything to UPPERCASE here to match the CSV perfectly
    const lastName = (formData.get('lastName') as string).toUpperCase();
    const voterId = formData.get('voterId') as string;
    const dob = formData.get('dob') as string;
    const address = (formData.get('address') as string).toUpperCase();
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const verifyRes = await fetch('/.netlify/functions/verify-voter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lastName, voterId, dob, address })
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        throw new Error(verifyData.error || "Identity could not be verified.");
      }

      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: verifyData.fullName,
            voter_id: voterId,
            district: verifyData.district
          }
        }
      });

      if (signUpError) throw signUpError;

      showToast("Verification Successful! Check your email for a confirmation link.", "success");
      setCurrentPage('login');
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    showToast("Logged out successfully");
    setCurrentPage('home');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {toast && <Toast message={toast.message} type={toast.type} />}
      
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center cursor-pointer" onClick={() => setCurrentPage('home')}>
          <i className="fa-solid fa-landmark text-indigo-600 text-2xl mr-2"></i>
          <span className="text-xl font-bold text-gray-800">Community Finance</span>
        </div>
        <div className="flex gap-4 items-center">
          {user ? (
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-600">Hi, {user.user_metadata?.full_name?.split(' ')[0]}</span>
              <button onClick={handleLogout} className="text-sm text-red-500 hover:underline">Logout</button>
            </div>
          ) : (
            <button onClick={() => setCurrentPage('login')} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 transition">Voter Login</button>
          )}
        </div>
      </nav>

      <main className="flex-grow container mx-auto px-4 py-8">
        {currentPage === 'home' && (
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl font-black mb-4 text-gray-900 uppercase tracking-tight">Transparency Portal</h1>
            <p className="text-gray-500 mb-12 text-lg">Open access to community financial records.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {CATEGORIES.map(cat => (
                <div key={cat.id} className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-2xl transition-all cursor-pointer group text-left">
                  <div className={`${cat.color} w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg`}>
                    <i className={`fa-solid ${cat.icon} text-2xl`}></i>
                  </div>
                  <h3 className="text-2xl font-black text-gray-800 mb-2">{cat.label}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">Analyze spending and view audits for full accountability.</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentPage === 'signup' && (
          <div className="max-w-xl mx-auto bg-white p-10 rounded-3xl shadow-2xl border border-gray-100">
            <h2 className="text-3xl font-black text-center mb-2 text-gray-900 uppercase">Voter Registry</h2>
            <p className="text-center text-gray-400 mb-10 text-sm px-4">All entries must match your official voter registration exactly.</p>
            
            <form className="space-y-6" onSubmit={handleSignup}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Last Name</label>
                  <input 
                    name="lastName" 
                    required 
                    placeholder="SMITH" 
                    className="w-full p-4 bg-gray-50 rounded-xl border-2 border-transparent focus:border-indigo-500 focus:bg-white transition-all outline-none font-bold uppercase" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Voter ID #</label>
                  <input name="voterId" required placeholder="12345678" className="w-full p-4 bg-gray-50 rounded-xl border-2 border-transparent focus:border-indigo-500 focus:bg-white transition-all outline-none font-bold" />
                </div>
              </div>

              <div className="p-6 bg-indigo-50 rounded-3xl border border-indigo-100 relative">
                <p className="text-[10px] font-black text-indigo-900 mb-4 uppercase tracking-widest flex items-center gap-2">
                  Verification (Complete One)
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-black text-indigo-400 mb-1 uppercase tracking-tighter">Date of Birth</label>
                    <input type="date" name="dob" className="w-full p-3 bg-white rounded-xl border-0 shadow-sm text-sm font-bold" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-indigo-400 mb-1 uppercase tracking-tighter">Street Address</label>
                    <input 
                      name="address" 
                      placeholder="123 MAIN ST" 
                      className="w-full p-3 bg-white rounded-xl border-0 shadow-sm text-sm font-bold uppercase" 
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100">
                <div className="mb-4">
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Email Address</label>
                  <input type="email" name="email" required placeholder="you@example.com" className="w-full p-4 bg-gray-50 rounded-xl border-2 border-transparent focus:border-indigo-500 focus:bg-white transition-all outline-none font-bold" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Choose Password</label>
                  <input type="password" name="password" required placeholder="Min. 6 characters" className="w-full p-4 bg-gray-50 rounded-xl border-2 border-transparent focus:border-indigo-500 focus:bg-white transition-all outline-none font-bold" />
                </div>
              </div>
              
              <button 
                disabled={isVerifying}
                className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl hover:bg-indigo-700 disabled:bg-indigo-300 transition-all flex items-center justify-center gap-3 transform hover:-translate-y-1"
              >
                {isVerifying ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-user-plus"></i>}
                {isVerifying ? 'Checking Records...' : 'Register & Verify'}
              </button>
            </form>
          </div>
        )}

        {currentPage === 'login' && (
          <div className="max-w-md mx-auto bg-white p-12 rounded-3xl shadow-2xl border border-gray-100">
            <h2 className="text-3xl font-black text-center mb-8 text-gray-900 tracking-tight">Voter Login</h2>
            <form className="space-y-4" onSubmit={handleLogin}>
              <input name="email" type="email" placeholder="Email Address" required className="w-full p-4 bg-gray-50 rounded-xl border-2 border-transparent focus:border-indigo-500 focus:bg-white transition-all outline-none font-bold" />
              <input name="password" type="password" placeholder="Password" required className="w-full p-4 bg-gray-50 rounded-xl border-2 border-transparent focus:border-indigo-500 focus:bg-white transition-all outline-none font-bold" />
              <button className="w-full bg-indigo-600 text-white py-5 rounded-xl font-black text-lg hover:bg-indigo-700 shadow-lg transition-all transform hover:-translate-y-1">Sign In</button>
            </form>
          </div>
        )}
      </main>

      <footer className="bg-gray-900 text-indigo-200 p-12 mt-20 text-center">
        <p className="text-xs text-indigo-400">© 2024 Concerned Citizens Hub. Records are formatted in ALL CAPS to match official municipal data.</p>
      </footer>
    </div>
  );
}
