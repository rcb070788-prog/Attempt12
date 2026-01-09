import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { CATEGORIES, DASHBOARDS, OFFICIALS } from './constants.ts';
import { DashboardConfig } from './types.ts';

// --- CONFIGURATION ---
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null;

// --- UTILITIES ---
const renderTextWithLinks = (text: string) => {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline break-all" onClick={(e) => e.stopPropagation()}>
          {part} <i className="fa-solid fa-external-link text-[8px] ml-1"></i>
        </a>
      );
    }
    return part;
  });
};

const UserAvatar = ({ url, isAnonymous, size = "md" }: { url?: string, isAnonymous?: boolean, size?: "sm" | "md" | "lg" }) => {
  const dims = size === "sm" ? "w-6 h-6 text-[8px]" : size === "lg" ? "w-16 h-16 text-xl" : "w-10 h-10 text-xs";
  if (isAnonymous) {
    return (
      <div className={`${dims} bg-gray-200 text-gray-500 rounded-full flex items-center justify-center border-2 border-white shadow-sm shrink-0`}>
        <i className="fa-solid fa-user-shield"></i>
      </div>
    );
  }
  return (
    <div className={`${dims} bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center border-2 border-white shadow-sm overflow-hidden shrink-0`}>
      {url ? <img src={url} alt="Avatar" className="w-full h-full object-cover" /> : <i className="fa-solid fa-user"></i>}
    </div>
  );
};

const Toast = ({ message, type }: { message: string, type: 'success' | 'error' }) => (
  <div className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-xl text-white z-[300] transition-all transform animate-bounce ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
    <i className={`fa-solid ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'} mr-2`}></i>
    {message}
  </div>
);

