import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { CATEGORIES, DASHBOARDS, OFFICIALS } from './constants.ts';
import { DashboardConfig } from './types.ts';

// --- CONFIGURATION ---
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

// --- UTILITIES ---
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
  
  // --- UI & INTERACTION STATE ---
  const [isVerifying, setIsVerifying] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [selectedOfficials, setSelectedOfficials] = useState<string[]>([]);
  const [isOfficialDropdownOpen, setIsOfficialDropdownOpen] = useState(false);
  const [pendingVote, setPendingVote] = useState<{pollId: string, optionId: string, optionText: string, isAnonymous: boolean} | null>(null);

  // --- INITIALIZATION ---
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
      if (session?.user) {
        fetchProfile(session.user.id);
        if (event === 'SIGNED_IN') showToast("Access Granted");
      } else {
        setProfile(null);
        setCurrentPage('home');
        setSelectedPoll(null);
      }
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

  const fetchAllData = () => {
    fetchPolls();
    fetchSuggestions();
    fetchBoardMessages();
  };

  const fetchPolls = async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from('polls')
      .select(`
        *,
        poll_options(*),
        poll_votes(*, profiles(full_name, district)),
        poll_comments(*, profiles(full_name, district), comment_reactions(*))
      `)
      .order('created_at', { ascending: false });
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

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // --- AUTH HANDLERS ---
  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsVerifying(true);
    const fd = new FormData(e.currentTarget);
    const lastName = fd.get('lastName') as string;
    const voterId = fd.get('voterId') as string;
    const dob = fd.get('dob') as string;
    const address = fd.get('address') as string;
    const email = fd.get('email') as string;
    const password = fd.get('password') as string;

    try {
      const verifyRes = await fetch('/.netlify/functions/verify-voter', {
        method: 'POST',
        body: JSON.stringify({ lastName, voterId, dob, address }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.error || "Verification failed");

      const { error } = await supabase!.auth.signUp({
        email,
        password,
        options: { 
          data: { 
            full_name: verifyData.fullName, 
            district: verifyData.district, 
            voter_id: voterId 
          } 
        }
      });
      if (error) throw error;
      showToast("Verification Successful! Check your email.", "success");
      setCurrentPage('login');
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLogout = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    showToast("Logged out");
  };

  // --- MESSAGE BOARD LOGIC ---
  const filteredMessages = useMemo(() => {
    if (!searchQuery) return boardMessages;
    const q = searchQuery.toLowerCase();
    return boardMessages.filter(m => 
      m.profiles?.full_name?.toLowerCase().includes(q) || 
      m.recipient_names.toLowerCase().includes(q) || 
      m.content.toLowerCase().includes(q)
    );
  }, [boardMessages, searchQuery]);

  const handlePostBoardMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !supabase) return;
    const fd = new FormData(e.target as HTMLFormElement);
    const content = fd.get('content') as string;
    const isAnon = fd.get('isAnon') === 'on';
    
    if (!content.trim() || selectedOfficials.length === 0) {
      return showToast("Select officials and type a message.", "error");
    }

    const { error } = await supabase.from('board_messages').insert({
      user_id: user.id,
      recipient_names: selectedOfficials.join(', '),
      content,
      is_anonymous: isAnon
    });

    if (error) showToast(error.message, 'error');
    else {
      showToast("Message Sent to Public Record");
      setSelectedOfficials([]);
      (e.target as HTMLFormElement).reset();
      fetchBoardMessages();
    }
  };

  // --- FIX 3: VOTING LOGIC (STRICT BOOLEAN CASTING) ---
  const initiateVote = (pollId: string, optionId: string, optionText: string) => {
    if (!user) return setCurrentPage('login');
    const poll = polls.find(p => p.id === pollId);
    const existingVote = poll?.poll_votes?.find((v: any) => v.user_id === user.id);
    if (existingVote?.option_id === optionId) return; 
    setPendingVote({ pollId, optionId, optionText, isAnonymous: false });
  };

  const confirmVote = async () => {
    if (!pendingVote || !supabase) return;
    
    const { error } = await supabase.from('poll_votes').upsert(
      { 
        poll_id: pendingVote.pollId, 
        option_id: pendingVote.optionId, 
        user_id: user.id, 
        is_anonymous: Boolean(pendingVote.isAnonymous) // Strict cast
      },
      { onConflict: 'poll_id,user_id' }
    );
    if (error) {
      showToast(error.message, 'error');
    } else { 
      showToast("Vote recorded successfully"); 
      fetchPolls(); 
    }
    setPendingVote(null);
  };

  // --- FIX 2: REACTION HANDLER (WIRED TO DB & TOGGLE LOGIC) ---
  const handleReaction = async (commentId: string, type: 'like' | 'dislike') => {
    if (!user) return setCurrentPage('login');
    if (!supabase) return;

    // Check if user already has this specific reaction to allow toggling off
    const poll = polls.find(p => p.poll_comments.some((c: any) => c.id === commentId));
    const comment = poll?.poll_comments.find((c: any) => c.id === commentId);
    const existingReaction = comment?.comment_reactions?.find((r: any) => r.user_id === user.id);

    if (existingReaction?.reaction_type === type) {
      // If user clicks the same button, remove the reaction
      const { error } = await supabase.from('comment_reactions')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', user.id);
      
      if (error) showToast("Could not remove reaction", "error");
      else fetchPolls();
    } else {
      // Otherwise, upsert the new reaction (swaps like to dislike or adds new)
      const { error } = await supabase.from('comment_reactions').upsert(
        { comment_id: commentId, user_id: user.id, reaction_type: type },
        { onConflict: 'comment_id,user_id' }
      );
      
      if (error) showToast("Reaction failed", "error");
      else fetchPolls();
    }
  };

  // --- COMMENT LOGIC ---
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
              <div className="text-gray-800 text-sm font-medium leading-relaxed">
                {renderTextWithLinks(comment.content)}
              </div>
              <div className="flex gap-4 mt-3 text-[9px] font-black uppercase tracking-widest">
                <button 
                  onClick={() => handleReaction(comment.id, 'like')} 
                  className={`${userReaction === 'like' ? 'text-indigo-600' : 'text-gray-400'} hover:text-indigo-600 transition-colors flex items-center gap-1`}
                >
                  <i className={`fa-${userReaction === 'like' ? 'solid' : 'regular'} fa-thumbs-up`}></i> {likes}
                </button>
                <button 
                  onClick={() => handleReaction(comment.id, 'dislike')} 
                  className={`${userReaction === 'dislike' ? 'text-red-500' : 'text-gray-400'} hover:text-red-500 transition-colors flex items-center gap-1`}
                >
                  <i className={`fa-${userReaction === 'dislike' ? 'solid' : 'regular'} fa-thumbs-down`}></i> {dislikes}
                </button>
                <button onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)} className="text-gray-400 hover:text-indigo-600">Reply</button>
              </div>
              
              {replyTo === comment.id && (
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const content = fd.get('content') as string;
                  await supabase?.from('poll_comments').insert({ 
                    poll_id: pollId, 
                    user_id: user.id, 
                    content, 
                    parent_id: comment.id 
                  });
                  setReplyTo(null); fetchPolls();
                }} className="mt-3 flex gap-2">
                  <input name="content" autoFocus placeholder="Write a reply..." className="flex-grow p-3 bg-white rounded-xl text-xs outline-none border shadow-sm" />
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
        <div className="p-4 flex justify-end bg-white border-b border-gray-100">
          <button onClick={() => setActiveDashboard(null)} className="bg-gray-900 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">Close Report</button>
        </div>
        <iframe src={activeDashboard.folderPath} className="w-full h-full border-0" title={activeDashboard.title} />
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col font-sans overflow-hidden relative">
      {toast && <Toast message={toast.message} type={toast.type} />}

      {/* --- VOTING MODAL --- */}
      {pendingVote && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 space-y-6 animate-slide-up">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto text-2xl mb-4">
                <i className="fa-solid fa-vote-yea"></i>
              </div>
              <h3 className="text-xl font-black uppercase">Confirm Your Vote</h3>
              <p className="text-gray-500 text-sm">Voting for: <span className="text-indigo-600 font-bold">"{pendingVote.optionText}"</span></p>
            </div>
            <div className="bg-gray-50 p-6 rounded-2xl border flex items-center justify-between">
               <span className="text-[10px] font-black uppercase text-gray-500">Vote Anonymously?</span>
               <button 
                onClick={() => setPendingVote({...pendingVote, isAnonymous: !pendingVote.isAnonymous})}
                className={`w-12 h-6 rounded-full transition-all relative ${pendingVote.isAnonymous ? 'bg-indigo-600' : 'bg-gray-300'}`}
               >
                 <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${pendingVote.isAnonymous ? 'left-7' : 'left-1'}`}></div>
               </button>
            </div>
            <div className="flex flex-col gap-3">
              <button onClick={confirmVote} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg">Submit Vote</button>
              <button onClick={() => setPendingVote(null)} className="w-full py-4 text-gray-400 font-black uppercase text-[10px]">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <nav className="bg-white shadow-sm px-4 py-3 z-50 shrink-0 border-b border-gray-100 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <div className="flex items-center cursor-pointer" onClick={() => { setCurrentPage('home'); setSelectedCategory(null); }}>
            <i className="fa-solid fa-landmark text-indigo-600 text-xl mr-2"></i>
            <span className="text-lg font-bold uppercase tracking-tighter text-gray-900">Finance Hub</span>
          </div>
          <div className="hidden md:flex gap-8">
            <button onClick={() => { setCurrentPage('home'); setSelectedCategory(null); }} className={`text-[10px] font-black uppercase tracking-widest ${currentPage === 'home' ? 'text-indigo-600' : 'text-gray-400'}`}>Home</button>
            <button onClick={() => { setCurrentPage('polls'); setSelectedPoll(null); fetchPolls(); }} className={`text-[10px] font-black uppercase tracking-widest ${currentPage === 'polls' ? 'text-indigo-600' : 'text-gray-400'}`}>Polls</button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setIsMenuOpen(true)} className="bg-gray-100 p-2.5 rounded-xl text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 transition-all shadow-sm">
            <i className="fa-solid fa-bars-staggered"></i>
          </button>
        </div>
      </nav>

      {isMenuOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setIsMenuOpen(false)}></div>
          <div className="relative w-80 bg-white h-full shadow-2xl p-8 flex flex-col animate-slide-in">
            <button onClick={() => setIsMenuOpen(false)} className="self-end text-gray-300 hover:text-red-500 mb-8 transition-colors"><i className="fa-solid fa-xmark text-2xl"></i></button>
            <div className="space-y-8">
              <div className="space-y-4">
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] border-b pb-2">Community Tools</p>
                <button onClick={() => { setCurrentPage('board'); setIsMenuOpen(false); fetchBoardMessages(); }} className="flex items-center gap-4 text-xl font-black uppercase text-gray-800 hover:text-indigo-600 transition-all">
                  <i className="fa-solid fa-comments w-6 text-indigo-600"></i> Let's Talk
                </button>
                <button onClick={() => { setCurrentPage('suggestions'); setIsMenuOpen(false); fetchSuggestions(); }} className="flex items-center gap-4 text-xl font-black uppercase text-gray-800 hover:text-indigo-600 transition-all">
                  <i className="fa-solid fa-lightbulb w-6 text-yellow-500"></i> Suggestions
                </button>
              </div>

              {profile?.is_admin && (
                <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase text-red-400 tracking-[0.2em] border-b border-red-50 pb-2">Oversight</p>
                  <button onClick={() => { setCurrentPage('admin'); setIsMenuOpen(false); fetchUsers(); }} className="flex items-center gap-4 text-xl font-black uppercase text-red-600 hover:scale-105 transition-all">
                    <i className="fa-solid fa-shield-halved w-6"></i> Admin Center
                  </button>
                </div>
              )}

              <hr className="border-gray-50" />
              
              {user ? (
                <div className="space-y-4 mt-auto">
                  <div className="p-5 bg-indigo-50/50 rounded-3xl border border-indigo-100">
                    <p className="text-[9px] font-black uppercase text-indigo-400 mb-1">Citizen Identity</p>
                    <p className="text-sm font-black text-gray-900">{profile?.full_name}</p>
                    <p className="text-[9px] font-black uppercase text-gray-500">District {profile?.district} Voter</p>
                  </div>
                  <button onClick={handleLogout} className="w-full py-4 border-2 border-red-100 text-red-500 rounded-2xl font-black uppercase text-xs hover:bg-red-50 transition-colors">Logout</button>
                </div>
              ) : (
                <div className="space-y-3">
                   <button onClick={() => { setCurrentPage('signup'); setIsMenuOpen(false); }} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg">Join the Registry</button>
                   <button onClick={() => { setCurrentPage('login'); setIsMenuOpen(false); }} className="w-full py-4 bg-gray-50 text-gray-500 rounded-2xl font-black uppercase text-xs">Sign In</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <main className="flex-grow overflow-y-auto container mx-auto px-4 py-8 custom-scrollbar">
        
        {currentPage === 'home' && !selectedCategory && (
          <div className="max-w-4xl mx-auto space-y-12 py-10">
            <header className="text-center space-y-4">
               <h1 className="text-4xl md:text-6xl font-black text-gray-900 uppercase tracking-tighter leading-none">Oops, Transparency</h1>
               <p className="text-gray-500 text-lg md:text-xl font-medium">Verified citizen records & county budget oversight.</p>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {CATEGORIES.map(cat => (
                 <div key={cat.id} onClick={() => setSelectedCategory(cat.id)} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 hover:shadow-xl transition-all cursor-pointer flex items-center gap-6 group">
                   <div className={`${cat.color} w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg group-hover:scale-110 transition-transform`}>
                     <i className={`fa-solid ${cat.icon}`}></i>
                   </div>
                   <div className="text-left">
                     <h3 className="text-xl font-black text-gray-800 uppercase leading-none mb-1">{cat.label}</h3>
                     <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Review Logs</p>
                   </div>
                 </div>
               ))}
            </div>
          </div>
        )}

        {currentPage === 'home' && selectedCategory && (
          <div className="max-w-5xl mx-auto space-y-8">
            <button onClick={() => setSelectedCategory(null)} className="text-[10px] font-black uppercase text-gray-400 hover:text-indigo-600 transition-colors flex items-center gap-2">
              <i className="fa-solid fa-arrow-left"></i> Back to Categories
            </button>
            <h2 className="text-3xl font-black uppercase tracking-tighter">{selectedCategory} Reports</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {DASHBOARDS.filter(d => d.category === selectedCategory).map(dash => (
                <div key={dash.id} onClick={() => setActiveDashboard(dash)} className="bg-white p-8 rounded-[2rem] border border-gray-100 hover:shadow-xl transition-all cursor-pointer group flex flex-col">
                  <h4 className="text-lg font-black text-gray-800 uppercase mb-2 leading-tight">{dash.title}</h4>
                  <p className="text-gray-400 text-xs mb-6 leading-relaxed line-clamp-3">{dash.description}</p>
                  <div className="mt-auto pt-6 border-t border-gray-50 flex justify-between items-center">
                    <span className="text-indigo-600 text-[10px] font-black uppercase">Open Analysis</span>
                    <i className="fa-solid fa-arrow-right text-indigo-200 group-hover:translate-x-2 transition-transform"></i>
                  </div>
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
                const voted = poll.poll_votes?.some((v: any) => v.user_id === user?.id);
                return (
                  <div key={poll.id} onClick={() => setSelectedPoll(poll)} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 hover:shadow-lg transition-all cursor-pointer flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                    <div className="space-y-1">
                      <h3 className="text-2xl font-black uppercase tracking-tight text-gray-900">{poll.title}</h3>
                      <p className={`${voted ? 'text-indigo-600' : 'text-gray-400'} font-bold text-[10px] uppercase tracking-widest flex items-center gap-2`}>
                        {voted && <i className="fa-solid fa-circle-check"></i>}
                        {poll.poll_votes?.length || 0} Votes Recorded
                      </p>
                    </div>
                    <button className={`px-8 py-4 rounded-xl font-black uppercase text-[10px] w-full sm:w-auto shadow-sm ${voted ? 'bg-gray-100 text-gray-500' : 'bg-indigo-600 text-white'}`}>
                      {voted ? 'View Discussion' : 'Vote & Discuss'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* --- POLL DETAIL WITH VOTER REGISTRY --- */}
        {currentPage === 'polls' && selectedPoll && (
          <div className="max-w-4xl mx-auto space-y-8 pb-20">
            <button onClick={() => setSelectedPoll(null)} className="text-[10px] font-black uppercase text-gray-400 hover:text-indigo-600 flex items-center gap-2 transition-all">
              <i className="fa-solid fa-arrow-left"></i> All Polls
            </button>
            <div className="bg-white p-6 md:p-10 rounded-[3rem] shadow-xl border border-gray-100 space-y-10">
              <div className="space-y-4">
                <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter leading-none text-gray-900">{selectedPoll.title}</h2>
                <div className="text-gray-600 text-sm md:text-base leading-relaxed border-l-4 border-indigo-100 pl-6 py-2">
                  {renderTextWithLinks(selectedPoll.description)}
                </div>
              </div>

              <div className="space-y-8">
                {selectedPoll.poll_options?.map((opt: any) => {
                  const votes = selectedPoll.poll_votes?.filter((v: any) => v.option_id === opt.id) || [];
                  const totalVotes = selectedPoll.poll_votes?.length || 0;
                  const percent = totalVotes ? Math.round((votes.length / totalVotes) * 100) : 0;
                  const hasVotedThis = votes.some((v: any) => v.user_id === user?.id);
                  const hasVotedAny = selectedPoll.poll_votes?.some((v: any) => v.user_id === user?.id);
                  
                  return (
                    <div key={opt.id} className="space-y-3">
                      <button 
                        onClick={() => initiateVote(selectedPoll.id, opt.id, opt.text)} 
                        className={`w-full text-left p-6 rounded-2xl border-2 relative overflow-hidden transition-all group ${hasVotedThis ? 'border-indigo-600 bg-indigo-50/20' : 'border-gray-50 hover:border-indigo-200'}`}
                      >
                        {hasVotedAny && (
                          <div className="absolute inset-y-0 left-0 bg-indigo-600/5 transition-all duration-700" style={{ width: `${percent}%` }}></div>
                        )}
                        <div className="relative flex justify-between items-center">
                          <span className="text-[11px] md:text-xs font-black uppercase text-gray-700 flex items-center gap-3">
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${hasVotedThis ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300'}`}>
                              {hasVotedThis && <i className="fa-solid fa-check text-white text-[8px]"></i>}
                            </div>
                            {opt.text}
                          </span>
                          {hasVotedAny && <span className="text-xs font-black text-indigo-600">{percent}%</span>}
                        </div>
                      </button>
                      
                      {/* FIX 1: VOTER REGISTRY (ANONYMOUS BUG FIX) */}
                      {hasVotedAny && votes.length > 0 && (
                        <div className="flex flex-wrap gap-2 px-2 mt-1">
                          {votes.map((v: any, idx: number) => (
                            <span key={idx} className="text-[8px] font-black uppercase bg-gray-100 text-gray-500 px-3 py-1.5 rounded-full border border-gray-200 shadow-sm flex items-center gap-1.5">
                              <i className="fa-solid fa-user text-[6px]"></i>
                              {/* Strict check for boolean true */}
                              {v.is_anonymous === true ? 'Anonymous Voter' : (v.profiles?.full_name || 'Verified Voter')} 
                              <span className="text-gray-300">•</span> Dist {v.profiles?.district || '?'}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="pt-10 border-t border-gray-100">
                <h3 className="text-[10px] font-black uppercase text-gray-400 mb-8 tracking-[0.2em]">Verified Voter Discussion</h3>
                {renderComments(selectedPoll.poll_comments || [], selectedPoll.id)}
                
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (!user) return setCurrentPage('login');
                  const fd = new FormData(e.currentTarget);
                  const { error } = await supabase!.from('poll_comments').insert({ 
                    poll_id: selectedPoll.id, 
                    user_id: user.id, 
                    content: fd.get('content') 
                  });
                  if (error) showToast(error.message, 'error');
                  else { (e.target as HTMLFormElement).reset(); fetchPolls(); }
                }} className="mt-10 flex flex-col sm:flex-row gap-3">
                  <input name="content" required placeholder="Add your perspective..." className="flex-grow p-5 bg-gray-50 rounded-2xl font-bold text-sm outline-none border border-transparent focus:border-indigo-100 transition-all" />
                  <button type="submit" className="bg-indigo-600 text-white px-8 py-5 rounded-2xl font-black uppercase text-[10px] shadow-lg hover:bg-indigo-700">Post Comment</button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* MESSAGE BOARD */}
        {currentPage === 'board' && (
          <div className="flex h-full gap-8 overflow-hidden relative">
            <aside className={`fixed md:relative top-0 left-0 h-full w-[85%] md:w-80 z-[60] transform transition-transform duration-300 ease-in-out ${isArchiveOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} bg-white border-r border-gray-100 p-6 flex flex-col shadow-2xl md:shadow-none`}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-[10px] font-black uppercase tracking-widest text-indigo-900 flex items-center gap-2">
                  <i className="fa-solid fa-box-archive"></i> Message Archive
                </h2>
                <button onClick={() => setIsArchiveOpen(false)} className="md:hidden text-indigo-900 bg-gray-50 w-8 h-8 rounded-full flex items-center justify-center">
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
              <div className="relative mb-6">
                <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 text-xs"></i>
                <input 
                  type="text" 
                  placeholder="Search history..." 
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl text-[10px] font-bold outline-none border border-transparent focus:border-indigo-100 transition-all"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex-grow overflow-y-auto space-y-3 custom-scrollbar">
                {filteredMessages.map(msg => (
                  <div key={`arch-${msg.id}`} className="p-4 rounded-2xl hover:bg-indigo-50/50 cursor-pointer border border-transparent hover:border-indigo-50 transition-all group">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[8px] font-black uppercase text-indigo-600 truncate max-w-[120px]">To: {msg.recipient_names}</span>
                      <span className="text-[6px] font-bold text-gray-300 uppercase">{new Date(msg.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-[9px] font-medium text-gray-500 line-clamp-1 italic">"{msg.content}"</p>
                  </div>
                ))}
              </div>
            </aside>

            <div className="flex-grow flex flex-col items-center overflow-hidden">
               <div className="w-full max-w-2xl space-y-10 pb-20 overflow-y-auto custom-scrollbar pr-2">
                  <section>
                    <div className="flex items-center justify-between mb-8 sticky top-0 bg-gray-50/95 backdrop-blur-md py-4 z-10">
                      <h2 className="text-3xl font-black uppercase tracking-tighter text-gray-900 leading-none">Message Board</h2>
                      <button onClick={() => setIsArchiveOpen(true)} className="md:hidden bg-white px-4 py-2 rounded-xl border border-indigo-100 text-[9px] font-black uppercase text-indigo-600 shadow-sm">
                        <i className="fa-solid fa-clock-rotate-left mr-1"></i> History
                      </button>
                    </div>

                    {user ? (
                      <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-indigo-50 mb-12">
                         <h3 className="text-xs font-black uppercase text-indigo-600 mb-6 flex items-center gap-2">
                           <i className="fa-solid fa-paper-plane"></i> Message Officials
                         </h3>
                         <form onSubmit={handlePostBoardMessage} className="space-y-6">
                           <div className="relative">
                              <label className="text-[9px] font-black uppercase text-gray-400 mb-2 block ml-1">1. Choose Recipients</label>
                              <button 
                                type="button" 
                                onClick={() => setIsOfficialDropdownOpen(!isOfficialDropdownOpen)} 
                                className="w-full bg-gray-50 p-4 rounded-2xl flex justify-between items-center text-xs font-bold text-gray-700 border-2 border-transparent focus:border-indigo-100 transition-all shadow-inner"
                              >
                                <span className="truncate">{selectedOfficials.length ? `${selectedOfficials.length} Selected` : '-- Select Officials --'}</span>
                                <i className={`fa-solid fa-chevron-${isOfficialDropdownOpen ? 'up' : 'down'} text-[10px] text-indigo-300`}></i>
                              </button>
                              
                              {isOfficialDropdownOpen && (
                                <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-3xl shadow-2xl border border-gray-100 p-4 z-[70] max-h-72 overflow-y-auto custom-scrollbar">
                                  {OFFICIALS.map(o => (
                                    <label key={o.id} className="flex items-center gap-4 p-3 hover:bg-indigo-50/50 rounded-xl cursor-pointer group transition-colors">
                                      <input 
                                        type="checkbox" 
                                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer" 
                                        checked={selectedOfficials.includes(o.name)} 
                                        onChange={() => setSelectedOfficials(prev => prev.includes(o.name) ? prev.filter(n => n !== o.name) : [...prev, o.name])}
                                      />
                                      <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-gray-800 uppercase tracking-tight">{o.name}</span>
                                        <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">{o.office}</span>
                                      </div>
                                    </label>
                                  ))}
                                  <button type="button" onClick={() => setIsOfficialDropdownOpen(false)} className="w-full mt-4 bg-indigo-600 text-white py-3 rounded-xl font-black text-[10px] uppercase shadow-lg">Confirm Selection</button>
                                </div>
                              )}
                           </div>

                           <div className="space-y-2">
                             <label className="text-[9px] font-black uppercase text-gray-400 block ml-1">2. Public Message</label>
                             <textarea name="content" required placeholder="Type your message for public record..." className="w-full h-32 bg-gray-50 rounded-[1.5rem] p-6 text-sm font-bold text-gray-700 outline-none border-2 border-transparent focus:border-indigo-100 transition-all shadow-inner" />
                           </div>

                           <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                             <label className="flex items-center gap-3 cursor-pointer group">
                                <input type="checkbox" name="isAnon" className="hidden" />
                                <div className="w-10 h-6 bg-gray-200 rounded-full p-1 transition-colors relative group-has-[:checked]:bg-indigo-600">
                                   <div className="w-4 h-4 bg-white rounded-full shadow-md transition-transform transform translate-x-0 group-has-[:checked]:translate-x-4"></div>
                                </div>
                                <span className="text-[9px] font-black uppercase text-gray-400">Post Anonymously</span>
                             </label>
                             <button type="submit" className="w-full sm:w-auto bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black text-11px] uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition-all">Publish Message</button>
                           </div>
                         </form>
                      </div>
                    ) : (
                      <div className="bg-white p-10 rounded-[3rem] text-center border border-dashed border-indigo-200 mb-12">
                         <div className="w-16 h-16 bg-indigo-50 text-indigo-300 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl"><i className="fa-solid fa-user-lock"></i></div>
                         <h3 className="text-xl font-black uppercase text-gray-900 mb-2">Verified Portal</h3>
                         <p className="text-gray-400 text-xs mb-8">Access restricted to registered Moore County voters.</p>
                         <button onClick={() => setCurrentPage('signup')} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] shadow-lg">Join the Registry</button>
                      </div>
                    )}

                    <div className="space-y-10">
                      {filteredMessages.map(msg => (
                        <div key={msg.id} className="group">
                          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 relative group-hover:shadow-md transition-all">
                             <div className="flex justify-between items-start mb-6">
                               <span className="text-[8px] font-black uppercase tracking-widest text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full truncate max-w-[200px]">To: {msg.recipient_names}</span>
                               <span className="text-[8px] text-gray-300 font-bold uppercase tracking-widest">{new Date(msg.created_at).toLocaleDateString()}</span>
                             </div>
                             <p className="text-gray-800 text-sm italic leading-relaxed mb-8">"{msg.content}"</p>
                             <div className="pt-6 border-t border-gray-50 flex justify-between items-center">
                                <div className="flex flex-col">
                                  <span className="text-[10px] font-black uppercase text-gray-900 leading-none mb-1">{msg.is_anonymous ? 'Verified Citizen' : msg.profiles?.full_name}</span>
                                  <span className="text-[8px] font-black uppercase text-gray-400 tracking-widest">Dist {msg.profiles?.district || '?'} Voter</span>
                                </div>
                                <i className="fa-solid fa-quote-right text-indigo-50 text-2xl"></i>
                             </div>
                          </div>
                          {msg.response_content && (
                            <div className="ml-10 mt-4 bg-blue-50/50 p-8 rounded-[2.5rem] border-l-8 border-blue-500 relative">
                               <div className="flex items-center gap-3 mb-3">
                                 <span className="bg-blue-600 text-white text-[7px] font-black uppercase px-2 py-0.5 rounded-full shadow-sm">Official Reply</span>
                                 <span className="text-[9px] font-black text-blue-900 uppercase">{msg.response_author}</span>
                               </div>
                               <p className="text-blue-900 text-sm font-semibold leading-relaxed">"{msg.response_content}"</p>
                               {msg.responded_at && (
                                 <span className="absolute bottom-3 right-5 text-[7px] font-black text-blue-300 uppercase">{new Date(msg.responded_at).toLocaleDateString()}</span>
                               )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
               </div>
            </div>
          </div>
        )}

        {/* SUGGESTION BOX */}
        {currentPage === 'suggestions' && (
          <div className="max-w-4xl mx-auto space-y-12">
             <div className="bg-white p-10 rounded-[3rem] shadow-xl border-2 border-indigo-50">
               <h2 className="text-3xl font-black uppercase text-indigo-600 mb-6">Suggestion Box</h2>
               <form onSubmit={async (e) => {
                 e.preventDefault();
                 if (!user) return setCurrentPage('login');
                 const fd = new FormData(e.currentTarget);
                 const { error } = await supabase!.from('suggestions').insert({ 
                   content: fd.get('content'), 
                   is_public: fd.get('isPublic') === 'on', 
                   user_id: user.id 
                 });
                 if (error) showToast(error.message, 'error');
                 else { showToast("Thank you for your input!"); fetchSuggestions(); (e.target as any).reset(); }
               }} className="space-y-6">
                 <textarea name="content" required placeholder="Share an idea with local officials..." className="w-full h-40 bg-gray-50 rounded-[2rem] p-8 outline-none font-bold text-gray-700 border border-transparent focus:border-indigo-100 transition-all shadow-inner" />
                 <div className="flex justify-between items-center">
                   <label className="flex items-center gap-3 cursor-pointer group">
                     <input type="checkbox" name="isPublic" defaultChecked className="hidden" />
                     <div className="w-10 h-6 bg-gray-200 rounded-full p-1 transition-colors relative group-has-[:checked]:bg-indigo-600">
                        <div className="w-4 h-4 bg-white rounded-full transition-transform transform translate-x-0 group-has-[:checked]:translate-x-4"></div>
                     </div>
                     <span className="text-[10px] font-black uppercase text-gray-400">Public visibility</span>
                   </label>
                   <button type="submit" className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs shadow-lg">Submit Idea</button>
                 </div>
               </form>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {suggestions.filter(s => s.is_public).map(s => (
                 <div key={s.id} className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col justify-between">
                   <p className="text-gray-800 font-bold mb-6 italic text-sm">"{s.content}"</p>
                   <span className="text-[9px] font-black uppercase text-indigo-400">{s.profiles?.full_name || 'Verified Voter'} • Dist {s.profiles?.district || '?'}</span>
                 </div>
               ))}
             </div>
          </div>
        )}

        {/* AUTHENTICATION */}
        {(currentPage === 'signup' || currentPage === 'login') && (
          <div className="max-w-lg mx-auto w-full space-y-8 py-10">
            <div className="flex gap-2 bg-gray-100 p-1.5 rounded-2xl">
              <button onClick={() => setCurrentPage('signup')} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${currentPage === 'signup' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400'}`}>1. Registry</button>
              <button onClick={() => setCurrentPage('login')} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${currentPage === 'login' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400'}`}>2. Sign In</button>
            </div>

            {currentPage === 'signup' ? (
              <div className="bg-white p-8 md:p-10 rounded-[3rem] shadow-2xl border border-gray-100">
                <header className="text-center mb-8 space-y-2">
                  <h2 className="text-2xl font-black uppercase text-indigo-600 leading-tight">Voter Verification</h2>
                  <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Connect your official state record</p>
                </header>
                <form className="space-y-4" onSubmit={handleSignup}>
                  <div className="grid grid-cols-2 gap-4">
                    <input name="lastName" required placeholder="LAST NAME" className="w-full p-4 bg-gray-50 rounded-xl outline-none font-bold uppercase text-[10px] shadow-inner" />
                    <input name="voterId" required placeholder="VOTER ID #" className="w-full p-4 bg-gray-50 rounded-xl outline-none font-bold text-[10px] shadow-inner" />
                  </div>
                  <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 space-y-4">
                    <div className="flex flex-col gap-1.5">
                       <label className="text-[8px] font-black uppercase text-indigo-300 ml-1">Date of Birth</label>
                       <input type="date" name="dob" required className="w-full p-3 bg-white rounded-xl text-[10px] font-bold" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                       <label className="text-[8px] font-black uppercase text-indigo-300 ml-1">Street Name</label>
                       <input name="address" required placeholder="Ex: Main St" className="w-full p-3 bg-white rounded-xl text-[10px] font-bold uppercase" />
                    </div>
                  </div>
                  <input type="email" name="email" required placeholder="Email Address" className="w-full p-4 bg-gray-50 rounded-xl outline-none font-bold text-[10px] shadow-inner" />
                  <input type="password" name="password" required placeholder="Create Password" className="w-full p-4 bg-gray-50 rounded-xl outline-none font-bold text-[10px] shadow-inner" />
                  <button disabled={isVerifying} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-indigo-700 transition-all disabled:opacity-50">
                    {isVerifying ? 'Validating State Records...' : 'Register Securely'}
                  </button>
                </form>
              </div>
            ) : (
              <div className="bg-white p-8 md:p-10 rounded-[3rem] shadow-2xl border border-gray-100">
                <header className="text-center mb-8 space-y-2">
                  <h2 className="text-2xl font-black uppercase text-indigo-600 leading-tight">Secure Access</h2>
                  <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Verified login only</p>
                </header>
                <form className="space-y-4" onSubmit={async (e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const { error } = await supabase!.auth.signInWithPassword({ 
                    email: fd.get('email') as string, 
                    password: fd.get('password') as string 
                  });
                  if (error) showToast(error.message, 'error'); else setCurrentPage('home');
                }}>
                  <input name="email" type="email" placeholder="Email Address" required className="w-full p-4 bg-gray-50 rounded-xl outline-none font-bold text-[10px] shadow-inner" />
                  <input name="password" type="password" placeholder="Password" required className="w-full p-4 bg-gray-50 rounded-xl outline-none font-bold text-[10px] shadow-inner" />
                  <button className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-indigo-700 transition-all">Enter Portal</button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ADMIN DASHBOARD */}
        {currentPage === 'admin' && profile?.is_admin && (
           <div className="max-w-6xl mx-auto space-y-12 py-10">
             <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
               <div>
                 <p className="text-[10px] font-black uppercase text-red-500 tracking-[0.3em] mb-2">Internal Affairs</p>
                 <h2 className="text-5xl font-black uppercase text-gray-900 tracking-tighter leading-none">Admin Control</h2>
               </div>
               <button onClick={fetchAllData} className="bg-white border border-gray-200 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50">Sync Database</button>
             </header>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-gray-100">
                  <h3 className="text-xl font-black uppercase mb-8 flex items-center gap-3">
                    <i className="fa-solid fa-plus-circle text-indigo-600"></i> Deploy New Poll
                  </h3>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    const options = (fd.get('options') as string).split(',').map(s => s.trim());
                    try {
                      const { data: poll, error: pError } = await supabase!.from('polls').insert({ 
                        title: fd.get('title'), 
                        description: fd.get('description'),
                        is_anonymous_voting: fd.get('isAnon') === 'on',
                        closed_at: fd.get('closedAt')
                      }).select().single();
                      
                      if (pError) throw pError;
                      if (poll) {
                        await supabase!.from('poll_options').insert(options.map(text => ({ poll_id: poll.id, text })));
                        showToast("Poll Successfully Launched");
                        fetchPolls();
                        (e.target as HTMLFormElement).reset();
                      }
                    } catch (err: any) { showToast(err.message, 'error'); }
                  }} className="space-y-4">
                    <input name="title" required placeholder="Question Title" className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm outline-none" />
                    <textarea name="description" placeholder="Poll Details (Supports URLs)..." className="w-full p-4 bg-gray-50 rounded-xl font-bold h-24 text-sm outline-none" />
                    <input name="options" required placeholder="Options (comma separated: Yes, No, Maybe)" className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm outline-none" />
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-gray-400 ml-2">Poll Closing Date & Time</label>
                      <input type="datetime-local" name="closedAt" required className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm outline-none" />
                    </div>
                    <label className="flex items-center gap-3 px-2">
                      <input type="checkbox" name="isAnon" /> <span className="text-[10px] font-black uppercase text-gray-400">Default to Anonymous?</span>
                    </label>
                    <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase shadow-xl text-xs hover:bg-indigo-700 transition-all">Launch Poll to Citizens</button>
                  </form>
                </div>

                <div className="bg-gray-900 p-10 rounded-[3rem] text-white shadow-2xl">
                  <h3 className="text-xl font-black uppercase mb-8 flex items-center gap-3">
                    <i className="fa-solid fa-users-gear text-red-500"></i> Registry Moderation
                  </h3>
                  <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar-dark pr-4">
                    {allUsers.map(u => (
                      <div key={u.id} className="flex justify-between items-center p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group">
                        <div className="truncate pr-4">
                          <p className="text-xs font-black uppercase truncate group-hover:text-red-400 transition-colors">{u.full_name}</p>
                          <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest">District {u.district}</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                           <button 
                            onClick={async () => {
                              const { error } = await supabase!.from('profiles').update({ is_banned: !u.is_banned }).eq('id', u.id);
                              if (!error) { showToast(u.is_banned ? "User Reinstated" : "User Banned"); fetchUsers(); }
                            }}
                            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${u.is_banned ? 'bg-red-600 text-white' : 'border border-white/20 text-gray-400 hover:border-red-500 hover:text-red-500'}`}
                           >
                            {u.is_banned ? 'Unban' : 'Ban Access'}
                           </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
             </div>
           </div>
        )}

      </main>

      <footer className="bg-white border-t border-gray-100 py-3 px-6 text-center shrink-0">
        <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.4em]">© 2024 Moore Transparency Portal • Verified Public Records</p>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { 
          background: #e2e8f0; 
          border-radius: 20px; 
          border: 3px solid transparent;
          background-clip: content-box;
        }
        .custom-scrollbar-dark::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar-dark::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        
        @keyframes slide-in {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes slide-up {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-in { animation: slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-slide-up { animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </div>
  );
}