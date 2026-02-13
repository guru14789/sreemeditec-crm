
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
  const [rejectionModal, setRejectionModal] = useState<string | null>(null); // Stores expense ID
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

  // Filter expenses based on role
  const visibleExpenses = userRole === 'Admin' 
    ? expenses 
    : expenses.filter(e => e.employeeName === currentUser);

  // Stats Logic per Requirements
  // Total Claimed = sum of APPROVED amount
  const totalApprovedClaimed = visibleExpenses.filter(e => e.status === 'Approved').reduce((acc, curr) => acc + curr.amount, 0);
  
  // Total Rejected = sum of REJECTED amount
  const totalRejected = visibleExpenses.filter(e => e.status === 'Rejected').reduce((acc, curr) => acc + curr.amount, 0);
  
  // Pending Approval = sum of NOT APPROVE (Pending) amount
  const pendingAmount = visibleExpenses.filter(e => e.status === 'Pending').reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="h-full flex flex-col gap-6 overflow-y-auto lg:overflow-hidden p-2">
      {/* Revised Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 shrink-0">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border-2 border-emerald-500 shadow-xl shadow-emerald-500/10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                  <CheckCircle2 size={80} className="text-emerald-500" />
              </div>
              <div className="relative z-10">
                  <p className="text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1 flex items-center gap-2">
                      <CheckCircle2 size={14} /> Total Claimed (Approved)
                  </p>
                  <h3 className="text-3xl font-black text-slate-800 dark:text-slate-100 mt-1 tracking-tighter">₹{totalApprovedClaimed.toLocaleString()}</h3>
                  <p className="text-xs text-slate-400 font-bold mt-2 uppercase tracking-widest">Cleared for Disbursement</p>
              </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-amber-100 dark:border-amber-800/40 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity text-amber-500">
                  <Clock size={80} />
              </div>
              <div className="relative z-10">
                  <p className="text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1 flex items-center gap-2">
                      <Clock size={14} /> Pending Approval
                  </p>
                  <h3 className="text-3xl font-black text-slate-800 dark:text-slate-100 mt-1 tracking-tighter">₹{pendingAmount.toLocaleString()}</h3>
                  <p className="text-xs text-slate-400 font-bold mt-2 uppercase tracking-widest">Awaiting Admin Action</p>
              </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-rose-100 dark:border-rose-800/40 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity text-rose-500">
                  <XCircle size={80} />
              </div>
              <div className="relative z-10">
                  <p className="text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1 flex items-center gap-2">
                      <XCircle size={14} /> Total Rejected
                  </p>
                  <h3 className="text-3xl font-black text-slate-800 dark:text-slate-100 mt-1 tracking-tighter text-rose-600">₹{totalRejected.toLocaleString()}</h3>
                  <p className="text-xs text-slate-400 font-bold mt-2 uppercase tracking-widest">Declined Claims</p>
              </div>
          </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col overflow-hidden min-h-[500px]">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg"><Receipt size={24} /></div>
                  <div>
                      <h2 className="font-black text-lg text-slate-800 dark:text-white uppercase tracking-tight">Financial Vouchers</h2>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{userRole === 'Admin' ? 'Enterprise Ledger' : 'My Reimbursement Log'}</p>
                  </div>
              </div>
              <button 
                  onClick={() => setShowAddModal(true)}
                  className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 flex items-center gap-2 hover:bg-emerald-700 transition-all active:scale-95">
                  <Plus size={18} /> Submit Claim
              </button>
          </div>

          <div className="flex-1 overflow-auto custom-scrollbar p-0">
              <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 text-[10px] uppercase font-black tracking-[0.2em] text-slate-400 sticky top-0 z-10 backdrop-blur-md">
                      <tr>
                          <th className="px-6 py-5">Timestamp</th>
                          {userRole === 'Admin' && <th className="px-6 py-5">Personnel</th>}
                          <th className="px-6 py-5">Description</th>
                          <th className="px-6 py-5 text-right">Value (₹)</th>
                          <th className="px-6 py-5 text-center">Attachment</th>
                          <th className="px-6 py-5 text-center">Status</th>
                          {userRole === 'Admin' && <th className="px-6 py-5 text-right">Operations</th>}
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {visibleExpenses.map(expense => (
                          <tr key={expense.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">
                              <td className="px-6 py-5 font-bold text-slate-400 text-xs uppercase">{expense.date}</td>
                              {userRole === 'Admin' && (
                                  <td className="px-6 py-5">
                                      <div className="flex items-center gap-3">
                                          <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase shadow-inner">
                                              {expense.employeeName.charAt(0)}
                                          </div>
                                          <span className="font-black text-slate-800 dark:text-slate-200 text-xs uppercase">{expense.employeeName}</span>
                                      </div>
                                  </td>
                              )}
                              <td className="px-6 py-5">
                                  <div className="flex flex-col">
                                      <div className="flex items-center gap-2 mb-1">
                                          <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded-lg border border-indigo-100 dark:border-indigo-800">{expense.category}</span>
                                          <span className="font-black text-slate-800 dark:text-slate-200 text-xs uppercase truncate max-w-[200px]">{expense.description}</span>
                                      </div>
                                      {expense.status === 'Rejected' && expense.rejectionReason && (
                                          <div className="flex items-start gap-1 text-rose-500 bg-rose-50 dark:bg-rose-900/10 p-2 rounded-lg border border-rose-100 dark:border-rose-800/50 mt-1 max-w-[300px]">
                                              <MessageSquare size={12} className="shrink-0 mt-0.5" />
                                              <p className="text-[10px] font-bold leading-tight italic">Audit Feedback: {expense.rejectionReason}</p>
                                          </div>
                                      )}
                                  </div>
                              </td>
                              <td className="px-6 py-5 text-right font-black text-slate-900 dark:text-white text-base tracking-tighter">₹{expense.amount.toLocaleString()}</td>
                              <td className="px-6 py-5 text-center">
                                  {expense.receiptUrl ? (
                                      <button 
                                        onClick={() => setViewReceiptModal(expense)}
                                        className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-all shadow-sm" title="View Digital Receipt">
                                        <ImageIcon size={18} />
                                      </button>
                                  ) : (
                                      <span className="text-slate-200 dark:text-slate-700"><ImageIcon size={18} /></span>
                                  )}
                              </td>
                              <td className="px-6 py-5 text-center">
                                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${getStatusColor(expense.status)}`}>
                                      {expense.status === 'Approved' && <CheckCircle2 size={12} />}
                                      {expense.status === 'Pending' && <Clock size={12} />}
                                      {expense.status === 'Rejected' && <XCircle size={12} />}
                                      {expense.status}
                                  </span>
                              </td>
                              {userRole === 'Admin' && (
                                  <td className="px-6 py-5 text-right">
                                      {expense.status === 'Pending' && (
                                          <div className="flex justify-end gap-2">
                                              <button 
                                                onClick={() => handleApprove(expense.id)}
                                                className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white border border-emerald-100 transition-all shadow-sm active:scale-90" title="Grant Approval">
                                                  <Check size={18} />
                                              </button>
                                              <button 
                                                onClick={() => handleOpenRejection(expense.id)}
                                                className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white border border-rose-100 transition-all shadow-sm active:scale-90" title="Submit Audit Feedback">
                                                  <X size={18} />
                                              </button>
                                          </div>
                                      )}
                                  </td>
                              )}
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
                  <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                      <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">New Reimbursement Voucher</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Submit digital expense proof</p>
                  </div>
                  <div className="p-8 space-y-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
                      <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Voucher Date</label>
                              <input type="date" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3 text-sm font-bold outline-none focus:border-medical-500 dark:text-white"
                                  value={newExpense.date} onChange={e => setNewExpense({...newExpense, date: e.target.value})} />
                          </div>
                          <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
                              <select className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3 text-sm font-black outline-none focus:border-medical-500 dark:text-white appearance-none"
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
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Claim Amount (₹)</label>
                          <input type="number" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-2xl font-black outline-none focus:border-medical-500 text-emerald-600"
                              placeholder="0.00" value={newExpense.amount || ''} onChange={e => setNewExpense({...newExpense, amount: Number(e.target.value)})} />
                      </div>
                      <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description / Memo</label>
                          <textarea rows={3} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3 text-sm font-bold outline-none focus:border-medical-500 dark:text-white resize-none"
                              placeholder="Describe why this expense was incurred..." value={newExpense.description} onChange={e => setNewExpense({...newExpense, description: e.target.value})} />
                      </div>
                      
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        accept="image/*" 
                        className="hidden" 
                      />
                      
                      <div 
                        onClick={() => !isCompressing && fileInputRef.current?.click()}
                        className={`p-6 border-2 border-dashed rounded-[2rem] text-center cursor-pointer transition-all ${isCompressing ? 'opacity-50 cursor-wait' : ''} ${receiptPreview ? 'border-emerald-500 bg-emerald-50/30 text-emerald-600' : 'border-slate-200 dark:border-slate-700 text-slate-300 dark:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/30'}`}
                      >
                          {isCompressing ? (
                              <div className="flex flex-col items-center justify-center gap-3">
                                  <RefreshCw size={32} className="animate-spin text-emerald-500" />
                                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Optimizing Metadata...</span>
                              </div>
                          ) : receiptPreview ? (
                              <div className="flex items-center justify-center gap-5">
                                  <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-700 border-2 border-emerald-100 dark:border-emerald-800 overflow-hidden shrink-0 shadow-lg ring-4 ring-emerald-500/5">
                                      <img src={receiptPreview} alt="Preview" className="w-full h-full object-cover" />
                                  </div>
                                  <div className="text-left">
                                      <p className="text-xs font-black uppercase tracking-tight">Attachment Successful</p>
                                      <p className="text-[10px] font-black opacity-50 uppercase tracking-widest mt-1">Tap to Replace Snapshot</p>
                                  </div>
                              </div>
                          ) : (
                              <>
                                <Upload size={32} className="mx-auto mb-3 opacity-20" />
                                <p className="text-[10px] font-black uppercase tracking-[0.2em]">Upload Digital Evidence</p>
                                <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase">Auto-optimizing file size</p>
                              </>
                          )}
                      </div>
                  </div>
                  <div className="p-8 border-t border-slate-100 dark:border-slate-800 flex gap-4 bg-slate-50/50 dark:bg-slate-800/50">
                      <button onClick={() => { setShowAddModal(false); setReceiptPreview(null); }} className="flex-1 bg-white dark:bg-slate-700 text-slate-400 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm">Cancel</button>
                      <button onClick={handleAddExpense} disabled={isCompressing} className="flex-[2] bg-medical-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-medical-500/30 active:scale-95 disabled:opacity-50">Authorize Submission</button>
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
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-4 text-xs font-bold outline-none focus:border-rose-500 dark:text-white resize-none min-h-[100px]"
                        placeholder="Why is this voucher being rejected? (e.g. Missing invoice, Incorrect category...)"
                        value={rejectionReason}
                        onChange={e => setRejectionReason(e.target.value)}
                      />
                  </div>
                  <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex gap-3 border-t border-slate-100 dark:border-slate-800">
                      <button onClick={() => setRejectionModal(null)} className="flex-1 py-3 text-[10px] font-black uppercase text-slate-400 bg-white dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600">Abort</button>
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
                  <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                      <div className="flex items-center gap-3">
                          <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl"><ImageIcon size={18} /></div>
                          <h3 className="font-black text-sm text-slate-800 dark:text-white uppercase tracking-widest">Digital Evidence Proof</h3>
                      </div>
                      <button onClick={() => setViewReceiptModal(null)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-white dark:hover:bg-slate-700 rounded-full transition-all"><X size={24}/></button>
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
                  <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center">
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
    </div>
  );
};
