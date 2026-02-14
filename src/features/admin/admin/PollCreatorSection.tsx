import React from 'react';

interface PollCreatorSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  stagedPollFiles: any[];
  setStagedPollFiles: React.Dispatch<React.SetStateAction<any[]>>;
  isUploading: boolean;
  handlePollFileUpload: (files: FileList) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  fetchPolls: () => void;
  supabase: any;
}

export const PollCreatorSection: React.FC<PollCreatorSectionProps> = ({
  isOpen, onToggle, stagedPollFiles, setStagedPollFiles, isUploading,
  handlePollFileUpload, showToast, fetchPolls, supabase
}) => (
  <section className="bg-white rounded-[2.5rem] shadow-xl border-4 border-indigo-600 overflow-hidden transition-all">
    <button
      onClick={onToggle}
      className="w-full p-8 flex justify-between items-center hover:bg-indigo-50 transition-colors"
    >
      <div className="text-left">
        <h2 className="text-2xl font-black uppercase tracking-tighter">Create New Poll</h2>
        <p className="text-indigo-600 font-bold text-[9px] uppercase tracking-widest">Publish community decision points</p>
      </div>
      <i className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'} text-indigo-600 text-xl`}></i>
    </button>

    {isOpen && (
      <div className="p-10 pt-0 border-t border-indigo-50">
        <div className="mb-8 mt-8">
          <h2 className="text-4xl font-black uppercase tracking-tighter text-gray-900">Create New Poll</h2>
          <p className="text-indigo-600 font-black text-[18.66px] uppercase tracking-[0.2em]">Publish a new community decision point</p>
        </div>

        <form onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const options = [fd.get('opt1'), fd.get('opt2'), fd.get('opt3'), fd.get('opt4')].filter(o => o && o.toString().trim() !== "");

          if (options.length < 2) return showToast("Provide at least 2 options", "error");

          try {
            const attachmentUrls = stagedPollFiles.map(f => f.url);

            showToast("Publishing Poll...", "success");
            const expiryDate = new Date(fd.get('expires') as string).toISOString();
            const { data: poll, error: pErr } = await supabase!.from('polls').insert({
              title: fd.get('title'),
              description: fd.get('description'),
              attachments: attachmentUrls,
              expires_at: expiryDate,
              closed_at: expiryDate
            }).select().single();

            if (pErr) throw pErr;

            const optData = options.map(text => ({ poll_id: poll.id, text }));
            const { error: oErr } = await supabase!.from('poll_options').insert(optData);

            if (oErr) throw oErr;

            showToast("Poll Published Successfully!");
            setStagedPollFiles([]);
            (e.target as HTMLFormElement).reset();
            fetchPolls();
          } catch (err: any) {
            showToast(err.message, "error");
          }
        }} className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[18.66px] font-black uppercase text-gray-400 ml-2">Poll Question / Title</label>
                <input name="title" required placeholder="Ex: Proposed Rezoning of District 2" className="w-full p-6 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-indigo-600 outline-none font-black text-[18.66px] transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-[18.66px] font-black uppercase text-gray-400 ml-2">Expiration Date</label>
                <input name="expires" type="datetime-local" required className="w-full p-6 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-indigo-600 outline-none font-black text-[18.66px] transition-all" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[18.66px] font-black uppercase text-gray-400 ml-2">Context / Description</label>
              <textarea name="description" placeholder="Provide background information, links, or context for this poll..." className="w-full p-8 bg-gray-50 rounded-[2.5rem] border-2 border-transparent focus:border-indigo-600 outline-none font-medium text-[18.66px] min-h-[200px] transition-all leading-relaxed" />
            </div>

            <div className="space-y-4">
              <div className="bg-indigo-50 p-6 rounded-[2rem] border-2 border-dashed border-indigo-200">
                <label className="flex items-center gap-4 cursor-pointer">
                  <div className="bg-indigo-600 text-white w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg">
                    <i className={`fa-solid ${isUploading ? 'fa-spinner animate-spin' : 'fa-cloud-arrow-up'}`}></i>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase text-indigo-900">Upload Supporting Documents</span>
                    <span className="text-[9px] font-bold text-indigo-400 uppercase">Photos, PDFs, or site plans</span>
                  </div>
                  <input type="file" onChange={(e) => e.target.files && handlePollFileUpload(e.target.files)} multiple className="hidden" />
                </label>
              </div>

              {stagedPollFiles.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-[2rem]">
                  {stagedPollFiles.map((file, idx) => (
                    <div key={idx} className="relative group bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
                      <button
                        type="button"
                        onClick={() => setStagedPollFiles(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full text-[10px] flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      >
                        <i className="fa-solid fa-xmark"></i>
                      </button>
                      <div className="aspect-square rounded-xl bg-indigo-50 flex items-center justify-center overflow-hidden mb-2">
                        {file.name.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                          <img src={file.url} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <i className="fa-solid fa-file-pdf text-2xl text-indigo-400"></i>
                        )}
                      </div>
                      <p className="text-[8px] font-black uppercase text-gray-400 truncate px-1">{file.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[18.66px] font-black uppercase text-gray-400 ml-2">Poll Options (Min 2)</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input name="opt1" required placeholder="OPTION 1" className="p-4 bg-gray-50 rounded-xl border border-gray-100 font-bold uppercase text-[18.66px]" />
              <input name="opt2" required placeholder="OPTION 2" className="p-4 bg-gray-50 rounded-xl border border-gray-100 font-bold uppercase text-[18.66px]" />
              <input name="opt3" placeholder="OPTION 3 (OPTIONAL)" className="p-4 bg-gray-50 rounded-xl border border-gray-100 font-bold uppercase text-[18.66px]" />
              <input name="opt4" placeholder="OPTION 4 (OPTIONAL)" className="p-4 bg-gray-50 rounded-xl border border-gray-100 font-bold uppercase text-[18.66px]" />
            </div>
          </div>

          <button type="submit" className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black uppercase text-xs shadow-xl hover:bg-indigo-700 transition-all">
            Post Poll to Public Portal
          </button>
        </form>
      </div>
    )}
  </section>
);
