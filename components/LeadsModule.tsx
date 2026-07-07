import React, { useState, useMemo } from 'react';
import { Lead, LeadStatus, FollowUp, TabView } from '../types';
import { 
    Phone, Plus, Wand2, RefreshCw, Box, ArrowUpRight, 
    Calendar, CheckSquare, X, FileText, Trash2, 
    MoreVertical, Edit2, List, Search, MapPin, 
    User, Mail, Building2, DollarSign, Activity,
    Zap, Sparkles, Send, ChevronRight
} from 'lucide-react';
import { generateEmailDraft } from '../geminiService';
import { useData } from './DataContext';
import { AutoSuggest } from './AutoSuggest';

const FormRow = ({ label, children }: { label: string, children?: React.ReactNode }) => (
    <div className="flex flex-col gap-1 md:gap-1.5 w-full">
        <label className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 truncate whitespace-nowrap min-h-[12px] md:min-h-[14px]">{label}</label>
        {children}
    </div>
);

export const LeadsModule: React.FC<{ onNavigate?: (tab: TabView) => void }> = ({ onNavigate }) => {
    const { 
        leads, addLead, updateLead, removeLead, addNotification, 
        setPendingQuoteData, employees, addLog, searchRecords, 
        fetchMoreData, clients, products, addClient, showConfirm
    } = useData();

    const [viewState, setViewState] = useState<'stock' | 'builder' | 'today'>('stock');
    const [builderMode, setBuilderMode] = useState<'add' | 'edit'>('add');
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [emailDraft, setEmailDraft] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [activeTab, setActiveTab] = useState<'details' | 'followup'>('details');
    const [searchQuery, setSearchQuery] = useState('');
    const [serverLeads, setServerLeads] = useState<Lead[]>([]);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [showEmpDropdown, setShowEmpDropdown] = useState(false);
    const [showAddFollowUp, setShowAddFollowUp] = useState(false);
    const [newFollowUp, setNewFollowUp] = useState<Partial<FollowUp>>({ 
        type: 'Call', 
        date: new Date().toISOString().split('T')[0] 
    });

    const DEFAULT_LEAD: Partial<Lead> = {
        name: '',
        hospital: '',
        source: 'Website',
        status: LeadStatus.NEW,
        value: 0,
        productInterest: '',
        phone: '',
        email: '',
        address: '',
        contactPerson: '',
        salesTakenBy: '',
        followUps: []
    };

    const [lead, setLead] = useState<Partial<Lead>>(DEFAULT_LEAD);

    const handleSelectClient = (field: 'name' | 'hospital', value: string) => {
        const client = clients.find(c => (field === 'name' ? c.name === value : c.hospital === value));
        if (client) {
            setLead(prev => ({ 
                ...prev, 
                name: client.name,
                hospital: client.hospital || '',
                phone: client.phone || '',
                email: client.email || '',
                address: client.address || '',
            }));
        } else {
            setLead(prev => ({ ...prev, [field]: value }));
        }
    };

    const handleDeepSearch = async () => {
        if (!searchQuery.trim()) {
            setServerLeads([]);
            return;
        }
        setIsSearching(true);
        try {
            const results = await searchRecords<Lead>("leads", "name", searchQuery);
            setServerLeads(results);
            if (results.length === 0) {
                addNotification('No Results', 'No matching records found in database.', 'info');
            }
        } catch (err) {
            console.error("Search failed", err);
        } finally {
            setIsSearching(false);
        }
    };

    const handleDraftEmail = async (targetLead: Lead) => {
        setEmailDraft('');
        setIsGenerating(true);
        let tone = targetLead.source === 'Amazon' || targetLead.source === 'Flipkart' ? "Transactional" : "Professional";
        const draft = await generateEmailDraft(targetLead.name, targetLead.productInterest, tone);
        setEmailDraft(draft);
        setIsGenerating(false);
    };

    const handleConvertLead = (targetLead: Lead) => {
        const quoteSeed = {
            customerName: targetLead.name,
            customerHospital: targetLead.hospital,
            customerAddress: targetLead.address || '',
            subject: targetLead.productInterest,
            phone: targetLead.phone,
            items: [{
                id: `ITEM-SEED-${Date.now()}`,
                description: targetLead.productInterest,
                quantity: 1,
                unit: 'no',
                unitPrice: targetLead.value || 0,
                taxRate: 12,
                amount: targetLead.value || 0,
                gstValue: (targetLead.value || 0) * 0.12,
                priceWithGst: (targetLead.value || 0) * 1.12,
                hsn: '',
                model: ''
            }]
        };
        setPendingQuoteData(quoteSeed);
        addNotification('Lead Conversion', `Lead data for ${targetLead.name} prepared for Quotation.`, 'success');
        if (onNavigate) onNavigate(TabView.QUOTES);
    };

    const handleAddFollowUp = async () => {
        if (!selectedLead || !newFollowUp.date || !newFollowUp.notes) return;
        const followUp: FollowUp = {
            id: `FU-${Date.now()}`,
            date: newFollowUp.date,
            type: newFollowUp.type as any,
            notes: newFollowUp.notes,
            status: 'Pending'
        };
        const updatedFollowUps = [...(selectedLead.followUps || []), followUp];
        await updateLead(selectedLead.id, { followUps: updatedFollowUps });
        setSelectedLead({ ...selectedLead, followUps: updatedFollowUps });
        setShowAddFollowUp(false);
        setNewFollowUp({ type: 'Call', date: new Date().toISOString().split('T')[0], notes: '' });
        addNotification('Task Logged', `Follow-up set for ${selectedLead.name}.`, 'info');
    };

    const toggleFollowUpStatus = async (leadId: string, fuId: string) => {
        const targetLead = leads.find(l => l.id === leadId);
        if (!targetLead) return;
        const updated = targetLead.followUps?.map(f => f.id === fuId ? { ...f, status: f.status === 'Pending' ? 'Completed' : 'Pending' } as FollowUp : f);
        await updateLead(leadId, { followUps: updated });
        if (selectedLead?.id === leadId) {
            setSelectedLead({ ...selectedLead, followUps: updated });
        }
    };

    const handleSave = async () => {
        if (!lead.name || !lead.hospital) {
            addNotification('Validation Error', 'Name and Hospital are required.', 'alert');
            return;
        }

        // Duplicate detection
        const isDuplicate = leads.some(l => 
            (l.id !== lead.id) && 
            ((lead.phone && l.phone === lead.phone) || 
             (lead.name && l.name.toLowerCase().trim() === lead.name.toLowerCase().trim()))
        );
        if (isDuplicate) {
            const confirmed = await showConfirm(`A lead with name "${lead.name}" or phone "${lead.phone}" already exists. Save anyway?`, "Duplicate Detected");
            if (!confirmed) return;
        }

        if (builderMode === 'add') {
            const finalLead: Lead = {
                ...lead as Lead,
                id: `L-${Date.now()}`,
                lastContact: new Date().toISOString().split('T')[0],
                createdAt: new Date().toISOString(),
                followUps: []
            };
            await addLead(finalLead);
            await addLog('Leads', 'Lead Acquisition', `Registered new opportunity: ${finalLead.name} for ${finalLead.productInterest}.`);
            addNotification('Lead Captured', `${finalLead.name} added to pipeline.`, 'success');
        } else {
            const updates: Partial<Lead> = { ...lead };
            await updateLead(lead.id!, updates);
            await addLog('Leads', 'Lead Evolution', `Updated details for ${lead.name}.`);
            addNotification('Lead Updated', `${lead.name} details saved.`, 'success');

            // Auto-convert to Client when status is Won
            if (updates.status === LeadStatus.WON) {
                const alreadyExists = clients.find(c => c.name.toUpperCase() === (updates.name || '').toUpperCase());
                if (!alreadyExists) {
                    const newClient = {
                        id: `CLT-${Date.now()}`,
                        name: updates.name || lead.name || '',
                        hospital: updates.hospital || lead.hospital || '',
                        address: updates.address || lead.address || '',
                        email: updates.email || lead.email || '',
                        phone: updates.phone || lead.phone || '',
                    };
                    await addClient(newClient);
                    await addLog('Leads', 'Auto Client Convert', `Lead ${newClient.name} won — added to Client registry.`);
                    addNotification('🎉 Lead Won!', `${newClient.name} has been added as a Client automatically.`, 'success');
                }
            }
        }

        setViewState('stock');
        setLead(DEFAULT_LEAD);
    };

    const handleDelete = async (targetLead: Lead) => {
        const confirmed = await showConfirm(`Delete lead "${targetLead.name}"?`);
        if (confirmed) {
            await addLog('Leads', 'Lead Deletion', `Purged lead record: ${targetLead.name}.`);
            await removeLead(targetLead.id);
            addNotification('Lead Deleted', `${targetLead.name} removed from registry.`, 'warning');
            if (selectedLead?.id === targetLead.id) setSelectedLead(null);
        }
    };

    const getNextFollowUp = (targetLead: Lead) => {
        if (!targetLead.followUps || targetLead.followUps.length === 0) return null;
        const pending = targetLead.followUps.filter(f => f.status === 'Pending').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        return pending.length > 0 ? pending[0] : null;
    };

    const todayTouchpoints = useMemo(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        const list: { lead: Lead; followUp: FollowUp }[] = [];
        leads.forEach(l => {
            if (l.followUps) {
                l.followUps.forEach(fu => {
                    if (fu.date === todayStr) {
                        list.push({ lead: l, followUp: fu });
                    }
                });
            }
        });
        return list.sort((a, b) => {
            if (a.followUp.status === b.followUp.status) {
                return a.lead.name.localeCompare(b.lead.name);
            }
            return a.followUp.status === 'Pending' ? -1 : 1;
        });
    }, [leads]);

    const filteredLeads = useMemo(() => {
        const source = serverLeads.length > 0 ? serverLeads : leads;
        const lowQuery = searchQuery.toLowerCase();
        return source.filter(l => 
            (l.name || '').toLowerCase().includes(lowQuery) ||
            (l.hospital || '').toLowerCase().includes(lowQuery) ||
            (l.productInterest || '').toLowerCase().includes(lowQuery) ||
            (l.phone || '').includes(searchQuery)
        );
    }, [leads, serverLeads, searchQuery]);

    return (
        <div className="h-full flex flex-col gap-4 overflow-hidden p-2">
            <div className="bg-slate-100 p-1.5 rounded-[2.5rem] border border-slate-200 shadow-inner w-fit max-w-full overflow-x-auto shrink-0 flex gap-1">
                <button onClick={() => setViewState('stock')} className={`px-6 py-2 rounded-[2rem] text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shrink-0 transition-all ${viewState === 'stock' ? 'bg-emerald-900 text-emerald-100 shadow-[0_10px_20px_-5px_rgba(6,78,59,0.5)] scale-100' : 'text-slate-400 hover:text-emerald-700 scale-95'}`}><List size={14} /> Pipeline</button>
                <button onClick={() => setViewState('today')} className={`px-6 py-2 rounded-[2rem] text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shrink-0 transition-all ${viewState === 'today' ? 'bg-emerald-900 text-emerald-100 shadow-[0_10px_20px_-5px_rgba(6,78,59,0.5)] scale-100' : 'text-slate-400 hover:text-emerald-700 scale-95'}`}><Calendar size={14} /> Today's Touchpoints</button>
            </div>

            {viewState === 'stock' && (
                <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0 animate-in fade-in">
                    <div className="flex-1 min-w-0 min-h-0 flex flex-col gap-4">
                        {/* Unified Green Gradient Toolbar */}
                        <div className="bg-gradient-to-br from-emerald-950 to-green-900 p-4 md:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-[0_20px_40px_-10px_rgba(4,47,46,0.5)] border border-emerald-800/30 shrink-0 z-20 rounded-[2rem] md:rounded-3xl">
                            <div className="hidden sm:flex items-center gap-4 group">
                                <div className="w-10 h-10 xl:w-12 xl:h-12 flex items-center justify-center text-[#c5a059] drop-shadow-md transition-transform group-hover:scale-110 shrink-0"><Activity size={20} /></div>
                                <div className="flex flex-col">
                                    <h2 className="text-lg xl:text-xl font-playfair font-bold tracking-tight text-white uppercase leading-none whitespace-nowrap">Lead Registry</h2>
                                    <p className="text-emerald-100/80 text-[11px] md:text-xs font-semibold leading-relaxed">{leads.length} Opportunities Indexed</p>
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                                <div className="relative w-full sm:w-80">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-100/50" size={16} />
                                    <input 
                                        type="text" 
                                        placeholder="Search leads / deep search..." 
                                        className="w-full bg-emerald-900/40 border border-emerald-700/50 text-white placeholder-emerald-100/50 rounded-[2rem] py-3 md:py-2.5 pl-11 pr-12 text-[11px] font-bold outline-none focus:border-emerald-400 focus:bg-emerald-900/60 transition-all uppercase placeholder:normal-case shadow-inner" 
                                        value={searchQuery} 
                                        onChange={(e) => { setSearchQuery(e.target.value); if(!e.target.value) setServerLeads([]); }}
                                        onKeyDown={(e) => e.key === 'Enter' && handleDeepSearch()}
                                    />
                                    <button onClick={handleDeepSearch} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-600 text-white rounded-[1rem] hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20"><ArrowUpRight size={14} /></button>
                                </div>
                                <button onClick={() => { setViewState('builder'); setBuilderMode('add'); setLead(DEFAULT_LEAD); }} className="w-full sm:w-auto bg-gradient-to-r from-[#c5a059] to-[#e5c185] text-amber-950 px-7 py-3 md:py-2.5 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.15em] shadow-[0_15px_30px_-5px_rgba(197,160,89,0.4)] hover:scale-[1.02] hover:shadow-[0_20px_40px_-5px_rgba(197,160,89,0.6)] transition-all active:scale-95 flex items-center justify-center gap-2 shrink-0"><Plus size={16} /> New Lead</button>
                            </div>
                        </div>

                        <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-300 shadow-sm overflow-hidden flex flex-col">
                            <div className="flex-1 overflow-auto custom-scrollbar">
                            <table className="w-full text-left text-[11px] hidden lg:table">
                                <thead className="bg-slate-50 sticky top-0 z-10 font-black uppercase text-[9px] text-slate-500 border-b tracking-widest shadow-[0_1px_0_0_#f1f5f9]">
                                    <tr><th className="px-8 py-5">Date of Entry</th><th className="px-8 py-5">Opportunity</th><th className="px-8 py-5">Source</th><th className="px-8 py-5">Interest / Value</th><th className="px-8 py-5">Next Action</th><th className="px-8 py-5 text-right">Status</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredLeads.map(l => (
                                        <tr key={l.id} className={`hover:bg-slate-50 transition-colors group cursor-pointer ${selectedLead?.id === l.id ? 'bg-medical-50/50' : ''}`} onClick={() => setSelectedLead(l)}>
                                            <td className="px-8 py-5 whitespace-nowrap"><span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{l.createdAt ? new Date(l.createdAt).toLocaleDateString('en-IN') : (l.id.startsWith('L-') && !isNaN(parseInt(l.id.replace('L-','')))) ? new Date(parseInt(l.id.replace('L-',''))).toLocaleDateString('en-IN') : l.lastContact || '-'}</span></td>
                                            <td className="px-8 py-5"><div className="font-black text-slate-800 uppercase text-[13px] tracking-tight">{l.name}</div><div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{l.hospital}</div></td>
                                            <td className="px-8 py-5"><span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100">{l.source}</span></td>
                                            <td className="px-8 py-5"><div className="font-bold text-slate-700">{l.productInterest}</div><div className="text-emerald-600 font-black mt-0.5">₹{(l.value || 0).toLocaleString('en-IN')}</div></td>
                                            <td className="px-8 py-5">
                                                {getNextFollowUp(l) ? (
                                                    <div className="flex items-center gap-2 text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100 w-fit uppercase tracking-tighter"><Calendar size={12}/> {getNextFollowUp(l)?.type} {getNextFollowUp(l)?.date}</div>
                                                ) : <span className="text-slate-300 font-black uppercase tracking-widest text-[9px]">Awaiting Task</span>}
                                            </td>
                                            <td className="px-8 py-5 text-right"><span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg border ${l.status === 'Won' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-blue-50 border-blue-200 text-blue-600'}`}>{l.status}</span></td>
                                        </tr>
                                    ))}
                                    {filteredLeads.length === 0 && (
                                        <tr><td colSpan={6} className="py-40 text-center text-slate-300 font-black uppercase tracking-[0.5em] opacity-30 italic">No Registry Found</td></tr>
                                    )}
                                </tbody>
                            </table>
                            <div className="lg:hidden flex flex-col divide-y divide-slate-100">
                                {filteredLeads.map(l => (
                                    <div key={l.id} className={`p-5 hover:bg-slate-50 transition-colors cursor-pointer flex flex-col gap-3 ${selectedLead?.id === l.id ? 'bg-medical-50/50' : ''}`} onClick={() => setSelectedLead(l)}>
                                        <div className="flex justify-between items-start">
                                            <div className="min-w-0 pr-3">
                                                <div className="font-black text-slate-800 uppercase text-[13px] tracking-tight truncate">{l.name}</div>
                                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 truncate">{l.hospital}</div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border shrink-0 ${l.status === 'Won' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-blue-50 border-blue-200 text-blue-600'}`}>{l.status}</span>
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{l.createdAt ? new Date(l.createdAt).toLocaleDateString('en-IN') : (l.id.startsWith('L-') && !isNaN(parseInt(l.id.replace('L-','')))) ? new Date(parseInt(l.id.replace('L-',''))).toLocaleDateString('en-IN') : l.lastContact || '-'}</span>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 mt-1">
                                            <div className="min-w-0">
                                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5 truncate">Interest</div>
                                                <div className="font-bold text-slate-700 text-[11px] truncate">{l.productInterest || 'N/A'}</div>
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5 truncate">Value</div>
                                                <div className="text-emerald-600 font-black text-[11px] truncate">₹{(l.value || 0).toLocaleString('en-IN')}</div>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center mt-2 pt-3 border-t border-slate-100">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 shrink-0">{l.source}</span>
                                            {getNextFollowUp(l) ? (
                                                <div className="flex items-center gap-1.5 text-[9px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 uppercase tracking-tighter shrink-0"><Calendar size={10}/> {getNextFollowUp(l)?.type}</div>
                                            ) : <span className="text-slate-300 font-black uppercase tracking-widest text-[9px]">Awaiting Task</span>}
                                        </div>
                                    </div>
                                ))}
                                {filteredLeads.length === 0 && (
                                    <div className="py-20 text-center text-slate-300 font-black uppercase tracking-[0.3em] opacity-50 italic text-[10px]">No Registry Found</div>
                                )}
                            </div>
                            {serverLeads.length === 0 && (
                                <div className="p-8 flex justify-center bg-slate-50/20 border-t border-slate-50">
                                    <button onClick={async () => { setIsLoadingMore(true); await fetchMoreData('leads', 'lastContact'); setIsLoadingMore(false); }} disabled={isLoadingMore} className="px-10 py-3 bg-white border border-slate-300 rounded-[2rem] text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-emerald-700 scale-95 transition-all shadow-sm flex items-center gap-2">{isLoadingMore ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} className="rotate-45" />} Load Archive</button>
                                </div>
                            )}
                        </div>
                    </div>
                    </div>

                    {selectedLead && (
                        <div className="w-full lg:w-[450px] bg-white rounded-[2.5rem] shadow-2xl border border-slate-300 flex flex-col shrink-0 overflow-hidden animate-in slide-in-from-right-4">
                            <div className="p-8 border-b border-slate-300 bg-slate-50/50 relative">
                                <button onClick={() => setSelectedLead(null)} className="absolute top-6 right-6 p-2 text-slate-300 hover:text-slate-500 transition-colors"><X size={24}/></button>
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-14 h-14 bg-medical-600 rounded-[2rem] flex items-center justify-center text-white text-xl font-black shadow-xl shadow-medical-500/20">{selectedLead.name.charAt(0)}</div>
                                    <div><h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight leading-tight">{selectedLead.name}</h3><p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-1">{selectedLead.hospital}</p></div>
                                </div>
                                <div className="flex bg-slate-100 p-1 rounded-[2rem]">
                                    <button onClick={() => setActiveTab('details')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-[2rem] transition-all ${activeTab === 'details' ? 'bg-white text-medical-600 shadow-sm' : 'text-slate-400'}`}>Intelligence</button>
                                    <button onClick={() => setActiveTab('followup')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-[2rem] transition-all ${activeTab === 'followup' ? 'bg-white text-medical-600 shadow-sm' : 'text-slate-400'}`}>Touchpoints</button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                                {activeTab === 'details' ? (
                                    <>
                                        <section className="space-y-4">
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1"><Activity size={14} /> Profile Matrix</h4>
                                            <div className="grid grid-cols-1 gap-3">
                                                <div className="p-4 bg-slate-50 rounded-[2rem] border border-slate-200 flex items-center gap-4"><div className="p-2 bg-white rounded-[2rem] border border-slate-100 text-medical-600"><Phone size={18} /></div><div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Phone</p><p className="text-sm font-black text-slate-700">{selectedLead.phone || 'NO DATA'}</p></div></div>
                                                <div className="p-4 bg-slate-50 rounded-[2rem] border border-slate-200 flex items-center gap-4"><div className="p-2 bg-white rounded-[2rem] border border-slate-100 text-indigo-600"><Mail size={18} /></div><div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Email</p><p className="text-sm font-black text-slate-700 lowercase">{selectedLead.email || 'NO DATA'}</p></div></div>
                                                <div className="p-4 bg-slate-50 rounded-[2rem] border border-slate-200 flex items-center gap-4"><div className="p-2 bg-white rounded-[2rem] border border-slate-100 text-amber-600"><MapPin size={18} /></div><div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Address</p><p className="text-[11px] font-bold text-slate-600 leading-tight">{selectedLead.address || 'NO PHYSICAL DATA'}</p></div></div>
                                            </div>
                                        </section>

                                        <section className="p-6 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-3xl text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform"><Box size={100} /></div>
                                            <p className="text-[10px] font-black text-indigo-200 uppercase tracking-[0.2em] mb-2">Requirement Forecast</p>
                                            <h4 className="text-xl font-black tracking-tight">{selectedLead.productInterest}</h4>
                                            <div className="mt-6 flex items-center justify-between"><div className="flex flex-col"><span className="text-[10px] font-black text-indigo-200 uppercase">Valuation</span><span className="text-2xl font-black">₹{(selectedLead.value || 0).toLocaleString('en-IN')}</span></div><div className="bg-white/20 p-2.5 rounded-[2rem] backdrop-blur-md border border-white/20"><Activity size={24}/></div></div>
                                        </section>

                                        <div className="grid grid-cols-2 gap-4">
                                            <button onClick={() => handleDraftEmail(selectedLead)} disabled={isGenerating} className="flex-1 py-4 bg-white border border-slate-300 rounded-[2rem] flex items-center justify-center gap-3 shadow-sm hover:border-indigo-300 transition-all group">{isGenerating ? <RefreshCw size={18} className="animate-spin text-indigo-600" /> : <Sparkles size={18} className="text-indigo-600 group-hover:scale-110 transition-transform" />}<span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Draft Pitch</span></button>
                                            <button onClick={() => handleConvertLead(selectedLead)} className="flex-1 py-4 bg-slate-950 text-white rounded-[2rem] flex items-center justify-center gap-3 shadow-xl hover:bg-black transition-all active:scale-95"><FileText size={18} className="text-emerald-400"/><span className="text-[10px] font-black uppercase tracking-widest">Quotation</span></button>
                                        </div>

                                        {emailDraft && (
                                            <div className="p-6 bg-indigo-50 border border-indigo-100 rounded-[2rem] animate-in zoom-in-95">
                                                <div className="flex justify-between items-center mb-4"><span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2"><Wand2 size={14}/> Intelligent Draft</span><button onClick={() => setEmailDraft('')} className="text-indigo-400 hover:text-indigo-600"><X size={16}/></button></div>
                                                <pre className="whitespace-pre-wrap font-sans text-[11px] font-bold text-indigo-900 leading-relaxed italic pr-2">{emailDraft}</pre>
                                                <button onClick={() => { navigator.clipboard.writeText(emailDraft); addNotification('Copied', 'Pitch draft copied to clipboard.', 'success'); }} className="w-full mt-6 py-3 bg-white border border-indigo-200 text-indigo-600 rounded-[2rem] text-[10px] font-black uppercase tracking-widest shadow-sm hover:shadow-md transition-all">Copy Pitch Material</button>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="space-y-8">
                                        <button onClick={() => setShowAddFollowUp(!showAddFollowUp)} className="w-full bg-slate-50 border border-slate-300 border-dashed py-5 rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-emerald-700 scale-95 hover:border-medical-300 hover:bg-medical-50/30 transition-all flex items-center justify-center gap-3"><Plus size={18} /> Schedule Touchpoint</button>
                                        
                                        {showAddFollowUp && (
                                            <div className="p-6 bg-white border border-slate-300 rounded-[2rem] shadow-2xl space-y-5 animate-in slide-in-from-top-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <FormRow label="Channel"><select className="w-full h-[40px] border border-slate-200 rounded-[2rem] px-4 text-[11px] font-black uppercase appearance-none" value={newFollowUp.type} onChange={e => setNewFollowUp({ ...newFollowUp, type: e.target.value as any })}><option>Call</option><option>Meeting</option><option>WhatsApp</option></select></FormRow>
                                                    <FormRow label="Schedule"><input type="date" className="w-full h-[40px] border border-slate-200 rounded-[2rem] px-4 text-[11px] font-black" value={newFollowUp.date} onChange={e => setNewFollowUp({ ...newFollowUp, date: e.target.value })} /></FormRow>
                                                </div>
                                                <FormRow label="Engagement Notes"><textarea className="w-full min-h-[80px] border border-slate-200 rounded-[2rem] px-4 py-2 text-[11px] font-bold outline-none focus:border-medical-500" placeholder="CONTEXT FOR NEXT TOUCHPOINT..." value={newFollowUp.notes || ''} onChange={e => setNewFollowUp({ ...newFollowUp, notes: e.target.value })} /></FormRow>
                                                <div className="flex gap-3"><button onClick={() => setShowAddFollowUp(false)} className="flex-1 py-3 bg-slate-50 text-slate-400 rounded-[2rem] text-[10px] font-black uppercase tracking-widest">Cancel</button><button onClick={handleAddFollowUp} className="flex-[2] py-3 bg-medical-600 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest shadow-lg shadow-medical-500/20">Commit Task</button></div>
                                            </div>
                                        )}

                                        <div className="space-y-4">
                                            {selectedLead.followUps?.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(fu => (
                                                <div key={fu.id} className={`p-6 rounded-[2rem] border transition-all ${fu.status === 'Completed' ? 'bg-slate-50 border-slate-200 opacity-60 grayscale' : 'bg-white border-slate-300 shadow-sm'}`}>
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className="flex items-center gap-3"><div className={`p-2 rounded-[2rem] ${fu.type === 'Call' ? 'bg-blue-50 text-blue-600' : fu.type === 'Meeting' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}><Zap size={14}/></div><span className="text-[10px] font-black uppercase tracking-widest text-slate-800">{fu.type}</span></div>
                                                        <span className="text-[10px] font-black text-slate-400">{fu.date}</span>
                                                    </div>
                                                    <p className="text-[13px] font-bold text-slate-600 leading-relaxed mb-6">{fu.notes}</p>
                                                    <button onClick={() => toggleFollowUpStatus(selectedLead.id, fu.id)} className={`w-full py-3 rounded-[2rem] text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${fu.status === 'Pending' ? 'bg-medical-50 text-medical-600 hover:bg-medical-600 hover:text-white' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}>{fu.status === 'Pending' ? <><CheckSquare size={14}/> Close Engagement</> : <><RefreshCw size={14}/> Reopen Task</>}</button>
                                                </div>
                                            ))}
                                            {(!selectedLead.followUps || selectedLead.followUps.length === 0) && (
                                                <div className="py-20 text-center opacity-20 flex flex-col items-center"><Zap size={48} className="mb-4 text-slate-300" /><p className="text-[10px] font-black uppercase tracking-[0.4em]">Chronology Empty</p></div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="p-6 bg-slate-50/50 border-t border-slate-300 shrink-0 flex gap-4">
                                <button onClick={() => handleDelete(selectedLead)} className="p-4 bg-white border border-rose-200 text-rose-500 rounded-[2rem] hover:bg-rose-50 transition-all shadow-sm"><Trash2 size={20}/></button>
                                {selectedLead.phone && (
                                    <a
                                        href={`https://wa.me/91${selectedLead.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hello ${selectedLead.name}, this is Sreemeditec regarding your interest in ${selectedLead.productInterest}.`)}`}
                                        target="_blank" rel="noreferrer"
                                        className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-[2rem] hover:bg-emerald-100 transition-all shadow-sm flex items-center justify-center"
                                        title="WhatsApp"
                                    >
                                        <Send size={20}/>
                                    </a>
                                )}
                                <button onClick={() => { setLead({ ...selectedLead }); setViewState('builder'); setBuilderMode('edit'); }} className="flex-1 py-4 bg-slate-800 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3"><Edit2 size={16}/> Modify Profile</button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {viewState === 'today' && (
                <div className="flex-1 min-w-0 bg-white rounded-[2.5rem] border border-slate-300 shadow-sm overflow-hidden flex flex-col animate-in fade-in animate-duration-300">
                    <div className="p-6 border-b border-slate-300 bg-slate-50 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white shadow-sm border border-slate-200 text-slate-800">
                                <Calendar size={20} />
                            </div>
                            <div className="flex flex-col">
                                <h3 className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest leading-none mb-1">Today's Scheduled Engagements</h3>
                                <p className="text-2xl font-playfair font-bold tracking-tight text-slate-800 leading-none">
                                    {todayTouchpoints.filter(t => t.followUp.status === 'Pending').length} Pending / {todayTouchpoints.length} Total
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto custom-scrollbar p-6">
                        {todayTouchpoints.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {todayTouchpoints.map(({ lead: l, followUp: fu }) => (
                                    <div key={fu.id} className={`p-6 rounded-[2rem] border transition-all flex flex-col justify-between ${fu.status === 'Completed' ? 'bg-slate-50 border-slate-200 opacity-60 grayscale' : 'bg-white border-slate-300 shadow-sm hover:border-medical-300'}`}>
                                        <div>
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-[2rem] ${fu.type === 'Call' ? 'bg-blue-50 text-blue-600' : fu.type === 'Meeting' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                        <Zap size={14}/>
                                                    </div>
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-800">{fu.type}</span>
                                                </div>
                                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${fu.status === 'Completed' ? 'bg-slate-200 text-slate-500' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>{fu.status}</span>
                                            </div>

                                            <div className="mb-4">
                                                <h4 className="font-black text-slate-800 uppercase text-[13px] tracking-tight">{l.name}</h4>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{l.hospital}</p>
                                            </div>

                                            <p className="text-xs font-semibold text-slate-600 leading-relaxed mb-6 bg-slate-50 p-3.5 rounded-[2rem] border border-slate-100">{fu.notes}</p>
                                        </div>

                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => toggleFollowUpStatus(l.id, fu.id)} 
                                                className={`flex-1 py-2.5 rounded-[2rem] text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${fu.status === 'Pending' ? 'bg-medical-50 text-medical-600 hover:bg-medical-600 hover:text-white' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}
                                            >
                                                {fu.status === 'Pending' ? <><CheckSquare size={12}/> Complete</> : <><RefreshCw size={12}/> Reopen</>}
                                            </button>

                                            {l.phone && (
                                                <a
                                                    href={`https://wa.me/91${l.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hello ${l.name}, this is Sreemeditec following up regarding ${l.productInterest}.`)}`}
                                                    target="_blank" rel="noreferrer"
                                                    className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-[2rem] hover:bg-emerald-100 transition-all shadow-sm flex items-center justify-center"
                                                    title="WhatsApp"
                                                >
                                                    <Send size={14}/>
                                                </a>
                                            )}

                                            <button 
                                                onClick={() => { setSelectedLead(l); setViewState('stock'); }}
                                                className="p-2.5 bg-slate-100 border border-slate-200 text-slate-600 rounded-[2rem] hover:bg-slate-250 hover:text-slate-800 transition-all shadow-sm flex items-center justify-center"
                                                title="View Profile"
                                            >
                                                <User size={14}/>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-40 text-center opacity-20 flex flex-col items-center justify-center animate-in fade-in">
                                <Calendar size={48} className="mb-4 text-slate-300" />
                                <p className="text-[10px] font-black uppercase tracking-[0.4em]">No Touchpoints Scheduled for Today</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {viewState === 'builder' && (
                <div className="flex-1 min-w-0 flex flex-col bg-white rounded-2xl md:rounded-[2.5rem] shadow-2xl border border-slate-300 overflow-hidden animate-in slide-in-from-bottom-6 duration-300">
                    <div className="flex bg-slate-50/80 backdrop-blur-sm border-b border-slate-300 shrink-0 px-4 md:px-10 py-4 md:py-6 justify-between items-center">
                        <div className="flex flex-col">
                            <h3 className="text-lg md:text-2xl font-black text-slate-800 uppercase tracking-tight">
                                {builderMode === 'add' ? 'Manual Opportunity Entry' : 'Evolve Lead Profile'}
                            </h3>
                            <p className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 md:mt-1">
                                Synchronizing pipeline with cloud terminal
                            </p>
                        </div>
                        <button onClick={() => setViewState('stock')} className="p-2 md:p-3 bg-white text-slate-400 rounded-full md:rounded-[2rem] hover:text-slate-600 transition-all border border-slate-200 shadow-sm">
                            <X className="size-[18px] md:size-6" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 md:p-10 space-y-6 md:space-y-12 custom-scrollbar pb-24 md:pb-32">
                        <section className="space-y-4 md:space-y-6">
                            <h3 className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] md:tracking-[0.4em] border-b border-slate-100 pb-1.5 md:pb-2 flex items-center gap-2">
                                <Building2 size={14} className="text-medical-500" />1. Lead Identity Node
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                                <div className="sm:col-span-2">
                                    <FormRow label="Contact / Entity Name *">
                                        <AutoSuggest
                                            value={lead.name || ''}
                                            onChange={val => handleSelectClient('name', val.toUpperCase())}
                                            onSelect={client => handleSelectClient('name', client.name.toUpperCase())}
                                            suggestions={clients}
                                            filterKey="name"
                                            className="w-full h-[40px] md:h-[48px] bg-slate-50 border border-slate-300 rounded-[1rem] md:rounded-[2rem] px-3.5 md:px-5 text-xs md:text-sm font-black outline-none focus:ring-4 focus:ring-medical-500/5 uppercase"
                                            placeholder="ENTER NAME"
                                        />
                                    </FormRow>
                                </div>
                                <div className="sm:col-span-2">
                                    <FormRow label="Hospital / Organization *">
                                        <AutoSuggest
                                            value={lead.hospital || ''}
                                            onChange={val => handleSelectClient('hospital', val)}
                                            onSelect={client => handleSelectClient('hospital', client.hospital || '')}
                                            suggestions={clients}
                                            filterKey="hospital"
                                            className="w-full h-[40px] md:h-[48px] bg-slate-50 border border-slate-300 rounded-[1rem] md:rounded-[2rem] px-3.5 md:px-5 text-xs md:text-sm font-bold outline-none"
                                            placeholder="FACILITY NAME"
                                        />
                                    </FormRow>
                                </div>
                                <div className="sm:col-span-4">
                                    <FormRow label="Geographical Location / Address">
                                        <textarea 
                                            className="w-full min-h-[60px] md:min-h-[80px] bg-white border border-slate-300 rounded-[1rem] md:rounded-[2rem] px-3.5 md:px-5 py-2.5 md:py-3 text-xs md:text-sm font-bold outline-none focus:border-medical-500" 
                                            placeholder="PHYSICAL LOCATION DATA" 
                                            value={lead.address || ''} 
                                            onChange={e => setLead({...lead, address: e.target.value})} 
                                        />
                                    </FormRow>
                                </div>
                            </div>
                        </section>

                        <section className="space-y-4 md:space-y-6">
                            <h3 className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] md:tracking-[0.4em] border-b border-slate-100 pb-1.5 md:pb-2 flex items-center gap-2">
                                <DollarSign size={14} className="text-medical-500" />2. Opportunity Intelligence
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                                <FormRow label="Acquisition Source">
                                    <select 
                                        className="w-full h-[40px] md:h-[48px] bg-white border border-slate-300 rounded-[1rem] md:rounded-[2rem] px-3.5 md:px-5 text-[11px] md:text-xs font-black uppercase appearance-none" 
                                        value={lead.source} 
                                        onChange={e => setLead({...lead, source: e.target.value as any})}
                                    >
                                        <option>Website</option>
                                        <option>Amazon</option>
                                        <option>Flipkart</option>
                                        <option>Referral</option>
                                        <option>Direct</option>
                                        <option>Sales</option>
                                        <option>IndiaMART</option>
                                    </select>
                                </FormRow>
                                <FormRow label="Pipeline Status">
                                    <select 
                                        className="w-full h-[40px] md:h-[48px] bg-white border border-slate-300 rounded-[1rem] md:rounded-[2rem] px-3.5 md:px-5 text-[11px] md:text-xs font-black uppercase appearance-none" 
                                        value={lead.status} 
                                        onChange={e => setLead({...lead, status: e.target.value as any})}
                                    >
                                        {Object.values(LeadStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </FormRow>
                                <div className="sm:col-span-2">
                                    <FormRow label="Product Interest / Requirement">
                                        <AutoSuggest
                                            value={lead.productInterest || ''}
                                            onChange={val => setLead({...lead, productInterest: val})}
                                            onSelect={prod => setLead({...lead, productInterest: prod.name})}
                                            suggestions={products}
                                            filterKey="name"
                                            className="w-full h-[40px] md:h-[48px] bg-white border border-slate-300 rounded-[1rem] md:rounded-[2rem] px-3.5 md:px-5 text-xs md:text-sm font-black uppercase font-mono"
                                            placeholder="WHAT ARE THEY LOOKING FOR?"
                                        />
                                    </FormRow>
                                </div>
                                <FormRow label="Valuation Target (₹)">
                                    <input 
                                        type="number" 
                                        className="w-full h-[40px] md:h-[48px] bg-white border border-slate-300 rounded-[1rem] md:rounded-[2rem] px-3.5 md:px-5 text-xs md:text-sm font-black" 
                                        placeholder="0.00" 
                                        value={lead.value || ''} 
                                        onChange={e => setLead({...lead, value: Number(e.target.value)})} 
                                    />
                                </FormRow>
                                <FormRow label="Handled By">
                                    <div className="relative w-full">
                                        <input 
                                            type="text" 
                                            className="w-full h-[40px] md:h-[48px] bg-white border border-slate-300 rounded-[1rem] md:rounded-[2rem] px-3.5 md:px-5 text-[11px] md:text-xs font-black uppercase" 
                                            placeholder="SEARCH AGENT" 
                                            value={lead.salesTakenBy || ''} 
                                            onChange={e => { setLead({...lead, salesTakenBy: e.target.value}); setShowEmpDropdown(true); }} 
                                            onFocus={() => setShowEmpDropdown(true)} 
                                            onBlur={() => setTimeout(() => setShowEmpDropdown(false), 200)} 
                                        />
                                        {showEmpDropdown && lead.salesTakenBy && (
                                            <div className="absolute z-[130] top-full left-0 w-full mt-1 bg-white border border-slate-300 rounded-[1rem] shadow-2xl overflow-hidden animate-in fade-in">
                                                {employees.filter(emp => emp.name.toLowerCase().includes(lead.salesTakenBy!.toLowerCase())).slice(0, 5).map(emp => (
                                                    <button key={emp.id} className="w-full text-left px-4 py-2.5 hover:bg-medical-50 border-b border-slate-100 last:border-0 transition-colors" onClick={() => { setLead({...lead, salesTakenBy: emp.name}); setShowEmpDropdown(false); }}>
                                                        <div className="text-[10px] font-black text-slate-800 uppercase tracking-tighter">{emp.name}</div>
                                                        <div className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">{emp.department}</div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </FormRow>
                            </div>
                        </section>

                        <section className="space-y-4 md:space-y-6">
                            <h3 className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] md:tracking-[0.4em] border-b border-slate-100 pb-1.5 md:pb-2 flex items-center gap-2">
                                <Phone size={14} className="text-medical-500" />3. Communication Node
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                                <FormRow label="Primary Point of Contact">
                                    <input 
                                        type="text" 
                                        className="w-full h-[40px] md:h-[48px] bg-white border border-slate-300 rounded-[1rem] md:rounded-[2rem] px-3.5 md:px-5 text-xs md:text-sm font-bold uppercase" 
                                        placeholder="MANAGER NAME" 
                                        value={lead.contactPerson || ''} 
                                        onChange={e => setLead({...lead, contactPerson: e.target.value})} 
                                    />
                                </FormRow>
                                <FormRow label="Mobile / WhatsApp">
                                    <input 
                                        type="text" 
                                        className="w-full h-[40px] md:h-[48px] bg-white border border-slate-300 rounded-[1rem] md:rounded-[2rem] px-3.5 md:px-5 text-xs md:text-sm font-black font-mono" 
                                        placeholder="+91" 
                                        value={lead.phone || ''} 
                                        onChange={e => setLead({...lead, phone: e.target.value})} 
                                    />
                                </FormRow>
                                <div className="sm:col-span-2">
                                    <FormRow label="Email Address">
                                        <input 
                                            type="email" 
                                            className="w-full h-[40px] md:h-[48px] bg-white border border-slate-300 rounded-[1rem] md:rounded-[2rem] px-3.5 md:px-5 text-xs md:text-sm font-bold lowercase" 
                                            placeholder="CLIENT@DOMAIN.COM" 
                                            value={lead.email || ''} 
                                            onChange={e => setLead({...lead, email: e.target.value})} 
                                        />
                                    </FormRow>
                                </div>
                            </div>
                        </section>
                    </div>

                    <div className="sticky bottom-0 left-0 right-0 p-4 md:p-6 bg-white/95 backdrop-blur-md border-t border-slate-200 flex justify-end gap-3 md:gap-4 shadow-[0_-15px_30px_rgba(0,0,0,0.06)] z-30 shrink-0 px-4 md:px-10">
                        <button onClick={() => { setViewState('stock'); setLead(DEFAULT_LEAD); }} className="px-6 md:px-10 py-3 md:py-4 bg-slate-100 text-slate-500 rounded-[1.5rem] md:rounded-[2rem] font-black text-[9px] md:text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all border border-slate-200">
                            Abort Registry
                        </button>
                        <button onClick={handleSave} className="px-10 md:px-16 py-3 md:py-4 bg-gradient-to-r from-medical-600 to-indigo-500 text-white rounded-[1.5rem] md:rounded-[2rem] font-black text-[10px] md:text-[11px] uppercase tracking-widest shadow-2xl shadow-medical-500/40 active:scale-95 transition-all hover:brightness-110">
                            Commit Opportunity
                        </button>
                    </div>
                </div>
            )}


        </div>
    );
};
