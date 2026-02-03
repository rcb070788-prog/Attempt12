import React, { useState, useRef, useEffect } from 'react';
import { UserAvatar } from './UserAvatar';

interface SidebarProps {
  isMenuOpen: boolean;
  setIsMenuOpen: (open: boolean) => void;
  user: any;
  profile: any;
  isUploading: boolean;
  handlePhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  setCurrentPage: (page: string) => void;
  setSelectedCategory: (cat: string | null) => void;
  setSelectedPoll: (poll: any) => void;
  fetchPolls: () => void;
  fetchBoardMessages: () => void;
  fetchSuggestions: () => void;
  fetchUsers: () => void;
  supabase: any;
}

const INTERACTIVE_SELECTOR = 'button, a, input, select, textarea, [role="button"]';

function isTouchOnInteractive(target: EventTarget | null): boolean {
  if (!target) return false;
  const node = target as Node;
  const el = node.nodeType === 3 ? (node as Text).parentElement : (target as Element);
  return Boolean(el?.closest(INTERACTIVE_SELECTOR));
}

export const Sidebar = ({
  isMenuOpen,
  setIsMenuOpen,
  user,
  profile,
  isUploading,
  handlePhotoUpload,
  setCurrentPage,
  setSelectedCategory,
  setSelectedPoll,
  fetchPolls,
  fetchBoardMessages,
  fetchSuggestions,
  fetchUsers,
  supabase
}: SidebarProps) => {
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchTargetRef = useRef<EventTarget | null>(null);
  const logoutHandledByTouchRef = useRef(false);

  useEffect(() => {
    if (!isMenuOpen) {
      setDragOffset(0);
      setIsDragging(false);
      touchStartRef.current = null;
      touchTargetRef.current = null;
      logoutHandledByTouchRef.current = false;
    }
  }, [isMenuOpen]);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    touchTargetRef.current = e.target;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    if (isTouchOnInteractive(touchTargetRef.current)) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;

    if (!isDragging) {
      if (deltaX > 25 && deltaX > Math.abs(deltaY)) {
        setIsDragging(true);
        e.preventDefault();
        setDragOffset(deltaX);
      }
      return;
    }
    if (deltaX > 0) {
      e.preventDefault();
      setDragOffset(deltaX);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    if (dragOffset > 100) {
      setIsMenuOpen(false);
    }
    setDragOffset(0);
    setIsDragging(false);
    touchStartRef.current = null;
    touchTargetRef.current = null;
  };

  if (!isMenuOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      {/* Click-catcher for "click outside to close"; on desktop the visual layer has pointer-events: none so panel buttons receive clicks */}
      <div className="absolute inset-0 z-0" onClick={() => setIsMenuOpen(false)} aria-hidden="true" />
      <div className="absolute inset-0 z-0 bg-black/40 backdrop-blur-sm md:pointer-events-none" onClick={() => setIsMenuOpen(false)} aria-hidden="true" />
      <div
        className="relative z-10 w-80 bg-white h-full shadow-2xl p-8 flex flex-col touch-pan-y"
        style={{
          transform: `translateX(${dragOffset}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <button onClick={() => setIsMenuOpen(false)} className="self-end text-gray-300 hover:text-red-500 mb-8 transition-colors">
          <i className="fa-solid fa-xmark text-2xl"></i>
        </button>

        {user && (
          <div className="relative mb-8 flex flex-col items-center text-center">
            <div className="relative">
              <UserAvatar url={profile?.avatar_url} size="lg" />
              <label className="absolute bottom-0 right-0 bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center cursor-pointer border-2 border-white shadow-lg">
                <i className={`fa-solid ${isUploading ? 'fa-spinner animate-spin' : 'fa-camera'} text-[10px]`}></i>
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={isUploading} />
              </label>
            </div>
            <div className="mt-4">
              <p className="text-sm font-black text-gray-900 uppercase">{profile?.full_name}</p>
              <p className="text-[18.66px] font-black uppercase text-gray-400">District {profile?.district} Voter</p>
              {profile?.virtual_email && (
                <div className="mt-2 bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100 flex items-center gap-2">
                  <i className="fa-solid fa-envelope text-indigo-600 text-xs"></i>
                  <p className="text-[18.66px] font-black uppercase text-indigo-600 truncate max-w-[200px]">
                    {profile.virtual_email}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <button onClick={() => { setCurrentPage('home'); setSelectedCategory(null); setIsMenuOpen(false); }} className="text-xl font-black uppercase block">Home</button>
          <button onClick={() => { setCurrentPage('polls'); setSelectedPoll(null); setIsMenuOpen(false); fetchPolls(); }} className="text-xl font-black uppercase block">Polls</button>
          <button onClick={() => { setCurrentPage('board'); setIsMenuOpen(false); fetchBoardMessages(); }} className="text-xl font-black uppercase block">Message Officials</button>
          <button onClick={() => { setCurrentPage('suggestions'); setIsMenuOpen(false); fetchSuggestions(); }} className="text-xl font-black uppercase block">Suggestions</button>
          {profile?.is_admin && <button onClick={() => { setCurrentPage('admin'); setIsMenuOpen(false); fetchUsers(); }} className="text-xl font-black uppercase text-red-600 block">Admin Center</button>}

          <div className="pt-8 mt-8 border-t border-gray-100 space-y-4">
            {user ? (
              <button
                onClick={() => {
                  if (logoutHandledByTouchRef.current) {
                    logoutHandledByTouchRef.current = false;
                    return;
                  }
                  supabase?.auth.signOut();
                  setIsMenuOpen(false);
                }}
                onTouchEnd={(e) => {
                  if (isDragging) return;
                  e.preventDefault();
                  logoutHandledByTouchRef.current = true;
                  supabase?.auth.signOut();
                  setIsMenuOpen(false);
                }}
                className="text-xl font-black uppercase block text-red-500 hover:text-red-700 transition-colors"
              >
                Log Out
              </button>
            ) : (
              <>
                <button onClick={() => { setCurrentPage('login'); setIsMenuOpen(false); }} className="text-xl font-black uppercase block text-green-600 hover:text-green-700 transition-colors">Login</button>
                <button onClick={() => { setCurrentPage('signup'); setIsMenuOpen(false); }} className="text-xl font-black uppercase block text-indigo-600 hover:text-indigo-700 transition-colors">Register</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
