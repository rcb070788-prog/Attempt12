import React from 'react';

interface UserRegistrySectionProps {
  isOpen: boolean;
  onToggle: () => void;
  allUsers: any[];
  clearedItems: string[];
  setClearedItems: React.Dispatch<React.SetStateAction<string[]>>;
  toggleClearItem: (id: string) => void;
  UserAvatar: any;
}

export const UserRegistrySection: React.FC<UserRegistrySectionProps> = ({
  isOpen, onToggle, allUsers, clearedItems, setClearedItems, toggleClearItem, UserAvatar
}) => (
  <section className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full p-8 flex justify-between items-center hover:bg-gray-50 transition-colors"
    >
      <div className="text-left flex items-center gap-4">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter leading-none">Voter Registry</h2>
          <p className="text-gray-400 font-bold text-[18.66px] uppercase mt-1">Verified Moore County Users</p>
        </div>
        <span className="px-4 py-2 bg-indigo-100 text-indigo-600 rounded-full font-black text-base uppercase">{allUsers.filter(u => !clearedItems.includes(u.id)).length}</span>
      </div>
      <div className="flex items-center gap-4">
        {clearedItems.length > 0 && <button onClick={(e) => { e.stopPropagation(); setClearedItems([]); }} className="text-base font-black text-indigo-600 uppercase underline">Restore All</button>}
        <i className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'} text-gray-300 text-xl`}></i>
      </div>
    </button>

    {isOpen && (
      <div className="border-t border-gray-50 p-4">
        <div className="bg-white rounded-[3rem] border border-gray-100 overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-100 font-black uppercase text-gray-400 text-[18.66px] tracking-tighter">
              <tr><th className="p-8">Voter Name</th><th className="p-8">District</th><th className="p-8">Voter ID</th><th className="p-8 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {allUsers.filter(u => !clearedItems.includes(u.id)).map(u => (
                <tr key={u.id} className="hover:bg-indigo-50/30 transition-colors group">
                  <td className="p-8 flex items-center gap-4">
                    <UserAvatar url={u.avatar_url} size="md" />
                    <span className="font-black uppercase text-[18.66px] text-gray-900">{u.full_name}</span>
                  </td>
                  <td className="p-8 text-[18.66px] font-bold text-gray-500 uppercase tracking-tight">District {u.district}</td>
                  <td className="p-8 text-[18.66px] font-mono text-gray-400 font-bold tracking-tighter">{u.voter_id}</td>
                  <td className="p-8 text-right">
                    <button onClick={() => toggleClearItem(u.id)} className="px-6 py-3 bg-gray-100 text-gray-500 rounded-xl text-[18.66px] font-black uppercase tracking-tighter hover:bg-gray-200">Clear</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}
  </section>
);
