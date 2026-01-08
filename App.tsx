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
  
  // Feature Data
  const [polls, setPolls] = useState<any[]>([]);
  const [selectedPoll, setSelectedPoll] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [replyTo, setReplyTo] = useState<string | null>(null);

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

  // Update Selected Poll whenever the main polls list changes
  useEffect(() => {
    if (selectedPoll) {
      const updated = polls.find(p => p.id === selectedPoll.id);
      if (updated) setSelectedPoll(updated);
    }
  }, [polls]);

  const fetchProfile = async (userId: string) => {
    if (!supabase) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) setProfile(data);
  };

  const handleLogout = async () => {
    if (!supabase) return;
    try {
      await supabase.auth.signOut();
      setUser(null); setProfile(null); setCurrentPage('home');
      showToast("Logged out");
    } catch {
      setUser(null); setProfile(null); setCurrentPage('home');
      showToast("Session cleared locally");
    }
  };

  const fetchPolls = async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('polls')
        .select(`
          *,
          poll_options(*),
          poll_votes(*),
          poll_comments(*, 
            profiles(full_name, district),
            comment_reactions(*)
          )
        `)
        .order('created_at', { ascending: false });

      if (!error) {
        setPolls(data || []);
      }
    } catch (err) { 
      console.error("Polls fetch error:", err);
    }
  };

  const fetchSuggestions = async () => {
    if (!supabase) return;
    const { data } = await supabase.from('suggestions').select('*, profiles(full_name, district)').order('created_at', { ascending: false });
    setSuggestions(data || []);
  };

  const fetchUsers = async () => {
    if (!supabase) return;
    const { data } = await supabase.from('profiles').select('*').order('full_name', { ascending: true });
    setAllUsers(data || []);
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handlePostComment = async (e: React.FormEvent<HTMLFormElement>, pollId: string, parentId: string | null = null) => {
    e.preventDefault();
    if (!user) return setCurrentPage('login');
    if (!supabase) return;
    const fd = new FormData(e.currentTarget);
    const content = fd.get('content') as string;
    
    // Reset UI immediately
    setReplyTo(null);
    (e.target as HTMLFormElement).reset();

    const { error } = await supabase.from('poll_comments').insert({ 
      poll_id: pollId, 
      user_id: user.id, 
      content,
      parent_id: parentId
    });
    
    if (error) showToast("Error: " + error.message, "error");
    else fetchPolls(); // Refresh to show the new comment
  };

  const handleReaction = async (commentId: string, type: 'like' | 'dislike') => {
    if (!user) return setCurrentPage('login');
    if (!supabase) return;
    
    // Optimistic Update: Manually adjust the local count so it feels instant
    const updatedPolls = [...polls].map(p => ({
      ...p,
      poll_comments: p.poll_comments?.map((c: any) => {
        if (c.id === commentId) {
          const reactions = c.comment_reactions || [];
          const filtered = reactions.filter((r: any) => r.user_id !== user.id);
          return { ...c, comment_reactions: [...filtered, { user_id: user.id, reaction_type: type }] };
        }
        return c;
      })
    }));
    setPolls(updatedPolls);

    const { error } = await supabase.from('comment_reactions').upsert(
      { comment_id: commentId, user_id: user.id, reaction_type: type },
      { onConflict: 'comment_id,user_id' }
    );
    if (error) {
      showToast("Reaction failed", "error");
      fetchPolls(); // Rollback if error
    }
  };

  const handleVote = async (pollId: string, optionId: string) => {
    if (!user) return setCurrentPage('login');
    if (!supabase) return;

    // Optimistic Update: Mark the vote locally immediately
    const updatedPolls = polls.map(p => {
      if (p.id === pollId) {
        const votes = p.poll_votes || [];
        const filtered = votes.filter((v: any) => v.user_id !== user.id);
        return { ...p, poll_votes: [...filtered, { poll_id: pollId, option_id: optionId, user_id: user.id }] };
      }
      return p;
    });
    setPolls(updatedPolls);

    const { error } = await supabase.from('poll_votes').upsert({ poll_id: pollId, option_id: optionId, user_id: user.id }, { onConflict: 'poll_id,user_id' });
    if (error) {
      showToast(error.message, "error");
      fetchPolls();
    }
  };

  const renderComments = (pollComments: any[], pollId: string, parentId: string | null = null, depth = 0) => {
    return (pollComments || [])
      .filter(c => c.parent_id === parentId && !c.is_hidden)
      .map(comment => {
        const reactions = comment.comment_reactions || [];
        const likes = reactions.filter((r: any) => r.reaction_type === 'like').length;
        const dislikes = reactions.filter((r: any) => r.reaction_type === 'dislike').length;
        const userReaction = reactions.find((r: any) => r.user_id === user?.id)?.reaction_type;
        
        return (
          <div key={comment.id} className={`${depth > 0 ? 'ml-6 mt-2 border-l-2 border-gray-100 pl-4' : 'bg-gray-50 p-4 rounded-2xl mb-4'}`}>
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase text-indigo-600 mb-1">
                {comment.profiles?.full_name || 'Verified Voter'} • Dist {comment.profiles?.district || '?'}
              </span>
              <p className="text-gray-800 text-sm font-medium leading-relaxed">{comment.content}</p>
              <div className="flex gap-4 mt-3 text-[9px] font-black uppercase tracking-tighter">
                <button onClick={() => handleReaction(comment.id, 'like')} className={`${userReaction === 'like' ? 'text-indigo-600' : 'text-gray-400'} hover:text-indigo-600 transition-colors flex items-center gap-1`}>
                  <i className={`fa-${userReaction === 'like' ? 'solid' : 'regular'} fa-thumbs-up`}></i> {likes} Like
                </button>
                <button onClick={() => handleReaction(comment.id, 'dislike')} className={`${userReaction === 'dislike' ? 'text-red-600' : 'text-gray-400'} hover:text-red-600 transition-colors flex items-center gap-1`}>
                  <i className={`fa-${userReaction === 'dislike' ? 'solid' : 'regular'} fa-thumbs-down`}></i> {dislikes} Dislike
                </button>
                <button onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)} className="text-gray-400 hover:text-indigo-600">Reply</button>
              </div>
              
              {replyTo === comment.id && (
                <form onSubmit={(e) => handlePostComment(e, pollId, comment.id)} className="mt-3 flex gap-2">
                  <input name="content" autoFocus placeholder="Write a reply..." className="flex-grow p-3 bg-white rounded-xl text-xs outline-none border border-gray-100 shadow-sm" />
                  <button type="submit" className="bg-indigo-600 text-white px-4 py-1 rounded-xl text-[9px] font-black uppercase">Send</button>
                </form>
              )}
            </div>
            {renderComments(pollComments, pollId, comment.id, depth + 1)}
          </div>
        );
      });
  };

  const adminRequest = async (action: string, payload: any) => {
    if (!supabase) throw new Error("Database not ready");
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/.netlify/functions/admin-actions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, payload })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Action failed");
    return data;
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
      
      {/* IMPROVED NAVIGATION FOR MOBILE */}
      <nav className="bg-white shadow-sm px-4 py-3 z-50 shrink-0 border-b border-gray-100">
        <div className="container mx-auto flex flex-col md:flex-row gap-4 md:items-center justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center cursor-pointer" onClick={() => { setCurrentPage('home'); setSelectedPoll(null); }}>
              <i className="fa-solid fa-landmark text-indigo-600 text-xl mr-2"></i>
              <span className="text-lg font-bold text-gray-900 tracking-tight uppercase">Finance Hub</span>
            </div>
            {/* Mobile-only logout button if needed */}
            {!user && (
              <button onClick={() => setCurrentPage('login')} className="md:hidden bg-indigo-600 text-white px-3 py-1 rounded-lg font-black text-[9px] uppercase">Sign In</button>
            )}
          </div>

          <div className="flex flex-wrap gap-4 md:gap-8 items-center justify-center md:justify-end">
            <button onClick={() => { setCurrentPage('polls'); setSelectedPoll(null); fetchPolls(); }} className={`text-[9px] font-black uppercase tracking-widest ${currentPage === 'polls' ? 'text-indigo-600' : 'text-gray-400'}`}>Polls</button>
            <button onClick={() => { setCurrentPage('suggestions'); setSelectedPoll(null); }} className={`text-[9px] font-black uppercase tracking-widest ${currentPage === 'suggestions' ? 'text-indigo-600' : 'text-gray-400'}`}>Suggestions</button>
            {profile?.is_admin && <button onClick={() => { setCurrentPage('admin'); fetchUsers(); }} className="text-[9px] font-black uppercase tracking-widest text-red-500">Admin</button>}
            
            {user ? (
              <div className="flex items-center gap-3 border-l pl-4 border-gray-100">
                <span className="hidden sm:inline text-[9px] font-black uppercase text-indigo-600 truncate max-w-[100px]">{profile?.full_name}</span>
                <button onClick={handleLogout} className="text-[9px] font-black uppercase text-red-500">Logout</button>
              </div>
            ) : (
              <button onClick={() => setCurrentPage('login')} className="hidden md:block bg-indigo-600 text-white px-4 py-2 rounded-lg font-black text-[10px] uppercase">Sign In</button>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-grow overflow-y-auto container mx-auto px-4 py-6 md:py-8">
        {currentPage === 'home' && (
          <div className="max-w-4xl mx-auto space-y-12 text-center py-10">
             <header className="space-y-4">
               <h1 className="text-4xl md:text-5xl font-black text-gray-900 uppercase tracking-tighter">Moore County Transparency</h1>
               <p className="text-gray-500 text-lg md:text-xl font-medium px-4">Verified voter records & local budget oversight.</p>
             </header>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {CATEGORIES.map(cat => (
                 <div key={cat.id} onClick={() => { setSelectedCategory(cat.id); setCurrentPage('dashboards'); }} className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-gray-100 hover:shadow-xl transition-all cursor-pointer flex items-center gap-6 group">
                   <div className={`${cat.color} w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center text-white text-xl md:text-2xl shadow-lg`}><i className={`fa-solid ${cat.icon}`}></i></div>
                   <div className="text-left"><h3 className="text-lg md:text-xl font-black text-gray-800 uppercase">{cat.label}</h3><p className="text-gray-400 text-xs">Review logs.</p></div>
                 </div>
               ))}
             </div>
          </div>
        )}

        {currentPage === 'polls' && !selectedPoll && (
          <div className="max-w-4xl mx-auto space-y-8">
            <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter">Community Polls</h2>
            <div className="grid grid-cols-1 gap-4 md:gap-6">
              {polls.map(poll => (
                <div key={poll.id} onClick={() => setSelectedPoll(poll)} className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-gray-100 hover:shadow-lg transition-all cursor-pointer flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="space-y-1">
                    <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight">{poll.title}</h3>
                    <p className="text-gray-400 font-bold text-[9px] uppercase">{poll.poll_votes?.length || 0} Votes Recorded</p>
                  </div>
                  <button className="w-full sm:w-auto bg-indigo-600 text-white px-6 py-3 rounded-xl font-black uppercase text-[10px]">Vote & Discuss</button>
                </div>
              ))}
              {polls.length === 0 && (
                <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-gray-100">
                  <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">No active polls found.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {currentPage === 'polls' && selectedPoll && (
          <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 pb-20">
             <button onClick={() => setSelectedPoll(null)} className="text-[10px] font-black uppercase text-gray-400 flex items-center gap-2"><i className="fa-solid fa-arrow-left"></i> Back</button>
             <div className="bg-white p-6 md:p-10 rounded-[2rem] shadow-xl border border-gray-100 space-y-6 md:space-y-8">
                <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter leading-none">{selectedPoll.title}</h2>
                <div className="space-y-3 md:space-y-4">
                  {selectedPoll.poll_options?.map((opt: any) => {
                    const votesList = selectedPoll.poll_votes || [];
                    const totalVotes = votesList.length;
                    const votes = votesList.filter((v: any) => v.option_id === opt.id).length;
                    const hasVotedThis = votesList.some((v: any) => v.user_id === user?.id && v.option_id === opt.id);
                    const percent = totalVotes === 0 ? 0 : Math.round((votes / totalVotes) * 100);
                    
                    return (
                      <button 
                        key={opt.id} 
                        onClick={() => handleVote(selectedPoll.id, opt.id)} 
                        className={`w-full text-left p-5 md:p-6 rounded-2xl border-2 relative overflow-hidden transition-all ${hasVotedThis ? 'border-indigo-600' : 'border-gray-50'}`}
                      >
                        <div className="absolute inset-y-0 left-0 bg-indigo-600/5 transition-all duration-500" style={{ width: `${percent}%` }}></div>
                        <div className="relative flex justify-between font-black uppercase text-[10px] md:text-xs">
                          <span className="flex items-center gap-2">
                            {hasVotedThis && <i className="fa-solid fa-circle-check text-indigo-600"></i>}
                            {opt.text}
                          </span>
                          <span className="text-indigo-400">{percent}%</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="pt-8 border-t border-gray-50">
                   <h3 className="font-black uppercase text-gray-400 text-[10px] mb-6 tracking-widest">Verified Voter Discussion</h3>
                   <div className="space-y-4">
                     {renderComments(selectedPoll.poll_comments || [], selectedPoll.id)}
                   </div>
                   <form onSubmit={(e) => handlePostComment(e, selectedPoll.id)} className="mt-8 flex flex-col sm:flex-row gap-3">
                     <input name="content" required placeholder="Add to the conversation..." className="flex-grow p-4 bg-gray-50 rounded-xl font-bold outline-none text-sm border border-transparent focus:border-indigo-100 transition-colors" />
                     <button type="submit" className="bg-indigo-600 text-white px-8 py-4 rounded-xl font-black uppercase text-[10px]">Post</button>
                   </form>
                </div>
             </div>
          </div>
        )}

        {currentPage === 'suggestions' && (
          <div className="max-w-4xl mx-auto space-y-12">
             <div className="bg-white p-6 md:p-10 rounded-[2rem] shadow-xl border-2 border-indigo-50">
               <h2 className="text-2xl md:text-3xl font-black uppercase text-indigo-600 mb-6 leading-none">Suggestion Box</h2>
               <form onSubmit={async (e) => {
                 e.preventDefault();
                 if (!supabase) return;
                 const fd = new FormData(e.currentTarget);
                 const { error } = await supabase.from('suggestions').insert({ content: fd.get('content'), is_public: fd.get('isPublic') === 'on', user_id: user?.id });
                 if (!error) { showToast("Thank you!"); fetchSuggestions(); (e.target as any).reset(); }
               }} className="space-y-6">
                 <textarea name="content" required placeholder="Share an idea with local officials..." className="w-full h-32 md:h-40 bg-gray-50 rounded-3xl p-6 outline-none font-bold text-sm md:text-base border border-transparent focus:border-indigo-100" />
                 <div className="flex justify-between items-center">
                   <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" name="isPublic" defaultChecked /> <span className="text-[10px] font-black uppercase text-gray-400">Public visibility</span></label>
                   <button type="submit" className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs">Submit</button>
                 </div>
               </form>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
               {suggestions.filter(s => s.is_public).map(s => (
                 <div key={s.id} className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-gray-100">
                   <p className="text-gray-800 font-bold mb-4 italic text-sm">"{s.content}"</p>
                   <span className="text-[9px] font-black uppercase text-indigo-400">{s.profiles?.full_name || 'Voter'} • Dist {s.profiles?.district || '?'}</span>
                 </div>
               ))}
             </div>
          </div>
        )}

        {/* ADMIN AND LOGIN SECTIONS REMAINED LARGELY UNTOUCHED BUT INCLUDED FOR FULL CONTENT */}
        {currentPage === 'admin' && profile?.is_admin && (
           <div className="max-w-5xl mx-auto space-y-12">
             <h2 className="text-4xl md:text-5xl font-black uppercase text-red-600 tracking-tighter">Admin Control</h2>
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-[3rem] shadow-xl border-2 border-red-50">
                  <h3 className="text-xl font-black uppercase mb-8">Deploy New Poll</h3>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    const options = (fd.get('options') as string).split(',').map(s => s.trim());
                    try {
                      await adminRequest('CREATE_POLL', {
                        pollData: { title: fd.get('title'), description: fd.get('description'), closed_at: fd.get('closedAt'), is_anonymous_voting: fd.get('isAnon') === 'on' },
                        options
                      });
                      showToast("Poll Launched!");
                      fetchPolls();
                      (e.target as HTMLFormElement).reset();
                    } catch (err: any) { showToast(err.message, 'error'); }
                  }} className="space-y-4">
                    <input name="title" required placeholder="Question Title" className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm" />
                    <textarea name="description" placeholder="Details..." className="w-full p-4 bg-gray-50 rounded-xl font-bold h-24 text-sm" />
                    <input name="options" required placeholder="Options (comma separated)" className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm" />
                    <input type="datetime-local" name="closedAt" required className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm" />
                    <button type="submit" className="w-full py-5 bg-red-600 text-white rounded-2xl font-black uppercase shadow-xl text-xs">Launch Poll</button>
                  </form>
                </div>
                <div className="bg-gray-900 p-8 rounded-[3rem] text-white shadow-2xl">
                  <h3 className="text-xl font-black uppercase mb-6 text-red-500">Registry Moderation</h3>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {allUsers.map(u => (
                      <div key={u.id} className="flex justify-between items-center p-4 rounded-2xl bg-white/5 border border-white/10">
                        <div className="truncate pr-4">
                          <p className="text-[10px] font-black uppercase truncate">{u.full_name}</p>
                          <p className="text-[8px] text-gray-500 font-black uppercase">Dist {u.district}</p>
                        </div>
                        <button onClick={async () => {
                          await adminRequest('BAN_USER', { targetUserId: u.id, isBanned: !u.is_banned });
                          fetchUsers();
                        }} className={`shrink-0 px-4 py-1 rounded-full text-[8px] font-black uppercase ${u.is_banned ? 'bg-red-600' : 'border border-white/20'}`}>
                          {u.is_banned ? 'Unban' : 'Ban'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
             </div>
           </div>
        )}

        {currentPage === 'dashboards' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {DASHBOARDS.filter(d => d.category === selectedCategory).map(dash => (
              <div key={dash.id} onClick={() => setActiveDashboard(dash)} className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 hover:shadow-xl transition-all cursor-pointer flex flex-col group">
                <h4 className="text-xl font-black text-gray-800 uppercase mb-2">{dash.title}</h4>
                <p className="text-gray-400 text-xs mb-6 leading-relaxed">{dash.description}</p>
                <div className="mt-auto pt-6 border-t border-gray-50 flex justify-between items-center">
                  <span className="text-indigo-600 text-[10px] font-black uppercase">Open Analysis</span>
                  <i className="fa-solid fa-arrow-right text-indigo-200 group-hover:translate-x-2 transition-transform"></i>
                </div>
              </div>
            ))}
          </div>
        )}

        {currentPage === 'login' && (
          <div className="max-w-md mx-auto bg-white p-8 md:p-10 rounded-[3rem] shadow-2xl">
            <h2 className="text-3xl font-black text-center mb-8 uppercase text-indigo-600">Sign In</h2>
            <form className="space-y-4" onSubmit={async (e) => {
              e.preventDefault();
              if (!supabase) return;
              const fd = new FormData(e.currentTarget);
              const { error } = await supabase.auth.signInWithPassword({ email: fd.get('email') as string, password: fd.get('password') as string });
              if (error) showToast(error.message, 'error'); else setCurrentPage('home');
            }}>
              <input name="email" type="email" required placeholder="EMAIL" className="w-full p-4 bg-gray-50 rounded-xl font-bold outline-none text-sm" />
              <input name="password" type="password" required placeholder="PASSWORD" className="w-full p-4 bg-gray-50 rounded-xl font-bold outline-none text-sm" />
              <button className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase shadow-xl text-xs">LOGIN</button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
