import React, { useMemo } from 'react';
import { UserAvatar } from './UserAvatar';
import { formatDate, renderTextWithLinks } from '../utils/formatUtils';
import { OFFICIALS } from '../constants';

interface BoardPageProps {
  user: any;
  profile: any;
  boardMessages: any[];
  fetchBoardMessages: () => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  selectedOfficials: string[];
  setSelectedOfficials: (val: string[]) => void;
  isOfficialDropdownOpen: boolean;
  setIsOfficialDropdownOpen: (val: boolean) => void;
  stagedBoardFiles: { url: string; name: string }[];
  setStagedBoardFiles: React.Dispatch<React.SetStateAction<{ url: string; name: string }[]>>;
  isUploading: boolean;
  setIsUploading: (val: boolean) => void;
  handleBoardFileUpload: (files: FileList) => Promise<string[]>;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  setCurrentPage: (page: string) => void;
  supabase: any;
  supabaseAnonKey: string;
}

export default function BoardPage({
  user,
  profile,
  boardMessages,
  fetchBoardMessages,
  searchQuery,
  setSearchQuery,
  selectedOfficials,
  setSelectedOfficials,
  isOfficialDropdownOpen,
  setIsOfficialDropdownOpen,
  stagedBoardFiles,
  setStagedBoardFiles,
  isUploading,
  setIsUploading,
  handleBoardFileUpload,
  showToast,
  setCurrentPage,
  supabase,
  supabaseAnonKey
}: BoardPageProps) {

  // Logic to filter messages based on the search bar
  const filteredMessages = useMemo(() => {
    const messages = boardMessages || [];
    if (searchQuery === 'ARCHIVED_RECORDS') return messages.filter(m => m.is_archived);
    const visible = messages.filter(m => !m.is_archived);
    if (!searchQuery) return visible;
    const q = searchQuery.toLowerCase();
    return visible.filter(m => {
      const authorName = m.profiles?.full_name || 'Verified Voter';
      const content = m.content || '';
      const recipients = m.recipient_names || '';
      return authorName.toLowerCase().includes(q) || 
             content.toLowerCase().includes(q) || 
             recipients.toLowerCase().includes(q);
    });
  }, [boardMessages, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto pb-20 animate-slide-up">
      <div className="flex flex-col-reverse lg:flex-row gap-8">
        
        {/* --- LEFT SIDE: PUBLIC RECORD FEED --- */}
        <div className="lg:w-2/3 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <h2 className="text-4xl font-black uppercase tracking-tighter leading-none">
                  {searchQuery === 'ARCHIVED_RECORDS' ? 'Archived Records' : 'Public Record'}
                </h2>
                <p className="text-indigo-600 font-bold text-[10px] uppercase mt-1">
                  {searchQuery === 'ARCHIVED_RECORDS' ? 'Viewing historical community correspondence' : 'Official Community Correspondence'}
                </p>
              </div>
              <div className="relative w-full md:w-72">
                <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 text-xs"></i>
                <input 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  placeholder="SEARCH RECORDS..." 
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-[10px] font-black uppercase outline-none focus:ring-2 ring-indigo-500/20 transition-all" 
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 h-[60vh] lg:h-[75vh] overflow-y-auto pr-2 custom-scrollbar">
            {filteredMessages.filter(m => !m.parent_id).map((msg) => (
              <div key={msg.id} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <UserAvatar url={msg.profiles?.avatar_url} size="md" />
                    <div>
                      <p className="text-sm font-black uppercase leading-none">{msg.profiles?.full_name}</p>
                      <p className="text-[10px] font-bold text-indigo-600 uppercase">District {msg.profiles?.district} • {formatDate(msg.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 justify-end max-w-[250px]">
                    {(profile?.is_admin || msg.user_id === user?.id) && (
                      <button 
                        onClick={async () => {
                          const { error } = await supabase!.from('board_messages').update({ is_archived: !msg.is_archived }).eq('id', msg.id);
                          if (!error) fetchBoardMessages();
                        }}
                        className={`px-2 py-1 rounded text-[8px] font-black uppercase border transition-all ${msg.is_archived ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-400 border-gray-100 hover:border-indigo-600'}`}
                      >
                        <i className="fa-solid fa-box-archive mr-1"></i> {msg.is_archived ? 'Archived' : 'Archive'}
                      </button>
                    )}
                    {msg.recipient_names?.split(', ').map((name: string) => (
                      <span key={name} className="px-2 py-1 bg-gray-50 rounded text-[8px] font-black uppercase text-gray-400 border">{name}</span>
                    ))}
                  </div>
                </div>

                {msg.subject && (
                  <h4 className="text-xl font-black uppercase text-indigo-900 mb-2 tracking-tight">
                    Subject: {msg.subject}
                  </h4>
                )}
                
                <div className="text-gray-800 text-base leading-relaxed break-words whitespace-pre-wrap mb-6 border-l-4 border-indigo-50 pl-4">{renderTextWithLinks(msg.content)}</div>
                
                {msg.attachment_urls?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6 p-4 bg-gray-50 rounded-2xl">
                    {msg.attachment_urls.map((url: string, i: number) => {
                      let displayName = `Attachment ${i + 1}`;
                      try { displayName = new URL(url).searchParams.get('filename') || displayName; } catch(e){}
                      return (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-white border border-gray-200 text-indigo-600 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                          <i className="fa-solid fa-file-invoice"></i> {displayName}
                        </a>
                      );
                    })}
                  </div>
                )}

                {boardMessages.filter(reply => reply.parent_id === msg.id).sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map(reply => (
                  <div key={reply.id} className={`mt-8 p-8 rounded-[2.5rem] relative ring-1 ${reply.is_official ? 'bg-indigo-50/50 border-l-8 border-indigo-600 ring-indigo-100' : 'bg-gray-50 border-l-8 border-gray-400 ring-gray-100 ml-6'}`}>
                    <div className={`absolute -top-4 left-6 text-white px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg ${reply.is_official ? 'bg-indigo-600 shadow-indigo-200' : 'bg-gray-500 shadow-gray-200'}`}>
                      <i className={`fa-solid ${reply.is_official ? 'fa-circle-check' : 'fa-reply-all'} mr-2`}></i>
                      {reply.is_official ? 'Official Response' : 'Constituent Follow-up'}
                    </div>
                    <p className={`text-[10px] font-black uppercase mb-3 tracking-widest ${reply.is_official ? 'text-indigo-600' : 'text-gray-400'}`}>{formatDate(reply.created_at)}</p>
                    <div className="text-lg text-gray-900 font-semibold leading-relaxed mb-4">
                      {renderTextWithLinks(reply.content)}
                    </div>

                    {reply.attachment_urls?.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-4 border-t border-indigo-100">
                        {reply.attachment_urls.map((fullUrl: string, i: number) => {
                          let displayName = `Attachment ${i + 1}`;
                          try {
                            const urlParams = new URL(fullUrl).searchParams;
                            displayName = urlParams.get('filename') || displayName;
                          } catch (e) { }
                          
                          return (
                            <a key={i} href={fullUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-white border border-indigo-200 text-indigo-600 rounded-lg text-[9px] font-black uppercase flex items-center gap-2 hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                              <i className="fa-solid fa-file-invoice"></i> {displayName}
                            </a>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* --- RIGHT SIDE: MESSAGE FORM --- */}
        <div className="lg:w-1/3">
          {user ? (
            <div className="sticky top-8 bg-indigo-600 p-8 rounded-[3rem] shadow-2xl space-y-6 border-4 border-indigo-500">
              <div>
                <h3 className="text-3xl font-black text-white uppercase leading-none">Let's Talk</h3>
                <p className="text-indigo-200 text-[10px] font-bold uppercase mt-2 tracking-widest">Direct communication with officials</p>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                if (selectedOfficials.length === 0) return showToast("Select at least one official", "error");
                if (!fd.get('subject')) return showToast("Please enter a subject", "error");
                
                const fileUrls = stagedBoardFiles.map(f => f.url);

                const { data: newMessage, error } = await supabase!.from('board_messages').insert({ 
                  user_id: user.id, 
                  content: fd.get('content'), 
                  subject: fd.get('subject'),
                  recipient_names: selectedOfficials.join(', '), 
                  district: profile.district,
                  attachment_urls: fileUrls,
                  is_official: false
                }).select().single();

                 if (error) {
                  showToast(error.message, 'error');
                } else { 
                  const recipientEmails = OFFICIALS
                    .filter(off => selectedOfficials.includes(off.name) && off.email && off.email.trim() !== "")
                    .map(off => off.email);

                  if (recipientEmails.length > 0) {
                    const emailSlug = profile.full_name.toLowerCase().replace(/[^a-z0-9]/g, '.');
                    const generatedSender = `${emailSlug}@concernedcitizensofmc.com`;

                    try {
                      const { error: invokeErr } = await supabase!.functions.invoke('send-official-contact', {
                        headers: { 'Authorization': `Bearer ${supabaseAnonKey}` },
                        body: {
                          senderName: profile.full_name,
                          fromEmail: profile.virtual_email || generatedSender,
                          recipients: recipientEmails,
                          subject: `${fd.get('subject')} [MSG-${newMessage.id}]`,
                          content: fd.get('content'),
                          attachments: fileUrls,
                          messageId: newMessage.id
                        }
                      });
                      if (invokeErr) throw invokeErr;
                      showToast("Message Recorded & Emails Sent"); 
                    } catch (emailErr) {
                      showToast("Message Recorded, but email notification failed.", "error");
                    }
                  }

                  setSelectedOfficials([]); 
                  setSearchQuery('');
                  setIsOfficialDropdownOpen(false);
                  setStagedBoardFiles([]);
                  (e.target as HTMLFormElement).reset(); 
                  await fetchBoardMessages();
                }
              }} className="space-y-4">
                
                <div className="relative">
                  <button type="button" onClick={() => setIsOfficialDropdownOpen(!isOfficialDropdownOpen)} className="w-full p-5 bg-indigo-700 text-white rounded-2xl text-left text-xs font-black uppercase flex justify-between items-center border border-indigo-500">
                    <span className="truncate">{selectedOfficials.length > 0 ? `To: ${selectedOfficials.join(', ')}` : "Select Officials"}</span>
                    <i className={`fa-solid fa-chevron-${isOfficialDropdownOpen ? 'up' : 'down'}`}></i>
                  </button>
                  {isOfficialDropdownOpen && (
                    <div className="absolute top-full mt-2 w-full bg-white rounded-[2rem] shadow-2xl z-[60] p-6 grid grid-cols-1 gap-2 border border-gray-100 max-h-[350px] overflow-y-auto">
                      <p className="text-[10px] font-black uppercase text-indigo-600 mb-2 px-2">Select Recipients</p>
                      {OFFICIALS.map(off => (
                        <label key={off.id} className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-xl cursor-pointer">
                          <input type="checkbox" className="mt-1" checked={selectedOfficials.includes(off.name)} onChange={(e) => { if (e.target.checked) setSelectedOfficials([...selectedOfficials, off.name]); else setSelectedOfficials(selectedOfficials.filter(n => n !== off.name)); }} />
                          <div className="flex flex-col">
                            <span className="text-xs font-black uppercase text-gray-900 leading-tight">{off.name}</span>
                            <span className="text-[10px] font-bold uppercase text-indigo-600">{off.office}</span>
                          </div>
                        </label>
                      ))}
                      <button type="button" onClick={() => setIsOfficialDropdownOpen(false)} className="py-4 bg-gray-900 text-white rounded-xl text-[18.66px] font-black uppercase">Done</button>
                    </div>
                  )}
                </div>

                <input name="subject" required placeholder="MESSAGE SUBJECT (REQUIRED)" className="w-full p-5 bg-white rounded-2xl text-[18.66px] font-black uppercase outline-none placeholder:text-gray-300 focus:ring-4 ring-white/20" />
                <textarea name="content" required placeholder="What is your message for the public record?" className="w-full p-6 bg-white rounded-[2rem] text-[18.66px] min-h-[180px] outline-none placeholder:text-gray-300 focus:ring-4 ring-white/20" />
                
                <div className="bg-indigo-700 p-5 rounded-2xl border border-indigo-500">
                  <label className="flex items-center gap-4 cursor-pointer text-white">
                    <div className="bg-white text-indigo-600 w-10 h-10 rounded-full flex items-center justify-center shadow-lg">
                      <i className={`fa-solid ${isUploading ? 'fa-spinner animate-spin' : 'fa-paperclip'}`}></i>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase leading-none">Add Attachments</span>
                      <span className="text-[8px] font-bold text-indigo-300 uppercase mt-1">Images or Documents</span>
                    </div>
                    <input 
                      type="file" 
                      multiple 
                      className="hidden" 
                      onChange={async (e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          setIsUploading(true);
                          const urls = await handleBoardFileUpload(e.target.files);
                          const newStaged = urls.map(url => ({
                            url,
                            name: new URL(url).searchParams.get('filename') || 'File'
                          }));
                          setStagedBoardFiles(prev => [...prev, ...newStaged]);
                          setIsUploading(false);
                        }
                      }}
                    />
                  </label>
                </div>

                {stagedBoardFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-4 bg-white/10 rounded-2xl">
                    {stagedBoardFiles.map((file, idx) => (
                      <div key={idx} className="bg-white px-3 py-1.5 rounded-lg flex items-center gap-2">
                        <span className="text-[9px] font-black text-indigo-600 truncate max-w-[150px]">{file.name}</span>
                        <button type="button" onClick={() => setStagedBoardFiles(prev => prev.filter((_, i) => i !== idx))} className="text-red-500">
                          <i className="fa-solid fa-circle-xmark"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button className="w-full py-6 bg-white text-indigo-600 rounded-3xl font-black uppercase text-[18.66px] shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all">Submit to Public Record</button>
              </form>
            </div>
          ) : (
            <div className="bg-white p-12 rounded-[3.5rem] border-4 border-dashed border-gray-100 text-center">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-200 text-3xl"><i className="fa-solid fa-lock"></i></div>
              <p className="text-gray-900 font-black uppercase text-sm mb-2">Verification Required</p>
              <p className="text-gray-400 font-bold uppercase text-[9px] mb-6">Login as a verified voter to contact officials</p>
              <button onClick={() => setCurrentPage('login')} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg">Login / Register</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}