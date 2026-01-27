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
  const [focusedThreadId, setFocusedThreadId] = React.useState<string | null>(null);

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
    <main className="flex-grow overflow-y-auto container mx-auto px-0 md:px-4 py-0 md:py-8 custom-scrollbar">
      {currentPage === 'home' && !selectedCategory && (
        <div className="max-w-4xl mx-auto space-y-12 py-10 px-4 md:px-0">
          <div className="hide-on-landscape">
            <h1 className="text-4xl md:text-6xl font-black text-gray-900 uppercase tracking-tighter text-center">Moore Transparency</h1>
          </div>
          <NetWorthChart 
            chartData={chartData}
            toggles={toggles}
            setToggles={setToggles}
            setSelectedCategory={setSelectedCategory}
          />
          <div className="hide-on-landscape">
            <CategoryLinks setSelectedCategory={setSelectedCategory} />
          </div>
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
          onFocusThread={(id: string) => setFocusedThreadId(id)}
        />
      )}

      {/* 1. THE SHARED FOCUS VIEW (The Reading Desk) */}
      {(currentPage === 'suggestions' || currentPage === 'board') && focusedThreadId && (
          <div className="fixed inset-0 z-[200] bg-white overflow-y-auto p-4 md:p-12 animate-fade-in custom-scrollbar">
            <div className="max-w-4xl mx-auto">
              <button 
                onClick={() => setFocusedThreadId(null)}
                className="mb-12 px-8 py-4 bg-gray-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-600 transition-all shadow-xl flex items-center gap-3"
              >
                <i className="fa-solid fa-arrow-left"></i> Exit Archive View
              </button>
              
              {/* VIEW 1: SUGGESTION CONTENT */}
              {currentPage === 'suggestions' && suggestions.filter(s => s.id === focusedThreadId).map(s => (
                 <div key={s.id} className="space-y-6">
                   <h2 className="text-5xl font-black uppercase tracking-tighter leading-none">{s.title}</h2>
                   <p className="text-xl text-gray-600 leading-relaxed">{s.description}</p>
                 </div>
              ))}

              {/* VIEW 2: BOARD MESSAGE CONTENT */}
              {currentPage === 'board' && boardMessages.filter(m => m.id === focusedThreadId).map(m => (
                <div key={m.id} className="space-y-12">
                  <div className="border-b-4 border-gray-100 pb-8">
                    <p className="text-indigo-600 font-black uppercase text-xs mb-2">Original Public Inquiry</p>
                    <h2 className="text-4xl font-black uppercase tracking-tighter mb-4">{m.subject}</h2>
                    <div className="flex items-center gap-3 mb-6">
                      <UserAvatar url={m.profiles?.avatar_url} size="sm" />
                      <p className="text-sm font-black uppercase">{m.profiles?.full_name} <span className="text-gray-400 font-bold ml-2">to {m.recipient_names}</span></p>
                    </div>
                    <div className="text-xl text-gray-800 leading-relaxed whitespace-pre-wrap bg-gray-50 p-8 rounded-[2rem]">{m.content}</div>
                  </div>

                  <div className="space-y-8">
                    <p className="text-gray-400 font-black uppercase text-xs">Official Correspondence Thread</p>
                    {boardMessages.filter(reply => reply.parent_id === m.id).sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map(reply => (
                      <div key={reply.id} className={`p-8 rounded-[2.5rem] border-2 ${reply.is_official ? 'bg-indigo-50/30 border-indigo-100' : 'bg-white border-gray-100 ml-12'}`}>
                        <div className="flex items-center gap-3 mb-4">
                          <p className={`text-[10px] font-black uppercase ${reply.is_official ? 'text-indigo-600' : 'text-gray-400'}`}>
                            {reply.is_official ? 'Official Response' : 'Constituent Follow-up'} • {formatDate(reply.created_at)}
                          </p>
                        </div>
                        <div className="text-lg text-gray-700 leading-relaxed">{reply.content}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
      )}

      {/* 2. THE NORMAL SUGGESTIONS PAGE (Only show if on suggestions page AND not zoomed in) */}
      {currentPage === 'suggestions' && !focusedThreadId && (
        <SuggestionsPage 
          user={user}
          profile={profile}
          suggestions={suggestions}
          fetchSuggestions={fetchSuggestions}
          showToast={showToast}
          supabase={supabase}
          setCurrentPage={setCurrentPage}
          setSearchQuery={setSearchQuery}
          onFocusThread={(id: string) => setFocusedThreadId(id)}
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