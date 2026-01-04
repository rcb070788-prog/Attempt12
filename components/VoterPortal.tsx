import React, { useState } from 'react';
import { User, Poll, Vote, Comment } from '../types.ts';

interface VoterPortalProps {
  user: User | null;
  setUser: (user: User | null) => void;
  polls: Poll[];
  votes: Vote[];
  setVotes: React.Dispatch<React.SetStateAction<Vote[]>>;
  comments: Comment[];
  setComments: React.Dispatch<React.SetStateAction<Comment[]>>;
}

const VoterPortal: React.FC<VoterPortalProps> = ({ 
  user, setUser, polls, votes, setVotes, comments, setComments 
}) => {
  const [view, setView] = useState<'login' | 'signup' | 'reset'>('login');
  
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [signupForm, setSignupForm] = useState({ fullName: '', voterId: '', username: '', password: '', notifications: { email: true, text: false } });
  const [resetForm, setResetForm] = useState({ fullName: '', voterId: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [newComment, setNewComment] = useState('');
  const [isAnonVote, setIsAnonVote] = useState(false);

  const verifyVoter = (name: string, id: string) => {
    const mockVoterList = [
      { name: 'John Doe', id: '123456', district: 'District 4' },
      { name: 'Jane Smith', id: '654321', district: 'District 2' },
      { name: 'Admin User', id: '000000', district: 'Central' }
    ];
    return mockVoterList.find(v => v.name.toLowerCase() === name.toLowerCase() && v.id === id);
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const voter = verifyVoter(signupForm.fullName, signupForm.voterId);
    if (voter) {
      const newUser: User = {
        username: signupForm.username,
        voterId: signupForm.voterId,
        fullName: signupForm.fullName,
        district: voter.district,
        notifications: signupForm.notifications
      };
      localStorage.setItem('ccmc_user', JSON.stringify(newUser));
      setUser(newUser);
      setMessage('Account created successfully!');
    } else {
      setError('voter-not-found');
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const savedUser = localStorage.getItem('ccmc_user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      if (parsed.username === loginForm.username) {
         setUser(parsed);
         return;
      }
    }
    if (loginForm.username === 'admin' && loginForm.password === 'admin') {
      const admin = { username: 'admin', voterId: '000000', fullName: 'Admin User', district: 'Central', notifications: { email: true, text: true } };
      setUser(admin);
      localStorage.setItem('ccmc_user', JSON.stringify(admin));
    } else {
      setError('Invalid username or password.');
    }
  };

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    const voter = verifyVoter(resetForm.fullName, resetForm.voterId);
    if (voter) {
      setMessage(`A temporary password has been sent to your chosen notification method.`);
    } else {
      setError('voter-not-found');
    }
  };

  const castVote = (pollId: string, optionIndex: number) => {
    if (!user) return;
    const newVote: Vote = {
      pollId,
      voterId: user.voterId,
      optionIndex,
      isAnonymous: isAnonVote,
      voterName: user.fullName,
      district: user.district
    };
    setVotes(prev => [...prev.filter(v => v.pollId !== pollId || v.voterId !== user.voterId), newVote]);
  };

  const postComment = (pollId: string) => {
    if (!user || !newComment.trim()) return;
    const comment: Comment = {
      id: Math.random().toString(36).substr(2, 9),
      pollId,
      voterName: user.fullName,
      text: newComment,
      timestamp: new Date().toLocaleTimeString()
    };
    setComments(prev => [comment, ...prev]);
    setNewComment('');
  };

  if (user) {
    return (
      <div className="max-w-4xl mx-auto space-y-12">
        <header className="bg-blue-600 text-white p-8 rounded-3xl shadow-lg">
          <h2 className="text-3xl font-bold">Voter Portal</h2>
          <p className="mt-2 opacity-90">Welcome back, {user.fullName} ({user.district})</p>
        </header>

        <section className="space-y-8">
          <h3 className="text-2xl font-bold text-slate-800">Active Polls</h3>
          {polls.map(poll => {
            const userVote = votes.find(v => v.pollId === poll.id && v.voterId === user.voterId);
            return (
              <div key={poll.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-8 space-y-4">
                  <div className="flex justify-between items-start">
                    <h4 className="text-xl font-bold text-slate-900">{poll.question}</h4>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${poll.isOpen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {poll.isOpen ? 'Active' : 'Closed'}
                    </span>
                  </div>
                  <p className="text-slate-600">{poll.description}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    {poll.options.map((option, idx) => (
                      <button
                        key={idx}
                        disabled={!poll.isOpen}
                        onClick={() => castVote(poll.id, idx)}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${userVote?.optionIndex === idx ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-100 hover:border-slate-300 text-slate-700'}`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-semibold">{option}</span>
                          {userVote?.optionIndex === idx && <span className="text-xl">✅</span>}
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                    <input 
                      type="checkbox" 
                      id="anon" 
                      checked={isAnonVote} 
                      onChange={(e) => setIsAnonVote(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded" 
                    />
                    <label htmlFor="anon" className="text-sm text-slate-500 font-medium cursor-pointer">Vote Anonymously (District will still be shown)</label>
                  </div>
                </div>

                <div className="bg-slate-50 p-8 border-t border-slate-200">
                  <h5 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    Community Comments
                  </h5>
                  
                  <div className="space-y-4 mb-6">
                    <textarea 
                      placeholder="Add a respectful comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="w-full p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px]"
                    />
                    <div className="flex justify-end">
                      <button 
                        onClick={() => postComment(poll.id)}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors"
                      >
                        Post Comment
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                    {comments.filter(c => c.pollId === poll.id).map(c => (
                      <div key={c.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                        <div className="flex justify-between mb-1">
                          <span className="font-bold text-slate-900">{c.voterName}</span>
                          <span className="text-xs text-slate-400 font-medium">{c.timestamp}</span>
                        </div>
                        <p className="text-slate-600">{c.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          {view === 'login' ? 'Voter Login' : view === 'signup' ? 'Create Account' : 'Reset Password'}
        </h2>
        <p className="text-slate-500 mb-8 text-sm">
          {view === 'login' ? 'Access restricted polls and comments.' : 'Verify your registration to join.'}
        </p>

        {error === 'voter-not-found' ? (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm mb-6 border border-red-100">
            <p className="font-bold mb-2">Sorry, it looks like we can't let you in the club just yet.</p>
            <p>The information that you entered doesn't match what we have on record.</p>
            <div className="mt-4 flex flex-col gap-2">
              <a href="https://tnmap.tn.gov/voterlookup/" target="_blank" className="font-bold underline">Click HERE to verify your info</a>
              <button 
                onClick={() => window.location.href = `mailto:admin@concernedcitizensofmc.com?subject=New%20Voter&body=Hi,%20I'm%20a%20new%20voter.%20My%20name%20is%20${signupForm.fullName || resetForm.fullName}.`}
                className="text-left font-bold underline"
              >
                Or message us to update our list
              </button>
            </div>
            <button onClick={() => setError('')} className="mt-4 block w-full bg-red-100 py-2 rounded-lg font-bold">Try Again</button>
          </div>
        ) : error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 border border-red-200">
            {error}
          </div>
        )}

        {message && (
          <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm mb-6 border border-green-200">
            {message}
          </div>
        )}

        {view === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Username</label>
              <input 
                type="text" 
                required 
                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                value={loginForm.username}
                onChange={e => setLoginForm({...loginForm, username: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Password</label>
              <input 
                type="password" 
                required 
                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                value={loginForm.password}
                onChange={e => setLoginForm({...loginForm, password: e.target.value})}
              />
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all">Sign In</button>
            <div className="flex justify-between pt-4 text-sm font-medium">
              <button type="button" onClick={() => setView('signup')} className="text-blue-600 hover:underline">New here? Sign up</button>
              <button type="button" onClick={() => setView('reset')} className="text-slate-500 hover:underline">Forgot password?</button>
            </div>
          </form>
        )}

        {view === 'signup' && (
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Full Name (as registered)</label>
              <input 
                type="text" 
                required 
                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                value={signupForm.fullName}
                onChange={e => setSignupForm({...signupForm, fullName: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Voter ID Number</label>
              <input 
                type="text" 
                required 
                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                value={signupForm.voterId}
                onChange={e => setSignupForm({...signupForm, voterId: e.target.value})}
              />
              <a href="https://tnmap.tn.gov/voterlookup/" target="_blank" className="text-xs text-blue-600 font-bold hover:underline mt-1 block">Don't know my Voter ID#? Find it here.</a>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Desired Username</label>
              <input 
                type="text" 
                required 
                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                value={signupForm.username}
                onChange={e => setSignupForm({...signupForm, username: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Password</label>
              <input 
                type="password" 
                required 
                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                value={signupForm.password}
                onChange={e => setSignupForm({...signupForm, password: e.target.value})}
              />
            </div>
            <div className="space-y-2 py-2">
              <p className="text-xs font-bold text-slate-500 uppercase">Notification Preferences</p>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input type="checkbox" checked={signupForm.notifications.email} onChange={e => setSignupForm({...signupForm, notifications: {...signupForm.notifications, email: e.target.checked}})} /> Email
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input type="checkbox" checked={signupForm.notifications.text} onChange={e => setSignupForm({...signupForm, notifications: {...signupForm.notifications, text: e.target.checked}})} /> Text
                </label>
              </div>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl text-[10px] text-slate-500 leading-tight">
               We will never sell your information. We only collect this to verify registered voters and allow poll participation. You can opt-out/unsubscribe at any time in your profile settings.
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700">Create Account</button>
            <button type="button" onClick={() => setView('login')} className="w-full text-slate-500 text-sm font-medium hover:underline">Already have an account? Login</button>
          </form>
        )}

        {view === 'reset' && (
          <form onSubmit={handleReset} className="space-y-4">
             <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Full Name (as registered)</label>
              <input 
                type="text" 
                required 
                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                value={resetForm.fullName}
                onChange={e => setResetForm({...resetForm, fullName: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Voter ID Number</label>
              <input 
                type="text" 
                required 
                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                value={resetForm.voterId}
                onChange={e => setResetForm({...resetForm, voterId: e.target.value})}
              />
              <a href="https://tnmap.tn.gov/voterlookup/" target="_blank" className="text-xs text-blue-600 font-bold hover:underline mt-1 block">Don't know my Voter ID#? Find it here.</a>
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700">Request Temporary Password</button>
            <button type="button" onClick={() => setView('login')} className="w-full text-slate-500 text-sm font-medium hover:underline">Return to Login</button>
          </form>
        )}
      </div>
    </div>
  );
};

export default VoterPortal;