export default function App() {
  // --- CORE STATE ---
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeDashboard, setActiveDashboard] = useState<DashboardConfig | null>(null);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  
  // --- FEATURE DATA ---
  const [polls, setPolls] = useState<any[]>([]);
  const [selectedPoll, setSelectedPoll] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [boardMessages, setBoardMessages] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  
  // --- UI STATE ---
  const [isVerifying, setIsVerifying] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [selectedOfficials, setSelectedOfficials] = useState<string[]>([]);
  const [isOfficialDropdownOpen, setIsOfficialDropdownOpen] = useState(false);
  const [pendingVote, setPendingVote] = useState<{pollId: string, optionId: string, optionText: string, isAnonymous: boolean} | null>(null);
  const [registryModal, setRegistryModal] = useState<{optionText: string, voters: any[]} | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // --- INITIALIZATION ---
  useEffect(() => {
    if (!supabase) return;
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
    };
    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else { setProfile(null); setCurrentPage('home'); setSelectedPoll(null); }
    });

    fetchAllData();
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (selectedPoll) {
      const updated = polls.find(p => p.id === selectedPoll.id);
      if (updated) setSelectedPoll(updated);
    }
  }, [polls]);

  // --- DATA FETCHING ---
  const fetchProfile = async (userId: string) => {
    if (!supabase) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (data) setProfile(data);
  };

  const fetchPolls = async () => {
    if (!supabase) return;
    const { data } = await supabase.from('polls').select(`*, poll_options(*), poll_votes(*, profiles(full_name, district, avatar_url)), poll_comments(*, profiles(full_name, district, avatar_url), comment_reactions(*))`).order('created_at', { ascending: false });
    if (data) setPolls(data);
  };

  const fetchSuggestions = async () => {
    if (!supabase) return;
    const { data } = await supabase.from('suggestions').select('*, profiles(full_name, district)').order('created_at', { ascending: false });
    setSuggestions(data || []);
  };

  const fetchBoardMessages = async () => {
    if (!supabase) return;
    const { data } = await supabase.from('board_messages').select('*, profiles(full_name, district)').order('created_at', { ascending: false });
    setBoardMessages(data || []);
  };

  const fetchUsers = async () => {
    if (!supabase) return;
    const { data } = await supabase.from('profiles').select('*').order('full_name', { ascending: true });
    setAllUsers(data || []);
  };

  const fetchAllData = () => { fetchPolls(); fetchSuggestions(); fetchBoardMessages(); };
  const showToast = (message: string, type: 'success' | 'error' = 'success') => { setToast({ message, type }); setTimeout(() => setToast(null), 3000); };

  // --- HANDLERS ---
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !supabase) return;
    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const { error: updateError } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
      if (updateError) throw updateError;
      fetchProfile(user.id);
      showToast("Photo Updated");
    } catch (err: any) { showToast(err.message, "error"); } finally { setIsUploading(false); }
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsVerifying(true);
    const fd = new FormData(e.currentTarget);
    try {
      const verifyRes = await fetch('/.netlify/functions/verify-voter', { method: 'POST', body: JSON.stringify({ lastName: fd.get('lastName'), voterId: fd.get('voterId'), dob: fd.get('dob'), address: fd.get('address') }) });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.error);
      const { error } = await supabase!.auth.signUp({ email: fd.get('email') as string, password: fd.get('password') as string, options: { data: { full_name: verifyData.fullName, district: verifyData.district, voter_id: fd.get('voterId') } } });
      if (error) throw error;
      showToast("Verification Successful! Check email.");
      setCurrentPage('login');
    } catch (err: any) { showToast(err.message, "error"); } finally { setIsVerifying(false); }
  };

  const handleReaction = async (commentId: string, type: 'like' | 'dislike') => {
    if (!user || !supabase) return setCurrentPage('login');
    const { error } = await supabase.from('comment_reactions').upsert({ comment_id: commentId, user_id: user.id, reaction_type: type }, { onConflict: 'comment_id,user_id' });
    if (error) showToast("Reaction failed", "error"); else fetchPolls();
  };

  const confirmVote = async () => {
    if (!pendingVote || !supabase) return;
    const { error } = await supabase.from('poll_votes').upsert({ poll_id: pendingVote.pollId, option_id: pendingVote.optionId, user_id: user.id, is_anonymous: Boolean(pendingVote.isAnonymous) }, { onConflict: 'poll_id,user_id' });
    if (error) showToast(error.message, 'error'); else { showToast("Vote recorded"); fetchPolls(); }
    setPendingVote(null);
  };

  const filteredMessages = useMemo(() => {
    if (!searchQuery) return boardMessages;
    const q = searchQuery.toLowerCase();
    return boardMessages.filter(m => m.profiles?.full_name?.toLowerCase().includes(q) || m.recipient_names.toLowerCase().includes(q) || m.content.toLowerCase().includes(q));
  }, [boardMessages, searchQuery]);

  // --- RENDER HELPERS ---
  const renderComments = (pollComments: any[], pollId: string, parentId: string | null = null, depth = 0) => {
    return (pollComments || []).filter(c => c.parent_id === parentId && !c.is_hidden).map(comment => {
      const reactions = comment.comment_reactions || [];
      const likes = reactions.filter((r: any) => r.reaction_type === 'like').length;
      const dislikes = reactions.filter((r: any) => r.reaction_type === 'dislike').length;
      const userReaction = reactions.find((r: any) => r.user_id === user?.id)?.reaction_type;
      return (
        <div key={comment.id} className={`${depth > 0 ? 'ml-6 mt-2 border-l-2 border-gray-100 pl-4' : 'bg-gray-50 p-4 rounded-2xl mb-4'}`}>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
               <UserAvatar url={comment.profiles?.avatar_url} size="sm" />
               <span className="text-[9px] font-black uppercase text-indigo-600">
                {comment.profiles?.full_name || 'Verified Voter'} • Dist {comment.profiles?.district || '?'}
               </span>
            </div>
            <div className="text-gray-800 text-sm leading-relaxed">{renderTextWithLinks(comment.content)}</div>
            <div className="flex gap-4 mt-3 text-[9px] font-black uppercase tracking-widest">
              <button onClick={() => handleReaction(comment.id, 'like')} className={userReaction === 'like' ? 'text-indigo-600' : 'text-gray-400'}>
                <i className={`fa-${userReaction === 'like' ? 'solid' : 'regular'} fa-thumbs-up`}></i> {likes}
              </button>
              <button onClick={() => handleReaction(comment.id, 'dislike')} className={userReaction === 'dislike' ? 'text-red-500' : 'text-gray-400'}>
                <i className={`fa-${userReaction === 'dislike' ? 'solid' : 'regular'} fa-thumbs-down`}></i> {dislikes}
              </button>
              <button onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)} className="text-gray-400">Reply</button>
            </div>
            {replyTo === comment.id && (
              <form onSubmit={async (e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); await supabase?.from('poll_comments').insert({ poll_id: pollId, user_id: user.id, content: fd.get('content'), parent_id: comment.id }); setReplyTo(null); fetchPolls(); }} className="mt-3 flex gap-2">
                <input name="content" autoFocus placeholder="Write a reply..." className="flex-grow p-3 bg-white rounded-xl text-xs outline-none border" />
                <button type="submit" className="bg-indigo-600 text-white px-4 py-1 rounded-xl text-[9px] font-black uppercase">Send</button>
              </form>
            )}
          </div>
          {renderComments(pollComments, pollId, comment.id, depth + 1)}
        </div>
      );
    });
  };

  if (activeDashboard) {
    return (
      <div className="fixed inset-0 z-[100] bg-white flex flex-col overflow-hidden">
        <div className="p-4 flex justify-end bg-white border-b border-gray-100"><button onClick={() => setActiveDashboard(null)} className="bg-gray-900 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase">Close Report</button></div>
        <iframe src={activeDashboard.folderPath} className="w-full h-full border-0" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col font-sans overflow-hidden relative">
      {toast && <Toast message={toast.message} type={toast.type} />}

      {/* --- VOTER REGISTRY MODAL --- */}
      {registryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[250] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center">
              <div><h3 className="text-xl font-black uppercase">Voter Registry</h3><p className="text-[10px] font-bold text-indigo-600 uppercase">{registryModal.optionText}</p></div>
              <button onClick={() => setRegistryModal(null)} className="text-gray-300 hover:text-red-500"><i className="fa-solid fa-circle-xmark text-2xl"></i></button>
            </div>
            <div className="p-4 overflow-y-auto space-y-2">
              {registryModal.voters.map((v, i) => (
                <div key={i} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-2xl transition-colors">
                  <UserAvatar url={v.profiles?.avatar_url} isAnonymous={v.is_anonymous} size="md" />
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-gray-800">{v.is_anonymous === true ? "Verified Voter" : v.profiles?.full_name}</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase">District {v.profiles?.district}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- PENDING VOTE MODAL --- */}
      {pendingVote && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 space-y-6">
            <h3 className="text-xl font-black uppercase text-center">Confirm Your Vote</h3>
            <p className="text-center text-gray-500 text-sm">Voting for: <span className="text-indigo-600 font-bold">"{pendingVote.optionText}"</span></p>
            <div className="bg-gray-50 p-6 rounded-2xl flex items-center justify-between">
               <span className="text-[10px] font-black uppercase">Vote Anonymously?</span>
               <button onClick={() => setPendingVote({...pendingVote, isAnonymous: !pendingVote.isAnonymous})} className={`w-12 h-6 rounded-full relative ${pendingVote.isAnonymous ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                 <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${pendingVote.isAnonymous ? 'left-7' : 'left-1'}`}></div>
               </button>
            </div>
            <button onClick={confirmVote} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs">Submit Vote</button>
            <button onClick={() => setPendingVote(null)} className="w-full text-gray-400 font-black uppercase text-[10px]">Cancel</button>
          </div>
        </div>
      )}

      <nav className="bg-white shadow-sm px-4 py-3 z-50 shrink-0 border-b border-gray-100 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <div className="flex items-center cursor-pointer" onClick={() => { setCurrentPage('home'); setSelectedCategory(null); }}>
            <i className="fa-solid fa-landmark text-indigo-600 text-xl mr-2"></i>
            <span className="text-lg font-bold uppercase tracking-tighter text-gray-900">Finance Hub</span>
          </div>
        </div>
        <button onClick={() => setIsMenuOpen(true)} className="bg-gray-100 p-2.5 rounded-xl text-gray-600"><i className="fa-solid fa-bars-staggered"></i></button>
      </nav>

      {isMenuOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)}></div>
          <div className="relative w-80 bg-white h-full shadow-2xl p-8 flex flex-col">
            <button onClick={() => setIsMenuOpen(false)} className="self-end text-gray-300 hover:text-red-500 mb-8 transition-colors"><i className="fa-solid fa-xmark text-2xl"></i></button>
            {user && (
               <div className="relative mb-8 flex flex-col items-center text-center">
                  <div className="relative">
                    <UserAvatar url={profile?.avatar_url} size="lg" />
                    <label className="absolute bottom-0 right-0 bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center cursor-pointer border-2 border-white shadow-lg">
                      <i className={`fa-solid ${isUploading ? 'fa-spinner animate-spin' : 'fa-camera'} text-[10px]`}></i>
                      <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={isUploading} />
                    </label>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm font-black text-gray-900 uppercase">{profile?.full_name}</p>
                    <p className="text-[9px] font-black uppercase text-gray-400">District {profile?.district} Voter</p>
                  </div>
               </div>
            )}
            <div className="space-y-4">
              <button onClick={() => { setCurrentPage('home'); setSelectedCategory(null); setIsMenuOpen(false); }} className="text-xl font-black uppercase block">Home</button>
              <button onClick={() => { setCurrentPage('polls'); setSelectedPoll(null); setIsMenuOpen(false); fetchPolls(); }} className="text-xl font-black uppercase block">Polls</button>
              <button onClick={() => { setCurrentPage('board'); setIsMenuOpen(false); fetchBoardMessages(); }} className="text-xl font-black uppercase block">Let's Talk</button>
              <button onClick={() => { setCurrentPage('suggestions'); setIsMenuOpen(false); fetchSuggestions(); }} className="text-xl font-black uppercase block">Suggestions</button>
              {profile?.is_admin && <button onClick={() => { setCurrentPage('admin'); setIsMenuOpen(false); fetchUsers(); }} className="text-xl font-black uppercase text-red-600 block">Admin Center</button>}
            </div>
          </div>
        </div>
      )}

      <main className="flex-grow overflow-y-auto container mx-auto px-4 py-8 custom-scrollbar">
        {currentPage === 'home' && !selectedCategory && (
          <div className="max-w-4xl mx-auto space-y-12 py-10">
            <h1 className="text-4xl md:text-6xl font-black text-gray-900 uppercase tracking-tighter text-center">Oops, Transparency</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {CATEGORIES.map(cat => (
                 <div key={cat.id} onClick={() => setSelectedCategory(cat.id)} className="bg-white p-8 rounded-[2.5rem] shadow-sm border hover:shadow-xl transition-all cursor-pointer flex items-center gap-6">
                   <div className={`${cat.color} w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl`}><i className={`fa-solid ${cat.icon}`}></i></div>
                   <div><h3 className="text-xl font-black uppercase">{cat.label}</h3><p className="text-gray-400 text-xs font-bold uppercase">Review Logs</p></div>
                 </div>
               ))}
            </div>
          </div>
        )}

        {currentPage === 'polls' && !selectedPoll && (
          <div className="max-w-4xl mx-auto space-y-8">
            <h2 className="text-4xl font-black uppercase">Community Polls</h2>
            <div className="grid grid-cols-1 gap-6">
              {polls.map(poll => {
                const voted = poll.poll_votes?.some((v: any) => v.user_id === user?.id);
                return (
                  <div key={poll.id} onClick={() => setSelectedPoll(poll)} className="bg-white p-8 rounded-[2.5rem] shadow-sm border hover:shadow-lg transition-all cursor-pointer flex flex-col sm:flex-row justify-between items-center gap-6">
                    <div><h3 className="text-2xl font-black uppercase">{poll.title}</h3><p className="text-gray-400 text-[10px] uppercase">{poll.poll_votes?.length || 0} Votes</p></div>
                    <button className={`px-8 py-4 rounded-xl font-black uppercase text-[10px] ${voted ? 'bg-gray-100 text-gray-500' : 'bg-indigo-600 text-white'}`}>{voted ? 'View Results' : 'Vote & Discuss'}</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {currentPage === 'polls' && selectedPoll && (
          <div className="max-w-4xl mx-auto space-y-8 pb-20">
            <button onClick={() => setSelectedPoll(null)} className="text-[10px] font-black uppercase text-gray-400"><i className="fa-solid fa-arrow-left"></i> All Polls</button>
            <div className="bg-white p-10 rounded-[3rem] shadow-xl space-y-10">
              <h2 className="text-3xl md:text-5xl font-black uppercase leading-none">{selectedPoll.title}</h2>
              <div className="space-y-8">
                {selectedPoll.poll_options?.map((opt: any) => {
                  const votes = selectedPoll.poll_votes?.filter((v: any) => v.option_id === opt.id) || [];
                  const totalVotes = selectedPoll.poll_votes?.length || 0;
                  const percent = totalVotes ? Math.round((votes.length / totalVotes) * 100) : 0;
                  const hasVotedAny = selectedPoll.poll_votes?.some((v: any) => v.user_id === user?.id);
                  return (
                    <div key={opt.id} className="space-y-3">
                      <button onClick={() => !hasVotedAny && setPendingVote({ pollId: selectedPoll.id, optionId: opt.id, optionText: opt.text, isAnonymous: false })} className="w-full text-left p-6 rounded-2xl border-2 relative overflow-hidden flex justify-between items-center">
                        {hasVotedAny && <div className="absolute inset-y-0 left-0 bg-indigo-50" style={{ width: `${percent}%` }}></div>}
                        <span className="relative z-10 text-xs font-black uppercase">{opt.text}</span>
                        {hasVotedAny && <div className="relative z-10 text-right"><span className="text-sm font-black text-indigo-600">{percent}%</span><span className="block text-[8px] font-bold text-gray-400 uppercase">({votes.length} Votes)</span></div>}
                      </button>
                      {hasVotedAny && votes.length > 0 && (
                        <div className="flex items-center gap-2 px-2 cursor-pointer" onClick={() => setRegistryModal({ optionText: opt.text, voters: votes })}>
                          <div className="flex -space-x-2">
                            {votes.slice(0, 5).map((v: any, i: number) => <UserAvatar key={i} url={v.profiles?.avatar_url} isAnonymous={v.is_anonymous} size="sm" />)}
                          </div>
                          {votes.length > 5 && <span className="text-[9px] font-black text-gray-400">+ {votes.length - 5} More</span>}
                          <span className="text-[8px] font-black text-indigo-400 uppercase ml-auto">View Registry</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="pt-10 border-t">{renderComments(selectedPoll.poll_comments || [], selectedPoll.id)}</div>
            </div>
          </div>
        )}

        {/* Restore Board, Suggestions, Auth, and Admin with matching logic... */}
        {currentPage === 'signup' && (
          <div className="max-w-lg mx-auto py-10 bg-white p-8 rounded-[3rem] shadow-2xl">
            <h2 className="text-2xl font-black uppercase text-indigo-600 text-center mb-8">Voter Verification</h2>
            <form className="space-y-4" onSubmit={handleSignup}>
              <div className="grid grid-cols-2 gap-4">
                <input name="lastName" required placeholder="LAST NAME" className="p-4 bg-gray-50 rounded-xl uppercase text-[10px]" />
                <input name="voterId" required placeholder="VOTER ID #" className="p-4 bg-gray-50 rounded-xl text-[10px]" />
              </div>
              <input type="date" name="dob" required className="w-full p-4 bg-gray-50 rounded-xl" />
              <input name="address" required placeholder="STREET NAME (Ex: Main St)" className="w-full p-4 bg-gray-50 rounded-xl uppercase" />
              <input type="email" name="email" required placeholder="EMAIL" className="w-full p-4 bg-gray-50 rounded-xl" />
              <input type="password" name="password" required placeholder="PASSWORD" className="w-full p-4 bg-gray-50 rounded-xl" />
              <button disabled={isVerifying} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl">
                {isVerifying ? 'Validating...' : 'Register Securely'}
              </button>
            </form>
          </div>
        )}

        {currentPage === 'login' && (
          <div className="max-w-lg mx-auto py-10 bg-white p-8 rounded-[3rem] shadow-2xl">
            <h2 className="text-2xl font-black uppercase text-indigo-600 text-center mb-8">Secure Access</h2>
            <form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); const { error } = await supabase!.auth.signInWithPassword({ email: fd.get('email') as string, password: fd.get('password') as string }); if (error) showToast(error.message, 'error'); else setCurrentPage('home'); }}>
              <input name="email" type="email" placeholder="EMAIL" required className="w-full p-4 bg-gray-50 rounded-xl" />
              <input name="password" type="password" placeholder="PASSWORD" required className="w-full p-4 bg-gray-50 rounded-xl" />
              <button className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl">Enter Portal</button>
            </form>
          </div>
        )}

      </main>

      <footer className="bg-white border-t py-3 text-center">
        <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.4em]">© 2024 Moore Transparency Portal</p>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 20px; border: 3px solid transparent; background-clip: content-box; }
        @keyframes slide-up { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-slide-up { animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </div>
  );
}
