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
//3. useFeatures.ts -> The "Social Hub." Manages data and real-time updates for Polls, Suggestions, and the Message Board.


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
// - (Phase 14) Created useFeatures.ts to handle all non-financial data fetching.
// - (Phase 14) Cleaned up App.tsx by removing over 100 lines of hardcoded database fetching logic.

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
import { useActions } from './hooks/useActions';
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
  const showToast = (message: string, type: 'success' | 'error' = 'success') => { setToast({ message, type }); setTimeout(() => setToast(null), 3000); };
  
  // --- UI STATE (Selection & Staging) ---
  const [selectedPoll, setSelectedPoll] = useState<any>(null);
  const [selectedAdminEmail, setSelectedAdminEmail] = useState<any>(null);
  const [pendingAction, setPendingAction] = useState<{req: any, type: 'Confirm' | 'Deny'} | null>(null);

  // --- CORE AUTH ---
  const { user, profile, setProfile, setUser } = useAuth();
  
  // --- FEATURE DATA (Hooks) ---
  const features = useFeatures(user, profile);
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
  } = features;

  // --- LOGIC TOOLBOX (Hook) ---
  const {
    isUploading, setIsUploading,
    stagedPollFiles, setStagedPollFiles,
    stagedAdminReplyFiles, setStagedAdminReplyFiles,
    stagedBoardFiles, setStagedBoardFiles,
    handlePhotoUpload,
    handleBoardFileUpload,
    handlePollFileUpload,
    handleAdminInboxFileUpload,
    handleReaction,
    handleClosePoll,
    handleUpdateSuggestionStatus,
    handleDeletePoll,
    handleDeleteAdminEmail
  } = useActions(user, profile, setProfile, showToast, features, {
    setSelectedPoll,
    setSelectedAdminEmail,
    setCurrentPage,
    selectedPoll,
    selectedAdminEmail
  });
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
  // Note: Upload and Staging state moved to useActions.ts
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