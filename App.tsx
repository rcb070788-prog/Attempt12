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
// 16. MainView.tsx       -> The "Channel Changer." Decides which page (Home, Polls, etc.) to show on the screen


//--- LOGIC & MATH (src/hooks/) ---

//1. useAuth.ts        -> Handles login/logout and user permissions.
//2. useFinanceData.ts  -> THE BRAIN. All Tier 1-4 logic and COVID-gap math.
//3. useFeatures.ts -> The "Social Hub." Manages data and real-time updates for Polls, Suggestions, and the Message Board.
//4. useActions.ts     -> The "Action Toolbox." Handles user interactions like file uploads, reactions, and admin tasks.
//5. useNavigation.ts -> The "Traffic Controller." Remembers where you've been (History) and handles the "Back" button logic.

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
// - (Phase 15) Created useActions.ts to house all "doing" logic (uploads, reactions, deletions).
// - (Phase 15) Cleaned up App.tsx by removing nearly 200 lines of handler functions.
// - (Phase 16) Created useNavigation.ts to handle all browser history and "Back" button logic, removing several heavy useEffect blocks from App.tsx.
//--- RECENT REFACTORS (Phase 17) ---
// - Created MainView.tsx: Extracted the massive "If/Then" logic from App.tsx.
// - Simplified App.tsx: It now only holds the Hooks and the Layout (Navbar/Sidebar/Footer).
// - Cleaned Imports: Removed over 30 unused imports and spare state variables from App.tsx.
// - Fixed Types: Resolved 15+ TypeScript errors by standardizing how "Remote Controls" (props) are passed through the MainView.
//--- RECENT REFACTORS (Phase 18) ---
// - MainView.tsx: Added "Focus Mode" state to allow users to view archived threads in a clean, isolated window.
// - SuggestionsPage.tsx: Created a local "Filing Cabinet" toggle to separate live proposals from archived ones without leaving the page.
// - useActions.ts: Updated status logic to ensure the "Robot Janitor" knows exactly when a suggestion was closed.
// - Supabase SQL: Implemented a Trigger and Function to automatically timestamp closed items and move them to the archive after 30 days.

import React, { useState, useEffect } from 'react';
import { supabase, supabaseAnonKey } from './supabaseClient';
// New Modular Imports
import { formatDate } from './utils/formatUtils';
import { Toast } from './components/Toast';
import { useAuth } from './hooks/useAuth';
import { useFinanceData } from './hooks/useFinanceData';
import { useFeatures } from './hooks/useFeatures';
import { useActions } from './hooks/useActions';
import { useNavigation } from './hooks/useNavigation';
import ModalStack from './components/ModalStack';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { MainView } from './components/MainView';
import { Footer } from './components/Footer';
import './index.css';


export default function App() {
  // 1. CORE AUTH (Must come first so others know who the user is)
  const { user, profile, setProfile, setUser } = useAuth();

  // 2. SHARED STATE (Remote controls for UI pieces)
  const [selectedPoll, setSelectedPoll] = useState<any>(null);
  const [selectedAdminEmail, setSelectedAdminEmail] = useState<any>(null);
  const [pendingAction, setPendingAction] = useState<{req: any, type: 'Confirm' | 'Deny'} | null>(null);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => { setToast({ message, type }); setTimeout(() => setToast(null), 3000); };
  const [dismissStorageBanner, setDismissStorageBanner] = useState(false);
  const [showHomescreenBanner, setShowHomescreenBanner] = useState(false);

  // 3. NAVIGATION (Now it has access to 'user' and 'selectedPoll')
  const {
    currentPage, setCurrentPage,
    selectedCategory, setSelectedCategory,
    activeDashboard, setActiveDashboard
  } = useNavigation(user, selectedPoll, setSelectedPoll);

  // 4. FEATURE DATA (The "Social Hub")
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

  // 5. ACTION TOOLBOX (The "Buttons Logic")
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
    // Load initial financial data
    fetchFinancialData();
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

  // Ensure suggestions load when user opens Suggestions page, after session hydrated
  useEffect(() => {
    if (sessionHydrated && currentPage === 'suggestions') fetchSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only refetch when navigating to suggestions
  }, [sessionHydrated, currentPage]);

  // Show "Add to home screen" when on mobile in browser tab (not PWA) so session/storage behave consistently
  useEffect(() => {
    const update = () => {
      if (typeof window === 'undefined') return;
      const dismissed = window.sessionStorage?.getItem('mc_add_to_homescreen_dismissed') === '1';
      const standalone = window.matchMedia('(display-mode: standalone)').matches;
      const mobile = window.matchMedia('(max-width: 768px)').matches;
      setShowHomescreenBanner(!dismissed && mobile && !standalone);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

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

      {showHomescreenBanner && (
        <div className="flex items-center justify-between gap-3 px-4 py-2 bg-indigo-50 border-b border-indigo-100 text-indigo-800 text-sm flex-shrink-0">
          <span className="font-medium">For the best experience on mobile, add this app to your home screen.</span>
          <button
            type="button"
            onClick={() => {
              try { window.sessionStorage?.setItem('mc_add_to_homescreen_dismissed', '1'); } catch { /* ignore */ }
              setShowHomescreenBanner(false);
            }}
            className="flex-shrink-0 text-indigo-600 hover:text-indigo-800 font-black uppercase text-xs"
            aria-label="Dismiss"
          >
            Dismiss
          </button>
        </div>
      )}

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

      <MainView 
        currentPage={currentPage}
        user={user}
        profile={profile}
        setCurrentPage={setCurrentPage}
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
        polls={polls}
        fetchPolls={fetchPolls}
        selectedPoll={selectedPoll}
        setSelectedPoll={setSelectedPoll}
        boardMessages={boardMessages}
        fetchBoardMessages={fetchBoardMessages}
        suggestions={suggestions}
        fetchSuggestions={fetchSuggestions}
        showToast={showToast}
        setShowPollLoginModal={setShowPollLoginModal}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedOfficials={selectedOfficials}
        setSelectedOfficials={setSelectedOfficials}
        isOfficialDropdownOpen={isOfficialDropdownOpen}
        setIsOfficialDropdownOpen={setIsOfficialDropdownOpen}
        isVerifying={isVerifying}
        setIsVerifying={setIsVerifying}
        setNotFoundModal={setNotFoundModal}
        isUploading={isUploading}
        setIsUploading={setIsUploading}
        stagedBoardFiles={stagedBoardFiles}
        setStagedBoardFiles={setStagedBoardFiles}
        handleBoardFileUpload={handleBoardFileUpload}
        isAdminSections={isAdminSections}
        setIsAdminSections={setIsAdminSections}
        stagedPollFiles={stagedPollFiles}
        setStagedPollFiles={setStagedPollFiles}
        handlePollFileUpload={handlePollFileUpload}
        allUsers={allUsers}
        clearedItems={clearedItems}
        setClearedItems={setClearedItems}
        toggleClearItem={toggleClearItem}
        handleClosePoll={handleClosePoll}
        handleDeletePoll={handleDeletePoll}
        deletionVotes={deletionVotes}
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
      />

      <Footer />

    </div>
  );
}