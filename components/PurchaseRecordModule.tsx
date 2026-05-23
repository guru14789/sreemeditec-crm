import React, { useState, useMemo } from 'react';
import { PurchaseRecord, PurchaseItem } from '../types';
import { ShoppingCart, Calendar, User, Package, FileText, IndianRupee, Trash2, ArrowUpRight, X, Lock, RefreshCw, AlertTriangle, Search, Plus, Filter, Edit } from 'lucide-react';
import { useData } from './DataContext';

const formatIndianNumber = (num: number) => {
    return (num || 0).toLocaleString('en-IN', {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2
    });
};

const FormRow = ({ label, children }: { label: string, children?: React.ReactNode }) => (
    <div className="flex flex-col gap-1 w-full">
        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1 truncate whitespace-nowrap min-h-[12px]">{label}</label>
        {children}
    </div>
);

export const PurchaseRecordModule: React.FC = () => {
    const { purchaseRecords, addPurchaseRecord, updatePurchaseRecord, removePurchaseRecord, addNotification, currentUser, products, vendors } = useData();
    const [searchQuery, setSearchQuery] = useState('');
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
        roundOff: 0
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

    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<{ id: string, name: string } | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);

    const handleNewEntry = () => {
        setNewRecord(INITIAL_RECORD_STATE);
        setCurrentItem(INITIAL_ITEM_STATE);
        setEditingId(null);
        setShowAddModal(true);
    };

    const verifyPassword = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (password === 'admin' || password === 'sree') setIsAuthenticated(true);
        else { alert("Incorrect Security Password."); setPassword(''); }
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
            createdBy: currentUser?.name
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
        return purchaseRecords.filter(r =>
            (r.supplier || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (r.equipmentName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (r.invoiceNo || '').toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [purchaseRecords, searchQuery]);

    if (!isAuthenticated) {
        return (
            <div className="h-full flex items-center justify-center bg-slate-50 p-4">
                <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border p-8 text-center animate-in fade-in zoom-in-95">
                    <div className="w-20 h-20 bg-medical-50 rounded-full flex items-center justify-center mx-auto mb-6 text-medical-600 shadow-inner"><Lock size={40} /></div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Purchase Register Lock</h2>
                    <p className="text-slate-500 mb-8 text-sm leading-relaxed">Please enter security password to access purchase entries.</p>
                    <form onSubmit={verifyPassword} className="space-y-4">
                        <input type="password" placeholder="Password" className="w-full px-4 py-4 bg-slate-50 border-2 rounded-2xl outline-none focus:border-medical-500 font-bold" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
                        <button type="submit" className="w-full bg-medical-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-medical-500/30">Verify & Unlock</button>
                    </form>
                </div>
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col gap-4 overflow-hidden p-2 bg-slate-50/50">
            {/* Header */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-medical-50 text-medical-600 rounded-xl border border-medical-100">
                        <ShoppingCart size={20} />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-slate-800 tracking-tight leading-none uppercase">Purchase Entry</h2>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">{purchaseRecords.length} Total Records</p>
                    </div>
                </div>
                <div className="flex flex-1 max-w-xl gap-2 w-full">
                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search registry..."
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-medium outline-none focus:border-medical-400 transition-all uppercase"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                        />
                    </div>
                    <button
                        onClick={handleNewEntry}
                        className="bg-medical-600 text-white px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-medical-700 transition-all shadow-sm shrink-0"
                    >
                        <Plus size={14} /> New Entry
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-left text-[11px]">
                        <thead className="bg-slate-50 border-b text-[9px] uppercase font-bold text-slate-400 sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-3">Date / Invoice</th>
                                <th className="px-4 py-3">Supplier</th>
                                <th className="px-4 py-3 text-right">Grand Total</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredRecords.map(record => (
                                <tr key={record.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer group border-b border-slate-100 last:border-0" onClick={() => setSelectedRecord(record)}>
                                    <td className="px-4 py-3">
                                        <div className="font-bold text-slate-700 leading-tight">{record.dateSupply}</div>
                                        <div className="text-[9px] font-medium text-slate-400 mt-0.5">#{record.invoiceNo}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="font-bold text-slate-700 uppercase tracking-tight leading-tight">{record.supplier}</div>
                                        <div className="text-[9px] font-medium text-slate-400 mt-0.5">Received: {record.materialReceivedDate}</div>
                                    </td>


                                    <td className="px-4 py-3 text-right">
                                        <div className="font-bold text-slate-800 text-xs">₹{formatIndianNumber(record.total)}</div>
                                    </td>
                                    <td className="px-3 py-1.5 text-right">
                                        <div className="flex justify-end gap-1.5">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleEdit(record); }}
                                                className="p-1 text-slate-300 hover:text-medical-600 hover:bg-medical-50 rounded transition-all"
                                                title="Edit Entry"
                                            >
                                                <Edit size={12} />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setPendingDelete({ id: record.id, name: record.supplier }); }}
                                                className="p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded transition-all"
                                                title="Delete Entry"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                            <div className="p-1 text-slate-300 group-hover:text-medical-600 transition-all"><ArrowUpRight size={14} /></div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredRecords.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center">
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
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                                        <FormRow label="Supplier Name *">
                                            <input type="text" list="vendor-list" className="w-full h-[36px] bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold outline-none focus:ring-4 focus:ring-medical-500/5 transition-all uppercase" placeholder="SEARCH SUPPLIER" value={newRecord.supplier || ''} onChange={e => handleInputChange('supplier', e.target.value)} />
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
                                    </div>
                                </section>

                                <section className="space-y-2">
                                    <div className="flex justify-between items-center border-b pb-0.5">
                                        <h4 className="text-[9px] font-black text-medical-600 uppercase tracking-[0.2em]">2. Equipment Details</h4>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-3">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                                            <div className="lg:col-span-2">
                                                <FormRow label="Equipment Name *">
                                                    <div className="relative">
                                                        <input type="text" list="prod-list" className="w-full h-[36px] bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold outline-none focus:ring-4 focus:ring-medical-500/5 transition-all uppercase" placeholder="SEARCH PRODUCT" value={currentItem.equipmentName || ''} onChange={e => handleItemChange('equipmentName', e.target.value)} />
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
                                                    <select className="w-full h-[36px] bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold outline-none focus:ring-4 focus:ring-medical-500/5 transition-all" value={currentItem.unit || 'nos'} onChange={e => handleItemChange('unit', e.target.value)}>
                                                        <option value="nos">NOS</option>
                                                        <option value="pkt">PKT</option>
                                                        <option value="set">SET</option>
                                                        <option value="jar">JAR</option>
                                                        <option value="mtr">MTR</option>
                                                    </select>
                                                </FormRow>
                                            </div>
                                            <FormRow label="Tax Type">
                                                <select className="w-full h-[36px] bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold outline-none focus:ring-4 focus:ring-medical-500/5 transition-all" value={currentItem.taxType} onChange={e => handleItemChange('taxType', e.target.value)}>
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
                                        <div className="mt-4 border border-slate-200 rounded-xl overflow-hidden">
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
                                                                    <button onClick={() => handleRemoveItem(item.id)} className="text-rose-500 hover:bg-rose-50 p-1 rounded transition-colors" title="Remove Item">
                                                                        <Trash2 size={14} />
                                                                    </button>
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
                                    <div className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-xl border border-white/10 hover:bg-white/10 transition-colors cursor-pointer" onClick={() => handleInputChange('isRoundOff', !newRecord.isRoundOff)}>
                                        <div className={`w-8 h-4 rounded-full relative transition-colors ${newRecord.isRoundOff ? 'bg-medical-500' : 'bg-slate-700'}`}>
                                            <div className={`absolute top-1 left-1 w-2 h-2 bg-white rounded-full transition-transform ${newRecord.isRoundOff ? 'translate-x-4' : 'translate-x-0'}`} />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Round Off</span>
                                    </div>
                                    <div className="text-center sm:text-right border-t border-slate-800 sm:border-t-0 pt-3 sm:pt-0">
                                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-0.5 leading-none">Total Payable</p>
                                        <p className="text-2xl sm:text-3xl font-black text-white tracking-tighter flex items-baseline justify-center sm:justify-end gap-1">
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
                                <div className="p-2.5 bg-medical-50 text-medical-600 rounded-xl border border-medical-100">
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 tracking-tight">Entry Details</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID: {selectedRecord.id}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedRecord(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh] custom-scrollbar bg-white">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-6">
                                    {/* Supplier Identity */}
                                    <div>
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Supplier Name</label>
                                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                                            <p className="font-bold text-slate-800 uppercase leading-tight text-sm">{selectedRecord.supplier}</p>
                                        </div>
                                    </div>

                                    {/* Invoice Information */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Invoice No.</label>
                                            <div className="bg-white border border-slate-200 rounded-xl p-3">
                                                <p className="font-bold text-slate-700 text-[11px]">{selectedRecord.invoiceNo}</p>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Date</label>
                                            <div className="bg-white border border-slate-200 rounded-xl p-3">
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
                                                    <div key={i.id} className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm flex justify-between items-center">
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
                                                <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm flex justify-between items-center">
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
                                            <p className="text-3xl font-black text-slate-900 tracking-tighter">₹{formatIndianNumber(selectedRecord.total || 0)}</p>
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
                                className="flex-[2] h-12 bg-medical-600 text-white font-bold rounded-xl hover:bg-medical-700 active:scale-95 transition-all text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm"
                            >
                                <Edit size={14} /> Edit Transaction
                            </button>
                            <button 
                                onClick={() => setSelectedRecord(null)} 
                                className="flex-1 h-12 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 active:scale-95 transition-all text-[11px] uppercase tracking-widest"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Deletion Confirmation */}
            {pendingDelete && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-[2rem] shadow-2xl max-w-sm w-full p-8 text-center animate-in zoom-in-95">
                        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-100">
                            <AlertTriangle size={32} />
                        </div>
                        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Purge Record?</h3>
                        <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                            Are you sure you want to delete the purchase entry from <b>{pendingDelete.name}</b>? This action is permanent.
                        </p>
                        <div className="flex gap-3 mt-8">
                            <button onClick={() => setPendingDelete(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest">Cancel</button>
                            <button
                                onClick={async () => {
                                    setIsDeleting(true);
                                    await removePurchaseRecord(pendingDelete.id);
                                    setPendingDelete(null);
                                    setIsDeleting(false);
                                    addNotification('Record Deleted', 'Entry removed from registry.', 'warning');
                                }}
                                className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-rose-500/20 flex items-center justify-center gap-2"
                            >
                                {isDeleting ? <RefreshCw className="animate-spin" size={14} /> : "Delete Entry"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <datalist id="vendor-list">{vendors.map(v => <option key={v.id} value={v.name.toUpperCase()} />)}</datalist>
            <datalist id="prod-list">{products.map((p, idx) => <option key={idx} value={p.name.toUpperCase()}>{p.name.toUpperCase()} - ₹{formatIndianNumber(p.purchasePrice || p.price || 0)}</option>)}</datalist>
        </div>
    );
};
