import React, { useState, useEffect, useMemo } from 'react';
import { supabase, supabaseAnonKey } from './supabaseClient';
import { CATEGORIES, DASHBOARDS, OFFICIALS, CPI_ANNUAL_AVG } from './constants.ts';
import { DashboardConfig } from './types.ts';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// New Modular Imports
import { renderTextWithLinks, formatDate } from './utils/formatUtils';
import { formatCurrency, getRealValue, calculateTrendLine } from './utils/financeUtils';
import { UserAvatar } from './components/UserAvatar';
import { Toast } from './components/Toast';
import { useAuth } from './hooks/useAuth';
import { useFinanceData } from './hooks/useFinanceData';
import AdminPanel from './components/AdminPanel';
import ModalStack from './components/ModalStack';
import CategoryDashboard from './components/CategoryDashboard';

export default function App() {
  // --- CORE STATE ---
  
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeDashboard, setActiveDashboard] = useState<DashboardConfig | null>(null);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  
  // --- FEATURE DATA ---
  const [polls, setPolls] = useState<any[]>([]);
  const [selectedPoll, setSelectedPoll] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [boardMessages, setBoardMessages] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [manualRequests, setManualRequests] = useState<any[]>([]);
  const [pendingAction, setPendingAction] = useState<{req: any, type: 'Confirm' | 'Deny'} | null>(null);
  const [adminMessages, setAdminMessages] = useState<any[]>([]);
  const [adminEmailDeletionVotes, setAdminEmailDeletionVotes] = useState<any[]>([]);
  const [selectedAdminEmail, setSelectedAdminEmail] = useState<any>(null);
  const [stagedAdminReplyFiles, setStagedAdminReplyFiles] = useState<{url: string, name: string}[]>([]);
  const [deletionVotes, setDeletionVotes] = useState<any[]>([]);
  const [selectedFinancialYear, setSelectedFinancialYear] = useState<number | null>(null);
  const [expandedChart, setExpandedChart] = useState<string | null>(null);
  // Navigation State for YoY Drill-down
  // chartLevel: 1 (Grand Total), 2 (Primary vs Component), 3 (Activities/Entities), 4 (Line Items)
  const [chartLevel, setChartLevel] = useState(1);
  const [selectedParents, setSelectedParents] = useState<string[]>([]);
  const [selectedParent, setSelectedParent] = useState<string | null>(null);
  const [selectedLineItem, setSelectedLineItem] = useState<string | null>(null);
  const [toggles, setToggles] = useState({ 
    assets: false, 
    liabs: false, 
    netWorth: true, 
    assetsTrend: false, 
    liabsTrend: false, 
    netWorthTrend: false, 
    assetsInf: false, 
    liabsInf: false, 
    netWorthInf: false 
  });
  const [hoveredData, setHoveredData] = useState<any>(null);
  
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
  const [stagedSuggestionFiles, setStagedSuggestionFiles] = useState<{url: string, name: string}[]>([]);
  const [stagedPollFiles, setStagedPollFiles] = useState<{url: string, name: string}[]>([]);
  const [stagedBoardFiles, setStagedBoardFiles] = useState<{url: string, name: string}[]>([]);
  const [pollFilter, setPollFilter] = useState<'active' | 'completed'>('active');
  const [showPollLoginModal, setShowPollLoginModal] = useState(false);
  const [isAdminSections, setIsAdminSections] = useState({ poll: false, registry: false, managePolls: false, manageSuggestions: false, manualRequests: false, adminInbox: true });
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
const { user, profile, setProfile, setUser } = useAuth();
  const { chartData, yearDetailData, fetchFinancialData, fetchYearDetails } = useFinanceData(selectedParents, toggles, chartLevel);

  // --- INITIALIZATION ---

  useEffect(() => {
    if (!user) {
      setCurrentPage('home');
      setSelectedPoll(null);
    }
  }, [user]);

  useEffect(() => {
    if (!supabase) return;

    // Listen for the 'Close Report' signal from the embedded dashboard iframe
    const handleDashboardMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'CLOSE_DASHBOARD') {
        setActiveDashboard(null);
      }
    };
    window.addEventListener('message', handleDashboardMessage);

    fetchAllData();

    // REAL-TIME SUBSCRIPTION
    const votesSubscription = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'poll_votes' }, () => fetchPolls())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'poll_comments' }, () => fetchPolls())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'suggestions' }, () => fetchSuggestions())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'suggestion_comments' }, () => fetchSuggestions())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'board_messages' }, () => fetchBoardMessages())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_messages' }, () => fetchAdminMessages())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_email_deletion_votes' }, () => fetchAdminEmailDeletionVotes())
      .subscribe();

    return () => {
      if (votesSubscription) supabase.removeChannel(votesSubscription);
      window.removeEventListener('message', handleDashboardMessage);
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
      fetchAdminMessages();
      fetchAdminEmailDeletionVotes();
    }
  }, [currentPage, profile]);

  // --- BROWSER HISTORY SYNC ---
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // If a dashboard is active, the first 'Back' press should just close the dashboard
      if (activeDashboard) {
        setActiveDashboard(null);
        // We push home state again so they don't exit the app on the next back press
        window.history.pushState({ page: 'home', category: null, poll: null, dashboard: null }, '');
        return;
      }

      // If user hits back, use the history state to update the app view
      const state = event.state || { page: 'home', category: null, poll: null, dashboard: null };
      setCurrentPage(state.page || 'home');
      setSelectedCategory(state.category || null);
      setSelectedPoll(state.poll || null);
      setActiveDashboard(state.dashboard || null);
    };

    window.addEventListener('popstate', handlePopState);
    
    // Set initial history point so 'Back' has somewhere to go
    if (!window.history.state) {
      window.history.replaceState({ page: 'home', category: null, poll: null, dashboard: null }, '');
    }
    
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
// Handle exiting fullscreen when the dashboard is closed
  useEffect(() => {
    if (!activeDashboard && document.fullscreenElement) {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(err => console.warn(err));
      }
    }
  }, [activeDashboard]);

  useEffect(() => {
    const hState = window.history.state;
    // Check if the current app state is actually different from what the browser thinks it is
    const isDifferent = !hState || 
      hState.page !== currentPage || 
      hState.category !== selectedCategory || 
      (hState.poll && hState.poll.id !== selectedPoll?.id) ||
      (!hState.poll && selectedPoll) ||
      (hState.dashboard && hState.dashboard.id !== activeDashboard?.id) ||
      (!hState.dashboard && activeDashboard);

    if (isDifferent) {
      window.history.pushState({ 
        page: currentPage, 
        category: selectedCategory, 
        poll: selectedPoll, 
        dashboard: activeDashboard 
      }, '');
    }
  }, [currentPage, selectedCategory, selectedPoll, activeDashboard]);

  // --- DATA FETCHING ---

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
    suggestion_comments(id, content, created_at, profiles(full_name, district, avatar_url), suggestion_reactions(*))
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
  const fetchAdminMessages = async () => {
    if (!supabase || !profile?.is_admin) return;
    console.log("Fetching Admin Inbox...");
    const { data } = await supabase.from('admin_messages').select('*').order('created_at', { ascending: false });
    setAdminMessages(data || []);
  };

  const fetchAdminEmailDeletionVotes = async () => {
    if (!supabase || !profile?.is_admin) return;
    const { data } = await supabase.from('admin_email_deletion_votes').select('*');
    setAdminEmailDeletionVotes(data || []);
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
    fetchAdminMessages();
    fetchAdminEmailDeletionVotes();
    fetchFinancialData(); // This now points to the hook version
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
      const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
      const filePath = `board/${Date.now()}_${safeName}`;
      const { error: uploadError } = await supabase.storage.from('board_attachments').upload(filePath, file);
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from('board_attachments').getPublicUrl(filePath);
        uploadedUrls.push(`${publicUrl}?filename=${encodeURIComponent(file.name)}`);
      }
    }
    return uploadedUrls;
  };
