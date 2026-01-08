
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { CATEGORIES, DASHBOARDS } from './constants.ts';
import { DashboardConfig } from './types.ts';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

const renderTextWithLinks = (text: string) => {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a 
          key={i} 
          href={part} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-indigo-600 hover:underline break-all"
          onClick={(e) => e.stopPropagation()}
        >
          {part} <i className="fa-solid fa-external-link text-[8px] ml-1"></i>
        </a>
      );
    }
    return part;
  });
};

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
  
  const [polls, setPolls] = useState<any[]>([]);
  const [selectedPoll, setSelectedPoll] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  
  // Voting Confirmation Modal State
  const [pendingVote, setPendingVote] = useState<{pollId: string, optionId: string, optionText: string, isAnonymous: boolean} | null>(null);

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
      else { setProfile(null); setCurrentPage('home'); setSelectedPoll(null); }
    });
    fetchPolls();
    fetchSuggestions();
    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    if (!supabase) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (data) setProfile(data);
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchPolls = async () => {
    if (!supabase) return;
    try {
      // 400 error usually means query syntax is wrong or relationships aren't configured.
      // We'll simplify the join syntax.
      const { data, error } = await supabase
        .from('polls')
        .select(`
          *,
          poll_options(*),
          poll_votes(*, profiles(full_name, district)),
          poll_comments(*, profiles(full_name, district))
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Supabase Error:", error);
        // Fallback to minimal query if join fails
        const { data: simpleData } = await supabase.from('polls').select('*, poll_options(*)');
        setPolls(simpleData || []);
      } else {
        setPolls(data || []);
      }
    } catch (err) {
      console.error("Fetch Exception:", err);
    }
  };

  const fetchSuggestions = async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('suggestions')
      .select('*, profiles(full_name, district)')
      .order('created_at', { ascending: false });
    
    if (error) {
       const { data: simpleData } = await supabase.from('suggestions').select('*');
       setSuggestions(simpleData || []);
    } else {
      setSuggestions(data || []);
    }
  };

  const fetchUsers = async () => {
    if (!supabase) return;
    const { data } = await supabase.from('profiles').select('*').order('full_name', { ascending: true });
    setAllUsers(data || []);
  };

  const handleLogout = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null); setProfile(null); setCurrentPage('home');
  };

  const initiateVote = (pollId: string, optionId: string, optionText: string) => {
    if (!user) return setCurrentPage('login');
    const poll = polls.find(p => p.id === pollId);
    const existingVote = poll?.poll_votes?.find((v: any) => v.user_id === user.id);
    
    if (existingVote?.option_id === optionId) return;

    setPendingVote({
      pollId,
      optionId,
      optionText,
      isAnonymous: false
    });
  };

  const confirmVote = async () => {
    if (!pendingVote || !supabase) return;
    const { pollId, optionId, isAnonymous } = pendingVote;
    
    // Optimistic Update
    const updatedPolls = polls.map(p => {
      if (p.id === pollId) {
        const filteredVotes = (p.poll_votes || []).filter((v: any) => v.user_id !== user.id);
        return {
          ...p,
          poll_votes: [
            ...filteredVotes,
            { poll_id: pollId, option_id: optionId, user_id: user.id, is_anonymous: isAnonymous, profiles: profile }
          ]
        };
      }
      return p;
    });
    setPolls(updatedPolls);
    setPendingVote(null);

    const { error } = await supabase.from('poll_votes').upsert(
      { poll_id: pollId, option_id: optionId, user_id: user.id, is_anonymous: isAnonymous },
      { onConflict: 'poll_id,user_id' }
    );

    if (error) {
      showToast(error.message, 'error');
      fetchPolls();
    } else {
      showToast("Vote cast successfully!");
      fetchPolls();
    }
  };

  const handlePostComment = async (e: React.FormEvent, pollId: string) => {
    e.preventDefault();
    if (!user) return setCurrentPage('login');
    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);
    const content = fd.get('content') as string;

    const { error } = await supabase!.from('poll_comments').insert({
      poll_id: pollId,
      user_id: user.id,
      content
    });

    if (error) showToast(error.message, 'error');
    else {
      form.reset();
      fetchPolls();
    }
  };

  const hasUserVoted = (poll: any) => {
    return poll.poll_votes?.some((v: any) => v.user_id === user?.id);
  };

  if (activeDashboard) {
    return (
      <div className="fixed inset-0 z-[100] bg-white flex flex-col font-sans overflow-hidden">
        <div className="absolute top-4 right-4 z-[110]">
          <button onClick={() => setActiveDashboard(null)} className="bg-white/95 shadow-xl border border-gray-100 text-gray-800 px-4 py-2 rounded-xl text-[10px] font-black uppercase">Close Report</button>
        </div>
        <iframe src={activeDashboard.folderPath} className="w-full h-full border-0" title={activeDashboard.title} />
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col font-sans overflow-hidden relative">
      {toast && <Toast message={toast.message} type={toast.type} />}

      {/* Confirmation Modal */}
      {pendingVote && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto text-2xl mb-4">
                <i className="fa-solid fa-vote-yea"></i>
              </div>
              <h3 className="text-xl font-black uppercase">Confirm Your Vote</h3>
              <p className="text-gray-500 text-sm">
                You are about to vote for <span className="text-indigo-600 font-bold">"{pendingVote.optionText}"</span>. 
                Are you sure?
              </p>
            </div>

            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 flex items-center justify-between">
               <div className="space-y-1">
                 <p className="text-[10px] font-black uppercase text-gray-400">Anonymity</p>
                 <p className="text-xs text-gray-600 font-medium">Cast vote anonymously?</p>
               </div>
               <button 
                onClick={() => setPendingVote({...pendingVote, isAnonymous: !pendingVote.isAnonymous})}
                className={`w-12 h-6 rounded-full transition-all relative ${pendingVote.isAnonymous ? 'bg-indigo-600' : 'bg-gray-300'}`}
               >
                 <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${pendingVote.isAnonymous ? 'left-7' : 'left-1'}`}></div>
               </button>
            </div>

            <div className="flex flex-col gap-3">
              <button onClick={confirmVote} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg">
                Continue
              </button>
              <button onClick={() => setPendingVote(null)} className="w-full py-4 bg-white text-gray-400 rounded-2xl font-black uppercase text-[10px] border border-gray-100">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="bg-white shadow-sm px-4 py-3 z-50 shrink-0 border-b border-gray-100">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center cursor-pointer" onClick={() => { setCurrentPage('home'); setSelectedPoll(null); }}>
            <i className="fa-solid fa-landmark text-indigo-600 text-xl mr-2"></i>
            <span className="text-lg font-bold text-gray-900 tracking-tight uppercase">Finance Hub</span>
          </div>

          <div className="flex gap-6 items-center">
            <button onClick={() => { setCurrentPage('polls'); setSelectedPoll(null); fetchPolls(); }} className={`text-[9px] font-black uppercase ${currentPage === 'polls' ? 'text-indigo-600' : 'text-gray-400'}`}>Polls</button>
            <button onClick={() => { setCurrentPage('suggestions'); setSelectedPoll(null); fetchSuggestions(); }} className={`text-[9px] font-black uppercase ${currentPage === 'suggestions' ? 'text-indigo-600' : 'text-gray-400'}`}>Suggestions</button>
            {user ? (
              <button onClick={handleLogout} className="text-[9px] font-black uppercase text-red-500">Logout</button>
            ) : (
              <button onClick={() => setCurrentPage('login')} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-black text-[10px] uppercase">Sign In</button>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-grow overflow-y-auto container mx-auto px-4 py-8">
        {currentPage === 'home' && (
          <div className="max-w-4xl mx-auto space-y-12 text-center py-10">
             <header className="space-y-4">
               <h1 className="text-5xl font-black text-gray-900 uppercase tracking-tighter">Moore County Transparency</h1>
               <p className="text-gray-500 text-xl font-medium">Citizen oversight for a better community.</p>
             </header>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {CATEGORIES.map(cat => (
                 <div key={cat.id} onClick={() => { setSelectedCategory(cat.id); setCurrentPage('dashboards'); }} className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 hover:shadow-xl transition-all cursor-pointer flex items-center gap-6 group">
                   <div className={`${cat.color} w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg`}><i className={`fa-solid ${cat.icon}`}></i></div>
                   <div className="text-left"><h3 className="text-xl font-black text-gray-800 uppercase">{cat.label}</h3><p className="text-gray-400 text-xs">Review budget logs.</p></div>
                 </div>
               ))}
             </div>
          </div>
        )}

        {currentPage === 'polls' && !selectedPoll && (
          <div className="max-w-4xl mx-auto space-y-8">
            <h2 className="text-4xl font-black uppercase tracking-tighter">Live Polls</h2>
            <div className="grid grid-cols-1 gap-6">
              {polls.map(poll => (
                <div key={poll.id} onClick={() => setSelectedPoll(poll)} className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 hover:shadow-lg transition-all cursor-pointer flex justify-between items-center">
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black uppercase">{poll.title}</h3>
                    <p className="text-[9px] font-black uppercase text-gray-400">{poll.poll_votes?.length || 0} Votes Recorded</p>
                  </div>
                  <button className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black uppercase text-[10px]">
                    {hasUserVoted(poll) ? 'View Results' : 'Vote Now'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentPage === 'polls' && selectedPoll && (
          <div className="max-w-4xl mx-auto space-y-8 pb-20">
             <button onClick={() => setSelectedPoll(null)} className="text-[10px] font-black uppercase text-gray-400 flex items-center gap-2"><i className="fa-solid fa-arrow-left"></i> Back</button>
             <div className="bg-white p-10 rounded-[2rem] shadow-xl border border-gray-100 space-y-10">
                <div className="space-y-4">
                  <h2 className="text-4xl font-black uppercase leading-none">{selectedPoll.title}</h2>
                  <p className="text-gray-600 text-sm">{renderTextWithLinks(selectedPoll.description)}</p>
                </div>

                <div className="space-y-6">
                  {selectedPoll.poll_options?.map((opt: any) => {
                    const optionVotes = selectedPoll.poll_votes?.filter((v: any) => v.option_id === opt.id) || [];
                    const totalVotes = selectedPoll.poll_votes?.length || 0;
                    const percent = totalVotes === 0 ? 0 : Math.round((optionVotes.length / totalVotes) * 100);
                    const votedThis = optionVotes.some((v: any) => v.user_id === user?.id);
                    const userHasVoted = hasUserVoted(selectedPoll);

                    return (
                      <div key={opt.id} className="space-y-3">
                        <button 
                          onClick={() => initiateVote(selectedPoll.id, opt.id, opt.text)}
                          className={`w-full text-left p-6 rounded-2xl border-2 transition-all relative overflow-hidden ${votedThis ? 'border-indigo-600 bg-indigo-50' : 'border-gray-50'}`}
                        >
                          {userHasVoted && (
                            <div className="absolute inset-y-0 left-0 bg-indigo-600/5 transition-all" style={{ width: `${percent}%` }}></div>
                          )}
                          <div className="relative flex justify-between font-black uppercase text-xs">
                            <span>{opt.text}</span>
                            {userHasVoted && <span>{percent}%</span>}
                          </div>
                        </button>

                        {userHasVoted && optionVotes.length > 0 && (
                          <div className="flex flex-wrap gap-2 px-2">
                            {optionVotes.map((v: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-1.5 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
                                <span className="text-[8px] font-black uppercase text-gray-500">
                                  {v.is_anonymous ? 'Anonymous Voter' : (v.profiles?.full_name || 'Voter')} • Dist {v.profiles?.district || '?'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="pt-8 border-t border-gray-100">
                   <h3 className="font-black uppercase text-gray-400 text-[10px] mb-6">Discussion</h3>
                   <div className="space-y-4">
                     {(selectedPoll.poll_comments || []).map((c: any) => (
                       <div key={c.id} className="bg-gray-50 p-4 rounded-xl">
                          <p className="text-[9px] font-black uppercase text-indigo-600">{c.profiles?.full_name} • Dist {c.profiles?.district}</p>
                          <p className="text-sm text-gray-800">{c.content}</p>
                       </div>
                     ))}
                   </div>
                   <form onSubmit={(e) => handlePostComment(e, selectedPoll.id)} className="mt-6 flex gap-3">
                     <input name="content" required placeholder="Add a comment..." className="flex-grow p-4 bg-gray-100 rounded-xl text-sm" />
                     <button type="submit" className="bg-indigo-600 text-white px-6 rounded-xl font-black uppercase text-[10px]">Send</button>
                   </form>
                </div>
             </div>
          </div>
        )}

        {currentPage === 'suggestions' && (
          <div className="max-w-4xl mx-auto space-y-12">
             <div className="bg-white p-10 rounded-[3rem] shadow-xl">
               <h2 className="text-3xl font-black uppercase mb-6">Suggestion Box</h2>
               <form onSubmit={async (e) => {
                 e.preventDefault();
                 const form = e.target as HTMLFormElement;
                 const fd = new FormData(form);
                 const { error } = await supabase!.from('suggestions').insert({
                   content: fd.get('content'),
                   is_public: fd.get('isPublic') === 'on',
                   user_id: user?.id
                 });
                 if (!error) { showToast("Suggestion received!"); form.reset(); fetchSuggestions(); }
               }} className="space-y-6">
                 <textarea name="content" required placeholder="Share your idea..." className="w-full h-40 bg-gray-50 rounded-3xl p-6 outline-none" />
                 <div className="flex justify-between items-center">
                   <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" name="isPublic" defaultChecked /> <span className="text-[10px] font-black uppercase text-gray-400">Make Public</span></label>
                   <button className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs">Submit</button>
                 </div>
               </form>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {suggestions.filter(s => s.is_public).map(s => (
                 <div key={s.id} className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
                   <p className="text-gray-800 font-bold mb-4 italic text-sm">"{s.content}"</p>
                   <span className="text-[9px] font-black uppercase text-indigo-400">{s.profiles?.full_name || 'Anonymous Voter'}</span>
                 </div>
               ))}
             </div>
          </div>
        )}

        {currentPage === 'login' && (
          <div className="max-w-md mx-auto bg-white p-10 rounded-[3rem] shadow-2xl">
            <h2 className="text-3xl font-black text-center mb-8 uppercase text-indigo-600">Sign In</h2>
            <form className="space-y-4" onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const { error } = await supabase!.auth.signInWithPassword({
                email: fd.get('email') as string,
                password: fd.get('password') as string
              });
              if (error) showToast(error.message, 'error'); else setCurrentPage('home');
            }}>
              <input name="email" type="email" required placeholder="Email" className="w-full p-4 bg-gray-50 rounded-xl font-bold" />
              <input name="password" type="password" required placeholder="Password" className="w-full p-4 bg-gray-50 rounded-xl font-bold" />
              <button className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs">Login</button>
            </form>
          </div>
        )}

        {currentPage === 'dashboards' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {DASHBOARDS.filter(d => d.category === selectedCategory).map(dash => (
              <div key={dash.id} onClick={() => setActiveDashboard(dash)} className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 hover:shadow-xl transition-all cursor-pointer flex flex-col group">
                <h4 className="text-xl font-black text-gray-800 uppercase mb-2">{dash.title}</h4>
                <p className="text-gray-400 text-xs mb-6">{dash.description}</p>
                <div className="mt-auto pt-6 border-t border-gray-50 flex justify-between items-center">
                  <span className="text-indigo-600 text-[10px] font-black uppercase">Open Analysis</span>
                  <i className="fa-solid fa-arrow-right text-indigo-200 group-hover:translate-x-2 transition-transform"></i>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
