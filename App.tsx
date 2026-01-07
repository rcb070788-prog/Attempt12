
import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { CATEGORIES, DASHBOARDS, OFFICIALS } from './constants.ts';
import { DashboardConfig } from './types.ts';

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
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeDashboard, setActiveDashboard] = useState<DashboardConfig | null>(null);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Feature Data
  const [polls, setPolls] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  useEffect(() => {
    if (!supabase) return;
    
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      if (event === 'SIGNED_OUT') {
        setProfile(null);
        setCurrentPage('home');
      }
    });

    fetchPolls();
    fetchSuggestions();

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase!.from('profiles').select('*').eq('id', userId).single();
    setProfile(data);
  };

  const fetchPolls = async () => {
    const { data } = await supabase!.from('polls').select('*, poll_options(*)').order('created_at', { ascending: false });
    setPolls(data || []);
  };

  const fetchSuggestions = async () => {
    const { data } = await supabase!.from('suggestions').select('*, profiles(full_name, district)').order('created_at', { ascending: false });
    setSuggestions(data || []);
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsVerifying(true);
    const formData = new FormData(e.currentTarget);
    const lastNameInput = (formData.get('lastName') as string).toUpperCase();
    const voterId = formData.get('voterId') as string;
    const dob = formData.get('dob') as string;
    const address = formData.get('address') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const verifyRes = await fetch('/.netlify/functions/verify-voter', {
        method: 'POST',
        body: JSON.stringify({ lastName: lastNameInput, voterId, dob, address }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.error || "Verification failed");

      // Splitting name for the profiles table
      const nameParts = verifyData.fullName.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ');

      const { error } = await supabase!.auth.signUp({
        email,
        password,
        options: {
          data: { 
            full_name: verifyData.fullName, 
            first_name: firstName,
            last_name: lastName,
            district: verifyData.district, 
            voter_id: voterId 
          }
        }
      });
      if (error) throw error;
      showToast("Check email for confirmation!", "success");
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVote = async (pollId: string, optionId: string) => {
    if (profile?.is_banned) return showToast("Account restricted.", "error");
    const { error } = await supabase!.from('poll_votes').upsert({ poll_id: pollId, option_id: optionId, user_id: user.id });
    if (error) showToast("You have already voted or poll is closed.", "error");
    else showToast("Vote recorded!", "success");
  };

  const handleSuggestion = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (profile?.is_banned) return showToast("Account restricted.", "error");
    const formData = new FormData(e.currentTarget);
    const content = formData.get('content') as string;
    const isPublic = formData.get('isPublic') === 'on';

    const { error } = await supabase!.from('suggestions').insert({ content, is_public: isPublic, user_id: user.id });
    if (error) showToast("Failed to submit.", "error");
    else {
      showToast("Suggestion submitted!", "success");
      fetchSuggestions();
      e.currentTarget.reset();
    }
  };

  if (activeDashboard) {
    return (
      <div className="fixed inset-0 z-[100] bg-white flex flex-col font-sans overflow-hidden">
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-[110]">
          <button onClick={() => setActiveDashboard(null)} className="bg-white/95 backdrop-blur-md shadow-xl border border-gray-100 text-gray-800 px-4 py-2 rounded-xl hover:bg-red-600 hover:text-white transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
            <i className="fa-solid fa-xmark"></i> Close Report
          </button>
        </div>
        <iframe src={activeDashboard.folderPath} className="w-full h-full border-0" title={activeDashboard.title} />
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col font-sans overflow-hidden relative">
      {toast && <Toast message={toast.message} type={toast.type} />}
      
      <nav className="bg-white shadow-sm px-6 py-3 flex justify-between items-center z-50 shrink-0 border-b border-gray-100">
        <div className="flex items-center gap-8">
          <div className="flex items-center cursor-pointer" onClick={() => setCurrentPage('home')}>
            <i className="fa-solid fa-landmark text-indigo-600 text-2xl mr-3"></i>
            <span className="text-xl font-bold text-gray-900 tracking-tight">Finance Hub</span>
          </div>
          <div className="hidden md:flex gap-6">
            <button onClick={() => setCurrentPage('polls')} className={`text-[10px] font-black uppercase tracking-widest ${currentPage === 'polls' ? 'text-indigo-600' : 'text-gray-400'}`}>Polls</button>
            <button onClick={() => setCurrentPage('suggestions')} className={`text-[10px] font-black uppercase tracking-widest ${currentPage === 'suggestions' ? 'text-indigo-600' : 'text-gray-400'}`}>Suggestions</button>
            {profile?.is_admin && <button onClick={() => setCurrentPage('admin')} className="text-[10px] font-black uppercase tracking-widest text-red-500">Admin</button>}
          </div>
        </div>
        <div className="flex gap-4 items-center">
          {user ? (
            <button onClick={() => supabase!.auth.signOut()} className="text-[10px] font-black uppercase text-red-500">Logout</button>
          ) : (
            <button onClick={() => setCurrentPage('login')} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-black text-[10px] uppercase shadow-md">Sign In</button>
          )}
        </div>
      </nav>

      <main className="flex-grow overflow-y-auto custom-scrollbar container mx-auto px-4 py-8">
        {currentPage === 'home' && (
          <div className="max-w-4xl mx-auto space-y-12">
            <header className="text-center">
              <h1 className="text-5xl font-black text-gray-900 uppercase tracking-tighter mb-4">Moore County Transparency</h1>
              <p className="text-gray-500 text-xl">Verified voter records & budget oversight.</p>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {CATEGORIES.map(cat => (
                <div key={cat.id} onClick={() => { setSelectedCategory(cat.id); setCurrentPage('dashboards'); }} className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 hover:shadow-xl transition-all cursor-pointer flex items-center gap-6">
                  <div className={`${cat.color} w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg`}><i className={`fa-solid ${cat.icon}`}></i></div>
                  <div><h3 className="text-xl font-black text-gray-800 uppercase">{cat.label}</h3><p className="text-gray-400 text-sm">View records.</p></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentPage === 'dashboards' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {DASHBOARDS.filter(d => d.category === selectedCategory).map(dash => (
              <div key={dash.id} onClick={() => setActiveDashboard(dash)} className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 hover:shadow-xl cursor-pointer">
                <h4 className="text-xl font-black text-gray-800 uppercase mb-2">{dash.title}</h4>
                <p className="text-gray-400 text-xs mb-4">{dash.description}</p>
                <span className="text-indigo-600 text-[10px] font-black uppercase tracking-widest">Open Report</span>
              </div>
            ))}
          </div>
        )}

        {currentPage === 'polls' && (
          <div className="max-w-3xl mx-auto space-y-8">
            <h2 className="text-3xl font-black uppercase tracking-tighter">Active Polls</h2>
            {polls.map(poll => (
              <div key={poll.id} className="bg-white p-8 rounded-[2rem] shadow-lg border border-gray-100">
                <h3 className="text-xl font-black mb-2 uppercase">{poll.title}</h3>
                <p className="text-gray-500 mb-6">{poll.description}</p>
                <div className="space-y-3">
                  {poll.poll_options.map((opt: any) => (
                    <button key={opt.id} onClick={() => handleVote(poll.id, opt.id)} className="w-full text-left p-4 rounded-xl border-2 border-gray-50 hover:border-indigo-100 hover:bg-indigo-50/30 transition-all font-bold text-gray-700 flex justify-between">
                      {opt.text} <i className="fa-solid fa-chevron-right text-indigo-200"></i>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {currentPage === 'suggestions' && (
          <div className="max-w-3xl mx-auto space-y-12">
            <div className="bg-white p-8 rounded-[2rem] shadow-lg border border-indigo-50">
              <h2 className="text-xl font-black uppercase text-indigo-600 mb-6">Submit Idea</h2>
              <form onSubmit={handleSuggestion} className="space-y-4">
                <textarea name="content" required placeholder="Describe your suggestion for the district..." className="w-full h-32 bg-gray-50 rounded-2xl p-4 outline-none font-bold" />
                <div className="flex justify-between items-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" name="isPublic" defaultChecked className="w-4 h-4 rounded" />
                    <span className="text-[10px] font-black uppercase text-gray-400">Make Publicly Visible</span>
                  </label>
                  <button type="submit" className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black uppercase text-[10px]">Submit</button>
                </div>
              </form>
            </div>
            <div className="space-y-6">
              {suggestions.map(s => (
                <div key={s.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <p className="text-gray-800 font-bold mb-4 italic">"{s.content}"</p>
                  <div className="flex justify-between items-center border-t pt-4">
                    <span className="text-[10px] font-black uppercase">{s.profiles?.full_name} • {s.profiles?.district}</span>
                    <span className="text-[8px] text-gray-400 uppercase font-black">{new Date(s.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentPage === 'signup' && (
          <div className="max-w-md mx-auto bg-white p-8 rounded-[2.5rem] shadow-2xl border border-gray-100">
             <h2 className="text-2xl font-black text-center mb-8 text-indigo-600 uppercase">Voter Verification</h2>
             <form className="space-y-4" onSubmit={handleSignup}>
               <input name="lastName" required placeholder="LAST NAME" className="w-full p-4 bg-gray-50 rounded-xl font-bold uppercase" />
               <input name="voterId" required placeholder="VOTER ID #" className="w-full p-4 bg-gray-50 rounded-xl font-bold" />
               <div className="grid grid-cols-2 gap-4">
                 <input type="date" name="dob" required className="p-4 bg-gray-50 rounded-xl text-xs font-bold" />
                 <input name="address" required placeholder="ADDRESS" className="p-4 bg-gray-50 rounded-xl text-xs font-bold uppercase" />
               </div>
               <input type="email" name="email" required placeholder="Email" className="w-full p-4 bg-gray-50 rounded-xl font-bold" />
               <input type="password" name="password" required placeholder="Password" className="w-full p-4 bg-gray-50 rounded-xl font-bold" />
               <button disabled={isVerifying} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black uppercase shadow-xl">{isVerifying ? 'Verifying...' : 'Complete Registration'}</button>
             </form>
          </div>
        )}

        {currentPage === 'login' && (
          <div className="max-w-md mx-auto bg-white p-8 rounded-[2.5rem] shadow-2xl border border-gray-100">
             <h2 className="text-2xl font-black text-center mb-8 text-indigo-600 uppercase">Sign In</h2>
             <form className="space-y-4" onSubmit={async (e) => {
               e.preventDefault();
               const formData = new FormData(e.currentTarget);
               const { error } = await supabase!.auth.signInWithPassword({ email: formData.get('email') as string, password: formData.get('password') as string });
               if (error) showToast(error.message, "error");
               else setCurrentPage('home');
             }}>
               <input name="email" type="email" required placeholder="Email" className="w-full p-4 bg-gray-50 rounded-xl font-bold" />
               <input name="password" type="password" required placeholder="Password" className="w-full p-4 bg-gray-50 rounded-xl font-bold" />
               <button className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black uppercase shadow-xl">Login</button>
             </form>
          </div>
        )}

        {currentPage === 'admin' && profile?.is_admin && (
           <div className="max-w-4xl mx-auto space-y-8">
             <div className="bg-red-50 p-6 rounded-3xl border-2 border-red-100 flex justify-between items-center">
               <h2 className="text-2xl font-black text-red-600 uppercase">Admin Command Console</h2>
               <div className="bg-red-600 text-white px-4 py-1 rounded-full text-[10px] font-black animate-pulse">LIVE OVERSIGHT</div>
             </div>
             {/* Admin tools will go here */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-8 rounded-[2rem] border shadow-sm">
                  <h3 className="font-black uppercase mb-4">Create New Poll</h3>
                  <p className="text-gray-400 text-xs mb-4 italic">Draft questions for the community registry.</p>
                  <button className="bg-gray-900 text-white px-6 py-2 rounded-lg font-black text-[10px] uppercase">Launch Poll Tool</button>
                </div>
                <div className="bg-white p-8 rounded-[2rem] border shadow-sm">
                  <h3 className="font-black uppercase mb-4">Voter Registry</h3>
                  <p className="text-gray-400 text-xs mb-4 italic">Monitor bans and verification status.</p>
                  <button className="bg-gray-900 text-white px-6 py-2 rounded-lg font-black text-[10px] uppercase">Manage Users</button>
                </div>
             </div>
           </div>
        )}
      </main>

      <footer className="bg-white border-t border-gray-100 py-4 text-center">
        <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.3em]">Verified Community Infrastructure • Moore County</p>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 20px; }
      `}</style>
    </div>
  );
}
