import React from 'react';

interface ManageSuggestionsSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  suggestions: any[];
  clearedItems: string[];
  toggleClearItem: (id: string) => void;
  handleUpdateSuggestionStatus: (id: string, status: string) => void;
  formatDate: (date: any) => string;
}

export const ManageSuggestionsSection: React.FC<ManageSuggestionsSectionProps> = ({
  isOpen, onToggle, suggestions, clearedItems, toggleClearItem, handleUpdateSuggestionStatus, formatDate
}) => (
  <section className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full p-8 flex justify-between items-center hover:bg-gray-50 transition-colors"
    >
      <div className="text-left flex items-center gap-4">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter leading-none">Manage Suggestions</h2>
          <p className="text-gray-400 font-bold text-[9px] uppercase mt-1">Update proposal status</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full font-black text-[9px] uppercase">{suggestions.length}</span>
          <span className="px-2 py-0.5 bg-red-500 text-white rounded text-[8px] font-black animate-pulse">NEW</span>
        </div>
      </div>
      <i className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'} text-gray-300`}></i>
    </button>

    {isOpen && (
      <div className="p-8 border-t border-gray-50 bg-gray-50/30">
        <div className="grid grid-cols-1 gap-6">
          {suggestions.filter(s => !clearedItems.includes(s.id)).map((sug) => (
            <div key={`admin-sug-${sug.id}`} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-4 mb-2">
                  <h4 className="font-black uppercase text-[18.66px] truncate">{sug.title}</h4>
                  <span className={`px-3 py-1 rounded text-[18.66px] font-black uppercase transition-colors duration-300 ${
                    sug.status === 'Underway' ? 'bg-green-600 text-white shadow-md' :
                    sug.status === 'Scheduled' ? 'bg-blue-600 text-white shadow-md' :
                    sug.status === 'Closed' ? 'bg-red-600 text-white shadow-md' :
                    'bg-amber-500 text-white shadow-md'
                  }`}>
                    {sug.status || 'Under Review'}
                  </span>
                </div>
                <p className="text-[18.66px] font-bold text-gray-400 uppercase">By {sug.profiles?.full_name || 'Verified Voter'} • {formatDate(sug.created_at)}</p>
              </div>

              <div className="flex flex-wrap gap-4 justify-center items-center">
                {['Under Review', 'Scheduled', 'Underway', 'Closed'].map((statusOption) => {
                  const isActive = sug.status === statusOption || (!sug.status && statusOption === 'Under Review');
                  return (
                    <button
                      key={statusOption}
                      onClick={() => handleUpdateSuggestionStatus(sug.id, statusOption)}
                      className={`px-6 py-4 rounded-2xl text-[18.66px] font-black uppercase tracking-tighter transition-all duration-200 ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 ring-2 ring-indigo-600 ring-offset-2'
                          : 'bg-white border-2 border-gray-200 text-gray-400 hover:border-indigo-600 hover:text-indigo-600'
                      }`}
                    >
                      {statusOption}
                    </button>
                  );
                })}
                <div className="h-10 w-px bg-gray-100 mx-2"></div>
                <button onClick={() => toggleClearItem(sug.id)} className="px-6 py-3 bg-gray-100 text-gray-500 rounded-2xl text-base font-black uppercase">Clear</button>
              </div>
            </div>
          ))}
          {suggestions.length === 0 && (
            <p className="text-center py-10 text-[10px] font-black uppercase text-gray-300">No suggestions to manage.</p>
          )}
        </div>
      </div>
    )}
  </section>
);
