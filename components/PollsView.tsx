
import React, { useState } from 'react';
import { User, Poll } from '../types';

interface PollsViewProps {
  user: User | null;
  polls: Poll[];
  onAuthRedirect: () => void;
}

export const PollsView: React.FC<PollsViewProps> = ({ user, polls, onAuthRedirect }) => {
  const [selectedVotes, setSelectedVotes] = useState<Record<string, string>>({});
  const [isAnonymous, setIsAnonymous] = useState(false);

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-5xl mb-6">🔒</div>
          <h2 className="text-2xl font-bold mb-4">Verified Voter Area</h2>
          <p className="text-slate-600 mb-8 leading-relaxed">Please sign in to vote and comment.</p>
          <button onClick={onAuthRedirect} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700">Verify My Registration</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Active Voter Polls</h1>
      {polls.map(poll => (
        <div key={poll.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-8 overflow-hidden">
          <div className="p-8">
            <h2 className="text-xl font-bold mb-6">{poll.question}</h2>
            <div className="space-y-3 mb-8">
              {poll.options.map(opt => (
                <button 
                  key={opt}
                  onClick={() => setSelectedVotes({...selectedVotes, [poll.id]: opt})}
                  className={`w-full p-4 text-left border rounded-xl transition font-medium ${selectedVotes[poll.id] === opt ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-blue-50'}`}
                >
                  {opt} {selectedVotes[poll.id] === opt && '✓'}
                </button>
              ))}
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50 p-4 rounded-xl">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={isAnonymous} onChange={e => setIsAnonymous(e.target.checked)} className="rounded" />
                Vote Anonymously (Show District only)
              </label>
              <span className="text-xs text-slate-400 italic">Voting as: {isAnonymous ? 'Anonymous' : user.name} (District 4)</span>
            </div>
          </div>

          <div className="bg-slate-50 border-t p-8">
            <h3 className="font-bold mb-4">Voter Discussion</h3>
            <div className="space-y-4">
              {poll.comments.map(c => (
                <div key={c.id} className="bg-white p-4 rounded-xl border text-sm">
                  <div className="font-bold mb-1">{c.authorName} <span className="text-slate-400 font-normal">({c.district})</span></div>
                  <p className="text-slate-600">{c.text}</p>
                </div>
              ))}
              <textarea placeholder="Write a comment..." className="w-full p-4 rounded-xl border outline-none text-sm h-24" />
              <button className="bg-slate-900 text-white px-6 py-2 rounded-lg font-bold text-sm">Post Comment</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
