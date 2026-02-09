import React from 'react';
import {
  PollCreatorSection,
  UserRegistrySection,
  ManagePollsSection,
  ManageSuggestionsSection,
  AdminInboxSection,
  ContactInboxSection,
  ManualRequestsSection,
} from './admin';

interface AdminPanelProps {
  profile: any;
  isAdminSections: any;
  setIsAdminSections: React.Dispatch<React.SetStateAction<any>>;
  stagedPollFiles: any[];
  setStagedPollFiles: React.Dispatch<React.SetStateAction<any[]>>;
  isUploading: boolean;
  handlePollFileUpload: (files: FileList) => void;
  showToast: (msg: string, type?: "success" | "error") => void;
  fetchPolls: () => void;
  allUsers: any[];
  clearedItems: string[];
  setClearedItems: React.Dispatch<React.SetStateAction<string[]>>;
  toggleClearItem: (id: string) => void;
  polls: any[];
  handleClosePoll: (id: string) => void;
  handleDeletePoll: (id: string) => void;
  deletionVotes: any[];
  user: any;
  suggestions: any[];
  handleUpdateSuggestionStatus: (id: string, status: string) => void;
  adminMessages: any[];
  selectedAdminEmail: any;
  setSelectedAdminEmail: React.Dispatch<React.SetStateAction<any>>;
  handleDeleteAdminEmail: (id: string) => void;
  stagedAdminReplyFiles: any[];
  setStagedAdminReplyFiles: React.Dispatch<React.SetStateAction<any[]>>;
  handleAdminInboxFileUpload: (files: FileList) => void;
  fetchAdminMessages: () => void;
  manualRequests: any[];
  setPendingAction: React.Dispatch<React.SetStateAction<any>>;
  pendingAction: any;
  fetchManualRequests: () => void;
  adminEmailDeletionVotes: any[];
  formatDate: (date: any) => string;
  contactSubmissions: any[];
  fetchContactSubmissions: () => void;
  supabase: any;
  UserAvatar: any;
}

const AdminPanel: React.FC<AdminPanelProps> = ({
  profile, isAdminSections, setIsAdminSections, stagedPollFiles, setStagedPollFiles,
  isUploading, handlePollFileUpload, showToast, fetchPolls, allUsers, clearedItems,
  setClearedItems, toggleClearItem, polls, handleClosePoll, handleDeletePoll,
  deletionVotes, user, suggestions, handleUpdateSuggestionStatus, adminMessages,
  selectedAdminEmail, setSelectedAdminEmail, handleDeleteAdminEmail,
  stagedAdminReplyFiles, setStagedAdminReplyFiles, handleAdminInboxFileUpload,
  fetchAdminMessages, manualRequests, setPendingAction, pendingAction,
  fetchManualRequests, formatDate, contactSubmissions, fetchContactSubmissions, supabase, UserAvatar, adminEmailDeletionVotes
}) => {
  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 animate-slide-up">
      <div className="max-w-6xl mx-auto space-y-6 pb-20 animate-slide-up">
        <PollCreatorSection
          isOpen={isAdminSections.poll}
          onToggle={() => setIsAdminSections((prev: any) => ({ ...prev, poll: !prev.poll }))}
          stagedPollFiles={stagedPollFiles}
          setStagedPollFiles={setStagedPollFiles}
          isUploading={isUploading}
          handlePollFileUpload={handlePollFileUpload}
          showToast={showToast}
          fetchPolls={fetchPolls}
          supabase={supabase}
        />

        <UserRegistrySection
          isOpen={isAdminSections.registry}
          onToggle={() => setIsAdminSections(prev => ({ ...prev, registry: !prev.registry }))}
          allUsers={allUsers}
          clearedItems={clearedItems}
          setClearedItems={setClearedItems}
          toggleClearItem={toggleClearItem}
          UserAvatar={UserAvatar}
        />

        <ManagePollsSection
          isOpen={isAdminSections.managePolls}
          onToggle={() => setIsAdminSections(prev => ({ ...prev, managePolls: !prev.managePolls }))}
          polls={polls}
          clearedItems={clearedItems}
          toggleClearItem={toggleClearItem}
          allUsers={allUsers}
          deletionVotes={deletionVotes}
          user={user}
          handleClosePoll={handleClosePoll}
          handleDeletePoll={handleDeletePoll}
          formatDate={formatDate}
        />

        <ManageSuggestionsSection
          isOpen={isAdminSections.manageSuggestions}
          onToggle={() => setIsAdminSections(prev => ({ ...prev, manageSuggestions: !prev.manageSuggestions }))}
          suggestions={suggestions}
          clearedItems={clearedItems}
          toggleClearItem={toggleClearItem}
          handleUpdateSuggestionStatus={handleUpdateSuggestionStatus}
          formatDate={formatDate}
        />

        <AdminInboxSection
          isOpen={isAdminSections.adminInbox}
          onToggle={() => setIsAdminSections(prev => ({ ...prev, adminInbox: !prev.adminInbox }))}
          adminMessages={adminMessages}
          adminEmailDeletionVotes={adminEmailDeletionVotes}
          user={user}
          selectedAdminEmail={selectedAdminEmail}
          setSelectedAdminEmail={setSelectedAdminEmail}
          handleDeleteAdminEmail={handleDeleteAdminEmail}
          formatDate={formatDate}
          stagedAdminReplyFiles={stagedAdminReplyFiles}
          setStagedAdminReplyFiles={setStagedAdminReplyFiles}
          handleAdminInboxFileUpload={handleAdminInboxFileUpload}
          isUploading={isUploading}
          showToast={showToast}
          supabase={supabase}
          fetchAdminMessages={fetchAdminMessages}
        />

        <ContactInboxSection
          isOpen={isAdminSections.contactInbox}
          onToggle={() => setIsAdminSections(prev => ({ ...prev, contactInbox: !prev.contactInbox }))}
          contactSubmissions={contactSubmissions}
          clearedItems={clearedItems}
          toggleClearItem={toggleClearItem}
          formatDate={formatDate}
        />

        <ManualRequestsSection
          isOpen={isAdminSections.manualRequests}
          onToggle={() => setIsAdminSections(prev => ({ ...prev, manualRequests: !prev.manualRequests }))}
          manualRequests={manualRequests}
          clearedItems={clearedItems}
          setClearedItems={setClearedItems}
          toggleClearItem={toggleClearItem}
          setPendingAction={setPendingAction}
          pendingAction={pendingAction}
          formatDate={formatDate}
          supabase={supabase}
          showToast={showToast}
          fetchManualRequests={fetchManualRequests}
        />
      </div>
    </div>
  );
};

export default AdminPanel;
