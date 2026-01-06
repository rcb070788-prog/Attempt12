
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { CATEGORIES, DASHBOARDS, OFFICIALS } from './constants.ts';
import { DashboardConfig } from './types.ts';

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
  
  // County Message Board State
  const [messages, setMessages] = useState([
    { 
      id: '1', 
      user: 'Jane D.', 
      district: 'Dist 4', 
      to: 'Mayor Sloan Stewart', 
      text: 'What is the timeline for the new courthouse roof repairs?', 
      isAnonymous: false,
      response: { author: 'Mayor Sloan Stewart', text: 'We have approved the contractor, work begins next Monday.', date: '2 hours ago' }
    },
    { 
      id: '2', 
      user: 'Verified Voter', 
      district: 'Dist 2', 
      to: 'Robert Bracewell', 
      text: 'Thank you for looking into the District 2 drainage issues.', 
      isAnonymous: true,
      response: null
    }
  ]);
  
  // New Message Form State
  const [newMessage, setNewMessage] = useState('');
  const [targetOfficial, setTargetOfficial] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  if (!supabase) {
    return (
      <div className="min-h-screen bg-indigo-900 flex items-center justify-center p-6 text-white text-center font-sans">
        <div className="max-w-md">
          <i className="fa-solid fa-key text-6xl mb-6 text-yellow-400"></i>
          <h1 className="text-3xl font-black mb-4">Setup Required</h1>
          <p className="text-indigo-200 mb-8 leading-relaxed">Missing Supabase configuration.</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'SIGNED_IN') {
        showToast("Access Granted!", "success");
        setCurrentPage('home');
      }
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setCurrentPage('home');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handlePostMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !targetOfficial) {
      showToast("Please select an official and type a message.", "error");
      return;
    }
    
    const post = {
      id: Date.now().toString(),
      user: isAnonymous ? 'Verified Voter' : (user.user_metadata?.full_name?.split(' ')[0] + ' ' + user.user_metadata?.full_name?.split(' ')[1][0] + '.'),
      district: user.user_metadata?.district || 'Member',
      to: targetOfficial,
      text: newMessage,
      isAnonymous,
      response: null
    };
    
    setMessages([post, ...messages]);
    setNewMessage('');
    setTargetOfficial('');
    showToast("Message posted to board!");
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const { error } = await supabase.auth.signInWithPassword({ 
      email: formData.get('email') as string, 
      password: formData.get('password') as string 
    });
    if (error) showToast(error.message, "error");
    else setCurrentPage('home');
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsVerifying(true);
    const formData = new FormData(e.currentTarget);
    try {
      const verifyRes = await fetch('/.netlify/functions/verify-voter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          lastName: (formData.get('lastName') as string).toUpperCase(), 
          voterId: formData.get('voterId') as string, 
          dob: formData.get('dob') as string, 
          address: (formData.get('address') as string).toUpperCase() 
        })
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.error);

      const { error: signUpError } = await supabase.auth.signUp({
        email: formData.get('email') as string,
        password: formData.get('password') as string,
        options: { data: { full_name: verifyData.fullName, voter_id: formData.get('voterId'), district: verifyData.district } }
      });
      if (signUpError) throw signUpError;
      showToast("Verification Sent! Check your email.", "success");
      setCurrentPage('login');
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    showToast("Logged out");
  };

  const goHome = () => {
    setCurrentPage('home');
    setSelectedCategory(null);
    setActiveDashboard(null);
  };

  if (activeDashboard) {
    return (
      <div className="fixed inset-0 z-[100] bg-white flex flex-col font-sans overflow-hidden">
        {toast && <Toast message={toast.message} type={toast.type} />}
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-[110]">
          <button onClick={() => setActiveDashboard(null)} className="bg-white/95 backdrop-blur-md shadow-xl border border-gray-100 text-gray-800 px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl hover:bg-red-600 hover:text-white transition-all flex items-center gap-1 sm:gap-2 text-[9px] sm:text-[10px] font-black uppercase tracking-widest group">
            <i className="fa-solid fa-xmark text-xs sm:text-sm group-hover:rotate-90 transition-transform"></i> 
            <span>Close<span className="hidden sm:inline"> Report</span></span>
          </button>
        </div>
        <iframe src={activeDashboard.folderPath} className="w-full h-full border-0" title={activeDashboard.title} />
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col font-sans overflow-hidden relative">
      {toast && <Toast message={toast.message} type={toast.type} />}
      
      <nav className="bg-white shadow-sm px-6 py-3 flex justify-between items-center z-50 shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center cursor-pointer" onClick={goHome}>
            <i className="fa-solid fa-landmark text-indigo-600 text-xl mr-2"></i>
            <span className="text-lg font-bold text-gray-800 tracking-tight">County Finance Hub</span>
          </div>
          <button 
            onClick={() => {
              setCurrentPage('board');
              setSelectedCategory(null);
            }} 
            className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors py-2 px-1 border-b-2 ${currentPage === 'board' ? 'text-indigo-600 border-indigo-600' : 'text-gray-400 border-transparent hover:text-indigo-600'}`}
          >
            Let's Talk
          </button>
        </div>
        <div className="flex gap-2 items-center">
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-xs font-black text-gray-600 uppercase tracking-tighter">Hi, {user.user_metadata?.full_name?.split(' ')[0]}</span>
              <button onClick={handleLogout} className="text-[9px] font-black uppercase text-red-500 border border-red-100 px-2 py-1.5 rounded-lg hover:bg-red-50 transition">Logout</button>
            </div>
          ) : (
            <div className="flex gap-2 items-center">
              <button onClick={() => setCurrentPage('login')} className="text-gray-600 px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 transition">Login</button>
              <button onClick={() => setCurrentPage('signup')} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition shadow-md">Register</button>
            </div>
          )}
        </div>
      </nav>

      <main className="flex-grow overflow-hidden container mx-auto px-4 flex flex-col pt-4">
        {currentPage === 'home' && !selectedCategory && (
          <div className="max-w-5xl mx-auto w-full h-full flex flex-col justify-center">
            <header className="mb-8 text-center">
              <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest mb-4">
                <i className="fa-solid fa-globe"></i> Public Transparency Portal
              </div>
              <h1 className="text-4xl md:text-6xl font-black mb-3 text-gray-900 uppercase tracking-tighter leading-none">Oops Transparency</h1>
              <p className="text-gray-500 text-base md:text-xl max-w-2xl mx-auto">Financial tracking for Metropolitan Lynchburg/Moore County.</p>
            </header>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {CATEGORIES.map(cat => (
                <div key={cat.id} onClick={() => setSelectedCategory(cat.id)} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 hover:shadow-2xl transition-all cursor-pointer group flex items-start gap-6 hover:-translate-y-1">
                  <div className={`${cat.color} w-16 h-16 shrink-0 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl relative z-10 group-hover:rotate-6 transition-transform`}>
                    <i className={`fa-solid ${cat.icon} text-2xl`}></i>
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-800 mb-1 uppercase tracking-tight">{cat.label}</h3>
                    <p className="text-gray-400 text-sm leading-snug">Browse County records for {cat.label.toLowerCase()} reports.</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentPage === 'home' && selectedCategory && (
          <div className="flex flex-col h-full overflow-hidden">
             <div className="flex items-center gap-2 mb-3 shrink-0">
               <button onClick={goHome} className="text-indigo-600 font-black text-[10px] uppercase tracking-widest hover:underline flex items-center gap-2">
                 <i className="fa-solid fa-house"></i> Home
               </button>
               <span className="text-gray-300 text-[10px]">/</span>
               <span className="text-gray-400 font-black text-[10px] uppercase tracking-widest">{selectedCategory}</span>
             </div>

             <div className="flex-grow overflow-y-auto space-y-12 pb-12 pr-2 custom-scrollbar">
                <section>
                  <div className="flex justify-between items-end mb-6">
                    <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">{selectedCategory} Dashboards</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {DASHBOARDS.filter(d => d.category === selectedCategory).map(dash => (
                      <div key={dash.id} onClick={() => setActiveDashboard(dash)} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 hover:shadow-xl transition-all cursor-pointer group relative overflow-hidden">
                         <div className="flex justify-between items-start mb-4">
                           <span className="text-[8px] font-black uppercase tracking-widest bg-gray-50 text-gray-400 px-2 py-1 rounded-lg border border-gray-100">{dash.status || 'Official'}</span>
                         </div>
                         <h4 className="text-xl font-black text-gray-800 mb-2 uppercase tracking-tight group-hover:text-indigo-600 transition-colors leading-tight">{dash.title}</h4>
                         <p className="text-gray-400 text-xs leading-relaxed mb-6 line-clamp-2">{dash.description}</p>
                         <span className="text-indigo-600 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                           View Data <i className="fa-solid fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
                         </span>
                      </div>
                    ))}
                  </div>
                </section>
             </div>
          </div>
        )}

        {currentPage === 'board' && (
          <div className="flex flex-col h-full overflow-hidden items-center">
             <div className="w-full max-w-4xl flex-grow overflow-y-auto space-y-12 pb-12 pr-2 custom-scrollbar">
                <section>
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">County Message Board</h2>
                      <span className="bg-indigo-600 text-white text-[8px] font-black uppercase px-2 py-1 rounded-full">Public Record</span>
                    </div>
                  </div>
                  
                  {user && (
                    <div className="mb-12 bg-white p-8 rounded-[3rem] shadow-xl border border-gray-100">
                       <h3 className="text-sm font-black uppercase text-indigo-600 mb-6 flex items-center gap-2">
                         <i className="fa-solid fa-envelope-circle-check"></i> Contact Your Elected Officials
                       </h3>
                       <form onSubmit={handlePostMessage} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-2">1. Select Official</label>
                            <select 
                              value={targetOfficial}
                              onChange={(e) => setTargetOfficial(e.target.value)}
                              className="w-full bg-gray-50 p-4 rounded-2xl outline-none font-bold text-sm border-2 border-transparent focus:border-indigo-100 transition-all cursor-pointer"
                            >
                              <option value="">-- Address to... --</option>
                              {['Courthouse', 'Non-Courthouse', 'Council Members'].map(cat => (
                                <optgroup key={cat} label={cat.toUpperCase()}>
                                  {OFFICIALS.filter(o => o.category === cat).map(o => (
                                    <option key={o.id} value={o.name}>
                                      {o.office}: {o.name} {o.district ? `(Dist ${o.district})` : ''}
                                    </option>
                                  ))}
                                </optgroup>
                              ))}
                            </select>
                          </div>
                          
                          <div className="flex items-center justify-end px-4 gap-4">
                             <div className="text-right">
                               <p className="text-[10px] font-black uppercase text-gray-400">2. Privacy Mode</p>
                               <p className="text-[8px] font-bold text-gray-400">Toggle to hide your full name</p>
                             </div>
                             <button 
                               type="button"
                               onClick={() => setIsAnonymous(!isAnonymous)}
                               className={`w-14 h-8 rounded-full p-1 transition-colors relative ${isAnonymous ? 'bg-indigo-600' : 'bg-gray-200'}`}
                             >
                               <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-transform transform ${isAnonymous ? 'translate-x-6' : 'translate-x-0'}`}></div>
                             </button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-gray-400 ml-2">3. Your Message</label>
                          <textarea 
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type your question or statement here for the official record..." 
                            className="w-full h-32 bg-gray-50 rounded-3xl p-6 outline-none resize-none font-bold text-gray-700 placeholder:text-gray-300 border-2 border-transparent focus:border-indigo-100 transition-all"
                          />
                        </div>

                        <div className="flex justify-between items-center">
                           <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest">
                             Sending from <span className="text-indigo-600">{user.user_metadata?.district}</span>
                           </p>
                           <button type="submit" className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:shadow-2xl hover:-translate-y-1 transition-all">Submit to Board</button>
                        </div>
                       </form>
                    </div>
                  )}

                  <div className="relative">
                    <div className={`space-y-8 transition-all ${!user ? 'blur-md select-none opacity-40 pointer-events-none' : ''}`}>
                      {messages.map(msg => (
                        <div key={msg.id} className="flex flex-col gap-4">
                          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 relative group">
                            <div className="flex justify-between items-center mb-4">
                              <span className="text-[9px] font-black uppercase tracking-tighter text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">To: {msg.to}</span>
                              <span className="text-[8px] text-gray-300 font-bold uppercase">Constituent Inquiry</span>
                            </div>
                            <p className="text-gray-700 text-sm italic leading-relaxed mb-6">"{msg.text}"</p>
                            <div className="pt-4 border-t border-gray-50 flex justify-between items-center">
                               <div className="flex flex-col">
                                 <span className="text-[10px] font-black uppercase text-gray-900">{msg.user}</span>
                                 <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">{msg.district} Voter</span>
                               </div>
                               <i className="fa-solid fa-quote-right text-gray-100 text-xl"></i>
                            </div>
                          </div>
                          
                          {/* OFFICIAL RESPONSE TAG */}
                          {msg.response ? (
                            <div className="ml-12 bg-blue-50/50 p-6 rounded-[2rem] border-l-4 border-blue-400 relative">
                               <div className="flex items-center gap-2 mb-2">
                                 <span className="bg-blue-600 text-white text-[7px] font-black uppercase px-2 py-0.5 rounded-full">Official Response</span>
                                 <span className="text-[8px] font-black text-blue-900 uppercase tracking-tighter">{msg.response.author}</span>
                               </div>
                               <p className="text-blue-800 text-xs font-medium leading-snug">"{msg.response.text}"</p>
                               <span className="absolute bottom-2 right-4 text-[7px] font-bold text-blue-300 uppercase">{msg.response.date}</span>
                            </div>
                          ) : (
                            <div className="ml-12 border-l-2 border-gray-100 pl-4 py-2">
                              <span className="text-[8px] font-black text-gray-300 uppercase tracking-[0.2em] italic">Awaiting Official Response...</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {!user && (
                      <div className="absolute inset-0 flex items-center justify-center z-20">
                        <div className="bg-white/90 backdrop-blur-xl p-8 rounded-[3rem] shadow-2xl border border-indigo-50 text-center max-w-sm">
                          <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl shadow-inner">
                            <i className="fa-solid fa-user-shield"></i>
                          </div>
                          <h3 className="text-xl font-black mb-2 text-gray-800 uppercase tracking-tighter">Verified Conversation</h3>
                          <p className="text-gray-500 text-xs mb-6">Only registered County voters can view or post to the County Message Board.</p>
                          <button onClick={() => setCurrentPage('signup')} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all">Join the Registry</button>
                        </div>
                      </div>
                    )}
                  </div>
                </section>
             </div>
          </div>
        )}

        {(currentPage === 'signup' || currentPage === 'login') && (
          <div className="max-w-lg mx-auto w-full">
            <div className="flex gap-2 mb-4 bg-gray-100 p-1.5 rounded-2xl">
              <button onClick={() => setCurrentPage('signup')} className={`flex-1 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition ${currentPage === 'signup' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400'}`}>1. Register</button>
              <button onClick={() => setCurrentPage('login')} className={`flex-1 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition ${currentPage === 'login' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400'}`}>2. Login</button>
            </div>
            {currentPage === 'signup' ? (
              <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100">
                <h2 className="text-2xl font-black text-center mb-6 text-gray-900 uppercase tracking-tighter text-indigo-600">County Voter Registry</h2>
                <form className="space-y-4" onSubmit={handleSignup}>
                  <div className="grid grid-cols-2 gap-3">
                    <input name="lastName" required placeholder="LAST NAME" className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold uppercase text-xs" />
                    <input name="voterId" required placeholder="VOTER ID #" className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-xs" />
                  </div>
                  <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 grid grid-cols-2 gap-3">
                    <input type="date" name="dob" className="w-full p-2 bg-white rounded-lg text-[10px] font-bold" />
                    <input name="address" placeholder="STREET ADDRESS" className="w-full p-2 bg-white rounded-lg text-[10px] font-bold uppercase" />
                  </div>
                  <input type="email" name="email" required placeholder="Email Address" className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-xs" />
                  <input type="password" name="password" required placeholder="Password" className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-xs" />
                  <button disabled={isVerifying} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black text-sm uppercase shadow-lg hover:bg-indigo-700 transition-all">
                    {isVerifying ? 'Verifying...' : 'Register'}
                  </button>
                </form>
              </div>
            ) : (
              <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100">
                <h2 className="text-2xl font-black text-center mb-6 text-gray-900 uppercase tracking-tighter text-indigo-600">Verified Login</h2>
                <form className="space-y-3" onSubmit={handleLogin}>
                  <input name="email" type="email" placeholder="Email Address" required className="w-full p-4 bg-gray-50 rounded-xl outline-none font-bold text-sm" />
                  <input name="password" type="password" placeholder="Password" required className="w-full p-4 bg-gray-50 rounded-xl outline-none font-bold text-sm" />
                  <button className="w-full bg-indigo-600 text-white py-4 rounded-xl font-black text-sm uppercase shadow-lg hover:bg-indigo-700 transition-all">Sign In</button>
                </form>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-gray-100 py-3 px-6 text-center shrink-0">
        <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.3em]">© 2024 transparency portal • County verified engagement</p>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  );
}
