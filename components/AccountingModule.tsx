import React, { useState } from 'react';
import { useData } from './DataContext';
import { Landmark, CreditCard, Building2, Copy, CheckCircle2, ShieldCheck, ArrowUpRight, ShieldAlert, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { BankLedger } from './BankLedger';
import { PartyStatement } from './PartyStatement';

export const AccountingModule: React.FC = () => {
  const { bankDetailsList, addNotification } = useData();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeView, setActiveView] = useState<'accounts' | 'statements'>('accounts');

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    addNotification('Copied', 'Details copied to clipboard', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getGradientForBank = (index: number) => {
    const gradients = [
      'bg-gradient-to-br from-slate-800 via-slate-900 to-black',
      'bg-gradient-to-br from-emerald-800 via-emerald-900 to-slate-900',
      'bg-gradient-to-br from-indigo-800 via-indigo-900 to-slate-900',
      'bg-gradient-to-br from-blue-800 via-blue-900 to-slate-900',
      'bg-gradient-to-br from-rose-800 via-rose-900 to-black',
    ];
    return gradients[index % gradients.length];
  };

  return (
    <div className="flex h-full bg-slate-50 dark:bg-slate-950 font-sans">
      <aside className={`${isSidebarOpen ? 'w-52' : 'w-16'} shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col overflow-y-auto transition-all duration-300 relative`}>
        <div className="flex justify-end p-2 border-b border-slate-100 dark:border-slate-800">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">
            {isSidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>
        <div>
          {isSidebarOpen && <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-4 pt-5 pb-2">BANKING</p>}
          <button 
            onClick={() => { setActiveView('accounts'); setSelectedBankId(null); }} 
            className={`w-full flex items-center ${isSidebarOpen ? 'justify-between px-4' : 'justify-center'} py-3 text-[11px] font-semibold transition-all group ${activeView === 'accounts' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-r-2 border-emerald-500' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
          >
            <span className="flex items-center gap-2">
              <span className={activeView === 'accounts' ? 'text-emerald-600 dark:text-emerald-400' : ''}><Landmark size={isSidebarOpen ? 13 : 18} /></span>
              {isSidebarOpen && "Bank Accounts"}
            </span>
          </button>
          
          {isSidebarOpen && <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-4 pt-5 pb-2">REPORTS</p>}
          <button 
            onClick={() => { setActiveView('statements'); setSelectedBankId(null); }} 
            className={`w-full flex items-center ${isSidebarOpen ? 'justify-between px-4' : 'justify-center'} py-3 text-[11px] font-semibold transition-all group ${activeView === 'statements' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-r-2 border-indigo-500' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
          >
            <span className="flex items-center gap-2">
              <span className={activeView === 'statements' ? 'text-indigo-600 dark:text-indigo-400' : ''}><FileText size={isSidebarOpen ? 13 : 18} /></span>
              {isSidebarOpen && "Statements"}
            </span>
          </button>
        </div>
      </aside>
      
      <main className="flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-slate-950 overflow-hidden relative">
          
          {activeView === 'statements' ? (
            <PartyStatement />
          ) : selectedBankId ? (
            <BankLedger bankId={selectedBankId} onBack={() => setSelectedBankId(null)} />
          ) : (
            <>
              <div className="absolute inset-0 bg-gradient-to-b from-slate-50/90 to-slate-100/95 dark:from-slate-950/90 dark:to-slate-900/95 pointer-events-none"></div>
              
              <div className="shrink-0 p-8 sm:p-12 pb-4">
                <div className="mb-12 flex justify-between items-end">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2.5 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/30">
                        <Building2 size={24} />
                      </div>
                      <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
                        Corporate Banking
                      </h1>
                    </div>
                    <p className="text-sm font-bold text-slate-500 ml-1">Secure overview of registered business accounts.</p>
                  </div>
                  
                  <div className="hidden md:flex items-center gap-4 bg-white dark:bg-slate-900 p-2 pr-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                      <ShieldCheck size={20} />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500">End-to-End Encrypted</p>
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Data Vault Active</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 xl:gap-10 max-w-5xl mx-auto w-full">
                  {bankDetailsList.length === 0 ? (
                    <div className="col-span-full py-24 flex flex-col items-center justify-center text-slate-400 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-[3rem]">
                      <ShieldAlert size={64} className="mb-6 opacity-20" />
                      <p className="text-2xl font-black tracking-tight text-slate-500 dark:text-slate-400">No Accounts Found</p>
                      <p className="text-sm font-bold mt-2">Add bank details in System Settings &gt; Banking Configuration</p>
                    </div>
                  ) : (
                    bankDetailsList.map((bank, index) => (
                      <div key={bank.id} className="relative group perspective-1000" onClick={() => setSelectedBankId(bank.id)}>
                        <div className={`relative w-full rounded-3xl p-6 xl:p-8 text-white overflow-hidden shadow-2xl transition-all duration-500 transform group-hover:-translate-y-2 group-hover:shadow-3xl ${getGradientForBank(index)} aspect-[1.6/1] flex flex-col justify-between`}>
                          
                          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                          <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500 opacity-10 rounded-full blur-2xl translate-y-1/3 -translate-x-1/4"></div>
                          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>

                          <div className="flex justify-between items-start relative z-10">
                            <div>
                              <h3 className="text-xl font-black tracking-tight leading-none mb-1 text-white/90 drop-shadow-md">{bank.bankName}</h3>
                              {bank.isDefault && (
                                 <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-widest bg-white/20 text-white px-2 py-0.5 rounded backdrop-blur-md border border-white/10">
                                    <CheckCircle2 size={10} /> Default
                                 </span>
                              )}
                            </div>
                            <CreditCard className="opacity-40 text-white" size={32} />
                          </div>

                          <div className="w-14 h-10 rounded-lg bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 opacity-90 relative overflow-hidden shadow-inner flex items-center justify-center mt-2">
                              <div className="absolute inset-0 border border-white/30 rounded-lg"></div>
                              <div className="w-full h-[1px] bg-white/30"></div>
                              <div className="absolute w-[1px] h-full bg-white/30"></div>
                          </div>

                          <div className="relative z-10 group/copy cursor-pointer my-4" onClick={(e) => { e.stopPropagation(); handleCopy(bank.accountNo, bank.id + 'acc'); }}>
                            <div className="flex items-center justify-between">
                               <div className="font-mono text-lg xl:text-xl tracking-[0.15em] text-white/90 drop-shadow-sm font-medium">
                                  {bank.accountNo.replace(/(.{4})/g, '$1 ').trim()}
                               </div>
                               <div className="opacity-0 group-hover/copy:opacity-100 transition-opacity p-2 bg-white/10 rounded-xl backdrop-blur-sm">
                                  {copiedId === bank.id + 'acc' ? <CheckCircle2 size={16} className="text-emerald-400" /> : <Copy size={16} className="text-white/70" />}
                               </div>
                            </div>
                          </div>

                          <div className="flex justify-between items-end relative z-10 pt-4 mt-auto border-t border-white/10">
                            <div>
                              <p className="text-[7px] font-black uppercase tracking-[0.2em] text-white/50 mb-0.5">Account Type</p>
                              <p className="text-xs font-bold tracking-wider text-white/90">{bank.accountType || 'Current'}</p>
                            </div>
                            <div className="text-right group/ifsc cursor-pointer" onClick={(e) => { e.stopPropagation(); handleCopy(bank.branchIfsc, bank.id + 'ifsc'); }}>
                              <p className="text-[7px] font-black uppercase tracking-[0.2em] text-white/50 mb-0.5 flex items-center justify-end gap-1">
                                IFSC / Routing 
                                {copiedId === bank.id + 'ifsc' ? <CheckCircle2 size={8} className="text-emerald-400" /> : <Copy size={8} className="opacity-0 group-hover/ifsc:opacity-100 transition-opacity" />}
                              </p>
                              <p className="text-xs font-bold font-mono tracking-wider text-white/90">{bank.branchIfsc}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
      </main>
    </div>
  );
};
