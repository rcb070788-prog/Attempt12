import React, { useState } from 'react';
import { UserAvatar } from './UserAvatar';
import { formatDate } from '../utils/formatUtils';

interface SuggestionsPageProps {
  user: any;
  profile: any;
  suggestions: any[];
  fetchSuggestions: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  supabase: any;
  setCurrentPage: (page: string) => void;
  setSearchQuery: (query: string) => void;
  onFocusThread?: (id: string) => void; // Added to the interface
}

export default function SuggestionsPage({
  user,
  profile,
  suggestions,
  fetchSuggestions,
  showToast,
  supabase,
  setCurrentPage,
  setSearchQuery,
  onFocusThread
}: SuggestionsPageProps) {
  
  // --- INTERNAL BRAINS (STATE) ---
  const [isSuggestionModalOpen, setIsSuggestionModalOpen] = useState(false);
  const [stagedSuggestionFiles, setStagedSuggestionFiles] = useState<{url: string, name: string}[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [isViewingArchive, setIsViewingArchive] = useState(false);

  // --- ACTIONS (FUNCTIONS) ---

  const handleSuggestionFileUpload = async (files: FileList) => {
    if (!files || !user || !supabase) return;
    setIsUploading(true);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const cleanFileName = file.name.replace(/[^\x00-\x7F]/g, ""); 
      const filePath = `suggestions/${Date.now()}_${cleanFileName}`;
      const { error: uploadError } = await supabase.storage.from('suggestion_attachments').upload(filePath, file);
      if (uploadError) {
        showToast(uploadError.message, 'error');
        continue;
      }
      const { data: { publicUrl } } = supabase.storage.from('suggestion_attachments').getPublicUrl(filePath);
      setStagedSuggestionFiles(prev => [...prev, { url: publicUrl, name: file.name }]);
    }
    setIsUploading(false);
  };

  const handleReaction = async (commentId: string, type: 'like' | 'dislike') => {
    if (!user || !supabase) return setCurrentPage('login');
    const { error } = await supabase
      .from('suggestion_reactions')
      .upsert({ comment_id: commentId, user_id: user.id, reaction_type: type }, { onConflict: 'comment_id,user_id' });
    
    if (error) showToast("Reaction failed", "error");
    else fetchSuggestions();
  };

  // --- NESTED COMMENT LOOP (THE BRAINS FOR THREADING) ---
  const displayedSuggestions = suggestions.filter(s => 
    isViewingArchive ? s.is_archived === true : (s.is_archived === false || s.is_archived === null)
  );
  const renderSuggestionComments = (comments: any[], suggestionId: string, parentId: string | null = null, depth = 0) => {
    return (comments || []).filter(c => c.parent_id === parentId).map(comment => {
      const reactions = comment.suggestion_reactions || [];
      const likes = reactions.filter((r: any) => r.reaction_type === 'like').length;
      const dislikes = reactions.filter((r: any) => r.reaction_type === 'dislike').length;
      const userReaction = reactions.find((r: any) => r.user_id === user?.id)?.reaction_type;
      
      return (
        <div key={comment.id} className={`${depth > 0 ? 'ml-4 mt-2 border-l-2 border-indigo-50 pl-3' : 'bg-white p-3 rounded-xl mb-2 border border-gray-100'}`}>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
               <UserAvatar url={comment.profiles?.avatar_url} size="sm" />
               <span className="text-[10px] font-black uppercase text-indigo-600">
                {comment.profiles?.full_name} • {formatDate(comment.created_at)}
               </span>
            </div>
            <div className="text-gray-700 text-sm md:text-base leading-snug break-words whitespace-pre-wrap font-medium">{comment.content}</div>
            <div className="flex gap-4 mt-2 text-[10px] font-black uppercase">
              <button onClick={() => handleReaction(comment.id, 'like')} className={userReaction === 'like' ? 'text-indigo-600' : 'text-gray-400'}>
                <i className="fa-solid fa-thumbs-up"></i> {likes}
              </button>
              <button onClick={() => handleReaction(comment.id, 'dislike')} className={userReaction === 'dislike' ? 'text-red-500' : 'text-gray-400'}>
                <i className="fa-solid fa-thumbs-down"></i> {dislikes}
              </button>
              <button onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)} className="text-gray-400 hover:text-indigo-600 transition-colors">Reply</button>
            </div>
            {replyTo === comment.id && (
              <form onSubmit={async (e) => { 
                e.preventDefault(); 
                const fd = new FormData(e.currentTarget); 
                await supabase?.from('suggestion_comments').insert({ suggestion_id: suggestionId, user_id: user.id, content: fd.get('content'), parent_id: comment.id }); 
                setReplyTo(null); 
                fetchSuggestions(); 
              }} className="mt-2 flex gap-2">
                <input name="content" autoFocus placeholder="Reply..." className="flex-grow p-3 bg-gray-50 rounded-lg text-sm outline-none border border-gray-200" />
                <button type="submit" className="bg-indigo-600 text-white px-4 py-1 rounded-lg text-[10px] font-black uppercase">Send</button>
              </form>
            )}
          </div>
          {renderSuggestionComments(comments, suggestionId, comment.id, depth + 1)}
        </div>
      );
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-slide-up pb-20">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-5xl font-black uppercase tracking-tighter text-gray-900">Suggestion Box</h2>
          <p className="text-indigo-600 font-bold text-[10px] uppercase tracking-[0.2em]">IDEAS YOU PROPOSE TO BE CONSIDERED BY THE COMMUNITY</p>
        </div>
        <button 
          onClick={() => setIsViewingArchive(!isViewingArchive)}
          className={`text-[10px] font-black uppercase transition-all border-b-2 pb-1 ${isViewingArchive ? 'text-indigo-600 border-indigo-600' : 'text-gray-400 border-transparent hover:border-indigo-600'}`}
        >
          {isViewingArchive ? 'Back to Live Feed' : 'View Archived Records'} <i className={`fa-solid ${isViewingArchive ? 'fa-box-open' : 'fa-box-archive'} ml-1`}></i>
        </button>
      </div>

      <div className="relative">
        <button 
          onClick={() => setIsSuggestionModalOpen(true)}
          className="fixed bottom-8 right-8 lg:bottom-auto lg:right-auto lg:top-24 lg:left-4 z-[100] bg-indigo-600 text-white w-16 h-16 rounded-2xl shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all group"
        >
          <i className="fa-solid fa-plus text-2xl group-hover:rotate-90 transition-transform"></i>
          <span className="absolute left-20 bg-gray-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap hidden lg:block">New Proposal</span>
        </button>

        {isSuggestionModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <div className="bg-indigo-600 w-full max-w-lg rounded-[3rem] shadow-2xl p-8 border-4 border-indigo-500 animate-slide-up">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-white font-black uppercase text-xl">New Proposal</h3>
                <button onClick={() => setIsSuggestionModalOpen(false)} className="text-indigo-200 hover:text-white transition-colors">
                  <i className="fa-solid fa-circle-xmark text-2xl"></i>
                </button>
              </div>
              {user ? (
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const suggestionText = fd.get('description');
                  const attachmentUrls = stagedSuggestionFiles.map(f => f.url);
                  const { error } = await supabase!.from('suggestions').insert({
                    user_id: user.id,
                    title: fd.get('title'),
                    description: suggestionText,
                    content: suggestionText,
                    category: 'General',
                    attachment_urls: attachmentUrls
                  });
                  if (error) showToast(error.message, 'error');
                  else { 
                    showToast("Proposal Submitted!"); 
                    fetchSuggestions(); 
                    setIsSuggestionModalOpen(false);
                    setStagedSuggestionFiles([]);
                    (e.target as HTMLFormElement).reset(); 
                  }
                }} className="space-y-4">
                  <textarea name="title" required placeholder="SUMMARY / TITLE" className="w-full p-6 bg-white rounded-2xl text-sm font-black uppercase outline-none shadow-inner resize-none h-24" />
                  <textarea name="description" required placeholder="DETAIL YOUR SUGGESTION..." className="w-full p-6 bg-white rounded-2xl text-base font-medium min-h-[160px] outline-none shadow-inner" />
                  
                  <div className="space-y-3">
                    <label className="flex items-center gap-4 cursor-pointer bg-indigo-700/50 p-4 rounded-2xl border border-indigo-400 hover:bg-indigo-700 transition-colors">
                      <div className="bg-white text-indigo-600 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg">
                        <i className={`fa-solid ${isUploading ? 'fa-spinner animate-spin' : 'fa-paperclip'}`}></i>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase text-white leading-none">Attach Proof or Context</span>
                        <span className="text-[8px] font-bold text-indigo-200 uppercase mt-1">Photos, PDFs, or Documents</span>
                      </div>
                      <input type="file" multiple className="hidden" onChange={(e) => e.target.files && handleSuggestionFileUpload(e.target.files)} />
                    </label>

                    {stagedSuggestionFiles.length > 0 && (
                      <div className="flex flex-wrap gap-2 p-3 bg-white/10 rounded-2xl">
                        {stagedSuggestionFiles.map((file, idx) => (
                          <div key={idx} className="bg-white px-3 py-1.5 rounded-lg flex items-center gap-2">
                            <span className="text-[9px] font-black uppercase text-indigo-600 truncate max-w-[100px]">{file.name}</span>
                            <button type="button" onClick={() => setStagedSuggestionFiles(prev => prev.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700">
                              <i className="fa-solid fa-circle-xmark"></i>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button className="w-full py-6 bg-white text-indigo-600 rounded-3xl font-black uppercase text-sm shadow-xl hover:scale-[1.02] transition-all">Submit Suggestion</button>
                </form>
              ) : (
                <div className="bg-white p-10 rounded-[2rem] text-center">
                  <p className="text-gray-400 font-black uppercase text-xs mb-4">Verification Required</p>
                  <button onClick={() => { setCurrentPage('login'); setIsSuggestionModalOpen(false); }} className="px-8 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase">Login</button>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="max-w-4xl mx-auto space-y-6">
          {displayedSuggestions.map(sug => (
            <div key={sug.id} className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col md:flex-row">
              <div className="p-10 md:w-1/2 border-b md:border-b-0 md:border-r border-gray-50 flex flex-col">
                <div className="flex items-center gap-4 mb-6">
                  <UserAvatar url={sug.profiles?.avatar_url} size="md" />
                  <div>
                    <p className="text-xs font-black uppercase text-gray-900 leading-none">{sug.profiles?.full_name}</p>
                    <p className="text-[10px] font-bold text-indigo-400 uppercase mt-1">District {sug.profiles?.district} • {formatDate(sug.created_at)}</p>
                  </div>
                </div>
                <h4 className="text-2xl font-black uppercase mb-4 leading-tight text-indigo-600 break-words whitespace-normal tracking-tight">{sug.title}</h4>
                <p className="text-gray-700 text-base md:text-lg font-medium leading-relaxed mb-6 break-words whitespace-pre-wrap">{sug.description}</p>
                
                {sug.attachment_urls?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-8">
                    {sug.attachment_urls.map((url: string, i: number) => (
                      <a key={i} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all group">
                        <i className="fa-solid fa-file-invoice text-[10px]"></i>
                        <span className="text-[9px] font-black uppercase">Reference {i + 1}</span>
                      </a>
                    ))}
                  </div>
                )}

                <div className="mt-auto flex items-center gap-3">
                   <span className={`px-4 py-2 rounded-full text-xs font-black uppercase ${
                     sug.status === 'Completed' ? 'bg-green-100 text-green-600' : 
                     sug.status === 'Scheduled' ? 'bg-blue-100 text-blue-600' : 
                     sug.status === 'Closed' ? 'bg-red-100 text-red-600' :
                     'bg-amber-100 text-amber-600'
                   }`}>
                     <i className="fa-solid fa-circle-info mr-1"></i>
                     Status: {sug.status || 'Under Review'}
                   </span>
                   {isViewingArchive && (
                     <button 
                       onClick={() => onFocusThread?.(sug.id)}
                       className="px-4 py-2 bg-indigo-600 text-white rounded-full text-[10px] font-black uppercase shadow-lg hover:scale-105 transition-all"
                     >
                       Open Dialogue
                     </button>
                   )}
                </div>
              </div>

              <div className="p-8 md:w-1/2 bg-gray-50/50 flex flex-col h-[500px]">
                <h5 className="text-xs font-black uppercase text-indigo-400 mb-4 tracking-widest px-2">Engagement Feed</h5>
                <div className="flex-grow overflow-y-auto custom-scrollbar px-2">
                  {user ? (
                     <form onSubmit={async (e) => { 
                       e.preventDefault(); 
                       const fd = new FormData(e.currentTarget); 
                       await supabase?.from('suggestion_comments').insert({ suggestion_id: sug.id, user_id: user.id, content: fd.get('content') }); 
                       (e.target as HTMLFormElement).reset(); 
                       fetchSuggestions(); 
                     }} className="mb-6 flex gap-3">
                       <input name="content" required placeholder="Add a comment..." className="flex-grow p-4 bg-white rounded-2xl text-sm outline-none border border-gray-200 shadow-sm focus:ring-2 ring-indigo-500/10 transition-all" />
                       <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-2xl text-[10px] font-black uppercase shadow-lg shadow-indigo-100">Post</button>
                     </form>
                  ) : null}
                  {renderSuggestionComments(sug.suggestion_comments || [], sug.id)}
                </div>
              </div>
            </div>
          ))}

          {displayedSuggestions.length === 0 && (
            <div className="p-20 text-center bg-white rounded-[3rem] border-4 border-dashed border-gray-50">
              <p className="text-gray-300 font-black uppercase text-xs italic">No active proposals yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}