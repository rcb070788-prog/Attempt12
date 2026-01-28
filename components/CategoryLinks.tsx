import React from 'react';
import { CATEGORIES } from '../constants';

interface CategoryLinksProps {
  // This is the "Remote Control" that allows this component to change the state in App.tsx
  setSelectedCategory: (id: string) => void;
}

export const CategoryLinks: React.FC<CategoryLinksProps> = ({ setSelectedCategory }) => {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col md:flex-row gap-6">
        {/* "Looping" through the list of categories to find only Revenues and Expenses */}
        {CATEGORIES.filter(c => ['revenues', 'expenses'].includes(c.id)).map(cat => (
          <div 
            key={cat.id} 
            onClick={() => setSelectedCategory(cat.id)} 
            className="flex-1 bg-white p-10 rounded-[3rem] shadow-sm border-2 border-transparent hover:border-indigo-600 hover:shadow-2xl transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                 <div className={`${cat.color} w-20 h-20 rounded-[1.5rem] flex items-center justify-center text-white text-3xl shadow-lg group-hover:scale-110 transition-transform`}>
                   <i className={`fa-solid ${cat.icon}`}></i>
                 </div>
                 <div>
                   <h3 className="text-2xl font-black uppercase tracking-tighter text-gray-900">{cat.label}</h3>
                   <p className="text-indigo-600 text-xs font-black uppercase tracking-widest opacity-60">View Operational Logs</p>
                 </div>
              </div>
              <i className="fa-solid fa-arrow-right text-gray-200 group-hover:text-indigo-600 group-hover:translate-x-2 transition-all text-2xl"></i>
            </div>
          </div>
        ))}
        
        {/* County Net Worth Dashboard Button */}
        <div 
          onClick={() => setSelectedCategory('solvency')} 
          className="flex-1 bg-white p-10 rounded-[3rem] shadow-sm border-2 border-transparent hover:border-indigo-600 hover:shadow-2xl transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
               <div className="bg-blue-500 w-20 h-20 rounded-[1.5rem] flex items-center justify-center text-white text-3xl shadow-lg group-hover:scale-110 transition-transform">
                 <i className="fa-solid fa-chart-line"></i>
               </div>
               <div>
                 <h3 className="text-2xl font-black uppercase tracking-tighter text-gray-900">County Net Worth</h3>
                 <p className="text-indigo-600 text-xs font-black uppercase tracking-widest opacity-60">View Financial Trends</p>
               </div>
            </div>
            <i className="fa-solid fa-arrow-right text-gray-200 group-hover:text-indigo-600 group-hover:translate-x-2 transition-all text-2xl"></i>
          </div>
        </div>
      </div>
    </div>
  );
};