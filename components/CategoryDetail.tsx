
import React, { useState } from 'react';

interface CategoryDetailProps {
  category: {
    title: string;
    description: string;
    items: { name: string; path: string }[];
  };
  onBack: () => void;
}

export const CategoryDetail: React.FC<CategoryDetailProps> = ({ category, onBack }) => {
  const [activeDashboard, setActiveDashboard] = useState<string | null>(null);

  if (activeDashboard) {
    return (
      <div className="flex flex-col h-[calc(100vh-64px)]">
        <div className="bg-white p-3 flex justify-between items-center border-b shadow-sm">
          <div className="font-semibold text-slate-700">{activeDashboard}</div>
          <button 
            onClick={() => setActiveDashboard(null)}
            className="bg-slate-900 text-white px-4 py-1.5 rounded text-sm hover:bg-slate-800"
          >
            Close Dashboard
          </button>
        </div>
        <iframe 
          src={activeDashboard} 
          className="flex-grow w-full border-none"
          title="Dashboard View"
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <button 
        onClick={onBack}
        className="text-blue-600 mb-8 font-medium hover:underline flex items-center"
      >
        ← Back to Home
      </button>

      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm mb-8">
        <h1 className="text-3xl font-bold mb-4">{category.title}</h1>
        <div className="prose prose-slate max-w-none mb-8">
          <h3 className="text-lg font-semibold text-slate-800">How to interpret this data:</h3>
          <p className="text-slate-600 leading-relaxed">
            {category.description}
          </p>
          <ul className="text-sm text-slate-500 mt-4 space-y-1">
            <li>• Use the dropdowns in the dashboards to filter by specific years.</li>
            <li>• All charts are generated directly from county-provided CSV files.</li>
            <li>• Click chart points to view underlying PDF documentation where available.</li>
          </ul>
        </div>

        <h3 className="text-xl font-bold mb-4 border-t pt-8">Available Dashboards</h3>
        <div className="grid grid-cols-1 gap-3">
          {category.items.map((item, idx) => (
            <button
              key={idx}
              onClick={() => setActiveDashboard(item.path)}
              className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition text-left"
            >
              <div className="flex items-center gap-3">
                <span className="bg-blue-100 text-blue-700 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs">
                  {idx + 1}
                </span>
                <span className="font-semibold">{item.name}</span>
              </div>
              <span className="text-slate-400">View →</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