const handleSuggestionFileUpload = async (files: FileList) => {
    if (!files || !user || !supabase) return;
    setIsUploading(true);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const cleanFileName = file.name.replace(/[^\x00-\x7F]/g, ""); 
      const filePath = `suggestions/${Date.now()}_${cleanFileName}`;
      const { error: uploadError } = await supabase.storage.from('suggestion_attachments').upload(filePath, file);
      if (uploadError) {
        showToast(uploadError.message, 'error');
        continue;
      }
      const { data: { publicUrl } } = supabase.storage.from('suggestion_attachments').getPublicUrl(filePath);
      setStagedSuggestionFiles(prev => [...prev, { url: publicUrl, name: file.name }]);
    }
    setIsUploading(false);
  };

  const handlePollFileUpload = async (files: FileList) => {
    if (!files || !user || !supabase) return;
    setIsUploading(true);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Clean the filename and add a timestamp to prevent duplicates
      const cleanFileName = file.name.replace(/[^\x00-\x7F]/g, ""); 
      const filePath = `polls/${Date.now()}_${cleanFileName}`;
      
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
  const handleAdminInboxFileUpload = async (files: FileList) => {
    if (!files || !user || !supabase) return;
    setIsUploading(true);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
      const filePath = `outbound/${Date.now()}_${safeName}`;
      
      const { error: uploadError } = await supabase.storage.from('admin_inbox_attachments').upload(filePath, file);
      
      if (uploadError) {
        showToast(uploadError.message, 'error');
        continue;
      }

      const { data } = supabase.storage.from('admin_inbox_attachments').getPublicUrl(filePath);
      const publicUrl = `${data.publicUrl}?filename=${encodeURIComponent(file.name)}`;
      setStagedAdminReplyFiles(prev => [...prev, { url: publicUrl, name: file.name }]);
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

      // --- UNIQUE VIRTUAL EMAIL GENERATION ---
      const [fName, ...lNameParts] = verifyData.fullName.split(' ');
      const lName = lNameParts.join('').replace(/[^a-z0-9]/gi, '');
      const bSlug = `${fName.toLowerCase()}.${lName.toLowerCase()}`;
      let finalVirtualEmail = `${bSlug}@concernedcitizensofmc.com`;

      const { data: level1 } = await supabase!.from('profiles').select('id').eq('virtual_email', finalVirtualEmail).maybeSingle();
      if (level1) {
        finalVirtualEmail = `${bSlug}.${verifyData.district}@concernedcitizensofmc.com`;
        const { data: level2 } = await supabase!.from('profiles').select('id').eq('virtual_email', finalVirtualEmail).maybeSingle();
        if (level2) {
          let counter = 1;
          let isUnique = false;
          while (!isUnique && counter < 50) {
            const testEmail = `${bSlug}.${verifyData.district}.${counter}@concernedcitizensofmc.com`;
            const { data: ex } = await supabase!.from('profiles').select('id').eq('virtual_email', testEmail).maybeSingle();
            if (!ex) { finalVirtualEmail = testEmail; isUnique = true; }
            counter++;
          }
        }
      }
      
      const { error } = await supabase!.auth.signUp({ 
        email: fd.get('email') as string, 
        password: fd.get('password') as string, 
        options: { 
          data: { 
            full_name: verifyData.fullName, 
            district: verifyData.district, 
            voter_id: voterId,
            virtual_email: finalVirtualEmail
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
    if (!supabase || !profile?.is_admin) return;
    try {
      // 1. Optimistically update local state immediately
      setSuggestions(prev => prev.map(s => s.id === suggestionId ? { ...s, status: status } : s));

      const { error } = await supabase
        .from('suggestions')
        .update({ status: status })
        .eq('id', suggestionId);

      if (error) {
        // 2. Revert on error
        await fetchSuggestions(); 
        throw error;
      }

      showToast(`Proposal marked as ${status.toUpperCase()}`);
      // Real-time subscription will handle syncing other clients
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
const handleDeleteAdminEmail = async (messageId: string) => {
    if (!supabase || !user || !profile?.is_admin) return;
    try {
      const adminList = allUsers.filter(u => u.is_admin);
      const totalAdminsRequired = adminList.length || 1;
      
      const { data: currentVotes } = await supabase.from('admin_email_deletion_votes').select('*').eq('message_id', messageId);
      const currentVoteCount = currentVotes?.length || 0;
      const hasAlreadyVoted = currentVotes?.some(v => v.admin_id === user.id);

      if (hasAlreadyVoted) {
        showToast("You have already voted to clear this email.", "error");
        return;
      }

      // Check if this user is the very last admin needed for deletion
      const isLastAdmin = (currentVoteCount + 1) >= totalAdminsRequired;

      if (isLastAdmin) {
        const confirmPurge = window.confirm(
          `⚠️ FINAL CONSENSUS ACTION ⚠️\n\nYou are the LAST ADMIN (${currentVoteCount + 1}/${totalAdminsRequired}) to attempt to delete this email.\n\nBy selecting OK, this email and all its contents will be PERMANENTLY DELETED from the database for everyone. Proceed?`
        );
        if (!confirmPurge) return;
      }

      // Record the vote
      const { error: voteErr } = await supabase
        .from('admin_email_deletion_votes')
        .upsert({ message_id: messageId, admin_id: user.id });

      if (voteErr) throw voteErr;

      if (isLastAdmin) {
        // 1. Clean up Storage files first
        if (selectedAdminEmail.attachment_urls?.length > 0) {
          const filePaths = selectedAdminEmail.attachment_urls.map((url: string) => {
            const parts = url.split('/admin_inbox_attachments/');
            return parts.length > 1 ? parts[1].split('?')[0] : null;
          }).filter(Boolean);
          
          if (filePaths.length > 0) {
            await supabase.storage.from('admin_inbox_attachments').remove(filePaths);
          }
        }

        // 2. Delete the database record
        const { error: delErr } = await supabase.from('admin_messages').delete().eq('id', messageId);
        if (delErr) throw delErr;
        showToast("Consensus met: Email and attachments permanently deleted.");
        setSelectedAdminEmail(null);
      } else {
        showToast(`Email cleared from your view. (${currentVoteCount + 1}/${totalAdminsRequired} votes)`);
        setSelectedAdminEmail(null);
      }
      
      fetchAdminMessages();
      fetchAdminEmailDeletionVotes();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };
  const filteredMessages = useMemo(() => {
    const messages = boardMessages || [];
    if (searchQuery === 'ARCHIVED_RECORDS') return messages.filter(m => m.is_archived);
    const visible = messages.filter(m => !m.is_archived);
    if (!searchQuery) return visible;
    const q = searchQuery.toLowerCase();
    return visible.filter(m => {
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
      <div className="fixed inset-0 z-[100] bg-white flex flex-col overflow-hidden h-[100dvh]">
        {/* The 'Close Report' button is now rendered inside the Dashboard HTML file itself */}
        <iframe 
          src={activeDashboard.folderPath} 
          className="w-full h-full border-0 flex-grow" 
          title="Dashboard" 
          allow="fullscreen"
        />
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col font-sans overflow-hidden relative">
      {toast && <Toast message={toast.message} type={toast.type} />}

      <ModalStack 
  notFoundModal={notFoundModal}
  setNotFoundModal={setNotFoundModal}
  isSubmittingRequest={isSubmittingRequest}
  setIsSubmittingRequest={setIsSubmittingRequest}
  supabase={supabase}
  showToast={showToast}
  setIsVerifying={setIsVerifying}
  profile={profile}
  fetchManualRequests={fetchManualRequests}
  showPollLoginModal={showPollLoginModal}
  setShowPollLoginModal={setShowPollLoginModal}
  setCurrentPage={setCurrentPage}
  registryModal={registryModal}
  setRegistryModal={setRegistryModal}
  pendingVote={pendingVote}
  setPendingVote={setPendingVote}
  confirmVote={confirmVote}
/>

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
                    <p className="text-[18.66px] font-black uppercase text-gray-400">District {profile?.district} Voter</p>
                    {profile?.virtual_email && (
                      <div className="mt-2 bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100 flex items-center gap-2">
                        <i className="fa-solid fa-envelope text-indigo-600 text-xs"></i>
                        <p className="text-[18.66px] font-black uppercase text-indigo-600 truncate max-w-[200px]">
                          {profile.virtual_email}
                        </p>
                      </div>
                    )}
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

            {/* TIER 1 SPARKLINE: Total Government Solvency */}
            <div className="bg-white p-10 rounded-[3rem] shadow-xl text-gray-900 cursor-pointer hover:scale-[1.01] transition-all mb-12 border border-gray-100" onClick={() => setSelectedCategory('solvency')}>
              <div className="flex justify-between items-start mb-10">
                <div>
                  <h3 className="text-3xl font-black uppercase leading-none tracking-tighter">County Solvency</h3>
                  <p className="text-indigo-600 text-[11px] font-black uppercase mt-2 tracking-widest">20-Year Financial Net Worth Trend</p>
                </div>
                <div className="bg-indigo-50 px-5 py-2 rounded-full border border-indigo-100">
                   <span className="text-[10px] font-black uppercase text-indigo-600">Click for Detailed Analysis</span>
                </div>
              </div>
              <div className="h-[400px] w-full mb-12">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="year" stroke="#475569" fontSize={12} fontWeight="900" ticks={[2005, 2010, 2015, 2020, 2025]} axisLine={false} tickLine={false} />
                    <YAxis stroke="#475569" fontSize={12} fontWeight="900" tickFormatter={(v) => `$${(Number(v || 0) / 1000000).toFixed(0)}M`} axisLine={false} tickLine={false} />
                    <Tooltip 
                      cursor={{stroke: '#cbd5e1', strokeWidth: 1}}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white p-5 rounded-[2rem] shadow-2xl border border-gray-100 min-w-[200px]">
                              <p className="text-[10px] font-black text-indigo-600 mb-3 uppercase tracking-widest">{data.year} Records</p>
                              <div className="space-y-2">
                                <div className="flex justify-between items-center gap-6"><span className="text-[10px] font-black uppercase text-gray-400">Net Worth</span><span className="text-sm font-black text-blue-600">{formatCurrency(data.totalNetWorth)}</span></div>
                                <div className="flex justify-between items-center gap-6"><span className="text-[10px] font-black uppercase text-gray-400">Assets</span><span className="text-sm font-black text-green-600">{formatCurrency(data.totalAssets)}</span></div>
                                <div className="flex justify-between items-center gap-6"><span className="text-[10px] font-black uppercase text-gray-400">Debt</span><span className="text-sm font-black text-red-600">{formatCurrency(data.totalLiabs)}</span></div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    {toggles.assets && <Line type="monotone" dataKey="totalAssets" stroke="#4ade80" strokeWidth={4} dot={false} />}
                    {toggles.assetsTrend && <Line type="monotone" dataKey="totalAssetsTrend" stroke="#4ade80" strokeWidth={2} strokeDasharray="5 5" dot={false} opacity={0.4} />}
                    {toggles.assetsInf && <Line type="monotone" dataKey="totalAssetsReal" stroke="#fb923c" strokeWidth={3} dot={false} />}
                    
                    {toggles.liabs && <Line type="monotone" dataKey="totalLiabs" stroke="#f87171" strokeWidth={4} dot={false} />}
                    {toggles.liabsTrend && <Line type="monotone" dataKey="totalLiabsTrend" stroke="#f87171" strokeWidth={2} strokeDasharray="5 5" dot={false} opacity={0.4} />}
                    {toggles.liabsInf && <Line type="monotone" dataKey="totalLiabsReal" stroke="#fb923c" strokeWidth={3} dot={false} />}
                    
                    {toggles.netWorth && <Line type="monotone" dataKey="totalNetWorth" stroke="#3b82f6" strokeWidth={5} dot={false} />}
                    {toggles.netWorthTrend && <Line type="monotone" dataKey="totalNetWorthTrend" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" dot={false} opacity={0.4} />}
                    {toggles.netWorthInf && <Line type="monotone" dataKey="totalNetWorthReal" stroke="#fb923c" strokeWidth={3} dot={false} />}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* 3-Row Legend Grid */}
              <div className="grid grid-cols-[180px_1fr_1fr_1fr] gap-y-6 items-center px-4" onClick={(e) => e.stopPropagation()}>
                <div />
                {['assets', 'liabs', 'netWorth'].map(key => (
                  <div key={key} className="text-center">
                    <button onClick={() => setToggles({...toggles, [key]: !toggles[key as keyof typeof toggles] as any})} className={`text-[12px] font-black uppercase transition-all ${toggles[key as keyof typeof toggles] ? 'text-gray-900' : 'text-gray-300'}`}>
                      {key === 'assets' ? 'Total Assets' : key === 'liabs' ? 'Total Debt' : 'Total Net Worth'}
                    </button>
                  </div>
                ))}
                <div className="text-[11px] font-black uppercase text-indigo-400 pr-4">Trend Toggle</div>
                {['assetsTrend', 'liabsTrend', 'netWorthTrend'].map(key => {
                   const base = key.replace('Trend', '');
                   return (
                    <div key={key} className="flex justify-center">
                      <div onClick={() => setToggles({...toggles, [key]: !toggles[key as keyof typeof toggles] as any})} className={`slider-oval ${toggles[key as keyof typeof toggles] ? `slider-active slider-${base}-on` : ''}`}><div className="slider-circle"></div></div>
                    </div>
                  );
                })}
                <div className="text-[11px] font-black uppercase text-indigo-400 pr-4">Inflation Adjusted</div>
                {['assetsInf', 'liabsInf', 'netWorthInf'].map(key => (
                  <div key={key} className="flex justify-center">
                    <div onClick={() => setToggles({...toggles, [key]: !toggles[key as keyof typeof toggles] as any})} className={`slider-oval ${toggles[key as keyof typeof toggles] ? 'slider-active slider-inf-on' : ''}`}><div className="slider-circle"></div></div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
               {CATEGORIES.filter(c => ['revenues', 'expenses'].includes(c.id)).map(cat => (
                 <div 
                   key={cat.id} 
                   onClick={() => setSelectedCategory(cat.id)} 
                   className="flex-1 bg-white p-10 rounded-[3rem] shadow-sm border-2 border-transparent hover:border-indigo-600 hover:shadow-2xl transition-all cursor-pointer group"
                 >
                   <div className="flex items-center justify-between">
                     <div className="flex items-center gap-6">
                        <div className={`${cat.color} w-20 h-20 rounded-[1.5rem] flex items-center justify-center text-white text-3xl shadow-lg group-hover:scale-110 transition-transform`}>
                          <i className={`fa-solid ${cat.icon}`}></i>
                        </div>
                        <div>
                          <h3 className="text-2xl font-black uppercase tracking-tighter text-gray-900">{cat.label}</h3>
                          <p className="text-indigo-600 text-xs font-black uppercase tracking-widest opacity-60">View Operational Logs</p>
                        </div>
                     </div>
                     <i className="fa-solid fa-arrow-right text-gray-200 group-hover:text-indigo-600 group-hover:translate-x-2 transition-all text-2xl"></i>
                   </div>
                 </div>
               ))}
            </div>

            <div className="text-center pt-4">
              <p className="text-[10px] font-black uppercase text-gray-300 tracking-[0.3em]">Comprehensive Assets & Liabilities are now integrated into the Solvency Trends above</p>
            </div>
          </div>
        )}
{/* --- MODULAR CATEGORY DASHBOARD --- */}
        <CategoryDashboard 
          currentPage={currentPage}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          setActiveDashboard={setActiveDashboard}
          chartData={chartData}
          yearDetailData={yearDetailData}
          fetchYearDetails={fetchYearDetails}
          selectedFinancialYear={selectedFinancialYear}
          setSelectedFinancialYear={setSelectedFinancialYear}
          expandedChart={expandedChart}
          setExpandedChart={setExpandedChart}
          chartLevel={chartLevel}
          setChartLevel={setChartLevel}
          selectedParents={selectedParents}
          setSelectedParents={setSelectedParents}
          selectedParent={selectedParent}
          setSelectedParent={setSelectedParent}
          hoveredData={hoveredData}
          setHoveredData={setHoveredData}
          toggles={toggles}
          setToggles={setToggles}
        />
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
                      <h2 className="text-4xl font-black uppercase tracking-tighter leading-none">
                        {searchQuery === 'ARCHIVED_RECORDS' ? 'Archived Records' : 'Public Record'}
                      </h2>
                      <p className="text-indigo-600 font-bold text-[10px] uppercase mt-1">
                        {searchQuery === 'ARCHIVED_RECORDS' ? 'Viewing historical community correspondence' : 'Official Community Correspondence'}
                      </p>
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
                          {(profile?.is_admin || msg.user_id === user?.id) && (
                            <button 
                              onClick={async () => {
                                const { error } = await supabase!.from('board_messages').update({ is_archived: !msg.is_archived }).eq('id', msg.id);
                                if (!error) fetchBoardMessages();
                              }}
                              className={`px-2 py-1 rounded text-[8px] font-black uppercase border transition-all ${msg.is_archived ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-400 border-gray-100 hover:border-indigo-600'}`}
                            >
                              <i className="fa-solid fa-box-archive mr-1"></i> {msg.is_archived ? 'Archived' : 'Archive'}
                            </button>
                          )}
                          {msg.recipient_names?.split(', ').map((name: string) => (
                            <span key={name} className="px-2 py-1 bg-gray-50 rounded text-[8px] font-black uppercase text-gray-400 border">{name}</span>
                          ))}
                        </div>
                      </div>

                      {msg.subject && (
                        <h4 className="text-xl font-black uppercase text-indigo-900 mb-2 tracking-tight">
                          Subject: {msg.subject}
                        </h4>
                      )}
                      
                      <div className="text-gray-800 text-base leading-relaxed break-words whitespace-pre-wrap mb-6 border-l-4 border-indigo-50 pl-4">{renderTextWithLinks(msg.content)}</div>
                      
                      {/* Attachments Section */}
                      {msg.attachment_urls?.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-6 p-4 bg-gray-50 rounded-2xl">
                          {msg.attachment_urls.map((url: string, i: number) => {
                            let displayName = `Attachment ${i + 1}`;
                            try { displayName = new URL(url).searchParams.get('filename') || displayName; } catch(e){}
                            return (
                              <a key={i} href={url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="px-4 py-2 bg-white border border-gray-200 text-indigo-600 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                                <i className="fa-solid fa-file-invoice"></i> {displayName}
                              </a>
                            );
                          })}
                        </div>
                      )}

                      {/* Threaded Replies (Official & Constituent Follow-ups) */}
                      {boardMessages.filter(reply => reply.parent_id === msg.id).sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map(reply => (
                        <div key={reply.id} className={`mt-8 p-8 rounded-[2.5rem] relative ring-1 ${reply.is_official ? 'bg-indigo-50/50 border-l-8 border-indigo-600 ring-indigo-100' : 'bg-gray-50 border-l-8 border-gray-400 ring-gray-100 ml-6'}`}>
                          <div className={`absolute -top-4 left-6 text-white px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg ${reply.is_official ? 'bg-indigo-600 shadow-indigo-200' : 'bg-gray-500 shadow-gray-200'}`}>
                            <i className={`fa-solid ${reply.is_official ? 'fa-circle-check' : 'fa-reply-all'} mr-2`}></i>
                            {reply.is_official ? 'Official Response' : 'Constituent Follow-up'}
                          </div>
                          <p className={`text-[10px] font-black uppercase mb-3 tracking-widest ${reply.is_official ? 'text-indigo-600' : 'text-gray-400'}`}>{formatDate(reply.created_at)}</p>
                          
                          {/* Official Content Body */}
                          <div className="text-lg text-gray-900 font-semibold leading-relaxed mb-4">
                            {renderTextWithLinks(reply.content)}
                          </div>

                          {/* Official Attachments */}
                          {reply.attachment_urls?.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-4 border-t border-indigo-100">
                              {reply.attachment_urls.map((fullUrl: string, i: number) => {
                                // Use the URL parameter to get the original filename Robert sent
                                let displayName = `Attachment ${i + 1}`;
                                try {
                                  const urlParams = new URL(fullUrl).searchParams;
                                  displayName = urlParams.get('filename') || displayName;
                                } catch (e) { /* fallback */ }
                                
                                return (
                                  <a 
                                    key={i} 
                                    href={fullUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    onClick={(e) => e.stopPropagation()}
                                    className="px-3 py-1.5 bg-white border border-indigo-200 text-indigo-600 rounded-lg text-[9px] font-black uppercase flex items-center gap-2 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                  >
                                    <i className="fa-solid fa-file-invoice"></i> 
                                    {displayName}
                                  </a>
                                );
                              })}
                            </div>
                          )}
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
                      if (!fd.get('subject')) return showToast("Please enter a subject", "error");
                      
                      const fileUrls = stagedBoardFiles.map(f => f.url);

                      const { data: newMessage, error } = await supabase!.from('board_messages').insert({ 
                        user_id: user.id, 
                        content: fd.get('content'), 
                        subject: fd.get('subject'),
                        recipient_names: selectedOfficials.join(', '), 
                        district: profile.district,
                        attachment_urls: fileUrls,
                        is_official: false
                      }).select().single();

                       if (error) {
                        showToast(error.message, 'error');
                      } else { 
                        // 1. Resolve official emails, filtering out those with no email address on file
                        const recipientEmails = OFFICIALS
                          .filter(off => selectedOfficials.includes(off.name) && off.email && off.email.trim() !== "")
                          .map(off => off.email);

                        if (recipientEmails.length === 0) {
                          showToast("The selected official(s) do not have a registered email in our system. Record saved to portal only.", "error");
                        } else {
                          // 2. Generate fallback slugified sender email
                          const emailSlug = profile.full_name.toLowerCase().replace(/[^a-z0-9]/g, '.');
                          const generatedSender = `${emailSlug}@concernedcitizensofmc.com`;

                          // 3. Trigger Email via Edge Function with Tracking Tag
                          try {
                            const { error: invokeErr } = await supabase!.functions.invoke('send-official-contact', {
                              headers: {
                                'Authorization': `Bearer ${supabaseAnonKey}`
                              },
                              body: {
                                senderName: profile.full_name,
                                fromEmail: profile.virtual_email || generatedSender,
                                recipients: recipientEmails,
                                subject: `${fd.get('subject')} [MSG-${newMessage.id}]`,
                                content: fd.get('content'),
                                attachments: fileUrls,
                                messageId: newMessage.id
                              }
                            });
                            if (invokeErr) throw invokeErr;
                            showToast("Message Recorded & Emails Sent"); 
                          } catch (emailErr) {
                            console.error("Notification failed:", emailErr);
                            showToast("Message Recorded, but email notification failed.", "error");
                          }
                        }

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
                            <button type="button" onClick={() => setIsOfficialDropdownOpen(false)} className="py-4 bg-gray-900 text-white rounded-xl text-[18.66px] font-black uppercase">Done</button>
                          </div>
                        )}
                      </div>

                      <input name="subject" required placeholder="MESSAGE SUBJECT (REQUIRED)" className="w-full p-5 bg-white rounded-2xl text-[18.66px] font-black uppercase outline-none placeholder:text-gray-300 focus:ring-4 ring-white/20" />

                      <textarea name="content" required placeholder="What is your message for the public record?" className="w-full p-6 bg-white rounded-[2rem] text-[18.66px] min-h-[180px] outline-none placeholder:text-gray-300 focus:ring-4 ring-white/20" />
                      
                      <div className="bg-indigo-700 p-5 rounded-2xl border border-indigo-500">
                        <label className="flex items-center gap-4 cursor-pointer text-white">
                          <div className="bg-white text-indigo-600 w-10 h-10 rounded-full flex items-center justify-center shadow-lg">
                            <i className={`fa-solid ${isUploading ? 'fa-spinner animate-spin' : 'fa-paperclip'}`}></i>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase leading-none">Add Attachments</span>
                            <span className="text-[8px] font-bold text-indigo-300 uppercase mt-1">Images or Documents</span>
                          </div>
                          <input 
                            type="file" 
                            multiple 
                            className="hidden" 
                            onChange={async (e) => {
                              if (e.target.files && e.target.files.length > 0) {
                                setIsUploading(true);
                                const urls = await handleBoardFileUpload(e.target.files);
                                const newStaged = urls.map(url => ({
                                  url,
                                  name: new URL(url).searchParams.get('filename') || 'File'
                                }));
                                setStagedBoardFiles(prev => [...prev, ...newStaged]);
                                setIsUploading(false);
                              }
                            }}
                          />
                        </label>
                      </div>

                      {stagedBoardFiles.length > 0 && (
                        <div className="flex flex-wrap gap-2 p-4 bg-white/10 rounded-2xl">
                          {stagedBoardFiles.map((file, idx) => (
                            <div key={idx} className="bg-white px-3 py-1.5 rounded-lg flex items-center gap-2">
                              <span className="text-[9px] font-black text-indigo-600 truncate max-w-[150px]">{file.name}</span>
                              <button type="button" onClick={() => setStagedBoardFiles(prev => prev.filter((_, i) => i !== idx))} className="text-red-500">
                                <i className="fa-solid fa-circle-xmark"></i>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <button className="w-full py-6 bg-white text-indigo-600 rounded-3xl font-black uppercase text-[18.66px] shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all">Submit to Public Record</button>
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
                <p className="text-indigo-600 font-bold text-[10px] uppercase tracking-[0.2em]">IDEAS YOU PROPOSE TO BE CONSIDERED BY THE CONCERNED CITIZENS OF MOORE COUNTY</p>
              </div>
              <button 
                onClick={() => { setCurrentPage('board'); setSearchQuery('ARCHIVED_RECORDS'); }}
                className="text-[10px] font-black uppercase text-gray-400 hover:text-indigo-600 transition-all border-b-2 border-transparent hover:border-indigo-600 pb-1"
              >
                Archived Records <i className="fa-solid fa-box-archive ml-1"></i>
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
                        const attachmentUrls = stagedSuggestionFiles.map(f => f.url);
                        const { error } = await supabase!.from('suggestions').insert({
                          user_id: user.id,
                          title: fd.get('title'),
                          description: suggestionText,
                          content: suggestionText,
                          category: 'General',
                          attachment_urls: attachmentUrls
                        });
                        if (error) showToast(error.message, 'error');
                        else { 
                          showToast("Proposal Submitted!"); 
                          fetchSuggestions(); 
                          setIsSuggestionModalOpen(false);
                          setStagedSuggestionFiles([]);
                          (e.target as HTMLFormElement).reset(); 
                        }
                      }} className="space-y-4">
                        <textarea name="title" required placeholder="SUMMARY / TITLE" className="w-full p-6 bg-white rounded-2xl text-sm font-black uppercase outline-none shadow-inner resize-none h-24" />
                        <textarea name="description" required placeholder="DETAIL YOUR SUGGESTION..." className="w-full p-6 bg-white rounded-2xl text-base font-medium min-h-[160px] outline-none shadow-inner" />
                        
                        <div className="space-y-3">
                          <label className="flex items-center gap-4 cursor-pointer bg-indigo-700/50 p-4 rounded-2xl border border-indigo-400 hover:bg-indigo-700 transition-colors">
                            <div className="bg-white text-indigo-600 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg">
                              <i className={`fa-solid ${isUploading ? 'fa-spinner animate-spin' : 'fa-paperclip'}`}></i>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black uppercase text-white leading-none">Attach Proof or Context</span>
                              <span className="text-[8px] font-bold text-indigo-200 uppercase mt-1">Photos, PDFs, or Documents</span>
                            </div>
                            <input type="file" multiple className="hidden" onChange={(e) => e.target.files && handleSuggestionFileUpload(e.target.files)} />
                          </label>

                          {stagedSuggestionFiles.length > 0 && (
                            <div className="flex flex-wrap gap-2 p-3 bg-white/10 rounded-2xl">
                              {stagedSuggestionFiles.map((file, idx) => (
                                <div key={idx} className="bg-white px-3 py-1.5 rounded-lg flex items-center gap-2">
                                  <span className="text-[9px] font-black uppercase text-indigo-600 truncate max-w-[100px]">{file.name}</span>
                                  <button type="button" onClick={() => setStagedSuggestionFiles(prev => prev.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700">
                                    <i className="fa-solid fa-circle-xmark"></i>
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

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
                      <p className="text-gray-700 text-base md:text-lg font-medium leading-relaxed mb-6 break-words whitespace-pre-wrap">{sug.description}</p>
                      
                      {sug.attachment_urls?.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-8">
                          {sug.attachment_urls.map((url: string, i: number) => (
                            <a key={i} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all group">
                              <i className="fa-solid fa-file-invoice text-[10px]"></i>
                              <span className="text-[9px] font-black uppercase">Reference {i + 1}</span>
                            </a>
                          ))}
                        </div>
                      )}

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
        
        {/* === ADMIN PANEL === */}
        {currentPage === 'admin' && profile?.is_admin && (
          <AdminPanel 
            profile={profile}
            isAdminSections={isAdminSections}
            setIsAdminSections={setIsAdminSections}
            stagedPollFiles={stagedPollFiles}
            setStagedPollFiles={setStagedPollFiles}
            isUploading={isUploading}
            handlePollFileUpload={handlePollFileUpload}
            showToast={showToast}
            fetchPolls={fetchPolls}
            allUsers={allUsers}
            clearedItems={clearedItems}
            setClearedItems={setClearedItems}
            toggleClearItem={toggleClearItem}
            polls={polls}
            handleClosePoll={handleClosePoll}
            handleDeletePoll={handleDeletePoll}
            deletionVotes={deletionVotes}
            user={user}
            suggestions={suggestions}
            handleUpdateSuggestionStatus={handleUpdateSuggestionStatus}
            adminMessages={adminMessages}
            selectedAdminEmail={selectedAdminEmail}
            setSelectedAdminEmail={setSelectedAdminEmail}
            handleDeleteAdminEmail={handleDeleteAdminEmail}
            stagedAdminReplyFiles={stagedAdminReplyFiles}
            setStagedAdminReplyFiles={setStagedAdminReplyFiles}
            handleAdminInboxFileUpload={handleAdminInboxFileUpload}
            fetchAdminMessages={fetchAdminMessages}
            manualRequests={manualRequests}
            setPendingAction={setPendingAction}
            pendingAction={pendingAction}
            fetchManualRequests={fetchManualRequests}
            adminEmailDeletionVotes={adminEmailDeletionVotes}
            formatDate={formatDate}
            supabase={supabase}
            UserAvatar={UserAvatar}
          />
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
                <p className="text-[18.66px] font-black uppercase text-gray-400 text-center tracking-tighter">Provide Name <span className="text-indigo-600 mx-1">OR</span> Date of Birth</p>
                <input 
                  name="lastName" 
                  placeholder="LAST NAME" 
                  className="w-full p-5 bg-white rounded-xl uppercase text-[18.66px] font-black border border-gray-200 focus:ring-2 ring-indigo-500/20 outline-none transition-all" 
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
              <input name="email" type="email" placeholder="EMAIL" required className="w-full p-4 bg-gray-50 rounded-xl text-[18.66px] font-bold" />
              <input name="password" type="password" placeholder="PASSWORD" required className="w-full p-4 bg-gray-50 rounded-xl text-[18.66px] font-bold" />
              <button className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-[18.66px] uppercase shadow-xl tracking-tighter">Enter Portal</button>
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
        .slider-oval { width: 44px; height: 20px; border-radius: 20px; position: relative; transition: all 0.3s ease; cursor: pointer; border: 2px solid #e2e8f0; background: #f8fafc; }
        .slider-circle { width: 12px; height: 12px; border-radius: 50%; background: white; position: absolute; top: 2px; left: 3px; transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55); box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .slider-active .slider-circle { left: 25px; }
        .slider-assets-on { background: #4ade80 !important; border-color: #22c55e !important; }
        .slider-liabs-on { background: #f87171 !important; border-color: #ef4444 !important; }
        .slider-netWorth-on { background: #3b82f6 !important; border-color: #2563eb !important; }
        .slider-inf-on { background: #fb923c !important; border-color: #f97316 !important; }
      `}</style>
    </div>
  );
}