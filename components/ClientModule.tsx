import React, { useState, useMemo } from 'react';
import { Client } from '../types';
import { 
    Users, Search, MapPin, Phone, Mail, FileText, 
    ArrowUpRight, X, Building2, Wallet, Lock, 
    Trash2, RefreshCw, AlertTriangle, CreditCard,
    ShieldCheck, Globe, Info, Edit2, List, MoreVertical, Plus
} from 'lucide-react';
import { useData } from './DataContext';

const FormRow = ({ label, children }: { label: string, children?: React.ReactNode }) => (
    <div className="flex flex-col gap-1.5 w-full">
        <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest px-1 truncate whitespace-nowrap min-h-[14px]">{label}</label>
        {children}
    </div>
);

const formatIndianNumber = (num: number) => {
  return num.toLocaleString('en-IN', { maximumFractionDigits: 2 });
};

export const ClientModule: React.FC = () => {
    const { clients, invoices, addClient, updateClient, removeClient, addNotification, showConfirm } = useData();
    const [viewState, setViewState] = useState<'stock' | 'builder'>('stock');
    const [builderMode, setBuilderMode] = useState<'add' | 'edit'>('add');
    const [searchQuery, setSearchQuery] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<{ id: string, name: string } | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);

    const DEFAULT_CLIENT: Partial<Client> = {
        name: '',
        hospital: '',
        address: '',
        gstin: '',
        email: '',
        phone: '',
        cinNo: '',
        panNo: '',
        dlNo: '',
        udyamNo: '',
        status: 'Finalized'
    };

    const [client, setClient] = useState<Partial<Client>>(DEFAULT_CLIENT);

    const verifyPassword = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (password === 'admin') setIsAuthenticated(true);
        else { addNotification('Access Denied', 'Incorrect security password.', 'alert'); setPassword(''); }
    };

    const getClientTotalRevenue = (clientName: string) => {
        const target = clientName.toLowerCase().trim();
        return invoices
            .filter(inv => (inv.customerName || '').toLowerCase().trim() === target && inv.documentType !== 'Quotation')
            .reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
    };

    const filteredClients = useMemo(() => {
        const lowQuery = searchQuery.toLowerCase();
        return clients
            .filter(c => 
                (c.name || '').toLowerCase().includes(lowQuery) || 
                (c.id || '').toLowerCase().includes(lowQuery) ||
                (c.hospital || '').toLowerCase().includes(lowQuery)
            )
            .sort((a, b) => {
                const ltvA = getClientTotalRevenue(a.name);
                const ltvB = getClientTotalRevenue(b.name);
                if (ltvB !== ltvA) return ltvB - ltvA;
                return (a.name || '').localeCompare(b.name || '');
            });
    }, [clients, searchQuery, invoices]);
    if (!isAuthenticated) {
        return (
            <div className="h-full flex items-center justify-center bg-slate-50 p-4 animate-in fade-in">
                <div className="max-w-md w-full bg-gradient-to-br from-emerald-950 to-green-900 rounded-[2.5rem] shadow-[0_20px_40px_-10px_rgba(4,47,46,0.5)] border border-emerald-800/30 p-10 text-center scale-100 animate-in zoom-in-95 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none rounded-[2.5rem]"></div>
                    <div className="w-24 h-24 bg-emerald-900/60 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-[#d4af37] shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] border border-emerald-700/50 relative z-10"><Lock size={48} /></div>
                    <h2 className="text-2xl font-playfair font-bold tracking-widest text-white mb-3 uppercase relative z-10 px-2">Client DB Locked</h2>
                    <p className="text-emerald-100/80 text-[11px] md:text-xs font-semibold leading-relaxed">System privileges required to access client registry.</p>
                    <form onSubmit={verifyPassword} className="space-y-4 relative z-10">
                        <input type="password" placeholder="ENTER ACCESS KEY" className="w-full px-6 py-5 bg-emerald-900/40 border border-emerald-700/50 text-white placeholder-emerald-100/30 rounded-[2rem] outline-none focus:border-[#d4af37]/60 focus:bg-emerald-900/60 font-bold text-center tracking-[0.5em] transition-all shadow-inner" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
                        <button type="submit" className="w-full bg-gradient-to-r from-[#c5a059] to-[#e5c185] text-amber-950 font-black py-5 rounded-[2rem] shadow-[0_15px_30px_-5px_rgba(197,160,89,0.4)] uppercase tracking-[0.2em] text-xs hover:scale-[1.02] transition-all active:scale-95 border border-[#d4af37]/40">Authorize Access</button>
                    </form>
                </div>
            </div>
        );
    }

    const handleSave = async () => {
        if (!client.name || !client.address) {
            addNotification('Validation Error', 'Name and Address are required.', 'alert');
            return;
        }

        const finalData: Client = {
            ...client as Client,
            id: editingId || `CLI-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
            status: client.status || 'Finalized'
        };

        // Duplicate detection (safe against undefined/null name or phone values)
        const isDuplicate = clients.some(c => 
            (c.id !== finalData.id) && 
            ((finalData.phone && c.phone && c.phone === finalData.phone) || 
             (finalData.name && c.name && c.name.toLowerCase().trim() === finalData.name.toLowerCase().trim()))
        );
        if (isDuplicate) {
            const confirmed = await showConfirm(`A client with name "${finalData.name}" or phone "${finalData.phone}" already exists. Save anyway?`, "Duplicate Detected");
            if (!confirmed) return;
        }

        try {
            if (editingId) {
                await updateClient(editingId, finalData);
                addNotification('Registry Updated', `"${finalData.name}" record modified.`, 'success');
            } else {
                await addClient(finalData);
                addNotification('Client Indexed', `"${finalData.name}" added to cloud.`, 'success');
            }
            setViewState('stock');
            setEditingId(null);
            setClient(DEFAULT_CLIENT);
        } catch (error: any) {
            console.error("Failed to save client:", error);
            addNotification('Database Error', `Could not save client record: ${error.message || error}`, 'alert');
        }
    };

    const performDelete = async () => {
        if (!pendingDelete) return;
        setIsDeleting(true);
        try {
            await removeClient(pendingDelete.id);
            addNotification('Registry Purged', `Record for ${pendingDelete.name} removed.`, 'warning');
            setPendingDelete(null);
        } catch (err) {
            addNotification('Database Error', 'Could not delete record.', 'alert');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="h-full flex flex-col gap-4 overflow-hidden p-2">
            {viewState === 'stock' ? (
                <div className="flex-1 flex flex-col gap-4 overflow-hidden animate-in fade-in">
                    {/* Unified Green Gradient Toolbar */}
                    <div className="bg-gradient-to-br from-emerald-950 to-green-900 p-4 md:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-[0_20px_40px_-10px_rgba(4,47,46,0.5)] border border-emerald-800/30 shrink-0 relative z-20 m-1 md:m-3 lg:m-4 rounded-[1.5rem] md:rounded-[2rem]">
                        <div className="hidden sm:flex items-center gap-4 group">
                            <div className="w-10 h-10 xl:w-12 xl:h-12 flex items-center justify-center text-[#c5a059] drop-shadow-md transition-transform group-hover:scale-110 shrink-0"><Users size={20} /></div>
                            <div className="flex flex-col">
                                <h2 className="text-lg xl:text-xl font-playfair font-bold tracking-tight text-white uppercase leading-none whitespace-nowrap">Client Database</h2>
                                <p className="text-emerald-100/80 text-[11px] md:text-xs font-semibold leading-relaxed">{clients.length} Indexed Entities</p>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                            <div className="relative w-full sm:w-72">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-100/50" size={16} />
                                <input type="text" placeholder="Search registry..." className="w-full bg-emerald-900/40 border border-emerald-700/50 text-white placeholder-emerald-100/50 rounded-[2rem] py-3 md:py-2.5 pl-11 pr-4 text-[11px] font-bold outline-none focus:border-emerald-400 focus:bg-emerald-900/60 transition-all uppercase placeholder:normal-case shadow-inner" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                            </div>
                            <button onClick={() => { setEditingId(null); setViewState('builder'); setBuilderMode('add'); setClient(DEFAULT_CLIENT); }} className="w-full sm:w-auto bg-gradient-to-r from-[#c5a059] to-[#e5c185] text-amber-950 px-7 py-3 md:py-2.5 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.15em] shadow-[0_15px_30px_-5px_rgba(197,160,89,0.4)] hover:scale-[1.02] hover:shadow-[0_20px_40px_-5px_rgba(197,160,89,0.6)] transition-all active:scale-95 flex items-center justify-center gap-2 shrink-0"><Plus size={16} /> New Client</button>
                        </div>
                    </div>
                    
                    <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-300 shadow-sm overflow-hidden flex flex-col">
                        <div className="flex-1 overflow-x-auto custom-scrollbar">
                            <table className="w-full min-w-[800px] text-left text-[11px]">
                            <thead className="bg-slate-50 sticky top-0 z-10 font-semibold uppercase text-[9px] text-slate-500 border-b tracking-widest shadow-[0_1px_0_0_#f1f5f9]">
                                <tr>
                                    <th className="px-4 py-2.5 w-12 text-center">S.No</th>
                                    <th className="px-4 py-2.5">Entity Identification</th>
                                    <th className="px-4 py-2.5">Facility / Hospital</th>
                                    <th className="px-4 py-2.5 text-right">LTV Value</th>
                                    <th className="px-4 py-2.5 text-right">Status</th>
                                    <th className="px-4 py-2.5 text-right">Management</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredClients.map((c, idx) => (
                                    <tr key={c.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => { setClient(c); setEditingId(c.id); setViewState('builder'); setBuilderMode('edit'); }}>
                                        <td className="px-4 py-3 md:px-8 md:py-6 font-semibold text-slate-400 text-center w-12">{idx + 1}</td>
                                        <td className="px-4 py-3 md:px-8 md:py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-[2rem] bg-slate-100 border border-slate-200 flex shrink-0 items-center justify-center font-semibold text-slate-400 uppercase text-xs md:text-[14px]">{c.name.charAt(0)}</div>
                                                <div>
                                                    <div className="font-lato font-semibold text-slate-800 uppercase text-[11px] md:text-[13px] tracking-tight leading-tight">{c.name}</div>
                                                    <div className="text-[8px] md:text-[10px] text-slate-400 font-medium uppercase tracking-widest mt-0.5">{c.id}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 md:px-8 md:py-6">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[8px] md:text-[10px] font-semibold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 md:px-3 md:py-1 rounded border border-emerald-100 w-fit">{c.hospital || 'Private Healthcare'}</span>
                                                <div className="text-[8px] md:text-[9px] text-slate-400 font-medium flex items-center gap-1"><MapPin size={10} /> {c.address.slice(0, 40)}...</div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 md:px-8 md:py-6 text-right font-semibold text-emerald-700 text-[12px] md:text-[14px]">₹{formatIndianNumber(getClientTotalRevenue(c.name))}</td>
                                        <td className="px-4 py-3 md:px-8 md:py-6 text-right">
                                            <span className={`text-[8px] md:text-[9px] font-semibold uppercase tracking-widest px-2 py-1 md:px-3 md:py-1 rounded-lg border ${c.status === 'Draft' ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-emerald-50 border-emerald-200 text-emerald-600'}`}>{c.status || 'Finalized'}</span>
                                        </td>
                                        <td className="px-4 py-3 md:px-8 md:py-6 text-right">
                                            <div className="flex justify-end items-center gap-2 md:gap-4 md:opacity-0 group-hover:opacity-100 transition-all md:translate-x-2 group-hover:translate-x-0">
                                                <button onClick={(e) => { e.stopPropagation(); setPendingDelete({ id: c.id, name: c.name }); }} className="p-2 md:p-2.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-[2rem] transition-all border border-transparent hover:border-rose-100"><Trash2 size={14} className="md:w-4 md:h-4" /></button>
                                                <div className="p-2 md:p-2.5 text-emerald-600 bg-emerald-50 rounded-[2rem] border border-emerald-100"><Edit2 size={14} className="md:w-4 md:h-4" /></div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredClients.length === 0 && (
                                    <tr><td colSpan={6} className="py-20 md:py-40 text-center text-slate-300 font-semibold uppercase tracking-[0.5em] opacity-30 italic">No Registry Found</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col bg-white rounded-[2.5rem] shadow-2xl border border-slate-300 overflow-hidden animate-in slide-in-from-bottom-6 duration-300">
                    <div className="flex bg-slate-50/80 backdrop-blur-sm border-b border-slate-300 shrink-0 px-4 sm:px-6 lg:px-10 py-3 md:py-6 justify-between items-center gap-3">
                        <div className="flex flex-col"><h3 className="font-playfair text-lg md:text-2xl font-black tracking-tight text-slate-800 uppercase tracking-tight leading-tight">{builderMode === 'add' ? 'Entity Intake Form' : 'Update Client Record'}</h3><p className="text-[8px] md:text-[10px] font-medium text-slate-400 uppercase tracking-widest mt-0.5 md:mt-1 leading-tight">{builderMode === 'add' ? 'Synchronizing with cloud registry' : `Modifying ${client.name}`}</p></div>
                        <button onClick={() => setViewState('stock')} className="p-2 md:p-3 shrink-0 bg-white text-slate-400 rounded-[2rem] hover:text-slate-600 transition-all border border-slate-200 shadow-sm"><X className="w-4 h-4 md:w-6 md:h-6"/></button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 space-y-6 md:space-y-12 custom-scrollbar pb-24 md:pb-32">
                        <section className="space-y-3 md:space-y-4">
                            <h3 className="text-[9px] md:text-[10px] font-semibold text-slate-400 uppercase tracking-[0.4em] border-b border-slate-100 pb-2 flex items-center gap-2"><Building2 size={14} className="text-emerald-500" />1. Legal Entity Profiling</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-3">
                                <div className="sm:col-span-2"><FormRow label="Entity Name *"><input type="text" className="w-full h-[32px] md:h-[36px] bg-slate-50 border border-slate-300 rounded-xl md:rounded-[2rem] px-3 text-[10px] md:text-xs font-semibold outline-none focus:ring-4 focus:ring-emerald-500/5 uppercase" placeholder="NAME OF THE CLIENT" value={client.name || ''} onChange={e => setClient({...client, name: e.target.value.toUpperCase()})} /></FormRow></div>
                                <div className="sm:col-span-2"><FormRow label="Facility / Hospital Name"><input type="text" className="w-full h-[32px] md:h-[36px] bg-slate-50 border border-slate-300 rounded-xl md:rounded-[2rem] px-3 text-[10px] md:text-xs font-medium outline-none uppercase" placeholder="HOSPITAL NAME" value={client.hospital || ''} onChange={e => setClient({...client, hospital: e.target.value})} /></FormRow></div>
                                <div className="col-span-1 sm:col-span-4"><FormRow label="Physical / Registration Address *"><textarea className="w-full min-h-[60px] md:min-h-[100px] bg-white border border-slate-300 rounded-xl md:rounded-[2rem] px-3 py-2 text-[10px] md:text-sm font-medium outline-none focus:border-emerald-500" placeholder="FULL REGISTERED ADDRESS" value={client.address || ''} onChange={e => setClient({...client, address: e.target.value})} /></FormRow></div>
                            </div>
                        </section>

                        <section className="space-y-3 md:space-y-4">
                            <h3 className="text-[9px] md:text-[10px] font-semibold text-slate-400 uppercase tracking-[0.4em] border-b border-slate-100 pb-2 flex items-center gap-2"><ShieldCheck size={14} className="text-emerald-500" />2. Statutory Compliance</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-3">
                                <FormRow label="GSTIN Number"><input type="text" className="w-full h-[32px] md:h-[36px] bg-white border border-slate-300 rounded-xl md:rounded-[2rem] px-2 md:px-3 text-[10px] md:text-xs font-semibold font-mono uppercase" placeholder="GST NUMBER" value={client.gstin || ''} onChange={e => setClient({...client, gstin: e.target.value.toUpperCase()})} /></FormRow>
                                <FormRow label="PAN Number"><input type="text" className="w-full h-[32px] md:h-[36px] bg-white border border-slate-300 rounded-xl md:rounded-[2rem] px-2 md:px-3 text-[10px] md:text-xs font-semibold font-mono uppercase" placeholder="PAN NUMBER" value={client.panNo || ''} onChange={e => setClient({...client, panNo: e.target.value.toUpperCase()})} /></FormRow>
                                <FormRow label="DL Number"><input type="text" className="w-full h-[32px] md:h-[36px] bg-white border border-slate-300 rounded-xl md:rounded-[2rem] px-2 md:px-3 text-[10px] md:text-xs font-semibold font-mono uppercase" placeholder="DRUG LICENSE" value={client.dlNo || ''} onChange={e => setClient({...client, dlNo: e.target.value.toUpperCase()})} /></FormRow>
                                <FormRow label="UDYAM Number"><input type="text" className="w-full h-[32px] md:h-[36px] bg-white border border-slate-300 rounded-xl md:rounded-[2rem] px-2 md:px-3 text-[10px] md:text-xs font-semibold font-mono uppercase" placeholder="UDYAM ID" value={client.udyamNo || ''} onChange={e => setClient({...client, udyamNo: e.target.value.toUpperCase()})} /></FormRow>
                                <FormRow label="CIN Number"><input type="text" className="w-full h-[32px] md:h-[36px] bg-white border border-slate-300 rounded-xl md:rounded-[2rem] px-2 md:px-3 text-[10px] md:text-xs font-semibold font-mono uppercase" placeholder="CIN NUMBER" value={client.cinNo || ''} onChange={e => setClient({...client, cinNo: e.target.value.toUpperCase()})} /></FormRow>
                                <FormRow label="Registry Status"><select className="w-full h-[32px] md:h-[36px] bg-white border border-slate-300 rounded-xl md:rounded-[2rem] px-2 md:px-3 text-[10px] md:text-xs font-semibold uppercase appearance-none" value={client.status} onChange={e => setClient({...client, status: e.target.value as any})}><option>Finalized</option><option>Draft</option></select></FormRow>
                            </div>
                        </section>

                        <section className="space-y-3 md:space-y-4">
                            <h3 className="text-[9px] md:text-[10px] font-semibold text-slate-400 uppercase tracking-[0.4em] border-b border-slate-100 pb-2 flex items-center gap-2"><Globe size={14} className="text-emerald-500" />3. Communication Node</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-3">
                                <div className="sm:col-span-2">
                                    <FormRow label="Email Address(es)">
                                        <input type="text" className="w-full h-[32px] md:h-[36px] bg-white border border-slate-300 rounded-xl md:rounded-[2rem] px-3 text-[10px] md:text-xs font-medium uppercase" placeholder="client@facility.com, info@facility.com" value={client.email || ''} onChange={e => setClient({...client, email: e.target.value})} />
                                        <span className="text-[8px] text-slate-400 font-bold px-1 uppercase tracking-tighter">Separate multiple emails with commas</span>
                                    </FormRow>
                                </div>
                                <div className="sm:col-span-2">
                                    <FormRow label="Phone / Mobile Number(s)">
                                        <input type="text" className="w-full h-[32px] md:h-[36px] bg-white border border-slate-300 rounded-xl md:rounded-[2rem] px-3 text-[10px] md:text-xs font-semibold font-mono" placeholder="9876543210, 8765432109" value={client.phone || ''} onChange={e => setClient({...client, phone: e.target.value})} />
                                        <span className="text-[8px] text-slate-400 font-bold px-1 uppercase tracking-tighter">Separate multiple numbers with commas</span>
                                    </FormRow>
                                </div>
                            </div>
                        </section>
                    </div>

                    <div className="sticky bottom-0 left-0 right-0 p-3 sm:p-6 bg-white/95 backdrop-blur-md border-t border-slate-200 flex justify-end gap-2 md:gap-4 shadow-[0_-15px_30px_rgba(0,0,0,0.06)] z-30 shrink-0">
                        <button onClick={() => { setViewState('stock'); setEditingId(null); }} className="flex-1 sm:flex-none px-4 py-3 md:px-10 md:py-4 bg-slate-100 text-slate-500 rounded-xl md:rounded-[2rem] font-semibold text-[9px] md:text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all border border-slate-200 shadow-inner">Abort</button>
                        <button onClick={handleSave} className="flex-[2] sm:flex-none px-6 py-3 md:px-16 md:py-4 bg-gradient-to-br from-emerald-800 to-emerald-600 text-white rounded-xl md:rounded-[2rem] font-bold text-[9px] md:text-[10px] uppercase tracking-widest shadow-[0_8px_16px_-4px_rgba(16,185,129,0.3)] active:scale-95 transition-all hover:scale-105">{editingId ? 'Modify Record' : 'Authorize Entry'}</button>
                    </div>
                </div>
            )}

            {pendingDelete && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-in fade-in">
                    <div className="bg-white rounded-[1.5rem] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] max-w-sm w-full p-6 text-center scale-100 animate-in zoom-in-95 border border-slate-200/50">
                        <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 border border-rose-100 shadow-xl shadow-rose-500/10"><AlertTriangle size={40} /></div>
                        <h3 className="text-2xl font-playfair font-bold tracking-tight text-slate-800 uppercase tracking-tight">Purge Entity?</h3>
                        <p className="text-slate-500 text-[13px] font-medium uppercase tracking-widest mt-3 leading-relaxed">Permanently remove <b className="text-slate-800">{pendingDelete.name}</b>? System integrity will be impacted.</p>
                        <div className="flex gap-4 mt-10">
                            <button onClick={() => setPendingDelete(null)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-[2rem] font-semibold text-[10px] uppercase tracking-widest border border-slate-200">Cancel</button>
                            <button onClick={performDelete} disabled={isDeleting} className="flex-1 py-4 bg-rose-600 text-white rounded-[2rem] font-semibold text-[10px] uppercase tracking-widest shadow-xl shadow-rose-500/20 active:scale-95 transition-all">{isDeleting ? <RefreshCw className="animate-spin mx-auto" size={18} /> : "Purge Record"}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
