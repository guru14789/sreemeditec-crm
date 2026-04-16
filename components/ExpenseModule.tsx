
import React, { useState, useRef } from 'react';
import { ExpenseRecord } from '../types';
import { Receipt, Plus, FileText, CheckCircle2, Clock, XCircle, Check, X, Image as ImageIcon, RefreshCw, Upload, AlertCircle, MessageSquare, Download, Camera } from 'lucide-react';
import { useData } from './DataContext';

interface ExpenseModuleProps {
    currentUser: string;
    userRole: 'Admin' | 'Employee';
}

export const ExpenseModule: React.FC<ExpenseModuleProps> = ({ currentUser, userRole }) => {
    const { expenses, addExpense, updateExpense, updateExpenseStatus, addNotification } = useData();
    const [showAddModal, setShowAddModal] = useState(false);
    const [viewReceiptModal, setViewReceiptModal] = useState<ExpenseRecord | null>(null);
    const [rejectionModal, setRejectionModal] = useState<string | null>(null); // Stores expense ID
    const [rejectionReason, setRejectionReason] = useState('');
    const [isCompressing, setIsCompressing] = useState(false);
    const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
    const [selectedExpenseForDetail, setSelectedExpenseForDetail] = useState<ExpenseRecord | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

    // Close menu when clicking outside
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (activeMenuId && !(event.target as Element).closest('.menu-container')) {
                setActiveMenuId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [activeMenuId]);

    const [newExpense, setNewExpense] = useState<Partial<ExpenseRecord>>({
        date: new Date().toISOString().split('T')[0],
        category: 'Travel',
        amount: 0,
        description: '',
        status: 'Pending'
    });

    const handleExportCSV = () => {
        if (visibleExpenses.length === 0) return;
        const headers = ["Date", "Personnel", "Category", "Description", "Value", "Status"];
        const rows = visibleExpenses.map(e => [
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
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) return reject('Could not get canvas context');

                    ctx.drawImage(img, 0, 0, width, height);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
                    resolve(dataUrl);
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
                alert("Failed to process image.");
            } finally {
                setIsCompressing(false);
            }
        }
    };

    const handleAddExpense = () => {
        if (!newExpense.amount || !newExpense.description) {
            alert("Please enter amount and description");
            return;
        }

        if (editingExpenseId) {
            const updates: Partial<ExpenseRecord> = {
                date: newExpense.date!,
                category: newExpense.category as any,
                amount: Number(newExpense.amount),
                description: newExpense.description!,
            };
            if (receiptPreview) {
                updates.receiptUrl = receiptPreview;
            }
            updateExpense(editingExpenseId, updates);
            addNotification('Voucher Updated', `Changes to voucher claim ₹${updates.amount} have been saved.`, 'info');
        } else {
            const record: ExpenseRecord = {
                id: `EXP-${Date.now()}`,
                employeeName: currentUser,
                date: newExpense.date!,
                category: newExpense.category as any,
                amount: Number(newExpense.amount),
                description: newExpense.description!,
                status: 'Pending'
            };
            if (receiptPreview) {
                record.receiptUrl = receiptPreview;
            }
            addExpense(record);
            addNotification('Voucher Submitted', `Your claim for ₹${record.amount} is now pending approval.`, 'info');
        }

        setShowAddModal(false);
        setEditingExpenseId(null);
        setNewExpense({ date: new Date().toISOString().split('T')[0], category: 'Travel', amount: 0, description: '', status: 'Pending' });
        setReceiptPreview(null);
    };

    const handleApprove = (id: string) => {
        updateExpenseStatus(id, 'Approved');
        addNotification('Voucher Approved', 'Expense claim has been cleared for payment.', 'success');
    };

    const handleOpenRejection = (id: string) => {
        setRejectionModal(id);
        setRejectionReason('');
    };

    const handleConfirmRejection = () => {
        if (!rejectionReason.trim()) {
            alert("A valid rejection reason is mandatory for auditing purposes.");
            return;
        }
        if (rejectionModal) {
            updateExpenseStatus(rejectionModal, 'Rejected', rejectionReason);
            setRejectionModal(null);
            addNotification('Voucher Rejected', 'A feedback loop has been initiated with the employee.', 'alert');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Approved': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'Rejected': return 'bg-rose-50 text-rose-700 border-rose-200';
            default: return 'bg-amber-50 text-amber-700 border-amber-200';
        }
    };

    // Filter expenses based on role
    const visibleExpenses = userRole === 'Admin'
        ? expenses
        : expenses.filter(e => e.employeeName === currentUser);

    // Stats Logic per Requirements

    return (
        <div className="h-full flex flex-col gap-6 overflow-y-auto lg:overflow-hidden p-2">

            {/* Main Content Area */}
            <div className="flex-1 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-300 dark:border-slate-800 flex flex-col overflow-hidden min-h-[500px]">
                <div className="p-5 border-b border-slate-300 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg"><Receipt size={24} /></div>
                        <div>
                            <h2 className="font-black text-lg text-slate-800 dark:text-white uppercase tracking-tight">Financial Vouchers</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{userRole === 'Admin' ? 'Enterprise Ledger' : 'My Reimbursement Log'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {userRole === 'Admin' && (
                            <button
                                onClick={handleExportCSV}
                                className="bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700 flex items-center gap-2 hover:bg-slate-50 transition-all active:scale-95 shadow-sm">
                                <Download size={16} /> Export
                            </button>
                        )}
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 flex items-center gap-2 hover:bg-emerald-700 transition-all active:scale-95">
                            <Plus size={18} /> Submit Claim
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto custom-scrollbar p-0">
                    <table className="w-full text-left text-[11px] text-slate-600">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-300 dark:border-slate-700 text-[8px] uppercase font-black tracking-[0.2em] text-slate-400 sticky top-0 z-10 backdrop-blur-md">
                            <tr>
                                <th className="px-6 py-4">Timestamp</th>
                                {userRole === 'Admin' && <th className="px-6 py-4">Personnel</th>}
                                <th className="px-6 py-4">Description</th>
                                <th className="px-6 py-4 text-right">Value (₹)</th>
                                <th className="px-6 py-4 text-center">Attachment</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {visibleExpenses.map(expense => (
                                <tr 
                                    key={expense.id} 
                                    onClick={() => setSelectedExpenseForDetail(expense)}
                                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer"
                                >
                                    <td className="px-6 py-4 font-bold text-slate-400 text-[10px] uppercase">{expense.date}</td>
                                    {userRole === 'Admin' && (
                                        <td className="px-6 py-4">
                                            <div 
                                                title={expense.employeeName}
                                                className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 flex items-center justify-center text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase shadow-inner cursor-help"
                                            >
                                                {expense.employeeName.charAt(0)}
                                            </div>
                                        </td>
                                    )}
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded-lg border border-indigo-100 dark:border-indigo-800">{expense.category}</span>
                                                <span className="font-black text-slate-800 dark:text-slate-200 text-[11px] uppercase truncate max-w-[200px]">{expense.description}</span>
                                            </div>
                                            {expense.status === 'Rejected' && expense.rejectionReason && (
                                                <div className="flex items-start gap-1 text-rose-500 bg-rose-50 dark:bg-rose-900/10 p-2 rounded-lg border border-rose-100 dark:border-rose-800/50 mt-1 max-w-[300px]">
                                                    <MessageSquare size={12} className="shrink-0 mt-0.5" />
                                                    <p className="text-[10px] font-bold leading-tight italic">Audit Feedback: {expense.rejectionReason}</p>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-black text-slate-900 dark:text-white text-sm tracking-tighter">₹{expense.amount.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-center">
                                        {expense.receiptUrl ? (
                                            <button
                                                onClick={() => setViewReceiptModal(expense)}
                                                className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-all shadow-sm" title="View Digital Receipt">
                                                <ImageIcon size={16} />
                                            </button>
                                        ) : (
                                            <span className="text-slate-200 dark:text-slate-700"><ImageIcon size={16} /></span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border ${getStatusColor(expense.status)}`}>
                                            {expense.status === 'Approved' && <CheckCircle2 size={12} />}
                                            {expense.status === 'Pending' && <Clock size={12} />}
                                            {expense.status === 'Rejected' && <XCircle size={12} />}
                                            {expense.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="relative flex justify-end menu-container">
                                            <button 
                                                onClick={(e) => { 
                                                    e.stopPropagation(); 
                                                    setActiveMenuId(activeMenuId === expense.id ? null : expense.id); 
                                                }} 
                                                className={`p-2 rounded-xl transition-all ${activeMenuId === expense.id ? 'bg-medical-50 text-medical-600' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
                                            >
                                                {expense.status === 'Pending' ? <AlertCircle size={16} className={activeMenuId === expense.id ? 'animate-pulse' : ''} /> : <div className="text-xl font-bold">⋮</div>}
                                            </button>
                                            
                                            {activeMenuId === expense.id && (
                                                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2">
                                                    <div className="p-2 space-y-1">
                                                        {expense.receiptUrl && (
                                                            <button onClick={() => { setViewReceiptModal(expense); setActiveMenuId(null); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors">
                                                                <ImageIcon size={14} className="text-indigo-500" /> View Receipt
                                                            </button>
                                                        )}
                                                        {userRole === 'Admin' && expense.status === 'Pending' && (
                                                            <>
                                                                <button onClick={() => { handleApprove(expense.id); setActiveMenuId(null); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-colors">
                                                                    <Check size={14} className="text-emerald-500" /> Approve
                                                                </button>
                                                                <button onClick={() => { handleOpenRejection(expense.id); setActiveMenuId(null); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-colors">
                                                                    <X size={14} className="text-rose-500" /> Reject
                                                                </button>
                                                            </>
                                                        )}
                                                        {expense.employeeName === currentUser && expense.status === 'Pending' && (
                                                            <button 
                                                                onClick={() => { 
                                                                    setEditingExpenseId(expense.id);
                                                                    setNewExpense({
                                                                        date: expense.date,
                                                                        category: expense.category,
                                                                        amount: expense.amount,
                                                                        description: expense.description,
                                                                        status: expense.status
                                                                    });
                                                                    setReceiptPreview(expense.receiptUrl || null);
                                                                    setShowAddModal(true);
                                                                    setActiveMenuId(null);
                                                                }} 
                                                                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-colors"
                                                            >
                                                                <FileText size={14} className="text-indigo-500" /> Edit Claim
                                                            </button>
                                                        )}
                                                        <button 
                                                            onClick={() => { setActiveMenuId(null); }}
                                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
                                                        >
                                                            <RefreshCw size={14} /> Refresh
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {visibleExpenses.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="py-20 text-center opacity-30">
                                        <div className="flex flex-col items-center">
                                            <FileText size={48} className="mb-4 text-slate-300" />
                                            <p className="text-xs font-black uppercase tracking-widest">No active vouchers found</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Voucher Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-lg flex flex-col scale-100 animate-in zoom-in-95 overflow-hidden">
                        <div className="p-8 border-b border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                            <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">{editingExpenseId ? 'Edit Reimbursement Voucher' : 'New Reimbursement Voucher'}</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{editingExpenseId ? 'Modify existing digital proof' : 'Submit digital expense proof'}</p>
                        </div>
                        <div className="p-8 space-y-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Voucher Date</label>
                                    <input type="date" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl px-5 py-3 text-sm font-bold outline-none focus:border-medical-500 dark:text-white"
                                        value={newExpense.date} onChange={e => setNewExpense({ ...newExpense, date: e.target.value })} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
                                    <select className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl px-5 py-3 text-sm font-black outline-none focus:border-medical-500 dark:text-white appearance-none"
                                        value={newExpense.category} onChange={e => setNewExpense({ ...newExpense, category: e.target.value as any })}>
                                        <option>Travel</option>
                                        <option>Food</option>
                                        <option>Lodging</option>
                                        <option>Supplies</option>
                                        <option>Other</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Claim Amount (₹)</label>
                                <input type="number" className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl px-5 py-4 text-2xl font-black outline-none focus:border-medical-500 text-emerald-600"
                                    placeholder="0.00" value={newExpense.amount || ''} onChange={e => setNewExpense({ ...newExpense, amount: Number(e.target.value) })} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description / Memo</label>
                                <textarea rows={3} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl px-5 py-3 text-sm font-bold outline-none focus:border-medical-500 dark:text-white resize-none"
                                    placeholder="Describe why this expense was incurred..." value={newExpense.description} onChange={e => setNewExpense({ ...newExpense, description: e.target.value })} />
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Voucher Proof</label>
                                {isCompressing ? (
                                    <div className="p-8 border-2 border-dashed border-emerald-500 bg-emerald-50/10 rounded-[2rem] flex flex-col items-center justify-center gap-3">
                                        <RefreshCw size={32} className="animate-spin text-emerald-500" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Processing Snapshot...</span>
                                    </div>
                                ) : receiptPreview ? (
                                    <div className="p-4 border-2 border-emerald-500 bg-emerald-50/20 rounded-[2rem] flex items-center justify-between group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-16 rounded-2xl bg-white border-2 border-emerald-100 overflow-hidden shadow-lg">
                                                <img src={receiptPreview} alt="Preview" className="w-full h-full object-cover" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-emerald-700 uppercase leading-none">Evidence Attached</p>
                                                <p className="text-[8px] font-bold text-emerald-600/60 uppercase mt-1 tracking-widest">Digital Snapshot Verified</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => setReceiptPreview(null)}
                                            className="p-3 bg-white text-rose-500 rounded-xl hover:bg-rose-50 transition-colors shadow-sm border border-rose-100"
                                            title="Remove Proof"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-4">
                                        <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-[2rem] hover:border-indigo-500 hover:bg-indigo-50/30 transition-all text-slate-400 group cursor-pointer">
                                            <input
                                                type="file"
                                                onChange={handleFileChange}
                                                accept="image/*"
                                                capture="environment"
                                                className="hidden"
                                            />
                                            <Camera size={32} className="mb-3 opacity-20 group-hover:opacity-100 group-hover:text-indigo-500 transition-all" />
                                            <span className="text-[10px] font-black uppercase tracking-widest group-hover:text-indigo-600">Take Photo</span>
                                            <p className="text-[8px] font-bold mt-1 opacity-40">Direct Camera</p>
                                        </label>
                                        <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-[2rem] hover:border-emerald-500 hover:bg-emerald-50/30 transition-all text-slate-400 group cursor-pointer">
                                            <input
                                                type="file"
                                                onChange={handleFileChange}
                                                accept="image/*"
                                                className="hidden"
                                            />
                                            <Upload size={32} className="mb-3 opacity-20 group-hover:opacity-100 group-hover:text-emerald-500 transition-all" />
                                            <span className="text-[10px] font-black uppercase tracking-widest group-hover:text-emerald-600">Choose File</span>
                                            <p className="text-[8px] font-bold mt-1 opacity-40">From Gallery</p>
                                        </label>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="p-8 border-t border-slate-300 dark:border-slate-800 flex gap-4 bg-slate-50/50 dark:bg-slate-800/50">
                            <button onClick={() => { setShowAddModal(false); setEditingExpenseId(null); setReceiptPreview(null); setNewExpense({ date: new Date().toISOString().split('T')[0], category: 'Travel', amount: 0, description: '', status: 'Pending' }); }} className="flex-1 bg-white dark:bg-slate-700 text-slate-400 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm">Cancel</button>
                            <button onClick={handleAddExpense} disabled={isCompressing} className="flex-[2] bg-medical-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-medical-500/30 active:scale-95 disabled:opacity-50">
                                {editingExpenseId ? 'Save Changes' : 'Authorize Submission'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Rejection Feedback Modal (Audit Mode) */}
            {rejectionModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-sm flex flex-col scale-100 animate-in zoom-in-95 overflow-hidden border border-rose-100 dark:border-rose-900">
                        <div className="p-8 text-center space-y-4">
                            <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 rounded-[1.5rem] flex items-center justify-center mx-auto text-rose-600 border border-rose-100 dark:border-rose-800">
                                <AlertCircle size={32} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight leading-none">Decline Voucher?</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Audit trail requires feedback reason</p>
                            </div>

                            <textarea
                                autoFocus
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl px-4 py-4 text-xs font-bold outline-none focus:border-rose-500 dark:text-white resize-none min-h-[100px]"
                                placeholder="Why is this voucher being rejected? (e.g. Missing invoice, Incorrect category...)"
                                value={rejectionReason}
                                onChange={e => setRejectionReason(e.target.value)}
                            />
                        </div>
                        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex gap-3 border-t border-slate-300 dark:border-slate-800">
                            <button onClick={() => setRejectionModal(null)} className="flex-1 py-3 text-[10px] font-black uppercase text-slate-400 bg-white dark:bg-slate-700 rounded-xl border border-slate-300 dark:border-slate-600">Abort</button>
                            <button
                                onClick={handleConfirmRejection}
                                className="flex-[2] py-3 text-[10px] font-black uppercase text-white bg-rose-600 rounded-xl shadow-lg shadow-rose-500/20 active:scale-95">
                                Confirm Rejection
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Receipt Preview (Overlay) */}
            {viewReceiptModal && (
                <div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/80 backdrop-blur-xl p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl w-full max-w-2xl flex flex-col scale-100 animate-in zoom-in-95 overflow-hidden">
                        <div className="p-6 border-b border-slate-300 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl"><ImageIcon size={18} /></div>
                                <h3 className="font-black text-sm text-slate-800 dark:text-white uppercase tracking-widest">Digital Evidence Proof</h3>
                            </div>
                            <button onClick={() => setViewReceiptModal(null)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-white dark:hover:bg-slate-700 rounded-full transition-all"><X size={24} /></button>
                        </div>
                        <div className="p-6 bg-slate-100 dark:bg-slate-950 flex items-center justify-center min-h-[400px] max-h-[70vh] overflow-y-auto custom-scrollbar">
                            {viewReceiptModal.receiptUrl ? (
                                <img src={viewReceiptModal.receiptUrl} alt="Voucher Attachment" className="max-w-full h-auto rounded-3xl shadow-2xl border-8 border-white dark:border-slate-800" />
                            ) : (
                                <div className="text-center text-slate-300">
                                    <ImageIcon size={80} className="mx-auto mb-4 opacity-10" />
                                    <p className="text-xs font-black uppercase tracking-widest opacity-40">Missing Attachment Buffer</p>
                                </div>
                            )}
                        </div>
                        <div className="p-8 border-t border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center">
                            <div className="flex gap-10">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Voucher Amount</p>
                                    <p className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter">₹{viewReceiptModal.amount.toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Submission</p>
                                    <p className="text-sm font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-tight">{viewReceiptModal.employeeName}</p>
                                </div>
                            </div>
                            <button onClick={() => setViewReceiptModal(null)} className="px-10 py-3 bg-slate-900 dark:bg-slate-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">Close Terminal</button>
                        </div>
                    </div>
                </div>
            )}
            {/* Detail View Modal */}
            {selectedExpenseForDetail && (
                <div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col scale-100 animate-in zoom-in-95 overflow-hidden border border-slate-200 dark:border-slate-800">
                        <div className="p-6 md:p-8 border-b border-slate-300 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 md:p-3 bg-indigo-600 text-white rounded-2xl shadow-lg ring-4 ring-indigo-500/10">
                                    <FileText size={20} className="md:w-6 md:h-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg md:text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight leading-none">Voucher Intelligence</h3>
                                    <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5">Claim ID: {selectedExpenseForDetail.id}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedExpenseForDetail(null)} className="text-slate-400 hover:text-rose-500 p-2 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-full transition-all bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-6 md:space-y-8 custom-scrollbar bg-white dark:bg-slate-900 text-[11px]">
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 pb-6 md:pb-8 border-b border-slate-100 dark:border-slate-800">
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Submitter</p>
                                    <p className="text-[12px] md:text-[13px] font-black text-slate-800 dark:text-white uppercase">{selectedExpenseForDetail.employeeName}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Timestamp</p>
                                    <p className="text-[12px] md:text-[13px] font-black text-slate-800 dark:text-white uppercase">{selectedExpenseForDetail.date}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Category</p>
                                    <span className="inline-block px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-800">{selectedExpenseForDetail.category}</span>
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Detailed Briefing</p>
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold leading-relaxed whitespace-pre-wrap">
                                    {selectedExpenseForDetail.description}
                                </div>
                            </div>

                            {selectedExpenseForDetail.receiptUrl && (
                                <div className="space-y-4">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Digital Snapshot Evidence</p>
                                    <div 
                                        onClick={() => setViewReceiptModal(selectedExpenseForDetail)}
                                        className="relative group cursor-zoom-in rounded-[1.5rem] md:rounded-[2rem] overflow-hidden border-4 border-white dark:border-slate-800 shadow-xl ring-1 ring-slate-200 dark:ring-slate-700"
                                    >
                                        <img src={selectedExpenseForDetail.receiptUrl} alt="Receipt" className="w-full h-auto object-cover max-h-[300px] md:max-h-[400px]" />
                                        <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/20 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100">
                                            <div className="bg-white text-indigo-600 px-6 py-3 rounded-2xl font-black uppercase tracking-widest shadow-2xl flex items-center gap-2">
                                                <ImageIcon size={16} /> Magnify Evidence
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {selectedExpenseForDetail.status === 'Rejected' && selectedExpenseForDetail.rejectionReason && (
                                <div className="bg-rose-50 dark:bg-rose-900/20 p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-rose-100 dark:border-rose-900/50 space-y-3">
                                    <div className="flex items-center gap-3 text-rose-600">
                                        <AlertCircle size={18} />
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em]">Audit Objection Reason</p>
                                    </div>
                                    <p className="text-xs font-bold text-rose-700 dark:text-rose-400 italic">"{selectedExpenseForDetail.rejectionReason}"</p>
                                </div>
                            )}
                        </div>

                        <div className="p-6 md:p-8 border-t border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row justify-between items-center gap-6 shrink-0">
                            <div className="flex items-center gap-6 w-full sm:w-auto">
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Voucher Status</p>
                                    <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border ${getStatusColor(selectedExpenseForDetail.status)}`}>
                                        {selectedExpenseForDetail.status === 'Approved' ? <CheckCircle2 size={14} /> : selectedExpenseForDetail.status === 'Rejected' ? <XCircle size={14} /> : <Clock size={14} />}
                                        {selectedExpenseForDetail.status}
                                    </span>
                                </div>
                                <div className="text-right sm:text-left ml-auto sm:ml-0">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Settlement Value</p>
                                    <p className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">₹{selectedExpenseForDetail.amount.toLocaleString()}</p>
                                </div>
                            </div>
                            <div className="flex gap-3 w-full sm:w-auto">
                                {userRole === 'Admin' && selectedExpenseForDetail.status === 'Pending' && (
                                    <>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleApprove(selectedExpenseForDetail.id); setSelectedExpenseForDetail(null); }}
                                            className="flex-1 sm:flex-none px-6 md:px-8 py-3.5 md:py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-600/20 active:scale-95 transition-all"
                                        >
                                            Approve
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleOpenRejection(selectedExpenseForDetail.id); setSelectedExpenseForDetail(null); }}
                                            className="flex-1 sm:flex-none px-6 md:px-8 py-3.5 md:py-4 bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-rose-600/20 active:scale-95 transition-all"
                                        >
                                            Reject
                                        </button>
                                    </>
                                )}
                                <button onClick={() => setSelectedExpenseForDetail(null)} className="flex-1 sm:flex-none px-6 md:px-8 py-3.5 md:py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700 active:scale-95 transition-all">Dismiss</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
