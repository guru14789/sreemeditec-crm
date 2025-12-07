
import React, { useState } from 'react';
import { ExpenseRecord } from '../types';
import { Receipt, Plus, FileText, Calendar, IndianRupee, CheckCircle2, Clock, XCircle, Filter, Search } from 'lucide-react';

const MOCK_EXPENSES: ExpenseRecord[] = [
  { id: 'EXP-001', date: '2023-10-25', category: 'Travel', amount: 450, description: 'Auto fare to Apollo Hospital', status: 'Approved' },
  { id: 'EXP-002', date: '2023-10-26', category: 'Food', amount: 120, description: 'Lunch during client visit', status: 'Pending' },
  { id: 'EXP-003', date: '2023-10-24', category: 'Supplies', amount: 2500, description: 'Office stationery', status: 'Approved' },
];

export const ExpenseModule: React.FC = () => {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(MOCK_EXPENSES);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newExpense, setNewExpense] = useState<Partial<ExpenseRecord>>({
      date: new Date().toISOString().split('T')[0],
      category: 'Travel',
      amount: 0,
      description: '',
      status: 'Pending'
  });

  const handleAddExpense = () => {
      if (!newExpense.amount || !newExpense.description) {
          alert("Please enter amount and description");
          return;
      }
      const record: ExpenseRecord = {
          id: `EXP-${Date.now()}`,
          date: newExpense.date!,
          category: newExpense.category as any,
          amount: Number(newExpense.amount),
          description: newExpense.description!,
          status: 'Pending'
      };
      setExpenses([record, ...expenses]);
      setShowAddModal(false);
      setNewExpense({ date: new Date().toISOString().split('T')[0], category: 'Travel', amount: 0, description: '', status: 'Pending' });
  };

  const getStatusColor = (status: string) => {
      switch(status) {
          case 'Approved': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
          case 'Rejected': return 'bg-rose-50 text-rose-700 border-rose-200';
          default: return 'bg-amber-50 text-amber-700 border-amber-200';
      }
  };

  // Stats
  const totalClaimed = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const pendingAmount = expenses.filter(e => e.status === 'Pending').reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="h-full flex flex-col gap-6 overflow-y-auto lg:overflow-hidden p-2">
      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 shrink-0">
          <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-6 rounded-3xl text-white shadow-lg shadow-indigo-500/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-10">
                  <Receipt size={100} />
              </div>
              <div className="relative z-10">
                  <p className="text-indigo-100 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-2">
                      <IndianRupee size={14} /> Total Claimed (Oct)
                  </p>
                  <h3 className="text-3xl font-black tracking-tight mt-1">₹{totalClaimed.toLocaleString()}</h3>
                  <p className="text-xs text-indigo-100/60 mt-2 font-medium">3 Approved, 1 Pending</p>
              </div>
          </div>
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-6 rounded-3xl text-white shadow-lg shadow-orange-500/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-10">
                  <Clock size={100} />
              </div>
              <div className="relative z-10">
                  <p className="text-orange-100 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-2">
                      <Clock size={14} /> Pending Approval
                  </p>
                  <h3 className="text-3xl font-black tracking-tight mt-1">₹{pendingAmount.toLocaleString()}</h3>
                  <p className="text-xs text-orange-100/60 mt-2 font-medium">Expected in next payout</p>
              </div>
          </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden min-h-[500px]">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                  <div className="p-1.5 bg-medical-50 text-medical-600 rounded-lg"><Receipt size={20} /></div> Expense History
              </h2>
              <button 
                  onClick={() => setShowAddModal(true)}
                  className="bg-medical-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-medical-500/20 flex items-center gap-2 hover:bg-medical-700 transition-all active:scale-95">
                  <Plus size={18} /> Add Expense
              </button>
          </div>

          <div className="flex-1 overflow-auto custom-scrollbar p-0">
              <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase font-bold text-slate-500 sticky top-0 z-10">
                      <tr>
                          <th className="px-6 py-4">Date</th>
                          <th className="px-6 py-4">Category</th>
                          <th className="px-6 py-4">Description</th>
                          <th className="px-6 py-4 text-right">Amount</th>
                          <th className="px-6 py-4 text-center">Status</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {expenses.map(expense => (
                          <tr key={expense.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4 font-medium text-slate-500">{expense.date}</td>
                              <td className="px-6 py-4">
                                  <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs font-bold text-slate-600">
                                      {expense.category}
                                  </span>
                              </td>
                              <td className="px-6 py-4 text-slate-700 font-medium">{expense.description}</td>
                              <td className="px-6 py-4 text-right font-black text-slate-800">₹{expense.amount.toLocaleString()}</td>
                              <td className="px-6 py-4 text-center">
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusColor(expense.status)}`}>
                                      {expense.status === 'Approved' && <CheckCircle2 size={12} />}
                                      {expense.status === 'Pending' && <Clock size={12} />}
                                      {expense.status === 'Rejected' && <XCircle size={12} />}
                                      {expense.status}
                                  </span>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md flex flex-col scale-100 animate-in zoom-in-95">
                  <div className="p-6 border-b border-slate-100 bg-slate-50/50 rounded-t-3xl">
                      <h3 className="font-bold text-lg text-slate-800">Log New Expense</h3>
                  </div>
                  <div className="p-6 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Date</label>
                              <input type="date" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:border-medical-500"
                                  value={newExpense.date} onChange={e => setNewExpense({...newExpense, date: e.target.value})} />
                          </div>
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Category</label>
                              <select className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:border-medical-500"
                                  value={newExpense.category} onChange={e => setNewExpense({...newExpense, category: e.target.value as any})}>
                                  <option>Travel</option>
                                  <option>Food</option>
                                  <option>Lodging</option>
                                  <option>Supplies</option>
                                  <option>Other</option>
                              </select>
                          </div>
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Amount (₹)</label>
                          <input type="number" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:border-medical-500"
                              placeholder="0.00" value={newExpense.amount || ''} onChange={e => setNewExpense({...newExpense, amount: Number(e.target.value)})} />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Description</label>
                          <textarea rows={3} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:border-medical-500 resize-none"
                              placeholder="Details of expense..." value={newExpense.description} onChange={e => setNewExpense({...newExpense, description: e.target.value})} />
                      </div>
                      <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-xs font-bold cursor-pointer hover:bg-slate-50 transition-colors">
                          <Plus size={20} className="mx-auto mb-2" />
                          Upload Receipt (Optional)
                      </div>
                  </div>
                  <div className="p-6 border-t border-slate-100 flex gap-3">
                      <button onClick={() => setShowAddModal(false)} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-200 transition-colors">Cancel</button>
                      <button onClick={handleAddExpense} className="flex-1 bg-medical-600 text-white py-3 rounded-xl font-bold hover:bg-medical-700 transition-colors shadow-lg shadow-medical-500/20">Submit Claim</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
