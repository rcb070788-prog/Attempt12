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
const formatDate = (dateString: string) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).toUpperCase();
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
  const [manualRequests, setManualRequests] = useState<any[]>([]);
  const [pendingAction, setPendingAction] = useState<{req: any, type: 'Confirm' | 'Deny'} | null>(null);
  const [deletionVotes, setDeletionVotes] = useState<any[]>([]);
  
  // --- UI STATE ---
  const [isVerifying, setIsVerifying] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [selectedOfficials, setSelectedOfficials] = useState<string[]>([]);
  const [isOfficialDropdownOpen, setIsOfficialDropdownOpen] = useState(false);
  const [pendingVote, setPendingVote] = useState<{pollId: string, optionId: string, optionText: string, isAnonymous: boolean} | null>(null);
  const [registryModal, setRegistryModal] = useState<{optionText: string, voters: any[]} | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSuggestionModalOpen, setIsSuggestionModalOpen] = useState(false);
  const [stagedPollFiles, setStagedPollFiles] = useState<{url: string, name: string}[]>([]);
  const [pollFilter, setPollFilter] = useState<'active' | 'completed'>('active');
  const [showPollLoginModal, setShowPollLoginModal] = useState(false);
  const [isAdminSections, setIsAdminSections] = useState({ poll: true, registry: false, managePolls: false, manageSuggestions: false, manualRequests: false });
  const [notFoundModal, setNotFoundModal] = useState(false);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [clearedItems, setClearedItems] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('admin_cleared_items') || '[]'); } catch { return []; }
  });

  const toggleClearItem = (id: string) => {
    const newCleared = clearedItems.includes(id) 
      ? clearedItems.filter(i => i !== id) 
      : [...clearedItems, id];
    setClearedItems(newCleared);
    localStorage.setItem('admin_cleared_items', JSON.stringify(newCleared));
    showToast(clearedItems.includes(id) ? "Item restored to view" : "Item cleared from view");
  };

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

    // Refresh admin data whenever switching to admin page
    if (currentPage === 'admin' && profile?.is_admin) {
      fetchUsers();
      fetchManualRequests();
    }

    // REAL-TIME SUBSCRIPTION: Listen for new votes to update progress bars
    const votesSubscription = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'poll_votes' }, () => fetchPolls())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'poll_comments' }, () => fetchPolls())
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(votesSubscription);
    };
  }, []);

  useEffect(() => {
    if (selectedPoll) {
      const updated = polls.find(p => p.id === selectedPoll.id);
      if (updated) setSelectedPoll(updated);
    }
  }, [polls]);

  useEffect(() => {
    if (currentPage === 'admin' && profile?.is_admin) {
      fetchUsers();
      fetchManualRequests();
    }
  }, [currentPage, profile]);

  // --- BROWSER HISTORY SYNC ---
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state) {
        setCurrentPage(event.state.page || 'home');
        setSelectedCategory(event.state.category || null);
        setSelectedPoll(event.state.poll || null);
        setActiveDashboard(event.state.dashboard || null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    
    // Replace initial state so the first 'home' load is in the stack
    if (!window.history.state) {
      window.history.replaceState({ page: 'home', category: null, poll: null, dashboard: null }, '');
    }
    
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const hState = window.history.state;
    const isNewState = !hState || 
      hState.page !== currentPage || 
      hState.category !== selectedCategory || 
      hState.poll?.id !== selectedPoll?.id ||
      hState.dashboard?.id !== activeDashboard?.id;

    if (isNewState) {
      window.history.pushState({ 
        page: currentPage, 
        category: selectedCategory, 
        poll: selectedPoll, 
        dashboard: activeDashboard 
      }, '');
    }
  }, [currentPage, selectedCategory, selectedPoll, activeDashboard]);

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
    try {
      const { data, error } = await supabase
        .from('suggestions')
        .select(`
          *, 
          profiles(full_name, district, avatar_url),
          suggestion_comments(*, profiles(full_name, district, avatar_url), suggestion_reactions(*))
        `)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error("Suggestion Fetch Error:", error.message);
        // Fallback: try fetching without comments if the join is the problem
        const { data: fallbackData } = await supabase.from('suggestions').select('*, profiles(full_name, district, avatar_url)').order('created_at', { ascending: false });
        setSuggestions(fallbackData || []);
      } else {
        setSuggestions(data || []);
      }
    } catch (err) {
      console.error("Critical Fetch Error:", err);
    }
  };

  const fetchBoardMessages = async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('board_messages')
      .select(`
        *,
        profiles (
          full_name,
          district,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("Fetch Error:", error.message);
    } else {
      setBoardMessages(data || []);
    }
  };

  const fetchUsers = async () => {
    if (!supabase) return;
    const { data } = await supabase.from('profiles').select('*').order('full_name', { ascending: true });
    setAllUsers(data || []);
  };

  const fetchManualRequests = async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from('manual_access_requests').select('*').order('created_at', { ascending: false });
    if (error) console.error("Manual Request Fetch Error:", error.message);
    setManualRequests(data || []);
  };

  const fetchDeletionVotes = async () => {
    if (!supabase) return;
    const { data } = await supabase.from('admin_deletion_votes').select('*');
    setDeletionVotes(data || []);
  };

  const fetchAllData = () => { 
    fetchPolls(); 
    fetchSuggestions(); 
    fetchBoardMessages(); 
    fetchUsers(); 
    fetchManualRequests(); 
    fetchDeletionVotes();
  };
  const showToast = (message: string, type: 'success' | 'error' = 'success') => { setToast({ message, type }); setTimeout(() => setToast(null), 3000); };

  // --- HANDLERS ---
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !supabase) return;
    try {
      setIsUploading(true);
      // We use a fixed filename 'avatar_image' so upsert always replaces the same file
      const filePath = `${user.id}/avatar_image`;
      
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { 
        upsert: true,
        contentType: file.type 
      });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const urlWithCacheBuster = `${publicUrl}?t=${Date.now()}`;
      
      // Use UPSERT instead of UPDATE to ensure the record is created if it doesn't exist
      // Removed updated_at to prevent schema cache errors
      const { error: dbError } = await supabase
        .from('profiles')
        .upsert({ 
          id: user.id, 
          avatar_url: urlWithCacheBuster
        }, { onConflict: 'id' });

      if (dbError) throw dbError;
      
      setProfile((prev: any) => ({ ...prev, avatar_url: urlWithCacheBuster }));
      showToast("Photo Updated Successfully");
    } catch (err: any) { showToast(err.message, "error"); } finally { setIsUploading(false); }
  };
const handleBoardFileUpload = async (files: FileList) => {
    if (!files || !user || !supabase) return [];
    const uploadedUrls = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const filePath = `board/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from('board_attachments').upload(filePath, file);
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from('board_attachments').getPublicUrl(filePath);
        uploadedUrls.push(publicUrl);
      }
    }
    return uploadedUrls;
  };

  const handlePollFileUpload = async (files: FileList) => {
    if (!files || !user || !supabase) return;
    setIsUploading(true);
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Clean the filename and add a timestamp to prevent duplicates
      const cleanFileName = file.name.replace(/[^\x00-\x7F]/g, ""); 
      const filePath = `${Date.now()}_${cleanFileName}`;
      
      const { error: uploadError } = await supabase.storage.from('poll_attachments').upload(filePath, file);
      
      if (uploadError) {
        showToast(uploadError.message, 'error');
        continue;
      }

      const { data: { publicUrl } } = supabase.storage.from('poll_attachments').getPublicUrl(filePath);
      setStagedPollFiles(prev => [...prev, { url: publicUrl, name: file.name }]);
    }
    setIsUploading(false);
  };
  
