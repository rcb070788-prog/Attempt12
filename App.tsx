import React, { useState, useEffect } from 'react';
import { Category, User, Poll, Vote, Comment } from './types.ts';
import { CATEGORY_EXPLANATIONS, DASHBOARDS } from './dashboard-config.ts';
import Navbar from './components/Navbar.tsx';
import Home from './components/Home.tsx';
import ExplanationPage from './components/ExplanationPage.tsx';
import VoterPortal from './components/VoterPortal.tsx';
import AdminDashboard from './components/AdminDashboard.tsx';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<'home' | 'category' | 'voter' | 'admin'>('home');
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [user, setUser] = useState<User | null>(null);
  
  const [polls, setPolls] = useState<Poll[]>([
    {
      id: 'poll-1',
      question: 'Should the County prioritize paving over new sidewalk construction?',
      description: 'The upcoming budget has a $2M surplus for infrastructure. Choose the most critical area.',
      options: ['Prioritize Paving', 'Prioritize Sidewalks', 'Split 50/50', 'No Opinion'],
      isOpen: true,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    }
  ]);

  const [votes, setVotes] = useState<Vote[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);

  const navigateToCategory = (cat: Category) => {
    setActiveCategory(cat);
    setCurrentPage('category');
    window.scrollTo(0, 0);
  };

  const navigateHome = () => {
    setCurrentPage('home');
    setActiveCategory(null);
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('ccmc_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('ccmc_user');
    setCurrentPage('home');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar 
        onHome={navigateHome} 
        onVoter={() => setCurrentPage('voter')} 
        onAdmin={() => setCurrentPage('admin')}
        user={user}
        onLogout={handleLogout}
      />

      <main className="flex-grow container mx-auto px-4 py-8">
        {currentPage === 'home' && (
          <Home onCategorySelect={navigateToCategory} />
        )}

        {currentPage === 'category' && activeCategory && (
          <ExplanationPage 
            category={activeCategory}
            explanation={CATEGORY_EXPLANATIONS[activeCategory]}
            links={DASHBOARDS.filter(d => d.category === activeCategory)}
          />
        )}

        {currentPage === 'voter' && (
          <VoterPortal 
            user={user} 
            setUser={setUser} 
            polls={polls}
            votes={votes}
            setVotes={setVotes}
            comments={comments}
            setComments={setComments}
          />
        )}

        {currentPage === 'admin' && (
          <AdminDashboard 
            polls={polls} 
            setPolls={setPolls} 
            comments={comments}
            setComments={setComments}
          />
        )}
      </main>

      <footer className="bg-slate-900 text-slate-400 py-8 border-t border-slate-800">
        <div className="container mx-auto px-4 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} Concerned Citizens of Montgomery County. All rights reserved.</p>
          <p className="mt-2">Promoting fiscal transparency and civic engagement.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;