import React, { useState, useMemo } from 'react';
import { Vendor } from '../types';
import { 
    Truck, MapPin, Phone, Mail, FileText, 
    ArrowUpRight, X, Lock, User, Trash2, 
    RefreshCw, AlertTriangle, ShieldCheck, 
    Globe, Building2, List, Plus, Edit2, MoreVertical, Search
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

export const VendorModule: React.FC = () => {
    const { vendors, invoices, addVendor, updateVendor, removeVendor, addNotification } = useData();
    const [viewState, setViewState] = useState<'stock' | 'builder'>('stock');
    const [builderMode, setBuilderMode] = useState<'add' | 'edit'>('add');
    const [searchQuery, setSearchQuery] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<{ id: string, name: string } | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);

    const DEFAULT_VENDOR: Partial<Vendor> = {
        name: '',
        address: '',
        contactPerson: '',
        gstin: '',
        email: '',
        phone: '',
        cinNo: '',
        panNo: '',
        dlNo: '',
        udyamNo: '',
        status: 'Finalized'
    };

    const [vendor, setVendor] = useState<Partial<Vendor>>(DEFAULT_VENDOR);

    const verifyPassword = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (password === 'admin') setIsAuthenticated(true);
        else { addNotification('Access Denied', 'Incorrect vendor registry key.', 'alert'); setPassword(''); }
    };

    const filteredVendors = useMemo(() => {
        const lowQuery = searchQuery.toLowerCase();
        return vendors.filter(v => 
            (v.name || '').toLowerCase().includes(lowQuery) || 
            (v.id || '').toLowerCase().includes(lowQuery) ||
            (v.contactPerson || '').toLowerCase().includes(lowQuery)
        );
    }, [vendors, searchQuery]);

    if (!isAuthenticated) {
        return (
            <div className="h-full flex items-center justify-center bg-slate-50 p-4 animate-in fade-in">
                <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 p-10 text-center scale-100 animate-in zoom-in-95">
                    <div className="w-24 h-24 bg-indigo-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-indigo-600 shadow-xl shadow-indigo-500/10 border border-indigo-100"><Lock size={48} /></div>
                    <h2 className="text-2xl font-black text-slate-800 mb-3 uppercase tracking-tight">Supplier Vault Lock</h2>
                    <p className="text-slate-500 mb-10 text-xs font-bold uppercase tracking-widest leading-relaxed">Secure access required for vendor master database.</p>
                    <form onSubmit={verifyPassword} className="space-y-4">
                        <input type="password" placeholder="SECURITY KEY" className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 font-black text-center tracking-[0.5em] transition-all" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
                        <button type="submit" className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-indigo-500/20 uppercase tracking-[0.2em] text-xs hover:bg-indigo-700 transition-all active:scale-95">Decrypt & Access</button>
                    </form>
                </div>
            </div>
        );
    }

    const getVendorProcurementValue = (vendorName: string) => {
        const target = vendorName.toLowerCase().trim();
        return invoices
            .filter(inv => inv.documentType === 'SupplierPO' && (inv.customerName || '').toLowerCase().trim() === target)
            .reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
    };

    const handleSave = async () => {
        if (!vendor.name) {
            addNotification('Validation Error', 'Vendor Name is mandatory.', 'alert');
            return;
        }

        const finalData: Vendor = {
            ...vendor as Vendor,
            id: editingId || `VEN-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
            status: vendor.status || 'Finalized'
        };

        if (editingId) {
            await updateVendor(editingId, finalData);
            addNotification('Registry Updated', `"${finalData.name}" record modified.`, 'success');
        } else {
            await addVendor(finalData);
            addNotification('Vendor Registered', `"${finalData.name}" added to master database.`, 'success');
        }
        setViewState('stock');
        setEditingId(null);
        setVendor(DEFAULT_VENDOR);
    };

    const performDelete = async () => {
        if (!pendingDelete) return;
        setIsDeleting(true);
        try {
            await removeVendor(pendingDelete.id);
            addNotification('Record Purged', `Supplier ${pendingDelete.name} removed.`, 'warning');
            setPendingDelete(null);
        } catch (err) {
            addNotification('Database Error', 'Could not delete vendor record.', 'alert');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="h-full flex flex-col gap-4 overflow-hidden p-2">
            <div className="flex bg-white p-1 rounded-2xl border border-slate-300 w-fit shrink-0 shadow-sm">
                <button onClick={() => setViewState('stock')} className={`px-8 py-2 rounded-xl text-sm font-black uppercase tracking-widest flex items-center gap-2 transition-all ${viewState === 'stock' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-slate-600'}`}><List size={16} /> Registry</button>
                <button onClick={() => { setEditingId(null); setViewState('builder'); setBuilderMode('add'); setVendor(DEFAULT_VENDOR); }} className={`px-8 py-2 rounded-xl text-sm font-black uppercase tracking-widest flex items-center gap-2 transition-all ${viewState === 'builder' && builderMode === 'add' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-slate-600'}`}><Plus size={16} /> Intake</button>
            </div>

            {viewState === 'stock' ? (
                <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-300 shadow-sm overflow-hidden flex flex-col animate-in fade-in">
                    <div className="p-5 border-b border-slate-300 bg-slate-50/30 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner border border-indigo-50"><Truck size={20} /></div>
                            <div><h3 className="font-black text-slate-800 uppercase tracking-tight">Supplier Master</h3><p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{vendors.length} Authorized Entities</p></div>
                        </div>
                        <div className="relative w-72"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input type="text" placeholder="Search suppliers..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-2xl text-[11px] font-bold outline-none focus:border-indigo-500 transition-all shadow-inner uppercase" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
                    </div>
                    
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-left text-[11px]">
                            <thead className="bg-slate-50 sticky top-0 z-10 font-black uppercase text-[9px] text-slate-500 border-b tracking-widest shadow-[0_1px_0_0_#f1f5f9]">
                                <tr><th className="px-8 py-5">Vendor Details</th><th className="px-8 py-5">Contact Person</th><th className="px-8 py-5 text-right">Procurement Volume</th><th className="px-8 py-5 text-right">Status</th><th className="px-8 py-5 text-right">Management</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredVendors.map(v => (
                                    <tr key={v.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => { setVendor(v); setEditingId(v.id); setViewState('builder'); setBuilderMode('edit'); }}>
                                        <td className="px-8 py-6"><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-slate-400 uppercase text-[14px]">{v.name.charAt(0)}</div><div><div className="font-black text-slate-800 uppercase text-[13px] tracking-tight">{v.name}</div><div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{v.id}</div></div></div></td>
                                        <td className="px-8 py-6"><div className="flex flex-col gap-1"><span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100 w-fit">{v.contactPerson || 'General Supplier'}</span><div className="text-[9px] text-slate-400 font-bold flex items-center gap-1"><MapPin size={10} /> {v.address.slice(0, 40)}...</div></div></td>
                                        <td className="px-8 py-6 text-right font-black text-indigo-700 text-[14px]">₹{formatIndianNumber(getVendorProcurementValue(v.name))}</td>
                                        <td className="px-8 py-6 text-right"><span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg border ${v.status === 'Draft' ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-emerald-50 border-emerald-200 text-emerald-600'}`}>{v.status || 'Finalized'}</span></td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex justify-end items-center gap-4 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                                                <button onClick={(e) => { e.stopPropagation(); setPendingDelete({ id: v.id, name: v.name }); }} className="p-2.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-100"><Trash2 size={16} /></button>
                                                <div className="p-2.5 text-indigo-600 bg-indigo-50 rounded-xl border border-indigo-100"><Edit2 size={16} /></div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredVendors.length === 0 && (
                                    <tr><td colSpan={5} className="py-40 text-center text-slate-300 font-black uppercase tracking-[0.5em] opacity-30 italic">No Suppliers Indexed</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col bg-white rounded-[2.5rem] shadow-2xl border border-slate-300 overflow-hidden animate-in slide-in-from-bottom-6 duration-300">
                    <div className="flex bg-slate-50/80 backdrop-blur-sm border-b border-slate-300 shrink-0 px-10 py-6 justify-between items-center">
                        <div className="flex flex-col"><h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{builderMode === 'add' ? 'Supplier Intake Form' : 'Update Vendor Master'}</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{builderMode === 'add' ? 'Synchronizing with cloud registry' : `Modifying ${vendor.name}`}</p></div>
                        <button onClick={() => setViewState('stock')} className="p-3 bg-white text-slate-400 rounded-2xl hover:text-slate-600 transition-all border border-slate-200 shadow-sm"><X size={24}/></button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar pb-32">
                        <section className="space-y-6">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] border-b border-slate-100 pb-2 flex items-center gap-2"><Building2 size={14} className="text-indigo-500" />1. Corporate Profiling</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="sm:col-span-2"><FormRow label="Vendor Name *"><input type="text" className="w-full h-[48px] bg-slate-50 border border-slate-300 rounded-2xl px-5 text-sm font-black outline-none focus:ring-4 focus:ring-indigo-500/5 uppercase" placeholder="LEGAL NAME OF SUPPLIER" value={vendor.name || ''} onChange={e => setVendor({...vendor, name: e.target.value.toUpperCase()})} /></FormRow></div>
                                <div className="sm:col-span-2"><FormRow label="Contact Person / Manager"><input type="text" className="w-full h-[48px] bg-slate-50 border border-slate-300 rounded-2xl px-5 text-sm font-bold outline-none" placeholder="FULL NAME" value={vendor.contactPerson || ''} onChange={e => setVendor({...vendor, contactPerson: e.target.value})} /></FormRow></div>
                                <div className="sm:col-span-4"><FormRow label="Registration / Warehouse Address"><textarea className="w-full min-h-[100px] bg-white border border-slate-300 rounded-2xl px-5 py-3 text-sm font-bold outline-none focus:border-indigo-500" placeholder="FULL REGISTERED OFFICE ADDRESS" value={vendor.address || ''} onChange={e => setVendor({...vendor, address: e.target.value})} /></FormRow></div>
                            </div>
                        </section>

                        <section className="space-y-6">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] border-b border-slate-100 pb-2 flex items-center gap-2"><ShieldCheck size={14} className="text-indigo-500" />2. Tax & Compliance</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                <FormRow label="GSTIN Number"><input type="text" className="w-full h-[48px] bg-white border border-slate-300 rounded-2xl px-5 text-sm font-black font-mono uppercase" placeholder="GST NUMBER" value={vendor.gstin || ''} onChange={e => setVendor({...vendor, gstin: e.target.value})} /></FormRow>
                                <FormRow label="PAN Number"><input type="text" className="w-full h-[48px] bg-white border border-slate-300 rounded-2xl px-5 text-sm font-black font-mono uppercase" placeholder="PAN NUMBER" value={vendor.panNo || ''} onChange={e => setVendor({...vendor, panNo: e.target.value})} /></FormRow>
                                <FormRow label="DL Number"><input type="text" className="w-full h-[48px] bg-white border border-slate-300 rounded-2xl px-5 text-sm font-black font-mono uppercase" placeholder="DRUG LICENSE" value={vendor.dlNo || ''} onChange={e => setVendor({...vendor, dlNo: e.target.value})} /></FormRow>
                                <FormRow label="UDYAM Number"><input type="text" className="w-full h-[48px] bg-white border border-slate-300 rounded-2xl px-5 text-sm font-black font-mono uppercase" placeholder="UDYAM ID" value={vendor.udyamNo || ''} onChange={e => setVendor({...vendor, udyamNo: e.target.value})} /></FormRow>
                                <FormRow label="CIN Number"><input type="text" className="w-full h-[48px] bg-white border border-slate-300 rounded-2xl px-5 text-sm font-black font-mono uppercase" placeholder="CIN NUMBER" value={vendor.cinNo || ''} onChange={e => setVendor({...vendor, cinNo: e.target.value})} /></FormRow>
                                <FormRow label="Status"><select className="w-full h-[48px] bg-white border border-slate-300 rounded-2xl px-5 text-sm font-black uppercase" value={vendor.status} onChange={e => setVendor({...vendor, status: e.target.value as any})}><option>Finalized</option><option>Draft</option></select></FormRow>
                            </div>
                        </section>

                        <section className="space-y-6">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] border-b border-slate-100 pb-2 flex items-center gap-2"><Globe size={14} className="text-indigo-500" />3. Connectivity Node</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="sm:col-span-2"><FormRow label="Email Address"><input type="email" className="w-full h-[48px] bg-white border border-slate-300 rounded-2xl px-5 text-sm font-bold" placeholder="VENDOR@SUPPLY.COM" value={vendor.email || ''} onChange={e => setVendor({...vendor, email: e.target.value})} /></FormRow></div>
                                <div className="sm:col-span-2"><FormRow label="Phone / Mobile"><input type="text" className="w-full h-[48px] bg-white border border-slate-300 rounded-2xl px-5 text-sm font-black font-mono" placeholder="+91" value={vendor.phone || ''} onChange={e => setVendor({...vendor, phone: e.target.value})} /></FormRow></div>
                            </div>
                        </section>
                    </div>

                    <div className="sticky bottom-0 left-0 right-0 p-6 bg-white/95 backdrop-blur-md border-t border-slate-200 flex justify-end gap-4 shadow-[0_-15px_30px_rgba(0,0,0,0.06)] z-30 shrink-0 px-10">
                        <button onClick={() => { setViewState('stock'); setEditingId(null); }} className="px-10 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all border border-slate-200 shadow-inner">Cancel</button>
                        <button onClick={handleSave} className="px-16 py-4 bg-gradient-to-r from-indigo-600 to-indigo-400 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-2xl shadow-indigo-500/40 active:scale-95 transition-all hover:brightness-110">Authorize Supplier Entry</button>
                    </div>
                </div>
            )}

            {pendingDelete && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-sm w-full p-10 text-center scale-100 animate-in zoom-in-95">
                        <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 border border-rose-100 shadow-xl shadow-rose-500/10"><AlertTriangle size={40} /></div>
                        <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Purge Supplier?</h3>
                        <p className="text-slate-500 text-[13px] font-bold uppercase tracking-widest mt-3 leading-relaxed">Permanently remove <b className="text-slate-800">{pendingDelete.name}</b> from the master database?</p>
                        <div className="flex gap-4 mt-10">
                            <button onClick={() => setPendingDelete(null)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-slate-200">Cancel</button>
                            <button onClick={performDelete} disabled={isDeleting} className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-rose-500/20 active:scale-95 transition-all">{isDeleting ? <RefreshCw className="animate-spin mx-auto" size={18} /> : "Delete Record"}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
