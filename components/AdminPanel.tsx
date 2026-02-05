import React from 'react';

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
     
      {/* === ADMIN PANEL START === */}
        {/* ADMIN PAGE */}
        
          <div className="max-w-6xl mx-auto space-y-6 pb-20 animate-slide-up">
            
            {/* --- POLL CREATOR SECTION --- */}
            <section className="bg-white rounded-[2.5rem] shadow-xl border-4 border-indigo-600 overflow-hidden transition-all">
              <button 
                onClick={() => setIsAdminSections((prev: any) => ({...prev, poll: !prev.poll}))}
                className="w-full p-8 flex justify-between items-center hover:bg-indigo-50 transition-colors"
              >
                <div className="text-left">
                  <h2 className="text-2xl font-black uppercase tracking-tighter">Create New Poll</h2>
                  <p className="text-indigo-600 font-bold text-[9px] uppercase tracking-widest">Publish community decision points</p>
                </div>
                <i className={`fa-solid fa-chevron-${isAdminSections.poll ? 'up' : 'down'} text-indigo-600 text-xl`}></i>
              </button>

              {isAdminSections.poll && (
                <div className="p-10 pt-0 border-t border-indigo-50">
                  <div className="mb-8 mt-8">
                    <h2 className="text-4xl font-black uppercase tracking-tighter text-gray-900">Create New Poll</h2>
                    <p className="text-indigo-600 font-black text-[18.66px] uppercase tracking-[0.2em]">Publish a new community decision point</p>
                  </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const options = [fd.get('opt1'), fd.get('opt2'), fd.get('opt3'), fd.get('opt4')].filter(o => o && o.toString().trim() !== "");
                
                if (options.length < 2) return showToast("Provide at least 2 options", "error");

                try {
                  const attachmentUrls = stagedPollFiles.map(f => f.url);

                  showToast("Publishing Poll...", "success");
                  const expiryDate = new Date(fd.get('expires') as string).toISOString();
                  const { data: poll, error: pErr } = await supabase!.from('polls').insert({ 
                    title: fd.get('title'), 
                    description: fd.get('description'),
                    attachments: attachmentUrls,
                    expires_at: expiryDate,
                    closed_at: expiryDate 
                  }).select().single();
                  
                  if (pErr) throw pErr;

                  const optData = options.map(text => ({ poll_id: poll.id, text }));
                  const { error: oErr } = await supabase!.from('poll_options').insert(optData);
                  
                  if (oErr) throw oErr;

                  showToast("Poll Published Successfully!");
                  setStagedPollFiles([]); // Clear previews
                  (e.target as HTMLFormElement).reset();
                  fetchPolls();
                } catch (err: any) {
                  showToast(err.message, "error");
                }
              }} className="space-y-6">
                
                <div className="grid grid-cols-1 gap-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[18.66px] font-black uppercase text-gray-400 ml-2">Poll Question / Title</label>
                      <input name="title" required placeholder="Ex: Proposed Rezoning of District 2" className="w-full p-6 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-indigo-600 outline-none font-black text-[18.66px] transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[18.66px] font-black uppercase text-gray-400 ml-2">Expiration Date</label>
                      <input name="expires" type="datetime-local" required className="w-full p-6 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-indigo-600 outline-none font-black text-[18.66px] transition-all" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[18.66px] font-black uppercase text-gray-400 ml-2">Context / Description</label>
                    <textarea name="description" placeholder="Provide background information, links, or context for this poll..." className="w-full p-8 bg-gray-50 rounded-[2.5rem] border-2 border-transparent focus:border-indigo-600 outline-none font-medium text-[18.66px] min-h-[200px] transition-all leading-relaxed" />
                  </div>

                  <div className="space-y-4">
                    <div className="bg-indigo-50 p-6 rounded-[2rem] border-2 border-dashed border-indigo-200">
                      <label className="flex items-center gap-4 cursor-pointer">
                        <div className="bg-indigo-600 text-white w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg">
                          <i className={`fa-solid ${isUploading ? 'fa-spinner animate-spin' : 'fa-cloud-arrow-up'}`}></i>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black uppercase text-indigo-900">Upload Supporting Documents</span>
                          <span className="text-[9px] font-bold text-indigo-400 uppercase">Photos, PDFs, or site plans</span>
                        </div>
                        <input type="file" onChange={(e) => e.target.files && handlePollFileUpload(e.target.files)} multiple className="hidden" />
                      </label>
                    </div>

                    {/* --- FILE PREVIEW GRID --- */}
                    {stagedPollFiles.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-[2rem]">
                        {stagedPollFiles.map((file, idx) => (
                          <div key={idx} className="relative group bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
                            <button 
                              type="button"
                              onClick={() => setStagedPollFiles(prev => prev.filter((_, i) => i !== idx))}
                              className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full text-[10px] flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
                            >
                              <i className="fa-solid fa-xmark"></i>
                            </button>
                            <div className="aspect-square rounded-xl bg-indigo-50 flex items-center justify-center overflow-hidden mb-2">
                              {file.name.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                                <img src={file.url} alt="Preview" className="w-full h-full object-cover" />
                              ) : (
                                <i className="fa-solid fa-file-pdf text-2xl text-indigo-400"></i>
                              )}
                            </div>
                            <p className="text-[8px] font-black uppercase text-gray-400 truncate px-1">{file.name}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              <div className="space-y-4">
                  <label className="text-[18.66px] font-black uppercase text-gray-400 ml-2">Poll Options (Min 2)</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input name="opt1" required placeholder="OPTION 1" className="p-4 bg-gray-50 rounded-xl border border-gray-100 font-bold uppercase text-[18.66px]" />
                    <input name="opt2" required placeholder="OPTION 2" className="p-4 bg-gray-50 rounded-xl border border-gray-100 font-bold uppercase text-[18.66px]" />
                    <input name="opt3" placeholder="OPTION 3 (OPTIONAL)" className="p-4 bg-gray-50 rounded-xl border border-gray-100 font-bold uppercase text-[18.66px]" />
                    <input name="opt4" placeholder="OPTION 4 (OPTIONAL)" className="p-4 bg-gray-50 rounded-xl border border-gray-100 font-bold uppercase text-[18.66px]" />
                  </div>
                </div>

                <button type="submit" className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black uppercase text-xs shadow-xl hover:bg-indigo-700 transition-all">
                  Post Poll to Public Portal
                </button>
              </form>
              </div>
              )}
            </section>

            {/* --- USER REGISTRY SECTION --- */}
            <section className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
              <button 
                onClick={() => setIsAdminSections(prev => ({...prev, registry: !prev.registry}))}
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
                  <i className={`fa-solid fa-chevron-${isAdminSections.registry ? 'up' : 'down'} text-gray-300 text-xl`}></i>
                </div>
              </button>

              {isAdminSections.registry && (
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

            {/* --- MANAGE EXISTING POLLS SECTION --- */}
            <section className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
              <button 
                onClick={() => setIsAdminSections(prev => ({...prev, managePolls: !prev.managePolls}))}
                className="w-full p-8 flex justify-between items-center hover:bg-gray-50 transition-colors"
              >
                <div className="text-left flex items-center gap-4">
                  <div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter leading-none">Manage Polls</h2>
                    <p className="text-gray-400 font-bold text-[9px] uppercase mt-1">Archive or delete live community polls</p>
                  </div>
                  <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full font-black text-[9px] uppercase">{polls.length}</span>
                </div>
                <i className={`fa-solid fa-chevron-${isAdminSections.managePolls ? 'up' : 'down'} text-gray-300`}></i>
              </button>

              {isAdminSections.managePolls && (
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
                              {/* Progress Background */}
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

            {/* --- MANAGE SUGGESTIONS SECTION --- */}
            <section className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
              <button 
                onClick={() => setIsAdminSections(prev => ({...prev, manageSuggestions: !prev.manageSuggestions}))}
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
                <i className={`fa-solid fa-chevron-${isAdminSections.manageSuggestions ? 'up' : 'down'} text-gray-300`}></i>
              </button>

              {isAdminSections.manageSuggestions && (
                <div className="p-8 border-t border-gray-50 bg-gray-50/30">
                  <div className="grid grid-cols-1 gap-6">
                    {suggestions.filter(s => !clearedItems.includes(s.id)).map((sug) => (
                  <div key={`admin-sug-${sug.id}`} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <h4 className="font-black uppercase text-[18.66px] truncate">{sug.title}</h4>
                        <span className={`px-3 py-1 rounded text-[18.66px] font-black uppercase transition-colors duration-300 ${
                          sug.status === 'Completed' ? 'bg-green-600 text-white shadow-md' : 
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
                      {['Under Review', 'Scheduled', 'Completed', 'Closed'].map((statusOption) => {
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

        {/* --- SHARED ADMIN INBOX SECTION --- */}
            <section className="bg-white rounded-[2.5rem] border-4 border-indigo-600 shadow-xl overflow-hidden">
              <button 
                onClick={() => setIsAdminSections(prev => ({...prev, adminInbox: !prev.adminInbox}))}
                className="w-full p-8 flex justify-between items-center hover:bg-indigo-50 transition-colors"
              >
                <div className="text-left">
                  <h2 className="text-3xl font-black uppercase tracking-tighter leading-none">Admin Inbox</h2>
                  <p className="text-indigo-600 font-bold text-base uppercase mt-1">Shared Correspondence with admin@</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="px-4 py-2 bg-indigo-100 text-indigo-600 rounded-full font-black text-lg">
                    {adminMessages.filter(m => !adminEmailDeletionVotes.some(v => v.message_id === m.id && v.admin_id === user?.id)).length}
                  </span>
                  <i className={`fa-solid fa-chevron-${isAdminSections.adminInbox ? 'up' : 'down'} text-indigo-600 text-2xl`}></i>
                </div>
              </button>

              {isAdminSections.adminInbox && (
                <div className="border-t border-indigo-50 flex flex-col lg:flex-row h-[700px]">
                  {/* Message List */}
                  <div className="lg:w-1/3 border-r border-gray-100 overflow-y-auto custom-scrollbar bg-gray-50/30">
                    {adminMessages
                      .filter(m => !adminEmailDeletionVotes.some(v => v.message_id === m.id && v.admin_id === user?.id))
                      .map(msg => (
                        <div 
                          key={msg.id} 
                          onClick={() => setSelectedAdminEmail(msg)}
                          className={`p-6 border-b border-gray-100 cursor-pointer transition-all ${selectedAdminEmail?.id === msg.id ? 'bg-white border-l-8 border-indigo-600 shadow-inner' : 'hover:bg-white'}`}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <p className="text-[10px] font-black uppercase text-indigo-600 truncate max-w-[150px]">{msg.from_name || msg.from_email}</p>
                            <span className="text-[8px] font-bold text-gray-400 uppercase">{formatDate(msg.created_at)}</span>
                          </div>
                          <h4 className="text-sm font-black uppercase text-gray-900 leading-tight mb-2 truncate">{msg.subject}</h4>
                          {msg.security_flag === 'warning' && (
                            <span className="text-[8px] font-black bg-amber-100 text-amber-600 px-2 py-0.5 rounded uppercase">Suspicious</span>
                          )}
                        </div>
                    ))}
                    {adminMessages.length === 0 && <p className="p-10 text-center text-gray-300 font-black uppercase text-xs italic">Inbox is empty</p>}
                  </div>

                  {/* Message Reader */}
                  <div className="lg:w-2/3 bg-white flex flex-col">
                    {selectedAdminEmail ? (
                      <div className="p-10 flex flex-col h-full overflow-hidden">
                        <div className="flex justify-between items-start mb-8 shrink-0">
                          <div>
                            <h3 className="text-2xl font-black uppercase text-indigo-600 leading-tight mb-2">{selectedAdminEmail.subject}</h3>
                            <p className="text-xs font-bold text-gray-400 uppercase">From: {selectedAdminEmail.from_name} ({selectedAdminEmail.from_email})</p>
                          </div>
                          <button 
                            onClick={() => handleDeleteAdminEmail(selectedAdminEmail.id)}
                            className="px-6 py-3 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase border border-red-100 hover:bg-red-600 hover:text-white transition-all"
                          >
                            <i className="fa-solid fa-trash-can mr-2"></i> Delete Vote
                          </button>
                        </div>

                        {selectedAdminEmail.security_note && (
                          <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl flex items-center gap-4 text-amber-700 shrink-0">
                            <i className="fa-solid fa-triangle-exclamation text-xl"></i>
                            <p className="text-[10px] font-black uppercase">{selectedAdminEmail.security_note}</p>
                          </div>
                        )}

                        <div className="flex-grow overflow-y-auto custom-scrollbar mb-8 p-8 bg-gray-50 rounded-[2rem] border border-gray-100 text-gray-800 text-base leading-relaxed whitespace-pre-wrap">
                          {selectedAdminEmail.content}
                        </div>

                        {selectedAdminEmail.attachment_urls?.length > 0 && (
                          <div className="mb-8 p-4 bg-indigo-50 rounded-2xl flex flex-wrap gap-2 shrink-0">
                             {selectedAdminEmail.attachment_urls.map((url: string, i: number) => (
                               <a key={i} href={url} target="_blank" rel="noreferrer" className="px-4 py-2 bg-white border border-indigo-200 text-indigo-600 rounded-lg text-[9px] font-black uppercase flex items-center gap-2 hover:bg-indigo-600 hover:text-white transition-all">
                                 <i className="fa-solid fa-paperclip"></i> View File {i+1}
                               </a>
                             ))}
                          </div>
                        )}

                        <div className="pt-8 border-t border-gray-100 shrink-0">
                          <p className="text-[9px] font-black uppercase text-gray-400 mb-4">Reply as Site Administrator</p>
                          <form onSubmit={async (e) => {
                            e.preventDefault();
                            const fd = new FormData(e.currentTarget);
                            const content = fd.get('reply') as string;
                            const fileUrls = stagedAdminReplyFiles.map(f => f.url);
                            
                            const { error: emailErr } = await supabase!.functions.invoke('send-official-contact', {
                              body: {
                                senderName: "Concerned Citizens of MC",
                                fromEmail: "admin@concernedcitizensofmc.com",
                                recipients: [selectedAdminEmail.from_email],
                                subject: `Re: ${selectedAdminEmail.subject}`,
                                content: content,
                                attachments: fileUrls
                              }
                            });

                            if (emailErr) {
                              showToast("Failed to send email", "error");
                            } else {
                              await supabase!.from('admin_messages').update({ status: 'replied' }).eq('id', selectedAdminEmail.id);
                              showToast("Reply sent successfully");
                              setStagedAdminReplyFiles([]); 
                              (e.target as HTMLFormElement).reset();
                              fetchAdminMessages();
                            }
                          }} className="space-y-4">
                            <textarea name="reply" required placeholder="Type your response to the constituent..." className="w-full p-6 bg-gray-50 rounded-2xl text-sm outline-none border-2 border-transparent focus:border-indigo-600 min-h-[120px]" />
                            
                            <div className="flex flex-wrap gap-2">
                              <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-xl cursor-pointer hover:bg-gray-200 transition-colors">
                                <i className={`fa-solid ${isUploading ? 'fa-spinner animate-spin' : 'fa-paperclip'} text-indigo-600`}></i>
                                <span className="text-[10px] font-black uppercase text-gray-500">Attach Files</span>
                                <input type="file" multiple className="hidden" onChange={(e) => e.target.files && handleAdminInboxFileUpload(e.target.files)} />
                              </label>

                              {stagedAdminReplyFiles.map((file, idx) => (
                                <div key={idx} className="bg-indigo-50 px-3 py-2 rounded-xl flex items-center gap-2 border border-indigo-100">
                                  <span className="text-[9px] font-black text-indigo-600 truncate max-w-[120px]">{file.name}</span>
                                  <button type="button" onClick={() => setStagedAdminReplyFiles(prev => prev.filter((_, i) => i !== idx))} className="text-red-500">
                                    <i className="fa-solid fa-circle-xmark"></i>
                                  </button>
                                </div>
                              ))}
                            </div>

                            <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg shadow-indigo-100">Send Response</button>
                          </form>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-grow flex flex-col items-center justify-center text-gray-200 p-20 text-center">
                        <i className="fa-solid fa-envelope-open-text text-6xl mb-4"></i>
                        <p className="font-black uppercase text-sm">Select a message to read</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>

        {/* --- CONTACT INBOX SECTION --- */}
            <section className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
              <button 
                onClick={() => setIsAdminSections(prev => ({...prev, contactInbox: !prev.contactInbox}))}
                className="w-full p-8 flex justify-between items-center hover:bg-gray-50 transition-colors"
              >
                <div className="text-left flex items-center gap-4">
                  <div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter leading-none">Contact Inbox</h2>
                    <p className="text-gray-400 font-bold text-[9px] uppercase mt-1">Messages from Contact Us form</p>
                  </div>
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-600 rounded-full font-black text-[9px] uppercase">{contactSubmissions.filter(c => !clearedItems.includes(c.id)).length}</span>
                </div>
                <i className={`fa-solid fa-chevron-${isAdminSections.contactInbox ? 'up' : 'down'} text-gray-300`}></i>
              </button>

              {isAdminSections.contactInbox && (
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

            {/* --- MANUAL VERIFICATION REQUESTS SECTION --- */}
            <section className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
              <button 
                onClick={() => setIsAdminSections(prev => ({...prev, manualRequests: !prev.manualRequests}))}
                className="w-full p-8 flex justify-between items-center hover:bg-gray-50 transition-colors"
              >
                <div className="text-left flex items-center gap-4">
                  <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter leading-none">Access Requests</h2>
                    <p className="text-gray-400 font-bold text-base uppercase mt-1">Manual registry verification needed</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Filter badge count by clearedItems */}
                    <span className="px-4 py-2 bg-gray-100 text-gray-500 rounded-full font-black text-base uppercase">
                      {manualRequests.filter(r => !clearedItems.includes(r.id)).length}
                    </span>
                    
                    {/* Only show 'Pending' count if visible (not cleared) */}
                    {manualRequests.filter(r => !clearedItems.includes(r.id) && r.status === 'Pending').length > 0 && (
                      <span className="px-4 py-2 bg-amber-100 text-amber-600 rounded-full font-black text-[18.66px] uppercase animate-pulse">
                        {manualRequests.filter(r => !clearedItems.includes(r.id) && r.status === 'Pending').length} Pending
                      </span>
                    )}
                    
                    {/* Only show 'NEW' badge if visible items exist */}
                    {manualRequests.filter(r => !clearedItems.includes(r.id)).length > 0 && (
                      <span className="px-3 py-1 bg-red-500 text-white rounded text-base font-black animate-pulse uppercase">NEW</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {manualRequests.some(r => clearedItems.includes(r.id)) && (
                    <button onClick={(e) => { e.stopPropagation(); setClearedItems(prev => prev.filter(id => !manualRequests.some(r => r.id === id))); }} className="text-base font-black text-indigo-600 uppercase underline">Restore All</button>
                  )}
                  <i className={`fa-solid fa-chevron-${isAdminSections.manualRequests ? 'up' : 'down'} text-gray-300 text-2xl`}></i>
                </div>
              </button>

              {isAdminSections.manualRequests && (
                <div className="border-t border-gray-50">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-gray-50 border-b border-gray-100 font-black uppercase text-gray-400 text-[18.66px] tracking-tighter">
                        <tr>
                          <th className="p-6">Applicant</th>
                          <th className="p-6">DOB</th>
                          <th className="p-6">Last 4 SSN</th>
                          <th className="p-6 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {manualRequests.filter(r => !clearedItems.includes(r.id)).map(req => (
                          <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                            <td className="p-8">
                              <p className="font-black uppercase text-[18.66px] text-gray-900 leading-none">{req.first_name} {req.last_name}</p>
                              <p className="text-[18.66px] font-bold text-gray-400 uppercase mt-1">{formatDate(req.created_at)}</p>
                            </td>
                            <td className="p-8 text-[18.66px] font-bold text-gray-500">{req.dob}</td>
                            <td className="p-8 text-[18.66px] font-mono font-bold text-gray-400">***-**-{req.ssn_last_four}</td>
                            <td className="p-8 text-right">
                              <div className="flex justify-end items-center gap-4">
                                {req.status === 'Pending' ? (
                                  <>
                                    <button 
                                      onClick={() => setPendingAction({ req, type: 'Confirm' })}
                                      className="px-8 py-4 bg-green-600 text-white rounded-2xl text-[18.66px] font-black uppercase tracking-tighter hover:scale-105 transition-all shadow-md"
                                    >
                                      Confirm
                                    </button>
                                    <button 
                                      onClick={() => setPendingAction({ req, type: 'Deny' })}
                                      className="px-8 py-4 bg-red-600 text-white rounded-2xl text-[18.66px] font-black uppercase tracking-tighter hover:scale-105 transition-all shadow-md"
                                    >
                                      Deny
                                    </button>
                                  </>
                                ) : (
                                  <span className={`px-6 py-3 rounded-2xl text-base font-black uppercase ${req.status === 'Confirmed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {req.status}
                                  </span>
                                )}
                                <button onClick={() => toggleClearItem(req.id)} className="px-6 py-3 bg-gray-100 text-gray-500 rounded-2xl text-base font-black uppercase">Clear</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {manualRequests.length === 0 && (
                          <tr><td colSpan={4} className="p-10 text-center text-[10px] font-black uppercase text-gray-300">No pending requests</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* --- ACTION CONFIRMATION MODAL --- */}
              {pendingAction && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[600] flex items-center justify-center p-4">
                  <div className={`w-full max-w-lg bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-slide-up border-8 ${pendingAction.type === 'Confirm' ? 'border-green-500' : 'border-red-500'}`}>
                    <div className="p-10 text-center space-y-8">
                      <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto text-4xl ${pendingAction.type === 'Confirm' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        <i className={`fa-solid ${pendingAction.type === 'Confirm' ? 'fa-user-check' : 'fa-user-xmark'}`}></i>
                      </div>
                      
                      <div className="space-y-4">
                        <h3 className="text-3xl font-black uppercase text-gray-900 tracking-tighter">Identity Verification</h3>
                        <div className="text-[18.66px] text-gray-500 font-medium leading-relaxed">
                          You are about to <span className={pendingAction.type === 'Confirm' ? 'text-green-600 font-black' : 'text-red-600 font-black'}>{pendingAction.type.toUpperCase()}</span> that 
                          <br/><span className="text-2xl font-black text-gray-900 block my-2">"{pendingAction.req.first_name} {pendingAction.req.last_name}"</span> 
                          is a registered Moore County voter.
                        </div>
                        <p className="text-[18.66px] text-gray-400 font-black uppercase tracking-widest bg-gray-50 py-3 rounded-2xl border border-gray-100 mt-4">
                          <i className="fa-solid fa-envelope-circle-check mr-2 text-indigo-600"></i>
                          Email will be sent to: <br/>
                          <span className="text-indigo-600 lowercase">{pendingAction.req.email}</span>
                        </p>
                      </div>

                      <div className="flex flex-col gap-3 pt-4">
                        <button 
                          onClick={async () => {
                            const newStatus = pendingAction.type === 'Confirm' ? 'Confirmed' : 'Denied';
                            const { error } = await supabase!.from('manual_access_requests').update({ status: newStatus }).eq('id', pendingAction.req.id);
                            if (error) {
                              showToast(error.message, 'error');
                            } else {
                              // Trigger the Supabase Edge Function to send email via Resend
                              let emailResult = { error: null };
                              if (pendingAction.req.email) {
                                try {
                                  const fullName = `${pendingAction.req.first_name} ${pendingAction.req.last_name}`;
                                  const { error: invokeError } = await supabase!.functions.invoke('send-confirmation', {
                                    body: { 
                                      email: pendingAction.req.email, 
                                      fullName: fullName,
                                      status: newStatus 
                                    }
                                  });
                                  if (invokeError) emailResult.error = invokeError as any;
                                } catch (emailErr: any) {
                                  emailResult.error = emailErr;
                                }
                              }

                              if (emailResult.error) {
                                console.error("Email Service Error:", emailResult.error);
                                showToast(`Saved as ${newStatus}, but email failed.`, "error");
                              } else {
                                showToast(`Account ${newStatus} & User Notified`);
                              }

                              fetchManualRequests();
                            }
                            setPendingAction(null);
                          }}
                          className={`w-full py-6 rounded-3xl font-black uppercase text-lg shadow-xl ${pendingAction.type === 'Confirm' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}
                        >
                          Continue & Notify User
                        </button>
                        <button onClick={() => setPendingAction(null)} className="w-full py-4 text-gray-400 font-black uppercase text-[18.66px] hover:text-gray-900 transition-colors">
                          Cancel Action
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>
        </div>
    </div>
  );
};

export default AdminPanel;