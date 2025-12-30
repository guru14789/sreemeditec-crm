
import React, { useState } from 'react';
import { Lead, LeadStatus, FollowUp } from '../types';
import { Mail, Phone, Plus, Wand2, RefreshCw, ShoppingBag, Globe, DownloadCloud, Box, CreditCard, MapPin, Printer, ArrowUpRight, User, Calendar, CheckSquare, MessageSquare, Clock, X, Save, UserPlus } from 'lucide-react';
import { generateEmailDraft } from '../geminiService';
import { useData } from './DataContext';

export const LeadsModule: React.FC = () => {
  const { leads, addLead, updateLead, addNotification } = useData();
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [emailDraft, setEmailDraft] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'followup'>('details');

  const [newFollowUp, setNewFollowUp] = useState<Partial<FollowUp>>({ type: 'Call', date: new Date().toISOString().split('T')[0] });
  const [showAddFollowUp, setShowAddFollowUp] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newLeadData, setNewLeadData] = useState<Partial<Lead>>({
      source: 'Website',
      status: LeadStatus.NEW,
      value: 0
  });

  const handleDraftEmail = async (lead: Lead) => {
    setEmailDraft('');
    setIsGenerating(true);
    let tone = lead.source === 'Amazon' || lead.source === 'Flipkart' ? "Transactional" : "Professional";
    const draft = await generateEmailDraft(lead.name, lead.productInterest, tone);
    setEmailDraft(draft);
    setIsGenerating(false);
  };

  const handleSyncLeads = () => {
    setIsSyncing(true);
    setTimeout(() => {
        const today = new Date().toISOString().split('T')[0];
        const newIncomingLead: Lead = { 
            id: `ORD-AMZ-${Date.now()}`, 
            name: 'MediCare Supplies', 
            hospital: 'Online Order', 
            source: 'Amazon', 
            status: LeadStatus.NEW, 
            value: 850, 
            lastContact: today, 
            productInterest: 'Digital Thermometer (Bulk)',
            phone: '+91 88800 11223',
            email: 'orders@medicare.com',
            address: 'Tech Park, Hyderabad',
            followUps: []
        };
        addLead(newIncomingLead);
        addNotification('Cloud Sync', `Imported new orders from Amazon.`, 'success');
        setIsSyncing(false);
    }, 1200);
  };

  const handleAddFollowUp = () => {
    if (!selectedLead || !newFollowUp.date || !newFollowUp.notes) return;
    const followUp: FollowUp = {
        id: `FU-${Date.now()}`,
        date: newFollowUp.date,
        type: newFollowUp.type as any,
        notes: newFollowUp.notes,
        status: 'Pending'
    };
    const updatedFollowUps = [...(selectedLead.followUps || []), followUp];
    updateLead(selectedLead.id, { followUps: updatedFollowUps });
    setShowAddFollowUp(false);
    setNewFollowUp({ type: 'Call', date: new Date().toISOString().split('T')[0], notes: '' });
    addNotification('Task Logged', `Follow-up set for ${selectedLead.name}.`, 'info');
  };

  const toggleFollowUpStatus = (leadId: string, fuId: string) => {
      const lead = leads.find(l => l.id === leadId);
      if (!lead) return;
      const updated = lead.followUps?.map(f => f.id === fuId ? { ...f, status: f.status === 'Pending' ? 'Completed' : 'Pending' } as FollowUp : f);
      updateLead(leadId, { followUps: updated });
  };

  const handleSaveNewLead = () => {
      if (!newLeadData.name || !newLeadData.hospital) {
          alert("Fill Name and Hospital.");
          return;
      }
      const leadToAdd: Lead = {
          id: `L-${Date.now()}`,
          name: newLeadData.name!,
          hospital: newLeadData.hospital!,
          source: (newLeadData.source as any) || 'Website',
          status: (newLeadData.status as any) || LeadStatus.NEW,
          value: Number(newLeadData.value) || 0,
          lastContact: new Date().toISOString().split('T')[0],
          productInterest: newLeadData.productInterest || '',
          phone: newLeadData.phone,
          email: newLeadData.email,
          address: newLeadData.address,
          followUps: []
      };
      addLead(leadToAdd);
      setShowAddModal(false);
      setNewLeadData({ source: 'Website', status: LeadStatus.NEW, value: 0 });
  };

  const getNextFollowUp = (lead: Lead) => {
      if (!lead.followUps || lead.followUps.length === 0) return null;
      const pending = lead.followUps.filter(f => f.status === 'Pending').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      return pending.length > 0 ? pending[0] : null;
  };

  return (
    <div className="h-full flex flex-col gap-6 overflow-y-auto lg:overflow-hidden p-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex gap-3">
            <button onClick={handleSyncLeads} disabled={isSyncing} className="bg-slate-50 border border-slate-200 text-slate-700 hover:text-medical-600 px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm flex items-center gap-2">
                <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} /> 
                {isSyncing ? 'Syncing...' : 'Sync Cloud'}
            </button>
          </div>
          <button onClick={() => setShowAddModal(true)} className="bg-medical-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-medical-500/30 flex items-center gap-2 hover:bg-medical-700 transition-all">
            <Plus size={18} /> Add Lead
          </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 lg:overflow-hidden lg:min-h-0">
        <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden min-h-[400px]">
            <div className="overflow-x-auto flex-1 custom-scrollbar">
                <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50/80 border-b border-slate-100 text-[10px] uppercase font-bold text-slate-500 sticky top-0 z-10 backdrop-blur-sm">
                        <tr><th className="px-6 py-4">Lead / Hospital</th><th className="px-6 py-4">Source</th><th className="px-6 py-4">Interest</th><th className="px-6 py-4">Next Action</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Action</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {leads.map((lead) => (
                            <tr key={lead.id} onClick={() => setSelectedLead(lead)} className={`cursor-pointer transition-all ${selectedLead?.id === lead.id ? 'bg-medical-50/60 border-l-4 border-medical-500' : 'hover:bg-slate-50 border-l-4 border-transparent'}`}>
                                <td className="px-6 py-4"><div className="font-bold text-slate-800">{lead.name}</div><div className="text-[10px] text-slate-400 font-bold mt-0.5">{lead.hospital}</div></td>
                                <td className="px-6 py-4"><span className="text-[10px] font-black uppercase tracking-wider text-indigo-600">{lead.source}</span></td>
                                <td className="px-6 py-4 truncate max-w-[150px] font-medium">{lead.productInterest}</td>
                                <td className="px-6 py-4">
                                    {getNextFollowUp(lead) ? (
                                        <div className="flex items-center gap-2 text-[10px] font-bold px-2 py-1 rounded-lg bg-blue-50 text-blue-600 w-fit">
                                            <Calendar size={12} /> {getNextFollowUp(lead)?.type} {getNextFollowUp(lead)?.date}
                                        </div>
                                    ) : <span className="text-[10px] text-slate-300 font-bold">---</span>}
                                </td>
                                <td className="px-6 py-4"><span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${lead.status === 'Won' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>{lead.status}</span></td>
                                <td className="px-6 py-4 text-right"><ArrowUpRight size={18} className="text-slate-300 ml-auto" /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        {selectedLead && (
            <div className="w-full lg:w-[420px] bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col shrink-0 overflow-hidden animate-in slide-in-from-right-4 duration-300">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex justify-between items-start mb-4">
                        <div><h3 className="font-black text-xl text-slate-800 uppercase tracking-tight">{selectedLead.name}</h3><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedLead.hospital}</p></div>
                        <button onClick={() => setSelectedLead(null)}><X size={24} className="text-slate-400 hover:text-slate-600"/></button>
                    </div>
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button onClick={() => setActiveTab('details')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${activeTab === 'details' ? 'bg-white text-medical-700 shadow-sm' : 'text-slate-500'}`}>Overview</button>
                        <button onClick={() => setActiveTab('followup')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${activeTab === 'followup' ? 'bg-white text-medical-700 shadow-sm' : 'text-slate-500'}`}>Follow-ups</button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {activeTab === 'details' ? (
                        <div className="space-y-6">
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Phone size={12}/> Contact Profile</h4>
                                <div className="text-sm font-bold text-slate-700">{selectedLead.phone || 'No Phone'}</div>
                                <div className="text-sm font-bold text-slate-700">{selectedLead.email || 'No Email'}</div>
                                <div className="text-xs text-slate-500 leading-relaxed italic">{selectedLead.address || 'No Address indexed'}</div>
                            </div>
                            <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                                <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2"><Box size={12}/> Item Interest</h4>
                                <p className="font-black text-slate-800 mt-2">{selectedLead.productInterest}</p>
                                <p className="text-xs font-bold text-indigo-600 mt-1">Est. Value: ₹{selectedLead.value.toLocaleString()}</p>
                            </div>
                            <button onClick={() => handleDraftEmail(selectedLead)} disabled={isGenerating} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:text-medical-600 hover:bg-medical-50 flex items-center justify-center gap-3 transition-all">
                                {isGenerating ? <RefreshCw size={20} className="animate-spin" /> : <Wand2 size={20} />}
                                <span className="text-[10px] font-black uppercase tracking-widest">Generate Sales Pitch</span>
                            </button>
                            {emailDraft && (
                                <div className="bg-white border border-slate-200 p-4 rounded-2xl animate-in zoom-in-95">
                                    <pre className="whitespace-pre-wrap font-sans text-xs text-slate-600 leading-relaxed mb-4">{emailDraft}</pre>
                                    <button className="w-full bg-slate-800 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest">Copy to Clipboard</button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <button onClick={() => setShowAddFollowUp(!showAddFollowUp)} className="w-full bg-slate-50 border border-slate-200 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-100 transition-all">
                                <Plus size={16}/> Schedule Touchpoint
                            </button>
                            {showAddFollowUp && (
                                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xl space-y-4 animate-in slide-in-from-top-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <select className="w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 text-[10px] font-black uppercase" value={newFollowUp.type} onChange={e => setNewFollowUp({...newFollowUp, type: e.target.value as any})}><option>Call</option><option>Meeting</option><option>WhatsApp</option></select>
                                        <input type="date" className="w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 text-[10px] font-black uppercase" value={newFollowUp.date} onChange={e => setNewFollowUp({...newFollowUp, date: e.target.value})} />
                                    </div>
                                    <textarea className="w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 text-[10px] font-bold" rows={2} placeholder="Notes..." value={newFollowUp.notes || ''} onChange={e => setNewFollowUp({...newFollowUp, notes: e.target.value})} />
                                    <button onClick={handleAddFollowUp} className="w-full bg-medical-600 text-white py-2 rounded-xl text-[10px] font-black uppercase">Commit Reminder</button>
                                </div>
                            )}
                            <div className="space-y-4">
                                {selectedLead.followUps?.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(fu => (
                                    <div key={fu.id} className={`p-4 rounded-2xl border ${fu.status === 'Completed' ? 'bg-slate-50 opacity-60' : 'bg-white border-slate-200 shadow-sm'}`}>
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-[10px] font-black uppercase text-indigo-600">{fu.type}</span>
                                            <span className="text-[9px] font-bold text-slate-400">{fu.date}</span>
                                        </div>
                                        <p className="text-xs font-medium text-slate-700">{fu.notes}</p>
                                        <button onClick={() => toggleFollowUpStatus(selectedLead.id, fu.id)} className="mt-3 text-[9px] font-black uppercase text-medical-600 flex items-center gap-1">
                                            {fu.status === 'Pending' ? <><CheckSquare size={10}/> Mark Done</> : <><RefreshCw size={10}/> Reopen</>}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}
      </div>

      {showAddModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white rounded-[2rem] shadow-2xl max-w-lg w-full overflow-hidden scale-100 animate-in zoom-in-95">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                      <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Manual Lead Intake</h3>
                      <button onClick={() => setShowAddModal(false)}><X size={24} className="text-slate-400"/></button>
                  </div>
                  <div className="p-6 space-y-5">
                      <input type="text" className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm font-bold" placeholder="Lead Name *" value={newLeadData.name || ''} onChange={e => setNewLeadData({...newLeadData, name: e.target.value})} />
                      <input type="text" className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm font-bold" placeholder="Hospital / Company *" value={newLeadData.hospital || ''} onChange={e => setNewLeadData({...newLeadData, hospital: e.target.value})} />
                      <div className="grid grid-cols-2 gap-4">
                          <input type="text" className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm font-bold" placeholder="Interest" value={newLeadData.productInterest || ''} onChange={e => setNewLeadData({...newLeadData, productInterest: e.target.value})} />
                          <input type="number" className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm font-bold" placeholder="Value" value={newLeadData.value || ''} onChange={e => setNewLeadData({...newLeadData, value: Number(e.target.value)})} />
                      </div>
                  </div>
                  <div className="p-6 border-t border-slate-100 flex gap-3">
                      <button onClick={() => setShowAddModal(false)} className="flex-1 bg-slate-100 py-3 rounded-xl text-[10px] font-black uppercase">Cancel</button>
                      <button onClick={handleSaveNewLead} className="flex-1 bg-medical-600 text-white py-3 rounded-xl text-[10px] font-black uppercase shadow-lg">Save Cloud Record</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
