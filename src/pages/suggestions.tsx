import { useState } from 'react';
import { supabase } from '../utils/supabaseClient';

const SuggestionsPage = () => {
  const [activeFilter, setActiveFilter] = useState('active');
  const [showArchived, setShowArchived] = useState(false);

  const [suggestionSearch, setSuggestionSearch] = useState('');

  // This logic separates "Live" suggestions from "Archived" ones
  const filteredSuggestions = (suggestions || []).filter(s => {
    if (suggestionSearch === 'ARCHIVED_RECORDS') return s.is_archived;
    if (s.is_archived) return false; // Hide archived by default
    
    if (!suggestionSearch) return true;
    const q = suggestionSearch.toLowerCase();
    return s.title?.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q);
  });

  const fetchSuggestions = async () => {
    let query = supabase
      .from('suggestions')
      .select('*')
      .eq('status', activeFilter)
      .order('created_at', { ascending: false });

    if (showArchived) {
      query = query.eq('is_archived', true);
    } else {
      // include non-archived and null (in case older rows have NULL)
      query = query.or('is_archived.eq.false,is_archived.is.null');
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching suggestions:', error);
    } else {
      console.log('Fetched suggestions:', data);
    }
  };

  return (
    <div>
      <button 
        onClick={() => setSuggestionSearch(suggestionSearch === 'ARCHIVED_RECORDS' ? '' : 'ARCHIVED_RECORDS')}
        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase border transition-all ${suggestionSearch === 'ARCHIVED_RECORDS' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-400 hover:border-indigo-600'}`}
      >
        <i className="fa-solid fa-box-archive mr-2"></i>
        {suggestionSearch === 'ARCHIVED_RECORDS' ? 'Back to Suggestions' : 'View Archived Records'}
      </button>
      {/* ...existing code for rendering suggestions... */}
    </div>
  );
};

export default SuggestionsPage;