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
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 truncate whitespace-nowrap min-h-[14px]">{label}</label>
        {children}
    </div>
);

const formatIndianNumber = (num: number) => {
    if (num >= 10000000) return (num / 10000000).toFixed(2) + 'Cr';
    if (num >= 100000) return (num / 100000).toFixed(2) + 'L';
    if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
    return num.toLocaleString('en-IN');
};

export const ClientModule: React.FC = () => {
    const { clients, invoices, addClient, updateClient, removeClient, addNotification } = useData();
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

    const filteredClients = useMemo(() => {
        const lowQuery = searchQuery.toLowerCase();
        return clients.filter(c => 
            (c.name || '').toLowerCase().includes(lowQuery) || 
            (c.id || '').toLowerCase().includes(lowQuery) ||
            (c.hospital || '').toLowerCase().includes(lowQuery)
        );
    }, [clients, searchQuery]);

    if (!isAuthenticated) {
        return (
            <div className="h-full flex items-center justify-center bg-slate-50 p-4 animate-in fade-in">
                <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 p-10 text-center scale-100 animate-in zoom-in-95">
                    <div className="w-24 h-24 bg-medical-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-medical-600 shadow-xl shadow-medical-500/10 border border-medical-100"><Lock size={48} /></div>
                    <h2 className="text-2xl font-black text-slate-800 mb-3 uppercase tracking-tight">Vault Protected</h2>
                    <p className="text-slate-500 mb-10 text-xs font-bold uppercase tracking-widest leading-relaxed">System privileges required to access client registry.</p>
                    <form onSubmit={verifyPassword} className="space-y-4">
                        <input type="password" placeholder="ENTER ACCESS KEY" className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-medical-500 focus:ring-4 focus:ring-medical-500/5 font-black text-center tracking-[0.5em] transition-all" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
                        <button type="submit" className="w-full bg-medical-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-medical-500/20 uppercase tracking-[0.2em] text-xs hover:bg-medical-700 transition-all active:scale-95">Authorize Access</button>
                    </form>
                </div>
            </div>
        );
    }

    const getClientTotalRevenue = (clientName: string) => {
        const target = clientName.toLowerCase().trim();
        return invoices
            .filter(inv => (inv.customerName || '').toLowerCase().trim() === target && inv.documentType !== 'Quotation')
            .reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
    };

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
            <div className="flex bg-white p-1 rounded-2xl border border-slate-300 w-fit shrink-0 shadow-sm">
                <button onClick={() => setViewState('stock')} className={`px-8 py-2 rounded-xl text-sm font-black uppercase tracking-widest flex items-center gap-2 transition-all ${viewState === 'stock' ? 'bg-medical-600 text-white shadow-lg shadow-medical-500/20' : 'text-slate-400 hover:text-slate-600'}`}><List size={16} /> Registry</button>
                <button onClick={() => { setEditingId(null); setViewState('builder'); setBuilderMode('add'); setClient(DEFAULT_CLIENT); }} className={`px-8 py-2 rounded-xl text-sm font-black uppercase tracking-widest flex items-center gap-2 transition-all ${viewState === 'builder' && builderMode === 'add' ? 'bg-medical-600 text-white shadow-lg shadow-medical-500/20' : 'text-slate-400 hover:text-slate-600'}`}><Plus size={16} /> Intake</button>
            </div>

            {viewState === 'stock' ? (
                <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-300 shadow-sm overflow-hidden flex flex-col animate-in fade-in">
                    <div className="p-5 border-b border-slate-300 bg-slate-50/30 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-medical-100 rounded-2xl flex items-center justify-center text-medical-600 shadow-inner border border-medical-50"><Users size={20} /></div>
                            <div><h3 className="font-black text-slate-800 uppercase tracking-tight">Client Database</h3><p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{clients.length} Indexed Entities</p></div>
                        </div>
                        <div className="relative w-72"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input type="text" placeholder="Search registry..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-2xl text-[11px] font-bold outline-none focus:border-medical-500 transition-all shadow-inner uppercase" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
                    </div>
                    
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-left text-[11px]">
                            <thead className="bg-slate-50 sticky top-0 z-10 font-black uppercase text-[9px] text-slate-500 border-b tracking-widest shadow-[0_1px_0_0_#f1f5f9]">
                                <tr><th className="px-8 py-5">Entity Identification</th><th className="px-8 py-5">Facility / Hospital</th><th className="px-8 py-5 text-right">LTV Value</th><th className="px-8 py-5 text-right">Status</th><th className="px-8 py-5 text-right">Management</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredClients.map(c => (
                                    <tr key={c.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => { setClient(c); setEditingId(c.id); setViewState('builder'); setBuilderMode('edit'); }}>
                                        <td className="px-8 py-6"><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-slate-400 uppercase text-[14px]">{c.name.charAt(0)}</div><div><div className="font-black text-slate-800 uppercase text-[13px] tracking-tight">{c.name}</div><div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{c.id}</div></div></div></td>
                                        <td className="px-8 py-6"><div className="flex flex-col gap-1"><span className="text-[10px] font-black text-medical-600 uppercase tracking-widest bg-medical-50 px-3 py-1 rounded-lg border border-medical-100 w-fit">{c.hospital || 'Private Healthcare'}</span><div className="text-[9px] text-slate-400 font-bold flex items-center gap-1"><MapPin size={10} /> {c.address.slice(0, 40)}...</div></div></td>
                                        <td className="px-8 py-6 text-right font-black text-emerald-700 text-[14px]">₹{formatIndianNumber(getClientTotalRevenue(c.name))}</td>
                                        <td className="px-8 py-6 text-right"><span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg border ${c.status === 'Draft' ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-emerald-50 border-emerald-200 text-emerald-600'}`}>{c.status || 'Finalized'}</span></td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex justify-end items-center gap-4 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                                                <button onClick={(e) => { e.stopPropagation(); setPendingDelete({ id: c.id, name: c.name }); }} className="p-2.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-100"><Trash2 size={16} /></button>
                                                <div className="p-2.5 text-medical-600 bg-medical-50 rounded-xl border border-medical-100"><Edit2 size={16} /></div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredClients.length === 0 && (
                                    <tr><td colSpan={5} className="py-40 text-center text-slate-300 font-black uppercase tracking-[0.5em] opacity-30 italic">No Registry Found</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col bg-white rounded-[2.5rem] shadow-2xl border border-slate-300 overflow-hidden animate-in slide-in-from-bottom-6 duration-300">
                    <div className="flex bg-slate-50/80 backdrop-blur-sm border-b border-slate-300 shrink-0 px-10 py-6 justify-between items-center">
                        <div className="flex flex-col"><h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{builderMode === 'add' ? 'Entity Intake Form' : 'Update Client Record'}</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{builderMode === 'add' ? 'Synchronizing with cloud registry' : `Modifying ${client.name}`}</p></div>
                        <button onClick={() => setViewState('stock')} className="p-3 bg-white text-slate-400 rounded-2xl hover:text-slate-600 transition-all border border-slate-200 shadow-sm"><X size={24}/></button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar pb-32">
                        <section className="space-y-6">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] border-b border-slate-100 pb-2 flex items-center gap-2"><Building2 size={14} className="text-medical-500" />1. Legal Entity Profiling</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="sm:col-span-2"><FormRow label="Entity Name *"><input type="text" className="w-full h-[48px] bg-slate-50 border border-slate-300 rounded-2xl px-5 text-sm font-black outline-none focus:ring-4 focus:ring-medical-500/5 uppercase" placeholder="NAME OF THE CLIENT" value={client.name || ''} onChange={e => setClient({...client, name: e.target.value.toUpperCase()})} /></FormRow></div>
                                <div className="sm:col-span-2"><FormRow label="Facility / Hospital Name"><input type="text" className="w-full h-[48px] bg-slate-50 border border-slate-300 rounded-2xl px-5 text-sm font-bold outline-none" placeholder="HOSPITAL NAME" value={client.hospital || ''} onChange={e => setClient({...client, hospital: e.target.value})} /></FormRow></div>
                                <div className="sm:col-span-4"><FormRow label="Physical / Registration Address *"><textarea className="w-full min-h-[100px] bg-white border border-slate-300 rounded-2xl px-5 py-3 text-sm font-bold outline-none focus:border-medical-500" placeholder="FULL REGISTERED ADDRESS" value={client.address || ''} onChange={e => setClient({...client, address: e.target.value})} /></FormRow></div>
                            </div>
                        </section>

                        <section className="space-y-6">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] border-b border-slate-100 pb-2 flex items-center gap-2"><ShieldCheck size={14} className="text-medical-500" />2. Statutory Compliance</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                <FormRow label="GSTIN Number"><input type="text" className="w-full h-[48px] bg-white border border-slate-300 rounded-2xl px-5 text-sm font-black font-mono uppercase" placeholder="GST NUMBER" value={client.gstin || ''} onChange={e => setClient({...client, gstin: e.target.value})} /></FormRow>
                                <FormRow label="PAN Number"><input type="text" className="w-full h-[48px] bg-white border border-slate-300 rounded-2xl px-5 text-sm font-black font-mono uppercase" placeholder="PAN NUMBER" value={client.panNo || ''} onChange={e => setClient({...client, panNo: e.target.value})} /></FormRow>
                                <FormRow label="DL Number"><input type="text" className="w-full h-[48px] bg-white border border-slate-300 rounded-2xl px-5 text-sm font-black font-mono uppercase" placeholder="DRUG LICENSE" value={client.dlNo || ''} onChange={e => setClient({...client, dlNo: e.target.value})} /></FormRow>
                                <FormRow label="UDYAM Number"><input type="text" className="w-full h-[48px] bg-white border border-slate-300 rounded-2xl px-5 text-sm font-black font-mono uppercase" placeholder="UDYAM ID" value={client.udyamNo || ''} onChange={e => setClient({...client, udyamNo: e.target.value})} /></FormRow>
                                <FormRow label="CIN Number"><input type="text" className="w-full h-[48px] bg-white border border-slate-300 rounded-2xl px-5 text-sm font-black font-mono uppercase" placeholder="CIN NUMBER" value={client.cinNo || ''} onChange={e => setClient({...client, cinNo: e.target.value})} /></FormRow>
                                <FormRow label="Registry Status"><select className="w-full h-[48px] bg-white border border-slate-300 rounded-2xl px-5 text-sm font-black uppercase" value={client.status} onChange={e => setClient({...client, status: e.target.value as any})}><option>Finalized</option><option>Draft</option></select></FormRow>
                            </div>
                        </section>

                        <section className="space-y-6">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] border-b border-slate-100 pb-2 flex items-center gap-2"><Globe size={14} className="text-medical-500" />3. Communication Node</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="sm:col-span-2"><FormRow label="Email Address"><input type="email" className="w-full h-[48px] bg-white border border-slate-300 rounded-2xl px-5 text-sm font-bold" placeholder="CLIENT@FACILITY.COM" value={client.email || ''} onChange={e => setClient({...client, email: e.target.value})} /></FormRow></div>
                                <div className="sm:col-span-2"><FormRow label="Phone / Mobile"><input type="text" className="w-full h-[48px] bg-white border border-slate-300 rounded-2xl px-5 text-sm font-black font-mono" placeholder="+91" value={client.phone || ''} onChange={e => setClient({...client, phone: e.target.value})} /></FormRow></div>
                            </div>
                        </section>
                    </div>

                    <div className="sticky bottom-0 left-0 right-0 p-6 bg-white/95 backdrop-blur-md border-t border-slate-200 flex justify-end gap-4 shadow-[0_-15px_30px_rgba(0,0,0,0.06)] z-30 shrink-0 px-10">
                        <button onClick={() => { setViewState('stock'); setEditingId(null); }} className="px-10 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all border border-slate-200 shadow-inner">Abort Intake</button>
                        <button onClick={handleSave} className="px-16 py-4 bg-gradient-to-r from-medical-600 to-teal-500 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-2xl shadow-medical-500/40 active:scale-95 transition-all hover:brightness-110">Authorize Registry Entry</button>
                    </div>
                </div>
            )}

            {pendingDelete && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-sm w-full p-10 text-center scale-100 animate-in zoom-in-95">
                        <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 border border-rose-100 shadow-xl shadow-rose-500/10"><AlertTriangle size={40} /></div>
                        <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Purge Entity?</h3>
                        <p className="text-slate-500 text-[13px] font-bold uppercase tracking-widest mt-3 leading-relaxed">Permanently remove <b className="text-slate-800">{pendingDelete.name}</b>? System integrity will be impacted.</p>
                        <div className="flex gap-4 mt-10">
                            <button onClick={() => setPendingDelete(null)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-slate-200">Cancel</button>
                            <button onClick={performDelete} disabled={isDeleting} className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-rose-500/20 active:scale-95 transition-all">{isDeleting ? <RefreshCw className="animate-spin mx-auto" size={18} /> : "Purge Record"}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
