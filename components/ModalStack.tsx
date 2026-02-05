import React from 'react';
import { UserAvatar } from './UserAvatar';
import DateOfBirthInput from './DateOfBirthInput'; 

interface ModalStackProps {
  notFoundModal: boolean;
  setNotFoundModal: (val: boolean) => void;
  isSubmittingRequest: boolean;
  setIsSubmittingRequest: (val: boolean) => void;
  supabase: any;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  setIsVerifying: (val: boolean) => void;
  profile: any;
  fetchManualRequests: () => void;
  showPollLoginModal: boolean;
  setShowPollLoginModal: (val: boolean) => void;
  setCurrentPage: (page: string) => void;
  showContactModal: boolean;
  setShowContactModal: (val: boolean) => void;
  isSubmittingContact: boolean;
  setIsSubmittingContact: (val: boolean) => void;
  fetchContactSubmissions: () => void;
}

const ModalStack: React.FC<ModalStackProps> = ({
  notFoundModal, setNotFoundModal,
  isSubmittingRequest, setIsSubmittingRequest,
  supabase, showToast, setIsVerifying,
  profile, fetchManualRequests,
  showPollLoginModal, setShowPollLoginModal,
  setCurrentPage,
  showContactModal, setShowContactModal,
  isSubmittingContact, setIsSubmittingContact,
  fetchContactSubmissions
}) => {
  return (
    <>
      {/* --- VOTER NOT FOUND / MANUAL REQUEST MODAL --- */}
      {notFoundModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[400] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden animate-slide-up">
            <div className="p-10 text-center space-y-6">
              <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto border-4 border-dashed border-amber-100">
                <i className="fa-solid fa-user-magnifying-glass text-3xl"></i>
              </div>
              <div className="space-y-4">
                <h3 className="text-2xl font-black uppercase text-gray-900">Information Not Found</h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  We're sorry. Your information was not found in our current copy of the voter registry. 
                  This application is maintained by an all volunteer group of Moore County citizens and we have to manually update the voter registry.
                </p>
                <p className="text-indigo-600 font-black uppercase text-[10px] tracking-widest bg-indigo-50 py-3 rounded-2xl">
                  Send us your contact information and we'll be happy to get you full access. You'll receive an email confirmation once we have verified that you are registered to vote in Moore County, TN.
                </p>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                setIsSubmittingRequest(true);
                const fd = new FormData(e.currentTarget);
                const { error } = await supabase!.from('manual_access_requests').insert({
                  first_name: fd.get('fname'),
                  last_name: fd.get('lname'),
                  dob: fd.get('dob'),
                  ssn_last_four: fd.get('ssn'),
                  email: fd.get('email'),
                  status: 'Pending'
                });
                if (error) {
                  showToast(error.message, 'error');
                } else {
                  showToast("Verification Request Sent Successfully");
                  setNotFoundModal(false);
                  setIsVerifying(false);
                  if (profile?.is_admin) fetchManualRequests();
                }
                setIsSubmittingRequest(false);
              }} className="grid grid-cols-2 gap-4 text-left">
                <div className="space-y-1">
                  <label className="text-[18.66px] font-black uppercase text-gray-400 ml-2">First Name</label>
                  <input name="fname" required className="w-full p-4 bg-gray-50 rounded-xl border border-gray-100 text-[18.66px] font-bold outline-none focus:ring-2 ring-indigo-500/20" />
                </div>
                <div className="space-y-1">
                  <label className="text-[14px] font-black uppercase text-gray-400 ml-2">Last Name</label>
                  <input name="lname" required className="w-full p-4 bg-gray-50 rounded-xl border border-gray-100 text-[18.66px] font-bold outline-none focus:ring-2 ring-indigo-500/20" />
                </div>
                <div className="space-y-1">
                  <label className="text-[14px] font-black uppercase text-gray-400 ml-2">Date of Birth</label>
                  <DateOfBirthInput name="dob" required className="w-full p-4 bg-gray-50 rounded-xl border border-gray-100 text-[18.66px] font-bold outline-none focus:ring-2 ring-indigo-500/20" />
                </div>
                <div className="space-y-1">
                  <label className="text-[14px] font-black uppercase text-gray-400 ml-2">Last 4 SSN</label>
                  <input name="ssn" maxLength={4} pattern="\d{4}" placeholder="0000" required className="w-full p-4 bg-gray-50 rounded-xl border border-gray-100 text-[18.66px] font-bold outline-none focus:ring-2 ring-indigo-500/20" />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-[14px] font-black uppercase text-gray-400 ml-2">Email Address</label>
                  <input name="email" type="email" required className="w-full p-4 bg-gray-50 rounded-xl border border-gray-100 text-[18.66px] font-bold outline-none focus:ring-2 ring-indigo-500/20" />
                </div>
                <div className="col-span-2 pt-4 flex gap-3">
                  <button type="submit" disabled={isSubmittingRequest} className="flex-grow py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl shadow-indigo-100">
                    {isSubmittingRequest ? <i className="fa-solid fa-spinner animate-spin"></i> : "Send Request"}
                  </button>
                  <button type="button" onClick={() => setNotFoundModal(false)} className="px-8 py-5 bg-gray-100 text-gray-400 rounded-2xl font-black uppercase text-xs">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* --- CONTACT US MODAL --- */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[400] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden animate-slide-up">
            <div className="p-10 text-center space-y-6">
              <div className="w-20 h-20 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto border-4 border-dashed border-indigo-100">
                <i className="fa-solid fa-envelope text-3xl"></i>
              </div>
              <div className="space-y-4">
                <h3 className="text-2xl font-black uppercase text-gray-900">Contact Us</h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Have a question or feedback? Send us a message and we&apos;ll get back to you.
                </p>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                setIsSubmittingContact(true);
                const fd = new FormData(e.currentTarget);
                const { error } = await supabase!.from('contact_submissions').insert({
                  name: fd.get('name'),
                  subject: fd.get('subject'),
                  comment: fd.get('comment'),
                  email: (fd.get('email') as string)?.trim() || null,
                  phone: (fd.get('phone') as string)?.trim() || null
                });
                if (error) {
                  showToast(error.message, 'error');
                } else {
                  showToast("Message sent successfully");
                  setShowContactModal(false);
                  if (profile?.is_admin) fetchContactSubmissions();
                }
                setIsSubmittingContact(false);
              }} className="space-y-4 text-left">
                <div className="space-y-1">
                  <label className="text-[18.66px] font-black uppercase text-gray-400 ml-2">Name</label>
                  <input name="name" required className="w-full p-4 bg-gray-50 rounded-xl border border-gray-100 text-[18.66px] font-bold outline-none focus:ring-2 ring-indigo-500/20" placeholder="Your name" />
                </div>
                <div className="space-y-1">
                  <label className="text-[18.66px] font-black uppercase text-gray-400 ml-2">Subject</label>
                  <input name="subject" required className="w-full p-4 bg-gray-50 rounded-xl border border-gray-100 text-[18.66px] font-bold outline-none focus:ring-2 ring-indigo-500/20" placeholder="Subject of your message" />
                </div>
                <div className="space-y-1">
                  <label className="text-[18.66px] font-black uppercase text-gray-400 ml-2">Comment</label>
                  <textarea name="comment" required rows={4} className="w-full p-4 bg-gray-50 rounded-xl border border-gray-100 text-[18.66px] font-bold outline-none focus:ring-2 ring-indigo-500/20" placeholder="Your message..." />
                </div>
                <div className="space-y-1">
                  <label className="text-[14px] font-black uppercase text-gray-400 ml-2">Email <span className="text-gray-300 font-normal">(optional)</span></label>
                  <input name="email" type="email" className="w-full p-4 bg-gray-50 rounded-xl border border-gray-100 text-[18.66px] font-bold outline-none focus:ring-2 ring-indigo-500/20" placeholder="your@email.com" />
                </div>
                <div className="space-y-1">
                  <label className="text-[14px] font-black uppercase text-gray-400 ml-2">Phone <span className="text-gray-300 font-normal">(optional)</span></label>
                  <input name="phone" type="tel" className="w-full p-4 bg-gray-50 rounded-xl border border-gray-100 text-[18.66px] font-bold outline-none focus:ring-2 ring-indigo-500/20" placeholder="(555) 123-4567" />
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="submit" disabled={isSubmittingContact} className="flex-grow py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl shadow-indigo-100">
                    {isSubmittingContact ? <i className="fa-solid fa-spinner animate-spin"></i> : "Send"}
                  </button>
                  <button type="button" onClick={() => setShowContactModal(false)} className="px-8 py-5 bg-gray-100 text-gray-400 rounded-2xl font-black uppercase text-xs">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* --- POLL LOGIN REDIRECT MODAL --- */}
      {showPollLoginModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[300] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-10 text-center relative animate-slide-up">
            <button onClick={() => setShowPollLoginModal(false)} className="absolute top-6 right-6 text-gray-300 hover:text-red-500 transition-colors">
              <i className="fa-solid fa-circle-xmark text-2xl"></i>
            </button>
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-200 text-3xl border-4 border-dashed border-gray-100">
              <i className="fa-solid fa-lock"></i>
            </div>
            <h3 className="text-xl font-black uppercase text-gray-900 mb-2">Verification Required</h3>
            <p className="text-gray-400 font-bold uppercase text-[10px] mb-8 tracking-widest leading-relaxed px-4">
              You must be a verified Moore County voter to participate in community polls.
            </p>
            <div className="space-y-3">
              <button 
                onClick={() => { setShowPollLoginModal(false); setCurrentPage('login'); }}
                className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl shadow-indigo-100 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Login to Vote
              </button>
              <button 
                onClick={() => { setShowPollLoginModal(false); setCurrentPage('signup'); }}
                className="w-full py-2 text-gray-400 font-black uppercase text-[10px] hover:text-indigo-600 transition-colors"
              >
                Register as a Voter
              </button>
            </div>
          </div>
        </div>
      )}

      </>
  );
};

export default ModalStack;