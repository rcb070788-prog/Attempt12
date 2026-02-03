import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export const UserAvatar = ({ url, isAnonymous, size = "md" }: { url?: string, isAnonymous?: boolean, size?: "sm" | "md" | "lg" }) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const dims = size === "sm" ? "w-6 h-6 text-[8px]" : size === "lg" ? "w-16 h-16 text-xl" : "w-10 h-10 text-xs";

  const avatarContent = (
    <div className={`${dims} bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center border-2 border-white shadow-sm overflow-hidden shrink-0`}>
      {url ? <img src={url} alt="Avatar" className="w-full h-full object-cover" /> : <i className="fa-solid fa-user"></i>}
    </div>
  );

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [lightboxOpen]);

  useEffect(() => {
    if (lightboxOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [lightboxOpen]);

  if (isAnonymous) {
    return (
      <div className={`${dims} bg-gray-200 text-gray-500 rounded-full flex items-center justify-center border-2 border-white shadow-sm shrink-0`}>
        <i className="fa-solid fa-user-shield"></i>
      </div>
    );
  }

  const isClickable = Boolean(url);

  const lightbox = lightboxOpen && url && createPortal(
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[500] flex items-center justify-center p-4 animate-slide-up"
      onClick={() => setLightboxOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Profile photo"
    >
      <button
        type="button"
        onClick={() => setLightboxOpen(false)}
        className="absolute top-4 right-4 text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white"
        aria-label="Close"
      >
        <i className="fa-solid fa-circle-xmark text-2xl" />
      </button>
      <div
        className="relative w-full max-w-[min(100vw-2rem,384px)] max-h-[min(85vh,576px)] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={url}
          alt="Profile photo"
          className="w-full h-full object-contain rounded-full max-w-[min(100vw-2rem,384px)] max-h-[min(85vh,576px)]"
        />
      </div>
    </div>,
    document.body
  );

  if (isClickable) {
    return (
      <>
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          className="cursor-pointer rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 hover:ring-2 hover:ring-indigo-400/50 hover:ring-offset-1 transition-shadow shrink-0"
          aria-label="View profile photo"
        >
          {avatarContent}
        </button>
        {lightbox}
      </>
    );
  }

  return avatarContent;
};
