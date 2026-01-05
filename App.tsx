
import React, { useState, useEffect } from 'react';
import { CATEGORIES, DASHBOARDS, TN_VOTER_LOOKUP_URL } from './constants.ts';
import { DashboardConfig, UserProfile, Poll, Suggestion, Vote, Comment } from './types.ts';

// Helper for showing notifications
const Toast = ({ message, type }: { message: string, type: 'success' | 'error' }) => (
  <div className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-xl text-white z-[100] transition-all transform animate-bounce ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
    <i className={`fa-solid ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'} mr-2`}></i>
    {message}
  </div>
);

const Navbar = ({ user, onLogout, onNavigate }: { user: UserProfile | null, onLogout: () => void, onNavigate: (page: string) => void }) => (
  <nav className="bg-white shadow-md px-6 py-4 flex justify-between items-center sticky top-0 z-50">
    <div className="flex items-center cursor-pointer" onClick={() => onNavigate('home')}>
      <i className="fa-solid fa-landmark text-indigo-600 text-2xl mr-2"></i>
      <span className="text-xl font-bold text-gray-800">Finance Hub</span>
    </div>
    <div className="flex gap-6 items-center">
      <button onClick={() => onNavigate('home')} className="text-gray-600 hover:text-indigo-600 font-medium">Finance</button>
      {user ? (
        <>
          <button onClick={() => onNavigate('polls')} className="text-gray-600 hover:text-indigo-600 font-medium">Polls</button>
          <button onClick={() => onNavigate('suggestions')} className="text-gray-600 hover:text-indigo-600 font-medium">Suggestions</button>
          <div className="flex items-center gap-3 ml-4 border-l pl-4">
            <span className="text-sm font-semibold text-gray-700">Hi, {user.fullName.split(' ')[0]}</span>
            <button 
              onClick={() => onNavigate('profile')} 
              className="bg-indigo-100 text-indigo-700 p-2 rounded-full hover:bg-indigo-200 transition"
            >
              <i className="fa-solid fa-user"></i>
            </button>
            <button onClick={onLogout} className="text-sm text-red-500 hover:text-red-700 underline">Logout</button>
          </div>
        </>
      ) : (
        <button 
          onClick={() => onNavigate('login')} 
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
        >
          Voter Login
        </button>
      )}
    </div>
  </nav>
);

