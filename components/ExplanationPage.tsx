import React from 'react';
import { Category, DashboardLink } from '../types.ts';

interface ExplanationPageProps {
  category: Category;
  explanation: {
    title: string;
    what: string;
    how: string;
  };
  links: DashboardLink[];
}

const ExplanationPage: React.FC<ExplanationPageProps> = ({ category, explanation, links }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4 mb-6">
           <span className="text-4xl">ℹ️</span>
           <h2 className="text-3xl font-bold text-slate-900">Understanding {explanation.title}</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <section className="space-y-4">
            <h3 className="text-lg font-bold text-blue-600 uppercase tracking-widest">What you are viewing</h3>
            <p className="text-slate-700 leading-relaxed text-lg">
              {explanation.what}
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-bold text-green-600 uppercase tracking-widest">How to interpret it</h3>
            <p className="text-slate-700 leading-relaxed text-lg">
              {explanation.how}
            </p>
          </section>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-2xl font-extrabold text-slate-900 px-2">Available Dashboards</h3>
        {links.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {links.map((link) => (
              <a 
                key={link.id}
                href={link.path}
                target="_blank"
                rel="noopener noreferrer"
                className="block group bg-white border border-slate-200 p-6 rounded-2xl hover:border-blue-400 hover:shadow-md transition-all"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-xl font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                      {link.title}
                    </h4>
                    <p className="text-slate-500 mt-1">{link.description}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl group-hover:bg-blue-50 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-400 group-hover:text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </div>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="bg-slate-100 p-12 rounded-2xl text-center border-2 border-dashed border-slate-200">
            <p className="text-slate-500 italic">No dashboards have been uploaded for this category yet. Check back soon!</p>
          </div>
        )}
      </div>
      
      <div className="bg-blue-900 text-white p-8 rounded-2xl">
         <h4 className="text-lg font-bold mb-2">Notice for Dashboard Links</h4>
         <p className="text-blue-100 text-sm">Dashboards open in a new window. They are designed to work with local CSV and PDF files provided in the data folder. If you encounter errors, please contact site administration.</p>
      </div>
    </div>
  );
};

export default ExplanationPage;