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
  setCurrentPage: (page: string) => void;
  
  // Financial Data
  selectedCategory: string | null;
  setSelectedCategory: (cat: string | null) => void;
  setActiveDashboard: (dash: any) => void;
  chartData: any[];
  yearDetailData: any[];
  fetchYearDetails: (year: number) => void;
  selectedFinancialYear: number | null;
  setSelectedFinancialYear: (year: number | null) => void;
  expandedChart: string | null;
  setExpandedChart: (id: string | null) => void;
  chartLevel: number;
  setChartLevel: (lvl: number) => void;
  selectedParents: string[];
  setSelectedParents: (parents: string[]) => void;
  selectedParent: string | null;
  setSelectedParent: (p: string | null) => void;
  hoveredData: any;
  setHoveredData: (d: any) => void;
  toggles: any;
  setToggles: (t: any) => void;

  // Social/Features Data
  polls: any[];
  fetchPolls: () => void;
  selectedPoll: any;
  setSelectedPoll: (p: any) => void;
  boardMessages: any[];
  fetchBoardMessages: () => void;
  suggestions: any[];
  fetchSuggestions: () => void;
  
  // UI States
  showToast: (m: string, type?: 'success' | 'error') => void;
  setShowPollLoginModal: (v: boolean) => void;
  searchQuery: string;
  setSearchQuery: (s: string) => void;
  selectedOfficials: string[];
  setSelectedOfficials: (o: string[]) => void;
  isOfficialDropdownOpen: boolean;
  setIsOfficialDropdownOpen: (v: boolean) => void;
  isVerifying: boolean;
  setIsVerifying: (v: boolean) => void;
  setNotFoundModal: (v: boolean) => void;

  // Actions/Uploads
  isUploading: boolean;
  setIsUploading: (v: boolean) => void;
  stagedBoardFiles: File[];
  setStagedBoardFiles: (f: File[]) => void;
  handleBoardFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  
  // Admin Specific
  isAdminSections: any;
  setIsAdminSections: (s: any) => void;
  stagedPollFiles: File[];
  setStagedPollFiles: (f: File[]) => void;
  handlePollFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  allUsers: any[];
  clearedItems: string[];
  toggleClearItem: (id: string) => void;
  handleClosePoll: (id: string) => void;
  handleDeletePoll: (id: string) => void;
  deletionVotes: any[];
  handleUpdateSuggestionStatus: (id: string, s: string) => void;
  adminMessages: any[];
  selectedAdminEmail: any;
  setSelectedAdminEmail: (e: any) => void;
  handleDeleteAdminEmail: (id: string) => void;
  stagedAdminReplyFiles: File[];
  setStagedAdminReplyFiles: (f: File[]) => void;
  handleAdminInboxFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fetchAdminMessages: () => void;
  manualRequests: any[];
  setPendingAction: (a: any) => void;
  pendingAction: any;
  fetchManualRequests: () => void;
  adminEmailDeletionVotes: any[];
  formatDate: (d: string) => string;
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
    allUsers, clearedItems, toggleClearItem, handleClosePoll, handleDeletePoll, deletionVotes,
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
          setClearedItems={clearedItems as any} 
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