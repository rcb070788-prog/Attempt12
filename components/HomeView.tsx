
import React from 'react';
import { CategoryKey, DASHBOARD_CONFIG } from '../constants';

interface HomeViewProps {
  onSelectCategory: (key: CategoryKey) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onSelectCategory }) => {
  const categories: { key: CategoryKey; label: string; icon: string; color: string }[] = [
    { key: 'expenses', label: 'Expenses', icon: '💸', color: 'bg-red-50 text-red-600 border-red-100' },
    { key: 'revenues', label: 'Revenues', icon: '💰', color: 'bg-green-50 text-green-600 border-green-100' },
    { key: 'assets', label: 'Assets', icon: '🏢', color: 'bg-blue-50 text-blue-600 border-blue-100' },
    { key: 'liabilities', label: 'Liabilities', icon: '📉', color: 'bg-amber-50 text-amber-600 border-amber-100' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-16">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4">
          Fiscal Transparency Portal
        </h1>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto">
          Access local government dashboards, CSV data, and PDF reports directly.
          Verified voters can participate in polls and discussions.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => onSelectCategory(cat.key)}
            className={`group p-8 rounded-2xl border-2 text-left transition-all hover:shadow-xl hover:-translate-y-1 ${cat.color}`}
          >
            <div className="text-4xl mb-4">{cat.icon}</div>
            <h2 className="text-2xl font-bold mb-2">{cat.label}</h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              {DASHBOARD_CONFIG[cat.key].description}
            </p>
            <div className="mt-6 flex items-center font-bold text-sm">
              View Dashboards 
              <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
