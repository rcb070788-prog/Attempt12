import React from 'react';
import { NetWorthChart } from './NetWorthChart';
import { CategoryLinks } from './CategoryLinks';
import CategoryDashboard from './CategoryDashboard';
import PollsPage from './PollsPage';
import BoardPage from './BoardPage';
import SuggestionsPage from './SuggestionsPage';
import AdminPanel from './AdminPanel';
import SignupPage from './SignupPage';
import LoginPage from './LoginPage';
import { supabase, supabaseAnonKey } from '../supabaseClient';
import { UserAvatar } from './UserAvatar';

interface MainViewProps {
  // Navigation & Auth
  currentPage: string;
  user: any;
  profile: any;
  setCurrentPage: any;
  
  // Financial Data
  selectedCategory: string | null;
  setSelectedCategory: any;
  setActiveDashboard: any;
  chartData: any[];
  yearDetailData: any[];
  fetchYearDetails: any;
  selectedFinancialYear: number | null;
  setSelectedFinancialYear: any;
  expandedChart: string | null;
  setExpandedChart: any;
  chartLevel: number;
  setChartLevel: any;
  selectedParents: string[];
  setSelectedParents: any;
  selectedParent: string | null;
  setSelectedParent: any;
  hoveredData: any;
  setHoveredData: any;
  toggles: any;
  setToggles: any;

  // Social/Features Data
  polls: any[];
  fetchPolls: any;
  selectedPoll: any;
  setSelectedPoll: any;
  boardMessages: any[];
  fetchBoardMessages: any;
  suggestions: any[];
  fetchSuggestions: any;
  
  // UI States
  showToast: any;
  setShowPollLoginModal: any;
  searchQuery: string;
  setSearchQuery: any;
  selectedOfficials: string[];
  setSelectedOfficials: any;
  isOfficialDropdownOpen: boolean;
  setIsOfficialDropdownOpen: any;
  isVerifying: boolean;
  setIsVerifying: any;
  setNotFoundModal: any;

  // Actions/Uploads
  isUploading: boolean;
  setIsUploading: any;
  stagedBoardFiles: any[];
  setStagedBoardFiles: any;
  handleBoardFileUpload: any;
  
  // Admin Specific
  isAdminSections: any;
  setIsAdminSections: any;
  stagedPollFiles: any[];
  setStagedPollFiles: any;
  handlePollFileUpload: any;
  allUsers: any[];
  clearedItems: string[];
  setClearedItems: any;
  toggleClearItem: any;
  handleClosePoll: any;
  handleDeletePoll: any;
  deletionVotes: any[];
  handleUpdateSuggestionStatus: any;
  adminMessages: any[];
  selectedAdminEmail: any;
  setSelectedAdminEmail: any;
  handleDeleteAdminEmail: any;
  stagedAdminReplyFiles: any[];
  setStagedAdminReplyFiles: any;
  handleAdminInboxFileUpload: any;
  fetchAdminMessages: any;
  manualRequests: any[];
  setPendingAction: any;
  pendingAction: any;
  fetchManualRequests: any;
  adminEmailDeletionVotes: any[];
  formatDate: any;
}

export const MainView: React.FC<MainViewProps> = (props) => {
  const {
    currentPage, user, profile, setCurrentPage,
    selectedCategory, setSelectedCategory, setActiveDashboard,
    chartData, yearDetailData, fetchYearDetails, selectedFinancialYear, setSelectedFinancialYear,
    expandedChart, setExpandedChart, chartLevel, setChartLevel,
    selectedParents, setSelectedParents, selectedParent, setSelectedParent,
    hoveredData, setHoveredData, toggles, setToggles,
    polls, fetchPolls, selectedPoll, setSelectedPoll,
    boardMessages, fetchBoardMessages, suggestions, fetchSuggestions,
    showToast, setShowPollLoginModal, searchQuery, setSearchQuery,
    selectedOfficials, setSelectedOfficials, isOfficialDropdownOpen, setIsOfficialDropdownOpen,
    isVerifying, setIsVerifying, setNotFoundModal,
    isUploading, setIsUploading, stagedBoardFiles, setStagedBoardFiles, handleBoardFileUpload,
    isAdminSections, setIsAdminSections, stagedPollFiles, setStagedPollFiles, handlePollFileUpload,
    allUsers, clearedItems, setClearedItems, toggleClearItem, handleClosePoll, handleDeletePoll, deletionVotes,
    handleUpdateSuggestionStatus, adminMessages, selectedAdminEmail, setSelectedAdminEmail,
    handleDeleteAdminEmail, stagedAdminReplyFiles, setStagedAdminReplyFiles, handleAdminInboxFileUpload,
    fetchAdminMessages, manualRequests, setPendingAction, pendingAction, fetchManualRequests,
    adminEmailDeletionVotes, formatDate
  } = props;

  return (
    <main className="flex-grow overflow-y-auto container mx-auto px-4 py-8 custom-scrollbar">
      {currentPage === 'home' && !selectedCategory && (
        <div className="max-w-4xl mx-auto space-y-12 py-10">
          <h1 className="text-4xl md:text-6xl font-black text-gray-900 uppercase tracking-tighter text-center">Moore Transparency</h1>
          <NetWorthChart 
            chartData={chartData}
            toggles={toggles}
            setToggles={setToggles}
            setSelectedCategory={setSelectedCategory}
          />
          <CategoryLinks setSelectedCategory={setSelectedCategory} />
        </div>
      )}

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
  );
};