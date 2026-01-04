
import React, { useState } from 'react';
import { Poll } from '../types.ts';

interface AdminViewProps {
  onAddPoll: (poll: Poll) => void;
}

export const AdminView: React.FC<AdminViewProps> = ({ onAddPoll }) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);

  const handleAddOption = () => setOptions([...options, '']);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newPoll: Poll = {
      id: Date.now().toString(),
      question,
      options: options.filter(o => o.trim() !== ''),
      isOpen: true,
      endsAt: '2025-01-01',
      votes: {},
      comments: []
    };
    onAddPoll(newPoll);
    setQuestion('');
    setOptions(['', '']);
    alert("Poll Created Successfully!");
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-2xl font-bold mb-6">Admin: Create New Poll</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Poll Question</label>
            <textarea 
              required
              value={question}
              onChange={e => setQuestion(e.target.value)}
              className="w-full p-4 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Should we approve the new bridge budget?"
            />
          </div>
          
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase text-slate-500">Answer Options</label>
            {options.map((opt, idx) => (
              <input 
                key={idx}
                type="text"
                required
                value={opt}
                onChange={e => {
                  const newOpts = [...options];
                  newOpts[idx] = e.target.value;
                  setOptions(newOpts);
                }}
                className="w-full p-3 bg-slate-50 border rounded-lg"
                placeholder={`Option ${idx + 1}`}
              />
            ))}
            <button 
              type="button" 
              onClick={handleAddOption}
              className="text-blue-600 text-sm font-bold hover:underline"
            >
              + Add Another Option
            </button>
          </div>

          <button className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition">
            Launch Poll to Voters
          </button>
        </form>
      </div>
    </div>
  );
};
