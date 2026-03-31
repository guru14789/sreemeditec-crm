import React, { useState } from 'react';
import { Lead, LeadStatus, FollowUp, TabView } from '../types';
import { Phone, Plus, Wand2, RefreshCw, Box, ArrowUpRight, Calendar, CheckSquare, X, FileText, Trash2, MoreVertical, Edit2 } from 'lucide-react';
import { generateEmailDraft } from '../geminiService';
import { useData } from './DataContext';

export const LeadsModule: React.FC<{ onNavigate?: (tab: TabView) => void }> = ({ onNavigate }) => {
    const { leads, addLead, updateLead, removeLead, addNotification, setPendingQuoteData, employees } = useData();
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [emailDraft, setEmailDraft] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [activeTab, setActiveTab] = useState<'details' | 'followup'>('details');
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

    const [showEmpDropdown, setShowEmpDropdown] = useState(false);
    const [newFollowUp, setNewFollowUp] = useState<Partial<FollowUp>>({ type: 'Call', date: new Date().toISOString().split('T')[0] });
    const [showAddFollowUp, setShowAddFollowUp] = useState(false);

    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [newLeadData, setNewLeadData] = useState<Partial<Lead>>({
        source: 'Website',
        status: LeadStatus.NEW,
        value: 0
    });
    const [editingLeadData, setEditingLeadData] = useState<Partial<Lead>>({});

    React.useEffect(() => {
        const handleGlobalClick = () => setActiveMenuId(null);
        window.addEventListener('click', handleGlobalClick);
        return () => window.removeEventListener('click', handleGlobalClick);
    }, []);

    const handleDraftEmail = async (lead: Lead) => {
        setEmailDraft('');
        setIsGenerating(true);
        let tone = lead.source === 'Amazon' || lead.source === 'Flipkart' ? "Transactional" : "Professional";
        const draft = await generateEmailDraft(lead.name, lead.productInterest, tone);
        setEmailDraft(draft);
        setIsGenerating(false);
    };

    const handleConvertLead = (lead: Lead) => {
        const quoteSeed = {
            customerName: lead.name,
            customerHospital: lead.hospital,
            customerAddress: lead.address || '',
            subject: lead.productInterest,
            phone: lead.phone,
            items: [{
                id: `ITEM-SEED-${Date.now()}`,
                description: lead.productInterest,
                quantity: 1,
                unit: 'no',
                unitPrice: lead.value || 0,
                taxRate: 12,
                amount: lead.value || 0,
                gstValue: (lead.value || 0) * 0.12,
                priceWithGst: (lead.value || 0) * 1.12,
                hsn: '',
                model: ''
            }]
        };
        setPendingQuoteData(quoteSeed);
        addNotification('Lead Conversion', `Lead data for ${lead.name} prepared for Quotation.`, 'success');
        if (onNavigate) onNavigate(TabView.QUOTES);
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
        // Fixed: 'FollowUp' is a type and cannot be instantiated with 'new'. 
        // Replaced with 'new Date().toISOString().split('T')[0]' to reset the form to today's date.
        setNewFollowUp({ type: 'Call', date: new Date().toISOString().split('T')[0], notes: '' });
        addNotification('Task Logged', `Follow-up set for ${selectedLead.name}.`, 'info');
    };

    const toggleFollowUpStatus = (leadId: string, fuId: string) => {
        const lead = leads.find(l => l.id === leadId);
        if (!lead) return;
        const updated = lead.followUps?.map(f => f.id === fuId ? { ...f, status: f.status === 'Pending' ? 'Completed' : 'Pending' } as FollowUp : f);
        updateLead(leadId, { followUps: updated });
    };

    const handleSaveNewLead = async () => {
        if (!newLeadData.name || !newLeadData.hospital) return;
        const lead: Lead = {
            id: `L-${Date.now()}`,
            name: newLeadData.name,
            hospital: newLeadData.hospital,
            source: newLeadData.source as any || 'Website',
            status: newLeadData.status as any || LeadStatus.NEW,
            value: newLeadData.value || 0,
            productInterest: newLeadData.productInterest || '',
            phone: newLeadData.phone || '',
            email: newLeadData.email || '',
            address: newLeadData.address || '',
            contactPerson: newLeadData.contactPerson || '',
            salesTakenBy: newLeadData.salesTakenBy || '',
            lastContact: new Date().toISOString().split('T')[0],
            followUps: []
        };
        await addLead(lead);
        setShowAddModal(false);
        setNewLeadData({ source: 'Website', status: LeadStatus.NEW, value: 0 });
        addNotification('Lead Captured', `${lead.name} added to pipeline.`, 'success');
    };

    const handleSaveEditLead = async () => {
        if (!editingLeadData.id || !editingLeadData.name || !editingLeadData.hospital) return;
        const updates: Partial<Lead> = {
            name: editingLeadData.name,
            hospital: editingLeadData.hospital,
            source: editingLeadData.source,
            status: editingLeadData.status,
            value: editingLeadData.value,
            productInterest: editingLeadData.productInterest,
            phone: editingLeadData.phone,
            email: editingLeadData.email,
            address: editingLeadData.address,
            contactPerson: editingLeadData.contactPerson,
            salesTakenBy: editingLeadData.salesTakenBy,
        };
        await updateLead(editingLeadData.id, updates);
        if (selectedLead?.id === editingLeadData.id) {
            setSelectedLead({ ...selectedLead, ...updates });
        }
        setShowEditModal(false);
        setEditingLeadData({});
        addNotification('Lead Updated', `${editingLeadData.name} details saved.`, 'success');
    };

    const getNextFollowUp = (lead: Lead) => {
        if (!lead.followUps || lead.followUps.length === 0) return null;
        const pending = lead.followUps.filter(f => f.status === 'Pending').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        return pending.length > 0 ? pending[0] : null;
    };

    return (
        <div className="h-full flex flex-col gap-6 overflow-y-auto lg:overflow-hidden p-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 bg-white p-4 rounded-3xl shadow-sm border border-slate-300">
                <div className="flex gap-3">
                    <button onClick={handleSyncLeads} disabled={isSyncing} className="bg-slate-50 border border-slate-300 text-slate-700 hover:text-medical-600 px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm flex items-center gap-2">
                        <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
                        {isSyncing ? 'Syncing...' : 'Sync Cloud'}
                    </button>
                </div>
                <button onClick={() => setShowAddModal(true)} className="bg-medical-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-medical-500/30 flex items-center gap-2 hover:bg-medical-700 transition-all">
                    <Plus size={18} /> Add Lead
                </button>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 flex-1 lg:overflow-hidden lg:min-h-0">
                <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-300 flex flex-col overflow-hidden min-h-[400px]">
                    <div className="overflow-x-auto flex-1 custom-scrollbar">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50/80 border-b border-slate-300 text-[10px] uppercase font-bold text-slate-500 sticky top-0 z-10 backdrop-blur-sm">
                                <tr><th className="px-6 py-4">Lead / Hospital</th><th className="px-6 py-4">Source</th><th className="px-6 py-4">Sales</th><th className="px-6 py-4">Interest</th><th className="px-6 py-4">Next Action</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Action</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {leads.map((lead) => (
                                    <tr key={lead.id} onClick={() => setSelectedLead(lead)} className={`cursor-pointer transition-all ${selectedLead?.id === lead.id ? 'bg-medical-50/60 border-l-4 border-medical-500' : 'hover:bg-slate-50 border-l-4 border-transparent'}`}>
                                        <td className="px-6 py-4"><div className="font-bold text-slate-800">{lead.name}</div><div className="text-[10px] text-slate-400 font-bold mt-0.5">{lead.hospital}</div></td>
                                        <td className="px-6 py-4"><span className="text-[10px] font-black uppercase tracking-wider text-indigo-600">{lead.source}</span></td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[8px] font-black uppercase text-slate-500 shadow-inner border border-slate-200">
                                                    {lead.salesTakenBy?.charAt(0) || 'S'}
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-600 truncate max-w-[80px] uppercase">{lead.salesTakenBy || 'Direct'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 truncate max-w-[150px] font-medium">{lead.productInterest}</td>
                                        <td className="px-6 py-4">
                                            {getNextFollowUp(lead) ? (
                                                <div className="flex items-center gap-2 text-[10px] font-bold px-2 py-1 rounded-lg bg-blue-50 text-blue-600 w-fit">
                                                    <Calendar size={12} /> {getNextFollowUp(lead)?.type} {getNextFollowUp(lead)?.date}
                                                </div>
                                            ) : <span className="text-[10px] text-slate-300 font-bold">---</span>}
                                        </td>
                                        <td className="px-6 py-4"><span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${lead.status === 'Won' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>{lead.status}</span></td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="relative flex justify-end">
                                                <button 
                                                    onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        setActiveMenuId(activeMenuId === lead.id ? null : lead.id); 
                                                    }} 
                                                    className={`p-2 rounded-xl transition-all ${activeMenuId === lead.id ? 'bg-medical-50 text-medical-600' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
                                                >
                                                    <MoreVertical size={18} />
                                                </button>
                                                
                                                {activeMenuId === lead.id && (
                                                    <div className="absolute right-0 top-12 bg-white border border-slate-300 shadow-2xl rounded-2xl p-1 z-50 flex gap-1 animate-in fade-in slide-in-from-top-2 min-w-[120px] border-slate-300">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); setSelectedLead(lead); setActiveMenuId(null); }} 
                                                            className="p-2.5 text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all flex-1 flex justify-center"
                                                            title="View Details"
                                                        >
                                                            <ArrowUpRight size={18} />
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { 
                                                                e.stopPropagation(); 
                                                                setEditingLeadData(lead);
                                                                setShowEditModal(true);
                                                                setActiveMenuId(null); 
                                                            }} 
                                                            className="p-2.5 text-amber-500 hover:bg-amber-50 rounded-xl transition-all flex-1 flex justify-center"
                                                            title="Edit Lead"
                                                        >
                                                            <Edit2 size={18} />
                                                        </button>
                                                        <button 
                                                            onClick={async (e) => { 
                                                                e.stopPropagation(); 
                                                                if (window.confirm(`Delete lead "${lead.name}"?`)) {
                                                                    await removeLead(lead.id);
                                                                    addNotification('Lead Deleted', `${lead.name} removed from registry.`, 'warning');
                                                                    if (selectedLead?.id === lead.id) setSelectedLead(null);
                                                                }
                                                                setActiveMenuId(null); 
                                                            }} 
                                                            className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-all flex-1 flex justify-center"
                                                            title="Delete Lead"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {selectedLead && (
                    <div className="w-full lg:w-[420px] bg-white rounded-3xl shadow-2xl border border-slate-300 flex flex-col shrink-0 overflow-hidden animate-in slide-in-from-right-4 duration-300">
                        <div className="p-6 border-b border-slate-300 bg-slate-50/50">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-start gap-3">
                                    <div>
                                        <h3 className="font-black text-xl text-slate-800 uppercase tracking-tight">{selectedLead.name}</h3>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedLead.hospital}</p>
                                    </div>
                                    <button 
                                        onClick={() => { setEditingLeadData(selectedLead); setShowEditModal(true); }}
                                        className="p-2 rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-100 transition-all shadow-sm border border-amber-200"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                </div>
                                <button onClick={() => setSelectedLead(null)}><X size={24} className="text-slate-400 hover:text-slate-600" /></button>
                            </div>
                            <div className="flex bg-slate-100 p-1 rounded-xl">
                                <button onClick={() => setActiveTab('details')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${activeTab === 'details' ? 'bg-white text-medical-700 shadow-sm' : 'text-slate-500'}`}>Overview</button>
                                <button onClick={() => setActiveTab('followup')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${activeTab === 'followup' ? 'bg-white text-medical-700 shadow-sm' : 'text-slate-500'}`}>Follow-ups</button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                            {activeTab === 'details' ? (
                                <div className="space-y-6">
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-300 space-y-3">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Phone size={12} /> Contact Profile</h4>
                                        <div className="text-sm font-bold text-slate-700">{selectedLead.phone || 'No Phone'}</div>
                                        <div className="text-sm font-bold text-slate-700">{selectedLead.email || 'No Email'}</div>
                                        <div className="text-xs text-slate-500 leading-relaxed italic">{selectedLead.address || 'No Address indexed'}</div>
                                        {selectedLead.contactPerson && <div className="text-[10px] font-bold text-indigo-600 uppercase mt-1">Contact: {selectedLead.contactPerson}</div>}
                                        {selectedLead.salesTakenBy && <div className="text-[10px] font-bold text-medical-600 uppercase">Sales: {selectedLead.salesTakenBy}</div>}
                                    </div>
                                    <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                                        <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2"><Box size={12} /> Item Interest</h4>
                                        <p className="font-black text-slate-800 mt-2">{selectedLead.productInterest}</p>
                                        <p className="text-xs font-bold text-indigo-600 mt-1">Est. Value: ₹{(selectedLead.value || 0).toLocaleString()}</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <button onClick={() => handleDraftEmail(selectedLead)} disabled={isGenerating} className="flex-1 py-4 border border-slate-300 rounded-2xl text-slate-400 hover:text-medical-600 hover:bg-medical-50 flex items-center justify-center gap-2 transition-all">
                                            {isGenerating ? <RefreshCw size={16} className="animate-spin" /> : <Wand2 size={16} />}
                                            <span className="text-[10px] font-black uppercase tracking-widest">Draft Pitch</span>
                                        </button>
                                        <button onClick={() => handleConvertLead(selectedLead)} className="flex-1 py-4 bg-slate-800 text-white rounded-2xl flex items-center justify-center gap-2 hover:bg-black transition-all">
                                            <FileText size={16} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Gen Quotation</span>
                                        </button>
                                    </div>

                                    {emailDraft && (
                                        <div className="bg-white border border-slate-300 p-4 rounded-2xl animate-in zoom-in-95">
                                            <pre className="whitespace-pre-wrap font-sans text-xs text-slate-600 leading-relaxed mb-4">{emailDraft}</pre>
                                            <button className="w-full bg-slate-800 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest">Copy to Clipboard</button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <button onClick={() => setShowAddFollowUp(!showAddFollowUp)} className="w-full bg-slate-50 border border-slate-300 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-100 transition-all">
                                        <Plus size={16} /> Schedule Touchpoint
                                    </button>
                                    {showAddFollowUp && (
                                        <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-xl space-y-4 animate-in slide-in-from-top-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <select className="w-full border border-slate-300 bg-slate-50 rounded-xl px-3 py-2 text-[10px] font-black uppercase" value={newFollowUp.type} onChange={e => setNewFollowUp({ ...newFollowUp, type: e.target.value as any })}><option>Call</option><option>Meeting</option><option>WhatsApp</option></select>
                                                <input type="date" className="w-full border border-slate-300 bg-slate-50 rounded-xl px-3 py-2 text-[10px] font-black uppercase" value={newFollowUp.date} onChange={e => setNewFollowUp({ ...newFollowUp, date: e.target.value })} />
                                            </div>
                                            <textarea className="w-full border border-slate-300 bg-slate-50 rounded-xl px-3 py-2 text-[10px] font-bold" rows={2} placeholder="Notes..." value={newFollowUp.notes || ''} onChange={e => setNewFollowUp({ ...newFollowUp, notes: e.target.value })} />
                                            <button onClick={handleAddFollowUp} className="w-full bg-medical-600 text-white py-2 rounded-xl text-[10px] font-black uppercase">Commit Reminder</button>
                                        </div>
                                    )}
                                    <div className="space-y-4">
                                        {selectedLead.followUps?.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(fu => (
                                            <div key={fu.id} className={`p-4 rounded-2xl border ${fu.status === 'Completed' ? 'bg-slate-50 opacity-60' : 'bg-white border-slate-300 shadow-sm'}`}>
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="text-[10px] font-black uppercase text-indigo-600">{fu.type}</span>
                                                    <span className="text-[9px] font-bold text-slate-400">{fu.date}</span>
                                                </div>
                                                <p className="text-xs font-medium text-slate-700">{fu.notes}</p>
                                                <button onClick={() => toggleFollowUpStatus(selectedLead.id, fu.id)} className="mt-3 text-[9px] font-black uppercase text-medical-600 flex items-center gap-1">
                                                    {fu.status === 'Pending' ? <><CheckSquare size={10} /> Mark Done</> : <><RefreshCw size={10} /> Reopen</>}
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
                        <div className="p-6 border-b border-slate-300 flex justify-between items-center bg-slate-50/50">
                            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Manual Lead Intake</h3>
                            <button onClick={() => setShowAddModal(false)}><X size={24} className="text-slate-400" /></button>
                        </div>
                        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Identity Detail *</label>
                                <input type="text" className="w-full border border-slate-300 bg-slate-50/50 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-medical-500 transition-all" placeholder="Client or Lead Name" value={newLeadData.name || ''} onChange={e => setNewLeadData({ ...newLeadData, name: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Organization / Hospital *</label>
                                <input type="text" className="w-full border border-slate-300 bg-slate-50/50 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-medical-500 transition-all" placeholder="Legal Entity Name" value={newLeadData.hospital || ''} onChange={e => setNewLeadData({ ...newLeadData, hospital: e.target.value })} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Source</label>
                                    <select className="w-full border border-slate-300 bg-slate-50/50 rounded-xl px-4 py-3 text-sm font-bold appearance-none outline-none focus:border-medical-500 transition-all" value={newLeadData.source} onChange={e => setNewLeadData({ ...newLeadData, source: e.target.value as any })}>
                                        <option>Website</option><option>Amazon</option><option>Flipkart</option><option>Referral</option><option>Direct</option><option>Sales</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Initial Status</label>
                                    <select className="w-full border border-slate-300 bg-slate-50/50 rounded-xl px-4 py-3 text-sm font-bold appearance-none outline-none focus:border-medical-500 transition-all" value={newLeadData.status} onChange={e => setNewLeadData({ ...newLeadData, status: e.target.value as any })}>
                                        <option value={LeadStatus.NEW}>New</option><option value={LeadStatus.WON}>Won</option><option value={LeadStatus.LOST}>Lost</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Item Interest</label>
                                    <input type="text" className="w-full border border-slate-300 bg-slate-50/50 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-medical-500 transition-all" placeholder="Product Type" value={newLeadData.productInterest || ''} onChange={e => setNewLeadData({ ...newLeadData, productInterest: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Estimated Value (₹)</label>
                                    <input type="number" className="w-full border border-slate-300 bg-slate-50/50 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-medical-500 transition-all" placeholder="Value" value={newLeadData.value || ''} onChange={e => setNewLeadData({ ...newLeadData, value: Number(e.target.value) })} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Person</label>
                                    <input type="text" className="w-full border border-slate-300 bg-slate-50/50 rounded-xl px-4 py-3 text-sm font-bold outline-none" placeholder="Primary Contact" value={newLeadData.contactPerson || ''} onChange={e => setNewLeadData({ ...newLeadData, contactPerson: e.target.value })} />
                                </div>
                                <div className="space-y-1 relative">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sales Taken By</label>
                                    <input 
                                        type="text" 
                                        className="w-full border border-slate-300 bg-slate-50/50 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-medical-500 transition-all" 
                                        placeholder="Sales Executive Name" 
                                        value={newLeadData.salesTakenBy || ''} 
                                        onChange={e => {
                                            setNewLeadData({ ...newLeadData, salesTakenBy: e.target.value });
                                            setShowEmpDropdown(true);
                                        }}
                                        onFocus={() => setShowEmpDropdown(true)}
                                        onBlur={() => setTimeout(() => setShowEmpDropdown(false), 200)}
                                    />
                                    {showEmpDropdown && newLeadData.salesTakenBy && (
                                        <div className="absolute z-[130] top-full left-0 w-full mt-1 bg-white border border-slate-300 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                                            {employees.filter(emp => emp.name.toLowerCase().includes(newLeadData.salesTakenBy!.toLowerCase())).slice(0, 5).map(emp => (
                                                <button 
                                                    key={emp.id} 
                                                    className="w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-medical-50 border-b border-slate-100 last:border-0 transition-colors"
                                                    onClick={() => {
                                                        setNewLeadData({ ...newLeadData, salesTakenBy: emp.name });
                                                        setShowEmpDropdown(false);
                                                    }}
                                                >
                                                    <div className="text-slate-800">{emp.name}</div>
                                                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{emp.department}</div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone</label>
                                    <input type="text" className="w-full border border-slate-300 bg-slate-50/50 rounded-xl px-4 py-3 text-sm font-bold outline-none" placeholder="+91..." value={newLeadData.phone || ''} onChange={e => setNewLeadData({ ...newLeadData, phone: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                                    <input type="email" className="w-full border border-slate-300 bg-slate-50/50 rounded-xl px-4 py-3 text-sm font-bold outline-none" placeholder="example@mail.com" value={newLeadData.email || ''} onChange={e => setNewLeadData({ ...newLeadData, email: e.target.value })} />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Address</label>
                                <textarea className="w-full border border-slate-300 bg-slate-50/50 rounded-xl px-4 py-3 text-sm font-bold outline-none min-h-[80px]" placeholder="Location details..." value={newLeadData.address || ''} onChange={e => setNewLeadData({ ...newLeadData, address: e.target.value })} />
                            </div>
                        </div>
                        <div className="p-6 border-t border-slate-300 flex gap-3 bg-slate-50/30">
                            <button onClick={() => setShowAddModal(false)} className="flex-1 bg-white border border-slate-300 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-slate-50 active:scale-95">Discard</button>
                            <button onClick={handleSaveNewLead} className="flex-[2] bg-medical-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-medical-500/20 transition-all hover:bg-medical-700 active:scale-95">Complete Sync</button>
                        </div>
                    </div>
                </div>
            )}

            {showEditModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 min-h-screen">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-300 animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-6 border-b border-slate-300 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h2 className="font-black text-2xl text-slate-800 uppercase tracking-tight">Edit Lead Profile</h2>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">Update existing registry data</p>
                            </div>
                            <button onClick={() => setShowEditModal(false)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors"><X size={24} /></button>
                        </div>
                        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Entity Name</label>
                                    <input type="text" className="w-full border border-slate-300 bg-slate-50/50 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-medical-500 transition-all shadow-inner" placeholder="Full Name" value={editingLeadData.name || ''} onChange={e => setEditingLeadData({ ...editingLeadData, name: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hospital / Clinic</label>
                                    <input type="text" className="w-full border border-slate-300 bg-slate-50/50 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-medical-500 transition-all shadow-inner" placeholder="Facility Name" value={editingLeadData.hospital || ''} onChange={e => setEditingLeadData({ ...editingLeadData, hospital: e.target.value })} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Acquisition Source</label>
                                    <select className="w-full border border-slate-300 bg-emerald-50 rounded-xl px-4 py-3 text-[11px] font-black uppercase outline-none focus:border-emerald-500 transition-all appearance-none" value={editingLeadData.source} onChange={e => setEditingLeadData({ ...editingLeadData, source: e.target.value as any })}>
                                        <option>Website</option><option>Reference</option><option>Indiamart</option><option>Amazon</option><option>Flipkart</option><option>Cold Call</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pipeline Status</label>
                                    <select className="w-full border border-slate-300 bg-blue-50 rounded-xl px-4 py-3 text-[11px] font-black uppercase outline-none focus:border-blue-500 transition-all appearance-none" value={editingLeadData.status} onChange={e => setEditingLeadData({ ...editingLeadData, status: e.target.value as any })}>
                                        {Object.values(LeadStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Item Interest</label>
                                    <input type="text" className="w-full border border-slate-300 bg-slate-50/50 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-medical-500 transition-all" placeholder="Product Type" value={editingLeadData.productInterest || ''} onChange={e => setEditingLeadData({ ...editingLeadData, productInterest: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Estimated Value (₹)</label>
                                    <input type="number" className="w-full border border-slate-300 bg-slate-50/50 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-medical-500 transition-all" placeholder="Value" value={editingLeadData.value || ''} onChange={e => setEditingLeadData({ ...editingLeadData, value: Number(e.target.value) })} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Person</label>
                                    <input type="text" className="w-full border border-slate-300 bg-slate-50/50 rounded-xl px-4 py-3 text-sm font-bold outline-none" placeholder="Primary Contact" value={editingLeadData.contactPerson || ''} onChange={e => setEditingLeadData({ ...editingLeadData, contactPerson: e.target.value })} />
                                </div>
                                <div className="space-y-1 relative">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sales Taken By</label>
                                    <input 
                                        type="text" 
                                        className="w-full border border-slate-300 bg-slate-50/50 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-medical-500 transition-all" 
                                        placeholder="Sales Executive Name" 
                                        value={editingLeadData.salesTakenBy || ''} 
                                        onChange={e => {
                                            setEditingLeadData({ ...editingLeadData, salesTakenBy: e.target.value });
                                            setShowEmpDropdown(true);
                                        }}
                                        onFocus={() => setShowEmpDropdown(true)}
                                        onBlur={() => setTimeout(() => setShowEmpDropdown(false), 200)}
                                    />
                                    {showEmpDropdown && editingLeadData.salesTakenBy && (
                                        <div className="absolute z-[130] top-full left-0 w-full mt-1 bg-white border border-slate-300 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                                            {employees.filter(emp => emp.name.toLowerCase().includes(editingLeadData.salesTakenBy!.toLowerCase())).slice(0, 5).map(emp => (
                                                <button 
                                                    key={emp.id} 
                                                    className="w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-medical-50 border-b border-slate-100 last:border-0 transition-colors"
                                                    onClick={() => {
                                                        setEditingLeadData({ ...editingLeadData, salesTakenBy: emp.name });
                                                        setShowEmpDropdown(false);
                                                    }}
                                                >
                                                    <div className="text-slate-800">{emp.name}</div>
                                                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{emp.department}</div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone</label>
                                    <input type="text" className="w-full border border-slate-300 bg-slate-50/50 rounded-xl px-4 py-3 text-sm font-bold outline-none" placeholder="+91..." value={editingLeadData.phone || ''} onChange={e => setEditingLeadData({ ...editingLeadData, phone: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                                    <input type="email" className="w-full border border-slate-300 bg-slate-50/50 rounded-xl px-4 py-3 text-sm font-bold outline-none" placeholder="example@mail.com" value={editingLeadData.email || ''} onChange={e => setEditingLeadData({ ...editingLeadData, email: e.target.value })} />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Address</label>
                                <textarea className="w-full border border-slate-300 bg-slate-50/50 rounded-xl px-4 py-3 text-sm font-bold outline-none min-h-[80px]" placeholder="Location details..." value={editingLeadData.address || ''} onChange={e => setEditingLeadData({ ...editingLeadData, address: e.target.value })} />
                            </div>
                        </div>
                        <div className="p-6 border-t border-slate-300 flex gap-3 bg-slate-50/30">
                            <button onClick={() => setShowEditModal(false)} className="flex-1 bg-white border border-slate-300 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-slate-50 active:scale-95">Cancel</button>
                            <button onClick={handleSaveEditLead} className="flex-[2] bg-medical-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-medical-500/20 transition-all hover:bg-medical-700 active:scale-95">Update Changes</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
