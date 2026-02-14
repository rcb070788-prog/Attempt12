import React from 'react';

interface ManagePollsSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  polls: any[];
  clearedItems: string[];
  toggleClearItem: (id: string) => void;
  allUsers: any[];
  deletionVotes: any[];
  user: any;
  handleClosePoll: (id: string) => void;
  handleDeletePoll: (id: string) => void;
  formatDate: (date: any) => string;
}

export const ManagePollsSection: React.FC<ManagePollsSectionProps> = ({
  isOpen, onToggle, polls, clearedItems, toggleClearItem, allUsers, deletionVotes,
  user, handleClosePoll, handleDeletePoll, formatDate
}) => (
  <section className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full p-8 flex justify-between items-center hover:bg-gray-50 transition-colors"
    >
      <div className="text-left flex items-center gap-4">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter leading-none">Manage Polls</h2>
          <p className="text-gray-400 font-bold text-[9px] uppercase mt-1">Archive or delete live community polls</p>
        </div>
        <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full font-black text-[9px] uppercase">{polls.length}</span>
      </div>
      <i className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'} text-gray-300`}></i>
    </button>

    {isOpen && (
      <div className="p-8 border-t border-gray-50 bg-gray-50/30">
        <div className="grid grid-cols-1 gap-6">
          {polls.filter(p => !clearedItems.includes(p.id)).map(poll => {
            const isExpired = new Date(poll.expires_at) < new Date();
            return (
              <div key={poll.id} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-4 mb-2">
                    <h4 className="font-black uppercase text-[18.66px] truncate">{poll.title}</h4>
                    <span className={`px-3 py-1 rounded text-[18.66px] font-black uppercase ${isExpired ? 'bg-gray-100 text-gray-400' : 'bg-green-100 text-green-600'}`}>
                      {isExpired ? 'Closed' : 'Active'}
                    </span>
                  </div>
                  <p className="text-[18.66px] font-bold text-gray-400 uppercase">Created {formatDate(poll.created_at)} • {poll.poll_votes?.length || 0} Total Votes</p>
                </div>

                <div className="flex items-center gap-4">
                  {!isExpired && (
                    <button onClick={() => handleClosePoll(poll.id)} className="px-8 py-4 bg-gray-900 text-white rounded-2xl text-[18.66px] font-black uppercase hover:bg-black transition-colors">Close Early</button>
                  )}
                  <button onClick={() => toggleClearItem(poll.id)} className="px-8 py-4 bg-gray-100 text-gray-500 rounded-2xl text-[18.66px] font-black uppercase hover:bg-gray-200 transition-colors">Clear</button>
                  {(() => {
                    const adminList = allUsers.filter(u => u.is_admin);
                    const totalAdmins = adminList.length || 1;
                    const currentVotes = deletionVotes.filter(v => v.target_id === poll.id).length;
                    const progress = (currentVotes / totalAdmins) * 100;
                    const hasVoted = deletionVotes.some(v => v.target_id === poll.id && v.admin_id === user?.id);

                    return (
                      <button
                        onClick={() => handleDeletePoll(poll.id)}
                        className="relative w-32 h-16 bg-gray-100 rounded-2xl overflow-hidden group transition-all border-2 border-gray-200"
                        title={`${currentVotes} of ${totalAdmins} admins voted to delete`}
                      >
                        <div
                          className={`absolute inset-y-0 left-0 transition-all duration-700 ${hasVoted ? 'bg-red-500' : 'bg-red-400'}`}
                          style={{ width: `${progress}%`, opacity: hasVoted ? 0.4 : 0.2 }}
                        ></div>
                        <div className="relative z-10 flex flex-col items-center justify-center h-full">
                          <i className={`fa-solid ${hasVoted ? 'fa-check-to-slot' : 'fa-trash-can'} ${hasVoted ? 'text-red-600' : 'text-gray-400'} text-sm group-hover:scale-110 transition-transform`}></i>
                          <span className="text-[9px] font-black uppercase mt-1 text-gray-600 tracking-tighter">
                            {currentVotes} / {totalAdmins} ADM
                          </span>
                        </div>
                      </button>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    )}
  </section>
);
