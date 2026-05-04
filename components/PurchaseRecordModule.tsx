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

const FormRow = ({ label, children }: { label: string, children?: React.ReactNode }) => (
    <div className="flex flex-col gap-1.5 w-full">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 truncate whitespace-nowrap min-h-[14px]">{label}</label>
        {children}
    </div>
);

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
            <div className="p-4 md:p-6 bg-white rounded-3xl border border-slate-300 flex flex-col md:flex-row justify-between items-center shadow-sm shrink-0 gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-medical-600 rounded-2xl text-white shadow-lg shadow-medical-200/50"><ShoppingCart size={24} /></div>
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
                            placeholder="Search registry..." 
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-sm font-bold outline-none focus:border-medical-500 transition-all" 
                            value={searchQuery} 
                            onChange={(e) => setSearchQuery(e.target.value)} 
                        />
                    </div>
                    <button 
                        onClick={() => setShowAddModal(true)} 
                        className="bg-medical-600 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-medical-700 transition-all shadow-lg shadow-medical-200/50"
                    >
                        <Plus size={16} /> New Entry
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 bg-white rounded-3xl border border-slate-300 overflow-hidden flex flex-col shadow-sm">
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
                                        {record.totalIgst > 0 && <div className="text-[10px] font-black text-medical-600">IGST: ₹{formatIndianNumber(record.totalIgst)}</div>}
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
                                            <div className="p-2 text-slate-300 group-hover:text-medical-600 transition-all"><ArrowUpRight size={18} /></div>
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
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-md p-2 sm:p-4 animate-in fade-in">
                    <div className="bg-white rounded-[1.5rem] sm:rounded-[2.5rem] shadow-2xl max-w-4xl w-full overflow-hidden scale-100 animate-in zoom-in-95 flex flex-col max-h-[95vh] sm:max-h-[90vh]">
                        <div className="p-4 sm:p-6 md:p-8 border-b border-slate-200 flex justify-between items-center bg-slate-50/50 shrink-0">
                            <div className="flex items-center gap-3 sm:gap-4">
                                <div className="p-2 sm:p-3 bg-medical-600 rounded-xl sm:rounded-2xl text-white shadow-lg"><Plus size={20} /></div>
                                <div>
                                    <h3 className="text-xl sm:text-2xl font-black text-slate-800 uppercase tracking-tight">Purchase Entry</h3>
                                    <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Document Registry</p>
                                </div>
                            </div>
                            <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={24} className="text-slate-400" /></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 custom-scrollbar">
                            <section className="space-y-4">
                                <h4 className="text-[10px] font-black text-medical-600 uppercase tracking-[0.2em] border-b pb-1">1. Transaction Identity</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <FormRow label="Supplier Name *">
                                        <input type="text" list="vendor-list" className="w-full h-[42px] bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:ring-4 focus:ring-medical-500/5 transition-all" placeholder="Search Supplier" value={newRecord.supplier || ''} onChange={e => handleInputChange('supplier', e.target.value)} />
                                    </FormRow>
                                    <FormRow label="Equipment Name *">
                                        <input type="text" list="prod-list" className="w-full h-[42px] bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:ring-4 focus:ring-medical-500/5 transition-all" placeholder="Search Product" value={newRecord.equipmentName || ''} onChange={e => handleInputChange('equipmentName', e.target.value)} />
                                    </FormRow>
                                    <FormRow label="Invoice Number *">
                                        <input type="text" className="w-full h-[42px] bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm font-black outline-none focus:ring-4 focus:ring-medical-500/5 transition-all" placeholder="INV-001" value={newRecord.invoiceNo || ''} onChange={e => handleInputChange('invoiceNo', e.target.value)} />
                                    </FormRow>
                                    <FormRow label="Supply Date">
                                        <input type="date" className="w-full h-[42px] bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm font-bold outline-none" value={newRecord.dateSupply || ''} onChange={e => handleInputChange('dateSupply', e.target.value)} />
                                    </FormRow>
                                    <FormRow label="Received Date">
                                        <input type="date" className="w-full h-[42px] bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm font-bold outline-none" value={newRecord.materialReceivedDate || ''} onChange={e => handleInputChange('materialReceivedDate', e.target.value)} />
                                    </FormRow>
                                </div>
                            </section>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                                <section className="space-y-4">
                                    <h4 className="text-[10px] font-black text-medical-600 uppercase tracking-[0.2em] border-b pb-1">2. Basic Pricing</h4>
                                    <div className="space-y-3">
                                        <FormRow label="Unit Rate (₹)">
                                            <input type="number" className="w-full h-[42px] bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm font-black outline-none focus:ring-4 focus:ring-medical-500/5" value={newRecord.rate || 0} onChange={e => handleInputChange('rate', e.target.value)} />
                                        </FormRow>
                                        <FormRow label="Quantity">
                                            <input type="number" className="w-full h-[42px] bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm font-black outline-none focus:ring-4 focus:ring-medical-500/5" value={newRecord.qty || 0} onChange={e => handleInputChange('qty', e.target.value)} />
                                        </FormRow>
                                    </div>
                                </section>

                                <section className="space-y-4">
                                    <h4 className="text-[10px] font-black text-medical-600 uppercase tracking-[0.2em] border-b pb-1">3. GST Components</h4>
                                    <div className="space-y-3">
                                        <FormRow label="GST @ 5% (₹)">
                                            <input type="number" className="w-full h-[42px] bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm font-black outline-none" value={newRecord.gst5 || 0} onChange={e => handleInputChange('gst5', e.target.value)} />
                                        </FormRow>
                                        <FormRow label="GST @ 18% (₹)">
                                            <input type="number" className="w-full h-[42px] bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm font-black outline-none" value={newRecord.gst18 || 0} onChange={e => handleInputChange('gst18', e.target.value)} />
                                        </FormRow>
                                        <FormRow label="Total IGST (₹)">
                                            <input type="number" className="w-full h-[42px] bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm font-black outline-none" value={newRecord.totalIgst || 0} onChange={e => handleInputChange('totalIgst', e.target.value)} />
                                        </FormRow>
                                    </div>
                                </section>

                                <section className="space-y-4">
                                    <h4 className="text-[10px] font-black text-medical-600 uppercase tracking-[0.2em] border-b pb-1">4. Add-on Charges</h4>
                                    <div className="space-y-3">
                                        <FormRow label="Packing (₹)">
                                            <input type="number" className="w-full h-[42px] bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm font-bold outline-none" value={newRecord.packingCharges || 0} onChange={e => handleInputChange('packingCharges', e.target.value)} />
                                        </FormRow>
                                        <FormRow label="Forwarding (₹)">
                                            <input type="number" className="w-full h-[42px] bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm font-bold outline-none" value={newRecord.forwardingCharges || 0} onChange={e => handleInputChange('forwardingCharges', e.target.value)} />
                                        </FormRow>
                                        <FormRow label="Freight (₹)">
                                            <input type="number" className="w-full h-[42px] bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm font-bold outline-none" value={newRecord.freightCharges || 0} onChange={e => handleInputChange('freightCharges', e.target.value)} />
                                        </FormRow>
                                    </div>
                                </section>
                            </div>

                            <div className="p-5 sm:p-6 bg-slate-900 rounded-[1.5rem] sm:rounded-[2rem] text-white flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-6 shadow-xl">
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-8 w-full sm:w-auto">
                                    <div>
                                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5 leading-none">Subtotal</p>
                                        <p className="text-sm sm:text-base font-bold">₹{formatIndianNumber((Number(newRecord.rate) || 0) * (Number(newRecord.qty) || 0))}</p>
                                    </div>
                                    <div>
                                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5 leading-none">Total Tax</p>
                                        <p className="text-sm sm:text-base font-bold text-emerald-400">₹{formatIndianNumber((Number(newRecord.totalGst) || 0) + (Number(newRecord.totalIgst) || 0))}</p>
                                    </div>
                                    <div className="hidden sm:block">
                                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5 leading-none">Add-on</p>
                                        <p className="text-sm sm:text-base font-bold text-medical-400">₹{formatIndianNumber((Number(newRecord.packingCharges) || 0) + (Number(newRecord.forwardingCharges) || 0) + (Number(newRecord.freightCharges) || 0))}</p>
                                    </div>
                                </div>
                                <div className="text-center sm:text-right w-full sm:w-auto border-t border-slate-800 sm:border-t-0 pt-3 sm:pt-0">
                                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-0.5 leading-none">Total Payable</p>
                                    <p className="text-2xl sm:text-3xl font-black text-white tracking-tighter">₹{formatIndianNumber(newRecord.total || 0)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="sticky bottom-0 left-0 right-0 p-4 sm:p-6 bg-white/90 backdrop-blur-md border-t border-slate-200 flex flex-col sm:flex-row gap-3 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] z-20 shrink-0">
                            <button onClick={() => setShowAddModal(false)} className="flex-1 px-6 py-3 bg-slate-100 text-slate-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-colors">Cancel</button>
                            <button onClick={handleSaveRecord} className="flex-[2] px-6 py-3 bg-gradient-to-r from-medical-600 to-teal-500 text-white font-black uppercase tracking-widest rounded-xl shadow-xl shadow-medical-500/30 active:scale-95 transition-all text-[10px]">Save Purchase Entry</button>
                        </div>
                    </div>
                </div>
            )}

            {/* View/Edit Details Modal */}
            {selectedRecord && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-2xl w-full overflow-hidden scale-100 animate-in zoom-in-95 flex flex-col">
                        <div className="p-6 md:p-8 border-b flex justify-between items-center bg-medical-50/50 shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white rounded-2xl text-medical-600 shadow-sm border border-medical-100"><FileText size={24} /></div>
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
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                                        <div className="flex justify-between text-xs font-bold"><span className="text-slate-400">Rate x Qty:</span> <span>₹{formatIndianNumber((selectedRecord.rate || 0) * (selectedRecord.qty || 0))}</span></div>
                                        <div className="flex justify-between text-xs font-bold text-emerald-600"><span className="opacity-60">Total GST:</span> <span>₹{formatIndianNumber(selectedRecord.totalGst || 0)}</span></div>
                                        <div className="flex justify-between text-xs font-bold text-medical-600"><span className="opacity-60">Total IGST:</span> <span>₹{formatIndianNumber(selectedRecord.totalIgst || 0)}</span></div>
                                        <div className="flex justify-between text-xs font-bold text-amber-600"><span className="opacity-60">Add-on Charges:</span> <span>₹{formatIndianNumber((selectedRecord.packingCharges || 0) + (selectedRecord.forwardingCharges || 0) + (selectedRecord.freightCharges || 0))}</span></div>
                                        <div className="border-t border-slate-200 pt-2 flex justify-between text-base font-black text-slate-900"><span>Grand Total:</span> <span>₹{formatIndianNumber(selectedRecord.total || 0)}</span></div>
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
            <datalist id="vendor-list">{vendors.map(v => <option key={v.id} value={v.name} />)}</datalist>
            <datalist id="prod-list">{products.map((p, idx) => <option key={idx} value={p.name} />)}</datalist>
        </div>
    );
};
