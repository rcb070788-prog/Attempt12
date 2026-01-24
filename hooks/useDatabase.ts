import { useState } from 'react';
import { supabase } from '../App'; // We will export supabase from App.tsx in the next step

export function useDatabase() {
  const [financialData, setFinancialData] = useState<any[]>([]);
  const [yearDetailData, setYearDetailData] = useState<any[]>([]);
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
    const { data } = await supabase.from('suggestions').select(`*, profiles(full_name, district, avatar_url), suggestion_comments(*, profiles(full_name, district, avatar_url), suggestion_reactions(*))`).order('created_at', { ascending: false });
    if (data) setSuggestions(data || []);
  };

  const fetchFinancialData = async () => {
    if (!supabase) return;
    const levelFilter = 'hierarchy_level.in.(1,2,3)';
    const { data: b1 } = await supabase.from('AFR_Exhibit_A').select('*').gte('year', 2004).lte('year', 2013).or(levelFilter);
    const { data: b2 } = await supabase.from('AFR_Exhibit_A').select('*').gte('year', 2014).lte('year', 2023).or(levelFilter);
    const { data: b3 } = await supabase.from('AFR_Exhibit_A').select('*').gte('year', 2024).lte('year', 2033).or(levelFilter);
    const combined = [...(b1 || []), ...(b2 || []), ...(b3 || [])];
    setFinancialData(combined.sort((a, b) => a.year - b.year));
  };

  const fetchYearDetails = async (year: number) => {
    if (!supabase) return;
    const { data } = await supabase.from('AFR_Exhibit_A').select('*').eq('year', year);
    if (data) setYearDetailData(data);
  };

  // Add more fetchers as needed here following the same pattern

  return {
    financialData, setFinancialData,
    yearDetailData, setYearDetailData,
    polls, setPolls,
    suggestions, setSuggestions,
    fetchPolls,
    fetchSuggestions,
    fetchFinancialData,
    fetchYearDetails
  };
}