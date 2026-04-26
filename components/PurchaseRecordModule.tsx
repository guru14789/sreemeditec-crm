
import React, { useState, useMemo } from 'react';
import { PurchaseRecord } from '../types';
import { ShoppingCart, Calendar, User, Package, FileText, IndianRupee, Trash2, ArrowUpRight, X, Lock, RefreshCw, AlertTriangle, Search, Plus, Filter } from 'lucide-react';
import { useData } from './DataContext';

const formatIndianNumber = (num: number) => {
    return (num || 0).toLocaleString('en-IN', {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2
    });
};

export const PurchaseRecordModule: React.FC = () => {
    const { purchaseRecords, addPurchaseRecord, updatePurchaseRecord, removePurchaseRecord, addNotification, currentUser, products, vendors } = useData();
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<PurchaseRecord | null>(null);
    const [newRecord, setNewRecord] = useState<Partial<PurchaseRecord>>({
        dateSupply: new Date().toISOString().split('T')[0],
        materialReceivedDate: new Date().toISOString().split('T')[0],
        rate: 0,
        qty: 1,
        packingCharges: 0,
        forwardingCharges: 0,
        freightCharges: 0,
        gst5: 0,
        gst18: 0,
        totalGst: 0,
        totalIgst: 0,
        total: 0
    });
    
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<{ id: string, name: string } | null>(null);

    const verifyPassword = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (password === 'admin' || password === 'sree') setIsAuthenticated(true);
        else { alert("Incorrect Security Password."); setPassword(''); }
    };

    const calculateTotals = (data: Partial<PurchaseRecord>) => {
        const rate = Number(data.rate) || 0;
        const qty = Number(data.qty) || 0;
        const packing = Number(data.packingCharges) || 0;
        const forwarding = Number(data.forwardingCharges) || 0;
        const freight = Number(data.freightCharges) || 0;
        const gst5 = Number(data.gst5) || 0;
        const gst18 = Number(data.gst18) || 0;
        const totalIgst = Number(data.totalIgst) || 0;

        const basicAmount = rate * qty;
        const totalGst = gst5 + gst18;
        const total = basicAmount + totalGst + totalIgst + packing + forwarding + freight;

        return { ...data, totalGst, total };
    };

    const handleInputChange = (field: keyof PurchaseRecord, value: any) => {
        const updated = { ...newRecord, [field]: value };
        setNewRecord(calculateTotals(updated));
    };

    const handleSaveRecord = async () => {
        if (!newRecord.supplier || !newRecord.equipmentName || !newRecord.invoiceNo) {
            alert("Supplier, Equipment, and Invoice No are required.");
            return;
        }

        const id = `PR-${Date.now()}`;
        const record: PurchaseRecord = {
            id,
            dateSupply: newRecord.dateSupply || '',
            materialReceivedDate: newRecord.materialReceivedDate || '',
            supplier: newRecord.supplier || '',
            equipmentName: newRecord.equipmentName || '',
            invoiceNo: newRecord.invoiceNo || '',
            rate: Number(newRecord.rate) || 0,
            qty: Number(newRecord.qty) || 0,
            packingCharges: Number(newRecord.packingCharges) || 0,
            forwardingCharges: Number(newRecord.forwardingCharges) || 0,
            freightCharges: Number(newRecord.freightCharges) || 0,
            gst5: Number(newRecord.gst5) || 0,
            gst18: Number(newRecord.gst18) || 0,
            totalGst: Number(newRecord.totalGst) || 0,
            totalIgst: Number(newRecord.totalIgst) || 0,
            total: Number(newRecord.total) || 0,
            createdBy: currentUser?.name
        };

        await addPurchaseRecord(record);
        setShowAddModal(false);
        setNewRecord({
            dateSupply: new Date().toISOString().split('T')[0],
            materialReceivedDate: new Date().toISOString().split('T')[0],
            rate: 0,
            qty: 1,
            packingCharges: 0,
            forwardingCharges: 0,
            freightCharges: 0,
            gst5: 0,
            gst18: 0,
            totalGst: 0,
            totalIgst: 0,
            total: 0
        });
        addNotification('Entry Recorded', `Purchase from ${record.supplier} saved.`, 'success');
    };

    const filteredRecords = useMemo(() => {
        return purchaseRecords.filter(r => 
            r.supplier.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.equipmentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [purchaseRecords, searchQuery]);

    if (!isAuthenticated) {
        return (
            <div className="h-full flex items-center justify-center bg-slate-50 p-4">
                <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border p-8 text-center animate-in fade-in zoom-in-95">
                    <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-600 shadow-inner"><Lock size={40} /></div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Purchase Register Lock</h2>
                    <p className="text-slate-500 mb-8 text-sm leading-relaxed">Please enter security password to access purchase entries.</p>
                    <form onSubmit={verifyPassword} className="space-y-4">
                        <input type="password" placeholder="Password" className="w-full px-4 py-4 bg-slate-50 border-2 rounded-2xl outline-none focus:border-emerald-500 font-bold" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
                        <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-500/30">Verify & Unlock</button>
                    </form>
                </div>
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col gap-4 overflow-hidden p-2 bg-slate-50/50">
            {/* Header */}
            <div className="p-4 md:p-6 bg-white rounded-3xl border flex flex-col md:flex-row justify-between items-center shadow-sm shrink-0 gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-600 rounded-2xl text-white shadow-lg shadow-emerald-200/50"><ShoppingCart size={24} /></div>
                    <div>
                        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Purchase Entry Register</h2>
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">{purchaseRecords.length} Entries Logged</p>
                    </div>
                </div>
                <div className="flex flex-1 max-w-2xl gap-3 w-full">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search by Supplier, Equipment, or Invoice..." 
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border rounded-2xl text-sm font-bold outline-none focus:border-emerald-500 transition-all" 
                            value={searchQuery} 
                            onChange={(e) => setSearchQuery(e.target.value)} 
                        />
                    </div>
                    <button 
                        onClick={() => setShowAddModal(true)} 
                        className="bg-emerald-600 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200/50"
                    >
                        <Plus size={16} /> New Entry
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 bg-white rounded-3xl border overflow-hidden flex flex-col shadow-sm">
                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b text-[10px] uppercase font-black text-slate-500 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-5">Date / Invoice</th>
                                <th className="px-6 py-5">Supplier</th>
                                <th className="px-6 py-5">Equipment</th>
                                <th className="px-6 py-5 text-right">Qty / Rate</th>
                                <th className="px-6 py-5 text-right">GST Details</th>
                                <th className="px-6 py-5 text-right">Grand Total</th>
                                <th className="px-6 py-5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredRecords.map(record => (
                                <tr key={record.id} className="hover:bg-slate-50 transition-colors cursor-pointer group" onClick={() => setSelectedRecord(record)}>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-800">{record.dateSupply}</div>
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">INV: {record.invoiceNo}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-800 uppercase tracking-tight">{record.supplier}</div>
                                        <div className="text-[9px] font-medium text-slate-400">Recv: {record.materialReceivedDate}</div>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-slate-700 uppercase text-xs">{record.equipmentName}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="font-black text-slate-800">{record.qty} Units</div>
                                        <div className="text-[10px] font-bold text-slate-400">@ ₹{formatIndianNumber(record.rate)}</div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="text-[10px] font-black text-emerald-600">GST: ₹{formatIndianNumber(record.totalGst)}</div>
                                        {record.totalIgst > 0 && <div className="text-[10px] font-black text-indigo-600">IGST: ₹{formatIndianNumber(record.totalIgst)}</div>}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="font-black text-slate-900 text-base">₹{formatIndianNumber(record.total)}</div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setPendingDelete({ id: record.id, name: record.supplier }); }}
                                                className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                            <div className="p-2 text-slate-300 group-hover:text-emerald-600 transition-all"><ArrowUpRight size={18} /></div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
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
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-4xl w-full overflow-hidden scale-100 animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                        <div className="p-6 md:p-8 border-b flex justify-between items-center bg-slate-50/50 shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-emerald-600 rounded-2xl text-white shadow-lg"><Plus size={20} /></div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Record Purchase Entry</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Document Registry Section</p>
                                </div>
                            </div>
                            <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={24} className="text-slate-400" /></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {/* Basic Info */}
                                <div className="space-y-4 md:col-span-2 lg:col-span-3 border-b pb-6">
                                    <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">Transaction Details</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Supplier Name *</label>
                                            <input type="text" list="vendor-list" className="w-full border-2 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-emerald-500" placeholder="e.g. Siemens Healthcare" value={newRecord.supplier || ''} onChange={e => handleInputChange('supplier', e.target.value)} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Equipment Name *</label>
                                            <input type="text" list="prod-list" className="w-full border-2 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-emerald-500" placeholder="e.g. MRI Scanner" value={newRecord.equipmentName || ''} onChange={e => handleInputChange('equipmentName', e.target.value)} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Invoice Number *</label>
                                            <input type="text" className="w-full border-2 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-emerald-500" placeholder="INV/2024/001" value={newRecord.invoiceNo || ''} onChange={e => handleInputChange('invoiceNo', e.target.value)} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Supply Date</label>
                                            <input type="date" className="w-full border-2 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-emerald-500" value={newRecord.dateSupply || ''} onChange={e => handleInputChange('dateSupply', e.target.value)} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Received Date</label>
                                            <input type="date" className="w-full border-2 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-emerald-500" value={newRecord.materialReceivedDate || ''} onChange={e => handleInputChange('materialReceivedDate', e.target.value)} />
                                        </div>
                                    </div>
                                </div>

                                {/* Pricing */}
                                <div className="space-y-4 md:col-span-1 border-r pr-6">
                                    <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">Pricing & Qty</h4>
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unit Rate (₹)</label>
                                            <input type="number" className="w-full border-2 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-emerald-500" value={newRecord.rate || ''} onChange={e => handleInputChange('rate', e.target.value)} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quantity</label>
                                            <input type="number" className="w-full border-2 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-emerald-500" value={newRecord.qty || ''} onChange={e => handleInputChange('qty', e.target.value)} />
                                        </div>
                                    </div>
                                </div>

                                {/* Taxes */}
                                <div className="space-y-4 md:col-span-1 border-r pr-6">
                                    <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">GST Components</h4>
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">GST @ 5% (₹)</label>
                                            <input type="number" className="w-full border-2 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-emerald-500" value={newRecord.gst5 || ''} onChange={e => handleInputChange('gst5', e.target.value)} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">GST @ 18% (₹)</label>
                                            <input type="number" className="w-full border-2 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-emerald-500" value={newRecord.gst18 || ''} onChange={e => handleInputChange('gst18', e.target.value)} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Total IGST (₹)</label>
                                            <input type="number" className="w-full border-2 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-emerald-500" value={newRecord.totalIgst || ''} onChange={e => handleInputChange('totalIgst', e.target.value)} />
                                        </div>
                                    </div>
                                </div>

                                {/* Extra Charges */}
                                <div className="space-y-4 md:col-span-1 lg:col-span-1">
                                    <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">Auxiliary Charges</h4>
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Packing Charges (₹)</label>
                                            <input type="number" className="w-full border-2 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-emerald-500" value={newRecord.packingCharges || ''} onChange={e => handleInputChange('packingCharges', e.target.value)} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Forwarding Charges (₹)</label>
                                            <input type="number" className="w-full border-2 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-emerald-500" value={newRecord.forwardingCharges || ''} onChange={e => handleInputChange('forwardingCharges', e.target.value)} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Freight Charges (₹)</label>
                                            <input type="number" className="w-full border-2 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-emerald-500" value={newRecord.freightCharges || ''} onChange={e => handleInputChange('freightCharges', e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Summary Card */}
                            <div className="mt-8 p-6 bg-slate-900 rounded-[2rem] text-white flex flex-col md:flex-row justify-between items-center gap-6">
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Basic Subtotal</p>
                                        <p className="text-xl font-bold">₹{formatIndianNumber((Number(newRecord.rate) || 0) * (Number(newRecord.qty) || 0))}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Tax (GST/IGST)</p>
                                        <p className="text-xl font-bold text-emerald-400">₹{formatIndianNumber((Number(newRecord.totalGst) || 0) + (Number(newRecord.totalIgst) || 0))}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Extra Charges</p>
                                        <p className="text-xl font-bold text-indigo-400">₹{formatIndianNumber((Number(newRecord.packingCharges) || 0) + (Number(newRecord.forwardingCharges) || 0) + (Number(newRecord.freightCharges) || 0))}</p>
                                    </div>
                                </div>
                                <div className="text-center md:text-right">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Grand Total Payable</p>
                                    <p className="text-4xl font-black text-white tracking-tighter">₹{formatIndianNumber(newRecord.total || 0)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 md:p-8 border-t bg-slate-50 flex gap-4 shrink-0">
                            <button onClick={() => setShowAddModal(false)} className="flex-1 px-8 py-4 bg-white border-2 text-slate-400 font-black uppercase tracking-widest rounded-2xl hover:bg-slate-100 transition-all text-xs">Cancel</button>
                            <button onClick={handleSaveRecord} className="flex-[2] px-8 py-4 bg-emerald-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-emerald-500/20 active:scale-95 transition-all text-xs">Finalize Purchase Entry</button>
                        </div>
                    </div>
                </div>
            )}

            {/* View/Edit Details Modal */}
            {selectedRecord && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-2xl w-full overflow-hidden scale-100 animate-in zoom-in-95 flex flex-col">
                        <div className="p-6 md:p-8 border-b flex justify-between items-center bg-emerald-50/50 shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white rounded-2xl text-emerald-600 shadow-sm border border-emerald-100"><FileText size={24} /></div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Entry Details</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Record ID: {selectedRecord.id}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedRecord(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={24} className="text-slate-400" /></button>
                        </div>
                        
                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Supplier</p>
                                        <p className="font-bold text-slate-800 uppercase">{selectedRecord.supplier}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Equipment</p>
                                        <p className="font-bold text-slate-800 uppercase">{selectedRecord.equipmentName}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Invoice Info</p>
                                        <p className="font-bold text-slate-800">#{selectedRecord.invoiceNo}</p>
                                        <p className="text-xs text-slate-500">Dated: {selectedRecord.dateSupply}</p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="p-4 bg-slate-50 rounded-2xl border space-y-2">
                                        <div className="flex justify-between text-xs font-bold"><span className="text-slate-400">Rate x Qty:</span> <span>₹{formatIndianNumber(selectedRecord.rate * selectedRecord.qty)}</span></div>
                                        <div className="flex justify-between text-xs font-bold text-emerald-600"><span className="opacity-60">Total GST:</span> <span>₹{formatIndianNumber(selectedRecord.totalGst)}</span></div>
                                        <div className="flex justify-between text-xs font-bold text-indigo-600"><span className="opacity-60">Total IGST:</span> <span>₹{formatIndianNumber(selectedRecord.totalIgst)}</span></div>
                                        <div className="flex justify-between text-xs font-bold text-amber-600"><span className="opacity-60">Add-on Charges:</span> <span>₹{formatIndianNumber(selectedRecord.packingCharges + selectedRecord.forwardingCharges + selectedRecord.freightCharges)}</span></div>
                                        <div className="border-t pt-2 flex justify-between text-base font-black text-slate-900"><span>Grand Total:</span> <span>₹{formatIndianNumber(selectedRecord.total)}</span></div>
                                    </div>
                                    <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest text-right italic">Created By: {selectedRecord.createdBy || 'System'}</div>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 border-t bg-slate-50 flex gap-4 shrink-0">
                            <button onClick={() => setSelectedRecord(null)} className="flex-1 px-8 py-4 bg-slate-800 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-black transition-all text-xs shadow-lg">Close Record</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Deletion Confirmation */}
            {pendingDelete && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-[2rem] shadow-2xl max-sm w-full p-8 text-center animate-in zoom-in-95">
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
            <datalist id="vendor-list">{vendors.map(v => <option key={v.id} value={v.name} />)}</datalist>
            <datalist id="prod-list">{products.map((p, idx) => <option key={idx} value={p.name} />)}</datalist>
        </div>
    );
};
