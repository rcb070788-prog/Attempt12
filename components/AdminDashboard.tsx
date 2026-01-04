import React, { useState } from 'react';
import { Poll, Comment } from '../types.ts';

interface AdminDashboardProps {
  polls: Poll[];
  setPolls: React.Dispatch<React.SetStateAction<Poll[]>>;
  comments: Comment[];
  setComments: React.Dispatch<React.SetStateAction<Comment[]>>;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ polls, setPolls, comments, setComments }) => {
  const [newPoll, setNewPoll] = useState({ question: '', description: '', options: ['', ''] });

  const addPoll = (e: React.FormEvent) => {
    e.preventDefault();
    const poll: Poll = {
      id: Math.random().toString(36).substr(2, 9),
      question: newPoll.question,
      description: newPoll.description,
      options: newPoll.options.filter(o => o.trim() !== ''),
      isOpen: true,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };
    setPolls([poll, ...polls]);
    setNewPoll({ question: '', description: '', options: ['', ''] });
  };

  const removePoll = (id: string) => setPolls(polls.filter(p => p.id !== id));
  const removeComment = (id: string) => setComments(comments.filter(c => c.id !== id));

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      <header className="bg-slate-800 text-white p-8 rounded-3xl shadow-lg flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Admin Control</h2>
          <p className="mt-2 opacity-90">Manage polls, moderation, and data configuration.</p>
        </div>
        <div className="bg-slate-700 p-3 rounded-xl font-bold text-xs uppercase tracking-widest border border-slate-600">
          Super Admin Access
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-xl font-bold mb-6">Create New Poll</h3>
          <form onSubmit={addPoll} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Poll Question</label>
              <input 
                type="text" 
                required 
                className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                value={newPoll.question}
                onChange={e => setNewPoll({...newPoll, question: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Context / Description</label>
              <textarea 
                className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 h-24"
                value={newPoll.description}
                onChange={e => setNewPoll({...newPoll, description: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700 mb-1">Options</label>
              {newPoll.options.map((opt, i) => (
                <input 
                  key={i}
                  type="text" 
                  placeholder={`Option ${i+1}`}
                  className="w-full p-3 rounded-xl border border-slate-200 outline-none"
                  value={opt}
                  onChange={e => {
                    const opts = [...newPoll.options];
                    opts[i] = e.target.value;
                    setNewPoll({...newPoll, options: opts});
                  }}
                />
              ))}
              <button 
                type="button" 
                onClick={() => setNewPoll({...newPoll, options: [...newPoll.options, '']})}
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                + Add Another Option
              </button>
            </div>
            <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all">Launch Poll</button>
          </form>
        </section>

        <section className="space-y-8">
           <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="text-xl font-bold mb-4">Manage Active Polls</h3>
              <div className="space-y-4">
                {polls.map(p => (
                  <div key={p.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-xl">
                    <span className="font-semibold text-slate-700 truncate mr-4">{p.question}</span>
                    <button onClick={() => removePoll(p.id)} className="text-red-500 hover:text-red-700">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
           </div>

           <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="text-xl font-bold mb-4">Comment Moderation</h3>
              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                {comments.map(c => (
                  <div key={c.id} className="p-4 bg-slate-50 rounded-xl relative group">
                    <div className="flex justify-between text-xs font-bold text-slate-400 mb-1">
                       <span>{c.voterName}</span>
                       <button onClick={() => removeComment(c.id)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">Delete</button>
                    </div>
                    <p className="text-sm text-slate-600">{c.text}</p>
                  </div>
                ))}
                {comments.length === 0 && <p className="text-slate-400 italic text-sm text-center">No comments yet.</p>}
              </div>
           </div>
        </section>
      </div>

      <div className="bg-amber-50 border border-amber-100 p-8 rounded-3xl">
         <h4 className="text-lg font-bold text-amber-900 mb-2">Technical Administration Checklist</h4>
         <ul className="list-disc list-inside space-y-2 text-amber-800 text-sm">
            <li>To add new dashboards: Place folder in <code>/dashboards/</code> and update <code>dashboard-config.ts</code>.</li>
            <li>To update voter list: In this prototype, edit <code>verifyVoter</code> in <code>VoterPortal.tsx</code>.</li>
            <li>Security: Ensure GitHub repository is set to <b>Private</b> to protect your configuration files.</li>
            <li>Backup: Download a 'Zip' of the site periodically via GitHub.</li>
         </ul>
      </div>
    </div>
  );
};

export default AdminDashboard;