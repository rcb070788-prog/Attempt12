import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export function useFeatures(user: any, profile: any) {
  const [polls, setPolls] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [boardMessages, setBoardMessages] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [manualRequests, setManualRequests] = useState<any[]>([]);
  const [adminMessages, setAdminMessages] = useState<any[]>([]);
  const [adminEmailDeletionVotes, setAdminEmailDeletionVotes] = useState<any[]>([]);
  const [deletionVotes, setDeletionVotes] = useState<any[]>([]);

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
        .select(`*, profiles(full_name, district, avatar_url), suggestion_comments(id, content, created_at, parent_id, profiles(full_name, district, avatar_url), suggestion_reactions(*))`)
        .order('created_at', { ascending: false });
      if (!error) setSuggestions(data || []);
    } catch (err) { console.error(err); }
  };

  const fetchBoardMessages = async () => {
    if (!supabase) return;
    const { data } = await supabase.from('board_messages').select(`*, profiles (full_name, district, avatar_url)`).order('created_at', { ascending: false });
    if (data) setBoardMessages(data || []);
  };

  const fetchUsers = async () => {
    if (!supabase) return;
    const { data } = await supabase.from('profiles').select('*').order('full_name', { ascending: true });
    setAllUsers(data || []);
  };

  const fetchManualRequests = async () => {
    if (!supabase) return;
    const { data } = await supabase.from('manual_access_requests').select('*').order('created_at', { ascending: false });
    setManualRequests(data || []);
  };

  const fetchAdminMessages = async () => {
    if (!supabase || !profile?.is_admin) return;
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
  };

  // Live Update "Listener" (Real-time)
  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel('feature-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'poll_votes' }, () => fetchPolls())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'poll_comments' }, () => fetchPolls())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'suggestions' }, () => fetchSuggestions())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'suggestion_comments' }, () => fetchSuggestions())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'board_messages' }, () => fetchBoardMessages())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_messages' }, () => fetchAdminMessages())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_email_deletion_votes' }, () => fetchAdminEmailDeletionVotes())
      .subscribe();

    fetchAllData();

    return () => { supabase.removeChannel(channel); };
  }, [profile]); // Refetch if admin status changes

  return {
    polls, setPolls, fetchPolls,
    suggestions, setSuggestions, fetchSuggestions,
    boardMessages, setBoardMessages, fetchBoardMessages,
    allUsers, fetchUsers,
    manualRequests, fetchManualRequests,
    adminMessages, fetchAdminMessages,
    adminEmailDeletionVotes, fetchAdminEmailDeletionVotes,
    deletionVotes, fetchDeletionVotes,
    fetchAllData
  };
}