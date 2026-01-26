// ---MOORE COUNTY FINANCIAL APP - PROJECT MAP (Updated Phase 5)

//--- VISUAL COMPONENTS (src/components/) ---

//1. AdminPanel.tsx      -> The restricted dashboard for officials.
//2. ModalStack.tsx      -> Handles all pop-up windows (Polls, Messages).
//3. CategoryDashboard.tsx -> The charts and audit tables for categories.
//4. UserAvatar.tsx      -> The small profile pictures.
//5. Toast.tsx           -> The "Success/Error" pop-up messages.
//6. BoardPage.tsx       -> The "Message Board" message board component.
// 7. SuggestionsPage.tsx -> Community suggestion box, new proposals, and threaded discussions.
// 8. PollsPage.tsx -> Community polls, voting logic, results, and discussions.
// 9. SignupPage.tsx     -> The "Voter Verification" hub and registration logic.
// 10. LoginPage.tsx      -> The secure entrance portal.
// 11. Navbar.tsx        -> The top navigation bar with the logo and menu button.
// 12. Sidebar.tsx       -> The slide-out menu with user profile and page links.
// 13. NetWorthChart.tsx -> The high-level "County Net Worth" trend chart and its toggle controls.
// 14. CategoryLinks.tsx  -> Home page buttons for "Revenues" and "Expenses."
// 15. Footer.tsx         -> The copyright and branding bar at the bottom of the app.



//--- LOGIC & MATH (src/hooks/) ---

//1. useAuth.ts        -> Handles login/logout and user permissions.
//2. useFinanceData.ts  -> THE BRAIN. All Tier 1-4 logic and COVID-gap math.

//--- DATA & SETTINGS (Root src/) ---
//1. App.tsx           -> The "Air Traffic Controller." Connects everything.
//2. constants.ts      -> Names of Categories and Dashboard configurations.
//3. supabaseClient.ts -> The "Bridge" to your database.

//--- HELPERS (src/utils/) ---
//1. financeUtils.ts   -> Math helpers (Currency formatting, Trend lines).
//2. formatUtils.ts    -> Text helpers (Date formatting, link detection).---

//--- STYLES (src/) ---
//1. index.css          -> Global "Paint & Polish." Handles scrollbars, animations, and toggle colors.

//--- RECENT REFACTORS (Phase 13) ---
// - Moved Global CSS from App.tsx to index.css.
// - Moved Home Page "Sub-text" into CategoryLinks.tsx for better organization.
// - Fixed "Solvency Chart" logic in CategoryDashboard.tsx (Lines now solid; Toggles now respond in drill-down mode).

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
import { useFeatures } from './hooks/useFeatures';
import AdminPanel from './components/AdminPanel';
import ModalStack from './components/ModalStack';
import CategoryDashboard from './components/CategoryDashboard';
import BoardPage from './components/BoardPage';
import SuggestionsPage from './components/SuggestionsPage';
import PollsPage from './components/PollsPage';
import SignupPage from './components/SignupPage';
import LoginPage from './components/LoginPage';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { NetWorthChart } from './components/NetWorthChart.tsx';
import { CategoryLinks } from './components/CategoryLinks';
import { Footer } from './components/Footer';
import './index.css';


