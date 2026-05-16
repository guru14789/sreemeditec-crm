import React, { useState } from 'react';
import { useData } from './DataContext';
import { BankDetails } from '../types';
import { 
    Landmark, Plus, Trash2, Edit2, X, Check, 
    AlertCircle, CreditCard, Building2, MapPin
} from 'lucide-react';

export const BankDetailsForm: React.FC = () => {
    const { bankDetailsList, addBankDetails, updateBankDetails, removeBankDetails, addNotification, isSystemAdmin } = useData();
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const EMPTY_BANK: BankDetails = {
        id: '',
        bankName: '',
        accountNo: '',
        branchIfsc: '',
        accountType: 'Current',
        isDefault: false
    };

    const [formData, setFormData] = useState<BankDetails>(EMPTY_BANK);

    const handleSave = async () => {
        if (!isSystemAdmin) {
            addNotification('Access Denied', 'Admin privileges required.', 'alert');
            return;
        }

        if (!formData.bankName || !formData.accountNo || !formData.branchIfsc) {
            addNotification('Validation Error', 'All mandatory fields required.', 'alert');
            return;
        }

        if (editingId) {
            await updateBankDetails(editingId, formData);
            addNotification('Success', 'Bank details updated.', 'success');
        } else {
            const newBank = { ...formData, id: `BANK-${Date.now()}` };
            await addBankDetails(newBank);
            addNotification('Success', 'New bank account added.', 'success');
        }

        setIsAdding(false);
        setEditingId(null);
        setFormData(EMPTY_BANK);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Delete this bank account?')) {
            await removeBankDetails(id);
            addNotification('Deleted', 'Bank account removed.', 'warning');
        }
    };

    const startEdit = (bank: BankDetails) => {
        setFormData(bank);
        setEditingId(bank.id);
        setIsAdding(true);
    };

    return (
        <div className="w-full max-w-4xl mx-auto p-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex justify-between items-center mb-8 bg-white dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                        <Landmark size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Bank Details Management</h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{bankDetailsList.length} Registered Accounts</p>
                    </div>
                </div>
                {!isAdding && isSystemAdmin && (
                    <button 
                        onClick={() => { setFormData(EMPTY_BANK); setIsAdding(true); }}
                        className="px-6 py-2.5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
                    >
                        <Plus size={16} /> Add Account
                    </button>
                )}
            </div>

            {isAdding ? (
                <div className="bg-white dark:bg-slate-900/50 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-10 shadow-xl animate-in zoom-in-95 duration-300">
                    <div className="flex justify-between items-center mb-10">
                        <h3 className="text-lg font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">
                            {editingId ? 'Edit Account' : 'New Account Entry'}
                        </h3>
                        <button onClick={() => { setIsAdding(false); setEditingId(null); }} className="text-slate-400 hover:text-slate-600 transition-colors">
                            <X size={24} />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Bank Name *</label>
                            <input 
                                type="text"
                                value={formData.bankName}
                                onChange={e => setFormData({ ...formData, bankName: e.target.value.toUpperCase() })}
                                className="w-full h-14 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 font-black text-slate-700 dark:text-slate-200 uppercase text-sm outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                                placeholder="E.G. HDFC BANK"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Account Number *</label>
                            <input 
                                type="text"
                                value={formData.accountNo}
                                onChange={e => setFormData({ ...formData, accountNo: e.target.value })}
                                className="w-full h-14 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 font-black text-slate-700 dark:text-slate-200 font-mono text-sm outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                                placeholder="000000000000"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Branch & IFSC Code *</label>
                            <input 
                                type="text"
                                value={formData.branchIfsc}
                                onChange={e => setFormData({ ...formData, branchIfsc: e.target.value.toUpperCase() })}
                                className="w-full h-14 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 font-black text-slate-700 dark:text-slate-200 uppercase text-sm outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                                placeholder="BRANCH NAME & IFSC"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Account Type</label>
                            <select 
                                value={formData.accountType}
                                onChange={e => setFormData({ ...formData, accountType: e.target.value })}
                                className="w-full h-14 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 font-black text-slate-700 dark:text-slate-200 uppercase text-sm outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                            >
                                <option value="Current">Current Account</option>
                                <option value="Savings">Savings Account</option>
                                <option value="OD">Overdraft</option>
                            </select>
                        </div>
                    </div>

                    <div className="mt-10 pt-10 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-4">
                        <button 
                            onClick={() => { setIsAdding(false); setEditingId(null); }}
                            className="px-8 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all border border-slate-200 dark:border-slate-700"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleSave}
                            className="px-12 py-4 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-500/20 hover:brightness-110 active:scale-95 transition-all"
                        >
                            {editingId ? 'Update Account' : 'Commit Account'}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {bankDetailsList.map((bank, index) => (
                        <div key={bank.id || `bank-${index}`} className="group bg-white dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 hover:shadow-xl hover:shadow-indigo-500/5 transition-all border-b-4 border-b-transparent hover:border-b-indigo-500">
                            <div className="flex justify-between items-start mb-6">
                                <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-indigo-500 transition-colors">
                                    <CreditCard size={20} />
                                </div>
                                {isSystemAdmin && (
                                    <div className="flex gap-2">
                                        <button onClick={() => startEdit(bank)} className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg transition-all"><Edit2 size={14}/></button>
                                        <button onClick={() => handleDelete(bank.id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-all"><Trash2 size={14}/></button>
                                    </div>
                                )}
                            </div>
                            
                            <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight mb-1">{bank.bankName}</h4>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">{bank.accountType} Account</p>
                            
                            <div className="space-y-4">
                                <div>
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Account Number</p>
                                    <p className="text-sm font-black text-slate-700 dark:text-slate-300 font-mono tracking-wider">{bank.accountNo}</p>
                                </div>
                                <div>
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Branch & IFSC</p>
                                    <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase leading-relaxed">{bank.branchIfsc}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    {bankDetailsList.length === 0 && (
                        <div key="empty-state" className="md:col-span-2 py-20 text-center bg-slate-50 dark:bg-slate-900/20 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center text-slate-300 mx-auto mb-4">
                                <Landmark size={32} />
                            </div>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">No Bank Accounts Defined</p>
                            {isSystemAdmin && (
                                <button 
                                    onClick={() => { setFormData(EMPTY_BANK); setIsAdding(true); }}
                                    className="mt-6 text-indigo-500 text-[10px] font-black uppercase tracking-widest hover:underline"
                                >
                                    + Add your first account
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
