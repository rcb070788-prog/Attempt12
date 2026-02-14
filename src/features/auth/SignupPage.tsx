import React from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import DateOfBirthInput from '../../components/DateOfBirthInput';

interface SignupPageProps {
  supabase: SupabaseClient | null;
  isVerifying: boolean;
  setIsVerifying: (val: boolean) => void;
  setNotFoundModal: (val: boolean) => void;
  setCurrentPage: (page: string) => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

export default function SignupPage({ 
  supabase, 
  isVerifying, 
  setIsVerifying, 
  setNotFoundModal, 
  setCurrentPage, 
  showToast 
}: SignupPageProps) {

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsVerifying(true);
    const fd = new FormData(e.currentTarget);
    
    const lastName = fd.get('lastName') as string;
    const voterId = fd.get('voterId') as string;
    const dob = fd.get('dob') as string;

    if (!voterId) {
      setIsVerifying(false);
      return showToast("Voter ID is required", "error");
    }
    if (!lastName && !dob) {
      setIsVerifying(false);
      return showToast("Please provide Last Name or Date of Birth", "error");
    }

    try {
      // 1. Contact the Voter Registry Database
      const verifyRes = await fetch('/.netlify/functions/verify-voter', { 
        method: 'POST', 
        body: JSON.stringify({ lastName, voterId, dob }) 
      });
      
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        setNotFoundModal(true);
        setIsVerifying(false);
        return;
      }

      // 2. Generate Unique Virtual Email (Slug Logic)
      const [fName, ...lNameParts] = verifyData.fullName.split(' ');
      const lName = lNameParts.join('').replace(/[^a-z0-9]/gi, '');
      const bSlug = `${fName.toLowerCase()}.${lName.toLowerCase()}`;
      let finalVirtualEmail = `${bSlug}@concernedcitizensofmc.com`;

      const { data: level1 } = await supabase!.from('profiles').select('id').eq('virtual_email', finalVirtualEmail).maybeSingle();
      if (level1) {
        finalVirtualEmail = `${bSlug}.${verifyData.district}@concernedcitizensofmc.com`;
        const { data: level2 } = await supabase!.from('profiles').select('id').eq('virtual_email', finalVirtualEmail).maybeSingle();
        if (level2) {
          let counter = 1;
          let isUnique = false;
          while (!isUnique && counter < 50) {
            const testEmail = `${bSlug}.${verifyData.district}.${counter}@concernedcitizensofmc.com`;
            const { data: ex } = await supabase!.from('profiles').select('id').eq('virtual_email', testEmail).maybeSingle();
            if (!ex) { finalVirtualEmail = testEmail; isUnique = true; }
            counter++;
          }
        }
      }
      
      // 3. Register Account with Supabase
      const { error } = await supabase!.auth.signUp({ 
        email: fd.get('email') as string, 
        password: fd.get('password') as string, 
        options: { 
          data: { 
            full_name: verifyData.fullName, 
            district: verifyData.district, 
            voter_id: voterId,
            virtual_email: finalVirtualEmail
          } 
        } 
      });

      if (error) throw error;
      showToast("Verification Successful! Check email.");
      setCurrentPage('login');
    } catch (err: any) {
      const msg = err?.message ?? '';
      const isAlreadyExists =
        /already\s+(registered|exists)/i.test(msg) ||
        /that\s+email/i.test(msg) ||
        /user\s+already\s+registered/i.test(msg);
      if (isAlreadyExists) {
        try {
          const email = fd.get('email') as string;
          const recoverRes = await fetch('/.netlify/functions/recover-ghost-profile', {
            method: 'POST',
            body: JSON.stringify({ email, lastName, voterId, dob }),
          });
          const recoverData = await recoverRes.json();
          if (recoverData.action === 'profile_created') {
            showToast(
              "An account with this email already exists. We've linked your voter profile. Please log in with your password (or use Forgot Password if needed).",
              "success"
            );
            setCurrentPage('login');
            return;
          }
          if (recoverData.action === 'already_has_profile') {
            showToast("An account with this email already exists. Please log in.", "success");
            setCurrentPage('login');
            return;
          }
        } catch (_) {
          // fall through to show original error
        }
      }
      showToast(msg || "Something went wrong.", "error");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-10 bg-white p-8 md:p-12 rounded-[3rem] shadow-2xl">
      <h2 className="text-4xl md:text-3xl font-black uppercase text-indigo-600 text-center mb-2">Voter Verification</h2>
      <p className="text-sm md:text-xs font-black uppercase text-gray-400 text-center mb-10 tracking-widest">Verify identity to participate</p>
      
      <form className="space-y-6" onSubmit={handleSignup}>
        <div className="flex flex-col md:flex-row md:items-center gap-4 bg-indigo-50/30 p-2 rounded-[2rem]">
          <div className="flex-grow">
            <input 
              name="voterId" 
              required 
              placeholder="VOTER ID # (MANDATORY)" 
              className="w-full p-6 bg-white border-2 border-transparent focus:border-indigo-600 outline-none rounded-2xl font-black text-base md:text-sm shadow-sm transition-all placeholder:text-gray-300" 
            />
          </div>
          <div className="px-4 py-2 md:w-48">
            <p className="text-xs md:text-[11px] font-black uppercase text-gray-400 leading-tight">
              Don't know your Voter ID? Click <a href="https://tnmap.tn.gov/voterlookup/" target="_blank" rel="noreferrer" className="text-indigo-600 underline decoration-2 underline-offset-2">HERE</a>.
            </p>
          </div>
        </div>
        
        <div className="bg-gray-50 p-8 rounded-[2.5rem] space-y-5 border border-gray-100">
          <p className="text-xl md:text-[18.66px] font-black uppercase text-gray-400 text-center tracking-tighter">Provide Name <span className="text-indigo-600 mx-1">OR</span> Date of Birth</p>
          <input 
            name="lastName" 
            placeholder="LAST NAME" 
            className="w-full p-5 bg-white rounded-xl uppercase text-xl md:text-[18.66px] font-black border border-gray-200 focus:ring-2 ring-indigo-500/20 outline-none transition-all" 
          />
          <div className="relative">
            <span className="absolute -top-2 left-4 bg-white px-2 text-xs md:text-[10px] font-black text-indigo-400 uppercase">Date of Birth</span>
            <DateOfBirthInput
              name="dob"
              className="w-full p-5 bg-white rounded-xl text-sm md:text-xs font-black border border-gray-200 focus:ring-2 ring-indigo-500/20 outline-none transition-all"
            />
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-gray-100">
          <input 
            type="email" 
            name="email" 
            autocomplete="email"
            required 
            placeholder="EMAIL ADDRESS" 
            className="w-full p-5 bg-gray-50 rounded-xl text-sm md:text-xs font-black focus:bg-white border-2 border-transparent focus:border-gray-200 outline-none transition-all" 
          />
          <input 
            type="password" 
            name="password" 
            autocomplete="new-password"
            required 
            placeholder="CREATE PASSWORD" 
            className="w-full p-5 bg-gray-50 rounded-xl text-sm md:text-xs font-black focus:bg-white border-2 border-transparent focus:border-gray-200 outline-none transition-all" 
          />
        </div>

        <button 
          disabled={isVerifying} 
          className="w-full py-7 bg-indigo-600 text-white rounded-[2rem] font-black text-base md:text-sm uppercase shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50"
        >
          {isVerifying ? 'Verifying Registry...' : 'Verify & Register'}
        </button>
      </form>
    </div>
  );
}