export default function App() {
  // --- CORE STATE ---
  
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeDashboard, setActiveDashboard] = useState<DashboardConfig | null>(null);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  
  // --- CORE AUTH ---
  const { user, profile, setProfile, setUser } = useAuth();
  
  // --- FEATURE DATA (Hooks) ---
  const { 
    polls, setPolls, fetchPolls, 
    suggestions, setSuggestions, fetchSuggestions, 
    boardMessages, fetchBoardMessages,
    allUsers, fetchUsers,
    manualRequests, fetchManualRequests,
    adminMessages, fetchAdminMessages,
    adminEmailDeletionVotes, fetchAdminEmailDeletionVotes,
    deletionVotes, fetchDeletionVotes,
    fetchAllData
  } = useFeatures(user, profile);

  // --- UI STATE (Selection & Staging) ---
  const [selectedPoll, setSelectedPoll] = useState<any>(null);
  const [pendingAction, setPendingAction] = useState<{req: any, type: 'Confirm' | 'Deny'} | null>(null);
  const [selectedAdminEmail, setSelectedAdminEmail] = useState<any>(null);
  const [stagedAdminReplyFiles, setStagedAdminReplyFiles] = useState<{url: string, name: string}[]>([]);
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
  const [selectedOfficials, setSelectedOfficials] = useState<string[]>([]);
  const [isOfficialDropdownOpen, setIsOfficialDropdownOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [stagedPollFiles, setStagedPollFiles] = useState<{url: string, name: string}[]>([]);
  const [stagedBoardFiles, setStagedBoardFiles] = useState<{url: string, name: string}[]>([]);
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

  const { chartData, yearDetailData, fetchFinancialData, fetchYearDetails } = useFinanceData(selectedParents, toggles, chartLevel);

  // --- INITIALIZATION ---

  useEffect(() => {
    if (!user) {
      setCurrentPage('home');
      setSelectedPoll(null);
    }
  }, [user]);

  useEffect(() => {
    // Listen for the 'Close Report' signal from the embedded dashboard iframe
    const handleDashboardMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'CLOSE_DASHBOARD') {
        setActiveDashboard(null);
      }
    };
    window.addEventListener('message', handleDashboardMessage);

    // Load initial financial data
    fetchFinancialData();

    return () => window.removeEventListener('message', handleDashboardMessage);
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

  // Note: All Data Fetching logic moved to useFeatures.ts
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
/>

      <Navbar 
        setCurrentPage={setCurrentPage}
        setSelectedCategory={setSelectedCategory}
        setIsMenuOpen={setIsMenuOpen}
      />

      <Sidebar 
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        user={user}
        profile={profile}
        isUploading={isUploading}
        handlePhotoUpload={handlePhotoUpload}
        setCurrentPage={setCurrentPage}
        setSelectedCategory={setSelectedCategory}
        setSelectedPoll={setSelectedPoll}
        fetchPolls={fetchPolls}
        fetchBoardMessages={fetchBoardMessages}
        fetchSuggestions={fetchSuggestions}
        fetchUsers={fetchUsers}
        supabase={supabase}
      />

      <main className="flex-grow overflow-y-auto container mx-auto px-4 py-8 custom-scrollbar">
        {currentPage === 'home' && !selectedCategory && (
          <div className="max-w-4xl mx-auto space-y-12 py-10">
            <h1 className="text-4xl md:text-6xl font-black text-gray-900 uppercase tracking-tighter text-center">Moore Transparency</h1>

            {/* TIER 1 SPARKLINE: Total Government Net Worth */}
            <NetWorthChart 
              chartData={chartData}
              toggles={toggles}
              setToggles={setToggles}
              setSelectedCategory={setSelectedCategory}
            />

            <CategoryLinks setSelectedCategory={setSelectedCategory} />
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
{currentPage === 'polls' && (
          <PollsPage 
            user={user}
            profile={profile}
            polls={polls}
            fetchPolls={fetchPolls}
            selectedPoll={selectedPoll}
            setSelectedPoll={setSelectedPoll}
            supabase={supabase}
            showToast={showToast}
            setCurrentPage={setCurrentPage}
            setShowPollLoginModal={setShowPollLoginModal}
          />
        )}

{currentPage === 'board' && (
          <BoardPage 
            user={user}
            profile={profile}
            boardMessages={boardMessages}
            fetchBoardMessages={fetchBoardMessages}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedOfficials={selectedOfficials}
            setSelectedOfficials={setSelectedOfficials}
            isOfficialDropdownOpen={isOfficialDropdownOpen}
            setIsOfficialDropdownOpen={setIsOfficialDropdownOpen}
            stagedBoardFiles={stagedBoardFiles}
            setStagedBoardFiles={setStagedBoardFiles}
            isUploading={isUploading}
            setIsUploading={setIsUploading}
            handleBoardFileUpload={handleBoardFileUpload}
            showToast={showToast}
            setCurrentPage={setCurrentPage}
            supabase={supabase}
            supabaseAnonKey={supabaseAnonKey}
          />
        )}
{/* SUGGESTIONS PAGE (Modularized) */}
        {currentPage === 'suggestions' && (
          <SuggestionsPage 
            user={user}
            profile={profile}
            suggestions={suggestions}
            fetchSuggestions={fetchSuggestions}
            showToast={showToast}
            supabase={supabase}
            setCurrentPage={setCurrentPage}
            setSearchQuery={setSearchQuery}
          />
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
          <SignupPage 
            supabase={supabase}
            isVerifying={isVerifying}
            setIsVerifying={setIsVerifying}
            setNotFoundModal={setNotFoundModal}
            setCurrentPage={setCurrentPage}
            showToast={showToast}
          />
        )}

        {currentPage === 'login' && (
          <LoginPage 
            supabase={supabase}
            setCurrentPage={setCurrentPage}
            showToast={showToast}
          />
        )}
      </main>

      <Footer />

    </div>
  );
}