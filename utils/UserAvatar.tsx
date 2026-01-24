import React from 'react';

export const UserAvatar = ({ url, isAnonymous, size = "md" }: { url?: string, isAnonymous?: boolean, size?: "sm" | "md" | "lg" }) => {
  const dims = size === "sm" ? "w-6 h-6 text-[8px]" : size === "lg" ? "w-16 h-16 text-xl" : "w-10 h-10 text-xs";
  if (isAnonymous) {
    return (
      <div className={`${dims} bg-gray-200 text-gray-500 rounded-full flex items-center justify-center border-2 border-white shadow-sm shrink-0`}>
        <i className="fa-solid fa-user-shield"></i>
      </div>
    );
  }
  return (
    <div className={`${dims} bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center border-2 border-white shadow-sm overflow-hidden shrink-0`}>
      {url ? <img src={url} alt="Avatar" className="w-full h-full object-cover" /> : <i className="fa-solid fa-user"></i>}
    </div>
  );
};