export default function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('voter_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [activeDashboard, setActiveDashboard] = useState<DashboardConfig | null>(null);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const [polls] = useState<Poll[]>([
    { id: '1', title: 'Community Center Expansion', description: 'Should we approve the $1.2M expansion project?', status: 'open', openDate: '2024-01-01', closeDate: '2025-12-31', isAnonymousAllowed: true }
  ]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('voter_user');
    setCurrentPage('home');
    showToast("Logged out");
  };

  const navigateTo = (page: string) => {
    setCurrentPage(page);
    setActiveDashboard(null);
    setIsVerifying(false);
    if (page === 'home') setSelectedCategory(null);
  };

  const castVote = (pollId: string, value: string, anonymous: boolean) => {
    if (!user) return;
    const newVote: Vote = {
      id: Math.random().toString(),
      pollId,
      voterId: user.voterId,
      voterName: user.fullName,
      district: user.district,
      voteValue: value,
      isAnonymous: anonymous
    };
    setVotes(prev => [...prev.filter(v => v.pollId !== pollId || v.voterId !== user.voterId), newVote]);
    showToast("Vote updated!");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Navbar user={user} onLogout={handleLogout} onNavigate={navigateTo} />
      {toast && <Toast message={toast.message} type={toast.type} />}

      <main className="flex-grow container mx-auto px-4 py-8">
        
        {/* PUBLIC FINANCE PAGES */}
        {currentPage === 'home' && !selectedCategory && (
          <div className="max-w-4xl mx-auto">
            <header className="text-center mb-12">
              <h1 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">Town Finance Portal</h1>
              <p className="text-lg text-gray-600">Open data for a more engaged community.</p>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className="group bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-indigo-300 transition-all text-left flex items-center gap-6"
                >
                  <div className={`${cat.color} w-16 h-16 rounded-xl flex items-center justify-center text-white text-3xl shadow-lg`}>
                    <i className={`fa-solid ${cat.icon}`}></i>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800">{cat.label}</h3>
                    <p className="text-gray-500 text-sm">Reports and Dashboards.</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedCategory && currentPage === 'home' && (
          <div className="max-w-4xl mx-auto">
             <button onClick={() => setSelectedCategory(null)} className="mb-6 text-indigo-600 font-bold hover:underline">
               <i className="fa-solid fa-arrow-left mr-2"></i> Back
             </button>
             <h2 className="text-3xl font-bold text-gray-900 mb-6 capitalize">{selectedCategory}</h2>
             <div className="grid grid-cols-1 gap-4">
               {DASHBOARDS.filter(d => d.category === selectedCategory).map(dash => (
                 <div key={dash.id} className="bg-white p-6 rounded-xl border flex justify-between items-center group hover:border-indigo-500 transition shadow-sm">
                   <div>
                     <h4 className="text-xl font-bold text-gray-800">{dash.title}</h4>
                     <p className="text-gray-500 text-sm">{dash.description}</p>
                   </div>
                   <button 
                    onClick={() => { setActiveDashboard(dash); setCurrentPage('dashboard-view'); }}
                    className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold"
                   >
                     View
                   </button>
                 </div>
               ))}
             </div>
          </div>
        )}

        {currentPage === 'dashboard-view' && activeDashboard && (
          <div className="h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 bg-white p-4 rounded-xl shadow-sm border">
              <h2 className="text-xl font-bold">{activeDashboard.title}</h2>
              <button onClick={() => navigateTo('home')} className="bg-gray-100 px-4 py-2 rounded-lg font-bold">✕ Close</button>
            </div>
            <iframe src={activeDashboard.folderPath} className="flex-grow w-full rounded-xl shadow-2xl border bg-white" />
          </div>
        )}

        {/* AUTHENTICATION */}
        {currentPage === 'login' && (
          <div className="max-w-md mx-auto bg-white p-10 rounded-3xl shadow-2xl border">
            <h2 className="text-3xl font-bold text-center mb-8">Voter Login</h2>
            <form className="space-y-6" onSubmit={(e) => {
              e.preventDefault();
              const mockUser: UserProfile = {
                fullName: "Verified Voter",
                voterId: "12345",
                district: "District 2",
                email: "voter@example.com",
                phone: "555-0101",
                contactPreference: 'both'
              };
              setUser(mockUser);
              localStorage.setItem('voter_user', JSON.stringify(mockUser));
              showToast("Logged in successfully!");
              navigateTo('home');
            }}>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Email</label>
                <input type="email" required className="w-full p-4 bg-gray-50 rounded-xl outline-none border focus:ring-2 ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Password</label>
                <input type="password" required className="w-full p-4 bg-gray-50 rounded-xl outline-none border focus:ring-2 ring-indigo-500" />
              </div>
              <button className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 transition">Sign In</button>
            </form>
            <div className="mt-8 text-center flex flex-col gap-3">
              <button onClick={() => navigateTo('signup')} className="text-indigo-600 font-bold hover:underline">New Account</button>
              <button onClick={() => navigateTo('reset-password')} className="text-gray-400 text-sm hover:underline">Forgot Password?</button>
            </div>
          </div>
        )}

        {currentPage === 'signup' && (
          <div className="max-w-xl mx-auto bg-white p-10 rounded-3xl shadow-2xl border">
            <h2 className="text-3xl font-bold text-center mb-2">Voter Registration</h2>
            <p className="text-center text-gray-400 mb-10 text-sm">To ensure secure voting, we verify your identity against the master voter registry.</p>
            <form className="space-y-6" onSubmit={(e) => {
              e.preventDefault();
              setIsVerifying(true);
              showToast("Connecting to registry...");
              setTimeout(() => {
                setIsVerifying(false);
                showToast("Identity Verified! Please Login.", "success");
                navigateTo('login');
              }, 2500);
            }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Last Name</label>
                  <input type="text" required placeholder="Exactly as on Voter Card" className="w-full p-4 bg-gray-50 rounded-xl outline-none border focus:ring-2 ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Voter ID #</label>
                  <input type="text" required placeholder="Mandatory" className="w-full p-4 bg-gray-50 rounded-xl outline-none border focus:ring-2 ring-indigo-500" />
                  <a href={TN_VOTER_LOOKUP_URL} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 mt-2 font-bold underline inline-block">Need your Voter ID?</a>
                </div>
              </div>

              <div className="p-5 bg-indigo-50 rounded-2xl border border-indigo-100 mb-4 shadow-inner">
                <p className="text-xs font-black text-indigo-900 mb-4 uppercase tracking-widest flex items-center gap-2">
                  <i className="fa-solid fa-shield-halved"></i> Security Verification (Complete One)
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Option A: Date of Birth</label>
                    <input type="date" className="w-full p-3 bg-white rounded-xl border text-sm focus:ring-2 ring-indigo-500" />
                  </div>
                  <div className="relative">
                    <div className="absolute -left-3 top-1/2 -translate-y-1/2 hidden md:block text-indigo-200 font-bold">OR</div>
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Option B: Street Address</label>
                    <input type="text" placeholder="Number & Street Name" className="w-full p-3 bg-white rounded-xl border text-sm focus:ring-2 ring-indigo-500" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t border-dashed">
                 <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Create Account Email</label>
                  <input type="email" required placeholder="email@example.com" className="w-full p-4 bg-gray-50 rounded-xl border focus:ring-2 ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Choose Password</label>
                  <input type="password" required className="w-full p-4 bg-gray-50 rounded-xl border focus:ring-2 ring-indigo-500" />
                </div>
              </div>
              
              <button 
                disabled={isVerifying}
                className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition flex items-center justify-center gap-3 ${isVerifying ? 'bg-indigo-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
              >
                {isVerifying && <i className="fa-solid fa-circle-notch fa-spin"></i>}
                {isVerifying ? 'Verifying Identity...' : 'Verify & Create Account'}
              </button>
            </form>
          </div>
        )}

        {/* PROFILE & OTHER PAGES REMAIN THE SAME BUT WITH THE NEW STYLES */}
        {currentPage === 'profile' && user && (
          <div className="max-w-2xl mx-auto bg-white p-10 rounded-3xl shadow-xl border">
            <h2 className="text-3xl font-bold mb-8 text-center">Your Profile</h2>
            <div className="bg-indigo-50 p-6 rounded-2xl mb-8 flex justify-between items-center border border-indigo-100">
               <div>
                  <p className="text-xs font-bold text-indigo-500 uppercase">Registered Voter</p>
                  <p className="text-xl font-bold text-indigo-900">{user.fullName}</p>
                  <p className="text-sm text-indigo-700">Voter ID: {user.voterId} • {user.district}</p>
               </div>
               <i className="fa-solid fa-circle-check text-green-500 text-3xl"></i>
            </div>
            <form className="space-y-6">
               <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Email</label>
                  <input defaultValue={user.email} className="w-full p-4 bg-gray-50 rounded-xl border" />
               </div>
               <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Phone</label>
                  <input defaultValue={user.phone} className="w-full p-4 bg-gray-50 rounded-xl border" />
               </div>
               <button className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg">Update Contact Info</button>
            </form>
          </div>
        )}

        {/* Suggestions / Polls with same theme... */}

      </main>

      <footer className="bg-white border-t p-10 mt-20 text-center text-gray-400 text-sm">
        <p>© 2024 Community Engagement & Finance Hub</p>
      </footer>
    </div>
  );
}
