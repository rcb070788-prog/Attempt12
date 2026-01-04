import React from 'react';
import { User } from '../types.ts';

interface NavbarProps {
  onHome: () => void;
  onVoter: () => void;
  onAdmin: () => void;
  user: User | null;
  onLogout: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onHome, onVoter, onAdmin, user, onLogout }) => {
  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div 
          onClick={onHome}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="bg-blue-600 p-2 rounded-lg text-white group-hover:bg-blue-700 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <h1 className="font-bold text-xl text-slate-800 leading-tight">Concerned Citizens</h1>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">of Montgomery County</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={onHome}
            className="text-slate-600 hover:text-blue-600 font-medium transition-colors"
          >
            Public Data
          </button>
          
          <div className="h-4 w-px bg-slate-200 mx-2 hidden md:block"></div>

          {user ? (
            <div className="flex items-center gap-4">
              <button 
                onClick={onVoter}
                className="bg-blue-50 text-blue-700 px-4 py-2 rounded-full font-semibold hover:bg-blue-100 transition-colors"
              >
                Voter Portal
              </button>
              {user.username === 'admin' && (
                <button 
                  onClick={onAdmin}
                  className="bg-slate-800 text-white px-4 py-2 rounded-full font-semibold hover:bg-slate-700 transition-colors"
                >
                  Admin
                </button>
              )}
              <div className="flex flex-col items-end text-right">
                <span className="text-xs text-slate-400 font-medium">Logged in as</span>
                <span className="text-sm font-bold text-slate-700">{user.fullName}</span>
              </div>
              <button 
                onClick={onLogout}
                className="text-slate-400 hover:text-red-500"
                title="Logout"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          ) : (
            <button 
              onClick={onVoter}
              className="bg-blue-600 text-white px-6 py-2 rounded-full font-semibold hover:bg-blue-700 transition-shadow shadow-md hover:shadow-lg transition-all"
            >
              Voter Login
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;