
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { CATEGORIES, DASHBOARDS } from './constants.ts';
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
  
  // Feature Data
  const [polls, setPolls] = useState<any[]>([]);
  const [selectedPoll, setSelectedPoll] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]); 

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
    const { data } = await supabase!.from('polls').select('*, poll_options(*), poll_votes(*), poll_comments(*, profiles(full_name, district))').order('created_at', { ascending: false });
    setPolls(data || []);
    if (selectedPoll) {
      const updated = data?.find(p => p.id === selectedPoll.id);
      if (updated) setSelectedPoll(updated);
    }
  };

  const fetchSuggestions = async () => {
    const { data } = await supabase!.from('suggestions').select('*, profiles(full_name, district)').order('created_at', { ascending: false });
    setSuggestions(data || []);
  };

  const fetchUsers = async () => {
    const { data } = await supabase!.from('profiles').select('*').order('full_name', { ascending: true });
    setAllUsers(data || []);
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const adminRequest = async (action: string, payload: any) => {
    const { data: { session } } = await supabase!.auth.getSession();
    const res = await fetch('/.netlify/functions/admin-actions', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ action, payload })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Action failed");
    return data;
  };

  const handleCreatePoll = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const options = (fd.get('options') as string).split(',').map(s => s.trim());
    try {
      await adminRequest('CREATE_POLL', {
        pollData: {
          title: fd.get('title'),
          description: fd.get('description'),
          closed_at: fd.get('closedAt'),
          is_anonymous_voting: fd.get('isAnon') === 'on'
        },
        options
      });
      showToast("Poll Launched!");
      fetchPolls();
      (e.target as HTMLFormElement).reset();
    } catch (err: any) { showToast(err.message, 'error'); }
  };

  const handleVote = async (pollId: string, optionId: string) => {
    if (!user) return setCurrentPage('login');
    if (profile?.is_banned) return showToast("Your account is restricted.", "error");
    const { error } = await supabase!.from('poll_votes').upsert({ poll_id: pollId, option_id: optionId, user_id: user.id }, { onConflict: 'poll_id,user_id' });
    if (error) showToast("Voting failed or poll is closed.", "error");
    else { showToast("Vote recorded!"); fetchPolls(); }
  };

  const handlePostComment = async (e: React.FormEvent<HTMLFormElement>, pollId: string) => {
    e.preventDefault();
    if (!user) return setCurrentPage('login');
    if (profile?.is_banned) return showToast("Restricted from commenting.", "error");
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase!.from('poll_comments').insert({ poll_id: pollId, user_id: user.id, content: fd.get('content') as string });
    if (error) showToast("Failed to post comment.", "error");
    else { showToast("Comment posted!"); fetchPolls(); (e.target as HTMLFormElement).reset(); }
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
          <div className="flex items-center cursor-pointer" onClick={() => { setCurrentPage('home'); setSelectedPoll(null); }}>
            <i className="fa-solid fa-landmark text-indigo-600 text-2xl mr-3"></i>
            <span className="text-xl font-bold text-gray-900 tracking-tight uppercase">Finance Hub</span>
          </div>
          <div className="hidden md:flex gap-6">
            <button onClick={() => { setCurrentPage('polls'); setSelectedPoll(null); }} className={`text-[10px] font-black uppercase tracking-widest ${currentPage === 'polls' ? 'text-indigo-600' : 'text-gray-400'}`}>Polls</button>
            <button onClick={() => { setCurrentPage('suggestions'); setSelectedPoll(null); }} className={`text-[10px] font-black uppercase tracking-widest ${currentPage === 'suggestions' ? 'text-indigo-600' : 'text-gray-400'}`}>Suggestions</button>
            {profile?.is_admin && <button onClick={() => { setCurrentPage('admin'); fetchUsers(); }} className="text-[10px] font-black uppercase tracking-widest text-red-500">Admin</button>}
          </div>
        </div>
        <div className="flex gap-4 items-center">
          {user ? (
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-black uppercase text-indigo-600">{profile?.full_name}</span>
              <button onClick={() => supabase!.auth.signOut()} className="text-[10px] font-black uppercase text-red-500">Logout</button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setCurrentPage('login')} className="text-gray-600 px-4 py-2 font-black text-[10px] uppercase">Sign In</button>
              <button onClick={() => setCurrentPage('signup')} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-black text-[10px] uppercase shadow-md">Register</button>
            </div>
          )}
        </div>
      </nav>

      <main className="flex-grow overflow-y-auto custom-scrollbar container mx-auto px-4 py-8">
        {currentPage === 'home' && (
          <div className="max-w-4xl mx-auto space-y-12 text-center">
             <header className="space-y-4">
               <h1 className="text-5xl font-black text-gray-900 uppercase tracking-tighter">Moore County Transparency</h1>
               <p className="text-gray-500 text-xl font-medium">Verified voter records & local budget oversight.</p>
             </header>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
               {CATEGORIES.map(cat => (
                 <div key={cat.id} onClick={() => { setSelectedCategory(cat.id); setCurrentPage('dashboards'); }} className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 hover:shadow-xl transition-all cursor-pointer flex items-center gap-6 group">
                   <div className={`${cat.color} w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg group-hover:scale-110 transition-transform`}><i className={`fa-solid ${cat.icon}`}></i></div>
                   <div className="text-left"><h3 className="text-xl font-black text-gray-800 uppercase">{cat.label}</h3><p className="text-gray-400 text-sm">Review financial logs.</p></div>
                 </div>
               ))}
             </div>
          </div>
        )}

        {currentPage === 'polls' && !selectedPoll && (
          <div className="max-w-4xl mx-auto space-y-8">
            <h2 className="text-4xl font-black uppercase tracking-tighter">Community Polls</h2>
            <div className="grid grid-cols-1 gap-6">
              {polls.map(poll => {
                const isClosed = new Date(poll.closed_at) < new Date();
                return (
                  <div key={poll.id} onClick={() => setSelectedPoll(poll)} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 hover:shadow-lg transition-all cursor-pointer flex flex-col md:flex-row justify-between items-center relative overflow-hidden">
                    {isClosed && <div className="absolute top-0 right-0 bg-gray-900 text-white px-4 py-1 text-[8px] font-black uppercase tracking-widest">Closed</div>}
                    <div className="space-y-2">
                      <h3 className="text-2xl font-black uppercase tracking-tight">{poll.title}</h3>
                      <p className="text-gray-400 font-bold text-sm uppercase">{poll.poll_votes?.length || 0} Votes Recorded</p>
                    </div>
                    <button className="bg-indigo-600 text-white px-8 py-4 rounded-xl font-black uppercase text-[10px] shadow-md">Participate</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {currentPage === 'polls' && selectedPoll && (
          <div className="max-w-4xl mx-auto space-y-8">
             <button onClick={() => setSelectedPoll(null)} className="text-[10px] font-black uppercase text-gray-400 flex items-center gap-2"><i className="fa-solid fa-arrow-left"></i> Back</button>
             <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-gray-100 space-y-8">
                <div>
                  <h2 className="text-4xl font-black uppercase mb-2 tracking-tighter">{selectedPoll.title}</h2>
                  <p className="text-gray-500 font-bold italic">{selectedPoll.description}</p>
                </div>
                <div className="space-y-4">
                  {selectedPoll.poll_options.map((opt: any) => {
                    const totalVotes = selectedPoll.poll_votes.length || 1;
                    const votes = selectedPoll.poll_votes.filter((v: any) => v.option_id === opt.id).length;
                    const percent = Math.round((votes / totalVotes) * 100);
                    return (
                      <button key={opt.id} onClick={() => handleVote(selectedPoll.id, opt.id)} className="w-full text-left p-6 rounded-2xl border-2 border-gray-50 hover:border-indigo-100 hover:bg-indigo-50/20 group relative overflow-hidden transition-all">
                        <div className="absolute inset-y-0 left-0 bg-indigo-600/5 transition-all" style={{ width: `${percent}%` }}></div>
                        <div className="relative flex justify-between font-black uppercase text-gray-700">
                          <span>{opt.text}</span>
                          <span className="text-indigo-400">{percent}%</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="pt-8 border-t border-gray-50">
                   <h3 className="font-black uppercase text-gray-400 text-xs mb-6">Verified Voter Discussion</h3>
                   <div className="space-y-4 mb-8">
                     {selectedPoll.poll_comments?.filter((c: any) => !c.is_hidden).map((c: any) => (
                       <div key={c.id} className="bg-gray-50 p-6 rounded-2xl">
                         <p className="text-gray-800 font-bold mb-2">"{c.content}"</p>
                         <p className="text-[9px] font-black uppercase text-indigo-400">{c.profiles?.full_name} • District {c.profiles?.district}</p>
                       </div>
                     ))}
                   </div>
                   <form onSubmit={(e) => handlePostComment(e, selectedPoll.id)} className="flex gap-4">
                     <input name="content" required placeholder="Add your voice..." className="flex-grow p-4 bg-gray-50 rounded-xl font-bold outline-none" />
                     <button type="submit" className="bg-indigo-600 text-white px-8 py-4 rounded-xl font-black uppercase text-[10px]">Post</button>
                   </form>
                </div>
             </div>
          </div>
        )}

        {currentPage === 'suggestions' && (
          <div className="max-w-4xl mx-auto space-y-12">
             <div className="bg-white p-10 rounded-[3rem] shadow-xl border-2 border-indigo-50">
               <h2 className="text-3xl font-black uppercase text-indigo-600 mb-6">Suggestion Box</h2>
               <form onSubmit={async (e) => {
                 e.preventDefault();
                 if (!user) return setCurrentPage('login');
                 const fd = new FormData(e.currentTarget);
                 const { error } = await supabase!.from('suggestions').insert({ content: fd.get('content'), is_public: fd.get('isPublic') === 'on', user_id: user.id });
                 if (error) showToast("Error submitting.", "error");
                 else { showToast("Thank you!"); fetchSuggestions(); (e.target as HTMLFormElement).reset(); }
               }} className="space-y-6">
                 <textarea name="content" required placeholder="Share an idea for Moore County..." className="w-full h-40 bg-gray-50 rounded-3xl p-6 outline-none font-bold text-lg" />
                 <div className="flex justify-between items-center">
                   <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" name="isPublic" defaultChecked className="w-4 h-4 accent-indigo-600" /> <span className="text-xs font-black uppercase text-gray-400">Public Suggestion</span></label>
                   <button type="submit" className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs shadow-xl">Submit</button>
                 </div>
               </form>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {suggestions.filter(s => s.is_public).map(s => (
                 <div key={s.id} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col justify-between">
                   <p className="text-gray-800 font-bold text-lg mb-6 italic">"{s.content}"</p>
                   <div className="flex justify-between items-center text-[10px] font-black uppercase text-gray-400 border-t pt-4">
                     <span>{s.profiles?.full_name} • District {s.profiles?.district}</span>
                     <span>{new Date(s.created_at).toLocaleDateString()}</span>
                   </div>
                 </div>
               ))}
             </div>
          </div>
        )}

        {currentPage === 'admin' && profile?.is_admin && (
           <div className="max-w-5xl mx-auto space-y-12 pb-20">
             <h2 className="text-5xl font-black uppercase text-red-600 tracking-tighter">Admin Command Center</h2>
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-10 rounded-[3rem] shadow-xl border-2 border-red-50">
                  <h3 className="text-2xl font-black uppercase mb-8">Deploy New Poll</h3>
                  <form onSubmit={handleCreatePoll} className="space-y-4">
                    <input name="title" required placeholder="Question Title" className="w-full p-4 bg-gray-50 rounded-xl font-bold" />
                    <textarea name="description" placeholder="Details..." className="w-full p-4 bg-gray-50 rounded-xl font-bold h-24" />
                    <input name="options" required placeholder="Options (Yes, No, Maybe)" className="w-full p-4 bg-gray-50 rounded-xl font-bold" />
                    <div className="grid grid-cols-2 gap-4">
                      <input type="datetime-local" name="closedAt" required className="w-full p-4 bg-gray-50 rounded-xl font-bold" />
                      <label className="flex items-center gap-2 px-4"><input type="checkbox" name="isAnon" /> <span className="text-[10px] font-black uppercase">Anon Voting</span></label>
                    </div>
                    <button type="submit" className="w-full py-5 bg-red-600 text-white rounded-2xl font-black uppercase shadow-xl hover:bg-red-700">Launch Poll</button>
                  </form>
                </div>
                <div className="bg-gray-900 p-10 rounded-[3rem] text-white shadow-2xl">
                  <h3 className="text-xl font-black uppercase mb-6 text-red-500">Voter Registry Moderation</h3>
                  <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar">
                    {allUsers.map(u => (
                      <div key={u.id} className="flex justify-between items-center p-4 rounded-2xl bg-white/5 border border-white/10">
                        <div>
                          <p className="text-sm font-black uppercase">{u.full_name}</p>
                          <p className="text-[8px] text-gray-500 font-black uppercase tracking-widest">District {u.district}</p>
                        </div>
                        <button onClick={async () => {
                          try {
                            await adminRequest('BAN_USER', { targetUserId: u.id, isBanned: !u.is_banned });
                            showToast(u.is_banned ? "Unbanned" : "Banned");
                            fetchUsers();
                          } catch(err: any) { showToast(err.message, 'error'); }
                        }} className={`px-4 py-1 rounded-full text-[8px] font-black uppercase border ${u.is_banned ? 'bg-red-600 border-red-600 text-white' : 'border-white/20 text-white hover:bg-red-600'}`}>
                          {u.is_banned ? 'Restricted' : 'Ban'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
             </div>
           </div>
        )}

        {currentPage === 'dashboards' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {DASHBOARDS.filter(d => d.category === selectedCategory).map(dash => (
              <div key={dash.id} onClick={() => setActiveDashboard(dash)} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 hover:shadow-xl transition-all cursor-pointer flex flex-col group">
                <div className="mb-6 flex justify-between items-start">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-xl"><i className="fa-solid fa-chart-pie"></i></div>
                  <span className="text-[8px] font-black uppercase bg-gray-50 px-2 py-1 rounded text-gray-400">{dash.status || 'Verified'}</span>
                </div>
                <h4 className="text-xl font-black text-gray-800 uppercase mb-2 group-hover:text-indigo-600 transition-colors">{dash.title}</h4>
                <p className="text-gray-400 text-xs mb-6 font-medium line-clamp-2">{dash.description}</p>
                <div className="mt-auto pt-6 border-t border-gray-50 flex justify-between items-center">
                  <span className="text-indigo-600 text-[10px] font-black uppercase tracking-widest">Open Analysis</span>
                  <i className="fa-solid fa-arrow-right text-indigo-200 group-hover:translate-x-2 transition-transform"></i>
                </div>
              </div>
            ))}
          </div>
        )}

        {currentPage === 'signup' && (
          <div className="max-w-md mx-auto bg-white p-10 rounded-[3rem] shadow-2xl">
             <h2 className="text-3xl font-black text-center mb-8 uppercase text-indigo-600">Register</h2>
             <form className="space-y-4" onSubmit={async (e) => {
                e.preventDefault();
                setIsVerifying(true);
                const fd = new FormData(e.currentTarget);
                try {
                  const res = await fetch('/.netlify/functions/verify-voter', { method: 'POST', body: JSON.stringify({ lastName: (fd.get('lastName') as string).toUpperCase(), voterId: fd.get('voterId'), dob: fd.get('dob'), address: fd.get('address') }) });
                  const d = await res.json();
                  if (!res.ok) throw new Error(d.error);
                  const { error } = await supabase!.auth.signUp({ email: fd.get('email') as string, password: fd.get('password') as string, options: { data: { full_name: d.fullName, district: d.district } } });
                  if (error) throw error;
                  showToast("Verification success! Check email.");
                } catch(err: any) { showToast(err.message, 'error'); }
                finally { setIsVerifying(false); }
             }}>
               <input name="lastName" required placeholder="LAST NAME" className="w-full p-4 bg-gray-50 rounded-xl font-bold uppercase" />
               <input name="voterId" required placeholder="VOTER ID #" className="w-full p-4 bg-gray-50 rounded-xl font-bold" />
               <input type="date" name="dob" required className="w-full p-4 bg-gray-50 rounded-xl font-bold" />
               <input name="email" type="email" required placeholder="EMAIL" className="w-full p-4 bg-gray-50 rounded-xl font-bold" />
               <input name="password" type="password" required placeholder="PASSWORD" className="w-full p-4 bg-gray-50 rounded-xl font-bold" />
               <button disabled={isVerifying} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase shadow-xl">{isVerifying ? 'VERIFYING...' : 'REGISTER'}</button>
             </form>
          </div>
        )}

        {currentPage === 'login' && (
          <div className="max-w-md mx-auto bg-white p-10 rounded-[3rem] shadow-2xl">
            <h2 className="text-3xl font-black text-center mb-8 uppercase text-indigo-600 tracking-tighter">Sign In</h2>
            <form className="space-y-4" onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const { error } = await supabase!.auth.signInWithPassword({ email: fd.get('email') as string, password: fd.get('password') as string });
              if (error) showToast(error.message, 'error'); else { showToast("Welcome back!"); setCurrentPage('home'); }
            }}>
              <input name="email" type="email" required placeholder="EMAIL" className="w-full p-4 bg-gray-50 rounded-xl font-bold outline-none" />
              <input name="password" type="password" required placeholder="PASSWORD" className="w-full p-4 bg-gray-50 rounded-xl font-bold outline-none" />
              <button className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase shadow-xl hover:scale-105 transition-transform">LOGIN</button>
            </form>
          </div>
        )}
      </main>

      <footer className="bg-white border-t py-6 text-center shrink-0">
        <p className="text-[8px] font-black text-gray-300 uppercase tracking-[0.5em]">Verified Voter Infrastructure • Moore County, Tennessee</p>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </div>
  );
}