const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsVerifying(true);
    const fd = new FormData(e.currentTarget);
    
    const lastName = fd.get('lastName') as string;
    const voterId = fd.get('voterId') as string;
    const dob = fd.get('dob') as string;

    // Logic: Voter ID is mandatory. User must also provide EITHER Last Name OR DOB.
    if (!voterId) return showToast("Voter ID is required", "error");
    if (!lastName && !dob) return showToast("Please provide Last Name or Date of Birth", "error");

    try {
      const verifyRes = await fetch('/.netlify/functions/verify-voter', { 
        method: 'POST', 
        body: JSON.stringify({ lastName, voterId, dob }) 
      });
      
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        setNotFoundModal(true);
        setIsVerifying(false);
        return;
      }
      
      const { error } = await supabase!.auth.signUp({ 
        email: fd.get('email') as string, 
        password: fd.get('password') as string, 
        options: { 
          data: { 
            full_name: verifyData.fullName, 
            district: verifyData.district, 
            voter_id: voterId 
          } 
        } 
      });

      if (error) throw error;
      showToast("Verification Successful! Check email.");
      setCurrentPage('login');
    } catch (err: any) { 
      showToast(err.message, "error"); 
    } finally { 
      setIsVerifying(false); 
    }
  };
  const handleReaction = async (commentId: string, type: 'like' | 'dislike', table: 'comment_reactions' | 'suggestion_reactions' = 'comment_reactions') => {
    if (!user || !supabase) return setCurrentPage('login');
    const { error } = await supabase.from(table).upsert({ comment_id: commentId, user_id: user.id, reaction_type: type }, { onConflict: 'comment_id,user_id' });
    if (error) {
      showToast("Reaction failed", "error");
    } else {
      if (table === 'comment_reactions') fetchPolls();
      else fetchSuggestions();
    }
  };

  const confirmVote = async () => {
    if (!pendingVote || !supabase || !user) return;
    
    // Ensure we are sending a strict primitive boolean to the database
    const cleanVotePayload = {
      poll_id: pendingVote.pollId,
      option_id: pendingVote.optionId,
      user_id: user.id,
      is_anonymous: pendingVote.isAnonymous === true
    };

    const { error } = await supabase
      .from('poll_votes')
      .upsert(cleanVotePayload, { onConflict: 'poll_id,user_id' });

    if (error) {
      showToast(error.message, 'error');
    } else {
      showToast("Vote recorded successfully");
      // Wait for fetchPolls to complete to ensure UI state is fresh
      await fetchPolls();
    }
    setPendingVote(null);
  };

  const handleClosePoll = async (pollId: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('polls').update({ expires_at: new Date().toISOString() }).eq('id', pollId);
    if (error) showToast(error.message, "error"); else { showToast("Poll Closed Early"); fetchPolls(); }
  };

  const handleUpdateSuggestionStatus = async (suggestionId: string, status: string) => {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from('suggestions')
        .update({ status: status })
        .eq('id', suggestionId);

      if (error) throw error;

      // Patch local state immediately for instant UI feedback in both Admin and Suggestions views
      setSuggestions(prev => prev.map(s => s.id === suggestionId ? { ...s, status } : s));
      
      showToast(`Status updated to ${status}`);
      
      // Re-fetch to ensure all joined data (comments, profiles) is fully synced
      await fetchSuggestions();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleDeletePoll = async (pollId: string) => {
    if (!supabase || !user || !profile?.is_admin) return;
    
    try {
      // 1. Record/Update the admin's vote for deletion
      const { error: voteErr } = await supabase
        .from('admin_deletion_votes')
        .upsert({ target_id: pollId, target_type: 'poll', admin_id: user.id }, { onConflict: 'target_id,admin_id' });

      if (voteErr) throw voteErr;

      // 2. Fetch fresh votes to check consensus
      const { data: currentVotesData } = await supabase.from('admin_deletion_votes').select('*').eq('target_id', pollId);
      const totalAdmins = allUsers.filter(u => u.is_admin).length;
      const currentVoteCount = currentVotesData?.length || 0;

      if (currentVoteCount >= totalAdmins) {
        if (window.confirm(`Consensus reached (${currentVoteCount}/${totalAdmins} admins). Finalize permanent deletion?`)) {
          const { error: delErr } = await supabase.from('polls').delete().eq('id', pollId);
          if (delErr) throw delErr;
          
          showToast("Consensus met: Poll deleted");
          fetchPolls();
          fetchDeletionVotes();
          if (selectedPoll?.id === pollId) setSelectedPoll(null);
        } else {
          fetchDeletionVotes();
        }
      } else {
        showToast(`Delete vote recorded (${currentVoteCount}/${totalAdmins} admins)`);
        fetchDeletionVotes();
      }
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const filteredMessages = useMemo(() => {
    const messages = boardMessages || [];
    if (!searchQuery) return messages;
    const q = searchQuery.toLowerCase();
    return messages.filter(m => {
      const authorName = m.profiles?.full_name || 'Verified Voter';
      const content = m.content || '';
      const recipients = m.recipient_names || '';
      return authorName.toLowerCase().includes(q) || 
             content.toLowerCase().includes(q) || 
             recipients.toLowerCase().includes(q);
    });
  }, [boardMessages, searchQuery]);

  // --- RENDER HELPERS (RESTORING THREADED COMMENTS) ---
  const renderSuggestionComments = (comments: any[], suggestionId: string, parentId: string | null = null, depth = 0) => {
    return (comments || []).filter(c => c.parent_id === parentId).map(comment => {
      const reactions = comment.suggestion_reactions || [];
      const likes = reactions.filter((r: any) => r.reaction_type === 'like').length;
      const dislikes = reactions.filter((r: any) => r.reaction_type === 'dislike').length;
      const userReaction = reactions.find((r: any) => r.user_id === user?.id)?.reaction_type;
      return (
        <div key={comment.id} className={`${depth > 0 ? 'ml-4 mt-2 border-l-2 border-indigo-50 pl-3' : 'bg-white p-3 rounded-xl mb-2 border border-gray-100'}`}>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
               <UserAvatar url={comment.profiles?.avatar_url} size="sm" />
               <span className="text-[10px] font-black uppercase text-indigo-600">
                {comment.profiles?.full_name} • {formatDate(comment.created_at)}
               </span>
            </div>
            <div className="text-gray-700 text-sm md:text-base leading-snug break-words whitespace-pre-wrap font-medium">{comment.content}</div>
            <div className="flex gap-4 mt-2 text-[10px] font-black uppercase">
              <button onClick={() => handleReaction(comment.id, 'like', 'suggestion_reactions')} className={userReaction === 'like' ? 'text-indigo-600' : 'text-gray-400'}>
                <i className="fa-solid fa-thumbs-up"></i> {likes}
              </button>
              <button onClick={() => handleReaction(comment.id, 'dislike', 'suggestion_reactions')} className={userReaction === 'dislike' ? 'text-red-500' : 'text-gray-400'}>
                <i className="fa-solid fa-thumbs-down"></i> {dislikes}
              </button>
              <button onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)} className="text-gray-400 hover:text-indigo-600 transition-colors">Reply</button>
            </div>
            {replyTo === comment.id && (
              <form onSubmit={async (e) => { 
                e.preventDefault(); 
                const fd = new FormData(e.currentTarget); 
                await supabase?.from('suggestion_comments').insert({ suggestion_id: suggestionId, user_id: user.id, content: fd.get('content'), parent_id: comment.id }); 
                setReplyTo(null); 
                fetchSuggestions(); 
              }} className="mt-2 flex gap-2">
                <input name="content" autoFocus placeholder="Reply..." className="flex-grow p-3 bg-gray-50 rounded-lg text-sm outline-none border border-gray-200" />
                <button type="submit" className="bg-indigo-600 text-white px-4 py-1 rounded-lg text-[10px] font-black uppercase">Send</button>
              </form>
            )}
          </div>
          {renderSuggestionComments(comments, suggestionId, comment.id, depth + 1)}
        </div>
      );
    });
  };

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
                {comment.profiles?.full_name || 'Verified Voter'} • Dist {comment.profiles?.district || '?'} • {formatDate(comment.created_at)}
               </span>
            </div>
            <div className="text-gray-800 text-sm leading-relaxed break-words whitespace-pre-wrap">{renderTextWithLinks(comment.content)}</div>
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
        <iframe src={activeDashboard.folderPath} className="w-full h-full border-0" title="Dashboard" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col font-sans overflow-hidden relative">
      {toast && <Toast message={toast.message} type={toast.type} />}

      {/* --- VOTER NOT FOUND / MANUAL REQUEST MODAL --- */}
      {notFoundModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[400] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden animate-slide-up">
            <div className="p-10 text-center space-y-6">
              <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto border-4 border-dashed border-amber-100">
                <i className="fa-solid fa-user-magnifying-glass text-3xl"></i>
              </div>
              <div className="space-y-4">
                <h3 className="text-2xl font-black uppercase text-gray-900">Information Not Found</h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  We're sorry. Your information was not found in our current copy of the voter registry. 
                  This application is maintained by an all volunteer group of Moore County citizens and we have to manually update the voter registry.
                </p>
                <p className="text-indigo-600 font-black uppercase text-[10px] tracking-widest bg-indigo-50 py-3 rounded-2xl">
                  Send us your contact information and we'll be happy to get you full access. You'll receive an email confirmation once we have verified that you are registered to vote in Moore County, TN.
                </p>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                setIsSubmittingRequest(true);
                const fd = new FormData(e.currentTarget);
                const { error } = await supabase!.from('manual_access_requests').insert({
                  first_name: fd.get('fname'),
                  last_name: fd.get('lname'),
                  dob: fd.get('dob'),
                  ssn_last_four: fd.get('ssn'),
                  email: fd.get('email'),
                  status: 'Pending'
                });
                if (error) {
                  showToast(error.message, 'error');
                } else {
                  showToast("Verification Request Sent Successfully");
                  // Explicitly close modal and reset verifying state
                  setNotFoundModal(false);
                  setIsVerifying(false);
                  // Refresh data in case an admin is viewing
                  if (profile?.is_admin) fetchManualRequests();
                }
                setIsSubmittingRequest(false);
              }} className="grid grid-cols-2 gap-4 text-left">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-gray-400 ml-2">First Name</label>
                  <input name="fname" required className="w-full p-4 bg-gray-50 rounded-xl border border-gray-100 text-xs font-bold outline-none focus:ring-2 ring-indigo-500/20" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-gray-400 ml-2">Last Name</label>
                  <input name="lname" required className="w-full p-4 bg-gray-50 rounded-xl border border-gray-100 text-xs font-bold outline-none focus:ring-2 ring-indigo-500/20" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-gray-400 ml-2">Date of Birth</label>
                  <input name="dob" type="date" required className="w-full p-4 bg-gray-50 rounded-xl border border-gray-100 text-xs font-bold outline-none focus:ring-2 ring-indigo-500/20" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-gray-400 ml-2">Last 4 SSN</label>
                  <input name="ssn" maxLength={4} pattern="\d{4}" placeholder="0000" required className="w-full p-4 bg-gray-50 rounded-xl border border-gray-100 text-xs font-bold outline-none focus:ring-2 ring-indigo-500/20" />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-[9px] font-black uppercase text-gray-400 ml-2">Email Address</label>
                  <input name="email" type="email" required className="w-full p-4 bg-gray-50 rounded-xl border border-gray-100 text-xs font-bold outline-none focus:ring-2 ring-indigo-500/20" />
                </div>
                <div className="col-span-2 pt-4 flex gap-3">
                  <button type="submit" disabled={isSubmittingRequest} className="flex-grow py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl shadow-indigo-100">
                    {isSubmittingRequest ? <i className="fa-solid fa-spinner animate-spin"></i> : "Send Request"}
                  </button>
                  <button type="button" onClick={() => setNotFoundModal(false)} className="px-8 py-5 bg-gray-100 text-gray-400 rounded-2xl font-black uppercase text-xs">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* --- POLL LOGIN REDIRECT MODAL --- */}
      {showPollLoginModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[300] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-10 text-center relative animate-slide-up">
            <button onClick={() => setShowPollLoginModal(false)} className="absolute top-6 right-6 text-gray-300 hover:text-red-500 transition-colors">
              <i className="fa-solid fa-circle-xmark text-2xl"></i>
            </button>
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-200 text-3xl border-4 border-dashed border-gray-100">
              <i className="fa-solid fa-lock"></i>
            </div>
            <h3 className="text-xl font-black uppercase text-gray-900 mb-2">Verification Required</h3>
            <p className="text-gray-400 font-bold uppercase text-[10px] mb-8 tracking-widest leading-relaxed px-4">
              You must be a verified Moore County voter to participate in community polls.
            </p>
            <div className="space-y-3">
              <button 
                onClick={() => { setShowPollLoginModal(false); setCurrentPage('login'); }}
                className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl shadow-indigo-100 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Login to Vote
              </button>
              <button 
                onClick={() => { setShowPollLoginModal(false); setCurrentPage('signup'); }}
                className="w-full py-2 text-gray-400 font-black uppercase text-[10px] hover:text-indigo-600 transition-colors"
              >
                Register as a Voter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- VOTER REGISTRY MODAL --- */}
      {registryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[250] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight">Voter Registry</h3>
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{registryModal.optionText}</p>
              </div>
              <button onClick={() => setRegistryModal(null)} className="text-gray-300 hover:text-red-500 transition-colors">
                <i className="fa-solid fa-circle-xmark text-2xl"></i>
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-3 custom-scrollbar">
              {registryModal.voters.map((v: any, i: number) => {
                // 1. Robust privacy check: handle booleans or stringified booleans from DB
                const isShielded = v.is_anonymous === true || v.is_anonymous === 'true';
                
                // 2. Extract profile data
                const voterProfile = Array.isArray(v.profiles) ? v.profiles[0] : v.profiles;
                
                // 3. Determine Display Attributes
                const displayName = isShielded 
                  ? "Verified Voter" 
                  : (voterProfile?.full_name || "Verified Voter");

                const avatarUrl = isShielded ? undefined : voterProfile?.avatar_url;
                const district = voterProfile?.district || "???";

                return (
                  <div key={i} className="flex items-center gap-4 p-5 bg-gray-50 rounded-[2rem] border border-transparent hover:border-indigo-100 transition-all group">
                    <UserAvatar 
                      url={avatarUrl} 
                      isAnonymous={isShielded} 
                      size="md" 
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-gray-900 uppercase tracking-tight">
                        {displayName}
                      </span>
                      <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest opacity-70">
                        District {district}
                      </span>
                    </div>
                    {isShielded && (
                      <div className="ml-auto flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100">
                        <i className="fa-solid fa-user-shield text-indigo-600 text-[10px]"></i>
                        <span className="text-[8px] font-black uppercase text-gray-400">Private</span>
                      </div>
                    )}
                  </div>
                );
              })}
              {registryModal.voters.length === 0 && (
                <div className="text-center py-10">
                  <p className="text-[10px] font-black uppercase text-gray-400">No public records for this option.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- PENDING VOTE MODAL --- */}
      {pendingVote && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 space-y-6 animate-slide-up">
            <div className="text-center space-y-2">
              <h3 className="text-xl font-black uppercase">{(pendingVote as any).isChanging ? "Change Your Vote?" : "Confirm Your Vote"}</h3>
              {(pendingVote as any).isChanging && (
                <p className="bg-amber-50 text-amber-600 text-[9px] font-black uppercase py-2 px-4 rounded-full inline-block border border-amber-100">
                  <i className="fa-solid fa-triangle-exclamation mr-1"></i> This will replace your previous vote
                </p>
              )}
            </div>
            
            <p className="text-center text-gray-500 text-sm leading-tight px-4">
              You are selecting: <br/>
              <span className="text-indigo-600 font-black uppercase text-xs break-words whitespace-normal block mt-1">"{pendingVote.optionText}"</span>
            </p>

            <div className="space-y-4">
              <div className="bg-gray-50 p-6 rounded-2xl flex items-center justify-between">
                 <div className="flex flex-col">
                   <span className="text-[10px] font-black uppercase leading-none">Vote Anonymously?</span>
                   <span className="text-[8px] font-bold text-gray-400 uppercase mt-1">Hide name from registry</span>
                 </div>
                 <button onClick={() => setPendingVote({...pendingVote, isAnonymous: !pendingVote.isAnonymous})} className={`w-12 h-6 rounded-full relative transition-colors ${pendingVote.isAnonymous ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                   <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${pendingVote.isAnonymous ? 'left-7' : 'left-1'}`}></div>
                 </button>
              </div>
              <div className="text-center border-t border-gray-100 pt-4">
                <p className="text-[8px] font-black uppercase text-gray-400 mb-1">Registry Preview:</p>
                <p className="text-[10px] font-black uppercase text-indigo-600 flex items-center justify-center gap-2">
                  {pendingVote.isAnonymous ? (
                    <><i className="fa-solid fa-user-shield"></i> Verified Voter</>
                  ) : (
                    <><i className="fa-solid fa-circle-user"></i> {profile?.full_name}</>
                  )}
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <button onClick={confirmVote} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl shadow-indigo-200 hover:scale-[1.02] active:scale-[0.98] transition-all">
                {(pendingVote as any).isChanging ? "Continue & Update Vote" : "Submit Vote"}
              </button>
              <button onClick={() => setPendingVote(null)} className="w-full py-2 text-gray-400 font-black uppercase text-[10px] hover:text-gray-600 transition-colors">
                Cancel
              </button>
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
              
              <div className="pt-8 mt-8 border-t border-gray-100 space-y-4">
                {user ? (
                  <button 
                    onClick={() => { supabase?.auth.signOut(); setIsMenuOpen(false); }} 
                    className="text-xl font-black uppercase block text-red-500 hover:text-red-700 transition-colors"
                  >
                    Log Out
                  </button>
                ) : (
                  <>
                    <button 
                      onClick={() => { setCurrentPage('login'); setIsMenuOpen(false); }} 
                      className="text-xl font-black uppercase block text-indigo-600"
                    >
                      Login
                    </button>
                    <button 
                      onClick={() => { setCurrentPage('signup'); setIsMenuOpen(false); }} 
                      className="text-xl font-black uppercase block text-gray-400"
                    >
                      Register
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="flex-grow overflow-y-auto container mx-auto px-4 py-8 custom-scrollbar">
        {currentPage === 'home' && !selectedCategory && (
          <div className="max-w-4xl mx-auto space-y-12 py-10">
            <h1 className="text-4xl md:text-6xl font-black text-gray-900 uppercase tracking-tighter text-center">Moore Transparency</h1>
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
{/* --- NEW SECTION: REPORT SELECTION LIST --- */}
        {currentPage === 'home' && selectedCategory && (
          <div className="max-w-4xl mx-auto space-y-8 py-10 animate-slide-up">
            <button onClick={() => setSelectedCategory(null)} className="text-[10px] font-black uppercase text-gray-400 hover:text-indigo-600 transition-colors">
              <i className="fa-solid fa-arrow-left mr-2"></i> Back to Main Menu
            </button>
            
            <div className="flex flex-col">
              <h2 className="text-4xl font-black uppercase text-gray-900 leading-tight">
                {CATEGORIES.find(c => c.id === selectedCategory)?.label}
              </h2>
              <p className="text-indigo-600 font-bold text-[10px] uppercase tracking-widest">Select a report to view official records</p>
            </div>

            <div className="grid grid-cols-1 gap-4 mt-8">
              {DASHBOARDS.filter(dash => dash.category === selectedCategory).map(dash => (
                <div 
                  key={dash.id} 
                  onClick={() => setActiveDashboard(dash as any)}
                  className="bg-white p-8 rounded-[2.5rem] border-2 border-transparent hover:border-indigo-600 cursor-pointer shadow-sm hover:shadow-xl transition-all flex justify-between items-center group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-black uppercase text-gray-900 group-hover:text-indigo-600">{dash.title}</h3>
                      {dash.status && <span className="px-2 py-0.5 bg-gray-100 text-[8px] font-black uppercase rounded text-gray-500">{dash.status}</span>}
                    </div>
                    <p className="text-gray-400 text-xs font-medium">{dash.description}</p>
                  </div>
                  <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                    <i className="fa-solid fa-chevron-right"></i>
                  </div>
                </div>
              ))}
              
              {/* Message if no reports exist in this category */}
              {DASHBOARDS.filter(dash => dash.category === selectedCategory).length === 0 && (
                <div className="p-20 text-center bg-white rounded-[3rem] border-4 border-dashed border-gray-100">
                  <i className="fa-solid fa-folder-open text-gray-200 text-4xl mb-4"></i>
                  <p className="text-gray-400 font-black uppercase text-xs">No reports have been uploaded for this category yet.</p>
                </div>
              )}
            </div>
          </div>
        )}
        {currentPage === 'polls' && !selectedPoll && (
          <div className="max-w-4xl mx-auto space-y-8 animate-slide-up">
            <div className="flex flex-col md:flex-row justify-between items-end gap-6">
              <div>
                <h2 className="text-4xl font-black uppercase tracking-tighter">Community Polls</h2>
                <p className="text-indigo-600 font-bold text-[10px] uppercase tracking-widest">Voice your opinion on county decisions</p>
              </div>
              <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100">
                <button 
                  onClick={() => setPollFilter('active')}
                  className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${pollFilter === 'active' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400'}`}
                >
                  Active
                </button>
                <button 
                  onClick={() => setPollFilter('completed')}
                  className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${pollFilter === 'completed' ? 'bg-gray-900 text-white shadow-lg' : 'text-gray-400'}`}
                >
                  Completed
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {polls
                .filter(poll => {
                  const isExpired = new Date(poll.expires_at) < new Date();
                  return pollFilter === 'active' ? !isExpired : isExpired;
                })
                .map(poll => {
                  const voted = poll.poll_votes?.some((v: any) => v.user_id === user?.id);
                  const isExpired = new Date(poll.expires_at) < new Date();
                  return (
                    <div key={poll.id} onClick={() => setSelectedPoll(poll)} className="bg-white p-8 rounded-[2.5rem] shadow-sm border hover:shadow-lg transition-all cursor-pointer flex flex-col sm:flex-row justify-between items-center gap-6 group">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-2xl font-black uppercase break-words group-hover:text-indigo-600 transition-colors">{poll.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-gray-400 text-[10px] font-black uppercase">{poll.poll_votes?.length || 0} Votes</p>
                          <span className="text-gray-200 text-[10px]">•</span>
                          <p className={`${isExpired ? 'text-gray-400' : 'text-red-500'} text-[10px] font-black uppercase`}>
                            <i className="fa-regular fa-clock mr-1"></i>
                            {isExpired ? `Closed ${formatDate(poll.expires_at)}` : `Ends ${formatDate(poll.expires_at)}`}
                          </p>
                        </div>
                      </div>
                      <button className={`px-8 py-4 rounded-xl font-black uppercase text-[10px] whitespace-nowrap ${voted || isExpired ? 'bg-gray-100 text-gray-500' : 'bg-indigo-600 text-white shadow-indigo-200 shadow-lg'}`}>
                        {isExpired ? 'Final Results' : voted ? 'View Results' : 'Vote & Discuss'}
                      </button>
                    </div>
                  );
                })}
              
              {polls.filter(poll => {
                const isExpired = new Date(poll.expires_at) < new Date();
                return pollFilter === 'active' ? !isExpired : isExpired;
              }).length === 0 && (
                <div className="p-20 text-center bg-white rounded-[3rem] border-4 border-dashed border-gray-100">
                   <p className="text-gray-300 font-black uppercase text-xs italic">No {pollFilter} polls found.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {currentPage === 'polls' && selectedPoll && (
          <div className="max-w-4xl mx-auto space-y-8 pb-20">
            <button onClick={() => setSelectedPoll(null)} className="text-[10px] font-black uppercase text-gray-400 hover:text-indigo-600 transition-colors"><i className="fa-solid fa-arrow-left mr-2"></i> All Polls</button>
            <div className="bg-white p-10 md:p-16 rounded-[3rem] shadow-xl space-y-10 border border-gray-100">
              <div className="space-y-4">
                <h2 className="text-3xl md:text-5xl font-black uppercase leading-tight tracking-tighter text-gray-900 break-words">{selectedPoll.title}</h2>
                {selectedPoll.description && (
                  <div className="space-y-4">
                    <p className="text-gray-500 text-sm md:text-base leading-relaxed font-medium bg-gray-50 p-8 rounded-[2.5rem] break-words whitespace-pre-wrap">
                      {selectedPoll.description}
                    </p>
                    {selectedPoll.attachments?.length > 0 && (
                      <div className="flex flex-wrap gap-3">
                        {selectedPoll.attachments.map((url: string, i: number) => (
                          <a key={i} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-3 px-5 py-3 bg-white border-2 border-gray-100 rounded-2xl hover:border-indigo-600 transition-all group">
                            <i className="fa-solid fa-file-invoice text-indigo-600"></i>
                            <span className="text-[10px] font-black uppercase text-gray-400 group-hover:text-indigo-600">View Reference {i + 1}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-8">
                {selectedPoll.poll_options?.map((opt: any) => {
                  const votes = selectedPoll.poll_votes?.filter((v: any) => v.option_id === opt.id) || [];
                  const totalVotes = selectedPoll.poll_votes?.length || 0;
                  const percent = totalVotes ? Math.round((votes.length / totalVotes) * 100) : 0;
                  const existingVote = selectedPoll.poll_votes?.find((v: any) => v.user_id === user?.id);
                  const isCurrentSelection = existingVote?.option_id === opt.id;
                  const isExpired = new Date(selectedPoll.expires_at) < new Date();
                  
                  // THIS LINE BELOW FIXES THE ERROR:
                  const hasVotedAny = selectedPoll.poll_votes?.some((v: any) => v.user_id === user?.id);

                  return (
                    <div key={opt.id} className="space-y-3">
                      <button 
                        disabled={isExpired || isCurrentSelection}
                        onClick={() => {
                          if (!user) {
                            setShowPollLoginModal(true);
                            return;
                          }
                          // Find the user's current vote for THIS poll (regardless of which option)
                          const userExistingVote = selectedPoll.poll_votes?.find((v: any) => v.user_id === user?.id);
                          
                          setPendingVote({ 
                            pollId: selectedPoll.id, 
                            optionId: opt.id, 
                            optionText: opt.text, 
                            // Inherit previous privacy preference using strict boolean/string check
                            isAnonymous: userExistingVote 
                              ? (userExistingVote.is_anonymous === true || userExistingVote.is_anonymous === 'true') 
                              : false,
                            isChanging: !!userExistingVote 
                          } as any);
                        }} 
                        className={`w-full text-left p-6 rounded-[2rem] border-2 relative overflow-hidden flex justify-between items-start gap-4 transition-all ${isCurrentSelection ? 'border-indigo-600 ring-4 ring-indigo-600/10' : 'border-gray-100 hover:border-indigo-200'}`}
                      >
                        {(existingVote || isExpired) && <div className="absolute inset-y-0 left-0 bg-indigo-50 transition-all duration-1000" style={{ width: `${percent}%` }}></div>}
                        <span className="relative z-10 text-xs font-black uppercase flex-1 break-words whitespace-normal leading-tight">{opt.text}</span>
                        {(existingVote || isExpired) && (
                          <div className="relative z-10 text-right shrink-0">
                            <span className="text-sm font-black text-indigo-600">{percent}%</span>
                            <span className="block text-[8px] font-bold text-gray-400 uppercase">({votes.length} Votes)</span>
                          </div>
                        )}
                      </button>
                      
                      {/* Now that hasVotedAny is defined, this section will work */}
                      {(hasVotedAny || isExpired) && votes.length > 0 && (
                        <div className="flex items-center gap-2 px-2 cursor-pointer" onClick={() => setRegistryModal({ optionText: opt.text, voters: votes })}>
                          <div className="flex -space-x-2">
                            {votes.slice(0, 5).map((v: any, i: number) => (
                              <UserAvatar 
                                key={i} 
                                url={(v.is_anonymous === true || v.is_anonymous === 'true') ? undefined : v.profiles?.avatar_url} 
                                isAnonymous={v.is_anonymous === true || v.is_anonymous === 'true'} 
                                size="sm" 
                              />
                            ))}
                          </div>
                          {votes.length > 5 && <span className="text-[9px] font-black text-gray-400">+ {votes.length - 5} More</span>}
                          <span className="text-[8px] font-black text-indigo-400 uppercase ml-auto">View Registry</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="pt-10 border-t">
                <h4 className="text-[10px] font-black uppercase text-indigo-600 mb-6 tracking-widest">Community Discussion</h4>
                {user ? (
                   <form onSubmit={async (e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); await supabase?.from('poll_comments').insert({ poll_id: selectedPoll.id, user_id: user.id, content: fd.get('content') }); (e.target as HTMLFormElement).reset(); fetchPolls(); }} className="mb-8 flex gap-2">
                     <input name="content" required placeholder="Add a comment..." className="flex-grow p-4 bg-gray-50 rounded-2xl text-xs outline-none" />
                     <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-2xl text-[10px] font-black uppercase">Post</button>
                   </form>
                ) : (
                  <button onClick={() => setCurrentPage('login')} className="w-full py-4 border-2 border-dashed rounded-2xl text-[10px] font-black uppercase text-gray-400 mb-8">Login to Comment</button>
                )}
                {renderComments(selectedPoll.poll_comments || [], selectedPoll.id)}
              </div>
            </div>
          </div>
        )}

        {currentPage === 'board' && (
          <div className="max-w-7xl mx-auto pb-20 animate-slide-up">
            <div className="flex flex-col-reverse lg:flex-row gap-8">
              
              {/* --- LEFT SIDE: PUBLIC RECORD FEED --- */}
              <div className="lg:w-2/3 space-y-6">
                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                      <h2 className="text-4xl font-black uppercase tracking-tighter leading-none">Public Record</h2>
                      <p className="text-indigo-600 font-bold text-[10px] uppercase mt-1">Official Community Correspondence</p>
                    </div>
                    <div className="relative w-full md:w-72">
                      <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 text-xs"></i>
                      <input 
                        value={searchQuery} 
                        onChange={(e) => setSearchQuery(e.target.value)} 
                        placeholder="SEARCH RECORDS..." 
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-[10px] font-black uppercase outline-none focus:ring-2 ring-indigo-500/20 transition-all" 
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 h-[60vh] lg:h-[75vh] overflow-y-auto pr-2 custom-scrollbar">
                  {filteredMessages.filter(m => !m.parent_id).map((msg) => (
                    <div key={msg.id} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-4">
                          <UserAvatar url={msg.profiles?.avatar_url} size="md" />
                          <div>
                            <p className="text-sm font-black uppercase leading-none">{msg.profiles?.full_name}</p>
                            <p className="text-[10px] font-bold text-indigo-600 uppercase">District {msg.profiles?.district} • {formatDate(msg.created_at)}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1 justify-end max-w-[250px]">
                          {msg.recipient_names?.split(', ').map((name: string) => (
                            <span key={name} className="px-2 py-1 bg-gray-50 rounded text-[8px] font-black uppercase text-gray-400 border">{name}</span>
                          ))}
                        </div>
                      </div>
                      
                      <div className="text-gray-800 text-base leading-relaxed break-words whitespace-pre-wrap mb-6">{renderTextWithLinks(msg.content)}</div>
                      
                      {/* Attachments Section */}
                      {msg.attachment_urls?.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-6 p-4 bg-gray-50 rounded-2xl">
                          {msg.attachment_urls.map((url: string, i: number) => (
                            <a key={i} href={url} target="_blank" rel="noreferrer" className="px-4 py-2 bg-white border border-gray-200 text-indigo-600 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-indigo-600 hover:text-white transition-all">
                              <i className="fa-solid fa-file-pdf"></i> Attachment {i + 1}
                            </a>
                          ))}
                        </div>
                      )}

                      {/* Official Replies (Display Only) */}
                      {boardMessages.filter(reply => reply.parent_id === msg.id).map(reply => (
                        <div key={reply.id} className="mt-8 p-8 bg-indigo-50/50 rounded-[2.5rem] border-l-8 border-indigo-600 relative ring-1 ring-indigo-100">
                          <div className="absolute -top-4 left-6 bg-indigo-600 text-white px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-200">
                            <i className="fa-solid fa-circle-check mr-2"></i> Official Response
                          </div>
                          <p className="text-[10px] font-black text-indigo-600 uppercase mb-3 tracking-widest">{formatDate(reply.created_at)}</p>
                          <div className="text-lg text-gray-900 font-semibold leading-relaxed">{renderTextWithLinks(reply.content)}</div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* --- RIGHT SIDE: MESSAGE FORM --- */}
              <div className="lg:w-1/3">
                {user ? (
                  <div className="sticky top-8 bg-indigo-600 p-8 rounded-[3rem] shadow-2xl space-y-6 border-4 border-indigo-500">
                    <div>
                      <h3 className="text-3xl font-black text-white uppercase leading-none">Let's Talk</h3>
                      <p className="text-indigo-200 text-[10px] font-bold uppercase mt-2 tracking-widest">Direct communication with officials</p>
                    </div>

                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget);
                      if (selectedOfficials.length === 0) return showToast("Select at least one official", "error");
                      
                      const fileInput = e.currentTarget.querySelector('input[type="file"]') as HTMLInputElement;
                      const files = fileInput.files;
                      let fileUrls: string[] = [];
                      
                      if (files && files.length > 0) {
                        showToast("Uploading files...", "success");
                        fileUrls = await handleBoardFileUpload(files);
                      }

                      const { error } = await supabase!.from('board_messages').insert({ 
                        user_id: user.id, 
                        content: fd.get('content'), 
                        recipient_names: selectedOfficials.join(', '), 
                        district: profile.district,
                        attachment_urls: fileUrls
                      });

                       if (error) {
                        showToast(error.message, 'error');
                      } else { 
                        showToast("Message Recorded"); 
                        setSelectedOfficials([]); 
                        setSearchQuery(''); // This clears the search filter
                        setIsOfficialDropdownOpen(false);
                        (e.target as HTMLFormElement).reset(); 
                        await fetchBoardMessages(); // This reloads the list
                      }
                    }} className="space-y-4">
                      
                      <div className="relative">
                        <button type="button" onClick={() => setIsOfficialDropdownOpen(!isOfficialDropdownOpen)} className="w-full p-5 bg-indigo-700 text-white rounded-2xl text-left text-xs font-black uppercase flex justify-between items-center border border-indigo-500">
                          <span className="truncate">{selectedOfficials.length > 0 ? `To: ${selectedOfficials.join(', ')}` : "Select Officials"}</span>
                          <i className={`fa-solid fa-chevron-${isOfficialDropdownOpen ? 'up' : 'down'}`}></i>
                        </button>
                        {isOfficialDropdownOpen && (
                          <div className="absolute top-full mt-2 w-full bg-white rounded-[2rem] shadow-2xl z-[60] p-6 grid grid-cols-1 gap-2 border border-gray-100 max-h-[350px] overflow-y-auto">
                            <p className="text-[10px] font-black uppercase text-indigo-600 mb-2 px-2">Select Recipients</p>
                            {OFFICIALS.map(off => (
                              <label key={off.id} className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-xl cursor-pointer">
                                <input type="checkbox" className="mt-1" checked={selectedOfficials.includes(off.name)} onChange={(e) => { if (e.target.checked) setSelectedOfficials([...selectedOfficials, off.name]); else setSelectedOfficials(selectedOfficials.filter(n => n !== off.name)); }} />
                                <div className="flex flex-col">
                                  <span className="text-xs font-black uppercase text-gray-900 leading-tight">{off.name}</span>
                                  <span className="text-[10px] font-bold uppercase text-indigo-600">{off.office}</span>
                                </div>
                              </label>
                            ))}
                            <button type="button" onClick={() => setIsOfficialDropdownOpen(false)} className="py-4 bg-gray-900 text-white rounded-xl text-xs font-black uppercase">Done</button>
                          </div>
                        )}
                      </div>

                      <textarea name="content" required placeholder="What is your message for the public record?" className="w-full p-6 bg-white rounded-[2rem] text-sm min-h-[180px] outline-none placeholder:text-gray-300 focus:ring-4 ring-white/20" />
                      
                      <div className="bg-indigo-700 p-5 rounded-2xl border border-indigo-500">
                        <label className="flex items-center gap-4 cursor-pointer text-white">
                          <div className="bg-white text-indigo-600 w-10 h-10 rounded-full flex items-center justify-center shadow-lg"><i className="fa-solid fa-paperclip"></i></div>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase leading-none">Add Attachments</span>
                            <span className="text-[8px] font-bold text-indigo-300 uppercase mt-1">Images or Documents</span>
                          </div>
                          <input type="file" multiple className="hidden" />
                        </label>
                      </div>

                      <button className="w-full py-6 bg-white text-indigo-600 rounded-3xl font-black uppercase text-xs shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all">Submit to Public Record</button>
                    </form>
                  </div>
                ) : (
                  <div className="bg-white p-12 rounded-[3.5rem] border-4 border-dashed border-gray-100 text-center">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-200 text-3xl"><i className="fa-solid fa-lock"></i></div>
                    <p className="text-gray-900 font-black uppercase text-sm mb-2">Verification Required</p>
                    <p className="text-gray-400 font-bold uppercase text-[9px] mb-6">Login as a verified voter to contact officials</p>
                    <button onClick={() => setCurrentPage('login')} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg">Login / Register</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {/* SUGGESTIONS PAGE */}
        {currentPage === 'suggestions' && (
          <div className="max-w-7xl mx-auto space-y-8 animate-slide-up pb-20">
            <div className="flex justify-between items-end mb-8">
              <div>
                <h2 className="text-5xl font-black uppercase tracking-tighter">Suggestion Box</h2>
                <p className="text-indigo-600 font-bold text-[10px] uppercase tracking-[0.2em]">Community Improvement Proposals</p>
              </div>
              <button className="text-[10px] font-black uppercase text-gray-400 hover:text-indigo-600 transition-all border-b-2 border-transparent hover:border-indigo-600 pb-1">
                Archived Suggestions <i className="fa-solid fa-box-archive ml-1"></i>
              </button>
            </div>

            <div className="relative">
              {/* --- FLOATING TRIGGER BUTTON (Top Left Peeking) --- */}
              <button 
                onClick={() => setIsSuggestionModalOpen(true)}
                className="fixed bottom-8 right-8 lg:bottom-auto lg:right-auto lg:top-24 lg:left-4 z-[100] bg-indigo-600 text-white w-16 h-16 rounded-2xl shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all group"
              >
                <i className="fa-solid fa-plus text-2xl group-hover:rotate-90 transition-transform"></i>
                <span className="absolute left-20 bg-gray-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap hidden lg:block">New Proposal</span>
              </button>

              {/* --- MODAL OVERLAY FOR NEW PROPOSAL --- */}
              {isSuggestionModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                  <div className="bg-indigo-600 w-full max-w-lg rounded-[3rem] shadow-2xl p-8 border-4 border-indigo-500 animate-slide-up">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-white font-black uppercase text-xl">New Proposal</h3>
                      <button onClick={() => setIsSuggestionModalOpen(false)} className="text-indigo-200 hover:text-white transition-colors">
                        <i className="fa-solid fa-circle-xmark text-2xl"></i>
                      </button>
                    </div>
                    {user ? (
                      <form onSubmit={async (e) => {
                        e.preventDefault();
                        const fd = new FormData(e.currentTarget);
                        const suggestionText = fd.get('description');
                        const { error } = await supabase!.from('suggestions').insert({
                          user_id: user.id,
                          title: fd.get('title'),
                          description: suggestionText,
                          content: suggestionText,
                          category: 'General'
                        });
                        if (error) showToast(error.message, 'error');
                        else { 
                          showToast("Proposal Submitted!"); 
                          fetchSuggestions(); 
                          setIsSuggestionModalOpen(false);
                          (e.target as HTMLFormElement).reset(); 
                        }
                      }} className="space-y-4">
                        <textarea name="title" required placeholder="SUMMARY / TITLE" className="w-full p-6 bg-white rounded-2xl text-sm font-black uppercase outline-none shadow-inner resize-none h-24" />
                        <textarea name="description" required placeholder="DETAIL YOUR SUGGESTION..." className="w-full p-6 bg-white rounded-2xl text-base font-medium min-h-[200px] outline-none shadow-inner" />
                        <button className="w-full py-6 bg-white text-indigo-600 rounded-3xl font-black uppercase text-sm shadow-xl hover:scale-[1.02] transition-all">Submit Suggestion</button>
                      </form>
                    ) : (
                      <div className="bg-white p-10 rounded-[2rem] text-center">
                        <p className="text-gray-400 font-black uppercase text-xs mb-4">Verification Required</p>
                        <button onClick={() => { setCurrentPage('login'); setIsSuggestionModalOpen(false); }} className="px-8 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase">Login</button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* --- CENTERED FEED --- */}
              <div className="max-w-4xl mx-auto space-y-6">
                {suggestions.filter(s => (s.suggestion_comments?.length || 0) >= 0).map(sug => (
                  <div key={sug.id} className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col md:flex-row">
                    <div className="p-10 md:w-1/2 border-b md:border-b-0 md:border-r border-gray-50 flex flex-col">
                      <div className="flex items-center gap-4 mb-6">
                        <UserAvatar url={sug.profiles?.avatar_url} size="md" />
                        <div>
                          <p className="text-xs font-black uppercase text-gray-900 leading-none">{sug.profiles?.full_name}</p>
                          <p className="text-[10px] font-bold text-indigo-400 uppercase mt-1">District {sug.profiles?.district} • {formatDate(sug.created_at)}</p>
                        </div>
                      </div>
                      <h4 className="text-2xl font-black uppercase mb-4 leading-tight text-indigo-600 break-words whitespace-normal tracking-tight">{sug.title}</h4>
                      <p className="text-gray-700 text-base md:text-lg font-medium leading-relaxed mb-8 break-words whitespace-pre-wrap">{sug.description}</p>
                      
                      <div className="mt-auto flex items-center gap-3">
                         <span className={`px-4 py-2 rounded-full text-xs font-black uppercase ${
                           sug.status === 'Completed' ? 'bg-green-100 text-green-600' : 
                           sug.status === 'Scheduled' ? 'bg-blue-100 text-blue-600' : 
                           sug.status === 'Closed' ? 'bg-red-100 text-red-600' :
                           'bg-amber-100 text-amber-600'
                         }`}>
                           <i className="fa-solid fa-circle-info mr-1"></i>
                           Status: {sug.status || 'Under Review'}
                         </span>
                      </div>
                    </div>

                    <div className="p-8 md:w-1/2 bg-gray-50/50 flex flex-col h-[500px]">
                      <h5 className="text-xs font-black uppercase text-indigo-400 mb-4 tracking-widest px-2">Engagement Feed</h5>
                      <div className="flex-grow overflow-y-auto custom-scrollbar px-2">
                        {user ? (
                           <form onSubmit={async (e) => { 
                             e.preventDefault(); 
                             const fd = new FormData(e.currentTarget); 
                             await supabase?.from('suggestion_comments').insert({ suggestion_id: sug.id, user_id: user.id, content: fd.get('content') }); 
                             (e.target as HTMLFormElement).reset(); 
                             fetchSuggestions(); 
                           }} className="mb-6 flex gap-3">
                             <input name="content" required placeholder="Add a comment..." className="flex-grow p-4 bg-white rounded-2xl text-sm outline-none border border-gray-200 shadow-sm focus:ring-2 ring-indigo-500/10 transition-all" />
                             <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-2xl text-[10px] font-black uppercase shadow-lg shadow-indigo-100">Post</button>
                           </form>
                        ) : null}
                        {renderSuggestionComments(sug.suggestion_comments || [], sug.id)}
                      </div>
                    </div>
                  </div>
                ))}

                {suggestions.length === 0 && (
                  <div className="p-20 text-center bg-white rounded-[3rem] border-4 border-dashed border-gray-50">
                    <p className="text-gray-300 font-black uppercase text-xs italic">No active proposals yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ADMIN PAGE */}
        {currentPage === 'admin' && profile?.is_admin && (
          <div className="max-w-6xl mx-auto space-y-6 pb-20 animate-slide-up">
            
            {/* --- POLL CREATOR SECTION --- */}
            <section className="bg-white rounded-[2.5rem] shadow-xl border-4 border-indigo-600 overflow-hidden transition-all">
              <button 
                onClick={() => setIsAdminSections(prev => ({...prev, poll: !prev.poll}))}
                className="w-full p-8 flex justify-between items-center hover:bg-indigo-50 transition-colors"
              >
                <div className="text-left">
                  <h2 className="text-2xl font-black uppercase tracking-tighter">Create New Poll</h2>
                  <p className="text-indigo-600 font-bold text-[9px] uppercase tracking-widest">Publish community decision points</p>
                </div>
                <i className={`fa-solid fa-chevron-${isAdminSections.poll ? 'up' : 'down'} text-indigo-600 text-xl`}></i>
              </button>

              {isAdminSections.poll && (
                <div className="p-10 pt-0 border-t border-indigo-50">
                  <div className="mb-8 mt-8">
                    <h2 className="text-3xl font-black uppercase tracking-tighter">Create New Poll</h2>
                    <p className="text-indigo-600 font-bold text-[10px] uppercase tracking-widest">Publish a new community decision point</p>
                  </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const options = [fd.get('opt1'), fd.get('opt2'), fd.get('opt3'), fd.get('opt4')].filter(o => o && o.toString().trim() !== "");
                
                if (options.length < 2) return showToast("Provide at least 2 options", "error");

                try {
                  const attachmentUrls = stagedPollFiles.map(f => f.url);

                  showToast("Publishing Poll...", "success");
                  const expiryDate = new Date(fd.get('expires') as string).toISOString();
                  const { data: poll, error: pErr } = await supabase!.from('polls').insert({ 
                    title: fd.get('title'), 
                    description: fd.get('description'),
                    attachments: attachmentUrls,
                    expires_at: expiryDate,
                    closed_at: expiryDate 
                  }).select().single();
                  
                  if (pErr) throw pErr;

                  const optData = options.map(text => ({ poll_id: poll.id, text }));
                  const { error: oErr } = await supabase!.from('poll_options').insert(optData);
                  
                  if (oErr) throw oErr;

                  showToast("Poll Published Successfully!");
                  setStagedPollFiles([]); // Clear previews
                  (e.target as HTMLFormElement).reset();
                  fetchPolls();
                } catch (err: any) {
                  showToast(err.message, "error");
                }
              }} className="space-y-6">
                
                <div className="grid grid-cols-1 gap-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Poll Question / Title</label>
                      <input name="title" required placeholder="Ex: Proposed Rezoning of District 2" className="w-full p-5 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-indigo-600 outline-none font-bold text-xs transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Expiration Date</label>
                      <input name="expires" type="datetime-local" required className="w-full p-5 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-indigo-600 outline-none font-bold text-xs transition-all" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Context / Description</label>
                    <textarea name="description" placeholder="Provide background information, links, or context for this poll..." className="w-full p-6 bg-gray-50 rounded-[2rem] border-2 border-transparent focus:border-indigo-600 outline-none font-medium text-xs min-h-[150px] transition-all" />
                  </div>

                  <div className="space-y-4">
                    <div className="bg-indigo-50 p-6 rounded-[2rem] border-2 border-dashed border-indigo-200">
                      <label className="flex items-center gap-4 cursor-pointer">
                        <div className="bg-indigo-600 text-white w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg">
                          <i className={`fa-solid ${isUploading ? 'fa-spinner animate-spin' : 'fa-cloud-arrow-up'}`}></i>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black uppercase text-indigo-900">Upload Supporting Documents</span>
                          <span className="text-[9px] font-bold text-indigo-400 uppercase">Photos, PDFs, or site plans</span>
                        </div>
                        <input type="file" onChange={(e) => e.target.files && handlePollFileUpload(e.target.files)} multiple className="hidden" />
                      </label>
                    </div>

                    {/* --- FILE PREVIEW GRID --- */}
                    {stagedPollFiles.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-[2rem]">
                        {stagedPollFiles.map((file, idx) => (
                          <div key={idx} className="relative group bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
                            <button 
                              type="button"
                              onClick={() => setStagedPollFiles(prev => prev.filter((_, i) => i !== idx))}
                              className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full text-[10px] flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
                            >
                              <i className="fa-solid fa-xmark"></i>
                            </button>
                            <div className="aspect-square rounded-xl bg-indigo-50 flex items-center justify-center overflow-hidden mb-2">
                              {file.name.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                                <img src={file.url} alt="Preview" className="w-full h-full object-cover" />
                              ) : (
                                <i className="fa-solid fa-file-pdf text-2xl text-indigo-400"></i>
                              )}
                            </div>
                            <p className="text-[8px] font-black uppercase text-gray-400 truncate px-1">{file.name}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Poll Options (Min 2)</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input name="opt1" required placeholder="OPTION 1" className="p-4 bg-gray-50 rounded-xl border border-gray-100 font-bold uppercase text-[10px]" />
                    <input name="opt2" required placeholder="OPTION 2" className="p-4 bg-gray-50 rounded-xl border border-gray-100 font-bold uppercase text-[10px]" />
                    <input name="opt3" placeholder="OPTION 3 (OPTIONAL)" className="p-4 bg-gray-50 rounded-xl border border-gray-100 font-bold uppercase text-[10px]" />
                    <input name="opt4" placeholder="OPTION 4 (OPTIONAL)" className="p-4 bg-gray-50 rounded-xl border border-gray-100 font-bold uppercase text-[10px]" />
                  </div>
                </div>

                <button type="submit" className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black uppercase text-xs shadow-xl hover:bg-indigo-700 transition-all">
                  Post Poll to Public Portal
                </button>
              </form>
              </div>
              )}
            </section>

            {/* --- USER REGISTRY SECTION --- */}
            <section className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
              <button 
                onClick={() => setIsAdminSections(prev => ({...prev, registry: !prev.registry}))}
                className="w-full p-8 flex justify-between items-center hover:bg-gray-50 transition-colors"
              >
                <div className="text-left flex items-center gap-4">
                  <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter leading-none">Voter Registry</h2>
                    <p className="text-gray-400 font-bold text-base uppercase mt-1">Verified Moore County Users</p>
                  </div>
                  <span className="px-4 py-2 bg-indigo-100 text-indigo-600 rounded-full font-black text-base uppercase">{allUsers.filter(u => !clearedItems.includes(u.id)).length}</span>
                </div>
                <div className="flex items-center gap-4">
                  {clearedItems.length > 0 && <button onClick={(e) => { e.stopPropagation(); setClearedItems([]); }} className="text-base font-black text-indigo-600 uppercase underline">Restore All</button>}
                  <i className={`fa-solid fa-chevron-${isAdminSections.registry ? 'up' : 'down'} text-gray-300 text-xl`}></i>
                </div>
              </button>

              {isAdminSections.registry && (
                <div className="border-t border-gray-50 p-4">
                  <div className="bg-white rounded-[3rem] border border-gray-100 overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 border-b border-gray-100 font-black uppercase text-gray-400 text-base">
                    <tr><th className="p-8">Voter Name</th><th className="p-8">District</th><th className="p-8">Voter ID</th><th className="p-8 text-right">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {allUsers.filter(u => !clearedItems.includes(u.id)).map(u => (
                      <tr key={u.id} className="hover:bg-indigo-50/30 transition-colors group">
                        <td className="p-8 flex items-center gap-4">
                          <UserAvatar url={u.avatar_url} size="md" />
                          <span className="font-black uppercase text-lg text-gray-900">{u.full_name}</span>
                        </td>
                        <td className="p-8 text-base font-bold text-gray-500 uppercase tracking-widest">District {u.district}</td>
                        <td className="p-8 text-base font-mono text-gray-400 font-bold">{u.voter_id}</td>
                        <td className="p-8 text-right">
                          <button onClick={() => toggleClearItem(u.id)} className="px-4 py-2 bg-gray-100 text-gray-500 rounded-xl text-base font-black uppercase hover:bg-gray-200">Clear</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </div>
              )}
            </section>

            {/* --- MANAGE EXISTING POLLS SECTION --- */}
            <section className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
              <button 
                onClick={() => setIsAdminSections(prev => ({...prev, managePolls: !prev.managePolls}))}
                className="w-full p-8 flex justify-between items-center hover:bg-gray-50 transition-colors"
              >
                <div className="text-left flex items-center gap-4">
                  <div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter leading-none">Manage Polls</h2>
                    <p className="text-gray-400 font-bold text-[9px] uppercase mt-1">Archive or delete live community polls</p>
                  </div>
                  <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full font-black text-[9px] uppercase">{polls.length}</span>
                </div>
                <i className={`fa-solid fa-chevron-${isAdminSections.managePolls ? 'up' : 'down'} text-gray-300`}></i>
              </button>

              {isAdminSections.managePolls && (
                <div className="p-8 border-t border-gray-50 bg-gray-50/30">
                  <div className="grid grid-cols-1 gap-6">
                    {polls.filter(p => !clearedItems.includes(p.id)).map(poll => {
                  const isExpired = new Date(poll.expires_at) < new Date();
                  return (
                    <div key={poll.id} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-4 mb-2">
                          <h4 className="font-black uppercase text-lg truncate">{poll.title}</h4>
                          <span className={`px-3 py-1 rounded text-base font-black uppercase ${isExpired ? 'bg-gray-100 text-gray-400' : 'bg-green-100 text-green-600'}`}>
                            {isExpired ? 'Closed' : 'Active'}
                          </span>
                        </div>
                        <p className="text-base font-bold text-gray-400 uppercase">Created {formatDate(poll.created_at)} • {poll.poll_votes?.length || 0} Total Votes</p>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {!isExpired && (
                          <button onClick={() => handleClosePoll(poll.id)} className="px-6 py-3 bg-gray-900 text-white rounded-2xl text-base font-black uppercase hover:bg-gray-800">Close Early</button>
                        )}
                        <button onClick={() => toggleClearItem(poll.id)} className="px-6 py-3 bg-gray-100 text-gray-500 rounded-2xl text-base font-black uppercase">Clear</button>
                        {(() => {
                          const adminList = allUsers.filter(u => u.is_admin);
                          const totalAdmins = adminList.length || 1;
                          const currentVotes = deletionVotes.filter(v => v.target_id === poll.id).length;
                          const progress = (currentVotes / totalAdmins) * 100;
                          const hasVoted = deletionVotes.some(v => v.target_id === poll.id && v.admin_id === user?.id);

                          return (
                            <button 
                              onClick={() => handleDeletePoll(poll.id)}
                              className="relative w-24 h-14 bg-gray-100 rounded-2xl overflow-hidden group transition-all border border-gray-200"
                              title={`${currentVotes} of ${totalAdmins} admins voted to delete`}
                            >
                              {/* Progress Background */}
                              <div 
                                className={`absolute inset-y-0 left-0 transition-all duration-700 ${hasVoted ? 'bg-red-500' : 'bg-red-400'}`}
                                style={{ width: `${progress}%`, opacity: hasVoted ? 0.4 : 0.2 }}
                              ></div>
                              
                              <div className="relative z-10 flex flex-col items-center justify-center h-full">
                                <i className={`fa-solid ${hasVoted ? 'fa-check-to-slot' : 'fa-trash-can'} ${hasVoted ? 'text-red-600' : 'text-gray-400'} text-sm group-hover:scale-110 transition-transform`}></i>
                                <span className="text-[9px] font-black uppercase mt-1 text-gray-600 tracking-tighter">
                                  {currentVotes} / {totalAdmins} ADM
                                </span>
                              </div>
                            </button>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })}
              </div>
              </div>
              )}
            </section>

            {/* --- MANAGE SUGGESTIONS SECTION --- */}
            <section className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
              <button 
                onClick={() => setIsAdminSections(prev => ({...prev, manageSuggestions: !prev.manageSuggestions}))}
                className="w-full p-8 flex justify-between items-center hover:bg-gray-50 transition-colors"
              >
                <div className="text-left flex items-center gap-4">
                  <div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter leading-none">Manage Suggestions</h2>
                    <p className="text-gray-400 font-bold text-[9px] uppercase mt-1">Update proposal status</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full font-black text-[9px] uppercase">{suggestions.length}</span>
                    <span className="px-2 py-0.5 bg-red-500 text-white rounded text-[8px] font-black animate-pulse">NEW</span>
                  </div>
                </div>
                <i className={`fa-solid fa-chevron-${isAdminSections.manageSuggestions ? 'up' : 'down'} text-gray-300`}></i>
              </button>

              {isAdminSections.manageSuggestions && (
                <div className="p-8 border-t border-gray-50 bg-gray-50/30">
                  <div className="grid grid-cols-1 gap-6">
                    {suggestions.filter(s => !clearedItems.includes(s.id)).map(sug => (
                  <div key={sug.id} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <h4 className="font-black uppercase text-lg truncate">{sug.title}</h4>
                        <span className={`px-3 py-1 rounded text-base font-black uppercase ${
                          sug.status === 'Completed' ? 'bg-green-600 text-white shadow-md' : 
                          sug.status === 'Scheduled' ? 'bg-blue-600 text-white shadow-md' : 
                          sug.status === 'Closed' ? 'bg-red-600 text-white shadow-md' :
                          'bg-amber-500 text-white shadow-md'
                        }`}>
                          {sug.status || 'Under Review'}
                        </span>
                      </div>
                      <p className="text-base font-bold text-gray-400 uppercase">By {sug.profiles?.full_name || 'Verified Voter'} • {formatDate(sug.created_at)}</p>
                    </div>
                    
                    <div className="flex flex-wrap gap-3 justify-center items-center">
                      {['Under Review', 'Scheduled', 'Completed', 'Closed'].map((statusOption) => (
                        <button
                          key={statusOption}
                          onClick={() => handleUpdateSuggestionStatus(sug.id, statusOption)}
                          className={`px-4 py-3 rounded-2xl text-base font-black uppercase transition-all ${
                            (sug.status === statusOption || (!sug.status && statusOption === 'Under Review')) 
                              ? 'ring-4 ring-indigo-600 bg-indigo-600 text-white shadow-lg' 
                              : 'bg-white border border-gray-200 text-gray-400 hover:border-indigo-600 hover:text-indigo-600'
                          }`}
                        >
                          {statusOption}
                        </button>
                      ))}
                      <div className="h-10 w-px bg-gray-100 mx-2"></div>
                      <button onClick={() => toggleClearItem(sug.id)} className="px-6 py-3 bg-gray-100 text-gray-500 rounded-2xl text-base font-black uppercase">Clear</button>
                    </div>
                  </div>
                ))}
                {suggestions.length === 0 && (
                  <p className="text-center py-10 text-[10px] font-black uppercase text-gray-300">No suggestions to manage.</p>
                )}
              </div>
              </div>
              )}
            </section>

            {/* --- MANUAL VERIFICATION REQUESTS SECTION --- */}
            <section className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
              <button 
                onClick={() => setIsAdminSections(prev => ({...prev, manualRequests: !prev.manualRequests}))}
                className="w-full p-8 flex justify-between items-center hover:bg-gray-50 transition-colors"
              >
                <div className="text-left flex items-center gap-4">
                  <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter leading-none">Access Requests</h2>
                    <p className="text-gray-400 font-bold text-base uppercase mt-1">Manual registry verification needed</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Filter badge count by clearedItems */}
                    <span className="px-4 py-2 bg-gray-100 text-gray-500 rounded-full font-black text-base uppercase">
                      {manualRequests.filter(r => !clearedItems.includes(r.id)).length}
                    </span>
                    
                    {/* Only show 'Pending' count if visible (not cleared) */}
                    {manualRequests.filter(r => !clearedItems.includes(r.id) && r.status === 'Pending').length > 0 && (
                      <span className="px-4 py-2 bg-amber-100 text-amber-600 rounded-full font-black text-base uppercase animate-pulse">
                        {manualRequests.filter(r => !clearedItems.includes(r.id) && r.status === 'Pending').length} Pending
                      </span>
                    )}
                    
                    {/* Only show 'NEW' badge if visible items exist */}
                    {manualRequests.filter(r => !clearedItems.includes(r.id)).length > 0 && (
                      <span className="px-3 py-1 bg-red-500 text-white rounded text-base font-black animate-pulse uppercase">NEW</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {manualRequests.some(r => clearedItems.includes(r.id)) && (
                    <button onClick={(e) => { e.stopPropagation(); setClearedItems(prev => prev.filter(id => !manualRequests.some(r => r.id === id))); }} className="text-base font-black text-indigo-600 uppercase underline">Restore All</button>
                  )}
                  <i className={`fa-solid fa-chevron-${isAdminSections.manualRequests ? 'up' : 'down'} text-gray-300 text-2xl`}></i>
                </div>
              </button>

              {isAdminSections.manualRequests && (
                <div className="border-t border-gray-50">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-gray-50 border-b border-gray-100 font-black uppercase text-gray-400 text-sm tracking-widest">
                        <tr>
                          <th className="p-6">Applicant</th>
                          <th className="p-6">DOB</th>
                          <th className="p-6">Last 4 SSN</th>
                          <th className="p-6 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {manualRequests.filter(r => !clearedItems.includes(r.id)).map(req => (
                          <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                            <td className="p-8">
                              <p className="font-black uppercase text-lg text-gray-900 leading-none">{req.first_name} {req.last_name}</p>
                              <p className="text-base font-bold text-gray-400 uppercase mt-1">{formatDate(req.created_at)}</p>
                            </td>
                            <td className="p-8 text-base font-bold text-gray-500">{req.dob}</td>
                            <td className="p-8 text-base font-mono font-bold text-gray-400">***-**-{req.ssn_last_four}</td>
                            <td className="p-8 text-right">
                              <div className="flex justify-end items-center gap-4">
                                {req.status === 'Pending' ? (
                                  <>
                                    <button 
                                      onClick={() => setPendingAction({ req, type: 'Confirm' })}
                                      className="px-6 py-3 bg-green-600 text-white rounded-2xl text-base font-black uppercase hover:scale-105 transition-all shadow-md"
                                    >
                                      Confirm
                                    </button>
                                    <button 
                                      onClick={() => setPendingAction({ req, type: 'Deny' })}
                                      className="px-6 py-3 bg-red-600 text-white rounded-2xl text-base font-black uppercase hover:scale-105 transition-all shadow-md"
                                    >
                                      Deny
                                    </button>
                                  </>
                                ) : (
                                  <span className={`px-6 py-3 rounded-2xl text-base font-black uppercase ${req.status === 'Confirmed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {req.status}
                                  </span>
                                )}
                                <button onClick={() => toggleClearItem(req.id)} className="px-6 py-3 bg-gray-100 text-gray-500 rounded-2xl text-base font-black uppercase">Clear</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {manualRequests.length === 0 && (
                          <tr><td colSpan={4} className="p-10 text-center text-[10px] font-black uppercase text-gray-300">No pending requests</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* --- ACTION CONFIRMATION MODAL --- */}
              {pendingAction && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[600] flex items-center justify-center p-4">
                  <div className={`w-full max-w-lg bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-slide-up border-8 ${pendingAction.type === 'Confirm' ? 'border-green-500' : 'border-red-500'}`}>
                    <div className="p-10 text-center space-y-8">
                      <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto text-4xl ${pendingAction.type === 'Confirm' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        <i className={`fa-solid ${pendingAction.type === 'Confirm' ? 'fa-user-check' : 'fa-user-xmark'}`}></i>
                      </div>
                      
                      <div className="space-y-4">
                        <h3 className="text-3xl font-black uppercase text-gray-900 tracking-tighter">Identity Verification</h3>
                        <div className="text-lg text-gray-500 font-medium leading-relaxed">
                          You are about to <span className={pendingAction.type === 'Confirm' ? 'text-green-600 font-black' : 'text-red-600 font-black'}>{pendingAction.type.toUpperCase()}</span> that 
                          <br/><span className="text-2xl font-black text-gray-900 block my-2">"{pendingAction.req.first_name} {pendingAction.req.last_name}"</span> 
                          is a registered Moore County voter.
                        </div>
                        <p className="text-lg text-gray-400 font-black uppercase tracking-widest bg-gray-50 py-3 rounded-2xl border border-gray-100 mt-4">
                          <i className="fa-solid fa-envelope-circle-check mr-2 text-indigo-600"></i>
                          Email will be sent to: <br/>
                          <span className="text-indigo-600 lowercase">{pendingAction.req.email}</span>
                        </p>
                      </div>

                      <div className="flex flex-col gap-3 pt-4">
                        <button 
                          onClick={async () => {
                            const newStatus = pendingAction.type === 'Confirm' ? 'Confirmed' : 'Denied';
                            const { error } = await supabase!.from('manual_access_requests').update({ status: newStatus }).eq('id', pendingAction.req.id);
                            if (error) {
                              showToast(error.message, 'error');
                            } else {
                              // Trigger the Supabase Edge Function to send email via Resend
                              let emailResult = { error: null };
                              if (pendingAction.req.email) {
                                try {
                                  const fullName = `${pendingAction.req.first_name} ${pendingAction.req.last_name}`;
                                  const { error: invokeError } = await supabase!.functions.invoke('send-confirmation', {
                                    body: { 
                                      email: pendingAction.req.email, 
                                      fullName: fullName,
                                      status: newStatus 
                                    }
                                  });
                                  if (invokeError) emailResult.error = invokeError as any;
                                } catch (emailErr: any) {
                                  emailResult.error = emailErr;
                                }
                              }

                              if (emailResult.error) {
                                console.error("Email Service Error:", emailResult.error);
                                showToast(`Saved as ${newStatus}, but email failed.`, "error");
                              } else {
                                showToast(`Account ${newStatus} & User Notified`);
                              }

                              fetchManualRequests();
                            }
                            setPendingAction(null);
                          }}
                          className={`w-full py-6 rounded-3xl font-black uppercase text-lg shadow-xl ${pendingAction.type === 'Confirm' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}
                        >
                          Continue & Notify User
                        </button>
                        <button onClick={() => setPendingAction(null)} className="w-full py-4 text-gray-400 font-black uppercase text-base hover:text-gray-900 transition-colors">
                          Cancel Action
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}

        {/* AUTH PAGES */}
        {currentPage === 'signup' && (
          <div className="max-w-2xl mx-auto py-10 bg-white p-8 md:p-12 rounded-[3rem] shadow-2xl">
            <h2 className="text-3xl font-black uppercase text-indigo-600 text-center mb-2">Voter Verification</h2>
            <p className="text-xs font-black uppercase text-gray-400 text-center mb-10 tracking-widest">Verify identity to participate</p>
            
            <form className="space-y-6" onSubmit={handleSignup}>
              {/* Voter ID Section */}
              <div className="flex flex-col md:flex-row md:items-center gap-4 bg-indigo-50/30 p-2 rounded-[2rem]">
                <div className="flex-grow">
                  <input 
                    name="voterId" 
                    required 
                    placeholder="VOTER ID # (MANDATORY)" 
                    className="w-full p-6 bg-white border-2 border-transparent focus:border-indigo-600 outline-none rounded-2xl font-black text-sm shadow-sm transition-all placeholder:text-gray-300" 
                  />
                </div>
                <div className="px-4 py-2 md:w-48">
                  <p className="text-[11px] font-black uppercase text-gray-400 leading-tight">
                    Don't know your Voter ID number? Click <a href="https://tnmap.tn.gov/voterlookup/" target="_blank" rel="noreferrer" className="text-indigo-600 underline decoration-2 underline-offset-2">HERE</a>.
                  </p>
                </div>
              </div>
              
              {/* Optional Verification Block */}
              <div className="bg-gray-50 p-8 rounded-[2.5rem] space-y-5 border border-gray-100">
                <p className="text-xs font-black uppercase text-gray-400 text-center tracking-tighter">Provide Name <span className="text-indigo-600 mx-1">OR</span> Date of Birth</p>
                <input 
                  name="lastName" 
                  placeholder="LAST NAME" 
                  className="w-full p-5 bg-white rounded-xl uppercase text-xs font-black border border-gray-200 focus:ring-2 ring-indigo-500/20 outline-none transition-all" 
                />
                <div className="relative">
                  <span className="absolute -top-2 left-4 bg-white px-2 text-[10px] font-black text-indigo-400 uppercase">Date of Birth</span>
                  <input 
                    type="date" 
                    name="dob" 
                    className="w-full p-5 bg-white rounded-xl text-xs font-black border border-gray-200 focus:ring-2 ring-indigo-500/20 outline-none transition-all" 
                  />
                </div>
              </div>

              {/* Account Credentials */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <input 
                  type="email" 
                  name="email" 
                  required 
                  placeholder="EMAIL ADDRESS" 
                  className="w-full p-5 bg-gray-50 rounded-xl text-xs font-black focus:bg-white border-2 border-transparent focus:border-gray-200 outline-none transition-all" 
                />
                <input 
                  type="password" 
                  name="password" 
                  required 
                  placeholder="CREATE PASSWORD" 
                  className="w-full p-5 bg-gray-50 rounded-xl text-xs font-black focus:bg-white border-2 border-transparent focus:border-gray-200 outline-none transition-all" 
                />
              </div>

              <button 
                disabled={isVerifying} 
                className="w-full py-7 bg-indigo-600 text-white rounded-[2rem] font-black text-sm uppercase shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50"
              >
                {isVerifying ? (
                  <span className="flex items-center justify-center gap-2">
                    <i className="fa-solid fa-spinner animate-spin"></i> Verifying Registry...
                  </span>
                ) : 'Verify & Register'}
              </button>
            </form>
          </div>
        )}

        {currentPage === 'login' && (
          <div className="max-w-lg mx-auto py-10 bg-white p-8 rounded-[3rem] shadow-2xl text-center">
            <h2 className="text-2xl font-black uppercase text-indigo-600 mb-8">Secure Access</h2>
            <form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); const { error } = await supabase!.auth.signInWithPassword({ email: fd.get('email') as string, password: fd.get('password') as string }); if (error) showToast(error.message, 'error'); else setCurrentPage('home'); }}>
              <input name="email" type="email" placeholder="EMAIL" required className="w-full p-4 bg-gray-50 rounded-xl text-xs font-bold" />
              <input name="password" type="password" placeholder="PASSWORD" required className="w-full p-4 bg-gray-50 rounded-xl text-xs font-bold" />
              <button className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl">Enter Portal</button>
            </form>
            <button onClick={() => setCurrentPage('signup')} className="mt-6 text-[10px] font-black uppercase text-gray-400">Need to register as a voter?</button>
          </div>
        )}
      </main>

      <footer className="bg-white border-t py-3 text-center shrink-0">
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