
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { CATEGORIES, DASHBOARDS } from './constants.ts';
import { DashboardConfig } from './types.ts';

// 1. SAFE INITIALIZATION
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

const Toast = ({ message, type }: { message: string, type: 'success' | 'error' }) => (
  <div className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-xl text-white z-[100] transition-all transform animate-bounce ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
    <i className={`fa-solid ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'} mr-2`}></i>
    {message}
  </div>
);

export default function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeDashboard, setActiveDashboard] = useState<DashboardConfig | null>(null);
  const [user, setUser] = useState<any>(null);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  if (!supabase) {
    return (
      <div className="min-h-screen bg-indigo-900 flex items-center justify-center p-6 text-white text-center font-sans">
        <div className="max-w-md">
          <i className="fa-solid fa-key text-6xl mb-6 text-yellow-400"></i>
          <h1 className="text-3xl font-black mb-4">Setup Required</h1>
          <p className="text-indigo-200 mb-8 leading-relaxed">
            I can't find your <strong>Supabase URL</strong> or <strong>Anon Key</strong>. 
          </p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      showToast(error.message, "error");
    } else {
      showToast("Welcome back!", "success");
      setCurrentPage('home');
    }
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsVerifying(true);
    
    const formData = new FormData(e.currentTarget);
    const lastName = (formData.get('lastName') as string).toUpperCase();
    const voterId = formData.get('voterId') as string;
    const dob = formData.get('dob') as string;
    const address = (formData.get('address') as string).toUpperCase();
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const verifyRes = await fetch('/.netlify/functions/verify-voter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lastName, voterId, dob, address })
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        throw new Error(verifyData.error || "Identity could not be verified.");
      }

      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: verifyData.fullName,
            voter_id: voterId,
            district: verifyData.district
          }
        }
      });

      if (signUpError) throw signUpError;

      showToast("Identity Verified! Please check your email to confirm.", "success");
      setCurrentPage('login');
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    showToast("Logged out successfully");
    setCurrentPage('home');
    setSelectedCategory(null);
    setActiveDashboard(null);
  };

  const goHome = () => {
    setCurrentPage('home');
    setSelectedCategory(null);
    setActiveDashboard(null);
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col font-sans overflow-hidden">
      {toast && <Toast message={toast.message} type={toast.type} />}
      
      <nav className="bg-white shadow-sm px-6 py-3 flex justify-between items-center z-50 shrink-0">
        <div className="flex items-center cursor-pointer" onClick={goHome}>
          <i className="fa-solid fa-landmark text-indigo-600 text-xl mr-2"></i>
          <span className="text-lg font-bold text-gray-800 tracking-tight">Community Finance Hub</span>
        </div>
        <div className="flex gap-2 items-center">
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-xs font-black text-gray-600 uppercase tracking-tighter">Hi, {user.user_metadata?.full_name?.split(' ')[0]}</span>
              <button onClick={handleLogout} className="text-[9px] font-black uppercase text-red-500 border border-red-100 px-2 py-1.5 rounded-lg hover:bg-red-50 transition">Logout</button>
            </div>
          ) : (
            <>
              <button onClick={() => setCurrentPage('login')} className="text-gray-600 px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 transition">Login</button>
              <button onClick={() => setCurrentPage('signup')} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition shadow-md">Register</button>
            </>
          )}
        </div>
      </nav>

      <main className="flex-grow overflow-hidden container mx-auto px-4 flex flex-col pt-4 pb-2">
        {currentPage === 'home' && !selectedCategory && (
          <div className="max-w-5xl mx-auto w-full h-full flex flex-col justify-center">
            <header className="mb-6 text-center">
              <h1 className="text-3xl md:text-5xl font-black mb-2 text-gray-900 uppercase tracking-tight leading-none">Transparency Portal</h1>
              <p className="text-gray-500 text-base md:text-lg max-w-2xl mx-auto">Verified voter access to financial records and community oversight.</p>
            </header>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {CATEGORIES.map(cat => (
                <div 
                  key={cat.id} 
                  onClick={() => setSelectedCategory(cat.id)}
                  className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 hover:shadow-xl transition-all cursor-pointer group text-left relative overflow-hidden flex items-start gap-4"
                >
                  <div className={`${cat.color} w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center text-white shadow-lg relative z-10 group-hover:scale-110 transition-transform`}>
                    <i className={`fa-solid ${cat.icon} text-xl`}></i>
                  </div>
                  <div className="relative z-10">
                    <h3 className="text-lg font-black text-gray-800 mb-1 uppercase tracking-tight">{cat.label}</h3>
                    <p className="text-gray-400 text-sm leading-snug">Click to view all {cat.label.toLowerCase()} reports and live data.</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentPage === 'home' && selectedCategory && (
          <div className="flex flex-col h-full">
             <div className="flex items-center gap-2 mb-3 shrink-0">
               <button onClick={goHome} className="text-indigo-600 font-black text-[10px] uppercase tracking-widest hover:underline flex items-center gap-2">
                 <i className="fa-solid fa-house"></i> Home
               </button>
               <span className="text-gray-300 text-[10px]">/</span>
               <button 
                 onClick={() => setActiveDashboard(null)} 
                 className={`${activeDashboard ? 'text-indigo-600 hover:underline' : 'text-gray-400'} font-black text-[10px] uppercase tracking-widest transition-colors`}
               >
                 {selectedCategory}
               </button>
               {activeDashboard && (
                 <>
                   <span className="text-gray-300 text-[10px]">/</span>
                   <span className="text-gray-400 font-black text-[10px] uppercase tracking-widest truncate max-w-[200px] md:max-w-none">
                     {activeDashboard.title}
                   </span>
                 </>
               )}
             </div>

             <div className="flex-grow overflow-hidden flex flex-col">
                {/* Only show the Big Header if NOT viewing a specific dashboard */}
                {!activeDashboard && (
                  <h2 className="text-3xl font-black mb-6 text-gray-900 uppercase shrink-0">{selectedCategory} Reports</h2>
                )}
                
                {!user ? (
                   <div className="bg-white p-12 rounded-[3rem] shadow-xl text-center flex-grow flex flex-col justify-center items-center">
                      <div className="w-20 h-20 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-6 text-3xl">
                        <i className="fa-solid fa-lock"></i>
                      </div>
                      <h3 className="text-2xl font-black mb-2 text-gray-800">Verified Access Only</h3>
                      <p className="text-gray-500 mb-8 max-w-sm">Detailed financial records are restricted to registered voters. Please login or register to continue.</p>
                      <div className="flex gap-4">
                        <button onClick={() => setCurrentPage('login')} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg">Login</button>
                        <button onClick={() => setCurrentPage('signup')} className="border-2 border-indigo-50 text-indigo-600 px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest">Register</button>
                      </div>
                   </div>
                ) : activeDashboard ? (
                  <div className="flex-grow flex flex-col h-full relative bg-white rounded-[1.5rem] shadow-2xl border border-gray-100 overflow-hidden">
                    <div className="absolute top-3 right-3 z-10">
                       <button 
                         onClick={() => setActiveDashboard(null)} 
                         className="bg-white/90 backdrop-blur shadow-sm border border-gray-100 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                       >
                         <i className="fa-solid fa-xmark"></i> Close Report
                       </button>
                    </div>
                    <iframe 
                      src={activeDashboard.folderPath} 
                      className="w-full h-full border-0" 
                      title={activeDashboard.title}
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-8">
                    {DASHBOARDS.filter(d => d.category === selectedCategory).length > 0 ? (
                      DASHBOARDS.filter(d => d.category === selectedCategory).map(dash => (
                        <div key={dash.id} onClick={() => setActiveDashboard(dash)} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 hover:shadow-xl transition-all cursor-pointer group">
                           <h4 className="text-xl font-black text-gray-800 mb-3 uppercase tracking-tight group-hover:text-indigo-600 transition-colors">{dash.title}</h4>
                           <p className="text-gray-400 text-sm leading-relaxed mb-6">{dash.description}</p>
                           <span className="text-indigo-600 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                             Launch Dashboard <i className="fa-solid fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
                           </span>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full py-20 text-center bg-gray-100 rounded-[3rem] border-2 border-dashed border-gray-200">
                         <i className="fa-solid fa-folder-open text-4xl text-gray-300 mb-4"></i>
                         <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">No reports currently available in this category</p>
                      </div>
                    )}
                  </div>
                )}
             </div>
          </div>
        )}

        {currentPage === 'signup' && (
          <div className="max-w-lg mx-auto w-full">
            <div className="flex gap-2 mb-4 bg-gray-100 p-1.5 rounded-2xl">
              <button onClick={() => setCurrentPage('signup')} className="flex-1 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest bg-white shadow-sm text-indigo-600">1. Register</button>
              <button onClick={() => setCurrentPage('login')} className="flex-1 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest text-gray-400 hover:text-gray-600 transition">2. Login</button>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 overflow-y-auto max-h-[75vh]">
              <h2 className="text-2xl font-black text-center mb-1 text-gray-900 uppercase tracking-tighter">New Voter Registry</h2>
              <p className="text-center text-gray-400 mb-6 text-[9px] uppercase font-bold tracking-widest px-4">Must match official records exactly</p>
              
              <form className="space-y-4" onSubmit={handleSignup}>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase mb-1 tracking-widest">Last Name</label>
                    <input name="lastName" required placeholder="E.G. SMITH" className="w-full p-3 bg-gray-50 rounded-xl border-2 border-transparent focus:border-indigo-500 transition-all outline-none font-bold uppercase text-sm" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase mb-1 tracking-widest">Voter ID #</label>
                    <input name="voterId" required placeholder="12345678" className="w-full p-3 bg-gray-50 rounded-xl border-2 border-transparent focus:border-indigo-500 transition-all outline-none font-bold text-sm" />
                  </div>
                </div>

                <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[8px] font-black text-indigo-400 mb-1 uppercase tracking-tighter">Date of Birth</label>
                      <input type="date" name="dob" className="w-full p-3 bg-white rounded-lg border-0 shadow-sm text-xs font-bold" />
                    </div>
                    <div>
                      <label className="block text-[8px] font-black text-indigo-400 mb-1 uppercase tracking-tighter">Street Address</label>
                      <input name="address" placeholder="123 MAIN ST" className="w-full p-3 bg-white rounded-lg border-0 shadow-sm text-xs font-bold uppercase" />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase mb-1 tracking-widest">Email Address</label>
                    <input type="email" name="email" required placeholder="name@email.com" className="w-full p-3 bg-gray-50 rounded-xl border-2 border-transparent focus:border-indigo-500 transition-all outline-none font-bold text-sm" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase mb-1 tracking-widest">Password</label>
                    <input type="password" name="password" required placeholder="••••••••" className="w-full p-3 bg-gray-50 rounded-xl border-2 border-transparent focus:border-indigo-500 transition-all outline-none font-bold text-sm" />
                  </div>
                </div>
                
                <button disabled={isVerifying} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black text-base shadow-lg hover:bg-indigo-700 disabled:bg-indigo-300 transition-all flex items-center justify-center gap-2">
                  {isVerifying ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-user-shield"></i>}
                  {isVerifying ? 'Verifying...' : 'Verify & Register'}
                </button>
              </form>
            </div>
          </div>
        )}

        {currentPage === 'login' && (
          <div className="max-w-sm mx-auto w-full">
            <div className="flex gap-2 mb-4 bg-gray-100 p-1.5 rounded-2xl">
              <button onClick={() => setCurrentPage('signup')} className="flex-1 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest text-gray-400 hover:text-gray-600 transition">1. Register</button>
              <button onClick={() => setCurrentPage('login')} className="flex-1 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest bg-white shadow-sm text-indigo-600">2. Login</button>
            </div>

            <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100">
              <h2 className="text-2xl font-black text-center mb-6 text-gray-900 tracking-tighter uppercase">Voter Login</h2>
              <form className="space-y-3" onSubmit={handleLogin}>
                <input name="email" type="email" placeholder="Email Address" required className="w-full p-4 bg-gray-50 rounded-xl border-2 border-transparent focus:border-indigo-500 transition-all outline-none font-bold text-sm" />
                <input name="password" type="password" placeholder="Password" required className="w-full p-4 bg-gray-50 rounded-xl border-2 border-transparent focus:border-indigo-500 transition-all outline-none font-bold text-sm" />
                <button className="w-full bg-indigo-600 text-white py-4 rounded-xl font-black text-base hover:bg-indigo-700 shadow-lg transition-all">Sign In</button>
              </form>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-gray-100 py-3 px-6 text-center shrink-0">
        <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">© 2024 Community Finance Hub • Verified Identity Platform</p>
      </footer>
    </div>
  );
}
