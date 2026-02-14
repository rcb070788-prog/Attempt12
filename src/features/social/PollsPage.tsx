import React, { useState } from 'react';
import { UserAvatar } from '../../components/UserAvatar';
import { renderTextWithLinks, formatDate } from '../../utils/formatUtils';

interface PollsPageProps {
  user: any;
  profile: any;
  polls: any[];
  fetchPolls: () => Promise<void>;
  selectedPoll: any;
  setSelectedPoll: (poll: any) => void;
  supabase: any;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  showSignupRequiredModal: (message: string) => void;
  setCurrentPage: (page: string) => void;
  setShowPollLoginModal: (show: boolean) => void;
}

export default function PollsPage({
  user,
  profile,
  polls,
  fetchPolls,
  selectedPoll,
  setSelectedPoll,
  supabase,
  showToast,
  showSignupRequiredModal,
  setCurrentPage,
  setShowPollLoginModal
}: PollsPageProps) {
  // --- INTERNAL MEMORY (State) ---
  const [pollFilter, setPollFilter] = useState<'active' | 'completed'>('active');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [pendingVote, setPendingVote] = useState<{pollId: string, optionId: string, optionText: string, isAnonymous: boolean, isChanging?: boolean} | null>(null);
  const [registryModal, setRegistryModal] = useState<{optionText: string, voters: any[]} | null>(null);

  // --- ACTIONS ---

  const handleReaction = async (commentId: string, type: 'like' | 'dislike') => {
    if (!user || !supabase) return setCurrentPage('login');
    if (user && !profile) return showSignupRequiredModal('To react to comments, you must first sign up. To sign up click here.');
    const { error } = await supabase
      .from('comment_reactions')
      .upsert({ comment_id: commentId, user_id: user.id, reaction_type: type }, { onConflict: 'comment_id,user_id' });
    
    if (error) {
      showToast("Reaction failed", "error");
    } else {
      fetchPolls();
    }
  };

  const confirmVote = async () => {
    if (!pendingVote || !supabase || !user) return;
    if (user && !profile) return showSignupRequiredModal('To participate in this poll, you must first sign up. To sign up click here.');
    const cleanVotePayload = {
      poll_id: pendingVote.pollId,
      option_id: pendingVote.optionId,
      user_id: user.id,
      is_anonymous: pendingVote.isAnonymous === true
    };

    const { error } = await supabase
      .from('poll_votes')
      .upsert(cleanVotePayload, { onConflict: 'poll_id,user_id' });

    if (error) {
      showToast(error.message, 'error');
    } else {
      showToast("Vote recorded successfully");
      await fetchPolls();
    }
    setPendingVote(null);
  };

  const renderComments = (pollComments: any[], pollId: string, parentId: string | null = null, depth = 0) => {
    return (pollComments || []).filter(c => c.parent_id === parentId && !c.is_hidden).map(comment => {
      const reactions = comment.comment_reactions || [];
      const likes = reactions.filter((r: any) => r.reaction_type === 'like').length;
      const dislikes = reactions.filter((r: any) => r.reaction_type === 'dislike').length;
      const userReaction = reactions.find((r: any) => r.user_id === user?.id)?.reaction_type;
      return (
        <div key={comment.id} className={`min-w-0 ${depth > 0 ? 'ml-6 mt-2 border-l-2 border-gray-100 pl-4' : 'bg-gray-50 p-4 rounded-2xl mb-4'}`}>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 mb-1">
               <UserAvatar url={comment.profiles?.avatar_url} size="sm" />
               <span className="text-xs md:text-[9px] font-black uppercase text-indigo-600">
                {comment.profiles?.full_name || 'Verified Voter'} • Dist {comment.profiles?.district || '?'} • {formatDate(comment.created_at)}
               </span>
            </div>
            <div className="text-gray-800 text-base md:text-sm leading-relaxed break-words whitespace-pre-wrap">{renderTextWithLinks(comment.content)}</div>
            <div className="flex gap-4 mt-3 text-xs md:text-[9px] font-black uppercase tracking-widest">
              <button onClick={() => handleReaction(comment.id, 'like')} className={userReaction === 'like' ? 'text-indigo-600' : 'text-gray-400'}>
                <i className={`fa-${userReaction === 'like' ? 'solid' : 'regular'} fa-thumbs-up`}></i> {likes}
              </button>
              <button onClick={() => handleReaction(comment.id, 'dislike')} className={userReaction === 'dislike' ? 'text-red-500' : 'text-gray-400'}>
                <i className={`fa-${userReaction === 'dislike' ? 'solid' : 'regular'} fa-thumbs-down`}></i> {dislikes}
              </button>
              <button onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)} className="text-gray-400">Reply</button>
            </div>
            {replyTo === comment.id && (
              <form onSubmit={async (e) => { 
                e.preventDefault(); 
                if (user && !profile) return showSignupRequiredModal('To make a comment, you must first sign up. To sign up click here.');
                const fd = new FormData(e.currentTarget); 
                await supabase?.from('poll_comments').insert({ poll_id: pollId, user_id: user.id, content: fd.get('content'), parent_id: comment.id }); 
                setReplyTo(null); 
                fetchPolls(); 
              }} className="mt-3 flex gap-2 min-w-0">
                <input name="content" autoFocus placeholder="Write a reply..." className="flex-grow min-w-0 p-3 bg-white rounded-xl text-sm md:text-xs outline-none border" />
                <button type="submit" className="flex-shrink-0 bg-indigo-600 text-white px-4 py-1 rounded-xl text-xs md:text-[9px] font-black uppercase">Send</button>
              </form>
            )}
          </div>
          {renderComments(pollComments, pollId, comment.id, depth + 1)}
        </div>
      );
    });
  };

  return (
    <div className={selectedPoll ? 'w-full px-4 md:max-w-4xl md:mx-auto' : 'max-w-4xl mx-auto'}>
      {/* LOCAL POLL MODALS (Registry & Voting) */}
      {registryModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setRegistryModal(null)}></div>
          <div className="relative bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <h3 className="text-xl font-black uppercase mb-2">Voter Registry</h3>
            <p className="text-[10px] font-bold text-indigo-600 uppercase mb-6 tracking-widest italic leading-tight">
              Selected Option: "{registryModal.optionText}"
            </p>
            <div className="space-y-4 overflow-y-auto custom-scrollbar pr-2">
              {registryModal.voters.map((v: any, i: number) => {
                const isAnon = v.is_anonymous === true || v.is_anonymous === 'true';
                return (
                  <div key={i} className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <UserAvatar url={isAnon ? undefined : v.profiles?.avatar_url} isAnonymous={isAnon} size="sm" />
                    <div>
                      <p className="text-[10px] font-black uppercase text-gray-900">{isAnon ? 'Anonymous Voter' : v.profiles?.full_name}</p>
                      <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest">District {v.profiles?.district || '?'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={() => setRegistryModal(null)} className="mt-8 w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase text-[10px]">Close Registry</button>
          </div>
        </div>
      )}

      {pendingVote && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setPendingVote(null)}></div>
          <div className="relative bg-white w-full max-w-sm rounded-[3rem] p-10 shadow-2xl text-center">
            <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">
              <i className="fa-solid fa-person-booth"></i>
            </div>
            <h3 className="text-xl font-black uppercase mb-2">Cast your vote?</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase mb-8 leading-relaxed">
              You are voting for:<br/>
              <span className="text-indigo-600">"{pendingVote.optionText}"</span>
            </p>
            
            <div className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl mb-8 border border-gray-100">
              <div className="text-left">
                <p className="text-[9px] font-black uppercase text-gray-900">Vote Anonymously?</p>
                <p className="text-[7px] font-bold text-gray-400 uppercase tracking-tighter italic">Hide your name from the public registry</p>
              </div>
              <div 
                onClick={() => setPendingVote({...pendingVote, isAnonymous: !pendingVote.isAnonymous})}
                className={`w-12 h-6 rounded-full relative cursor-pointer transition-all ${pendingVote.isAnonymous ? 'bg-indigo-600' : 'bg-gray-200'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${pendingVote.isAnonymous ? 'right-1' : 'left-1'}`}></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setPendingVote(null)} className="py-4 bg-gray-100 text-gray-400 rounded-2xl font-black uppercase text-[10px]">Cancel</button>
              <button onClick={confirmVote} className="py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-lg shadow-indigo-200">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* --- PAGE UI --- */}
      {!selectedPoll ? (
        <div className="space-y-8 animate-slide-up">
          <div className="flex flex-col md:flex-row justify-between items-end gap-6">
            <div className="-ml-1 md:ml-0">
              <h2 className="text-4xl font-black uppercase tracking-tighter">Community Polls</h2>
              <p className="text-indigo-600 font-bold text-[10px] uppercase tracking-widest">Voice your opinion on county decisions</p>
            </div>
            <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100">
              <button 
                onClick={() => setPollFilter('active')}
                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${pollFilter === 'active' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400'}`}
              >
                Active
              </button>
              <button 
                onClick={() => setPollFilter('completed')}
                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${pollFilter === 'completed' ? 'bg-gray-900 text-white shadow-lg' : 'text-gray-400'}`}
              >
                Completed
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {polls
              .filter(poll => {
                const isExpired = new Date(poll.expires_at) < new Date();
                return pollFilter === 'active' ? !isExpired : isExpired;
              })
              .map(poll => {
                const voted = poll.poll_votes?.some((v: any) => v.user_id === user?.id);
                const isExpired = new Date(poll.expires_at) < new Date();
                return (
                  <div key={poll.id} onClick={() => setSelectedPoll(poll)} className="bg-white p-8 rounded-[2.5rem] shadow-sm border hover:shadow-lg transition-all cursor-pointer flex flex-col sm:flex-row justify-between items-center gap-6 group">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-2xl font-black uppercase break-words group-hover:text-indigo-600 transition-colors">{poll.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-gray-400 text-sm md:text-[10px] font-black uppercase">{poll.poll_votes?.length || 0} Votes</p>
                        <span className="text-gray-200 text-sm md:text-[10px]">•</span>
                        <p className={`${isExpired ? 'text-gray-400' : 'text-red-500'} text-sm md:text-[10px] font-black uppercase`}>
                          <i className="fa-regular fa-clock mr-1"></i>
                          {isExpired ? `Closed ${formatDate(poll.expires_at)}` : `Ends ${formatDate(poll.expires_at)}`}
                        </p>
                      </div>
                    </div>
                    <button className={`px-8 py-4 rounded-xl font-black uppercase text-sm md:text-[10px] whitespace-nowrap ${voted || isExpired ? 'bg-gray-100 text-gray-500' : 'bg-indigo-600 text-white shadow-indigo-200 shadow-lg'}`}>
                      {isExpired ? 'Final Results' : voted ? 'View Results' : 'Vote & Discuss'}
                    </button>
                  </div>
                );
              })}
            
            {polls.filter(poll => {
              const isExpired = new Date(poll.expires_at) < new Date();
              return pollFilter === 'active' ? !isExpired : isExpired;
            }).length === 0 && (
              <div className="p-20 text-center bg-white rounded-[3rem] border-4 border-dashed border-gray-100">
                 <p className="text-gray-300 font-black uppercase text-xs italic">No {pollFilter} polls found.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-8 pb-20 animate-slide-up">
          <button onClick={() => setSelectedPoll(null)} className="text-sm md:text-[10px] font-black uppercase text-gray-400 hover:text-indigo-600 transition-colors"><i className="fa-solid fa-arrow-left mr-2"></i> All Polls</button>
          <div className="bg-white p-6 md:p-10 md:p-16 rounded-[3rem] shadow-xl space-y-10 border border-gray-100">
            <div className="space-y-4">
              <h2 className="text-4xl md:text-5xl font-black uppercase leading-tight tracking-tighter text-gray-900 break-words">{selectedPoll.title}</h2>
              {selectedPoll.description && (
                <div className="space-y-4">
                  <p className="text-gray-500 text-base md:text-base leading-relaxed font-medium bg-gray-50 p-8 rounded-[2.5rem] break-words whitespace-pre-wrap">
                    {selectedPoll.description}
                  </p>
                  {selectedPoll.attachments?.length > 0 && (
                    <div className="flex flex-wrap gap-3">
                      {selectedPoll.attachments.map((url: string, i: number) => (
                        <a key={i} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-3 px-5 py-3 bg-white border-2 border-gray-100 rounded-2xl hover:border-indigo-600 transition-all group">
                          <i className="fa-solid fa-file-invoice text-indigo-600"></i>
                          <span className="text-sm md:text-[10px] font-black uppercase text-gray-400 group-hover:text-indigo-600">View Reference {i + 1}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="space-y-8">
              {selectedPoll.poll_options?.map((opt: any) => {
                const votes = selectedPoll.poll_votes?.filter((v: any) => v.option_id === opt.id) || [];
                const totalVotes = selectedPoll.poll_votes?.length || 0;
                const percent = totalVotes ? Math.round((votes.length / totalVotes) * 100) : 0;
                const existingVote = selectedPoll.poll_votes?.find((v: any) => v.user_id === user?.id);
                const isCurrentSelection = existingVote?.option_id === opt.id;
                const isExpired = new Date(selectedPoll.expires_at) < new Date();
                const hasVotedAny = selectedPoll.poll_votes?.some((v: any) => v.user_id === user?.id);

                return (
                  <div key={opt.id} className="space-y-3">
                    <button 
                      disabled={isExpired || isCurrentSelection}
                      onClick={() => {
                        if (!user) {
                          setShowPollLoginModal(true);
                          return;
                        }
                        if (user && !profile) return showSignupRequiredModal('To participate in this poll, you must first sign up. To sign up click here.');
                        const userExistingVote = selectedPoll.poll_votes?.find((v: any) => v.user_id === user?.id);
                        setPendingVote({ 
                          pollId: selectedPoll.id, 
                          optionId: opt.id, 
                          optionText: opt.text, 
                          isAnonymous: userExistingVote 
                            ? (userExistingVote.is_anonymous === true || userExistingVote.is_anonymous === 'true') 
                            : false,
                          isChanging: !!userExistingVote 
                        });
                      }} 
                      className={`w-full text-left p-6 rounded-[2rem] border-2 relative overflow-hidden flex justify-between items-start gap-4 transition-all ${isCurrentSelection ? 'border-indigo-600 ring-4 ring-indigo-600/10' : 'border-gray-100 hover:border-indigo-200'}`}
                    >
                      {(existingVote || isExpired) && <div className="absolute inset-y-0 left-0 bg-indigo-50 transition-all duration-1000" style={{ width: `${percent}%` }}></div>}
                      <span className="relative z-10 text-sm md:text-xs font-black uppercase flex-1 break-words whitespace-normal leading-tight">{opt.text}</span>
                      {(existingVote || isExpired) && (
                        <div className="relative z-10 text-right shrink-0">
                          <span className="text-base md:text-sm font-black text-indigo-600">{percent}%</span>
                          <span className="block text-xs md:text-[8px] font-bold text-gray-400 uppercase">({votes.length} Votes)</span>
                        </div>
                      )}
                    </button>
                    {(hasVotedAny || isExpired) && votes.length > 0 && (
                      <div className="flex items-center gap-2 px-2 cursor-pointer" onClick={() => setRegistryModal({ optionText: opt.text, voters: votes })}>
                        <div className="flex -space-x-2">
                          {votes.slice(0, 5).map((v: any, i: number) => (
                            <UserAvatar 
                              key={i} 
                              url={(v.is_anonymous === true || v.is_anonymous === 'true') ? undefined : v.profiles?.avatar_url} 
                              isAnonymous={v.is_anonymous === true || v.is_anonymous === 'true'} 
                              size="sm" 
                            />
                          ))}
                        </div>
                        {votes.length > 5 && <span className="text-xs md:text-[9px] font-black text-gray-400">+ {votes.length - 5} More</span>}
                        <span className="text-xs md:text-[8px] font-black text-indigo-400 uppercase ml-auto">View Registry</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="pt-10 border-t min-w-0">
              <h4 className="text-sm md:text-[10px] font-black uppercase text-indigo-600 mb-6 tracking-widest">Community Discussion</h4>
              {user ? (
                 <form onSubmit={async (e) => { 
                   e.preventDefault(); 
                   if (user && !profile) return showSignupRequiredModal('To make a comment, you must first sign up. To sign up click here.');
                   const fd = new FormData(e.currentTarget); 
                   await supabase?.from('poll_comments').insert({ poll_id: selectedPoll.id, user_id: user.id, content: fd.get('content') }); 
                   (e.target as HTMLFormElement).reset(); 
                   fetchPolls(); 
                 }} className="mb-8 flex gap-2 min-w-0">
                   <input name="content" required placeholder="Add a comment..." className="flex-grow min-w-0 p-4 bg-gray-50 rounded-2xl text-xs outline-none" />
                   <button type="submit" className="flex-shrink-0 bg-indigo-600 text-white px-6 py-2 rounded-2xl text-[10px] font-black uppercase">Post</button>
                 </form>
              ) : (
                <button onClick={() => setCurrentPage('login')} className="w-full py-4 border-2 border-dashed rounded-2xl text-sm md:text-[10px] font-black uppercase text-gray-400 mb-8">Login to Comment</button>
              )}
              {renderComments(selectedPoll.poll_comments || [], selectedPoll.id)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}