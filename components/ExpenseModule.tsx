import React, { useState, useRef, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ExpenseRecord } from '../types';
import { 
    Receipt, Plus, FileText, CheckCircle2, Clock, XCircle, 
    Check, X, Image as ImageIcon, RefreshCw, Upload, 
    AlertCircle, MessageSquare, Download, Camera, List, 
    ArrowUpRight, Trash2, Edit2, Activity, DollarSign, 
    Search, User, ChevronRight, PieChart, Info, RotateCw, Sparkles, Minus, TrendingUp, ChevronDown
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
        expenses, addExpense, updateExpense, removeExpense, updateExpenseStatus, 
        addNotification, fetchMoreData, ledgers, addLedger, postToLedger,
        employees = [], attendanceRecords = []
    } = useData();

    const [selectedEmployeeName, setSelectedEmployeeName] = useState(userRole === 'Admin' ? 'ALL' : currentUser);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    // Sync selectedEmployeeName if currentUser prop changes
    useEffect(() => {
        if (currentUser) {
            setSelectedEmployeeName(userRole === 'Admin' ? 'ALL' : currentUser);
        }
    }, [currentUser, userRole]);

    // Find the target employee for allowance tracking
    const targetEmployee = useMemo(() => {
        return employees.find(e => e.name.toLowerCase() === selectedEmployeeName.toLowerCase());
    }, [employees, selectedEmployeeName]);

    // Calculate allowance balances dynamically based on attendance and claims
    const allowanceBalances = useMemo(() => {
        const currentYear = selectedYear;
        const currentMonth = selectedMonth;
        const currentYearMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

        const calculateForEmployee = (emp: any) => {
            const empRecords = attendanceRecords.filter(r => r.userId === emp.id && r.date.startsWith(currentYearMonth));
            let eligiblePresentDays = 0;
            let eligibleOutstationDays = 0;
            
            for (let i = 1; i <= daysInMonth; i++) {
                const dateStr = `${currentYearMonth}-${String(i).padStart(2, '0')}`;
                const dateObj = new Date(currentYear, currentMonth, i);
                const isSunday = dateObj.getDay() === 0;
                const record = empRecords.find(r => r.date === dateStr);
                
                if (record && record.status !== 'OnLeave') {
                    if (record.workMode === 'Outstation') {
                        eligibleOutstationDays++;
                    } else if (!isSunday) {
                        eligiblePresentDays++;
                    }
                }
            }

            const dailyRate = emp.dailyAllowance || 0;
            const outstationRate = emp.outstationAllowance || 0;
            const totalDailyAllowance = eligiblePresentDays * dailyRate;
            const totalOutstationAllowance = eligibleOutstationDays * outstationRate;

            const employeeExpenses = expenses.filter(e => 
                e.employeeName.toLowerCase() === emp.name.toLowerCase() && 
                e.status !== 'Rejected' &&
                e.category !== 'Company' &&
                e.date.startsWith(currentYearMonth)
            );

            const claimedDaily = employeeExpenses.filter(e => e.category === 'Daily Allowance').reduce((sum, curr) => sum + (curr.amount || 0), 0);
            const claimedOutstation = employeeExpenses.filter(e => e.category === 'Outstation Allowance').reduce((sum, curr) => sum + (curr.amount || 0), 0);

            const dailyAvailable = Math.max(0, totalDailyAllowance - claimedDaily);
            const outstationAvailable = Math.max(0, totalOutstationAllowance - claimedOutstation);
            
            return {
                dailyAvailable, outstationAvailable, totalClaimable: dailyAvailable + outstationAvailable,
                eligiblePresentDays, eligibleOutstationDays, totalDailyAllowance, totalOutstationAllowance,
                claimedDaily, claimedOutstation
            };
        };

        if (selectedEmployeeName === 'ALL') {
            return employees.reduce((acc, emp) => {
                const empBal = calculateForEmployee(emp);
                return {
                    dailyAvailable: acc.dailyAvailable + empBal.dailyAvailable,
                    outstationAvailable: acc.outstationAvailable + empBal.outstationAvailable,
                    totalClaimable: acc.totalClaimable + empBal.totalClaimable,
                    eligiblePresentDays: acc.eligiblePresentDays + empBal.eligiblePresentDays,
                    eligibleOutstationDays: acc.eligibleOutstationDays + empBal.eligibleOutstationDays,
                    totalDailyAllowance: acc.totalDailyAllowance + empBal.totalDailyAllowance,
                    totalOutstationAllowance: acc.totalOutstationAllowance + empBal.totalOutstationAllowance,
                    claimedDaily: acc.claimedDaily + empBal.claimedDaily,
                    claimedOutstation: acc.claimedOutstation + empBal.claimedOutstation
                };
            }, {
                dailyAvailable: 0, outstationAvailable: 0, totalClaimable: 0,
                eligiblePresentDays: 0, eligibleOutstationDays: 0, totalDailyAllowance: 0,
                totalOutstationAllowance: 0, claimedDaily: 0, claimedOutstation: 0
            });
        }

        if (!targetEmployee) {
            return { dailyAvailable: 0, outstationAvailable: 0, totalClaimable: 0, eligiblePresentDays: 0, eligibleOutstationDays: 0, totalDailyAllowance: 0, totalOutstationAllowance: 0, claimedDaily: 0, claimedOutstation: 0 };
        }

        return calculateForEmployee(targetEmployee);
    }, [targetEmployee, employees, attendanceRecords, expenses, selectedEmployeeName, selectedMonth, selectedYear]);

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
    const [deleteModalId, setDeleteModalId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showSubmitSuccess, setShowSubmitSuccess] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [activePicker, setActivePicker] = useState<'month' | 'year' | 'employee' | null>(null);

    const DEFAULT_EXPENSE: Partial<ExpenseRecord> = {
        date: new Date().toISOString().split('T')[0],
        category: 'Daily Allowance',
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

        setIsSaving(true);
        try {
            if (builderMode === 'add') {
                const record: ExpenseRecord = {
                    ...expense as ExpenseRecord,
                    id: `EXP-${Date.now()}`,
                    employeeName: expense.employeeName || selectedEmployeeName || currentUser,
                    receiptUrl: receiptPreview || undefined,
                    status: 'Pending'
                };
                await addExpense(record);
                setShowSubmitSuccess(true);
                // Modal remains visible until explicitly confirmed by user
            } else {
                const updates: Partial<ExpenseRecord> = {
                    ...expense,
                    receiptUrl: receiptPreview || expense.receiptUrl
                };
                await updateExpense(expense.id!, updates);
                addNotification('Voucher Updated', `Changes saved.`, 'info');
                setViewState('stock'); // Navigate back to console after edit
            }
            
            if (builderMode === 'add') {
                // Keep view as builder if they want to submit another, 
                // but reset the form. Actually reset happens in handleAnother.
            } else {
                setExpense(DEFAULT_EXPENSE);
                setReceiptPreview(null);
            }
        } catch (err: any) {
            setSubmitError(err.message || 'Voucher submission failed. Please try again.');
        } finally {
            setIsSaving(false);
        }
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

    const handleDelete = async () => {
        if (!deleteModalId) return;
        setIsDeleting(true);
        try {
            await removeExpense(deleteModalId, currentUser);
            addNotification('Expense Deleted', 'Voucher permanently removed from registry.', 'success');
            setDeleteModalId(null);
            if (selectedExpense?.id === deleteModalId) setSelectedExpense(null);
        } catch (err: any) {
            addNotification('Delete Failed', err.message || 'Operation failed', 'alert');
        } finally {
            setIsDeleting(false);
        }
    };


    const expenseStats = useMemo(() => {
        let approved = 0, pending = 0, rejected = 0;
        const base = userRole === 'Admin' ? expenses : expenses.filter(e => e.employeeName === currentUser);
        base.forEach(e => {
            if (e.status === 'Approved') approved += e.amount || 0;
            else if (e.status === 'Pending') pending += e.amount || 0;
            else if (e.status === 'Rejected') rejected += e.amount || 0;
        });
        return { approved, pending, rejected };
    }, [expenses, userRole, currentUser]);

    const formatShortCurrency = (val: number) => {
        if (val >= 10000000) return `${(val / 10000000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}Cr`;
        if (val >= 100000) return `${(val / 100000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}L`;
        if (val >= 1000) return `${(val / 1000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}K`;
        return `${val.toLocaleString('en-IN')}`;
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
        <div className="h-full flex flex-col gap-2 md:gap-4 overflow-hidden p-0 md:p-2">
            {/* Header Toolbar */}
            <div className="bg-gradient-to-br from-emerald-950 to-green-900 p-4 md:p-5 flex flex-col gap-4 shadow-[0_20px_40px_-10px_rgba(6,78,59,0.55),_inset_0_2px_3px_rgba(255,255,255,0.1)] shrink-0 relative z-10 m-0 md:m-3 lg:m-4 rounded-none md:rounded-[2rem]">
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none rounded-none md:rounded-[2rem]"></div>
                
                {/* Top Row: Title & Stats */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10 w-full">
                    <div className="hidden lg:flex items-center gap-4 group">
                        <div className="w-10 h-10 xl:w-12 xl:h-12 flex items-center justify-center text-[#c5a059] drop-shadow-md transition-transform group-hover:scale-110 shrink-0">
                            <Receipt size={20} className="hidden xl:block" />
                            <Receipt size={16} className="xl:hidden" />
                        </div>
                        <div className="flex flex-col">
                            <h2 className="text-lg xl:text-xl font-playfair font-bold tracking-tight text-white uppercase leading-none whitespace-nowrap">Vouchers & Expenses</h2>
                            <p className="text-emerald-100/80 text-[11px] md:text-xs font-semibold leading-relaxed">Post Double-Entry Vouchers</p>
                        </div>
                    </div>

                    <div className="hidden sm:flex items-center gap-4 bg-gradient-to-r from-[#c5a059] to-[#e5c185] border border-[#d4af37]/40 shadow-[0_10px_20px_-5px_rgba(212,175,55,0.4)] rounded-[1.5rem] px-5 py-2 w-full sm:w-auto shrink-0">
                        <div className="p-1.5 bg-amber-950/10 text-amber-950 rounded-full shadow-inner shrink-0">
                            <Clock size={16} />
                        </div>
                        <div className="flex flex-col truncate">
                            <p className="text-[8px] font-black text-amber-950/70 uppercase tracking-widest leading-none mb-1 truncate">Pending Value</p>
                            <p className="text-lg font-playfair font-bold tracking-tight text-amber-950 leading-none tabular-nums">
                                ₹{formatShortCurrency(expenseStats.pending)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Bottom Row: Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10 w-full">
                    <div className="bg-emerald-900/40 p-1.5 rounded-[2.5rem] border border-emerald-700/50 shadow-inner w-full sm:w-fit shrink-0 flex gap-1">
                        <button onClick={() => setViewState('stock')} className={`flex-1 sm:flex-none px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-[2rem] transition-all flex items-center justify-center gap-2 ${viewState === 'stock' ? 'bg-emerald-600 text-white shadow-[0_10px_20px_-5px_rgba(5,150,105,0.5)] scale-100' : 'text-emerald-100 hover:text-white hover:bg-emerald-800/50 scale-95'}`}>
                            <List size={12} /> Console
                        </button>
                        <button onClick={() => { setViewState('builder'); setBuilderMode('add'); setExpense({ ...DEFAULT_EXPENSE, employeeName: selectedEmployeeName }); setReceiptPreview(null); }} className={`flex-1 sm:flex-none px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-[2rem] transition-all flex items-center justify-center gap-2 ${viewState === 'builder' && builderMode === 'add' ? 'bg-emerald-600 text-white shadow-[0_10px_20px_-5px_rgba(5,150,105,0.5)] scale-100' : 'text-emerald-100 hover:text-white hover:bg-emerald-800/50 scale-95'}`}>
                            <Plus size={12} /> Claim
                        </button>
                    </div>
                </div>
            </div>
                       {/* Vouchers/Expenses Header Snapshot */}
            <div className="space-y-3 mb-2 w-full px-2 md:px-0">
                <div className="flex md:grid md:grid-cols-3 gap-3 md:gap-4 w-full overflow-x-auto custom-scrollbar pb-2 snap-x snap-mandatory">
                    {/* Card 1: Approved */}
                    <div className="bg-gradient-to-br from-emerald-950 to-green-900 p-3 md:p-4 rounded-[20px] md:rounded-[28px] shadow-[0_20px_40px_-10px_rgba(6,78,59,0.5)] flex flex-col justify-between group hover:scale-[1.02] hover:shadow-[0_25px_45px_-5px_rgba(6,78,59,0.6)] transition-all duration-300 min-h-[90px] md:min-h-[120px] min-w-[70vw] sm:min-w-[300px] md:min-w-0 snap-center shrink-0">
                        <div className="flex justify-between items-start mb-1 md:mb-2">
                            <div className="w-8 h-8 md:w-9 md:h-9 flex items-center justify-center group-hover:scale-110 transition-transform text-[#c5a059] drop-shadow-md">
                                <CheckCircle2 size={15} />
                            </div>
                            <span className="flex items-center gap-1 text-[7px] font-black bg-emerald-400/20 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                <Activity size={8} /> Cleared
                            </span>
                        </div>
                        <div>
                            <p className="text-[7.5px] md:text-[8px] font-extrabold text-emerald-300/80 uppercase tracking-widest leading-none">Approved Vouchers</p>
                            <h3 className="text-base md:text-lg font-bold tracking-tight text-white mt-1">₹{formatShortCurrency(expenseStats.approved)}</h3>
                        </div>
                    </div>

                    {/* Card 2: Pending */}
                    <div className="bg-gradient-to-br from-emerald-800 to-emerald-600 p-3 md:p-4 rounded-[20px] md:rounded-[28px] shadow-[0_20px_40px_-10px_rgba(16,185,129,0.4)] flex flex-col justify-between group hover:scale-[1.02] hover:shadow-[0_25px_45px_-5px_rgba(16,185,129,0.5)] transition-all duration-300 min-h-[90px] md:min-h-[120px] min-w-[70vw] sm:min-w-[300px] md:min-w-0 snap-center shrink-0">
                        <div className="flex justify-between items-start mb-1 md:mb-2">
                            <div className="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center bg-emerald-700/60 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5),_0_1px_2px_rgba(255,255,255,0.1)] text-emerald-100 group-hover:scale-110 transition-transform">
                                <Clock size={15} />
                            </div>
                            <span className="flex items-center gap-1 text-[7px] font-black bg-emerald-300/20 text-emerald-100 border border-emerald-400/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                <TrendingUp size={8} /> Awaiting
                            </span>
                        </div>
                        <div>
                            <p className="text-[7.5px] md:text-[8px] font-extrabold text-emerald-100/80 uppercase tracking-widest leading-none">Pending Vouchers</p>
                            <h3 className="text-base md:text-lg font-bold tracking-tight text-white mt-1">₹{formatShortCurrency(expenseStats.pending)}</h3>
                        </div>
                    </div>

                    {/* Card 3: Rejected */}
                    <div className="p-3 md:p-4 rounded-[20px] md:rounded-[28px] shadow-[0_20px_40px_-10px_rgba(197,160,89,0.5)] flex flex-col justify-between group hover:scale-[1.02] hover:shadow-[0_25px_45px_-5px_rgba(197,160,89,0.6)] transition-all duration-300 min-h-[90px] md:min-h-[120px] min-w-[70vw] sm:min-w-[300px] md:min-w-0 snap-center shrink-0" style={{ background: 'linear-gradient(135deg, #c5a059 0%, #e5c185 100%)' }}>
                        <div className="flex justify-between items-start mb-1 md:mb-2">
                            <div className="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center bg-amber-900/40 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3),_0_1px_2px_rgba(255,255,255,0.2)] text-amber-950 group-hover:scale-110 transition-transform">
                                <XCircle size={15} />
                            </div>
                            <span className="flex items-center gap-1 text-[7px] font-black bg-amber-950/25 text-amber-950 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                <AlertCircle size={8} /> Declined
                            </span>
                        </div>
                        <div>
                            <p className="text-[7.5px] md:text-[8px] font-extrabold text-amber-950/80 uppercase tracking-widest leading-none">Rejected Vouchers</p>
                            <h3 className="text-base md:text-lg font-bold tracking-tight text-amber-950 mt-1">₹{formatShortCurrency(expenseStats.rejected)}</h3>
                        </div>
                    </div>
                </div>
            </div>


            {viewState === 'stock' ? (
                <div className="flex-1 flex flex-col lg:flex-row gap-2 md:gap-4 min-h-0">
                    <div className="flex-1 bg-white rounded-[2rem] md:rounded-[2.5rem] border border-slate-300 shadow-sm overflow-hidden flex flex-col animate-in fade-in">
                        <div className="p-3 md:p-5 border-b border-slate-300 bg-slate-50/30 flex flex-col sm:flex-row justify-between items-center shrink-0 gap-3 md:gap-4">
                            <div className="hidden md:flex items-center gap-2 md:gap-3">
                                <div className="w-8 h-8 md:w-10 md:h-10 bg-emerald-100 rounded-[2rem] md:rounded-[2rem] flex items-center justify-center text-emerald-600 shadow-inner border border-emerald-50"><Receipt size={16} /></div>
                                <div><h3 className="font-black text-slate-800 uppercase tracking-tight text-xs md:text-base">Vouchers</h3><p className="text-[8px] md:text-[10px] text-slate-400 font-black uppercase tracking-widest">{filteredExpenses.length} Records</p></div>
                                
                                <div className="hidden sm:flex bg-slate-100 p-1 md:p-1.5 rounded-[2.5rem] border border-slate-200 shadow-inner w-fit shrink-0 gap-1 ml-4 md:ml-6">
                                    <button onClick={() => setViewState('stock')} className={`px-4 md:px-6 py-1.5 md:py-2 text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-[2rem] transition-all flex items-center gap-1.5 md:gap-2 ${viewState === 'stock'  ? 'bg-emerald-900 text-white shadow-[0_10px_20px_-5px_rgba(6,78,59,0.5)] scale-100' : 'text-slate-400 hover:text-emerald-700 scale-95'}`}><List size={12} className="md:w-3.5 md:h-3.5" /> Console</button>
                                    <button onClick={() => { setViewState('builder'); setBuilderMode('add'); setExpense({ ...DEFAULT_EXPENSE, employeeName: selectedEmployeeName }); setReceiptPreview(null); }} className={`px-4 md:px-6 py-1.5 md:py-2 text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-[2rem] transition-all flex items-center gap-1.5 md:gap-2 ${viewState === 'builder' && builderMode === 'add'  ? 'bg-emerald-900 text-white shadow-[0_10px_20px_-5px_rgba(6,78,59,0.5)] scale-100' : 'text-slate-400 hover:text-emerald-700 scale-95'}`}><Plus size={12} className="md:w-3.5 md:h-3.5" /> Claim</button>
                                </div>
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto">
                                <div className="relative flex-1 sm:w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} /><input type="text" placeholder="Filter..." className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-[2rem] md:rounded-[2rem] text-[10px] font-bold outline-none focus:border-medical-500 transition-all shadow-inner uppercase" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
                                {userRole === 'Admin' && <button onClick={handleExportCSV} className="p-2 bg-white border border-slate-300 rounded-[2rem] text-slate-400 hover:text-emerald-700 scale-95 transition-all shadow-sm"><Download size={16}/></button>}
                            </div>
                        </div>

                        {/* Allowance Balances Summary Bar */}
                        <div className="bg-slate-50/50 border-b border-slate-300 px-4 py-2.5 flex flex-col lg:flex-row lg:flex-wrap items-start lg:items-center justify-between gap-3 shrink-0">
                            <div className="flex flex-col md:flex-row items-start md:items-center gap-2 w-full lg:w-auto">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest shrink-0">Allowance Focus:</span>
                                <div className="grid grid-cols-2 md:flex gap-2 w-full md:w-auto">
                                    <div 
                                        onClick={() => setActivePicker('month')}
                                        className="relative w-full md:w-auto bg-white border border-emerald-500/50 rounded-[1.5rem] pl-4 pr-10 py-3 md:py-1.5 text-[12px] md:text-[10px] font-black uppercase transition-all cursor-pointer text-emerald-700 shadow-sm flex items-center justify-between min-w-[80px]"
                                    >
                                        <span>{['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][selectedMonth]}</span>
                                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none" />
                                    </div>
                                    <div 
                                        onClick={() => setActivePicker('year')}
                                        className="relative w-full md:w-auto bg-white border border-slate-300 rounded-[1.5rem] pl-4 pr-10 py-3 md:py-1.5 text-[12px] md:text-[10px] font-black uppercase transition-all cursor-pointer text-slate-700 shadow-sm flex items-center justify-between min-w-[80px]"
                                    >
                                        <span>{selectedYear}</span>
                                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>
                                    {userRole === 'Admin' ? (
                                        <div 
                                            onClick={() => setActivePicker('employee')}
                                            className="relative w-full col-span-2 md:col-span-1 md:w-auto mt-1 md:mt-0 bg-white border border-slate-300 rounded-[1.5rem] pl-4 pr-10 py-3 md:py-1.5 text-[12px] md:text-[10px] font-black uppercase transition-all cursor-pointer text-slate-700 shadow-sm flex items-center justify-between min-w-[150px]"
                                        >
                                            <span className="truncate">
                                                {selectedEmployeeName === 'ALL' ? 'All Employees' : selectedEmployeeName}
                                            </span>
                                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                        </div>
                                    ) : (
                                        <span className="text-[10px] font-black text-slate-700 uppercase tracking-tight col-span-2 md:col-span-1 md:ml-2 self-center">{currentUser}</span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 md:gap-4 flex-wrap">
                                <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-sm">
                                    <Clock size={10} className="text-indigo-500" />
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Daily:</span>
                                    <span className="text-[10px] font-black text-slate-800">₹{allowanceBalances.dailyAvailable.toLocaleString('en-IN')}</span>
                                    <span className="text-[7.5px] text-slate-400 font-bold uppercase bg-slate-100 px-1 py-0.25 rounded-md">{allowanceBalances.eligiblePresentDays}d</span>
                                </div>
                                <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-sm">
                                    <ArrowUpRight size={10} className="text-emerald-500" />
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Outstation:</span>
                                    <span className="text-[10px] font-black text-slate-800">₹{allowanceBalances.outstationAvailable.toLocaleString('en-IN')}</span>
                                    <span className="text-[7.5px] text-slate-400 font-bold uppercase bg-slate-100 px-1 py-0.25 rounded-md">{allowanceBalances.eligibleOutstationDays}d</span>
                                </div>
                                <div className="flex items-center gap-1.5 bg-slate-900 text-white px-2.5 py-1 rounded-lg shadow-sm">
                                    <Sparkles size={10} className="text-amber-400 animate-pulse" />
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Claimable:</span>
                                    <span className="text-[10px] font-black text-emerald-400">₹{allowanceBalances.totalClaimable.toLocaleString('en-IN')}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto custom-scrollbar md:p-0 p-2">
                            <table className="w-full text-left text-[11px] block md:table">
                                <thead className="bg-slate-50 sticky top-0 z-10 font-black uppercase text-[8px] md:text-[9px] text-slate-500 border-b tracking-widest shadow-[0_1px_0_0_#f1f5f9] hidden md:table-header-group">
                                    <tr>
                                        <th className="px-3 md:px-6 py-2 md:py-3 text-left">Entry</th>
                                        {userRole === 'Admin' && <th className="px-3 md:px-6 py-2 md:py-3 text-left hidden sm:table-cell">Personnel</th>}
                                        <th className="px-3 md:px-6 py-2 md:py-3 text-left">Info</th>
                                        <th className="px-3 md:px-6 py-2 md:py-3 text-center">Value</th>
                                        <th className="px-3 md:px-6 py-2 md:py-3 text-center">Status</th>
                                        <th className="px-3 md:px-6 py-2 md:py-3 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 block md:table-row-group">
                                    {filteredExpenses.map(e => (
                                        <tr key={e.id} className={`block md:table-row hover:bg-slate-50/80 transition-colors group cursor-pointer border md:border-b border-slate-200 md:border-slate-50 rounded-2xl md:rounded-none mb-3 md:mb-0 p-3 md:p-0 bg-white ${selectedExpense?.id === e.id ? 'bg-medical-50/40 ring-1 ring-medical-500/30' : ''}`} onClick={() => { setSelectedExpense(e); if (window.innerWidth < 1024) { setTimeout(() => document.getElementById('expense-detail-view')?.scrollIntoView({ behavior: 'smooth' }), 100); } }}>
                                            
                                            <td className="block md:table-cell px-2 py-1 md:px-6 md:py-3 align-middle border-b md:border-none border-slate-50 md:border-0 pb-2 md:pb-3 flex justify-between items-center md:items-start md:flex-col">
                                                <div className="font-black text-slate-400 uppercase text-[9px] tracking-widest">{e.date}</div>
                                                <div className="text-[8px] font-bold text-slate-300 uppercase md:mt-0.5">#{e.id.slice(-6)}</div>
                                            </td>
                                            
                                            {userRole === 'Admin' && <td className="block md:table-cell px-2 py-1.5 md:px-6 md:py-3 align-middle border-b md:border-none border-slate-50"><div className="flex items-center gap-2"><div className="w-5 h-5 md:w-6 md:h-6 bg-slate-100 rounded-lg flex items-center justify-center font-black text-slate-500 border border-slate-200 text-[9px] md:text-[10px]">{e.employeeName.charAt(0)}</div><span className="font-black text-slate-700 uppercase tracking-tighter truncate max-w-[120px] md:max-w-[80px] text-[10px] md:text-auto">{e.employeeName}</span></div></td>}
                                            
                                            <td className="block md:table-cell px-2 py-2 md:px-6 md:py-3 align-middle">
                                                <div className="flex flex-col gap-1.5 md:gap-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border uppercase shrink-0 ${e.category === 'Company' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-indigo-600 bg-indigo-50 border-indigo-100'}`}>{e.category}</span>
                                                        <span className="font-bold text-slate-700 uppercase truncate max-w-[200px] md:max-w-[250px]">{e.description}</span>
                                                        {e.category === 'Company' && <span className="text-[7.5px] font-black text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 uppercase tracking-tighter hidden md:inline-block">Not Deducted</span>}
                                                    </div>
                                                    {e.receiptUrl && <button onClick={(ev) => { ev.stopPropagation(); setViewReceiptModal(e.receiptUrl!); setZoomScale(1); setZoomRotation(0); setIsHighClarity(false); }} className="flex w-fit items-center gap-1 text-[8px] font-black text-medical-600 uppercase tracking-widest hover:text-medical-800 transition-colors bg-medical-50 md:bg-transparent px-2 py-1 md:px-0 md:py-0 rounded"><ImageIcon size={10} className="md:w-[8px] md:h-[8px]"/> Proof Available</button>}
                                                </div>
                                            </td>
                                            
                                            <td className="block md:table-cell px-2 py-1.5 md:px-6 md:py-3 text-left md:text-center align-middle border-t md:border-none border-slate-50 mt-2 md:mt-0 pt-2 md:pt-3">
                                                <div className="flex items-center justify-between md:justify-center w-full">
                                                    <span className="md:hidden text-[8px] font-black uppercase text-slate-400">Value</span>
                                                    <div className="inline-block font-black text-[12px] md:text-[13px] text-slate-800 tracking-tighter min-w-[60px]">₹{e.amount.toLocaleString('en-IN')}</div>
                                                </div>
                                            </td>
                                            
                                            <td className="block md:table-cell px-2 py-1.5 md:px-6 md:py-3 text-left md:text-center align-middle border-b md:border-none border-slate-50 pb-2 md:pb-3">
                                                <div className="flex items-center justify-between md:justify-center w-full">
                                                    <span className="md:hidden text-[8px] font-black uppercase text-slate-400">Status</span>
                                                    <span className={`w-auto px-3 md:w-20 inline-flex items-center justify-center text-[8px] font-black uppercase tracking-widest py-1 rounded-md border ${getStatusStyle(e.status)}`}>{e.status}</span>
                                                </div>
                                            </td>
                                            
                                            <td className="block md:table-cell px-2 py-2 md:px-6 md:py-3 text-center align-middle">
                                                <div className="flex justify-end md:justify-center w-full">
                                                    {e.status === 'Pending' && (userRole === 'Admin' || e.employeeName === currentUser) ? (
                                                        <button 
                                                            onClick={(ev) => { ev.stopPropagation(); setDeleteModalId(e.id); }}
                                                            className="w-8 h-8 flex items-center justify-center text-rose-500 bg-rose-50 border border-rose-100 rounded-[2rem] transition-all hover:bg-rose-100 hover:scale-110 shadow-sm active:scale-95"
                                                            title="Delete Pending Expense"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>

                                                    ) : (
                                                        <div className="w-8 h-8 flex items-center justify-center opacity-10 grayscale">
                                                            <Trash2 size={14} className="text-slate-300" />
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredExpenses.length === 0 && (
                                        <tr><td colSpan={userRole === 'Admin' ? 6 : 5} className="py-20 md:py-40 text-center text-slate-300 font-black uppercase tracking-[0.5em] opacity-30 italic">Registry Vacuum</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {selectedExpense && (
                        <div id="expense-detail-view" className="w-full lg:w-[380px] bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-2xl border border-slate-300 flex flex-col shrink-0 overflow-hidden animate-in slide-in-from-right-4 scroll-mt-24">
                            <div className="p-5 md:p-6 border-b border-slate-300 bg-slate-50/50 relative">
                                <button onClick={() => setSelectedExpense(null)} className="absolute top-4 right-4 p-2 text-slate-300 hover:text-slate-500 transition-colors"><X size={20}/></button>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-600 rounded-[2rem] md:rounded-[2rem] flex items-center justify-center text-white text-lg md:text-xl font-playfair font-bold tracking-tight shadow-xl shadow-indigo-500/20"><Activity size={20} /></div>
                                    <div><h3 className="text-lg md:text-xl font-playfair font-bold tracking-tight text-slate-800 uppercase tracking-tight leading-tight">Voucher Logic</h3><p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Audit ID: {selectedExpense.id.slice(-8)}</p></div>
                                </div>
                                <div className={`p-3 rounded-[2rem] md:rounded-[2rem] border flex items-center justify-between ${getStatusStyle(selectedExpense.status)}`}>
                                    <div className="flex items-center gap-2 md:gap-3">{selectedExpense.status === 'Approved' ? <CheckCircle2 size={14}/> : selectedExpense.status === 'Rejected' ? <XCircle size={14}/> : <Clock size={14}/>}<span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">Settlement: {selectedExpense.status}</span></div>
                                    <ChevronRight size={14}/>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-4 md:space-y-5 custom-scrollbar">
                                <section className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    <div className="p-4 bg-gradient-to-br from-emerald-950 to-green-900 rounded-[2rem] shadow-[0_20px_40px_-10px_rgba(6,78,59,0.5)] group hover:scale-[1.02] hover:shadow-[0_25px_45px_-5px_rgba(6,78,59,0.6)] transition-all duration-300">
                                        <p className="text-[9px] font-black text-emerald-100/80 uppercase tracking-widest mb-1">Voucher Date</p>
                                        <p className="text-sm font-black text-white">{selectedExpense.date}</p>
                                    </div>
                                    <div className="p-4 bg-gradient-to-br from-slate-800 to-slate-700 rounded-[2rem] shadow-[0_20px_40px_-10px_rgba(30,41,59,0.4)] group hover:scale-[1.02] hover:shadow-[0_25px_45px_-5px_rgba(30,41,59,0.5)] transition-all duration-300 overflow-hidden">
                                        <p className="text-[9px] font-black text-slate-300/80 uppercase tracking-widest mb-1">Submitted On</p>
                                        <p className="text-xs font-black text-white uppercase truncate">
                                            {selectedExpense.id.includes('-') && !isNaN(parseInt(selectedExpense.id.split('-')[1])) 
                                                ? new Date(parseInt(selectedExpense.id.split('-')[1])).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) 
                                                : 'N/A'}
                                        </p>
                                    </div>
                                    <div className="p-4 bg-gradient-to-br from-emerald-800 to-emerald-600 rounded-[2rem] shadow-[0_20px_40px_-10px_rgba(16,185,129,0.4)] group hover:scale-[1.02] hover:shadow-[0_25px_45px_-5px_rgba(16,185,129,0.5)] transition-all duration-300 overflow-hidden">
                                        <p className="text-[9px] font-black text-emerald-100/80 uppercase tracking-widest mb-1">Personnel</p>
                                        <p className="text-sm font-black text-white uppercase truncate">{selectedExpense.employeeName}</p>
                                    </div>
                                </section>

                                <section className="p-4 md:p-6 bg-gradient-to-br from-[#c5a059] to-[#e5c185] rounded-[2rem] md:rounded-3xl text-amber-950 shadow-[0_20px_40px_-10px_rgba(197,160,89,0.5)] relative overflow-hidden group hover:scale-[1.02] hover:shadow-[0_25px_45px_-5px_rgba(197,160,89,0.6)] transition-all duration-300">
                                    <div className="absolute top-0 right-0 p-4 md:p-8 opacity-20 group-hover:scale-110 transition-transform"><DollarSign size={60} /></div>
                                    <p className="text-[9px] md:text-[10px] font-black text-amber-950/80 uppercase tracking-[0.2em] mb-1 md:mb-2">Claim Valuation</p>
 <h4 className="text-2xl md:text-3xl font-bold tracking-tighter text-amber-950">₹{selectedExpense.amount.toLocaleString('en-IN')}</h4>
                                    <div className="mt-2 md:mt-4 flex items-center gap-2"><span className="text-[9px] md:text-[10px] font-black text-amber-950/80 uppercase">Category:</span><span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-amber-950">{selectedExpense.category}</span></div>
                                    {selectedExpense.category === 'Company' && (
                                        <div className="mt-3 p-2.5 bg-amber-950/10 border border-amber-950/20 rounded-[2rem] text-[8.5px] font-black text-amber-950 uppercase tracking-wider text-center">
                                            Company Expense – Not Deducted from Employee Allowance
                                        </div>
                                    )}
                                </section>

                                <section className="space-y-3">
                                    <h4 className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1"><Info size={12} /> Voucher Memo</h4>
                                    <p className="p-4 md:p-5 bg-slate-50 border border-slate-200 rounded-[2rem] md:rounded-[2rem] text-[11px] md:text-[13px] font-bold text-slate-600 leading-relaxed italic">"{selectedExpense.description}"</p>
                                </section>

                                {selectedExpense.receiptUrl && (
                                    <section className="space-y-3">
                                        <h4 className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1"><ImageIcon size={12} /> Snapshot Evidence</h4>
                                        <div className="relative group cursor-zoom-in rounded-[2rem] md:rounded-3xl overflow-hidden border-2 md:border-4 border-slate-100 shadow-lg" onClick={() => setViewReceiptModal(selectedExpense.receiptUrl!)}>
                                            <img src={selectedExpense.receiptUrl} alt="Receipt" className="w-full h-auto object-cover max-h-[200px] md:max-h-[300px]" />
                                            <div className="absolute inset-0 bg-indigo-600/20 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center"><div className="bg-white px-4 md:px-6 py-2 md:py-3 rounded-[2rem] md:rounded-[2rem] text-[9px] md:text-[10px] font-black uppercase tracking-widest text-indigo-600 shadow-2xl">Expand Proof</div></div>
                                        </div>
                                    </section>
                                )}

                                {selectedExpense.status === 'Rejected' && selectedExpense.rejectionReason && (
                                    <section className="p-4 md:p-6 bg-rose-50 border border-rose-100 rounded-[2rem] md:rounded-3xl space-y-2 md:space-y-3">
                                        <div className="flex items-center gap-2 md:gap-3 text-rose-600"><AlertCircle size={14}/><p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">Audit Objection</p></div>
                                        <p className="text-[10px] md:text-xs font-bold text-rose-800 italic leading-relaxed">"{selectedExpense.rejectionReason}"</p>
                                    </section>
                                )}
                            </div>

                            <div className="p-4 md:p-6 bg-slate-50/50 border-t border-slate-300 shrink-0 flex gap-3 md:gap-4">
                                {userRole === 'Admin' && selectedExpense.status === 'Pending' ? (
                                    <>
                                        <button onClick={() => setRejectionModal(selectedExpense.id)} className="flex-1 py-3 md:py-4 bg-white border border-rose-200 text-rose-500 rounded-[2rem] md:rounded-[2rem] font-black text-[9px] md:text-[10px] uppercase tracking-widest shadow-sm hover:bg-rose-50 transition-all">Decline</button>
                                        <button onClick={() => handleApprove(selectedExpense.id)} className="flex-[2] py-3 md:py-4 bg-emerald-600 text-white rounded-[2rem] md:rounded-[2rem] font-black text-[9px] md:text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 transition-all">Authorize</button>
                                    </>
                                ) : (
                                    <>
                                        {selectedExpense.employeeName === currentUser && selectedExpense.status === 'Pending' && (
                                            <button onClick={() => { setExpense(selectedExpense); setViewState('builder'); setBuilderMode('edit'); }} className="flex-1 py-3 md:py-4 bg-slate-800 text-white rounded-[2rem] md:rounded-[2rem] font-black text-[9px] md:text-[10px] uppercase tracking-widest shadow-xl hover:bg-black transition-all flex items-center justify-center gap-2 md:gap-3"><Edit2 size={14}/> Modify</button>
                                        )}
                                        {selectedExpense.status === 'Pending' && (userRole === 'Admin' || selectedExpense.employeeName === currentUser) && (
                                            <button 
                                                onClick={() => setDeleteModalId(selectedExpense.id)} 
                                                className="flex-1 py-3 md:py-4 bg-white border border-rose-200 text-rose-500 rounded-[2rem] md:rounded-[2rem] font-black text-[9px] md:text-[10px] uppercase tracking-widest shadow-sm hover:bg-rose-50 transition-all flex items-center justify-center gap-2"
                                            >
                                                <Trash2 size={14}/> Trash
                                            </button>
                                        )}
                                        <button onClick={() => setSelectedExpense(null)} className="w-full py-3 md:py-4 bg-white border border-slate-300 rounded-[2rem] md:rounded-[2rem] font-black text-[9px] md:text-[10px] uppercase tracking-widest">Close Record</button>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex-1 flex flex-col bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-2xl border border-slate-300 overflow-hidden animate-in slide-in-from-bottom-6 duration-300">
                    <div className="flex bg-slate-50/80 backdrop-blur-sm border-b border-slate-300 shrink-0 px-6 md:px-10 py-4 md:py-6 justify-between items-center">
                        <div className="flex items-center gap-4 md:gap-6">
                            <div className="flex flex-col"><h3 className="text-lg md:text-2xl font-playfair font-bold tracking-tight text-slate-800 uppercase tracking-tight">{builderMode === 'add' ? 'Claim Intake' : 'Voucher Edit'}</h3><p className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Synchronizing with enterprise ledger</p></div>
                            <div className="hidden sm:flex bg-slate-100 p-1 md:p-1.5 rounded-[2.5rem] border border-slate-200 shadow-inner w-fit shrink-0 gap-1 ml-4 md:ml-6">
                                <button onClick={() => setViewState('stock')} className={`px-4 md:px-6 py-1.5 md:py-2 text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-[2rem] transition-all flex items-center gap-1.5 md:gap-2 ${viewState === 'stock'  ? 'bg-emerald-900 text-white shadow-[0_10px_20px_-5px_rgba(6,78,59,0.5)] scale-100' : 'text-slate-400 hover:text-emerald-700 scale-95'}`}><List size={12} className="md:w-3.5 md:h-3.5" /> Console</button>
                                <button onClick={() => { setViewState('builder'); setBuilderMode('add'); setExpense({ ...DEFAULT_EXPENSE, employeeName: selectedEmployeeName }); setReceiptPreview(null); }} className={`px-4 md:px-6 py-1.5 md:py-2 text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-[2rem] transition-all flex items-center gap-1.5 md:gap-2 ${viewState === 'builder' && builderMode === 'add'  ? 'bg-emerald-900 text-white shadow-[0_10px_20px_-5px_rgba(6,78,59,0.5)] scale-100' : 'text-slate-400 hover:text-emerald-700 scale-95'}`}><Plus size={12} className="md:w-3.5 md:h-3.5" /> Claim</button>
                            </div>
                        </div>
                        <button onClick={() => setViewState('stock')} className="p-2 md:p-3 bg-white text-slate-400 rounded-[2rem] md:rounded-[2rem] hover:text-slate-600 transition-all border border-slate-200 shadow-sm"><X size={20}/></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-5 md:space-y-12 custom-scrollbar pb-32">
                        <section className="space-y-4 md:space-y-4">
                            <h3 className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] border-b border-slate-100 pb-2 flex items-center gap-2"><PieChart size={12} className="text-medical-500" />1. Valuation Logic</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                                {userRole === 'Admin' && (
                                    <div className="sm:col-span-1">
                                        <FormRow label="Personnel / Employee">
                                            <select className="w-full h-[36px] md:h-[48px] bg-white border border-slate-300 rounded-[2rem] md:rounded-[2rem] px-4 md:px-5 text-[11px] md:text-xs font-black uppercase cursor-pointer appearance-none" 
                                                value={expense.employeeName || selectedEmployeeName} 
                                                onChange={e => setExpense({...expense, employeeName: e.target.value})}
                                            >
                                                {employees.map(emp => (
                                                    <option key={emp.id} value={emp.name}>{emp.name}</option>
                                                ))}
                                            </select>
                                        </FormRow>
                                    </div>
                                )}
                                <div className="sm:col-span-1"><FormRow label="Voucher Date"><input type="date" className="w-full h-[36px] md:h-[48px] bg-slate-50 border border-slate-300 rounded-[2rem] md:rounded-[2rem] px-4 md:px-5 text-sm font-black outline-none focus:ring-4 focus:ring-medical-500/5" value={expense.date} onChange={e => setExpense({...expense, date: e.target.value})} /></FormRow></div>
                                <FormRow label="Expense Category"><select className="w-full h-[36px] md:h-[48px] bg-white border border-slate-300 rounded-[2rem] md:rounded-[2rem] px-4 md:px-5 text-[11px] md:text-xs font-black uppercase cursor-pointer appearance-none" value={expense.category} onChange={e => setExpense({...expense, category: e.target.value as any})}><option value="Daily Allowance">Daily Allowance</option><option value="Outstation Allowance">Outstation Allowance</option><option value="Salary Advance">Advance Payment</option><option value="Company">Company</option></select></FormRow>
 <div className={userRole === 'Admin' ? "sm:col-span-1" : "sm:col-span-2"}><FormRow label="Settlement Value (₹) *"><input type="number" className="w-full h-[36px] md:h-[48px] bg-white border border-slate-300 rounded-[2rem] md:rounded-[2rem] px-4 md:px-5 text-lg md:text-xl font-bold tracking-tight text-emerald-600 tracking-tighter" placeholder="0.00" value={expense.amount || ''} onChange={e => setExpense({...expense, amount: Number(e.target.value)})} /></FormRow></div>
                            </div>
                        </section>

                        <section className="space-y-4 md:space-y-4">
                            <h3 className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] border-b border-slate-100 pb-2 flex items-center gap-2"><Info size={12} className="text-medical-500" />2. Purpose & Context</h3>
                            <FormRow label="Narrative *"><textarea className="w-full min-h-[100px] md:min-h-[120px] bg-white border border-slate-300 rounded-[2rem] md:rounded-[2rem] px-4 md:px-5 py-3 md:py-4 text-[13px] md:text-sm font-bold outline-none focus:border-medical-500" placeholder="DESCRIBE PURPOSE..." value={expense.description || ''} onChange={e => setExpense({...expense, description: e.target.value})} /></FormRow>
                        </section>

                        <section className="space-y-4 md:space-y-4">
                            <h3 className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] border-b border-slate-100 pb-2 flex items-center gap-2"><ImageIcon size={12} className="text-medical-500" />3. Digital Proof</h3>
                            <div className="max-w-xl">
                                {isCompressing ? (
                                    <div className="p-8 md:p-12 border-2 border-dashed border-medical-500 bg-medical-50/20 rounded-[2rem] md:rounded-[2.5rem] flex flex-col items-center justify-center gap-3 md:gap-4 shadow-inner">
                                        <RefreshCw size={32} className="animate-spin text-medical-600" />
                                        <p className="text-[10px] font-black text-medical-600 uppercase tracking-[0.2em]">Optimizing...</p>
                                    </div>
                                ) : receiptPreview || expense.receiptUrl ? (
                                    <div className="p-4 md:p-6 bg-emerald-50 border-2 border-emerald-200 rounded-[2rem] md:rounded-[2.5rem] flex items-center justify-between shadow-xl shadow-emerald-500/10">
                                        <div className="flex items-center gap-4 md:gap-6">
                                            <div className="w-16 h-16 md:w-24 md:h-24 rounded-[2rem] md:rounded-3xl bg-white border-2 md:border-4 border-white shadow-2xl overflow-hidden ring-1 ring-emerald-100"><img src={receiptPreview || expense.receiptUrl} alt="Evidence" className="w-full h-full object-cover" /></div>
                                            <div><p className="text-xs md:text-sm font-black text-emerald-800 uppercase tracking-tight">Synchronized</p><p className="text-[9px] md:text-[10px] font-bold text-emerald-600/60 uppercase tracking-widest mt-0.5 md:mt-1 italic">Proof Logged</p></div>
                                        </div>
                                        <button onClick={() => { setReceiptPreview(null); setExpense({...expense, receiptUrl: undefined}); }} className="p-3 md:p-4 bg-white text-rose-500 rounded-[2rem] md:rounded-[2rem] hover:bg-rose-50 transition-all shadow-sm border border-rose-100"><X size={18}/></button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-4 md:gap-6">
                                        <label className="flex flex-col items-center justify-center p-6 md:p-12 border-2 border-dashed border-slate-300 rounded-[2rem] md:rounded-[2.5rem] hover:border-indigo-500 hover:bg-indigo-50/30 transition-all text-slate-400 group cursor-pointer shadow-inner">
                                            <input type="file" onChange={handleFileChange} accept="image/*" capture="environment" className="hidden" />
                                            <Camera size={32} className="mb-2 md:mb-4 opacity-20 group-hover:opacity-100 group-hover:text-indigo-500 transition-all" />
                                            <span className="text-[9px] font-black uppercase tracking-widest group-hover:text-indigo-600">Snap</span>
                                        </label>
                                        <label className="flex flex-col items-center justify-center p-6 md:p-12 border-2 border-dashed border-slate-300 rounded-[2rem] md:rounded-[2.5rem] hover:border-emerald-500 hover:bg-emerald-50/30 transition-all text-slate-400 group cursor-pointer shadow-inner">
                                            <input type="file" onChange={handleFileChange} accept="image/*" className="hidden" />
                                            <Upload size={32} className="mb-2 md:mb-4 opacity-20 group-hover:opacity-100 group-hover:text-emerald-500 transition-all" />
                                            <span className="text-[9px] font-black uppercase tracking-widest group-hover:text-emerald-600">Pick</span>
                                        </label>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>

                    <div className="sticky bottom-0 left-0 right-0 p-4 md:p-6 bg-white/95 backdrop-blur-md border-t border-slate-200 flex justify-end gap-3 md:gap-4 shadow-[0_-15px_30px_rgba(0,0,0,0.06)] z-30 shrink-0 px-6 md:px-10">
                        <button onClick={() => { setViewState('stock'); setExpense(DEFAULT_EXPENSE); }} className="px-6 md:px-10 py-3 md:py-4 bg-slate-100 text-slate-500 rounded-[2rem] md:rounded-[2rem] font-black text-[9px] md:text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all border border-slate-200 shadow-inner">Abort</button>
                        <button onClick={handleSave} disabled={isCompressing || isSaving} className="px-10 md:px-16 py-3 md:py-4 bg-gradient-to-r from-emerald-600 to-indigo-500 text-white rounded-[2rem] md:rounded-[2rem] font-black text-[9px] uppercase tracking-widest shadow-2xl shadow-emerald-500/40 active:scale-95 transition-all hover:brightness-110 disabled:opacity-50 flex items-center gap-2">
                            {isSaving && <RotateCw size={14} className="animate-spin" />}
                            {builderMode === 'add' ? 'Authorize Claim' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            )}

            {rejectionModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-in fade-in">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md flex flex-col scale-100 animate-in zoom-in-95 overflow-hidden border-4 border-rose-50">
                        <div className="p-10 text-center space-y-4">
                            <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center mx-auto text-rose-600 border border-rose-100 shadow-inner"><AlertCircle size={40} /></div>
                            <div><h3 className="text-2xl font-playfair font-bold tracking-tight text-slate-800 uppercase tracking-tight">Audit Declinaton</h3><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Explicit reason required for registry rejection</p></div>
                            <textarea autoFocus className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-6 py-6 text-sm font-bold outline-none focus:border-rose-500 transition-all min-h-[120px] resize-none" placeholder="REASON FOR REJECTION (E.G. INSUFFICIENT PROOF)..." value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} />
                        </div>
                        <div className="p-8 bg-slate-50 flex gap-4 border-t border-slate-200">
                            <button onClick={() => setRejectionModal(null)} className="flex-1 py-4 bg-white text-slate-400 rounded-[2rem] font-black text-[10px] uppercase tracking-widest border border-slate-300">Abort</button>
                            <button onClick={handleConfirmRejection} className="flex-[2] py-4 bg-rose-600 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-xl shadow-rose-500/30 active:scale-95 transition-all">Confirm Declinaton</button>
                        </div>
                    </div>
                </div>
            )}

            {viewReceiptModal && (
                <div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-950/95 backdrop-blur-2xl p-4 animate-in fade-in" onClick={() => setViewReceiptModal(null)}>
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[260] flex items-center gap-2 md:gap-4 bg-slate-900 border border-slate-700 px-4 md:px-6 py-2 md:py-3 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)]" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setZoomScale(s => Math.max(s - 0.25, 0.5))} className="p-2 text-white hover:bg-white/10 rounded-[2rem] transition-all" title="Zoom Out"><Minus size={20} /></button>
                        <span className="text-[10px] font-black text-white uppercase tracking-widest min-w-[50px] text-center">{Math.round(zoomScale * 100)}%</span>
                        <button onClick={() => setZoomScale(s => Math.min(s + 0.25, 4))} className="p-2 text-white hover:bg-white/10 rounded-[2rem] transition-all" title="Zoom In"><Plus size={20}/></button>
                        
                        <div className="w-px h-4 bg-white/20 mx-1"></div>
                        
                        <button onClick={() => setZoomRotation(r => (r + 90) % 360)} className="p-2 text-white hover:bg-white/10 rounded-[2rem] transition-all" title="Rotate"><RotateCw size={20}/></button>
                        <button onClick={() => setIsHighClarity(!isHighClarity)} className={`p-2 rounded-[2rem] transition-all ${isHighClarity ? 'bg-medical-500 text-white shadow-lg' : 'text-white hover:bg-white/10'}`} title="Enhance Clarity"><Sparkles size={20}/></button>
                        
                        <div className="w-px h-4 bg-white/20 mx-1"></div>
                        
                        <a href={viewReceiptModal} download="Evidence.jpg" className="p-2 text-white hover:bg-white/10 rounded-[2rem] transition-all" title="Download"><Download size={20}/></a>
                        <button onClick={() => setViewReceiptModal(null)} className="p-2 text-rose-400 hover:bg-rose-400/10 rounded-[2rem] transition-all"><X size={20}/></button>
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
                                className="max-w-[85vw] md:max-w-4xl rounded-[2rem] md:rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] border-4 md:border-8 border-white/10 bg-white" 
                                style={{ imageRendering: zoomScale > 1 ? 'crisp-edges' : 'auto' }}
                                draggable={false}
                            />
                        </div>
                    </div>
                </div>
            )}

            {deleteModalId && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-in fade-in">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm flex flex-col scale-100 animate-in zoom-in-95 overflow-hidden border-4 border-rose-50">
                        <div className="p-8 text-center space-y-4">
                            <div className="w-16 h-16 bg-rose-50 rounded-[2rem] flex items-center justify-center mx-auto text-rose-600 border border-rose-100 shadow-inner">
                                {isDeleting ? <RotateCw size={32} className="animate-spin" /> : <Trash2 size={32} />}
                            </div>
                            <div>
                                <h3 className="text-xl font-playfair font-bold tracking-tight text-slate-800 uppercase tracking-tight">Erase Voucher?</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 leading-relaxed px-4">
                                    Are you sure you want to delete this pending expense? This action is permanent.
                                </p>
                            </div>
                        </div>
                        <div className="p-6 bg-slate-50 flex gap-3 border-t border-slate-200">
                            <button 
                                disabled={isDeleting}
                                onClick={() => setDeleteModalId(null)} 
                                className="flex-1 py-3.5 bg-white text-slate-400 rounded-[2rem] font-black text-[10px] uppercase tracking-widest border border-slate-300 hover:bg-slate-50 transition-all disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button 
                                disabled={isDeleting}
                                onClick={handleDelete} 
                                className="flex-[2] py-3.5 bg-rose-600 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-xl shadow-rose-500/30 active:scale-95 transition-all hover:bg-rose-700 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isDeleting && <RotateCw size={14} className="animate-spin" />}
                                Confirm Deletion
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showSubmitSuccess && (
                <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-950/80 backdrop-blur-xl p-4 animate-in fade-in">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md flex flex-col scale-100 animate-in zoom-in-95 overflow-hidden border-4 border-emerald-50">
                        <div className="p-10 text-center space-y-4">
                            <div className="w-24 h-24 bg-emerald-50 rounded-[2rem] flex items-center justify-center mx-auto text-emerald-600 border border-emerald-100 shadow-inner relative">
                                <div className="absolute inset-0 bg-emerald-400/20 rounded-[2rem] animate-ping opacity-20"></div>
                                <CheckCircle2 size={48} className="relative z-10 animate-in zoom-in duration-500" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-playfair font-bold tracking-tight text-slate-800 uppercase tracking-tight">Expense Submitted Successfully</h3>
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-relaxed px-6">
                                    Your expense has been submitted and is pending admin approval.
                                </p>
                            </div>
                        </div>
                        <div className="p-8 bg-slate-50/50 flex flex-col gap-3 border-t border-slate-100">
                            <button 
                                onClick={() => { setShowSubmitSuccess(false); setViewState('stock'); setExpense(DEFAULT_EXPENSE); setReceiptPreview(null); }} 
                                className="w-full py-4 bg-slate-800 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-black transition-all"
                            >
                                OK
                            </button>
                            <button 
                                onClick={() => { setShowSubmitSuccess(false); setExpense(DEFAULT_EXPENSE); setReceiptPreview(null); }} 
                                className="w-full py-4 bg-emerald-600 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                            >
                                <Plus size={14} /> Submit Another Expense
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {submitError && (
                <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-950/80 backdrop-blur-xl p-4 animate-in fade-in">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md flex flex-col scale-100 animate-in zoom-in-95 overflow-hidden border-4 border-rose-50">
                        <div className="p-10 text-center space-y-4">
                            <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center mx-auto text-rose-600 border border-rose-100 shadow-inner"><XCircle size={40} /></div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-playfair font-bold tracking-tight text-slate-800 uppercase tracking-tight">Voucher Submission Failed</h3>
                                <p className="text-xs font-bold text-rose-500 italic">"{submitError}"</p>
                            </div>
                        </div>
                        <div className="p-8 bg-slate-50 border-t border-slate-100">
                            <button onClick={() => setSubmitError(null)} className="w-full py-4 bg-slate-800 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-black transition-all">Try Again</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Picker Modal (Mobile App Friendly) */}
            {activePicker && createPortal(
                <div className="fixed inset-0 z-[99999] flex flex-col justify-end bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 w-full rounded-t-[2rem] shadow-2xl flex flex-col max-h-[80vh] overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
                        <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-white">
                                {activePicker === 'month' && 'Select Month'}
                                {activePicker === 'year' && 'Select Year'}
                                {activePicker === 'employee' && 'Select Employee'}
                            </h3>
                            <button 
                                onClick={() => setActivePicker(null)}
                                className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-full transition-colors"
                            >
                                <X size={16} strokeWidth={3} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                            {activePicker === 'month' && (
                                <div className="flex flex-col">
                                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, i) => (
                                        <button
                                            key={m}
                                            onClick={() => { setSelectedMonth(i); setActivePicker(null); }}
                                            className={`p-4 text-left font-bold rounded-[1.5rem] transition-colors ${selectedMonth === i ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                </div>
                            )}
                            {activePicker === 'year' && (
                                <div className="flex flex-col">
                                    {[2024, 2025, 2026, 2027].map(y => (
                                        <button
                                            key={y}
                                            onClick={() => { setSelectedYear(y); setActivePicker(null); }}
                                            className={`p-4 text-left font-bold rounded-[1.5rem] transition-colors ${selectedYear === y ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                                        >
                                            {y}
                                        </button>
                                    ))}
                                </div>
                            )}
                            {activePicker === 'employee' && (
                                <div className="flex flex-col">
                                    <button
                                        onClick={() => { setSelectedEmployeeName('ALL'); setActivePicker(null); }}
                                        className={`p-4 text-left font-bold rounded-[1.5rem] transition-colors ${selectedEmployeeName === 'ALL' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                                    >
                                        -- Select --
                                    </button>
                                    {employees.map(emp => (
                                        <button
                                            key={emp.id}
                                            onClick={() => { setSelectedEmployeeName(emp.name); setActivePicker(null); }}
                                            className={`p-4 text-left font-bold rounded-[1.5rem] transition-colors flex flex-col ${selectedEmployeeName === emp.name ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                                        >
                                            <span>{emp.name}</span>
                                            <span className="text-[10px] font-semibold uppercase tracking-wider opacity-60 mt-1">{emp.department}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
