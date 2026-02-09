import React from 'react';

interface ManualRequestsSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  manualRequests: any[];
  clearedItems: string[];
  setClearedItems: React.Dispatch<React.SetStateAction<string[]>>;
  toggleClearItem: (id: string) => void;
  setPendingAction: React.Dispatch<React.SetStateAction<any>>;
  pendingAction: any;
  formatDate: (date: any) => string;
  supabase: any;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  fetchManualRequests: () => void;
}

export const ManualRequestsSection: React.FC<ManualRequestsSectionProps> = ({
  isOpen, onToggle, manualRequests, clearedItems, setClearedItems, toggleClearItem,
  setPendingAction, pendingAction, formatDate, supabase, showToast, fetchManualRequests
}) => (
  <section className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full p-8 flex justify-between items-center hover:bg-gray-50 transition-colors"
    >
      <div className="text-left flex items-center gap-4">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter leading-none">Access Requests</h2>
          <p className="text-gray-400 font-bold text-base uppercase mt-1">Manual registry verification needed</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-4 py-2 bg-gray-100 text-gray-500 rounded-full font-black text-base uppercase">
            {manualRequests.filter(r => !clearedItems.includes(r.id)).length}
          </span>
          {manualRequests.filter(r => !clearedItems.includes(r.id) && r.status === 'Pending').length > 0 && (
            <span className="px-4 py-2 bg-amber-100 text-amber-600 rounded-full font-black text-[18.66px] uppercase animate-pulse">
              {manualRequests.filter(r => !clearedItems.includes(r.id) && r.status === 'Pending').length} Pending
            </span>
          )}
          {manualRequests.filter(r => !clearedItems.includes(r.id)).length > 0 && (
            <span className="px-3 py-1 bg-red-500 text-white rounded text-base font-black animate-pulse uppercase">NEW</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4">
        {manualRequests.some(r => clearedItems.includes(r.id)) && (
          <button onClick={(e) => { e.stopPropagation(); setClearedItems(prev => prev.filter(id => !manualRequests.some(r => r.id === id))); }} className="text-base font-black text-indigo-600 uppercase underline">Restore All</button>
        )}
        <i className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'} text-gray-300 text-2xl`}></i>
      </div>
    </button>

    {isOpen && (
      <div className="border-t border-gray-50">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-100 font-black uppercase text-gray-400 text-[18.66px] tracking-tighter">
              <tr>
                <th className="p-6">Applicant</th>
                <th className="p-6">DOB</th>
                <th className="p-6">Last 4 SSN</th>
                <th className="p-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {manualRequests.filter(r => !clearedItems.includes(r.id)).map(req => (
                <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-8">
                    <p className="font-black uppercase text-[18.66px] text-gray-900 leading-none">{req.first_name} {req.last_name}</p>
                    <p className="text-[18.66px] font-bold text-gray-400 uppercase mt-1">{formatDate(req.created_at)}</p>
                  </td>
                  <td className="p-8 text-[18.66px] font-bold text-gray-500">{req.dob}</td>
                  <td className="p-8 text-[18.66px] font-mono font-bold text-gray-400">***-**-{req.ssn_last_four}</td>
                  <td className="p-8 text-right">
                    <div className="flex justify-end items-center gap-4">
                      {req.status === 'Pending' ? (
                        <>
                          <button
                            onClick={() => setPendingAction({ req, type: 'Confirm' })}
                            className="px-8 py-4 bg-green-600 text-white rounded-2xl text-[18.66px] font-black uppercase tracking-tighter hover:scale-105 transition-all shadow-md"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setPendingAction({ req, type: 'Deny' })}
                            className="px-8 py-4 bg-red-600 text-white rounded-2xl text-[18.66px] font-black uppercase tracking-tighter hover:scale-105 transition-all shadow-md"
                          >
                            Deny
                          </button>
                        </>
                      ) : (
                        <span className={`px-6 py-3 rounded-2xl text-base font-black uppercase ${req.status === 'Confirmed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {req.status}
                        </span>
                      )}
                      <button onClick={() => toggleClearItem(req.id)} className="px-6 py-3 bg-gray-100 text-gray-500 rounded-2xl text-base font-black uppercase">Clear</button>
                    </div>
                  </td>
                </tr>
              ))}
              {manualRequests.length === 0 && (
                <tr><td colSpan={4} className="p-10 text-center text-[10px] font-black uppercase text-gray-300">No pending requests</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    )}

    {pendingAction && (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[600] flex items-center justify-center p-4">
        <div className={`w-full max-w-lg bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-slide-up border-8 ${pendingAction.type === 'Confirm' ? 'border-green-500' : 'border-red-500'}`}>
          <div className="p-10 text-center space-y-8">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto text-4xl ${pendingAction.type === 'Confirm' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
              <i className={`fa-solid ${pendingAction.type === 'Confirm' ? 'fa-user-check' : 'fa-user-xmark'}`}></i>
            </div>

            <div className="space-y-4">
              <h3 className="text-3xl font-black uppercase text-gray-900 tracking-tighter">Identity Verification</h3>
              <div className="text-[18.66px] text-gray-500 font-medium leading-relaxed">
                You are about to <span className={pendingAction.type === 'Confirm' ? 'text-green-600 font-black' : 'text-red-600 font-black'}>{pendingAction.type.toUpperCase()}</span> that
                <br /><span className="text-2xl font-black text-gray-900 block my-2">"{pendingAction.req.first_name} {pendingAction.req.last_name}"</span>
                is a registered Moore County voter.
              </div>
              <p className="text-[18.66px] text-gray-400 font-black uppercase tracking-widest bg-gray-50 py-3 rounded-2xl border border-gray-100 mt-4">
                <i className="fa-solid fa-envelope-circle-check mr-2 text-indigo-600"></i>
                Email will be sent to: <br />
                <span className="text-indigo-600 lowercase">{pendingAction.req.email}</span>
              </p>
            </div>

            <div className="flex flex-col gap-3 pt-4">
              <button
                onClick={async () => {
                  const newStatus = pendingAction.type === 'Confirm' ? 'Confirmed' : 'Denied';
                  const { error } = await supabase!.from('manual_access_requests').update({ status: newStatus }).eq('id', pendingAction.req.id);
                  if (error) {
                    showToast(error.message, 'error');
                  } else {
                    let emailResult = { error: null };
                    if (pendingAction.req.email) {
                      try {
                        const fullName = `${pendingAction.req.first_name} ${pendingAction.req.last_name}`;
                        const { error: invokeError } = await supabase!.functions.invoke('send-confirmation', {
                          body: {
                            email: pendingAction.req.email,
                            fullName: fullName,
                            status: newStatus
                          }
                        });
                        if (invokeError) emailResult.error = invokeError as any;
                      } catch (emailErr: any) {
                        emailResult.error = emailErr;
                      }
                    }

                    if (emailResult.error) {
                      console.error("Email Service Error:", emailResult.error);
                      showToast(`Saved as ${newStatus}, but email failed.`, "error");
                    } else {
                      showToast(`Account ${newStatus} & User Notified`);
                    }

                    fetchManualRequests();
                  }
                  setPendingAction(null);
                }}
                className={`w-full py-6 rounded-3xl font-black uppercase text-lg shadow-xl ${pendingAction.type === 'Confirm' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}
              >
                Continue & Notify User
              </button>
              <button onClick={() => setPendingAction(null)} className="w-full py-4 text-gray-400 font-black uppercase text-[18.66px] hover:text-gray-900 transition-colors">
                Cancel Action
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
  </section>
);
