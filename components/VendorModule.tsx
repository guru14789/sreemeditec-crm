import React, { useState, useMemo } from 'react';
import { Vendor } from '../types';
import { 
    Truck, MapPin, FileText, 
    X, Lock, User, Trash2, 
    RefreshCw, AlertTriangle, ShieldCheck, 
    Globe, Building2, List, Plus, Edit2, Search
} from 'lucide-react';
import { useData } from './DataContext';

const FormRow = ({ label, children }: { label: string, children?: React.ReactNode }) => (
    <div className="flex flex-col gap-1.5 w-full">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 truncate whitespace-nowrap min-h-[14px]">{label}</label>
        {children}
    </div>
);

const formatIndianNumber = (num: number) => {
  return num.toLocaleString('en-IN', { maximumFractionDigits: 2 });
};

export const VendorModule: React.FC = () => {
    const { vendors, addVendor, updateVendor, removeVendor, addNotification, products, purchaseRecords, showConfirm } = useData();
    const [viewState, setViewState] = useState<'stock' | 'builder'>('stock');
    const [builderMode, setBuilderMode] = useState<'add' | 'edit'>('add');
    const [searchQuery, setSearchQuery] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<{ id: string, name: string } | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [activeFormTab, setActiveFormTab] = useState<'profile' | 'products' | 'outstanding'>('profile');

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

    const vendorProducts = useMemo(() => {
        if (!vendor.name) return [];
        return products.filter(p => p.supplier && p.supplier.trim().toLowerCase() === vendor.name?.trim().toLowerCase());
    }, [products, vendor.name]);

    const unpaidBills = useMemo(() => {
        if (!vendor.name) return [];
        return purchaseRecords.filter(r => 
            r.supplier && 
            r.supplier.trim().toLowerCase() === vendor.name?.trim().toLowerCase() && 
            ((r.total || 0) - (r.paidAmount || 0) > 0)
        );
    }, [purchaseRecords, vendor.name]);

    const getAgingPeriod = (dateSupplyStr: string) => {
        if (!dateSupplyStr) return 'N/A';
        const supplyDate = new Date(dateSupplyStr);
        const today = new Date();
        
        // Normalize both dates to start of day to calculate diffDays correctly
        const d1 = new Date(supplyDate.getFullYear(), supplyDate.getMonth(), supplyDate.getDate());
        const d2 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        
        const diffTime = d2.getTime() - d1.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) return 'Future';
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return '1 Day';
        if (diffDays <= 7) return '1 Week';
        if (diffDays <= 30) return '1 Month';
        if (diffDays <= 365) return '1 Year';
        return 'Over 1 Year';
    };

    const getVendorOutstanding = (vendorName: string) => {
        return purchaseRecords
            .filter(r => r.supplier && r.supplier.trim().toLowerCase() === vendorName.trim().toLowerCase())
            .reduce((sum, r) => sum + ((r.total || 0) - (r.paidAmount || 0)), 0);
    };

    const verifyPassword = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (password === 'admin') setIsAuthenticated(true);
        else { addNotification('Access Denied', 'Incorrect vendor registry key.', 'alert'); setPassword(''); }
    };

    const filteredVendors = useMemo(() => {
        const lowQuery = searchQuery.toLowerCase();
        return vendors
            .filter(v => 
                (v.name || '').toLowerCase().includes(lowQuery) || 
                (v.id || '').toLowerCase().includes(lowQuery) ||
                (v.contactPerson || '').toLowerCase().includes(lowQuery)
            )
            .sort((a, b) => {
                const volA = a.procurementVolume ?? 0;
                const volB = b.procurementVolume ?? 0;
                if (volB !== volA) return volB - volA;
                return (a.name || '').localeCompare(b.name || '');
            });
    }, [vendors, searchQuery]);

    if (!isAuthenticated) {
        return (
            <div className="h-full flex items-center justify-center bg-slate-50 p-4 animate-in fade-in">
                <div className="max-w-md w-full bg-gradient-to-br from-emerald-950 to-green-900 rounded-[2.5rem] shadow-[0_20px_40px_-10px_rgba(4,47,46,0.5)] border border-emerald-800/30 p-10 text-center scale-100 animate-in zoom-in-95 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none rounded-[2.5rem]"></div>
                    <div className="w-24 h-24 bg-emerald-900/60 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-[#d4af37] shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] border border-emerald-700/50 relative z-10"><Lock size={48} /></div>
                    <h2 className="text-2xl font-playfair font-bold tracking-widest text-white mb-3 uppercase relative z-10 px-2">Vendor DB Locked</h2>
                    <p className="text-emerald-100/80 text-[11px] md:text-xs font-semibold leading-relaxed">Secure access required for vendor master database.</p>
                    <form onSubmit={verifyPassword} className="space-y-4 relative z-10">
                        <input type="password" placeholder="SECURITY KEY" className="w-full px-6 py-5 bg-emerald-900/40 border border-emerald-700/50 text-white placeholder-emerald-100/30 rounded-[2rem] outline-none focus:border-[#d4af37]/60 focus:bg-emerald-900/60 font-bold text-center tracking-[0.5em] transition-all shadow-inner" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
                        <button type="submit" className="w-full bg-gradient-to-r from-[#c5a059] to-[#e5c185] text-amber-950 font-black py-5 rounded-[2rem] shadow-[0_15px_30px_-5px_rgba(197,160,89,0.4)] uppercase tracking-[0.2em] text-xs hover:scale-[1.02] transition-all active:scale-95 border border-[#d4af37]/40">Decrypt & Access</button>
                    </form>
                </div>
            </div>
        );
    }


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

        // Duplicate detection
        const isDuplicate = vendors.some(v => 
            (v.id !== finalData.id) && 
            ((finalData.phone && v.phone === finalData.phone) || 
             (finalData.name && v.name.toLowerCase().trim() === finalData.name.toLowerCase().trim()))
        );
        if (isDuplicate) {
            const confirmed = await showConfirm(`A vendor with name "${finalData.name}" or phone "${finalData.phone}" already exists. Save anyway?`, "Duplicate Detected");
            if (!confirmed) return;
        }

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
            {viewState === 'stock' ? (
                <div className="flex-1 flex flex-col gap-4 overflow-hidden animate-in fade-in">
                    {/* Unified Green Gradient Toolbar */}
                    <div className="bg-gradient-to-br from-emerald-950 to-green-900 p-4 md:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-[0_20px_40px_-10px_rgba(4,47,46,0.5)] border border-emerald-800/30 shrink-0 relative z-20 m-1 md:m-3 lg:m-4 rounded-[1.5rem] md:rounded-[2rem]">
                        <div className="hidden sm:flex items-center gap-4 group">
                            <div className="w-10 h-10 xl:w-12 xl:h-12 flex items-center justify-center text-[#c5a059] drop-shadow-md transition-transform group-hover:scale-110 shrink-0"><Truck size={20} /></div>
                            <div className="flex flex-col">
                                <h2 className="text-lg xl:text-xl font-playfair font-bold tracking-tight text-white uppercase leading-none whitespace-nowrap">Supplier Master</h2>
                                <p className="text-emerald-100/80 text-[11px] md:text-xs font-semibold leading-relaxed">{vendors.length} Authorized Entities</p>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                            <div className="relative w-full sm:w-72">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-100/50" size={16} />
                                <input type="text" placeholder="Search suppliers..." className="w-full bg-emerald-900/40 border border-emerald-700/50 text-white placeholder-emerald-100/50 rounded-[2rem] py-3 md:py-2.5 pl-11 pr-4 text-[11px] font-bold outline-none focus:border-emerald-400 focus:bg-emerald-900/60 transition-all uppercase placeholder:normal-case shadow-inner" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                            </div>
                            <button onClick={() => { setEditingId(null); setViewState('builder'); setBuilderMode('add'); setVendor(DEFAULT_VENDOR); setActiveFormTab('profile'); }} className="w-full sm:w-auto bg-gradient-to-r from-[#c5a059] to-[#e5c185] text-amber-950 px-7 py-3 md:py-2.5 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.15em] shadow-[0_15px_30px_-5px_rgba(197,160,89,0.4)] hover:scale-[1.02] hover:shadow-[0_20px_40px_-5px_rgba(197,160,89,0.6)] transition-all active:scale-95 flex items-center justify-center gap-2 shrink-0"><Plus size={16} /> New Vendor</button>
                        </div>
                    </div>
                    
                    <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-300 shadow-sm overflow-hidden flex flex-col">
                    
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-left text-[11px]">
                            <thead className="bg-slate-50 sticky top-0 z-10 font-black uppercase text-[9px] text-slate-500 border-b tracking-widest shadow-[0_1px_0_0_#f1f5f9]">
                                <tr>
                                    <th className="px-4 py-2.5 w-16 text-center">S.No</th>
                                    <th className="px-4 py-2.5">Vendor Details</th>
                                    <th className="px-4 py-2.5">Contact Person</th>
                                    <th className="px-4 py-2.5 text-right">Procurement Volume</th>
                                    <th className="px-4 py-2.5 text-right">Outstanding</th>
                                    <th className="px-4 py-2.5 text-right">Status</th>
                                    <th className="px-4 py-2.5 text-right">Management</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredVendors.map((v, idx) => (
                                    <tr key={v.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => { setVendor(v); setEditingId(v.id); setViewState('builder'); setBuilderMode('edit'); setActiveFormTab('profile'); }}>
                                        <td className="px-8 py-6 font-black text-slate-400 text-center w-16">{idx + 1}</td>
                                        <td className="px-8 py-6"><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-[2rem] bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-slate-400 uppercase text-[14px]">{v.name.charAt(0)}</div><div><div className="font-lato font-black text-slate-800 uppercase text-[13px] tracking-tight">{v.name}</div><div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{v.id}</div></div></div></td>
                                        <td className="px-8 py-6"><div className="flex flex-col gap-1"><span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100 w-fit">{v.contactPerson || 'General Supplier'}</span><div className="text-[9px] text-slate-400 font-bold flex items-center gap-1"><MapPin size={10} /> {v.address.slice(0, 40)}...</div></div></td>
                                        <td className="px-8 py-6 text-right font-black text-indigo-700 text-[14px]">₹{formatIndianNumber(v.procurementVolume ?? 0)}</td>
                                        <td className="px-8 py-6 text-right font-black text-rose-600 text-[14px]">₹{formatIndianNumber(getVendorOutstanding(v.name))}</td>
                                        <td className="px-8 py-6 text-right"><span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg border ${v.status === 'Draft' ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-emerald-50 border-emerald-200 text-emerald-600'}`}>{v.status || 'Finalized'}</span></td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex justify-end items-center gap-4 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                                                <button onClick={(e) => { e.stopPropagation(); setPendingDelete({ id: v.id, name: v.name }); }} className="p-2.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-[2rem] transition-all border border-transparent hover:border-rose-100"><Trash2 size={16} /></button>
                                                <div className="p-2.5 text-indigo-600 bg-indigo-50 rounded-[2rem] border border-indigo-100"><Edit2 size={16} /></div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredVendors.length === 0 && (
                                    <tr><td colSpan={7} className="py-40 text-center text-slate-300 font-black uppercase tracking-[0.5em] opacity-30 italic">No Suppliers Indexed</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col bg-white rounded-[2.5rem] shadow-2xl border border-slate-300 overflow-hidden animate-in slide-in-from-bottom-6 duration-300">
                    <div className="flex bg-slate-50/80 backdrop-blur-sm border-b border-slate-300 shrink-0 px-4 sm:px-6 lg:px-10 py-3 md:py-6 justify-between items-center gap-3">
                        <div className="flex flex-col"><h3 className="font-playfair text-lg md:text-2xl font-black tracking-tight text-slate-800 uppercase tracking-tight leading-tight">{builderMode === 'add' ? 'Supplier Intake Form' : 'Update Vendor Master'}</h3><p className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 md:mt-1 leading-tight">{builderMode === 'add' ? 'Synchronizing with cloud registry' : `Modifying ${vendor.name}`}</p></div>
                        <button onClick={() => { setViewState('stock'); setActiveFormTab('profile'); }} className="p-2 md:p-3 shrink-0 bg-white text-slate-400 rounded-[2rem] hover:text-slate-600 transition-all border border-slate-200 shadow-sm"><X className="w-4 h-4 md:w-6 md:h-6"/></button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 space-y-6 md:space-y-12 custom-scrollbar pb-24 md:pb-32">
                        {builderMode === 'edit' && (
                            <div className="flex bg-slate-100 p-1 rounded-[2rem] w-fit shrink-0 border border-slate-200">
                                <button type="button" onClick={() => setActiveFormTab('profile')} className={`px-8 py-2.5 rounded-[2rem] text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeFormTab === 'profile' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-slate-600'}`}><User size={14} /> Profile Details</button>
                                <button type="button" onClick={() => setActiveFormTab('products')} className={`px-8 py-2.5 rounded-[2rem] text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeFormTab === 'products' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-slate-600'}`}><List size={14} /> Product Info ({vendorProducts.length})</button>
                                <button type="button" onClick={() => setActiveFormTab('outstanding')} className={`px-8 py-2.5 rounded-[2rem] text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeFormTab === 'outstanding' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-slate-600'}`}><FileText size={14} /> Outstanding Bills ({unpaidBills.length})</button>
                            </div>
                        )}

                        {activeFormTab === 'profile' && (
                            <div className="space-y-12 animate-in fade-in duration-200">
                                <section className="space-y-3 md:space-y-4">
                                    <h3 className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] border-b border-slate-100 pb-2 flex items-center gap-2"><Building2 size={14} className="text-indigo-500" />1. Corporate Profiling</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-3">
                                        <div className="sm:col-span-2"><FormRow label="Vendor Name *"><input type="text" className="w-full h-[32px] md:h-[36px] bg-slate-50 border border-slate-300 rounded-xl md:rounded-[2rem] px-3 text-[10px] md:text-xs font-black outline-none focus:ring-4 focus:ring-indigo-500/5 uppercase" placeholder="LEGAL NAME OF SUPPLIER" value={vendor.name || ''} onChange={e => setVendor({...vendor, name: e.target.value.toUpperCase()})} /></FormRow></div>
                                        <div className="sm:col-span-2"><FormRow label="Contact Person / Manager"><input type="text" className="w-full h-[32px] md:h-[36px] bg-slate-50 border border-slate-300 rounded-xl md:rounded-[2rem] px-3 text-[10px] md:text-xs font-bold outline-none" placeholder="FULL NAME" value={vendor.contactPerson || ''} onChange={e => setVendor({...vendor, contactPerson: e.target.value})} /></FormRow></div>
                                        <div className="col-span-1 sm:col-span-4"><FormRow label="Registration / Warehouse Address"><textarea className="w-full min-h-[60px] md:min-h-[100px] bg-white border border-slate-300 rounded-xl md:rounded-[2rem] px-3 py-2 text-[10px] md:text-sm font-bold outline-none focus:border-indigo-500" placeholder="FULL REGISTERED OFFICE ADDRESS" value={vendor.address || ''} onChange={e => setVendor({...vendor, address: e.target.value})} /></FormRow></div>
                                    </div>
                                </section>

                                <section className="space-y-3 md:space-y-4">
                                    <h3 className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] border-b border-slate-100 pb-2 flex items-center gap-2"><ShieldCheck size={14} className="text-indigo-500" />2. Tax & Compliance</h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-3">
                                        <FormRow label="GSTIN Number"><input type="text" className="w-full h-[32px] md:h-[36px] bg-white border border-slate-300 rounded-xl md:rounded-[2rem] px-2 md:px-3 text-[10px] md:text-xs font-black font-mono uppercase" placeholder="GST NUMBER" value={vendor.gstin || ''} onChange={e => setVendor({...vendor, gstin: e.target.value.toUpperCase()})} /></FormRow>
                                        <FormRow label="PAN Number"><input type="text" className="w-full h-[32px] md:h-[36px] bg-white border border-slate-300 rounded-xl md:rounded-[2rem] px-2 md:px-3 text-[10px] md:text-xs font-black font-mono uppercase" placeholder="PAN NUMBER" value={vendor.panNo || ''} onChange={e => setVendor({...vendor, panNo: e.target.value.toUpperCase()})} /></FormRow>
                                        <FormRow label="DL Number"><input type="text" className="w-full h-[32px] md:h-[36px] bg-white border border-slate-300 rounded-xl md:rounded-[2rem] px-2 md:px-3 text-[10px] md:text-xs font-black font-mono uppercase" placeholder="DRUG LICENSE" value={vendor.dlNo || ''} onChange={e => setVendor({...vendor, dlNo: e.target.value.toUpperCase()})} /></FormRow>
                                        <FormRow label="UDYAM Number"><input type="text" className="w-full h-[32px] md:h-[36px] bg-white border border-slate-300 rounded-xl md:rounded-[2rem] px-2 md:px-3 text-[10px] md:text-xs font-black font-mono uppercase" placeholder="UDYAM ID" value={vendor.udyamNo || ''} onChange={e => setVendor({...vendor, udyamNo: e.target.value.toUpperCase()})} /></FormRow>
                                        <FormRow label="CIN Number"><input type="text" className="w-full h-[32px] md:h-[36px] bg-white border border-slate-300 rounded-xl md:rounded-[2rem] px-2 md:px-3 text-[10px] md:text-xs font-black font-mono uppercase" placeholder="CIN NUMBER" value={vendor.cinNo || ''} onChange={e => setVendor({...vendor, cinNo: e.target.value.toUpperCase()})} /></FormRow>
                                        <FormRow label="Status"><select className="w-full h-[32px] md:h-[36px] bg-white border border-slate-300 rounded-xl md:rounded-[2rem] px-2 md:px-3 text-[10px] md:text-xs font-black uppercase appearance-none" value={vendor.status} onChange={e => setVendor({...vendor, status: e.target.value as any})}><option>Finalized</option><option>Draft</option></select></FormRow>
                                    </div>
                                </section>

                                <section className="space-y-3 md:space-y-4">
                                    <h3 className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] border-b border-slate-100 pb-2 flex items-center gap-2"><Globe size={14} className="text-indigo-500" />3. Connectivity Node</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-3">
                                        <div className="sm:col-span-2"><FormRow label="Email Address"><input type="email" className="w-full h-[32px] md:h-[36px] bg-white border border-slate-300 rounded-xl md:rounded-[2rem] px-3 text-[10px] md:text-xs font-bold" placeholder="VENDOR@SUPPLY.COM" value={vendor.email || ''} onChange={e => setVendor({...vendor, email: e.target.value})} /></FormRow></div>
                                        <div className="sm:col-span-2"><FormRow label="Phone / Mobile"><input type="text" className="w-full h-[32px] md:h-[36px] bg-white border border-slate-300 rounded-xl md:rounded-[2rem] px-3 text-[10px] md:text-xs font-black font-mono" placeholder="+91" value={vendor.phone || ''} onChange={e => setVendor({...vendor, phone: e.target.value})} /></FormRow></div>
                                    </div>
                                </section>
                            </div>
                        )}

                        {activeFormTab === 'products' && (
                            <div className="space-y-4 animate-in fade-in duration-200">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] border-b border-slate-100 pb-2 flex items-center gap-2"><Truck size={14} className="text-indigo-500" />Supplied Products ({vendorProducts.length})</h3>
                                {vendorProducts.length > 0 ? (
                                    <div className="overflow-hidden border border-slate-200 rounded-3xl bg-slate-50/50">
                                        <table className="w-full text-left text-[11px] border-collapse">
                                            <thead>
                                                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-500 font-black uppercase tracking-wider text-[9px]">
                                                    <th className="px-4 py-2">Product Name</th>
                                                    <th className="px-4 py-2">SKU / Model</th>
                                                    <th className="px-4 py-2">Category</th>
                                                    <th className="px-4 py-2 text-right">Available Stock</th>
                                                    <th className="px-4 py-2 text-right">Purchase Cost</th>
                                                    <th className="px-4 py-2 text-right">Selling Rate</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 bg-white">
                                                {vendorProducts.map(p => (
                                                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="px-4 py-2 font-black text-slate-800 uppercase text-[12px]">{p.name}</td>
                                                        <td className="px-4 py-2 font-mono text-slate-500">{p.sku} {p.model ? `(${p.model})` : ''}</td>
                                                        <td className="px-4 py-2"><span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-100">{p.category}</span></td>
                                                        <td className="px-4 py-2 text-right font-bold text-slate-700">{p.stock} <span className="text-[10px] text-slate-400 uppercase">{p.unit || 'nos'}</span></td>
                                                        <td className="px-4 py-2 text-right font-bold text-slate-500">₹{(p.purchasePrice || 0).toLocaleString('en-IN')}</td>
                                                        <td className="px-4 py-2 text-right font-bold text-emerald-700">₹{(p.sellingPrice || 0).toLocaleString('en-IN')}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="py-20 text-center text-slate-400 border border-dashed border-slate-200 rounded-[2rem] bg-slate-50/30">
                                        <p className="font-black uppercase tracking-widest text-xs">No Associated Products</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">This supplier is not linked to any registry products.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeFormTab === 'outstanding' && (
                            <div className="space-y-4 animate-in fade-in duration-200">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] border-b border-slate-100 pb-2 flex items-center gap-2"><FileText size={14} className="text-indigo-500" />Outstanding Bills ({unpaidBills.length})</h3>
                                {unpaidBills.length > 0 ? (
                                    <div className="overflow-hidden border border-slate-200 rounded-3xl bg-slate-50/50">
                                        <table className="w-full text-left text-[11px] border-collapse">
                                            <thead>
                                                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-500 font-black uppercase tracking-wider text-[9px]">
                                                    <th className="px-4 py-2">Invoice No</th>
                                                    <th className="px-4 py-2">Supply Date</th>
                                                    <th className="px-4 py-2">Aging Period</th>
                                                    <th className="px-4 py-2 text-right">Bill Total</th>
                                                    <th className="px-4 py-2 text-right">Paid Amt</th>
                                                    <th className="px-4 py-2 text-right">Balance Due</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 bg-white">
                                                {unpaidBills.map(b => {
                                                    const aging = getAgingPeriod(b.dateSupply);
                                                    const balance = (b.total || 0) - (b.paidAmount || 0);
                                                    let badgeColor = "bg-slate-50 border-slate-200 text-slate-600";
                                                    if (aging === "Today" || aging === "1 Day") {
                                                        badgeColor = "bg-emerald-50 border-emerald-200 text-emerald-600";
                                                    } else if (aging === "1 Week") {
                                                        badgeColor = "bg-blue-50 border-blue-200 text-blue-600";
                                                    } else if (aging === "1 Month") {
                                                        badgeColor = "bg-amber-50 border-amber-200 text-amber-600";
                                                    } else if (aging === "1 Year" || aging === "Over 1 Year") {
                                                        badgeColor = "bg-rose-50 border-rose-200 text-rose-600";
                                                    }
                                                    return (
                                                        <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                                                            <td className="px-4 py-2 font-black text-slate-800 uppercase text-[12px]">{b.invoiceNo || 'N/A'}</td>
                                                            <td className="px-4 py-2 font-bold text-slate-500">{b.dateSupply || 'N/A'}</td>
                                                            <td className="px-4 py-2">
                                                                <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-md border ${badgeColor}`}>
                                                                    {aging}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-2 text-right font-bold text-slate-700">₹{(b.total || 0).toLocaleString('en-IN')}</td>
                                                            <td className="px-4 py-2 text-right font-bold text-slate-500">₹{(b.paidAmount || 0).toLocaleString('en-IN')}</td>
                                                            <td className="px-4 py-2 text-right font-bold text-rose-700">₹{balance.toLocaleString('en-IN')}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="py-20 text-center text-slate-400 border border-dashed border-slate-200 rounded-[2rem] bg-slate-50/30">
                                        <p className="font-black uppercase tracking-widest text-xs">No Pending Bills</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">This supplier has no unpaid purchase entry records.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="sticky bottom-0 left-0 right-0 p-3 sm:p-6 bg-white/95 backdrop-blur-md border-t border-slate-200 flex justify-end gap-2 md:gap-4 shadow-[0_-15px_30px_rgba(0,0,0,0.06)] z-30 shrink-0">
                        {activeFormTab === 'profile' ? (
                            <>
                                <button onClick={() => { setViewState('stock'); setEditingId(null); }} className="flex-1 sm:flex-none px-4 py-3 md:px-10 md:py-4 bg-slate-100 text-slate-500 rounded-xl md:rounded-[2rem] font-black text-[9px] md:text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all border border-slate-200 shadow-inner">Cancel</button>
                                <button onClick={handleSave} className="flex-[2] sm:flex-none px-6 py-3 md:px-16 md:py-4 bg-gradient-to-r from-indigo-600 to-indigo-400 text-white rounded-xl md:rounded-[2rem] font-black text-[9px] md:text-[11px] uppercase tracking-widest shadow-xl shadow-indigo-500/40 active:scale-95 transition-all hover:brightness-110">Authorize</button>
                            </>
                        ) : (
                            <button onClick={() => { setViewState('stock'); setEditingId(null); }} className="w-full sm:w-auto px-6 py-3 md:px-16 md:py-4 bg-indigo-600 text-white rounded-xl md:rounded-[2rem] font-black text-[9px] md:text-[11px] uppercase tracking-widest shadow-xl shadow-indigo-500/20 active:scale-95 transition-all hover:bg-indigo-700">Back to Registry</button>
                        )}
                    </div>
                </div>
            )}

            {pendingDelete && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-in fade-in">
                    <div className="bg-white rounded-[1.5rem] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] max-w-sm w-full p-6 text-center scale-100 animate-in zoom-in-95 border border-slate-200/50">
                        <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 border border-rose-100 shadow-xl shadow-rose-500/10"><AlertTriangle size={40} /></div>
                        <h3 className="text-2xl font-playfair font-bold tracking-tight text-slate-800 uppercase tracking-tight">Purge Supplier?</h3>
                        <p className="text-slate-500 text-[13px] font-bold uppercase tracking-widest mt-3 leading-relaxed">Permanently remove <b className="text-slate-800">{pendingDelete.name}</b> from the master database?</p>
                        <div className="flex gap-4 mt-10">
                            <button onClick={() => setPendingDelete(null)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-[2rem] font-black text-[10px] uppercase tracking-widest border border-slate-200">Cancel</button>
                            <button onClick={performDelete} disabled={isDeleting} className="flex-1 py-4 bg-rose-600 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-xl shadow-rose-500/20 active:scale-95 transition-all">{isDeleting ? <RefreshCw className="animate-spin mx-auto" size={18} /> : "Delete Record"}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
