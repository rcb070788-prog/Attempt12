import React from 'react';
import { Category } from '../types.ts';

interface HomeProps {
  onCategorySelect: (cat: Category) => void;
}

const Home: React.FC<HomeProps> = ({ onCategorySelect }) => {
  const cards = [
    { id: Category.EXPENSES, label: 'Expenses', icon: '💸', color: 'bg-red-50 text-red-700 border-red-100' },
    { id: Category.REVENUES, label: 'Revenues', icon: '📈', color: 'bg-green-50 text-green-700 border-green-100' },
    { id: Category.ASSETS, label: 'Assets', icon: '🏛️', color: 'bg-blue-50 text-blue-700 border-blue-100' },
    { id: Category.LIABILITIES, label: 'Liabilities', icon: '📜', color: 'bg-amber-50 text-amber-700 border-amber-100' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      <header className="text-center space-y-4">
        <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">Financial Transparency Portal</h2>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto">
          Explore the financial health of our community. Select a category below to view detailed charts, maps, and historical reports.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cards.map((card) => (
          <button
            key={card.id}
            onClick={() => onCategorySelect(card.id)}
            className={`flex items-center gap-6 p-8 rounded-2xl border-2 transition-all hover:scale-[1.02] hover:shadow-xl text-left ${card.color}`}
          >
            <span className="text-5xl">{card.icon}</span>
            <div>
              <h3 className="text-2xl font-bold mb-1">{card.label}</h3>
              <p className="text-sm opacity-80 font-medium">Click to see how our county manages its {card.label.toLowerCase()}.</p>
            </div>
            <div className="ml-auto">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        ))}
      </div>

      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center">
        <h3 className="text-xl font-bold text-slate-800 mb-2">Voter Access Required for Participation</h3>
        <p className="text-slate-600 mb-6">Verified registered voters can participate in live polls and comment on infrastructure projects.</p>
        <div className="flex justify-center gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
             <span className="w-2 h-2 rounded-full bg-green-500"></span>
             Real-time Polling
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
             <span className="w-2 h-2 rounded-full bg-blue-500"></span>
             Community Comments
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;