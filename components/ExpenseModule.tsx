import React, { useState, useRef, useMemo, useEffect } from 'react';
import { ExpenseRecord } from '../types';
import { 
    Receipt, Plus, FileText, CheckCircle2, Clock, XCircle, 
    Check, X, Image as ImageIcon, RefreshCw, Upload, 
    AlertCircle, MessageSquare, Download, Camera, List, 
    ArrowUpRight, Trash2, Edit2, Activity, DollarSign, 
    Search, User, ChevronRight, PieChart, Info, RotateCw, Sparkles, Minus
} from 'lucide-react';
import { useData } from './DataContext';

const FormRow = ({ label, children }: { label: string, children?: React.ReactNode }) => (
    <div className="flex flex-col gap-1.5 w-full">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 truncate whitespace-nowrap min-h-[14px]">{label}</label>
        {children}
    </div>
);

interface ExpenseModuleProps {
    currentUser: string;
    userRole: 'Admin' | 'Employee';
}

export const ExpenseModule: React.FC<ExpenseModuleProps> = ({ currentUser, userRole }) => {
    const { 
        expenses, addExpense, updateExpense, updateExpenseStatus, 
        addNotification, fetchMoreData, ledgers, addLedger, postToLedger 
    } = useData();

    const [viewState, setViewState] = useState<'stock' | 'builder'>('stock');
    const [builderMode, setBuilderMode] = useState<'add' | 'edit'>('add');
    const [selectedExpense, setSelectedExpense] = useState<ExpenseRecord | null>(null);
    const [rejectionModal, setRejectionModal] = useState<string | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [isCompressing, setIsCompressing] = useState(false);
    const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewReceiptModal, setViewReceiptModal] = useState<string | null>(null);
    const [zoomScale, setZoomScale] = useState(1);
    const [zoomRotation, setZoomRotation] = useState(0);
    const [isHighClarity, setIsHighClarity] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [dragScroll, setDragScroll] = useState({ left: 0, top: 0 });
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const DEFAULT_EXPENSE: Partial<ExpenseRecord> = {
        date: new Date().toISOString().split('T')[0],
        category: 'Travel',
        amount: 0,
        description: '',
        status: 'Pending'
    };

    const [expense, setExpense] = useState<Partial<ExpenseRecord>>(DEFAULT_EXPENSE);

    const handleExportCSV = () => {
        if (filteredExpenses.length === 0) return;
        const headers = ["Date", "Personnel", "Category", "Description", "Value", "Status"];
        const rows = filteredExpenses.map(e => [
            e.date,
            `"${e.employeeName.replace(/"/g, '""')}"`,
            e.category,
            `"${e.description.replace(/"/g, '""')}"`,
            e.amount,
            e.status
        ]);
        
        const csvContent = [headers, ...rows].map(r => r.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `Enterprise_Vouchers_${new Date().toISOString().split('T')[0]}.csv`);
        link.click();
    };

    const compressImage = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 1200;
                    const MAX_HEIGHT = 1200;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                    } else {
                        if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
                    }

                    canvas.width = width; canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) return reject('Could not get canvas context');

                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.6));
                };
                img.onerror = () => reject('Error loading image');
            };
            reader.onerror = () => reject('Error reading file');
        });
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIsCompressing(true);
            try {
                const compressed = await compressImage(file);
                setReceiptPreview(compressed);
            } catch (err) {
                console.error("Compression failed:", err);
                addNotification('Upload Error', 'Failed to process snapshot.', 'alert');
            } finally {
                setIsCompressing(false);
            }
        }
    };

    const handleSave = async () => {
        if (!expense.amount || !expense.description) {
            addNotification('Validation Error', 'Amount and Description are mandatory.', 'alert');
            return;
        }

        if (builderMode === 'add') {
            const record: ExpenseRecord = {
                ...expense as ExpenseRecord,
                id: `EXP-${Date.now()}`,
                employeeName: currentUser,
                receiptUrl: receiptPreview || undefined,
                status: 'Pending'
            };
            await addExpense(record);
            addNotification('Voucher Submitted', `Your claim for ₹${record.amount} is now pending approval.`, 'info');
        } else {
            const updates: Partial<ExpenseRecord> = {
                ...expense,
                receiptUrl: receiptPreview || expense.receiptUrl
            };
            await updateExpense(expense.id!, updates);
            addNotification('Voucher Updated', `Changes to voucher claim ₹${updates.amount} saved.`, 'info');
        }

        setViewState('stock');
        setExpense(DEFAULT_EXPENSE);
        setReceiptPreview(null);
    };

    const handleApprove = async (id: string) => {
        const target = expenses.find(e => e.id === id);
        if (!target) return;

        await updateExpenseStatus(id, 'Approved');
        addNotification('Voucher Approved', 'Expense claim cleared for payment.', 'success');

        // Ledger posting logic
        try {
            const ldgName = `${target.category} Expense`;
            let expLedger = ledgers.find(l => l.name === ldgName);
            if (!expLedger) {
                const newLdgId = `LDG-EXP-${target.category.toUpperCase()}`;
                await addLedger({
                    id: newLdgId,
                    name: ldgName,
                    groupId: 'GRP-EXPENSES',
                    openingBalance: 0,
                    currentBalance: 0
                });
                expLedger = { id: newLdgId, name: ldgName } as any;
            }

            const entries = [
                { id: `ENT-1-${Date.now()}`, ledgerId: expLedger!.id, ledgerName: expLedger!.name, debit: target.amount, credit: 0 },
                { id: `ENT-2-${Date.now()}`, ledgerId: 'LDG-CASH', ledgerName: 'Cash', debit: 0, credit: target.amount }
            ];

            await postToLedger({
                voucherNumber: `EXP-VCH-${target.id.slice(-4)}`,
                date: new Date().toISOString().split('T')[0],
                type: 'Payment',
                entries,
                narration: `Expense approved: ${target.description} (${target.employeeName})`,
                referenceId: target.id,
                referenceNumber: target.id,
                totalAmount: target.amount
            });
        } catch (accErr) {
            console.error("Ledger posting failed:", accErr);
        }
    };

    const handleConfirmRejection = async () => {
        if (!rejectionReason.trim()) {
            addNotification('Requirement', 'Rejection reason is mandatory.', 'alert');
            return;
        }
        if (rejectionModal) {
            await updateExpenseStatus(rejectionModal, 'Rejected', rejectionReason);
            setRejectionModal(null);
            setRejectionReason('');
            addNotification('Voucher Rejected', 'Audit feedback sent to employee.', 'alert');
            if (selectedExpense?.id === rejectionModal) setSelectedExpense(null);
        }
    };

    const filteredExpenses = useMemo(() => {
        let base = userRole === 'Admin' ? expenses : expenses.filter(e => e.employeeName === currentUser);
        if (!searchQuery.trim()) return base;
        const lowQuery = searchQuery.toLowerCase();
        return base.filter(e => 
            (e.description || '').toLowerCase().includes(lowQuery) ||
            (e.category || '').toLowerCase().includes(lowQuery) ||
            (e.employeeName || '').toLowerCase().includes(lowQuery)
        );
    }, [expenses, searchQuery, userRole, currentUser]);

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'Approved': return 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-emerald-500/10';
            case 'Rejected': return 'bg-rose-50 text-rose-600 border-rose-100';
            default: return 'bg-amber-50 text-amber-600 border-amber-100';
        }
    };

    return (
        <div className="h-full flex flex-col gap-2 md:gap-4 overflow-hidden p-1 md:p-2">
            <div className="flex bg-white p-1 rounded-xl md:rounded-2xl border border-slate-300 w-fit shrink-0 shadow-sm">
                <button onClick={() => setViewState('stock')} className={`px-4 md:px-8 py-1.5 md:py-2 rounded-lg md:rounded-xl text-[10px] md:text-sm font-black uppercase tracking-widest flex items-center gap-2 transition-all ${viewState === 'stock' ? 'bg-medical-600 text-white shadow-lg shadow-medical-500/20' : 'text-slate-400 hover:text-slate-600'}`}><List size={14} /> Console</button>
                <button onClick={() => { setViewState('builder'); setBuilderMode('add'); setExpense(DEFAULT_EXPENSE); setReceiptPreview(null); }} className={`px-4 md:px-8 py-1.5 md:py-2 rounded-lg md:rounded-xl text-[10px] md:text-sm font-black uppercase tracking-widest flex items-center gap-2 transition-all ${viewState === 'builder' && builderMode === 'add' ? 'bg-medical-600 text-white shadow-lg shadow-medical-500/20' : 'text-slate-400 hover:text-slate-600'}`}><Plus size={14} /> Claim</button>
            </div>

            {viewState === 'stock' ? (
                <div className="flex-1 flex flex-col lg:flex-row gap-2 md:gap-4 min-h-0">
                    <div className="flex-1 bg-white rounded-2xl md:rounded-[2.5rem] border border-slate-300 shadow-sm overflow-hidden flex flex-col animate-in fade-in">
                        <div className="p-3 md:p-5 border-b border-slate-300 bg-slate-50/30 flex flex-col sm:flex-row justify-between items-center shrink-0 gap-3 md:gap-4">
                            <div className="flex items-center gap-2 md:gap-3">
                                <div className="w-8 h-8 md:w-10 md:h-10 bg-emerald-100 rounded-xl md:rounded-2xl flex items-center justify-center text-emerald-600 shadow-inner border border-emerald-50"><Receipt size={16} /></div>
                                <div><h3 className="font-black text-slate-800 uppercase tracking-tight text-xs md:text-base">Vouchers</h3><p className="text-[8px] md:text-[10px] text-slate-400 font-black uppercase tracking-widest">{filteredExpenses.length} Records</p></div>
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto">
                                <div className="relative flex-1 sm:w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} /><input type="text" placeholder="Filter..." className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-xl md:rounded-2xl text-[10px] font-bold outline-none focus:border-medical-500 transition-all shadow-inner uppercase" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
                                {userRole === 'Admin' && <button onClick={handleExportCSV} className="p-2 bg-white border border-slate-300 rounded-xl text-slate-400 hover:text-medical-600 transition-all shadow-sm"><Download size={16}/></button>}
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto custom-scrollbar">
                            <table className="w-full text-left text-[10px] md:text-[11px]">
                                <thead className="bg-slate-50 sticky top-0 z-10 font-black uppercase text-[8px] md:text-[9px] text-slate-500 border-b tracking-widest shadow-[0_1px_0_0_#f1f5f9]">
                                    <tr><th className="px-4 md:px-8 py-3 md:py-4">Entry</th>{userRole === 'Admin' && <th className="px-4 md:px-8 py-3 md:py-4 hidden sm:table-cell">Personnel</th>}<th className="px-4 md:px-8 py-3 md:py-4">Info</th><th className="px-4 md:px-8 py-3 md:py-4 text-right">Value</th><th className="px-4 md:px-8 py-3 md:py-4 text-right">Status</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredExpenses.map(e => (
                                        <tr key={e.id} className={`hover:bg-slate-50 transition-colors group cursor-pointer ${selectedExpense?.id === e.id ? 'bg-medical-50/50' : ''}`} onClick={() => setSelectedExpense(e)}>
                                            <td className="px-4 md:px-8 py-3 md:py-4"><div className="font-black text-slate-400 uppercase text-[9px] tracking-widest">{e.date}</div><div className="text-[8px] font-bold text-slate-300 uppercase mt-0.5 hidden sm:block">#{e.id.slice(-6)}</div></td>
                                            {userRole === 'Admin' && <td className="px-4 md:px-8 py-3 md:py-4 hidden sm:table-cell"><div className="flex items-center gap-2"><div className="w-6 h-6 bg-slate-100 rounded-lg flex items-center justify-center font-black text-slate-500 border border-slate-200 text-[10px]">{e.employeeName.charAt(0)}</div><span className="font-black text-slate-700 uppercase tracking-tighter truncate max-w-[80px]">{e.employeeName}</span></div></td>}
                                            <td className="px-4 md:px-8 py-3 md:py-4"><div className="flex flex-col gap-0.5"><div className="flex items-center gap-2"><span className="text-[8px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 uppercase">{e.category}</span><span className="font-bold text-slate-700 uppercase truncate max-w-[150px] md:max-w-[250px]">{e.description}</span></div>{e.receiptUrl && <button onClick={(ev) => { ev.stopPropagation(); setViewReceiptModal(e.receiptUrl!); setZoomScale(1); setZoomRotation(0); setIsHighClarity(false); }} className="flex items-center gap-1 text-[8px] font-black text-medical-600 uppercase tracking-widest hover:text-medical-800 transition-colors"><ImageIcon size={8}/> Proof</button>}</div></td>
                                            <td className="px-4 md:px-8 py-3 md:py-4 text-right font-black text-[11px] md:text-[13px] text-slate-800 tracking-tighter">₹{e.amount.toLocaleString()}</td>
                                            <td className="px-4 md:px-8 py-3 md:py-4 text-right"><span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${getStatusStyle(e.status)}`}>{e.status}</span></td>
                                        </tr>
                                    ))}
                                    {filteredExpenses.length === 0 && (
                                        <tr><td colSpan={5} className="py-20 md:py-40 text-center text-slate-300 font-black uppercase tracking-[0.5em] opacity-30 italic">Registry Vacuum</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {selectedExpense && (
                        <div className="w-full lg:w-[380px] bg-white rounded-2xl md:rounded-[2.5rem] shadow-2xl border border-slate-300 flex flex-col shrink-0 overflow-hidden animate-in slide-in-from-right-4">
                            <div className="p-5 md:p-6 border-b border-slate-300 bg-slate-50/50 relative">
                                <button onClick={() => setSelectedExpense(null)} className="absolute top-4 right-4 p-2 text-slate-300 hover:text-slate-500 transition-colors"><X size={20}/></button>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-600 rounded-xl md:rounded-2xl flex items-center justify-center text-white text-lg md:text-xl font-black shadow-xl shadow-indigo-500/20"><Activity size={20} /></div>
                                    <div><h3 className="text-lg md:text-xl font-black text-slate-800 uppercase tracking-tight leading-tight">Voucher Logic</h3><p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Audit ID: {selectedExpense.id.slice(-8)}</p></div>
                                </div>
                                <div className={`p-3 rounded-xl md:rounded-2xl border flex items-center justify-between ${getStatusStyle(selectedExpense.status)}`}>
                                    <div className="flex items-center gap-2 md:gap-3">{selectedExpense.status === 'Approved' ? <CheckCircle2 size={14}/> : selectedExpense.status === 'Rejected' ? <XCircle size={14}/> : <Clock size={14}/>}<span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">Settlement: {selectedExpense.status}</span></div>
                                    <ChevronRight size={14}/>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-6 md:space-y-8 custom-scrollbar">
                                <section className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Claim Date</p>
                                        <p className="text-sm font-black text-slate-800">{selectedExpense.date}</p>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Personnel</p>
                                        <p className="text-sm font-black text-slate-800 uppercase truncate">{selectedExpense.employeeName}</p>
                                    </div>
                                </section>

                                <section className="p-4 md:p-6 bg-slate-900 rounded-2xl md:rounded-3xl text-white shadow-xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 md:p-8 opacity-10 group-hover:scale-110 transition-transform"><DollarSign size={60} /></div>
                                    <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 md:mb-2">Claim Valuation</p>
                                    <h4 className="text-2xl md:text-3xl font-black tracking-tighter text-emerald-400">₹{selectedExpense.amount.toLocaleString()}</h4>
                                    <div className="mt-2 md:mt-4 flex items-center gap-2"><span className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase">Category:</span><span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-indigo-400">{selectedExpense.category}</span></div>
                                </section>

                                <section className="space-y-3">
                                    <h4 className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1"><Info size={12} /> Voucher Memo</h4>
                                    <p className="p-4 md:p-5 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl text-[11px] md:text-[13px] font-bold text-slate-600 leading-relaxed italic">"{selectedExpense.description}"</p>
                                </section>

                                {selectedExpense.receiptUrl && (
                                    <section className="space-y-3">
                                        <h4 className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1"><ImageIcon size={12} /> Snapshot Evidence</h4>
                                        <div className="relative group cursor-zoom-in rounded-2xl md:rounded-3xl overflow-hidden border-2 md:border-4 border-slate-100 shadow-lg" onClick={() => setViewReceiptModal(selectedExpense.receiptUrl!)}>
                                            <img src={selectedExpense.receiptUrl} alt="Receipt" className="w-full h-auto object-cover max-h-[200px] md:max-h-[300px]" />
                                            <div className="absolute inset-0 bg-indigo-600/20 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center"><div className="bg-white px-4 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest text-indigo-600 shadow-2xl">Expand Proof</div></div>
                                        </div>
                                    </section>
                                )}

                                {selectedExpense.status === 'Rejected' && selectedExpense.rejectionReason && (
                                    <section className="p-4 md:p-6 bg-rose-50 border border-rose-100 rounded-2xl md:rounded-3xl space-y-2 md:space-y-3">
                                        <div className="flex items-center gap-2 md:gap-3 text-rose-600"><AlertCircle size={14}/><p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">Audit Objection</p></div>
                                        <p className="text-[10px] md:text-xs font-bold text-rose-800 italic leading-relaxed">"{selectedExpense.rejectionReason}"</p>
                                    </section>
                                )}
                            </div>

                            <div className="p-4 md:p-6 bg-slate-50/50 border-t border-slate-300 shrink-0 flex gap-3 md:gap-4">
                                {userRole === 'Admin' && selectedExpense.status === 'Pending' ? (
                                    <>
                                        <button onClick={() => setRejectionModal(selectedExpense.id)} className="flex-1 py-3 md:py-4 bg-white border border-rose-200 text-rose-500 rounded-xl md:rounded-2xl font-black text-[9px] md:text-[10px] uppercase tracking-widest shadow-sm hover:bg-rose-50 transition-all">Decline</button>
                                        <button onClick={() => handleApprove(selectedExpense.id)} className="flex-[2] py-3 md:py-4 bg-emerald-600 text-white rounded-xl md:rounded-2xl font-black text-[9px] md:text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 transition-all">Authorize</button>
                                    </>
                                ) : (
                                    <>
                                        {selectedExpense.employeeName === currentUser && selectedExpense.status === 'Pending' && (
                                            <button onClick={() => { setExpense(selectedExpense); setViewState('builder'); setBuilderMode('edit'); }} className="flex-1 py-3 md:py-4 bg-slate-800 text-white rounded-xl md:rounded-2xl font-black text-[9px] md:text-[10px] uppercase tracking-widest shadow-xl hover:bg-black transition-all flex items-center justify-center gap-2 md:gap-3"><Edit2 size={14}/> Modify</button>
                                        )}
                                        <button onClick={() => setSelectedExpense(null)} className="w-full py-3 md:py-4 bg-white border border-slate-300 rounded-xl md:rounded-2xl font-black text-[9px] md:text-[10px] uppercase tracking-widest">Close Record</button>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex-1 flex flex-col bg-white rounded-2xl md:rounded-[2.5rem] shadow-2xl border border-slate-300 overflow-hidden animate-in slide-in-from-bottom-6 duration-300">
                    <div className="flex bg-slate-50/80 backdrop-blur-sm border-b border-slate-300 shrink-0 px-6 md:px-10 py-4 md:py-6 justify-between items-center">
                        <div className="flex flex-col"><h3 className="text-lg md:text-2xl font-black text-slate-800 uppercase tracking-tight">{builderMode === 'add' ? 'Claim Intake' : 'Voucher Edit'}</h3><p className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Synchronizing with enterprise ledger</p></div>
                        <button onClick={() => setViewState('stock')} className="p-2 md:p-3 bg-white text-slate-400 rounded-xl md:rounded-2xl hover:text-slate-600 transition-all border border-slate-200 shadow-sm"><X size={20}/></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 md:space-y-12 custom-scrollbar pb-32">
                        <section className="space-y-4 md:space-y-6">
                            <h3 className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] border-b border-slate-100 pb-2 flex items-center gap-2"><PieChart size={12} className="text-medical-500" />1. Valuation Logic</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                                <div className="sm:col-span-1"><FormRow label="Voucher Date"><input type="date" className="w-full h-[42px] md:h-[48px] bg-slate-50 border border-slate-300 rounded-xl md:rounded-2xl px-4 md:px-5 text-sm font-black outline-none focus:ring-4 focus:ring-medical-500/5" value={expense.date} onChange={e => setExpense({...expense, date: e.target.value})} /></FormRow></div>
                                <FormRow label="Expense Category"><select className="w-full h-[42px] md:h-[48px] bg-white border border-slate-300 rounded-xl md:rounded-2xl px-4 md:px-5 text-[11px] md:text-xs font-black uppercase" value={expense.category} onChange={e => setExpense({...expense, category: e.target.value as any})}><option>Travel</option><option>Food</option><option>Lodging</option><option>Supplies</option><option>Other</option></select></FormRow>
                                <div className="sm:col-span-2"><FormRow label="Settlement Value (₹) *"><input type="number" className="w-full h-[42px] md:h-[48px] bg-white border border-slate-300 rounded-xl md:rounded-2xl px-4 md:px-5 text-lg md:text-xl font-black text-emerald-600 tracking-tighter" placeholder="0.00" value={expense.amount || ''} onChange={e => setExpense({...expense, amount: Number(e.target.value)})} /></FormRow></div>
                            </div>
                        </section>

                        <section className="space-y-4 md:space-y-6">
                            <h3 className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] border-b border-slate-100 pb-2 flex items-center gap-2"><Info size={12} className="text-medical-500" />2. Purpose & Context</h3>
                            <FormRow label="Narrative *"><textarea className="w-full min-h-[100px] md:min-h-[120px] bg-white border border-slate-300 rounded-xl md:rounded-2xl px-4 md:px-5 py-3 md:py-4 text-[13px] md:text-sm font-bold outline-none focus:border-medical-500" placeholder="DESCRIBE PURPOSE..." value={expense.description || ''} onChange={e => setExpense({...expense, description: e.target.value})} /></FormRow>
                        </section>

                        <section className="space-y-4 md:space-y-6">
                            <h3 className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] border-b border-slate-100 pb-2 flex items-center gap-2"><ImageIcon size={12} className="text-medical-500" />3. Digital Proof</h3>
                            <div className="max-w-xl">
                                {isCompressing ? (
                                    <div className="p-8 md:p-12 border-2 border-dashed border-medical-500 bg-medical-50/20 rounded-2xl md:rounded-[2.5rem] flex flex-col items-center justify-center gap-3 md:gap-4 shadow-inner">
                                        <RefreshCw size={32} className="animate-spin text-medical-600" />
                                        <p className="text-[10px] font-black text-medical-600 uppercase tracking-[0.2em]">Optimizing...</p>
                                    </div>
                                ) : receiptPreview || expense.receiptUrl ? (
                                    <div className="p-4 md:p-6 bg-emerald-50 border-2 border-emerald-200 rounded-2xl md:rounded-[2.5rem] flex items-center justify-between shadow-xl shadow-emerald-500/10">
                                        <div className="flex items-center gap-4 md:gap-6">
                                            <div className="w-16 h-16 md:w-24 md:h-24 rounded-2xl md:rounded-3xl bg-white border-2 md:border-4 border-white shadow-2xl overflow-hidden ring-1 ring-emerald-100"><img src={receiptPreview || expense.receiptUrl} alt="Evidence" className="w-full h-full object-cover" /></div>
                                            <div><p className="text-xs md:text-sm font-black text-emerald-800 uppercase tracking-tight">Synchronized</p><p className="text-[9px] md:text-[10px] font-bold text-emerald-600/60 uppercase tracking-widest mt-0.5 md:mt-1 italic">Proof Logged</p></div>
                                        </div>
                                        <button onClick={() => { setReceiptPreview(null); setExpense({...expense, receiptUrl: undefined}); }} className="p-3 md:p-4 bg-white text-rose-500 rounded-xl md:rounded-2xl hover:bg-rose-50 transition-all shadow-sm border border-rose-100"><X size={18}/></button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-4 md:gap-6">
                                        <label className="flex flex-col items-center justify-center p-6 md:p-12 border-2 border-dashed border-slate-300 rounded-2xl md:rounded-[2.5rem] hover:border-indigo-500 hover:bg-indigo-50/30 transition-all text-slate-400 group cursor-pointer shadow-inner">
                                            <input type="file" onChange={handleFileChange} accept="image/*" capture="environment" className="hidden" />
                                            <Camera size={32} className="mb-2 md:mb-4 opacity-20 group-hover:opacity-100 group-hover:text-indigo-500 transition-all" />
                                            <span className="text-[10px] md:text-[11px] font-black uppercase tracking-widest group-hover:text-indigo-600">Snap</span>
                                        </label>
                                        <label className="flex flex-col items-center justify-center p-6 md:p-12 border-2 border-dashed border-slate-300 rounded-2xl md:rounded-[2.5rem] hover:border-emerald-500 hover:bg-emerald-50/30 transition-all text-slate-400 group cursor-pointer shadow-inner">
                                            <input type="file" onChange={handleFileChange} accept="image/*" className="hidden" />
                                            <Upload size={32} className="mb-2 md:mb-4 opacity-20 group-hover:opacity-100 group-hover:text-emerald-500 transition-all" />
                                            <span className="text-[10px] md:text-[11px] font-black uppercase tracking-widest group-hover:text-emerald-600">Pick</span>
                                        </label>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>

                    <div className="sticky bottom-0 left-0 right-0 p-4 md:p-6 bg-white/95 backdrop-blur-md border-t border-slate-200 flex justify-end gap-3 md:gap-4 shadow-[0_-15px_30px_rgba(0,0,0,0.06)] z-30 shrink-0 px-6 md:px-10">
                        <button onClick={() => { setViewState('stock'); setExpense(DEFAULT_EXPENSE); }} className="px-6 md:px-10 py-3 md:py-4 bg-slate-100 text-slate-500 rounded-xl md:rounded-2xl font-black text-[9px] md:text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all border border-slate-200 shadow-inner">Abort</button>
                        <button onClick={handleSave} disabled={isCompressing} className="px-10 md:px-16 py-3 md:py-4 bg-gradient-to-r from-emerald-600 to-indigo-500 text-white rounded-xl md:rounded-2xl font-black text-[10px] md:text-[11px] uppercase tracking-widest shadow-2xl shadow-emerald-500/40 active:scale-95 transition-all hover:brightness-110 disabled:opacity-50">Authorize</button>
                    </div>
                </div>
            )}

            {rejectionModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-in fade-in">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md flex flex-col scale-100 animate-in zoom-in-95 overflow-hidden border-4 border-rose-50">
                        <div className="p-10 text-center space-y-6">
                            <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center mx-auto text-rose-600 border border-rose-100 shadow-inner"><AlertCircle size={40} /></div>
                            <div><h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Audit Declinaton</h3><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Explicit reason required for registry rejection</p></div>
                            <textarea autoFocus className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-6 py-6 text-sm font-bold outline-none focus:border-rose-500 transition-all min-h-[120px] resize-none" placeholder="REASON FOR REJECTION (E.G. INSUFFICIENT PROOF)..." value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} />
                        </div>
                        <div className="p-8 bg-slate-50 flex gap-4 border-t border-slate-200">
                            <button onClick={() => setRejectionModal(null)} className="flex-1 py-4 bg-white text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-slate-300">Abort</button>
                            <button onClick={handleConfirmRejection} className="flex-[2] py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-rose-500/30 active:scale-95 transition-all">Confirm Declinaton</button>
                        </div>
                    </div>
                </div>
            )}

            {viewReceiptModal && (
                <div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-950/95 backdrop-blur-2xl p-4 animate-in fade-in" onClick={() => setViewReceiptModal(null)}>
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[260] flex items-center gap-2 md:gap-4 bg-slate-900 border border-slate-700 px-4 md:px-6 py-2 md:py-3 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setZoomScale(s => Math.max(s - 0.25, 0.5))} className="p-2 text-white hover:bg-white/10 rounded-xl transition-all" title="Zoom Out"><Minus size={20} /></button>
                        <span className="text-[10px] font-black text-white uppercase tracking-widest min-w-[50px] text-center">{Math.round(zoomScale * 100)}%</span>
                        <button onClick={() => setZoomScale(s => Math.min(s + 0.25, 4))} className="p-2 text-white hover:bg-white/10 rounded-xl transition-all" title="Zoom In"><Plus size={20}/></button>
                        
                        <div className="w-px h-4 bg-white/20 mx-1"></div>
                        
                        <button onClick={() => setZoomRotation(r => (r + 90) % 360)} className="p-2 text-white hover:bg-white/10 rounded-xl transition-all" title="Rotate"><RotateCw size={20}/></button>
                        <button onClick={() => setIsHighClarity(!isHighClarity)} className={`p-2 rounded-xl transition-all ${isHighClarity ? 'bg-medical-500 text-white shadow-lg' : 'text-white hover:bg-white/10'}`} title="Enhance Clarity"><Sparkles size={20}/></button>
                        
                        <div className="w-px h-4 bg-white/20 mx-1"></div>
                        
                        <a href={viewReceiptModal} download="Evidence.jpg" className="p-2 text-white hover:bg-white/10 rounded-xl transition-all" title="Download"><Download size={20}/></a>
                        <button onClick={() => setViewReceiptModal(null)} className="p-2 text-rose-400 hover:bg-rose-400/10 rounded-xl transition-all"><X size={20}/></button>
                    </div>
                    <div 
                        ref={scrollContainerRef}
                        className={`relative w-full h-full overflow-auto custom-scrollbar p-10 md:p-20 select-none ${zoomScale > 1 ? 'cursor-grab' : ''} ${isDragging ? 'cursor-grabbing' : ''}`} 
                        onClick={e => e.stopPropagation()}
                        onMouseDown={(e) => {
                            if (zoomScale <= 1) return;
                            setIsDragging(true);
                            setDragStart({ x: e.pageX - (scrollContainerRef.current?.offsetLeft || 0), y: e.pageY - (scrollContainerRef.current?.offsetTop || 0) });
                            setDragScroll({ left: scrollContainerRef.current?.scrollLeft || 0, top: scrollContainerRef.current?.scrollTop || 0 });
                        }}
                        onMouseLeave={() => setIsDragging(false)}
                        onMouseUp={() => setIsDragging(false)}
                        onMouseMove={(e) => {
                            if (!isDragging || !scrollContainerRef.current) return;
                            e.preventDefault();
                            const x = e.pageX - (scrollContainerRef.current.offsetLeft || 0);
                            const y = e.pageY - (scrollContainerRef.current.offsetTop || 0);
                            const walkX = (x - dragStart.x);
                            const walkY = (y - dragStart.y);
                            scrollContainerRef.current.scrollLeft = dragScroll.left - walkX;
                            scrollContainerRef.current.scrollTop = dragScroll.top - walkY;
                        }}
                    >
                        <div 
                            className="transition-all duration-300 ease-out flex items-center justify-center min-h-[150vh] min-w-[150vw]" 
                            style={{ 
                                transform: `scale(${zoomScale}) rotate(${zoomRotation}deg)`,
                                filter: isHighClarity ? 'contrast(1.7) brightness(0.9) grayscale(1)' : 'none',
                                imageRendering: zoomScale > 1 ? 'crisp-edges' : 'auto'
                            }}
                        >
                            <img 
                                src={viewReceiptModal} 
                                alt="Full Receipt" 
                                className="max-w-[85vw] md:max-w-4xl rounded-2xl md:rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] border-4 md:border-8 border-white/10 bg-white" 
                                style={{ imageRendering: zoomScale > 1 ? 'crisp-edges' : 'auto' }}
                                draggable={false}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
