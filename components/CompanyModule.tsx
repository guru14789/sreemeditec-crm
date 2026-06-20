import React, { useState, useMemo } from 'react';
import { CompanyProfile } from '../types';
import { 
    Building2, Search, MapPin, Phone, Mail, FileText, 
    X, Landmark, Wallet, Lock, 
    Trash2, RefreshCw, AlertTriangle, CreditCard,
    ShieldCheck, Globe, Info, Edit2, List, MoreVertical, Plus,
    Activity, Database
} from 'lucide-react';
import { useData } from './DataContext';

const FormRow = ({ label, children }: { label: string, children?: React.ReactNode }) => (
    <div className="flex flex-col gap-1.5 w-full">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 truncate whitespace-nowrap min-h-[14px]">{label}</label>
        {children}
    </div>
);

export const CompanyModule: React.FC<{ userRole?: 'Admin' | 'Employee' }> = ({ userRole = 'Employee' }) => {
    const { companyProfiles, addCompanyProfile, updateCompanyProfile, removeCompanyProfile, addNotification } = useData();
    const [viewState, setViewState] = useState<'stock' | 'builder'>('stock');
    const [builderMode, setBuilderMode] = useState<'add' | 'edit'>('add');
    const [searchQuery, setSearchQuery] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<{ id: string, name: string } | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);

    // userRole is passed from App.tsx (tabRole) — set by HR Access Grid

    const DEFAULT_PROFILE: Partial<CompanyProfile> = {
        companyName: '',
        address: '',
        gstin: '',
        email: '',
        phone: '',
        bankName: '',
        accountNo: '',
        branchIfsc: '',
        cinNo: '',
        panNo: ''
    };

    const [profile, setProfile] = useState<Partial<CompanyProfile>>(DEFAULT_PROFILE);

    const filteredProfiles = useMemo(() => {
        const lowQuery = searchQuery.toLowerCase();
        return companyProfiles.filter(p => 
            (p.companyName || '').toLowerCase().includes(lowQuery) || 
            (p.bankName || '').toLowerCase().includes(lowQuery) ||
            (p.gstin || '').toLowerCase().includes(lowQuery)
        );
    }, [companyProfiles, searchQuery]);

    const handleSave = async () => {
        if (userRole !== 'Admin') {
            addNotification('Access Denied', 'Administrative privileges required.', 'alert');
            return;
        }

        if (!profile.companyName || !profile.address) {
            addNotification('Validation Error', 'Company Name and Address are required.', 'alert');
            return;
        }

        const finalData: CompanyProfile = {
            ...profile as CompanyProfile,
            id: editingId || `COMP-${Date.now()}`
        };

        if (editingId) {
            await updateCompanyProfile(editingId, finalData);
            addNotification('Registry Updated', `"${finalData.companyName}" profile modified.`, 'success');
        } else {
            await addCompanyProfile(finalData);
            addNotification('Company Indexed', `"${finalData.companyName}" added to registry.`, 'success');
        }
        setViewState('stock');
        setEditingId(null);
        setProfile(DEFAULT_PROFILE);
    };

    const performDelete = async () => {
        if (!pendingDelete) return;
        setIsDeleting(true);
        try {
            await removeCompanyProfile(pendingDelete.id);
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
            <div className="bg-slate-100 p-1.5 rounded-[2.5rem] border border-slate-200 shadow-inner w-fit shrink-0 flex gap-1">
                <button onClick={() => setViewState('stock')} className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-[2rem] transition-all flex items-center gap-2 ${viewState === 'stock'  ? 'bg-emerald-900 text-white shadow-[0_10px_20px_-5px_rgba(6,78,59,0.5)] scale-100' : 'text-slate-400 hover:text-emerald-700 scale-95'}`}><List size={16} /> Registry</button>
                <button 
                    onClick={() => { 
                        if (userRole !== 'Admin') return addNotification('Access Denied', 'Admin only.', 'alert');
                        setEditingId(null); 
                        setViewState('builder'); 
                        setBuilderMode('add'); 
                        setProfile(DEFAULT_PROFILE); 
                    }} 
                    className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-[2rem] transition-all flex items-center gap-2 ${viewState === 'builder' && builderMode === 'add'  ? 'bg-emerald-900 text-white shadow-[0_10px_20px_-5px_rgba(6,78,59,0.5)] scale-100' : 'text-slate-400 hover:text-emerald-700 scale-95'}`}
                >
                    <Plus size={16} /> Add Entity
                </button>
            </div>

            {viewState === 'stock' ? (
                <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-300 shadow-sm overflow-hidden flex flex-col animate-in fade-in">
                    <div className="p-5 border-b border-slate-300 bg-slate-50/30 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-100 rounded-[2rem] flex items-center justify-center text-indigo-600 shadow-inner border border-indigo-50"><Building2 size={20} /></div>
                            <div>
                                <h3 className="font-black text-slate-800 uppercase tracking-tight">Our Companies</h3>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{companyProfiles.length} Business Entities</p>
                            </div>
                        </div>
                        <div className="relative w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                                type="text" 
                                placeholder="Search companies..." 
                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-[2rem] text-[11px] font-bold outline-none focus:border-indigo-500 transition-all shadow-inner uppercase" 
                                value={searchQuery} 
                                onChange={(e) => setSearchQuery(e.target.value)} 
                            />
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-left text-[11px]">
                            <thead className="bg-slate-50 sticky top-0 z-10 font-black uppercase text-[9px] text-slate-500 border-b tracking-widest shadow-[0_1px_0_0_#f1f5f9]">
                                <tr>
                                    <th className="px-4 py-2.5">Company Identity</th>
                                    <th className="px-4 py-2.5">Banking Node</th>
                                    <th className="px-4 py-2.5">Statutory IDs</th>
                                    <th className="px-4 py-2.5 text-right">Management</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredProfiles.map(p => (
                                    <tr 
                                        key={p.id} 
                                        className="hover:bg-slate-50 transition-colors group cursor-pointer" 
                                        onClick={() => { 
                                            setProfile(p); 
                                            setEditingId(p.id); 
                                            setViewState('builder'); 
                                            setBuilderMode('edit'); 
                                        }}
                                    >
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-[2rem] bg-indigo-50 border border-indigo-100 flex items-center justify-center font-black text-indigo-600 uppercase text-[14px]">
                                                    {p.companyName.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-black text-slate-800 uppercase text-[13px] tracking-tight">{p.companyName}</div>
                                                    <div className="text-[9px] text-slate-400 font-bold flex items-center gap-1 mt-0.5 max-w-[250px] truncate">
                                                        <MapPin size={10} /> {p.address}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100 w-fit flex items-center gap-1.5">
                                                    <Landmark size={10} /> {p.bankName}
                                                </span>
                                                <div className="text-[9px] text-slate-500 font-bold tracking-widest uppercase">
                                                    A/C: {p.accountNo} <span className="text-slate-300 ml-2">|</span> IFSC: {p.branchIfsc}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                                                <div className="flex flex-col">
                                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">GSTIN</span>
                                                    <span className="font-black text-slate-700">{p.gstin || '—'}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">PAN</span>
                                                    <span className="font-black text-slate-700">{p.panNo || '—'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex justify-end items-center gap-4 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                                                {userRole === 'Admin' && (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); setPendingDelete({ id: p.id, name: p.companyName }); }} 
                                                        className="p-2.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-[2rem] transition-all border border-transparent hover:border-rose-100"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                                <div className="p-2.5 text-indigo-600 bg-indigo-50 rounded-[2rem] border border-indigo-100">
                                                    <Edit2 size={16} />
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredProfiles.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="py-40 text-center text-slate-300 font-black uppercase tracking-[0.5em] opacity-30 italic">
                                            No Companies Registered
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col bg-white rounded-[2.5rem] shadow-2xl border border-slate-300 overflow-hidden animate-in slide-in-from-bottom-6 duration-300">
                    <div className="flex bg-slate-50/80 backdrop-blur-sm border-b border-slate-300 shrink-0 px-10 py-6 justify-between items-center">
                        <div className="flex flex-col">
                            <h3 className="text-2xl font-playfair font-bold tracking-tight text-slate-800 uppercase tracking-tight">
                                {builderMode === 'add' ? 'Entity Intake Form' : 'Update Company Record'}
                            </h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                {builderMode === 'add' ? 'Registering new business node' : `Modifying ${profile.companyName}`}
                            </p>
                        </div>
                        <button onClick={() => setViewState('stock')} className="p-3 bg-white text-slate-400 rounded-[2rem] hover:text-slate-600 transition-all border border-slate-200 shadow-sm">
                            <X size={24}/>
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar pb-32">
                        <section className="space-y-4">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] border-b border-slate-100 pb-2 flex items-center gap-2">
                                <Building2 size={14} className="text-indigo-500" />1. Legal Entity Profiling
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                <div className="sm:col-span-2">
                                    <FormRow label="Entity Name *">
                                        <input 
                                            type="text" 
                                            className="w-full h-[36px] bg-slate-50 border border-slate-300 rounded-[2rem] px-3 text-xs font-black outline-none focus:ring-4 focus:ring-indigo-500/5 uppercase" 
                                            placeholder="FULL LEGAL NAME" 
                                            value={profile.companyName || ''} 
                                            onChange={e => setProfile({...profile, companyName: e.target.value.toUpperCase()})} 
                                        />
                                    </FormRow>
                                </div>
                                <div className="sm:col-span-4">
                                    <FormRow label="Registered Address *">
                                        <textarea 
                                            className="w-full min-h-[100px] bg-white border border-slate-300 rounded-[2rem] px-3 py-2 text-sm font-bold outline-none focus:border-indigo-500" 
                                            placeholder="FULL REGISTERED OFFICE ADDRESS" 
                                            value={profile.address || ''} 
                                            onChange={e => setProfile({...profile, address: e.target.value})} 
                                        />
                                    </FormRow>
                                </div>
                                <div className="sm:col-span-2">
                                    <FormRow label="Email Node">
                                        <input 
                                            type="email" 
                                            className="w-full h-[36px] bg-white border border-slate-300 rounded-[2rem] px-3 text-xs font-bold" 
                                            placeholder="OFFICIAL@COMPANY.COM" 
                                            value={profile.email || ''} 
                                            onChange={e => setProfile({...profile, email: e.target.value})} 
                                        />
                                    </FormRow>
                                </div>
                                <div className="sm:col-span-2">
                                    <FormRow label="Support Hotline">
                                        <input 
                                            type="text" 
                                            className="w-full h-[36px] bg-white border border-slate-300 rounded-[2rem] px-3 text-xs font-black font-mono" 
                                            placeholder="+91" 
                                            value={profile.phone || ''} 
                                            onChange={e => setProfile({...profile, phone: e.target.value})} 
                                        />
                                    </FormRow>
                                </div>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] border-b border-slate-100 pb-2 flex items-center gap-2">
                                <Landmark size={14} className="text-indigo-500" />2. Financial & Banking
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                <div className="sm:col-span-2">
                                    <FormRow label="Bank Name *">
                                        <input 
                                            type="text" 
                                            className="w-full h-[36px] bg-white border border-slate-300 rounded-[2rem] px-3 text-xs font-black uppercase" 
                                            placeholder="BANK NAME" 
                                            value={profile.bankName || ''} 
                                            onChange={e => setProfile({...profile, bankName: e.target.value.toUpperCase()})} 
                                        />
                                    </FormRow>
                                </div>
                                <div className="sm:col-span-2">
                                    <FormRow label="Account Number *">
                                        <input 
                                            type="text" 
                                            className="w-full h-[36px] bg-white border border-slate-300 rounded-[2rem] px-3 text-xs font-black font-mono" 
                                            placeholder="AC/NO" 
                                            value={profile.accountNo || ''} 
                                            onChange={e => setProfile({...profile, accountNo: e.target.value})} 
                                        />
                                    </FormRow>
                                </div>
                                <div className="sm:col-span-2">
                                    <FormRow label="IFSC Code *">
                                        <input 
                                            type="text" 
                                            className="w-full h-[36px] bg-white border border-slate-300 rounded-[2rem] px-3 text-xs font-black font-mono uppercase" 
                                            placeholder="IFSC" 
                                            value={profile.branchIfsc || ''} 
                                            onChange={e => setProfile({...profile, branchIfsc: e.target.value.toUpperCase()})} 
                                        />
                                    </FormRow>
                                </div>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] border-b border-slate-100 pb-2 flex items-center gap-2">
                                <ShieldCheck size={14} className="text-indigo-500" />3. Statutory Compliance
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                <FormRow label="GSTIN Identification">
                                    <input 
                                        type="text" 
                                        className="w-full h-[36px] bg-white border border-slate-300 rounded-[2rem] px-3 text-xs font-black font-mono uppercase" 
                                        placeholder="GST NUMBER" 
                                        value={profile.gstin || ''} 
                                        onChange={e => setProfile({...profile, gstin: e.target.value.toUpperCase()})} 
                                    />
                                </FormRow>
                                <FormRow label="PAN Number">
                                    <input 
                                        type="text" 
                                        className="w-full h-[36px] bg-white border border-slate-300 rounded-[2rem] px-3 text-xs font-black font-mono uppercase" 
                                        placeholder="PAN NUMBER" 
                                        value={profile.panNo || ''} 
                                        onChange={e => setProfile({...profile, panNo: e.target.value.toUpperCase()})} 
                                    />
                                </FormRow>
                                <FormRow label="CIN / Registration No.">
                                    <input 
                                        type="text" 
                                        className="w-full h-[36px] bg-white border border-slate-300 rounded-[2rem] px-3 text-xs font-black font-mono uppercase" 
                                        placeholder="CIN NUMBER" 
                                        value={profile.cinNo || ''} 
                                        onChange={e => setProfile({...profile, cinNo: e.target.value.toUpperCase()})} 
                                    />
                                </FormRow>
                            </div>
                        </section>
                    </div>

                    <div className="sticky bottom-0 left-0 right-0 p-6 bg-white/95 backdrop-blur-md border-t border-slate-200 flex justify-end gap-4 shadow-[0_-15px_30px_rgba(0,0,0,0.06)] z-30 shrink-0 px-10">
                        <button onClick={() => { setViewState('stock'); setEditingId(null); }} className="px-10 py-4 bg-slate-100 text-slate-500 rounded-[2rem] font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all border border-slate-200 shadow-inner">Abort</button>
                        <button onClick={handleSave} className="px-16 py-4 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-[2rem] font-black text-[11px] uppercase tracking-widest shadow-2xl shadow-indigo-500/40 active:scale-95 transition-all hover:brightness-110">Update Registry</button>
                    </div>
                </div>
            )}

            {pendingDelete && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-in fade-in">
                    <div className="bg-white rounded-[1.5rem] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] max-w-sm w-full p-6 text-center scale-100 animate-in zoom-in-95 border border-slate-200/50">
                        <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 border border-rose-100 shadow-xl shadow-rose-500/10"><AlertTriangle size={40} /></div>
                        <h3 className="text-2xl font-playfair font-bold tracking-tight text-slate-800 uppercase tracking-tight">Purge Node?</h3>
                        <p className="text-slate-500 text-[13px] font-bold uppercase tracking-widest mt-3 leading-relaxed">Permanently remove <b className="text-slate-800">{pendingDelete.name}</b> from global registry? This action is irreversible.</p>
                        <div className="flex gap-4 mt-10">
                            <button onClick={() => setPendingDelete(null)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-[2rem] font-black text-[10px] uppercase tracking-widest border border-slate-200">Cancel</button>
                            <button onClick={performDelete} disabled={isDeleting} className="flex-1 py-4 bg-rose-600 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-xl shadow-rose-500/20 active:scale-95 transition-all">{isDeleting ? <RefreshCw className="animate-spin mx-auto" size={18} /> : "Purge Now"}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
