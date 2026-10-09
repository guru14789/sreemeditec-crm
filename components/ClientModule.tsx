import React, { useState, useMemo } from 'react';
import { Client } from '../types';
import { 
    Users, Search, MapPin, Phone, Mail, FileText, 
    ArrowUpRight, X, Building2, Wallet, Lock, 
    Trash2, RefreshCw, AlertTriangle, CreditCard,
    ShieldCheck, Globe, Info, Edit2, List, MoreVertical, Plus, Download,
    ChevronDown, ChevronRight, GitBranch
} from 'lucide-react';
import { useData } from './DataContext';
import { PDFService } from '../services/PDFService';

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
    const { clients, invoices, addClient, updateClient, removeClient, addNotification, showConfirm, previewPDF, companyProfiles } = useData();
    const [viewState, setViewState] = useState<'stock' | 'builder'>('stock');
    const [builderMode, setBuilderMode] = useState<'add' | 'edit'>('add');
    const [searchQuery, setSearchQuery] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<{ id: string, name: string } | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    // Client Bills Modal State
    const [selectedBillModal, setSelectedBillModal] = useState<{
        title: string;
        subtitle: string;
        invoices: any[];
    } | null>(null);
    const [billModalSearch, setBillModalSearch] = useState('');

    const DEFAULT_CLIENT: Partial<Client> = {
        name: '',
        hospital: '',
        branchName: '',
        parentClientName: '',
        isParentGroup: false,
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

    // 1. Fast O(1) Map for lookup of Parent Hospital Group by client/hospital name
    const clientToParentMap = useMemo(() => {
        const map = new Map<string, string>();
        (clients || []).forEach(c => {
            const parentName = (c.parentClientName || c.hospital || c.name || '').trim();
            if (!parentName) return;
            if (c.name) map.set(c.name.toLowerCase().trim(), parentName);
            if (c.hospital) map.set(c.hospital.toLowerCase().trim(), parentName);
            if (c.parentClientName) map.set(c.parentClientName.toLowerCase().trim(), parentName);
        });
        return map;
    }, [clients]);

    const getInvoiceParentGroup = (inv: any) => {
        const custName = (inv.customerName || (inv as any).clientName || '').trim();
        const custHosp = ((inv as any).customerHospital || '').trim();

        if (!custName && !custHosp) return 'Unknown Client';

        const lowCustName = custName.toLowerCase();
        if (clientToParentMap.has(lowCustName)) {
            return clientToParentMap.get(lowCustName)!;
        }

        const lowCustHosp = custHosp.toLowerCase();
        if (custHosp && clientToParentMap.has(lowCustHosp)) {
            return clientToParentMap.get(lowCustHosp)!;
        }

        const parentMatch = (clients || []).find(c => {
            const cParent = (c.parentClientName || '').trim().toLowerCase();
            const cName = (c.name || '').trim().toLowerCase();
            const cHosp = (c.hospital || '').trim().toLowerCase();
            return (cParent && (cParent === lowCustName || cParent === lowCustHosp || lowCustName.includes(cParent))) ||
                   (cName && lowCustName.includes(cName)) ||
                   (cHosp && lowCustName.includes(cHosp));
        });

        if (parentMatch) {
            return (parentMatch.parentClientName || parentMatch.hospital || parentMatch.name).trim();
        }

        return (custHosp || custName).trim();
    };

    // 2. Pre-aggregate client revenue, branch invoices, and group invoices in a SINGLE linear pass (SM/ bills only)
    const { clientRevenueMap, branchInvoicesMap, groupInvoicesMap } = useMemo(() => {
        const revMap = new Map<string, number>();
        const branchInvMap = new Map<string, any[]>();
        const groupInvMap = new Map<string, any[]>();

        (invoices || []).forEach(inv => {
            const invNum = inv.invoiceNumber || inv.id || '';
            if (!invNum.startsWith('SM/')) return;
            if (inv.documentType === 'Quotation') return;
            const grandTotal = inv.grandTotal || 0;

            const custName = (inv.customerName || (inv as any).clientName || '').trim();
            const lowCustName = custName.toLowerCase();
            if (lowCustName) {
                revMap.set(lowCustName, (revMap.get(lowCustName) || 0) + grandTotal);

                if (!branchInvMap.has(lowCustName)) {
                    branchInvMap.set(lowCustName, []);
                }
                branchInvMap.get(lowCustName)!.push(inv);
            }

            const parentGroup = getInvoiceParentGroup(inv);
            const parentKey = parentGroup.toLowerCase().trim();

            if (!groupInvMap.has(parentKey)) {
                groupInvMap.set(parentKey, []);
            }
            groupInvMap.get(parentKey)!.push(inv);
        });

        groupInvMap.forEach(list => list.sort((a, b) => (b.date || '').localeCompare(a.date || '')));
        branchInvMap.forEach(list => list.sort((a, b) => (b.date || '').localeCompare(a.date || '')));

        return {
            clientRevenueMap: revMap,
            branchInvoicesMap: branchInvMap,
            groupInvoicesMap: groupInvMap
        };
    }, [invoices, clientToParentMap, clients]);

    const getClientTotalRevenue = (clientName: string) => {
        return clientRevenueMap.get((clientName || '').toLowerCase().trim()) || 0;
    };

    const getBranchInvoices = (clientName: string) => {
        return branchInvoicesMap.get((clientName || '').toLowerCase().trim()) || [];
    };

    const getGroupInvoices = (parentName: string, branches: Client[]) => {
        const parentKey = (parentName || '').toLowerCase().trim();
        const groupList = groupInvoicesMap.get(parentKey);
        if (groupList && groupList.length > 0) return groupList;

        const branchNamesSet = new Set(branches.map(b => (b.name || '').toLowerCase().trim()));
        return (invoices || []).filter(inv => {
            const invNum = inv.invoiceNumber || inv.id || '';
            if (!invNum.startsWith('SM/')) return false;
            if (inv.documentType === 'Quotation') return false;
            const custName = (inv.customerName || '').toLowerCase().trim();
            return branchNamesSet.has(custName);
        }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    };

    const handleViewInvoicePDF = async (inv: any) => {
        try {
            const fullInvoiceData = {
                ...inv,
                companyDetails: inv.companyDetails || companyProfiles?.[0]
            };
            const isQuotation = inv.documentType === 'Quotation';
            const blob = await PDFService.generateInvoicePDF(fullInvoiceData, isQuotation, fullInvoiceData.selectedBank);
            previewPDF(blob, `${fullInvoiceData.invoiceNumber || 'Document'}.pdf`);
        } catch (err: any) {
            console.error("PDF generation failed:", err);
            addNotification("PDF Error", "Could not generate invoice PDF document.", "alert");
        }
    };

    // Extract list of all unique parent hospital groups
    const parentGroupOptions = useMemo(() => {
        const set = new Set<string>();
        clients.forEach(c => {
            if (c.parentClientName) set.add(c.parentClientName.trim());
            if (c.hospital) set.add(c.hospital.trim());
            if (c.isParentGroup && c.name) set.add(c.name.trim());
        });
        return Array.from(set).filter(Boolean).sort();
    }, [clients]);

    const filteredClients = useMemo(() => {
        const lowQuery = searchQuery.toLowerCase();
        return clients
            .filter(c => 
                (c.name || '').toLowerCase().includes(lowQuery) || 
                (c.id || '').toLowerCase().includes(lowQuery) ||
                (c.hospital || '').toLowerCase().includes(lowQuery) ||
                (c.parentClientName || '').toLowerCase().includes(lowQuery) ||
                (c.branchName || '').toLowerCase().includes(lowQuery)
            )
            .sort((a, b) => {
                const ltvA = getClientTotalRevenue(a.name);
                const ltvB = getClientTotalRevenue(b.name);
                if (ltvB !== ltvA) return ltvB - ltvA;
                return (a.name || '').localeCompare(b.name || '');
            });
    }, [clients, searchQuery, clientRevenueMap]);

    // Group clients by Parent Hospital / Organization
    const groupedClients = useMemo(() => {
        const map: Record<string, { parentName: string; branches: Client[]; totalLtv: number }> = {};

        filteredClients.forEach(c => {
            const groupKey = (c.parentClientName || c.hospital || c.name || 'Other Clients').trim().toUpperCase();
            if (!map[groupKey]) {
                map[groupKey] = {
                    parentName: (c.parentClientName || c.hospital || c.name || 'Other Clients').trim(),
                    branches: [],
                    totalLtv: 0
                };
            }
            map[groupKey].branches.push(c);
        });

        Object.values(map).forEach(group => {
            const groupInvoices = getGroupInvoices(group.parentName, group.branches);
            group.totalLtv = groupInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
        });

        return Object.values(map).sort((a, b) => b.totalLtv - a.totalLtv);
    }, [filteredClients, groupInvoicesMap]);

    const toggleGroupExpand = (groupName: string) => {
        setExpandedGroups(prev => ({
            ...prev,
            [groupName]: !prev[groupName]
        }));
    };

    const handleExportCSV = () => {
        if (filteredClients.length === 0) {
            addNotification('Export Failed', 'No client records available to export.', 'alert');
            return;
        }

        const headers = ['S.No', 'Client ID', 'Parent Organization / Hospital', 'Branch Name', 'Entity / Client Name', 'Address', 'GSTIN', 'Email', 'Phone', 'CIN No', 'PAN No', 'DL No', 'Udyam No', 'Status', 'Branch LTV Revenue (₹)'];
        const rows = filteredClients.map((c, idx) => [
            idx + 1,
            `"${(c.id || '').replace(/"/g, '""')}"`,
            `"${(c.parentClientName || c.hospital || c.name || '').replace(/"/g, '""')}"`,
            `"${(c.branchName || 'Main').replace(/"/g, '""')}"`,
            `"${(c.name || '').replace(/"/g, '""')}"`,
            `"${(c.address || '').replace(/"/g, '""')}"`,
            `"${(c.gstin || '').replace(/"/g, '""')}"`,
            `"${(c.email || '').replace(/"/g, '""')}"`,
            `"${(c.phone || '').replace(/"/g, '""')}"`,
            `"${(c.cinNo || '').replace(/"/g, '""')}"`,
            `"${(c.panNo || '').replace(/"/g, '""')}"`,
            `"${(c.dlNo || '').replace(/"/g, '""')}"`,
            `"${(c.udyamNo || '').replace(/"/g, '""')}"`,
            `"${(c.status || 'Finalized').replace(/"/g, '""')}"`,
            getClientTotalRevenue(c.name).toFixed(2)
        ]);

        const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Client_Database_Branches_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        addNotification('Export Complete', `${filteredClients.length} branch records exported to CSV.`, 'success');
    };

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
            status: client.status || 'Finalized',
            parentClientName: client.parentClientName || client.hospital || client.name,
            branchName: client.branchName || 'Main'
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
                    {/* Unified Responsive Green Gradient Toolbar */}
                    <div className="bg-gradient-to-br from-emerald-950 to-green-900 p-3 sm:p-4 md:p-5 flex flex-wrap xl:flex-nowrap justify-between items-center gap-3 md:gap-4 shadow-[0_20px_40px_-10px_rgba(4,47,46,0.5)] border border-emerald-800/30 shrink-0 relative z-20 m-1 md:m-2 rounded-[1.5rem] md:rounded-[2rem] overflow-hidden">
                        <div className="flex items-center gap-3 shrink-0">
                            <div className="w-10 h-10 xl:w-11 xl:h-11 rounded-xl sm:rounded-2xl bg-emerald-900/80 flex items-center justify-center text-[#c5a059] border border-emerald-700/50 shadow-inner shrink-0">
                                <Users size={20} />
                            </div>
                            <div className="flex flex-col">
                                <h2 className="text-base sm:text-lg font-playfair font-black tracking-tight text-white uppercase leading-none whitespace-nowrap">
                                    Client Database
                                </h2>
                                <p className="text-emerald-100/80 text-[10px] sm:text-[11px] font-semibold leading-relaxed mt-1 whitespace-nowrap">
                                    {clients.length} Indexed Branches across {groupedClients.length} Hospital Groups
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 flex-1 max-w-full xl:max-w-3xl justify-end">
                            <div className="relative flex-1 min-w-[160px] sm:w-60 md:w-64 max-w-xs">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-100/50" size={15} />
                                <input 
                                    type="text" 
                                    placeholder="Search entity, branch, GSTIN..." 
                                    className="w-full bg-emerald-900/40 border border-emerald-700/50 text-white placeholder-emerald-100/50 rounded-[2rem] py-2.5 pl-10 pr-4 text-[11px] font-bold outline-none focus:border-emerald-400 focus:bg-emerald-900/60 transition-all uppercase placeholder:normal-case shadow-inner" 
                                    value={searchQuery} 
                                    onChange={(e) => setSearchQuery(e.target.value)} 
                                />
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <button 
                                    onClick={handleExportCSV} 
                                    className="bg-emerald-900/60 border border-emerald-700/50 hover:bg-emerald-800/80 text-emerald-100 px-3.5 py-2.5 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.1em] transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-inner whitespace-nowrap" 
                                    title="Export Client Registry CSV"
                                >
                                    <Download size={14} className="text-[#c5a059]" /> Export CSV
                                </button>
                                <button 
                                    onClick={() => { setEditingId(null); setViewState('builder'); setBuilderMode('add'); setClient(DEFAULT_CLIENT); }} 
                                    className="bg-gradient-to-r from-[#c5a059] to-[#e5c185] text-amber-950 px-4 py-2.5 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.1em] shadow-[0_8px_20px_-4px_rgba(197,160,89,0.4)] hover:scale-[1.02] transition-all active:scale-95 flex items-center justify-center gap-1.5 whitespace-nowrap"
                                >
                                    <Plus size={15} /> New Client / Branch
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-300 shadow-sm overflow-hidden flex flex-col">
                        <div className="flex-1 overflow-x-auto custom-scrollbar">
                            {/* GROUPED BY PARENT HOSPITAL VIEW (Accordions closed by default) */}
                            <div className="divide-y divide-slate-200">
                                {groupedClients.map((group) => {
                                    const isExpanded = !!expandedGroups[group.parentName];
                                    const groupInvoices = getGroupInvoices(group.parentName, group.branches);

                                    return (
                                        <div key={group.parentName} className="bg-slate-50/50">
                                            {/* Parent Group Header */}
                                            <div 
                                                onClick={() => toggleGroupExpand(group.parentName)}
                                                className="px-6 py-4 bg-slate-100/90 hover:bg-slate-200/80 cursor-pointer flex items-center justify-between transition-colors border-b border-slate-200 select-none"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <button className="text-slate-500 hover:text-slate-800 transition-transform">
                                                        {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                                    </button>
                                                    <div className="w-9 h-9 rounded-xl bg-emerald-900 text-[#d4af37] flex items-center justify-center font-black text-sm uppercase shadow-sm border border-emerald-800">
                                                        {group.parentName.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-playfair font-black text-slate-900 uppercase text-sm md:text-base tracking-tight flex flex-wrap items-center gap-2">
                                                            {group.parentName}
                                                            {/* Branch Indicator Badge */}
                                                            <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                                                                <GitBranch size={10} /> {group.branches.length} {group.branches.length === 1 ? 'Branch' : 'Branches'}
                                                            </span>
                                                            {/* Client / Group Bills View Button */}
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedBillModal({
                                                                        title: group.parentName,
                                                                        subtitle: `Consolidated Bills & Invoices across ${group.branches.length} ${group.branches.length === 1 ? 'branch' : 'branches'} under ${group.parentName}`,
                                                                        invoices: groupInvoices
                                                                    });
                                                                    setBillModalSearch('');
                                                                }}
                                                                className="text-[9px] font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 hover:scale-105 active:scale-95 px-2.5 py-0.5 rounded-full border border-amber-300 flex items-center gap-1 transition-all shadow-sm cursor-pointer"
                                                                title="View all bills for this client group"
                                                            >
                                                                <FileText size={10} className="text-amber-700" /> {groupInvoices.length} {groupInvoices.length === 1 ? 'Bill' : 'Bills'}
                                                            </button>
                                                        </div>
                                                        <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-0.5">
                                                            Consolidated Parent Hospital Entity
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-6">
                                                    <div className="text-right">
                                                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Aggregated LTV</div>
                                                        <div className="font-black text-emerald-700 text-sm md:text-base">₹{formatIndianNumber(group.totalLtv)}</div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Branch Table inside Parent Group (Shown only when expanded) */}
                                            {isExpanded && (
                                                <table className="w-full text-left text-[11px] bg-white">
                                                    <thead className="bg-slate-50 font-bold uppercase text-[8px] text-slate-400 border-b tracking-widest">
                                                        <tr>
                                                            <th className="pl-12 pr-4 py-2 w-12 text-center">S.No</th>
                                                            <th className="px-4 py-2">Branch / Facility Name</th>
                                                            <th className="px-4 py-2">Branch Address & GSTIN</th>
                                                            <th className="px-4 py-2 text-right">Branch LTV</th>
                                                            <th className="px-4 py-2 text-right">Status</th>
                                                            <th className="px-4 py-2 text-right pr-6">Management</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {group.branches.map((c, idx) => {
                                                            const branchInvoices = getBranchInvoices(c.name);

                                                            return (
                                                                <tr key={c.id} className="hover:bg-emerald-50/40 transition-colors group cursor-pointer" onClick={() => { setClient(c); setEditingId(c.id); setViewState('builder'); setBuilderMode('edit'); }}>
                                                                    <td className="pl-12 pr-4 py-3 font-semibold text-slate-400 text-center w-12">{idx + 1}</td>
                                                                    <td className="px-4 py-3">
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex shrink-0 items-center justify-center font-bold text-xs">
                                                                                <GitBranch size={14} />
                                                                            </div>
                                                                            <div>
                                                                                <div className="font-lato font-bold text-slate-800 uppercase text-[12px] tracking-tight flex items-center gap-2">
                                                                                    {c.name}
                                                                                    {c.branchName && <span className="text-[8px] font-black text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">BRANCH: {c.branchName}</span>}
                                                                                </div>
                                                                                <div className="text-[8px] text-slate-400 font-medium uppercase tracking-widest mt-0.5">{c.id}</div>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-4 py-3">
                                                                        <div className="flex flex-col gap-0.5">
                                                                            <span className="text-[8px] font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-1"><MapPin size={10} className="text-emerald-600" /> {c.address.slice(0, 45)}...</span>
                                                                            {c.gstin && <span className="text-[8px] font-mono font-bold text-emerald-700 uppercase">GST: {c.gstin}</span>}
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-right font-black text-emerald-700 text-[13px]">₹{formatIndianNumber(getClientTotalRevenue(c.name))}</td>
                                                                    <td className="px-4 py-3 text-right">
                                                                        <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-lg border ${c.status === 'Draft' ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-emerald-50 border-emerald-200 text-emerald-600'}`}>{c.status || 'Finalized'}</span>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-right pr-6">
                                                                        <div className="flex justify-end items-center gap-2">
                                                                            <button 
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setSelectedBillModal({
                                                                                        title: c.name,
                                                                                        subtitle: `Branch Bills & Invoices: ${c.branchName || 'Main'} (${c.parentClientName || c.hospital || c.name})`,
                                                                                        invoices: branchInvoices
                                                                                    });
                                                                                    setBillModalSearch('');
                                                                                }}
                                                                                className="p-1.5 px-2.5 text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-full border border-amber-200 transition-all flex items-center gap-1 text-[9px] font-bold"
                                                                                title="View bills for this specific branch"
                                                                            >
                                                                                <FileText size={11} className="text-amber-600" /> {branchInvoices.length} {branchInvoices.length === 1 ? 'Bill' : 'Bills'}
                                                                            </button>
                                                                            <button onClick={(e) => { e.stopPropagation(); setPendingDelete({ id: c.id, name: c.name }); }} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all border border-transparent hover:border-rose-100" title="Delete Branch"><Trash2 size={14} /></button>
                                                                            <div className="p-2 text-emerald-600 bg-emerald-50 rounded-full border border-emerald-100" title="Edit Branch"><Edit2 size={14} /></div>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                    );
                                })}
                                {groupedClients.length === 0 && (
                                    <div className="py-20 text-center text-slate-300 font-semibold uppercase tracking-[0.5em] opacity-30 italic">No Parent Groups or Client Branches Found</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* CLIENT & BRANCH INTAKE FORM */
                <div className="flex-1 flex flex-col bg-white rounded-[2.5rem] shadow-2xl border border-slate-300 overflow-hidden animate-in slide-in-from-bottom-6 duration-300">
                    <div className="flex bg-slate-50/80 backdrop-blur-sm border-b border-slate-300 shrink-0 px-4 sm:px-6 lg:px-10 py-3 md:py-6 justify-between items-center gap-3">
                        <div className="flex flex-col"><h3 className="font-playfair text-lg md:text-2xl font-black tracking-tight text-slate-800 uppercase tracking-tight leading-tight">{builderMode === 'add' ? 'Entity / Branch Intake Form' : 'Update Client Record'}</h3><p className="text-[8px] md:text-[10px] font-medium text-slate-400 uppercase tracking-widest mt-0.5 md:mt-1 leading-tight">{builderMode === 'add' ? 'Synchronizing multi-branch entity with cloud registry' : `Modifying ${client.name}`}</p></div>
                        <button onClick={() => setViewState('stock')} className="p-2 md:p-3 shrink-0 bg-white text-slate-400 rounded-[2rem] hover:text-slate-600 transition-all border border-slate-200 shadow-sm"><X className="w-4 h-4 md:w-6 md:h-6"/></button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 space-y-6 md:space-y-12 custom-scrollbar pb-24 md:pb-32">
                        <section className="space-y-3 md:space-y-4">
                            <h3 className="text-[9px] md:text-[10px] font-semibold text-slate-400 uppercase tracking-[0.4em] border-b border-slate-100 pb-2 flex items-center gap-2"><Building2 size={14} className="text-emerald-500" />1. Legal Entity & Multi-Branch Profiling</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-3">
                                <div className="sm:col-span-2">
                                    <FormRow label="Client / Branch Name *">
                                        <input type="text" className="w-full h-[32px] md:h-[36px] bg-slate-50 border border-slate-300 rounded-xl md:rounded-[2rem] px-3 text-[10px] md:text-xs font-semibold outline-none focus:ring-4 focus:ring-emerald-500/5 uppercase" placeholder="E.G. KMCH PEELAMEDU BRANCH" value={client.name || ''} onChange={e => setClient({...client, name: e.target.value.toUpperCase()})} />
                                    </FormRow>
                                </div>
                                <div className="sm:col-span-2">
                                    <FormRow label="Facility / Hospital Name">
                                        <input type="text" className="w-full h-[32px] md:h-[36px] bg-slate-50 border border-slate-300 rounded-xl md:rounded-[2rem] px-3 text-[10px] md:text-xs font-medium outline-none uppercase" placeholder="HOSPITAL NAME" value={client.hospital || ''} onChange={e => setClient({...client, hospital: e.target.value})} />
                                    </FormRow>
                                </div>
                                <div className="sm:col-span-2">
                                    <FormRow label="Parent Organization / Hospital (For Analytics Grouping)">
                                        <input 
                                            type="text" 
                                            list="parent-groups"
                                            className="w-full h-[32px] md:h-[36px] bg-white border border-slate-300 rounded-xl md:rounded-[2rem] px-3 text-[10px] md:text-xs font-semibold outline-none uppercase focus:border-emerald-500" 
                                            placeholder="E.G. KOVAI MEDICAL CENTER GROUP" 
                                            value={client.parentClientName || ''} 
                                            onChange={e => setClient({...client, parentClientName: e.target.value.toUpperCase()})} 
                                        />
                                        <datalist id="parent-groups">
                                            {parentGroupOptions.map(pg => <option key={pg} value={pg} />)}
                                        </datalist>
                                    </FormRow>
                                </div>
                                <div className="sm:col-span-2">
                                    <FormRow label="Branch Name / Location Tag">
                                        <input type="text" className="w-full h-[32px] md:h-[36px] bg-white border border-slate-300 rounded-xl md:rounded-[2rem] px-3 text-[10px] md:text-xs font-semibold outline-none uppercase focus:border-emerald-500" placeholder="E.G. PEELAMEDU BRANCH / UNIT 1" value={client.branchName || ''} onChange={e => setClient({...client, branchName: e.target.value})} />
                                    </FormRow>
                                </div>
                                <div className="col-span-1 sm:col-span-4">
                                    <FormRow label="Physical / Branch Address *">
                                        <textarea className="w-full min-h-[60px] md:min-h-[100px] bg-white border border-slate-300 rounded-xl md:rounded-[2rem] px-3 py-2 text-[10px] md:text-sm font-medium outline-none focus:border-emerald-500" placeholder="FULL REGISTERED ADDRESS FOR THIS BRANCH" value={client.address || ''} onChange={e => setClient({...client, address: e.target.value})} />
                                    </FormRow>
                                </div>
                            </div>
                        </section>

                        <section className="space-y-3 md:space-y-4">
                            <h3 className="text-[9px] md:text-[10px] font-semibold text-slate-400 uppercase tracking-[0.4em] border-b border-slate-100 pb-2 flex items-center gap-2"><ShieldCheck size={14} className="text-emerald-500" />2. Statutory Compliance (Branch-Specific)</h3>
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
                                        <input type="text" className="w-full h-[32px] md:h-[36px] bg-white border border-slate-300 rounded-xl md:rounded-[2rem] px-3 text-[10px] md:text-xs font-medium uppercase" placeholder="branch@hospital.com" value={client.email || ''} onChange={e => setClient({...client, email: e.target.value})} />
                                        <span className="text-[8px] text-slate-400 font-bold px-1 uppercase tracking-tighter">Separate multiple emails with commas</span>
                                    </FormRow>
                                </div>
                                <div className="sm:col-span-2">
                                    <FormRow label="Phone / Mobile Number(s)">
                                        <input type="text" className="w-full h-[32px] md:h-[36px] bg-white border border-slate-300 rounded-xl md:rounded-[2rem] px-3 text-[10px] md:text-xs font-semibold font-mono" placeholder="9876543210" value={client.phone || ''} onChange={e => setClient({...client, phone: e.target.value})} />
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

            {/* DELETE CONFIRMATION MODAL */}
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

            {/* CLIENT BILLS & INVOICES MODAL */}
            {selectedBillModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-5 animate-in fade-in" onClick={() => setSelectedBillModal(null)}>
                    <div className="bg-white rounded-[2rem] shadow-2xl max-w-5xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className="p-4 sm:p-6 bg-gradient-to-br from-emerald-950 to-green-900 text-white flex justify-between items-center gap-4 shrink-0">
                            <div className="flex items-center gap-3.5">
                                <div className="w-10 h-10 rounded-2xl bg-emerald-900/80 border border-emerald-700/50 flex items-center justify-center text-[#c5a059]">
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <h3 className="font-playfair font-black text-lg sm:text-xl uppercase tracking-tight text-white">{selectedBillModal.title}</h3>
                                    <p className="text-emerald-100/70 text-[10px] sm:text-[11px] font-medium leading-relaxed mt-0.5">{selectedBillModal.subtitle}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedBillModal(null)} className="p-2 rounded-full bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 hover:text-white transition-all border border-emerald-700/50">
                                <X size={18} />
                            </button>
                        </div>

                        {/* KPI Cards Strip & Search */}
                        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 shrink-0">
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Total Bills</span>
                                    <span className="text-sm font-black text-slate-800">{selectedBillModal.invoices.length} Invoices</span>
                                </div>
                                <div className="bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Total Billed</span>
                                    <span className="text-sm font-black text-emerald-700">₹{formatIndianNumber(selectedBillModal.invoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0))}</span>
                                </div>
                                <div className="bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Total Outstanding</span>
                                    <span className="text-sm font-black text-rose-600">₹{formatIndianNumber(selectedBillModal.invoices.reduce((sum, inv) => sum + Math.max(0, (inv.grandTotal || 0) - (inv.paidAmount || 0)), 0))}</span>
                                </div>
                            </div>

                            <div className="relative flex-1 sm:w-64 min-w-[200px]">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <input 
                                    type="text" 
                                    placeholder="Filter by invoice #, date, amount..." 
                                    value={billModalSearch} 
                                    onChange={e => setBillModalSearch(e.target.value)} 
                                    className="w-full bg-white border border-slate-300 rounded-[2rem] py-2 pl-9 pr-3 text-[11px] font-bold text-slate-700 outline-none focus:border-emerald-500 shadow-sm uppercase placeholder:normal-case"
                                />
                            </div>
                        </div>

                        {/* Invoices List Table */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {(() => {
                                const filtered = selectedBillModal.invoices.filter(inv => {
                                    const q = billModalSearch.toLowerCase();
                                    return (inv.invoiceNumber || '').toLowerCase().includes(q) ||
                                           (inv.date || '').toLowerCase().includes(q) ||
                                           (inv.customerName || '').toLowerCase().includes(q) ||
                                           (inv.grandTotal || 0).toString().includes(q);
                                });

                                if (filtered.length === 0) {
                                    return (
                                        <div className="py-16 text-center text-slate-400 font-semibold uppercase tracking-widest text-xs italic">
                                            No Bills Found for this Client
                                        </div>
                                    );
                                }

                                return (
                                    <table className="w-full text-left border-collapse text-[11px]">
                                        <thead className="bg-slate-100 sticky top-0 z-20 font-black uppercase text-[9px] text-slate-600 border-b border-slate-200 shadow-sm">
                                            <tr>
                                                <th className="py-3 px-4 bg-slate-100">Invoice #</th>
                                                <th className="py-3 px-4 bg-slate-100">Branch / Client Entity</th>
                                                <th className="py-3 px-4 bg-slate-100">Date</th>
                                                <th className="py-3 px-4 bg-slate-100 text-right">Billed Amount</th>
                                                <th className="py-3 px-4 bg-slate-100 text-right">Paid Amount</th>
                                                <th className="py-3 px-4 bg-slate-100 text-right">Outstanding</th>
                                                <th className="py-3 px-4 bg-slate-100 text-center">Status</th>
                                                <th className="py-3 px-4 bg-slate-100 text-right pr-6">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 bg-white">
                                            {filtered.map((inv, idx) => {
                                                const billed = inv.grandTotal || 0;
                                                const paid = inv.paidAmount || 0;
                                                const outstanding = Math.max(0, billed - paid);
                                                const isPaid = paid >= billed;
                                                const isPartiallyPaid = paid > 0 && paid < billed;

                                                return (
                                                    <tr key={inv.id || idx} className="hover:bg-slate-50/80 transition-colors">
                                                        <td className="py-3.5 px-4 font-bold text-emerald-800 font-mono text-[12px]">{inv.invoiceNumber || inv.id}</td>
                                                        <td className="py-3.5 px-4">
                                                            <div className="font-bold text-slate-800 uppercase text-[11px]">{inv.customerName}</div>
                                                            {inv.customerGstin && <div className="text-[8px] font-mono text-slate-400 mt-0.5">GST: {inv.customerGstin}</div>}
                                                        </td>
                                                        <td className="py-3.5 px-4 text-slate-600 font-medium">{inv.date}</td>
                                                        <td className="py-3.5 px-4 text-right font-black text-slate-800">₹{formatIndianNumber(billed)}</td>
                                                        <td className="py-3.5 px-4 text-right font-bold text-emerald-700">₹{formatIndianNumber(paid)}</td>
                                                        <td className="py-3.5 px-4 text-right font-bold text-rose-600">₹{formatIndianNumber(outstanding)}</td>
                                                        <td className="py-3.5 px-4 text-center">
                                                            <span className={`text-[8px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${isPaid ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : isPartiallyPaid ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                                                                {isPaid ? 'Paid' : isPartiallyPaid ? 'Partial' : 'Unpaid'}
                                                            </span>
                                                        </td>
                                                        <td className="py-3.5 px-4 text-right pr-6">
                                                            <button 
                                                                onClick={() => handleViewInvoicePDF(inv)}
                                                                className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-black text-[9px] uppercase tracking-wider rounded-xl border border-emerald-200 transition-all flex items-center gap-1 ml-auto shrink-0 shadow-sm"
                                                                title="View / Print PDF"
                                                            >
                                                                <FileText size={11} className="text-emerald-600" /> View PDF
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
