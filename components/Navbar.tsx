import React from 'react';

interface NavbarProps {
  setCurrentPage: (page: string) => void;
  setSelectedCategory: (cat: string | null) => void;
  setIsMenuOpen: (open: boolean) => void;
}

export const Navbar = ({ setCurrentPage, setSelectedCategory, setIsMenuOpen }: NavbarProps) => {
  return (
    <nav className="bg-white shadow-sm px-4 py-3 z-50 shrink-0 border-b border-gray-100 flex justify-between items-center">
      <div className="flex items-center gap-6">
        <div 
          className="flex items-center cursor-pointer" 
          onClick={() => { setCurrentPage('home'); setSelectedCategory(null); }}
        >
          <i className="fa-solid fa-landmark text-indigo-600 text-xl mr-2"></i>
          <span className="text-lg font-bold uppercase tracking-tighter text-gray-900">Finance Hub</span>
        </div>
      </div>
      <button 
        onClick={() => setIsMenuOpen(true)} 
        className="bg-gray-100 p-2.5 rounded-xl text-gray-600"
      >
        <i className="fa-solid fa-bars-staggered"></i>
      </button>
    </nav>
  );
};