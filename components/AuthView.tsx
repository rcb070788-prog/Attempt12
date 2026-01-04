
import React, { useState } from 'react';
import { User } from '../types.ts';

interface AuthViewProps {
  isSignup: boolean;
  onAuthSuccess: (user: User) => void;
}

type AuthMode = 'login' | 'signup' | 'forgot';

export const AuthView: React.FC<AuthViewProps> = ({ isSignup, onAuthSuccess }) => {
  const [mode, setMode] = useState<AuthMode>(isSignup ? 'signup' : 'login');
  const [step, setStep] = useState<1 | 2>(1);
  const [formData, setFormData] = useState({
    name: '',
    voterId: '',
    username: '',
    password: '',
    pref: 'email' as 'email' | 'text' | 'both'
  });
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    // SIMULATED: Verification logic
    // For testing: Any name + 5 digit ID works.
    if (formData.name.length > 2 && formData.voterId.length === 5) {
      if (mode === 'forgot') {
        setMessage({ type: 'success', text: `Verification successful. A temporary password has been sent to your registered ${formData.pref === 'text' ? 'phone' : 'email'}.` });
      } else {
        setStep(2);
      }
    } else {
      setMessage({ type: 'error', text: "Voter records not found. Please check your spelling or Voter ID# (Try any 5-digit number for testing)." });
    }
  };

  const handleFinalize = (e: React.FormEvent) => {
    e.preventDefault();
    // Logic: If username is 'admin', they get admin privileges in the App
    onAuthSuccess({
      name: formData.name || 'Site Admin',
      voterId: formData.voterId || '00000',
      username: formData.username,
      isVerified: true,
      notificationPref: formData.pref
    });
  };

  return (
    <div className="max-w-md mx-auto px-4 py-20">
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl">
        <h2 className="text-2xl font-bold mb-2">
          {mode === 'forgot' ? 'Reset Password' : mode === 'login' ? 'Welcome Back' : step === 1 ? 'Verify Your Eligibility' : 'Create Your Account'}
        </h2>
        
        {message.text && (
          <div className={`p-3 rounded-lg text-sm mb-4 border ${message.type === 'error' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
            {message.text}
          </div>
        )}

        {mode === 'forgot' || (mode === 'signup' && step === 1) ? (
          <form onSubmit={handleVerify} className="space-y-4">
            <p className="text-sm text-slate-500 mb-4">
              To {mode === 'forgot' ? 'reset your password' : 'sign up'}, please provide your voter registration details.
            </p>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Full Name</label>
              <input 
                type="text" required
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full p-3 bg-slate-50 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" 
                placeholder="John D. Doe"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Voter ID Number</label>
              <input 
                type="text" required
                value={formData.voterId}
                onChange={e => setFormData({...formData, voterId: e.target.value})}
                className="w-full p-3 bg-slate-50 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" 
                placeholder="12345"
              />
            </div>
            <a href="https://tnmap.tn.gov/voterlookup/" target="_blank" className="block text-sm text-blue-600 hover:underline">
              Don't know my Voter ID#? Find it here.
            </a>
            <button className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition">
              {mode === 'forgot' ? 'Request Temporary Password' : 'Verify Identity'}
            </button>
            
            <div className="pt-4 flex justify-between text-xs text-slate-400">
              <button type="button" onClick={() => { setMode('login'); setStep(1); setMessage({type:'', text:''}); }}>Back to Login</button>
            </div>
          </form>
        ) : mode === 'login' ? (
          <form onSubmit={handleFinalize} className="space-y-4">
             <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Username</label>
              <input 
                type="text" required 
                value={formData.username}
                onChange={e => setFormData({...formData, username: e.target.value})}
                className="w-full p-3 bg-slate-50 border rounded-lg outline-none" 
                placeholder="Use 'admin' to test admin panel"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Password</label>
              <input type="password" required className="w-full p-3 bg-slate-50 border rounded-lg outline-none" />
            </div>
            <button className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition">Log In</button>
            <div className="flex justify-between text-xs text-slate-400">
               <button type="button" onClick={() => setMode('signup')}>Need an account?</button>
               <button type="button" onClick={() => setMode('forgot')}>Forgot Password?</button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleFinalize} className="space-y-4">
             <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Choose Username</label>
              <input 
                type="text" required
                value={formData.username}
                onChange={e => setFormData({...formData, username: e.target.value})}
                className="w-full p-3 bg-slate-50 border rounded-lg outline-none" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Set Password</label>
              <input type="password" required className="w-full p-3 bg-slate-50 border rounded-lg outline-none" />
            </div>
            <button className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition">Create Account</button>
          </form>
        )}
      </div>
    </div>
  );
};
