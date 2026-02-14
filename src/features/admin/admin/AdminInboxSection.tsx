import React from 'react';

interface AdminInboxSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  adminMessages: any[];
  adminEmailDeletionVotes: any[];
  user: any;
  selectedAdminEmail: any;
  setSelectedAdminEmail: React.Dispatch<React.SetStateAction<any>>;
  handleDeleteAdminEmail: (id: string) => void;
  formatDate: (date: any) => string;
  stagedAdminReplyFiles: any[];
  setStagedAdminReplyFiles: React.Dispatch<React.SetStateAction<any[]>>;
  handleAdminInboxFileUpload: (files: FileList) => void;
  isUploading: boolean;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  supabase: any;
  fetchAdminMessages: () => void;
}

export const AdminInboxSection: React.FC<AdminInboxSectionProps> = ({
  isOpen, onToggle, adminMessages, adminEmailDeletionVotes, user, selectedAdminEmail,
  setSelectedAdminEmail, handleDeleteAdminEmail, formatDate, stagedAdminReplyFiles,
  setStagedAdminReplyFiles, handleAdminInboxFileUpload, isUploading, showToast, supabase, fetchAdminMessages
}) => (
  <section className="bg-white rounded-[2.5rem] border-4 border-indigo-600 shadow-xl overflow-hidden">
    <button
      onClick={onToggle}
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
        <i className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'} text-indigo-600 text-2xl`}></i>
      </div>
    </button>

    {isOpen && (
      <div className="border-t border-indigo-50 flex flex-col lg:flex-row h-[700px]">
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
                      <i className="fa-solid fa-paperclip"></i> View File {i + 1}
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
);
