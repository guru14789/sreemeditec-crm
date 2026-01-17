
import React, { useState, useRef } from 'react';
import { ExpenseRecord } from '../types';
import { Receipt, Plus, FileText, Calendar, IndianRupee, CheckCircle2, Clock, XCircle, Filter, Search, User, Check, X, Eye, Image as ImageIcon, RefreshCw, Upload, AlertCircle, MessageSquare } from 'lucide-react';
import { useData } from './DataContext';

interface ExpenseModuleProps {
    currentUser: string;
    userRole: 'Admin' | 'Employee';
}

export const ExpenseModule: React.FC<ExpenseModuleProps> = ({ currentUser, userRole }) => {
  const { expenses, addExpense, updateExpenseStatus, addNotification } = useData();
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewReceiptModal, setViewReceiptModal] = useState<ExpenseRecord | null>(null);
  const [rejectionModal, setRejectionModal] = useState<string | null>(null); 
  const [rejectionReason, setRejectionReason] = useState('');
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [newExpense, setNewExpense] = useState<Partial<ExpenseRecord>>({
      date: new Date().toISOString().split('T')[0],
      category: 'Travel',
      amount: 0,
      description: '',
      status: 'Pending'
  });

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
      const record: ExpenseRecord = {
          id: `EXP-${Date.now()}`,
          employeeName: currentUser,
          date: newExpense.date!,
          category: newExpense.category as any,
          amount: Number(newExpense.amount),
          description: newExpense.description!,
          status: 'Pending',
          receiptUrl: receiptPreview || undefined
      };
      addExpense(record);
      setShowAddModal(false);
      setNewExpense({ date: new Date().toISOString().split('T')[0], category: 'Travel', amount: 0, description: '', status: 'Pending' });
      setReceiptPreview(null);
      addNotification('Voucher Submitted', `Your claim for ₹${record.amount} is now pending approval.`, 'info');
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
      switch(status) {
          case 'Approved': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
          case 'Rejected': return 'bg-rose-50 text-rose-700 border-rose-200';
          default: return 'bg-amber-50 text-amber-700 border-amber-200';
      }
  };

  const visibleExpenses = userRole === 'Admin' 
    ? expenses 
    : expenses.filter(e => e.employeeName === currentUser);

  const totalApprovedClaimed = visibleExpenses.filter(e => e.status === 'Approved').reduce((acc, curr) => acc + curr.amount, 0);
  const totalRejected = visibleExpenses.filter(e => e.status === 'Rejected').reduce((acc, curr) => acc + curr.amount, 0);
  const pendingAmount = visibleExpenses.filter(e => e.status === 'Pending').reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="h-full flex flex-col gap-4 sm:gap-6 overflow-hidden p-1 sm:p-2">
      
      {/* Stats Section - Fully Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5 shrink-0">
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border-2 border-emerald-500 shadow-xl shadow-emerald-500/10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 sm:p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                  <CheckCircle2 size={64} className="text-emerald-500 sm:w-20 sm:h-20" />
              </div>
              <div className="relative z-10">
                  <p className="text-emerald-600 dark:text-emerald-400 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] mb-1 flex items-center gap-2">
                      <CheckCircle2 size={12} /> Approved Claims
                  </p>
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-100 mt-1 tracking-tighter">₹{totalApprovedClaimed.toLocaleString()}</h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-1.5 uppercase tracking-widest hidden sm:block">Cleared for Disbursement</p>
              </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-amber-100 dark:border-amber-800/40 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 sm:p-6 opacity-5 group-hover:opacity-10 transition-opacity text-amber-500">
                  <Clock size={64} className="sm:w-20 sm:h-20" />
              </div>
              <div className="relative z-10">
                  <p className="text-amber-600 dark:text-amber-400 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] mb-1 flex items-center gap-2">
                      <Clock size={12} /> Pending Approval
                  </p>
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-100 mt-1 tracking-tighter">₹{pendingAmount.toLocaleString()}</h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-1.5 uppercase tracking-widest hidden sm:block">Awaiting Admin Action</p>
              </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-rose-100 dark:border-rose-800/40 shadow-sm relative overflow-hidden group sm:col-span-2 lg:col-span-1">
              <div className="absolute top-0 right-0 p-4 sm:p-6 opacity-5 group-hover:opacity-10 transition-opacity text-rose-500">
                  <XCircle size={64} className="sm:w-20 sm:h-20" />
              </div>
              <div className="relative z-10">
                  <p className="text-rose-600 dark:text-rose-400 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] mb-1 flex items-center gap-2">
                      <XCircle size={12} /> Total Rejected
                  </p>
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-100 mt-1 tracking-tighter text-rose-600">₹{totalRejected.toLocaleString()}</h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-1.5 uppercase tracking-widest hidden sm:block">Declined Claims</p>
              </div>
          </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shrink-0"><Receipt size={20} className="sm:w-6 sm:h-6" /></div>
                  <div>
                      <h2 className="font-black text-sm sm:text-lg text-slate-800 dark:text-white uppercase tracking-tight leading-none">Financial Vouchers</h2>
                      <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{userRole === 'Admin' ? 'Enterprise Ledger' : 'My Reimbursement Log'}</p>
                  </div>
              </div>
              <button 
                  onClick={() => setShowAddModal(true)}
                  className="w-full sm:w-auto bg-emerald-600 text-white px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all active:scale-95 shrink-0">
                  <Plus size={16} /> Submit Claim
              </button>
          </div>

          {/* Responsive Scroll Container for Table */}
          <div className="flex-1 overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs sm:text-sm text-slate-600 min-w-[700px] lg:min-w-full">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 text-[8px] sm:text-[10px] uppercase font-black tracking-[0.1em] sm:tracking-[0.2em] text-slate-400 sticky top-0 z-20 backdrop-blur-md">
                      <tr>
                          <th className="px-4 sm:px-6 py-4 sm:py-5">Timestamp</th>
                          {userRole === 'Admin' && <th className="px-4 sm:px-6 py-4 sm:py-5">Personnel</th>}
                          <th className="px-4 sm:px-6 py-4 sm:py-5">Description</th>
                          <th className="px-4 sm:px-6 py-4 sm:py-5 text-right">Value (₹)</th>
                          <th className="px-4 sm:px-6 py-4 sm:py-5 text-center">Attachment</th>
                          <th className="px-4 sm:px-6 py-4 sm:py-5 text-center">Status</th>
                          {userRole === 'Admin' && <th className="px-4 sm:px-6 py-4 sm:py-5 text-right">Ops</th>}
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {visibleExpenses.map(expense => (
                          <tr key={expense.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">
                              <td className="px-4 sm:px-6 py-4 sm:py-5 font-bold text-slate-400 text-[10px] sm:text-xs uppercase whitespace-nowrap">{expense.date}</td>
                              {userRole === 'Admin' && (
                                  <td className="px-4 sm:px-6 py-4 sm:py-5">
                                      <div className="flex items-center gap-2 sm:gap-3">
                                          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-[8px] sm:text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase shrink-0">
                                              {expense.employeeName.charAt(0)}
                                          </div>
                                          <span className="font-black text-slate-800 dark:text-slate-200 text-[10px] sm:text-xs uppercase truncate max-w-[80px] sm:max-w-none">{expense.employeeName}</span>
                                      </div>
                                  </td>
                              )}
                              <td className="px-4 sm:px-6 py-4 sm:py-5">
                                  <div className="flex flex-col min-w-[150px]">
                                      <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-1">
                                          <span className="text-[8px] sm:text-[9px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded-lg border border-indigo-100 dark:border-indigo-800 whitespace-nowrap">{expense.category}</span>
                                          <span className="font-black text-slate-800 dark:text-slate-200 text-[10px] sm:text-xs uppercase truncate max-w-[120px] sm:max-w-[200px]">{expense.description}</span>
                                      </div>
                                      {expense.status === 'Rejected' && expense.rejectionReason && (
                                          <div className="flex items-start gap-1 text-rose-500 bg-rose-50 dark:bg-rose-900/10 p-1.5 sm:p-2 rounded-lg border border-rose-100 dark:border-rose-800/50 mt-1 max-w-[200px] sm:max-w-[300px]">
                                              <MessageSquare size={10} className="shrink-0 mt-0.5" />
                                              <p className="text-[8px] sm:text-[10px] font-bold leading-tight italic">Audit: {expense.rejectionReason}</p>
                                          </div>
                                      )}
                                  </div>
                              </td>
                              <td className="px-4 sm:px-6 py-4 sm:py-5 text-right font-black text-slate-900 dark:text-white text-sm sm:text-base tracking-tighter whitespace-nowrap">₹{expense.amount.toLocaleString()}</td>
                              <td className="px-4 sm:px-6 py-4 sm:py-5 text-center">
                                  {expense.receiptUrl ? (
                                      <button 
                                        onClick={() => setViewReceiptModal(expense)}
                                        className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-all shadow-sm">
                                        <ImageIcon size={16} className="sm:w-[18px] sm:h-[18px]" />
                                      </button>
                                  ) : (
                                      <span className="text-slate-200 dark:text-slate-700"><ImageIcon size={16} className="sm:w-[18px] sm:h-[18px]" /></span>
                                  )}
                              </td>
                              <td className="px-4 sm:px-6 py-4 sm:py-5 text-center">
                                  <span className={`inline-flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[8px] sm:text-[9px] font-black uppercase tracking-wider sm:tracking-widest border ${getStatusColor(expense.status)}`}>
                                      {expense.status === 'Approved' && <CheckCircle2 size={10} />}
                                      {expense.status === 'Pending' && <Clock size={10} />}
                                      {expense.status === 'Rejected' && <XCircle size={10} />}
                                      <span className="hidden sm:inline ml-0.5">{expense.status}</span>
                                      <span className="sm:hidden">{expense.status.charAt(0)}</span>
                                  </span>
                              </td>
                              {userRole === 'Admin' && (
                                  <td className="px-4 sm:px-6 py-4 sm:py-5 text-right">
                                      {expense.status === 'Pending' && (
                                          <div className="flex justify-end gap-1.5 sm:gap-2">
                                              <button 
                                                onClick={() => handleApprove(expense.id)}
                                                className="p-1.5 sm:p-2 bg-emerald-50 text-emerald-600 rounded-lg sm:rounded-xl hover:bg-emerald-600 hover:text-white border border-emerald-100 transition-all shadow-sm active:scale-90">
                                                  <Check size={16} />
                                              </button>
                                              <button 
                                                onClick={() => handleOpenRejection(expense.id)}
                                                className="p-1.5 sm:p-2 bg-rose-50 text-rose-600 rounded-lg sm:rounded-xl hover:bg-rose-600 hover:text-white border border-rose-100 transition-all shadow-sm active:scale-90">
                                                  <X size={16} />
                                              </button>
                                          </div>
                                      )}
                                  </td>
                              )}
                          </tr>
                      ))}
                      {visibleExpenses.length === 0 && (
                          <tr>
                              <td colSpan={7} className="py-16 sm:py-20 text-center opacity-30">
                                  <div className="flex flex-col items-center">
                                      <FileText size={32} className="sm:w-12 sm:h-12 mb-3 sm:mb-4 text-slate-300" />
                                      <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest">No active vouchers found</p>
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
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-3 sm:p-4 animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] sm:rounded-[2.5rem] shadow-2xl w-full max-w-lg flex flex-col scale-100 animate-in zoom-in-95 overflow-hidden">
                  <div className="p-5 sm:p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                      <h3 className="text-lg sm:text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">New Voucher</h3>
                      <p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Submit digital expense proof</p>
                  </div>
                  <div className="p-5 sm:p-8 space-y-4 sm:space-y-6 overflow-y-auto max-h-[60vh] sm:max-h-[70vh] custom-scrollbar">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                          <div className="space-y-1.5">
                              <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Voucher Date</label>
                              <input type="date" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 sm:px-5 sm:py-3 text-xs sm:text-sm font-bold outline-none focus:border-medical-500 dark:text-white"
                                  value={newExpense.date} onChange={e => setNewExpense({...newExpense, date: e.target.value})} />
                          </div>
                          <div className="space-y-1.5">
                              <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
                              <select className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 sm:px-5 sm:py-3 text-xs sm:text-sm font-black outline-none focus:border-medical-500 dark:text-white appearance-none"
                                  value={newExpense.category} onChange={e => setNewExpense({...newExpense, category: e.target.value as any})}>
                                  <option>Travel</option>
                                  <option>Food</option>
                                  <option>Lodging</option>
                                  <option>Supplies</option>
                                  <option>Other</option>
                              </select>
                          </div>
                      </div>
                      <div className="space-y-1.5">
                          <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Claim Amount (₹)</label>
                          <input type="number" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 sm:px-5 sm:py-4 text-xl sm:text-2xl font-black outline-none focus:border-medical-500 text-emerald-600"
                              placeholder="0.00" value={newExpense.amount || ''} onChange={e => setNewExpense({...newExpense, amount: Number(e.target.value)})} />
                      </div>
                      <div className="space-y-1.5">
                          <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Memo / Purpose</label>
                          <textarea rows={2} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 sm:px-5 sm:py-3 text-xs sm:text-sm font-bold outline-none focus:border-medical-500 dark:text-white resize-none"
                              placeholder="Reason for expense..." value={newExpense.description} onChange={e => setNewExpense({...newExpense, description: e.target.value})} />
                      </div>
                      
                      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                      <div 
                        onClick={() => !isCompressing && fileInputRef.current?.click()}
                        className={`p-4 sm:p-6 border-2 border-dashed rounded-[1.5rem] sm:rounded-[2rem] text-center cursor-pointer transition-all ${isCompressing ? 'opacity-50 cursor-wait' : ''} ${receiptPreview ? 'border-emerald-500 bg-emerald-50/30 text-emerald-600' : 'border-slate-200 dark:border-slate-700 text-slate-300 dark:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/30'}`}
                      >
                          {isCompressing ? (
                              <div className="flex flex-col items-center justify-center gap-2">
                                  <RefreshCw size={24} className="animate-spin text-emerald-500" />
                                  <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest">Optimizing...</span>
                              </div>
                          ) : receiptPreview ? (
                              <div className="flex items-center justify-center gap-3 sm:gap-5">
                                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-700 border-2 border-emerald-100 dark:border-emerald-800 overflow-hidden shrink-0 shadow-lg">
                                      <img src={receiptPreview} alt="Preview" className="w-full h-full object-cover" />
                                  </div>
                                  <div className="text-left">
                                      <p className="text-[10px] sm:text-xs font-black uppercase tracking-tight">Image Attached</p>
                                      <p className="text-[8px] sm:text-[9px] font-black opacity-50 uppercase tracking-widest">Tap to Replace</p>
                                  </div>
                              </div>
                          ) : (
                              <>
                                <Upload size={24} className="mx-auto mb-2 opacity-20 sm:w-8 sm:h-8" />
                                <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest">Upload Receipt</p>
                              </>
                          )}
                      </div>
                  </div>
                  <div className="p-5 sm:p-8 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3 sm:gap-4 bg-slate-50/50 dark:bg-slate-800/50">
                      <button onClick={() => { setShowAddModal(false); setReceiptPreview(null); }} className="order-2 sm:order-1 flex-1 bg-white dark:bg-slate-700 text-slate-400 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm">Cancel</button>
                      <button onClick={handleAddExpense} disabled={isCompressing} className="order-1 sm:order-2 flex-[2] bg-medical-600 text-white py-3 sm:py-4 rounded-xl sm:rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-medical-500/20 active:scale-95 disabled:opacity-50">Submit Claim</button>
                  </div>
              </div>
          </div>
      )}

      {/* Rejection Modal */}
      {rejectionModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] sm:rounded-[2.5rem] shadow-2xl w-full max-w-sm flex flex-col scale-100 animate-in zoom-in-95 overflow-hidden border border-rose-100 dark:border-rose-900">
                  <div className="p-6 sm:p-8 text-center space-y-4">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-rose-50 dark:bg-rose-900/20 rounded-xl sm:rounded-[1.5rem] flex items-center justify-center mx-auto text-rose-600 border border-rose-100 dark:border-rose-800">
                          <AlertCircle size={28} className="sm:w-8 sm:h-8" />
                      </div>
                      <div>
                          <h3 className="text-lg sm:text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight leading-none">Decline Voucher?</h3>
                          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Audit trail requires feedback</p>
                      </div>
                      <textarea 
                        autoFocus
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl sm:rounded-2xl px-4 py-4 text-[11px] sm:text-xs font-bold outline-none focus:border-rose-500 dark:text-white resize-none min-h-[100px]"
                        placeholder="Rejection reason..."
                        value={rejectionReason}
                        onChange={e => setRejectionReason(e.target.value)}
                      />
                  </div>
                  <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-800/50 flex gap-3 border-t border-slate-100 dark:border-slate-800">
                      <button onClick={() => setRejectionModal(null)} className="flex-1 py-3 text-[9px] sm:text-[10px] font-black uppercase text-slate-400 bg-white dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600">Abort</button>
                      <button onClick={handleConfirmRejection} className="flex-[2] py-3 text-[9px] sm:text-[10px] font-black uppercase text-white bg-rose-600 rounded-xl shadow-lg shadow-rose-500/20 active:scale-95">Confirm</button>
                  </div>
              </div>
          </div>
      )}

      {/* Receipt Preview */}
      {viewReceiptModal && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/80 backdrop-blur-xl p-3 sm:p-4 animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 rounded-[2rem] sm:rounded-[3rem] shadow-2xl w-full max-w-2xl flex flex-col scale-100 animate-in zoom-in-95 overflow-hidden">
                  <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                      <div className="flex items-center gap-3">
                          <ImageIcon size={18} className="text-indigo-600" />
                          <h3 className="font-black text-[10px] sm:text-sm text-slate-800 dark:text-white uppercase tracking-widest">Digital Evidence</h3>
                      </div>
                      <button onClick={() => setViewReceiptModal(null)} className="text-slate-400 hover:text-slate-600 p-1.5 sm:p-2 hover:bg-white dark:hover:bg-slate-700 rounded-full transition-all"><X size={20} className="sm:w-6 sm:h-6"/></button>
                  </div>
                  <div className="p-4 sm:p-6 bg-slate-100 dark:bg-slate-950 flex items-center justify-center min-h-[300px] sm:min-h-[400px] max-h-[60vh] sm:max-h-[70vh] overflow-y-auto custom-scrollbar">
                      {viewReceiptModal.receiptUrl ? (
                          <img src={viewReceiptModal.receiptUrl} alt="Receipt" className="max-w-full h-auto rounded-xl sm:rounded-3xl shadow-2xl border-4 sm:border-8 border-white dark:border-slate-800" />
                      ) : (
                        <div className="text-center text-slate-300">
                          <ImageIcon size={48} className="mx-auto mb-4 opacity-10 sm:w-20 sm:h-20" />
                          <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest opacity-40">Attachment Missing</p>
                        </div>
                      )}
                  </div>
                  <div className="p-6 sm:p-8 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row justify-between items-center gap-4">
                      <div className="flex gap-6 sm:gap-10 w-full sm:w-auto">
                          <div>
                              <p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5 sm:mb-1">Amount</p>
                              <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white tracking-tighter">₹{viewReceiptModal.amount.toLocaleString()}</p>
                          </div>
                          <div>
                              <p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5 sm:mb-1">User</p>
                              <p className="text-xs sm:text-sm font-black text-indigo-600 dark:text-indigo-400 uppercase truncate max-w-[120px]">{viewReceiptModal.employeeName}</p>
                          </div>
                      </div>
                      <button onClick={() => setViewReceiptModal(null)} className="w-full sm:w-auto px-10 py-3 bg-slate-900 dark:bg-slate-700 text-white rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">Close</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
