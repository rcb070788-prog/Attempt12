
import React, { useState } from 'react';
import { DASHBOARD_CONFIG, CategoryKey } from './constants.tsx';
import { User, Poll } from './types.ts';
import { HomeView } from './components/HomeView.tsx';
import { CategoryDetail } from './components/CategoryDetail.tsx';
import { AuthView } from './components/AuthView.tsx';
import { PollsView } from './components/PollsView.tsx';
import { AdminView } from './components/AdminView.tsx';

const App: React.FC = () => {
  const [view, setView] = useState<'home' | 'category' | 'auth' | 'polls' | 'admin'>('home');
  const [activeCategory, setActiveCategory] = useState<CategoryKey | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isSignup, setIsSignup] = useState(false);
  
  const [polls, setPolls] = useState<Poll[]>([
    {
      id: '1',
      question: 'Should the county prioritize road repairs over park expansions in the 2025 budget?',
      options: ['Prioritize Roads', 'Prioritize Parks', 'Neutral'],
      isOpen: true,
      endsAt: '2024-12-31',
      votes: {},
      comments: [
        { id: 'c1', authorName: 'Sarah Jenkins', text: 'District 4 roads are unusable. We need the paving!', timestamp: '2024-10-25', isAnonymous: false, district: 'District 4' }
      ]
    }
  ]);

  const navigateToHome = () => { setView('home'); setActiveCategory(null); };
  const navigateToCategory = (key: CategoryKey) => { setActiveCategory(key); setView('category'); };
  const navigateToAuth = (signup = false) => { setIsSignup(signup); setView('auth'); };

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-900">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <button onClick={navigateToHome} className="text-xl font-bold text-blue-800 tracking-tight">
            Concerned Citizens of MC
          </button>
          
          <nav className="flex items-center gap-6 text-sm font-medium">
            <button onClick={navigateToHome} className="hover:text-blue-600 transition">Dashboard</button>
            <button onClick={() => setView('polls')} className="hover:text-blue-600 transition">Voter Polls</button>
            {user?.username === 'admin' && <button onClick={() => setView('admin')} className="text-red-600 font-bold">Admin Panel</button>}
            
            {user ? (
              <div className="flex items-center gap-4">
                <span className="text-slate-500">{user.name}</span>
                <button onClick={() => setUser(null)} className="bg-slate-100 px-3 py-1.5 rounded-md hover:bg-slate-200 transition">Log Out</button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <button onClick={() => navigateToAuth(false)} className="hover:text-blue-600">Login</button>
                <button onClick={() => navigateToAuth(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">Register</button>
              </div>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-grow">
        {view === 'home' && <HomeView onSelectCategory={navigateToCategory} />}
        {view === 'category' && activeCategory && <CategoryDetail category={DASHBOARD_CONFIG[activeCategory]} onBack={navigateToHome} />}
        {view === 'auth' && <AuthView isSignup={isSignup} onAuthSuccess={(u) => { setUser(u); setView('home'); }} />}
        {view === 'polls' && <PollsView user={user} polls={polls} onAuthRedirect={() => navigateToAuth(true)} />}
        {view === 'admin' && <AdminView onAddPoll={(p) => setPolls([p, ...polls])} />}
      </main>

      <footer className="bg-slate-900 text-slate-400 py-12 mt-12">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-white font-bold mb-4">Privacy Promise</h3>
            <p className="text-sm">We will never sell your information. Voter IDs are used solely for verification.</p>
          </div>
          <div className="md:text-right">
             <button className="text-xs underline hover:text-white">Unsubscribe / Opt-out</button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
