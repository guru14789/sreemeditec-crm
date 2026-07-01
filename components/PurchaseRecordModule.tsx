import { ToggleSwitch } from './ToggleSwitch';
import React, { useState, useMemo } from 'react';
import { PurchaseRecord, PurchaseItem, TabView } from '../types';
import { ShoppingCart, Calendar, User, Package, FileText, IndianRupee, Trash2, ArrowUpRight, X, RefreshCw, AlertTriangle, Search, Plus, Filter, Edit, Wallet, CheckCheck } from 'lucide-react';
import { useData } from './DataContext';
import { FilingFilterDropdown } from './FilingFilterDropdown';
import { FiledStatusIndicator } from './FiledStatusIndicator';

const formatIndianNumber = (num: number) => {
    return (num || 0).toLocaleString('en-IN', {
        maximumFractionDigits: 2
    });
};

const FormRow = ({ label, children }: { label: string, children?: React.ReactNode }) => (
    <div className="flex flex-col gap-1 w-full">
        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1 truncate whitespace-nowrap min-h-[12px]">{label}</label>
        {children}
    </div>
);

import { AutoSuggest } from './AutoSuggest';

export const PurchaseRecordModule: React.FC = () => {
    const { purchaseRecords, addPurchaseRecord, updatePurchaseRecord, removePurchaseRecord, addNotification, currentUser, products, vendors, setActiveTab, setPendingSupplierPOData, isSystemAdmin } = useData();
    const isAdmin = currentUser?.permissions?.[TabView.PURCHASE_REGISTER] === 'Admin' || isSystemAdmin;
    const [searchQuery, setSearchQuery] = useState('');
    const [filingFilter, setFilingFilter] = useState<'All' | 'Filed' | 'Not Filed' | 'Not Updated'>('All');
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<PurchaseRecord | null>(null);
    const INITIAL_RECORD_STATE: Partial<PurchaseRecord> = {
        dateSupply: new Date().toISOString().split('T')[0],
        materialReceivedDate: new Date().toISOString().split('T')[0],
        items: [],
        packingCharges: 0,
        forwardingCharges: 0,
        freightCharges: 0,
        freightGstPercent: 0,
        totalGst: 0,
        totalIgst: 0,
        total: 0,
        isRoundOff: true,
        roundOff: 0,
        paidAmount: 0,
        status: 'Pending'
    };

    const INITIAL_ITEM_STATE: Partial<PurchaseItem> & { taxType?: 'Local' | 'Interstate' } = {
        equipmentName: '',
        rate: 0,
        qty: 1,
        unit: 'nos',
        cgstPercent: 0,
        sgstPercent: 0,
        igstPercent: 0,
        taxType: 'Local',
        totalIgst: 0,
        totalGst: 0,
        total: 0
    };

    const [newRecord, setNewRecord] = useState<Partial<PurchaseRecord>>(INITIAL_RECORD_STATE);
    const [currentItem, setCurrentItem] = useState<Partial<PurchaseItem> & { taxType?: 'Local' | 'Interstate', gstPercent?: number }>(INITIAL_ITEM_STATE);

    const [isDeleting, setIsDeleting] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<{ id: string, name: string } | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);

    const handleNewEntry = () => {
        setNewRecord(INITIAL_RECORD_STATE);
        setCurrentItem(INITIAL_ITEM_STATE);
        setEditingId(null);
        setShowAddModal(true);
    };

    const calculateTotals = (data: Partial<PurchaseRecord>, itemsList: PurchaseItem[] = []) => {
        const packing = Number(data.packingCharges) || 0;
        const forwarding = Number(data.forwardingCharges) || 0;
        const freight = Number(data.freightCharges) || 0;
        const freightGstPerc = Number(data.freightGstPercent) || 0;
        
        let totalGst = 0;
        let totalIgst = 0;
        let totalItems = 0;

        itemsList.forEach(item => {
             totalGst += item.totalGst || 0;
             totalIgst += item.totalIgst || 0;
             totalItems += item.total || 0;
        });

        // Calculate freight tax
        const isInterstate = totalIgst > 0 || (itemsList.length > 0 && itemsList[0].igstPercent! > 0);
        const freightTaxAmount = (freight * freightGstPerc) / 100;
        
        if (isInterstate) {
            totalIgst += freightTaxAmount;
        } else {
            totalGst += freightTaxAmount;
        }

        let total = totalItems + packing + forwarding + freight + freightTaxAmount;
        let roundOff = 0;

        if (data.isRoundOff) {
            const roundedTotal = Math.round(total);
            roundOff = Number((roundedTotal - total).toFixed(2));
            total = roundedTotal;
        }

        return { ...data, totalGst, totalIgst, total, roundOff };
    };

    const handleInputChange = (field: keyof PurchaseRecord, value: any) => {
        let val = value;
        if ((field === 'supplier' || field === 'invoiceNo') && typeof value === 'string') {
            val = value.toUpperCase();
        }
        const updated = { ...newRecord, [field]: val };
        setNewRecord(calculateTotals(updated, newRecord.items || []));
    };

    const handleItemChange = (field: keyof PurchaseItem | 'gstType' | 'taxType', value: any) => {
        let val = value;
        if (field === 'equipmentName' && typeof value === 'string') {
            val = value.toUpperCase();
            const product = products.find(p => p.name.toUpperCase() === val);
            if (product) {
                const rate = product.purchasePrice || product.price || 0;
                const taxRate = product.taxRate || 0;
                const isInterstate = currentItem.taxType === 'Interstate';
                
                const updatedItem = { 
                    ...currentItem, 
                    equipmentName: val,
                    rate,
                    gstPercent: taxRate, // Ensure gstPercent is set
                    cgstPercent: isInterstate ? 0 : taxRate / 2,
                    sgstPercent: isInterstate ? 0 : taxRate / 2,
                    igstPercent: isInterstate ? taxRate : 0
                };
                
                const basicAmount = rate * (updatedItem.qty || 1);
                const taxAmt = (basicAmount * taxRate) / 100;
                
                setCurrentItem({ 
                    ...updatedItem, 
                    totalGst: isInterstate ? 0 : taxAmt, 
                    totalIgst: isInterstate ? taxAmt : 0, 
                    total: basicAmount + taxAmt 
                });
                return;
            }
        }
        
        // Handle Tax Type change
        if (field === 'taxType') {
            const currentGstPerc = (currentItem.cgstPercent || 0) + (currentItem.sgstPercent || 0) + (currentItem.igstPercent || 0);
            const rate = Number(currentItem.rate) || 0;
            const qty = Number(currentItem.qty) || 0;
            const basicAmount = rate * qty;
            
            if (value === 'Interstate') {
                const totalIgst = (basicAmount * currentGstPerc) / 100;
                setCurrentItem({ 
                    ...currentItem, 
                    taxType: 'Interstate',
                    igstPercent: currentGstPerc, 
                    cgstPercent: 0, 
                    sgstPercent: 0,
                    totalGst: 0,
                    totalIgst,
                    total: basicAmount + totalIgst
                });
            } else {
                const totalGst = (basicAmount * currentGstPerc) / 100;
                setCurrentItem({ 
                    ...currentItem, 
                    taxType: 'Local',
                    igstPercent: 0, 
                    cgstPercent: currentGstPerc / 2, 
                    sgstPercent: currentGstPerc / 2,
                    totalGst,
                    totalIgst: 0,
                    total: basicAmount + totalGst
                });
            }
            return;
        }

        const updated = { ...currentItem, [field]: val };
        const rate = Number(updated.rate) || 0;
        const qty = Number(updated.qty) || 0;
        const basicAmount = rate * qty;

        // Handle single GST percentage field change or re-calculating totals on rate/qty change
        if (field === 'gstPercent' || field === 'rate' || field === 'qty') {
            const totalPerc = field === 'gstPercent' 
                ? Number(val) || 0 
                : (Number(updated.gstPercent) || (Number(currentItem.cgstPercent || 0) + Number(currentItem.sgstPercent || 0) + Number(currentItem.igstPercent || 0)));
            
            const isInterstate = currentItem.taxType === 'Interstate';
            
            if (isInterstate) {
                const igstAmt = (basicAmount * totalPerc) / 100;
                setCurrentItem({ 
                    ...updated, 
                    gstPercent: totalPerc,
                    igstPercent: totalPerc,
                    cgstPercent: 0,
                    sgstPercent: 0,
                    totalIgst: igstAmt, 
                    totalGst: 0, 
                    total: basicAmount + igstAmt 
                });
            } else {
                const cgstAmt = (basicAmount * (totalPerc / 2)) / 100;
                const sgstAmt = (basicAmount * (totalPerc / 2)) / 100;
                setCurrentItem({ 
                    ...updated, 
                    gstPercent: totalPerc,
                    cgstPercent: totalPerc / 2,
                    sgstPercent: totalPerc / 2,
                    igstPercent: 0,
                    totalGst: cgstAmt + sgstAmt, 
                    totalIgst: 0, 
                    total: basicAmount + cgstAmt + sgstAmt 
                });
            }
            return;
        }

        const totalGst = ((basicAmount * (Number(updated.cgstPercent) || 0)) / 100) + ((basicAmount * (Number(updated.sgstPercent) || 0)) / 100);
        const totalIgst = (basicAmount * (Number(updated.igstPercent) || 0)) / 100;
        
        setCurrentItem({ ...updated, totalGst, totalIgst, total: basicAmount + totalGst + totalIgst });

    };

    const handleAddItem = () => {
        if (!currentItem.equipmentName) {
            alert("Equipment name is required");
            return;
        }
        const item: PurchaseItem = {
            id: currentItem.id || `PI-${Date.now()}`,
            equipmentName: currentItem.equipmentName || '',
            rate: Number(currentItem.rate) || 0,
            qty: Number(currentItem.qty) || 0,
            unit: currentItem.unit || 'nos',
            gstPercent: Number(currentItem.gstPercent) || 0,
            cgstPercent: Number(currentItem.cgstPercent) || 0,
            sgstPercent: Number(currentItem.sgstPercent) || 0,
            igstPercent: Number(currentItem.igstPercent) || 0,
            totalIgst: Number(currentItem.totalIgst) || 0,
            totalGst: Number(currentItem.totalGst) || 0,
            total: Number(currentItem.total) || 0,
        } as PurchaseItem;
        
        let updatedItems;
        if (currentItem.id) {
            // Edit existing item
            updatedItems = (newRecord.items || []).map(i => i.id === currentItem.id ? item : i);
        } else {
            // Add new item
            updatedItems = [...(newRecord.items || []), item];
        }
        
        setNewRecord(calculateTotals({ ...newRecord, items: updatedItems }, updatedItems));
        setCurrentItem({
            equipmentName: '',
            rate: 0,
            qty: 1,
            unit: 'nos',
            cgstPercent: 0,
            sgstPercent: 0,
            igstPercent: 0,
            gstPercent: 0,
            taxType: 'Local',
            totalIgst: 0,
            totalGst: 0,
            total: 0
        });
    };

    const handleEditItem = (item: PurchaseItem) => {
        const totalPerc = (item.cgstPercent || 0) + (item.sgstPercent || 0) + (item.igstPercent || 0);
        setCurrentItem({
            ...item,
            taxType: item.igstPercent ? 'Interstate' : 'Local',
            gstPercent: totalPerc
        });
    };

    
    const handleRemoveItem = (id: string) => {
        const updatedItems = (newRecord.items || []).filter(i => i.id !== id);
        setNewRecord(calculateTotals({ ...newRecord, items: updatedItems }, updatedItems));
    };
    const handleSaveRecord = async () => {
        let itemsToSave = [...(newRecord.items || [])];
        
        // If items are empty but currentItem has data, auto-add it
        if (itemsToSave.length === 0 && currentItem.equipmentName) {
            const item: PurchaseItem = {
                id: `PI-${Date.now()}`,
                equipmentName: currentItem.equipmentName || '',
                rate: Number(currentItem.rate) || 0,
                qty: Number(currentItem.qty) || 0,
                unit: currentItem.unit || 'nos',
                gstPercent: Number(currentItem.gstPercent) || 0,
                cgstPercent: Number(currentItem.cgstPercent) || 0,
                sgstPercent: Number(currentItem.sgstPercent) || 0,
                igstPercent: Number(currentItem.igstPercent) || 0,
                totalIgst: Number(currentItem.totalIgst) || 0,
                totalGst: Number(currentItem.totalGst) || 0,
                total: Number(currentItem.total) || 0,
            } as PurchaseItem;
            itemsToSave.push(item);
        }

        if (itemsToSave.length === 0) {
            alert("Please add at least one equipment.");
            return;
        }

        const id = editingId || `PR-${Date.now()}`;
        // Re-calculate totals based on items to save
        const finalTotals = calculateTotals({ ...newRecord, items: itemsToSave }, itemsToSave);
        
        const paidAmount = Number(finalTotals.paidAmount) || 0;
        const balance = (finalTotals.total || 0) - paidAmount;
        const status = balance <= 0 ? 'Completed' : 'Pending';

        const record: PurchaseRecord = {
            id,
            dateSupply: finalTotals.dateSupply || '',
            materialReceivedDate: finalTotals.materialReceivedDate || '',
            supplier: finalTotals.supplier || '',
            invoiceNo: finalTotals.invoiceNo || '',
            items: itemsToSave,
            packingCharges: Number(finalTotals.packingCharges) || 0,
            forwardingCharges: Number(finalTotals.forwardingCharges) || 0,
            freightCharges: Number(finalTotals.freightCharges) || 0,
            freightGstPercent: Number(finalTotals.freightGstPercent) || 0,
            totalGst: Number(finalTotals.totalGst) || 0,
            totalIgst: Number(finalTotals.totalIgst) || 0,
            total: Number(finalTotals.total) || 0,
            isRoundOff: finalTotals.isRoundOff,
            roundOff: finalTotals.roundOff,
            createdBy: currentUser?.name,
            paidAmount,
            status
        };

        if (editingId) {
            await updatePurchaseRecord(editingId, record);
            addNotification('Entry Updated', `Purchase from ${record.supplier} updated.`, 'success');
        } else {
            await addPurchaseRecord(record);
            addNotification('Entry Recorded', `Purchase from ${record.supplier} saved.`, 'success');
        }

        setShowAddModal(false);
        setEditingId(null);
        setNewRecord(INITIAL_RECORD_STATE);
        setCurrentItem(INITIAL_ITEM_STATE);
    };

    const handleEdit = (record: PurchaseRecord) => {
        setNewRecord({
            ...record,
            items: record.items || []
        });
        setEditingId(record.id);
        setShowAddModal(true);
    };

    const filteredRecords = useMemo(() => {
        let filtered = purchaseRecords.filter(r =>
            (r.supplier || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (r.equipmentName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (r.invoiceNo || '').toLowerCase().includes(searchQuery.toLowerCase())
        );

        if (filingFilter !== 'All') {
            filtered = filtered.filter(r => {
                if (filingFilter === 'Not Updated') {
                    return !r.filedStatus || r.filedStatus === 'Not Updated';
                }
                return r.filedStatus === filingFilter;
            });
        }

        return filtered;
    }, [purchaseRecords, searchQuery, filingFilter]);

    return (
        <div className="h-full flex flex-col gap-2 md:gap-3 relative overflow-hidden p-0 md:p-2 bg-slate-50/50">
            {/* Unified Green Gradient Toolbar */}
            <div className="bg-gradient-to-br from-emerald-950 to-green-900 p-4 md:p-5 flex flex-col gap-4 shadow-[0_20px_40px_-10px_rgba(6,78,59,0.55),_inset_0_2px_3px_rgba(255,255,255,0.1)] shrink-0 relative z-10 m-0 md:m-3 lg:m-4 rounded-none md:rounded-[2rem]">
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none rounded-none md:rounded-[2rem]"></div>
                
                {/* Top Row: Title & Stats */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10 w-full">
                    <div className="hidden lg:flex items-center gap-4 group">
                        <div className="w-10 h-10 xl:w-12 xl:h-12 flex items-center justify-center text-[#c5a059] drop-shadow-md transition-transform group-hover:scale-110 shrink-0">
                            <ShoppingCart size={20} className="hidden xl:block" />
                            <ShoppingCart size={16} className="xl:hidden" />
                        </div>
                        <div className="flex flex-col">
                            <h2 className="text-lg xl:text-xl font-playfair font-bold tracking-tight text-white uppercase leading-none whitespace-nowrap">Purchase Entry</h2>
                            <p className="text-emerald-100/80 text-[11px] md:text-xs font-semibold leading-relaxed">{purchaseRecords.length} Total Records</p>
                        </div>
                    </div>

                    <div className="hidden md:flex items-center gap-4 bg-gradient-to-r from-[#c5a059] to-[#e5c185] border border-[#d4af37]/40 shadow-[0_10px_20px_-5px_rgba(212,175,55,0.4)] rounded-[1.5rem] px-5 py-2 w-full sm:w-auto shrink-0">
                        <div className="p-1.5 bg-amber-950/10 text-amber-950 rounded-full shadow-inner shrink-0">
                            <Wallet size={16} />
                        </div>
                        <div className="flex flex-col truncate">
                            <p className="text-[8px] font-black text-amber-950/70 uppercase tracking-widest leading-none mb-1 truncate">Total Outstanding</p>
                            <p className="text-lg font-playfair font-bold tracking-tight text-amber-950 leading-none tabular-nums">
                                ₹{(() => {
                                    const total = purchaseRecords.reduce((sum, r) => sum + ((r.total || 0) - (r.paidAmount || 0)), 0);
                                    if (total >= 10000000) return `${(total / 10000000).toLocaleString('en-IN', { maximumFractionDigits: 2 })}Cr`;
                                    if (total >= 100000) return `${(total / 100000).toLocaleString('en-IN', { maximumFractionDigits: 2 })}L`;
                                    if (total >= 1000) return `${(total / 1000).toLocaleString('en-IN', { maximumFractionDigits: 2 })}T`;
                                    return total.toLocaleString('en-IN', { maximumFractionDigits: 2 });
                                })()}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Bottom Row: Search & Actions */}
                <div className="flex flex-col xl:flex-row items-center justify-between gap-4 relative z-10 w-full">
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto flex-1 group">
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <FilingFilterDropdown value={filingFilter} onChange={setFilingFilter} />
                        </div>
                        <div className="relative w-full sm:max-w-xs xl:max-w-md 2xl:max-w-lg flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-100/50 transition-colors" size={16} />
                            <input 
                                type="text" 
                                placeholder="Search registry..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                                className="w-full bg-emerald-900/40 border border-emerald-700/50 text-white placeholder-emerald-100/50 rounded-[2rem] py-2.5 sm:py-2 pl-11 pr-10 text-[11px] font-bold outline-none focus:border-emerald-400 focus:bg-emerald-900/60 transition-all uppercase placeholder:normal-case shadow-inner"
                            />
                            {searchQuery && (
                                <button 
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400 hover:text-emerald-300 transition-colors"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                    
                    <button
                        onClick={handleNewEntry}
                        className="w-full sm:w-auto bg-gradient-to-r from-[#c5a059] to-[#e5c185] text-amber-950 px-7 py-3 md:py-2.5 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.15em] shadow-[0_15px_30px_-5px_rgba(197,160,89,0.4)] hover:scale-[1.02] hover:shadow-[0_20px_40px_-5px_rgba(197,160,89,0.6)] transition-all active:scale-95 flex items-center justify-center gap-2 shrink-0"
                    >
                        <Plus size={16} /> New Entry
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 bg-white rounded-none md:rounded-3xl border-0 md:border border-slate-300 shadow-sm overflow-hidden flex flex-col animate-in fade-in">
                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-left text-[11px]">
                        <thead className="bg-slate-50 border-b text-[9px] uppercase font-bold text-slate-400 sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-2 font-inter">Invoice / Date</th>
                                <th className="px-4 py-2">Supplier</th>
                                <th className="px-4 py-2 text-right hidden sm:table-cell">Grand Total</th>
                                <th className="px-4 py-2 text-center hidden sm:table-cell">Paid Amt</th>
                                <th className="px-4 py-2 text-right hidden sm:table-cell">Balance</th>
                                <th className="px-4 py-2 text-center hidden sm:table-cell">Filed Status</th>
                                <th className="px-4 py-2 text-center hidden sm:table-cell">Status</th>
                                <th className="px-4 py-2 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredRecords.map(record => {
                                const total = record.total || 0;
                                const paidAmt = record.paidAmount || 0;
                                const balance = total - paidAmt;
                                const displayStatus = balance <= 0 ? 'Completed' : 'Pending';

                                return (
                                    <tr key={record.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer group border-b border-slate-100 last:border-0" onClick={() => setSelectedRecord(record)}>
                                        <td className="px-4 py-3">
                                            <div className="font-black text-slate-800 font-inter tracking-widest">{record.invoiceNo}</div>
                                            <div className="text-slate-400 font-bold text-[10px] mt-0.5 leading-tight">{record.dateSupply}</div>
                                        </td>
                                        <td className="px-4 py-2">
                                            <div className="font-bold text-slate-700 uppercase tracking-tight leading-tight">{record.supplier}</div>
                                            <div className="text-[9px] font-medium text-slate-400 mt-0.5">Received: {record.materialReceivedDate}</div>
                                        </td>
                                        <td className="px-4 py-2 text-right hidden sm:table-cell">
                                            <div className="font-bold text-slate-800 text-xs">₹{formatIndianNumber(total)}</div>
                                        </td>
                                        <td className="px-4 py-2 text-center hidden sm:table-cell" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-center gap-1.5">
                                                <input 
                                                    type="number"
                                                    key={`${record.id}-${paidAmt}`}
                                                    defaultValue={paidAmt}
                                                    onBlur={(e) => {
                                                        const val = Number(e.target.value);
                                                        const newBalance = total - val;
                                                        const expectedStatus = newBalance <= 0 ? 'Completed' : 'Pending';
                                                        
                                                        if (val !== paidAmt) {
                                                            updatePurchaseRecord(record.id, { paidAmount: val, status: expectedStatus });
                                                            addNotification('Updated', `Paid amount for purchase #${record.invoiceNo} set to ₹${val}`, 'success');
                                                        }
                                                    }}
                                                    className="w-20 p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-black text-right outline-none focus:border-emerald-500 focus:bg-white transition-all"
                                                />
                                                <button 
                                                    onClick={() => {
                                                        if (paidAmt !== total) {
                                                            updatePurchaseRecord(record.id, { paidAmount: total, status: 'Completed' });
                                                            addNotification('Updated', `Paid amount for purchase #${record.invoiceNo} set to full amount ₹${total}`, 'success');
                                                        }
                                                    }}
                                                    title="Copy Grand Total"
                                                    className="p-1.5 bg-slate-50 border border-slate-200 hover:bg-emerald-50 text-slate-400 hover:text-emerald-700 scale-95 rounded-lg transition-all"
                                                >
                                                    <CheckCheck size={12} />
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2 text-right font-black text-rose-600 hidden sm:table-cell">
                                            ₹{formatIndianNumber(balance)}
                                        </td>
                                        <td className="px-4 py-2 text-center hidden sm:table-cell" onClick={(e) => e.stopPropagation()}>
                                            <FiledStatusIndicator 
                                                id={record.id}
                                                filedStatus={record.filedStatus}
                                                filedHistory={record.filedHistory}
                                                currentUser={currentUser?.name || 'System'}
                                                onUpdate={async (docId, updates) => {
                                                    await updatePurchaseRecord(docId, updates);
                                                }}
                                            />
                                        </td>
                                        <td className="px-4 py-2 text-center hidden sm:table-cell">
                                            <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                                displayStatus === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                                            }`}>
                                                {displayStatus}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                            <div className="flex justify-end gap-1.5">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleEdit(record); }}
                                                    className="p-1 text-slate-300 hover:text-medical-600 hover:bg-medical-50 rounded transition-all"
                                                    title="Edit Entry"
                                                >
                                                    <Edit size={12} />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const mappedItems = (record.items || []).map(item => {
                                                            const qty = item.qty || 0;
                                                            const rate = item.rate || 0;
                                                            const taxRate = item.gstPercent || item.cgstPercent || 0;
                                                            const amount = qty * rate;
                                                            const gstValue = amount * (taxRate / 100);
                                                            const cgstRate = taxRate / 2;
                                                            const sgstRate = taxRate / 2;
                                                            return {
                                                                id: item.id,
                                                                productName: item.equipmentName,
                                                                description: item.equipmentName,
                                                                hsn: '',
                                                                unit: item.unit || 'nos',
                                                                quantity: qty,
                                                                unitPrice: rate,
                                                                taxRate,
                                                                cgstRate,
                                                                sgstRate,
                                                                igstRate: 0,
                                                                amount,
                                                                gstValue,
                                                                priceWithGst: amount + gstValue,
                                                                total: item.total || 0,
                                                                discount: 0,
                                                            };
                                                        });
                                                        setPendingSupplierPOData({
                                                            customerName: record.supplier,
                                                            date: record.dateSupply || new Date().toISOString().split('T')[0],
                                                            cpoNumber: record.invoiceNo,
                                                            cpoDate: record.materialReceivedDate || '',
                                                            remarks: `Converted from Purchase Entry ${record.invoiceNo}`,
                                                            items: mappedItems,
                                                            isRoundOff: record.isRoundOff,
                                                        });
                                                        setActiveTab(TabView.SUPPLIER_PO);
                                                    }}
                                                    className="p-1 text-slate-300 hover:text-amber-500 hover:bg-amber-50 rounded transition-all"
                                                    title="Convert to Supplier PO"
                                                >
                                                    <ArrowUpRight size={14} />
                                                </button>
                                                {isAdmin && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setPendingDelete({ id: record.id, name: record.supplier }); }}
                                                        className="p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded transition-all"
                                                        title="Delete Entry"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredRecords.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="py-20 text-center">
                                        <div className="flex flex-col items-center opacity-20">
                                            <ShoppingCart size={48} className="mb-4" />
                                            <p className="font-black uppercase tracking-[0.2em] text-slate-400">No Purchase Entries Found</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Entry Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-md p-2 sm:p-4 animate-in fade-in">
                    <div className="bg-white rounded-[1.5rem] sm:rounded-[2.5rem] shadow-2xl max-w-4xl w-full overflow-hidden scale-100 animate-in zoom-in-95 flex flex-col max-h-[95vh] sm:max-h-[90vh]">
                        <div className="p-3 border-b border-slate-200 flex justify-between items-center bg-slate-50/50 shrink-0">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-medical-600 rounded-lg text-white shadow-lg"><Plus size={14} /></div>
                                <div>
                                    <h3 className="text-base font-black text-slate-800 uppercase tracking-tight leading-none">{editingId ? 'Edit Purchase' : 'Purchase Entry'}</h3>
                                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{editingId ? 'Modify Record' : 'Document Registry'}</p>
                                </div>
                            </div>
                            <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-slate-100 rounded-full transition-colors"><X size={18} className="text-slate-400" /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 custom-scrollbar">
                            <section className="space-y-2">
                                <h4 className="text-[9px] font-black text-medical-600 uppercase tracking-[0.2em] border-b pb-0.5">1. Transaction Identity</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                                        <FormRow label="Supplier Name *">
                                            <AutoSuggest
                                                value={newRecord.supplier || ''}
                                                onChange={val => handleInputChange('supplier', val.toUpperCase())}
                                                onSelect={vendor => handleInputChange('supplier', vendor.name.toUpperCase())}
                                                suggestions={vendors}
                                                filterKey="name"
                                                className="w-full h-[36px] bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold outline-none focus:ring-4 focus:ring-medical-500/5 transition-all uppercase"
                                                placeholder="SEARCH SUPPLIER"
                                            />
                                        </FormRow>
                                        <FormRow label="Invoice Number *">
                                            <input type="text" className="w-full h-[36px] bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-black outline-none focus:ring-4 focus:ring-medical-500/5 transition-all uppercase" placeholder="INV-001" value={newRecord.invoiceNo || ''} onChange={e => handleInputChange('invoiceNo', e.target.value)} />
                                        </FormRow>
                                        <FormRow label="Supply Date">
                                            <input type="date" className="w-full h-[36px] bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold outline-none" value={newRecord.dateSupply || ''} onChange={e => handleInputChange('dateSupply', e.target.value)} />
                                        </FormRow>
                                        <FormRow label="Received Date">
                                            <input type="date" className="w-full h-[36px] bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold outline-none" value={newRecord.materialReceivedDate || ''} onChange={e => handleInputChange('materialReceivedDate', e.target.value)} />
                                        </FormRow>
                                        <FormRow label="Paid Amount (₹)">
                                            <div className="flex gap-1">
                                                <input type="number" className="flex-1 h-[36px] bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-black text-emerald-600 outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all text-center" placeholder="0.00" value={newRecord.paidAmount || ''} onChange={e => handleInputChange('paidAmount', Number(e.target.value))} />
                                                <button
                                                    type="button"
                                                    onClick={() => handleInputChange('paidAmount', Number(newRecord.total || 0))}
                                                    title="Copy Grand Total"
                                                    className="px-2 h-[36px] bg-slate-50 border border-slate-300 hover:bg-emerald-50 hover:text-emerald-600 text-slate-400 rounded-lg flex items-center justify-center transition-all shrink-0"
                                                >
                                                    <CheckCheck size={14} />
                                                </button>
                                            </div>
                                        </FormRow>
                                    </div>
                                </section>

                                <section className="space-y-2">
                                    <div className="flex justify-between items-center border-b pb-0.5">
                                        <h4 className="text-[9px] font-black text-medical-600 uppercase tracking-[0.2em]">2. Equipment Details</h4>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-[2rem] border border-slate-200 space-y-3">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                                            <div className="lg:col-span-2">
                                                <FormRow label="Equipment Name *">
                                                    <div className="relative">
                                                        <AutoSuggest
                                                            value={currentItem.equipmentName || ''}
                                                            onChange={val => handleItemChange('equipmentName', val.toUpperCase())}
                                                            onSelect={prod => handleItemChange('equipmentName', prod.name.toUpperCase())}
                                                            suggestions={products}
                                                            filterKey="name"
                                                            className="w-full h-[36px] bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold outline-none focus:ring-4 focus:ring-medical-500/5 transition-all uppercase"
                                                            placeholder="SEARCH PRODUCT"
                                                        />
                                                         {currentItem.equipmentName && products.find(p => p.name.toUpperCase() === currentItem.equipmentName?.toUpperCase()) && (
                                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                                                <div className="flex flex-col items-end">
                                                                    <span className="text-[9px] font-black text-white bg-medical-600 px-2 py-0.5 rounded border border-medical-500 shadow-sm whitespace-nowrap">
                                                                        PURCHASE: ₹{formatIndianNumber(products.find(p => p.name.toUpperCase() === currentItem.equipmentName?.toUpperCase())?.purchasePrice || 0)}
                                                                    </span>
                                                                    <span className="text-[7px] font-black text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 mt-0.5 whitespace-nowrap">
                                                                        SELLING: ₹{formatIndianNumber(products.find(p => p.name.toUpperCase() === currentItem.equipmentName?.toUpperCase())?.sellingPrice || products.find(p => p.name.toUpperCase() === currentItem.equipmentName?.toUpperCase())?.price || 0)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </FormRow>

                                            </div>
                                            <FormRow label="Unit Rate (₹)">
                                                <input type="number" className="w-full h-[36px] bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-black outline-none focus:ring-4 focus:ring-medical-500/5" value={currentItem.rate || ''} onChange={e => handleItemChange('rate', e.target.value)} />
                                            </FormRow>
                                            <div className="grid grid-cols-2 gap-2">
                                                <FormRow label="Quantity">
                                                    <input type="number" className="w-full h-[36px] bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-black outline-none focus:ring-4 focus:ring-medical-500/5" value={currentItem.qty || ''} onChange={e => handleItemChange('qty', e.target.value)} />
                                                </FormRow>
                                                <FormRow label="Unit">
                                                    <select className="w-full h-[36px] bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold outline-none focus:ring-4 focus:ring-medical-500/5 transition-all appearance-none" value={currentItem.unit || 'nos'} onChange={e => handleItemChange('unit', e.target.value)}>
                                                        <option value="nos">NOS</option>
                                                        <option value="pkt">PKT</option>
                                                        <option value="set">SET</option>
                                                        <option value="jar">JAR</option>
                                                        <option value="mtr">MTR</option>
                                                    </select>
                                                </FormRow>
                                            </div>
                                            <FormRow label="Tax Type">
                                                <select className="w-full h-[36px] bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold outline-none focus:ring-4 focus:ring-medical-500/5 transition-all appearance-none" value={currentItem.taxType} onChange={e => handleItemChange('taxType', e.target.value)}>
                                                    <option value="Local">Local (CGST+SGST)</option>
                                                    <option value="Interstate">Interstate (IGST)</option>
                                                </select>
                                            </FormRow>
                                            <div className="grid grid-cols-2 gap-3">
                                                <FormRow label="GST %">
                                                    <input type="number" className="w-full h-[36px] bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-black outline-none focus:ring-4 focus:ring-medical-500/5" placeholder="0" value={currentItem.gstPercent || ''} onChange={e => handleItemChange('gstPercent', e.target.value)} />
                                                </FormRow>
                                                <FormRow label="Tax Amt (₹)">
                                                    <input type="text" readOnly className="w-full h-[36px] bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-black text-emerald-600 outline-none" value={formatIndianNumber((Number(currentItem.totalGst) || 0) + (Number(currentItem.totalIgst) || 0))} />
                                                </FormRow>
                                            </div>

                                            <div className="lg:col-span-4 bg-slate-900 rounded-lg p-2 flex justify-between items-center text-[10px]">
                                                <div className="flex gap-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-slate-500 font-black uppercase text-[7px]">Basic Amount</span>
                                                        <span className="text-white font-bold">₹{formatIndianNumber((Number(currentItem.rate) || 0) * (Number(currentItem.qty) || 0))}</span>
                                                    </div>
                                                    <div className="flex flex-col border-l border-slate-700 pl-4">
                                                        <span className="text-emerald-500 font-black uppercase text-[7px]">Tax Amount</span>
                                                        <span className="text-emerald-400 font-bold">₹{formatIndianNumber((Number(currentItem.totalGst) || 0) + (Number(currentItem.totalIgst) || 0))}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-slate-500 font-black uppercase text-[7px]">Line Total</span>
                                                    <p className="text-medical-400 font-black text-sm leading-none">₹{formatIndianNumber(currentItem.total || 0)}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-end">
                                                <button onClick={handleAddItem} className="w-full h-[36px] bg-medical-600 text-white rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-medical-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-medical-500/20">
                                                    {currentItem.id ? <><RefreshCw size={12} /> Update Item</> : <><Plus size={12} /> Add Item</>}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {newRecord.items && newRecord.items.length > 0 && (
                                        <div className="mt-4 border border-slate-200 rounded-[2rem] overflow-hidden">
                                            <table className="w-full text-left text-xs">
                                                <thead className="bg-slate-100 text-[9px] uppercase font-black text-slate-500">
                                                    <tr>
                                                        <th className="px-3 py-1.5">Equipment</th>
                                                        <th className="px-3 py-1.5 text-right">Rate x Qty</th>
                                                        <th className="px-3 py-1.5 text-right">GST %</th>
                                                        <th className="px-3 py-1.5 text-right">Taxes (₹)</th>
                                                        <th className="px-3 py-1.5 text-right">Total</th>
                                                        <th className="px-3 py-1.5 text-center">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 bg-white">
                                                    {newRecord.items.map((item, idx) => (
                                                        <tr key={idx}>
                                                            <td className="px-3 py-1.5 font-bold text-slate-800">{item.equipmentName}</td>
                                                            <td className="px-3 py-1.5 text-right">₹{formatIndianNumber(item.rate)} x {item.qty} <span className="text-[8px] opacity-60 uppercase">{item.unit || 'NOS'}</span></td>
                                                            <td className="px-3 py-1.5 text-right text-[9px]">
                                                                <span className="font-bold">{(item.cgstPercent || 0) + (item.sgstPercent || 0) + (item.igstPercent || 0)}%</span>
                                                            </td>
                                                            <td className="px-3 py-1.5 text-right text-emerald-600 font-bold">₹{formatIndianNumber(item.totalGst + item.totalIgst)}</td>
                                                            <td className="px-3 py-1.5 text-right font-black">₹{formatIndianNumber(item.total)}</td>
                                                            <td className="px-4 py-2 text-center">
                                                                <div className="flex justify-center gap-1">
                                                                    <button onClick={() => handleEditItem(item)} className="text-medical-600 hover:bg-medical-50 p-1 rounded transition-colors" title="Edit Item">
                                                                        <Edit size={14} />
                                                                    </button>
                                                                    {isAdmin && (
                                                                    <button onClick={() => handleRemoveItem(item.id)} className="text-rose-500 hover:bg-rose-50 p-1 rounded transition-colors" title="Remove Item">
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </section>

                                <section className="space-y-3">
                                    <h4 className="text-[10px] font-black text-medical-600 uppercase tracking-[0.2em] border-b pb-1">3. Add-on Charges</h4>
                                    <div className="grid grid-cols-3 gap-3">
                                        <FormRow label="Packing (₹)">
                                            <input type="number" className="w-full h-[32px] bg-white border border-slate-300 rounded-lg px-3 py-1 text-[10px] font-bold outline-none" value={newRecord.packingCharges || ''} onChange={e => handleInputChange('packingCharges', e.target.value)} />
                                        </FormRow>
                                        <FormRow label="Forwarding (₹)">
                                            <input type="number" className="w-full h-[32px] bg-white border border-slate-300 rounded-lg px-3 py-1 text-[10px] font-bold outline-none" value={newRecord.forwardingCharges || ''} onChange={e => handleInputChange('forwardingCharges', e.target.value)} />
                                        </FormRow>
                                        <FormRow label="Freight (₹)">
                                            <div className="flex gap-1">
                                                <input type="number" className="flex-1 h-[32px] bg-white border border-slate-300 rounded-lg px-2 py-1 text-[10px] font-bold outline-none" placeholder="Amt" value={newRecord.freightCharges || ''} onChange={e => handleInputChange('freightCharges', e.target.value)} />
                                                <input type="number" className="w-[60px] h-[32px] bg-white border border-slate-300 rounded-lg px-2 py-1 text-[10px] font-bold outline-none" placeholder="GST %" value={newRecord.freightGstPercent || ''} onChange={e => handleInputChange('freightGstPercent', e.target.value)} />
                                            </div>
                                        </FormRow>
                                    </div>
                                </section>

                            <div className="p-3 sm:p-4 bg-slate-900 rounded-[1rem] sm:rounded-[1.25rem] text-white flex flex-col sm:flex-row justify-between items-center gap-3 shadow-xl">
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 w-full sm:w-auto">
                                    <div>
                                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5 leading-none">Subtotal</p>
                                        <p className="text-sm sm:text-base font-bold">₹{formatIndianNumber((newRecord.items || []).reduce((sum, item) => sum + (item.rate * item.qty), 0))}</p>
                                    </div>
                                    <div>
                                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5 leading-none">Total Tax</p>
                                        <p className="text-sm sm:text-base font-bold text-emerald-400">₹{formatIndianNumber((Number(newRecord.totalGst) || 0) + (Number(newRecord.totalIgst) || 0))}</p>
                                    </div>
                                    <div className="hidden sm:block">
                                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5 leading-none">Add-on</p>
                                        <p className="text-sm sm:text-base font-bold text-medical-400">₹{formatIndianNumber((Number(newRecord.packingCharges) || 0) + (Number(newRecord.forwardingCharges) || 0) + (Number(newRecord.freightCharges) || 0) + ((Number(newRecord.freightCharges) || 0) * (Number(newRecord.freightGstPercent) || 0) / 100))}</p>
                                    </div>
                                </div>
                                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 w-full sm:w-auto">
                                    <div className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-[2rem] border border-white/10 hover:bg-white/10 transition-colors cursor-pointer">
                                        <ToggleSwitch checked={!!newRecord.isRoundOff} onChange={(v) => handleInputChange('isRoundOff', v)} />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Round Off</span>
                                    </div>
                                    <div className="text-center sm:text-right border-t border-slate-800 sm:border-t-0 pt-3 sm:pt-0">
                                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-0.5 leading-none">Total Payable</p>
                                        <p className="text-2xl sm:text-3xl font-playfair font-bold tracking-tight text-white tracking-tighter flex items-baseline justify-center sm:justify-end gap-1">
                                            ₹{formatIndianNumber(newRecord.total || 0)}
                                            {newRecord.isRoundOff && newRecord.roundOff !== 0 && (
                                                <span className={`text-[10px] font-bold ${newRecord.roundOff! > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    ({newRecord.roundOff! > 0 ? '+' : ''}{newRecord.roundOff})
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="sticky bottom-0 left-0 right-0 p-2.5 sm:p-3 bg-white/90 backdrop-blur-md border-t border-slate-200 flex flex-col sm:flex-row gap-2.5 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] z-20 shrink-0">
                            <button onClick={() => setShowAddModal(false)} className="px-5 py-2.5 bg-slate-100 text-slate-500 rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-slate-200 transition-colors">Cancel</button>
                            <button onClick={() => { setNewRecord(INITIAL_RECORD_STATE); setCurrentItem(INITIAL_ITEM_STATE); }} className="px-5 py-2.5 bg-slate-100 text-amber-600 border border-amber-200 rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-amber-50 transition-colors flex items-center justify-center gap-2">
                                <RefreshCw size={12} /> Reset Form
                            </button>
                            <button onClick={handleSaveRecord} className="flex-[2] px-5 py-2.5 bg-gradient-to-r from-medical-600 to-teal-500 text-white font-black uppercase tracking-widest rounded-lg shadow-xl shadow-medical-500/30 active:scale-95 transition-all text-[9px]">
                                {editingId ? 'Update Purchase Entry' : 'Save Purchase Entry'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View/Edit Details Modal */}
            {selectedRecord && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-xl max-w-2xl w-full overflow-hidden scale-100 animate-in zoom-in-95 duration-200 flex flex-col border border-slate-200">
                        {/* Simple Clean Header */}
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-medical-50 text-medical-600 rounded-[2rem] border border-medical-100">
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-playfair font-bold tracking-tight text-slate-800 tracking-tight">Entry Details</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID: {selectedRecord.id}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedRecord(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh] custom-scrollbar bg-white">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    {/* Supplier Identity */}
                                    <div>
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Supplier Name</label>
                                        <div className="bg-slate-50 border border-slate-100 rounded-[2rem] p-4">
                                            <p className="font-bold text-slate-800 uppercase leading-tight text-sm">{selectedRecord.supplier}</p>
                                        </div>
                                    </div>

                                    {/* Invoice Information */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Invoice No.</label>
                                            <div className="bg-white border border-slate-200 rounded-[2rem] p-3">
                                                <p className="font-bold text-slate-700 text-[11px]">{selectedRecord.invoiceNo}</p>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Date</label>
                                            <div className="bg-white border border-slate-200 rounded-[2rem] p-3">
                                                <p className="font-bold text-slate-700 text-[11px]">{selectedRecord.dateSupply}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Equipment Manifest */}
                                    <div>
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Equipment Details</label>
                                        <div className="space-y-2">
                                            {(selectedRecord.items && selectedRecord.items.length > 0) ? (
                                                selectedRecord.items.map((i, idx) => (
                                                    <div key={i.id} className="bg-white rounded-[2rem] p-3 border border-slate-100 shadow-sm flex justify-between items-center">
                                                        <div>
                                                            <p className="font-bold text-slate-800 uppercase text-[10px]">{i.equipmentName}</p>
                                                            <p className="text-[9px] font-medium text-slate-400 mt-0.5">₹{formatIndianNumber(i.rate)} per {i.unit || 'NOS'}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="text-[9px] font-bold text-medical-600 bg-medical-50 px-2 py-0.5 rounded border border-medical-100">{i.qty} {i.unit || 'NOS'}</span>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="bg-white rounded-[2rem] p-3 border border-slate-100 shadow-sm flex justify-between items-center">
                                                    <p className="font-bold text-slate-800 uppercase text-[10px]">{selectedRecord.equipmentName}</p>
                                                    <span className="text-[9px] font-bold text-medical-600 bg-medical-50 px-2 py-0.5 rounded border border-medical-100">{selectedRecord.qty} {selectedRecord.unit || 'NOS'}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Financial Summary Column */}
                                <div className="flex flex-col">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block text-center">Payment Summary</label>
                                    <div className="bg-slate-50 border border-slate-100 rounded-[2rem] p-6 space-y-4 shadow-sm flex-1 flex flex-col justify-between">
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center text-[11px]">
                                                <span className="text-slate-500 font-medium">Basic Amount</span>
                                                <span className="text-slate-800 font-bold">₹{formatIndianNumber(selectedRecord.items && selectedRecord.items.length > 0 ? selectedRecord.items.reduce((sum, item) => sum + (item.rate * item.qty), 0) : ((selectedRecord.rate || 0) * (selectedRecord.qty || 0)))}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-[11px]">
                                                <span className="text-slate-500 font-medium">Total GST</span>
                                                <span className="text-emerald-600 font-bold">₹{formatIndianNumber(selectedRecord.totalGst || 0)}</span>
                                            </div>
                                            {selectedRecord.totalIgst > 0 && (
                                                <div className="flex justify-between items-center text-[11px]">
                                                    <span className="text-slate-500 font-medium">Total IGST</span>
                                                    <span className="text-medical-600 font-bold">₹{formatIndianNumber(selectedRecord.totalIgst)}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between items-center text-[11px] pb-3 border-b border-slate-200 border-dashed">
                                                <span className="text-slate-500 font-medium">Add-on Charges</span>
                                                <span className="text-amber-600 font-bold">₹{formatIndianNumber((selectedRecord.packingCharges || 0) + (selectedRecord.forwardingCharges || 0) + (selectedRecord.freightCharges || 0) + ((selectedRecord.freightCharges || 0) * (selectedRecord.freightGstPercent || 0) / 100))}</span>
                                            </div>
                                        </div>
                                        
                                        <div className="pt-2 text-center">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Grand Total</p>
 <p className="text-3xl font-bold tracking-tight text-slate-900 tracking-tighter">₹{formatIndianNumber(selectedRecord.total || 0)}</p>
                                        </div>

                                        <div className="pt-4 mt-4 border-t border-slate-200 text-center">
                                            <p className="text-[8px] font-bold text-slate-300 italic uppercase">Logged by: {selectedRecord.createdBy || 'System'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Standard Actions Footer */}
                        <div className="p-5 border-t border-slate-100 bg-slate-50 flex gap-3 shrink-0">
                            <button 
                                onClick={() => { handleEdit(selectedRecord); setSelectedRecord(null); }}
                                className="flex-[2] h-12 bg-medical-600 text-white font-bold rounded-[2rem] hover:bg-medical-700 active:scale-95 transition-all text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm"
                            >
                                <Edit size={14} /> Edit Transaction
                            </button>
                            <button 
                                onClick={() => setSelectedRecord(null)} 
                                className="flex-1 h-12 bg-white border border-slate-200 text-slate-600 font-bold rounded-[2rem] hover:bg-slate-50 active:scale-95 transition-all text-[11px] uppercase tracking-widest"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Deletion Confirmation */}
            {pendingDelete && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-in fade-in">
                    <div className="bg-white rounded-[2rem] shadow-2xl max-w-sm w-full p-8 text-center animate-in zoom-in-95">
                        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-[2rem] flex items-center justify-center mx-auto mb-4 border border-rose-100">
                            <AlertTriangle size={32} />
                        </div>
                        <h3 className="text-xl font-playfair font-bold tracking-tight text-slate-800 uppercase tracking-tight">Purge Record?</h3>
                        <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                            Are you sure you want to delete the purchase entry from <b>{pendingDelete.name}</b>? This action is permanent.
                        </p>
                        <div className="flex gap-3 mt-8">
                            <button onClick={() => setPendingDelete(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-[2rem] font-black text-[10px] uppercase tracking-widest">Cancel</button>
                            <button
                                onClick={async () => {
                                    setIsDeleting(true);
                                    await removePurchaseRecord(pendingDelete.id);
                                    setPendingDelete(null);
                                    setIsDeleting(false);
                                    addNotification('Record Deleted', 'Entry removed from registry.', 'warning');
                                }}
                                className="flex-1 py-3 bg-rose-600 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-lg shadow-rose-500/20 flex items-center justify-center gap-2"
                            >
                                {isDeleting ? <RefreshCw className="animate-spin" size={14} /> : "Delete Entry"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};
