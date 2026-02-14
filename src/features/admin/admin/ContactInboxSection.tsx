import React from 'react';

interface ContactInboxSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  contactSubmissions: any[];
  clearedItems: string[];
  toggleClearItem: (id: string) => void;
  formatDate: (date: any) => string;
}

export const ContactInboxSection: React.FC<ContactInboxSectionProps> = ({
  isOpen, onToggle, contactSubmissions, clearedItems, toggleClearItem, formatDate
}) => (
  <section className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full p-8 flex justify-between items-center hover:bg-gray-50 transition-colors"
    >
      <div className="text-left flex items-center gap-4">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter leading-none">Contact Inbox</h2>
          <p className="text-gray-400 font-bold text-[9px] uppercase mt-1">Messages from Contact Us form</p>
        </div>
        <span className="px-3 py-1 bg-indigo-100 text-indigo-600 rounded-full font-black text-[9px] uppercase">{contactSubmissions.filter(c => !clearedItems.includes(c.id)).length}</span>
      </div>
      <i className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'} text-gray-300`}></i>
    </button>

    {isOpen && (
      <div className="p-8 border-t border-gray-50 bg-gray-50/30">
        <div className="grid grid-cols-1 gap-6">
          {contactSubmissions.filter(c => !clearedItems.includes(c.id)).map((sub) => (
            <div key={sub.id} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-black uppercase text-[18.66px] text-gray-900">{sub.subject}</h4>
                  <p className="text-[18.66px] font-bold text-gray-400 uppercase mt-1">From {sub.name} • {formatDate(sub.created_at)}</p>
                  {(sub.email || sub.phone) && (
                    <p className="text-sm font-bold text-indigo-600 mt-2">
                      {sub.email && <span>Email: {sub.email}</span>}
                      {sub.email && sub.phone && ' • '}
                      {sub.phone && <span>Phone: {sub.phone}</span>}
                    </p>
                  )}
                </div>
                <button onClick={() => toggleClearItem(sub.id)} className="px-6 py-3 bg-gray-100 text-gray-500 rounded-2xl text-base font-black uppercase">Clear</button>
              </div>
              <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 text-gray-800 text-base leading-relaxed whitespace-pre-wrap">
                {sub.comment}
              </div>
            </div>
          ))}
          {contactSubmissions.filter(c => !clearedItems.includes(c.id)).length === 0 && (
            <p className="text-center py-10 text-[10px] font-black uppercase text-gray-300">No contact submissions yet.</p>
          )}
        </div>
      </div>
    )}
  </section>
);
