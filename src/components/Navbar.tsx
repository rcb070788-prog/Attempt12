import React from 'react';

interface NavbarProps {
  setCurrentPage: (page: string) => void;
  setSelectedCategory: (cat: string | null) => void;
  setIsMenuOpen: (open: boolean) => void;
  showMenuSparkle?: boolean;
}

export const Navbar = ({ setCurrentPage, setSelectedCategory, setIsMenuOpen, showMenuSparkle }: NavbarProps) => {
  const menuButton = (
    <button 
      onClick={() => setIsMenuOpen(true)} 
      className="bg-gray-100 p-2.5 rounded-xl text-gray-600 relative z-10"
    >
      <i className="fa-solid fa-bars-staggered"></i>
    </button>
  );

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
      {showMenuSparkle ? (
        <div className="relative rounded-xl menu-btn-sparkle-wrap inline-block">
          {menuButton}
        </div>
      ) : (
        menuButton
      )}
    </nav>
  );
};