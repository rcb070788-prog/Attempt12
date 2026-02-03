import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { readFileAsArrayBuffer, normalizeUploadErrorMessage } from '../utils/fileUtils';

export function useActions(
  user: any, 
  profile: any, 
  setProfile: any, 
  showToast: (msg: string, type?: 'success' | 'error') => void,
  features: any, // This brings in all the fetchers from useFeatures
  stateHelpers: {
    setSelectedPoll: any,
    setSelectedAdminEmail: any,
    setCurrentPage: any,
    selectedPoll: any,
    selectedAdminEmail: any
  }
) {
  const [isUploading, setIsUploading] = useState(false);
  const [stagedPollFiles, setStagedPollFiles] = useState<{url: string, name: string}[]>([]);
  const [stagedAdminReplyFiles, setStagedAdminReplyFiles] = useState<{url: string, name: string}[]>([]);
  const [stagedBoardFiles, setStagedBoardFiles] = useState<{url: string, name: string}[]>([]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !supabase) return;
    try {
      setIsUploading(true);
      const filePath = `${user.id}/avatar_image`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { 
        upsert: true,
        contentType: file.type 
      });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const urlWithCacheBuster = `${publicUrl}?t=${Date.now()}`;
      
      const { error: dbError } = await supabase
        .from('profiles')
        .upsert({ id: user.id, avatar_url: urlWithCacheBuster }, { onConflict: 'id' });

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
      try {
        const arrayBuffer = await readFileAsArrayBuffer(file);
        const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
        const filePath = `board/${Date.now()}_${safeName}`;
        const { error: uploadError } = await supabase.storage.from('board_attachments').upload(filePath, arrayBuffer, { contentType: file.type });
        if (uploadError) {
          showToast(normalizeUploadErrorMessage(uploadError.message), 'error');
          continue;
        }
        const { data: { publicUrl } } = supabase.storage.from('board_attachments').getPublicUrl(filePath);
        uploadedUrls.push(`${publicUrl}?filename=${encodeURIComponent(file.name)}`);
      } catch (err: any) {
        showToast(normalizeUploadErrorMessage(err?.message || 'Upload failed'), 'error');
      }
    }
    return uploadedUrls;
  };

  const handlePollFileUpload = async (files: FileList) => {
    if (!files || !user || !supabase) return;
    setIsUploading(true);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const arrayBuffer = await readFileAsArrayBuffer(file);
        const cleanFileName = file.name.replace(/[^\x00-\x7F]/g, "");
        const filePath = `polls/${Date.now()}_${cleanFileName}`;
        const { error: uploadError } = await supabase.storage.from('poll_attachments').upload(filePath, arrayBuffer, { contentType: file.type });
        if (uploadError) { showToast(normalizeUploadErrorMessage(uploadError.message), 'error'); continue; }
        const { data: { publicUrl } } = supabase.storage.from('poll_attachments').getPublicUrl(filePath);
        setStagedPollFiles(prev => [...prev, { url: publicUrl, name: file.name }]);
      } catch (err: any) {
        showToast(normalizeUploadErrorMessage(err?.message || 'Upload failed'), 'error');
      }
    }
    setIsUploading(false);
  };

  const handleAdminInboxFileUpload = async (files: FileList) => {
    if (!files || !user || !supabase) return;
    setIsUploading(true);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const arrayBuffer = await readFileAsArrayBuffer(file);
        const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
        const filePath = `outbound/${Date.now()}_${safeName}`;
        const { error: uploadError } = await supabase.storage.from('admin_inbox_attachments').upload(filePath, arrayBuffer, { contentType: file.type });
        if (uploadError) { showToast(normalizeUploadErrorMessage(uploadError.message), 'error'); continue; }
        const { data } = supabase.storage.from('admin_inbox_attachments').getPublicUrl(filePath);
        const publicUrl = `${data.publicUrl}?filename=${encodeURIComponent(file.name)}`;
        setStagedAdminReplyFiles(prev => [...prev, { url: publicUrl, name: file.name }]);
      } catch (err: any) {
        showToast(normalizeUploadErrorMessage(err?.message || 'Upload failed'), 'error');
      }
    }
    setIsUploading(false);
  };

  const handleReaction = async (commentId: string, type: 'like' | 'dislike', table: 'comment_reactions' | 'suggestion_reactions' = 'comment_reactions') => {
    if (!user || !supabase) return stateHelpers.setCurrentPage('login');
    const { error } = await supabase.from(table).upsert({ comment_id: commentId, user_id: user.id, reaction_type: type }, { onConflict: 'comment_id,user_id' });
    if (error) {
      showToast("Reaction failed", "error");
    } else {
      if (table === 'comment_reactions') features.fetchPolls();
      else features.fetchSuggestions();
    }
  };

  const handleClosePoll = async (pollId: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('polls').update({ expires_at: new Date().toISOString() }).eq('id', pollId);
    if (error) showToast(error.message, "error"); else { showToast("Poll Closed Early"); features.fetchPolls(); }
  };

  const handleUpdateSuggestionStatus = async (suggestionId: string, status: string) => {
    if (!supabase || !profile?.is_admin) return;
    try {
      // Optimistically update the UI
      features.setSuggestions((prev: any[]) => prev.map(s => s.id === suggestionId ? { ...s, status: status } : s));
      
      // Update DB. The SQL Trigger we added will handle the 'closed_at' timestamp automatically.
      const { error } = await supabase.from('suggestions').update({ 
        status: status,
        // If we move it back to 'Active', we force it out of archive
        is_archived: status === 'Closed' ? false : false 
      }).eq('id', suggestionId);

      if (error) { await features.fetchSuggestions(); throw error; }
      showToast(`Proposal marked as ${status.toUpperCase()}`);
    } catch (err: any) { showToast(err.message, "error"); }
  };

  const handleDeletePoll = async (pollId: string) => {
    if (!supabase || !user || !profile?.is_admin) return;
    try {
      await supabase.from('admin_deletion_votes').upsert({ target_id: pollId, target_type: 'poll', admin_id: user.id }, { onConflict: 'target_id,admin_id' });
      const { data: currentVotesData } = await supabase.from('admin_deletion_votes').select('*').eq('target_id', pollId);
      const totalAdmins = features.allUsers.filter((u: any) => u.is_admin).length;
      const currentVoteCount = currentVotesData?.length || 0;

      if (currentVoteCount >= totalAdmins) {
        if (window.confirm(`Consensus reached (${currentVoteCount}/${totalAdmins} admins). Delete permanently?`)) {
          await supabase.from('polls').delete().eq('id', pollId);
          showToast("Consensus met: Poll deleted");
          features.fetchPolls();
          features.fetchDeletionVotes();
          if (stateHelpers.selectedPoll?.id === pollId) stateHelpers.setSelectedPoll(null);
        }
      } else {
        showToast(`Delete vote recorded (${currentVoteCount}/${totalAdmins} admins)`);
        features.fetchDeletionVotes();
      }
    } catch (err: any) { showToast(err.message, "error"); }
  };

  const handleDeleteAdminEmail = async (messageId: string) => {
    if (!supabase || !user || !profile?.is_admin) return;
    try {
      const adminList = features.allUsers.filter((u: any) => u.is_admin);
      const totalAdminsRequired = adminList.length || 1;
      const { data: currentVotes } = await supabase.from('admin_email_deletion_votes').select('*').eq('message_id', messageId);
      const currentVoteCount = currentVotes?.length || 0;
      
      if (currentVotes?.some(v => v.admin_id === user.id)) {
        showToast("You have already voted to clear this email.", "error");
        return;
      }

      const isLastAdmin = (currentVoteCount + 1) >= totalAdminsRequired;
      if (isLastAdmin && !window.confirm("FINAL CONSENSUS: Delete permanently?")) return;

      await supabase.from('admin_email_deletion_votes').upsert({ message_id: messageId, admin_id: user.id });

      if (isLastAdmin) {
        await supabase.from('admin_messages').delete().eq('id', messageId);
        showToast("Consensus met: Email permanently deleted.");
        stateHelpers.setSelectedAdminEmail(null);
      } else {
        showToast(`Email cleared from your view. (${currentVoteCount + 1}/${totalAdminsRequired} votes)`);
        stateHelpers.setSelectedAdminEmail(null);
      }
      features.fetchAdminMessages();
      features.fetchAdminEmailDeletionVotes();
    } catch (err: any) { showToast(err.message, "error"); }
  };

  return {
    isUploading, setIsUploading,
    stagedPollFiles, setStagedPollFiles,
    stagedAdminReplyFiles, setStagedAdminReplyFiles,
    handlePhotoUpload,
    handleBoardFileUpload,
    handlePollFileUpload,
    handleAdminInboxFileUpload,
    handleReaction,
    handleClosePoll,
    handleUpdateSuggestionStatus,
    handleDeletePoll,
    handleDeleteAdminEmail,
    stagedBoardFiles,
    setStagedBoardFiles
  };
}