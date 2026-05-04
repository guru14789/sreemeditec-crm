import React, { useState, useMemo, useEffect } from 'react';
import { 
  BookOpen, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Search, 
  Filter, 
  FileText, 
  PieChart, 
  Briefcase, 
  IndianRupee,
  Calendar,
  AlertCircle,
  CheckCircle2,
  MoreVertical,
  ChevronRight,
  Download,
  Printer,
  RefreshCw,
  X,
  CreditCard,
  DollarSign,
  Building2,
  List as ListIcon,
  Save,
  PenTool,
  Trash2,
  Shield,
  Activity
} from 'lucide-react';

import { useData } from './DataContext';
import { VoucherType, Ledger, AccountingVoucher, LedgerEntry, AccountGroup, BillSettlement } from '../types';
import { AuditTrailViewer } from './AuditTrailViewer';
import { TallyService } from '../services/TallyService';
import { AutoSuggest } from './AutoSuggest';

const FormRow = ({ label, children }: { label: string, children?: React.ReactNode }) => (
    <div className="flex flex-col gap-1.5 w-full">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 truncate whitespace-nowrap min-h-[14px]">{label}</label>
        {children}
    </div>
);

export const AccountingModule: React.FC = () => {
  const { 
    ledgers = [], 
    vouchers = [], 
    accountGroups = [], 
    invoices = [],
    postToLedger, 
    addNotification,
    fetchMoreData
  } = useData();
  const [activeTab, setActiveTab] = useState<'ledgers' | 'vouchers' | 'reports' | 'reconciliation' | 'trial-balance'>('ledgers');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddVoucher, setShowAddVoucher] = useState(false);
  const [selectedLedger, setSelectedLedger] = useState<Ledger | null>(null);
  const [selectedVoucher, setSelectedVoucher] = useState<AccountingVoucher | null>(null);
  const [viewVoucherTab, setViewVoucherTab] = useState<'details' | 'audit'>('details');

  // --- BILL SETTLEMENT STATE ---
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [currentSettlementIdx, setCurrentSettlementIdx] = useState<number | null>(null);
  const [voucherSettlements, setVoucherSettlements] = useState<BillSettlement[]>([]);

  // --- MANUAL VOUCHER STATE ---
  const [newVoucher, setNewVoucher] = useState<Partial<AccountingVoucher>>({
    type: 'Journal',
    date: new Date().toISOString().split('T')[0],
    entries: [
      { id: '1', ledgerId: '', ledgerName: '', debit: 0, credit: 0 },
      { id: '2', ledgerId: '', ledgerName: '', debit: 0, credit: 0 }
    ],
    narration: '',
    totalAmount: 0,
    tdsRate: 0,
    tdsSection: ''
  });

  const filteredLedgers = useMemo(() => {
    return ledgers.filter(l => 
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [ledgers, searchQuery]);

  const filteredVouchers = useMemo(() => {
    return vouchers.filter(v => 
      (v.voucherNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.narration || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [vouchers, searchQuery]);

  const stats = useMemo(() => {
    const cashBank = ledgers.filter(l => l.groupId === 'GRP-CASH' || l.groupId === 'GRP-BANK');
    const totalCashBank = cashBank.reduce((sum, l) => sum + (l.currentBalance || 0), 0);
    const totalDebtors = ledgers.filter(l => l.groupId === 'GRP-DEBTORS').reduce((sum, l) => sum + (l.currentBalance || 0), 0);
    const totalCreditors = ledgers.filter(l => l.groupId === 'GRP-CREDITORS').reduce((sum, l) => sum + Math.abs(l.currentBalance || 0), 0);
    
    return { totalCashBank, totalDebtors, totalCreditors };
  }, [ledgers]);

  const handleAddVoucherEntry = () => {
    setNewVoucher(prev => ({
      ...prev,
      entries: [...(prev.entries || []), { id: Date.now().toString(), ledgerId: '', ledgerName: '', debit: 0, credit: 0 }]
    }));
  };

  const handleUpdateEntry = (id: string, updates: Partial<LedgerEntry>) => {
    setNewVoucher(prev => ({
      ...prev,
      entries: prev.entries?.map(e => e.id === id ? { ...e, ...updates } : e)
    }));
  };

  const handleSaveVoucher = async () => {
    const totalDebit = newVoucher.entries?.reduce((sum, e) => sum + Number(e.debit || 0), 0) || 0;
    const totalCredit = newVoucher.entries?.reduce((sum, e) => sum + Number(e.credit || 0), 0) || 0;

    if (totalDebit !== totalCredit) {
      addNotification('Unbalanced Voucher', 'Total Debit must equal Total Credit.', 'alert');
      return;
    }

    if (totalDebit === 0) {
      addNotification('Invalid Amount', 'Voucher amount cannot be zero.', 'alert');
      return;
    }

    let entries = [...(newVoucher.entries || [])];
    let narration = newVoucher.narration || '';

    if (newVoucher.tdsSection && (newVoucher.tdsRate || 0) > 0) {
      const baseAmount = entries[0]?.debit || entries[0]?.credit || 0;
      const tdsAmount = Math.floor(baseAmount * (newVoucher.tdsRate || 0) / 100);
      
      if (tdsAmount > 0) {
        entries.push({
          id: `TDS-${Date.now()}`,
          ledgerId: 'LED-TDS-PAYABLE',
          ledgerName: `TDS Payable (${newVoucher.tdsSection})`,
          debit: 0,
          credit: tdsAmount
        });
        
        const secondEntryIdx = entries.findIndex((e, idx) => idx > 0 && (e.credit > 0 || e.debit > 0));
        if (secondEntryIdx !== -1) {
          if (entries[secondEntryIdx].credit > 0) entries[secondEntryIdx].credit -= tdsAmount;
          else if (entries[secondEntryIdx].debit > 0) entries[secondEntryIdx].debit -= tdsAmount;
        }
        
        narration += ` | TDS @${newVoucher.tdsRate}% Sec ${newVoucher.tdsSection}`;
      }
    }

    await postToLedger({
      ...newVoucher,
      entries,
      narration,
      totalAmount: totalDebit,
      settlements: voucherSettlements
    });

    setShowAddVoucher(false);
    setVoucherSettlements([]);
    addNotification('Transaction Posted', `Voucher recorded in audit trail.`, 'success');
    setNewVoucher({
      type: 'Journal',
      date: new Date().toISOString().split('T')[0],
      entries: [
        { id: '1', ledgerId: '', ledgerName: '', debit: 0, credit: 0 },
        { id: '2', ledgerId: '', ledgerName: '', debit: 0, credit: 0 }
      ],
      narration: '',
      totalAmount: 0,
      tdsRate: 0,
      tdsSection: ''
    });
  };

  const getOutstandingBills = (ledgerId: string) => {
    const ledger = ledgers.find(l => l.id === ledgerId);
    if (!ledger) return [];
    return invoices.filter(inv => 
      inv.customerName === ledger.name && 
      (inv.balanceDue === undefined || inv.balanceDue > 0) &&
      inv.status !== 'Draft' &&
      inv.documentType === 'Invoice'
    );
  };

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden p-2">
      {/* High Density Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          { label: 'Liquidity (Cash/Bank)', value: stats.totalCashBank, icon: IndianRupee, color: 'text-medical-600', bg: 'bg-medical-50' },
          { label: 'Market Receivables', value: stats.totalDebtors, icon: ArrowUpRight, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Market Payables', value: stats.totalCreditors, icon: ArrowDownLeft, color: 'text-rose-600', bg: 'bg-rose-50' }
        ].map((stat, i) => (
          <div key={i} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className={`p-3 ${stat.bg} ${stat.color} rounded-xl`}>
              <stat.icon size={20} />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <p className="text-lg font-black text-slate-800 tracking-tight">₹{stat.value.toLocaleString('en-IN')}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex bg-white p-1 rounded-2xl border border-slate-300 w-fit shrink-0 shadow-sm overflow-x-auto no-scrollbar">
          {[
            { id: 'ledgers', label: 'Ledgers', icon: BookOpen },
            { id: 'vouchers', label: 'Vouchers', icon: FileText },
            { id: 'reports', label: 'P&L / BS', icon: PieChart },
            { id: 'trial-balance', label: 'Trial Bal', icon: Briefcase },
            { id: 'reconciliation', label: 'Bank Reco', icon: CheckCircle2 }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-medical-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
      </div>

      <div className="flex-1 bg-white rounded-3xl border border-slate-300 shadow-sm flex flex-col overflow-hidden animate-in fade-in">
        <div className="p-4 border-b border-slate-200 bg-slate-50/30 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search index..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl pl-11 pr-4 py-2.5 text-xs font-bold outline-none focus:ring-4 focus:ring-medical-500/5"
              />
            </div>
            <button 
              onClick={() => setShowAddVoucher(true)}
              className="w-full sm:w-auto bg-slate-800 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-slate-500/20 active:scale-95"
            >
              <Plus size={16} /> New Voucher
            </button>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">
          {activeTab === 'ledgers' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4 sm:p-6">
              {filteredLedgers.map(ledger => (
                <div 
                  key={ledger.id}
                  onClick={() => setSelectedLedger(ledger)}
                  className="bg-slate-50 hover:bg-white p-5 rounded-2xl border border-slate-200 hover:border-medical-400 hover:shadow-xl transition-all cursor-pointer group flex flex-col justify-between h-[140px]"
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-white rounded-xl text-medical-600 shadow-sm group-hover:bg-medical-600 group-hover:text-white transition-all">
                        <BookOpen size={16} />
                        </div>
                        <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 bg-slate-200 rounded-lg text-slate-500">
                        {ledger.groupId.replace('GRP-', '')}
                        </span>
                    </div>
                    <h4 className="font-black text-slate-800 text-xs uppercase mb-1 line-clamp-1">{ledger.name}</h4>
                  </div>
                  <div className="flex justify-between items-end">
                    <p className="text-[9px] font-black text-slate-400 uppercase">Balance</p>
                    <p className={`text-sm font-black tracking-tighter ${(ledger.currentBalance || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      ₹{Math.abs(ledger.currentBalance || 0).toLocaleString('en-IN')}
                      <span className="text-[9px] ml-1">{(ledger.currentBalance || 0) >= 0 ? 'Dr' : 'Cr'}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'vouchers' && (
            <table className="w-full text-left text-[11px]">
               <thead className="bg-slate-50 sticky top-0 z-10 text-[8px] uppercase font-black tracking-widest text-slate-400 border-b">
                 <tr>
                   <th className="px-6 py-4">Voucher #</th>
                   <th className="px-6 py-4">Date</th>
                   <th className="px-6 py-4">Type</th>
                   <th className="px-6 py-4">Narration</th>
                   <th className="px-6 py-4 text-right">Amount</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                 {filteredVouchers.map(v => (
                   <tr key={v.id} onClick={() => { setSelectedVoucher(v); setViewVoucherTab('details'); }} className="hover:bg-slate-50 transition-colors cursor-pointer group">
                     <td className="px-6 py-4 font-black text-medical-600">{v.voucherNumber}</td>
                     <td className="px-6 py-4 font-bold text-slate-400">{v.date}</td>
                     <td className="px-6 py-4">
                       <span className="px-2 py-0.5 bg-slate-100 rounded-lg font-black text-[9px] uppercase tracking-widest">{v.type}</span>
                     </td>
                     <td className="px-6 py-4 font-bold text-slate-600 italic truncate max-w-[200px]">{v.narration}</td>
                     <td className="px-6 py-4 text-right font-black text-slate-900 text-sm">₹{(v.totalAmount || 0).toLocaleString('en-IN')}</td>
                   </tr>
                 ))}
               </tbody>
               <tfoot>
                 <tr>
                    <td colSpan={5} className="p-6 border-t bg-slate-50/50 flex justify-center">
                        <button 
                            onClick={() => fetchMoreData('vouchers', 'date')}
                            className="group flex items-center gap-2 px-8 py-3 bg-white text-slate-500 hover:text-medical-600 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm border border-slate-200 transition-all hover:scale-105 active:scale-95"
                        >
                            <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
                            Load Archive
                        </button>
                    </td>
                 </tr>
               </tfoot>
            </table>
          )}

          {activeTab === 'reports' && (
            <div className="p-4 sm:p-8 space-y-6 animate-in fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-50 p-6 sm:p-8 rounded-[2rem] border border-slate-200 shadow-sm">
                        <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2 border-b pb-2">
                            <PieChart size={16} className="text-indigo-500" />
                            Profit & Loss Statement
                        </h3>
                        <div className="space-y-4">
                            {accountGroups.filter(g => g.type === 'Revenue' || g.type === 'Expense').map(group => {
                                const groupLedgers = ledgers.filter(l => l.groupId === group.id);
                                const balance = groupLedgers.reduce((sum, l) => sum + (l.currentBalance || 0), 0);
                                return (
                                    <div key={group.id} className="flex justify-between items-center text-[11px]">
                                        <span className="font-bold text-slate-500 uppercase tracking-tight">{group.name}</span>
                                        <span className={`font-black ${balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>₹{Math.abs(balance).toLocaleString('en-IN')}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <div className="bg-slate-50 p-6 sm:p-8 rounded-[2rem] border border-slate-200 shadow-sm">
                        <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2 border-b pb-2">
                            <Briefcase size={16} className="text-emerald-500" />
                            Balance Sheet Overview
                        </h3>
                        <div className="space-y-4">
                            {accountGroups.filter(g => g.type === 'Asset' || g.type === 'Liability').map(group => {
                                const groupLedgers = ledgers.filter(l => l.groupId === group.id);
                                const balance = groupLedgers.reduce((sum, l) => sum + (l.currentBalance || 0), 0);
                                return (
                                    <div key={group.id} className="flex justify-between items-center text-[11px]">
                                        <span className="font-bold text-slate-500 uppercase tracking-tight">{group.name}</span>
                                        <span className="font-black text-slate-800">₹{Math.abs(balance).toLocaleString('en-IN')}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
          )}

          {activeTab === 'trial-balance' && <TrialBalanceView ledgers={ledgers} accountGroups={accountGroups} />}
          {activeTab === 'reconciliation' && <BankReconciliationTerminal />}
        </div>
      </div>

      {/* Manual Voucher Entry Modal */}
      {showAddVoucher && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-2 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-[2rem] sm:rounded-[3rem] shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col scale-100 animate-in zoom-in-95 overflow-hidden">
            <div className="p-6 sm:p-8 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2"><PenTool size={20} className="text-medical-600"/> Voucher Terminal</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Manual adjustment | Fiscal Registry</p>
              </div>
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <div className="flex gap-2">
                    <button onClick={() => { const xml = TallyService.generateVoucherXML(vouchers); const blob = new Blob([xml], { type: 'text/xml' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'Tally_Vouchers.xml'; link.click(); }} className="px-3 py-1.5 bg-white text-indigo-600 rounded-xl border border-indigo-100 text-[9px] font-black uppercase shadow-sm">Vouchers XML</button>
                    <button onClick={() => { const xml = TallyService.generateLedgerXML(ledgers); const blob = new Blob([xml], { type: 'text/xml' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'Tally_Masters.xml'; link.click(); }} className="px-3 py-1.5 bg-white text-emerald-600 rounded-xl border border-emerald-100 text-[9px] font-black uppercase shadow-sm">Masters XML</button>
                </div>
                <select className="flex-1 sm:flex-none h-[42px] bg-white border border-slate-300 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest outline-none" value={newVoucher.type} onChange={(e) => setNewVoucher({...newVoucher, type: e.target.value as VoucherType})}>
                  <option>Journal</option><option>Contra</option><option>Payment</option><option>Receipt</option><option>Debit Note</option><option>Credit Note</option>
                </select>
                <input type="date" className="flex-1 sm:flex-none h-[42px] bg-white border border-slate-300 rounded-xl px-4 py-2 text-xs font-black outline-none" value={newVoucher.date} onChange={(e) => setNewVoucher({...newVoucher, date: e.target.value})} />
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 sm:p-8 space-y-8 custom-scrollbar">
              <div className="space-y-4">
                <div className="hidden sm:grid grid-cols-12 gap-4 text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">
                    <div className="col-span-6">Account Ledger</div>
                    <div className="col-span-2 text-right">Debit (₹)</div>
                    <div className="col-span-2 text-right">Credit (₹)</div>
                    <div className="col-span-2"></div>
                </div>
                <div className="space-y-3">
                    {newVoucher.entries?.map((entry, idx) => (
                        <div key={entry.id} className="grid grid-cols-1 sm:grid-cols-12 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 hover:border-medical-300 transition-all items-center">
                            <div className="col-span-1 sm:col-span-6">
                                <AutoSuggest
                                    value={entry.ledgerName || ''}
                                    onChange={(val) => handleUpdateEntry(entry.id, { ledgerName: val })}
                                    onSelect={(l) => handleUpdateEntry(entry.id, { ledgerId: l.id, ledgerName: l.name })}
                                    suggestions={ledgers}
                                    filterKey="name"
                                    placeholder="Search ledger..."
                                    className="w-full h-[42px] bg-white border border-slate-300 rounded-xl px-4 py-2 text-xs font-black uppercase outline-none"
                                />
                            </div>
                            <div className="col-span-1 sm:col-span-2">
                                <input type="number" className="w-full h-[42px] bg-white border border-slate-300 rounded-xl px-4 text-right font-black text-emerald-600 text-sm outline-none" placeholder="0.00" value={entry.debit || ''} onChange={(e) => handleUpdateEntry(entry.id, { debit: Number(e.target.value), credit: 0 })} />
                            </div>
                            <div className="col-span-1 sm:col-span-2 relative">
                                <input type="number" className="w-full h-[42px] bg-white border border-slate-300 rounded-xl px-4 text-right font-black text-rose-600 text-sm outline-none" placeholder="0.00" value={entry.credit || ''} onChange={(e) => handleUpdateEntry(entry.id, { credit: Number(e.target.value), debit: 0 })} />
                                {(newVoucher.type === 'Receipt' || newVoucher.type === 'Payment') && entry.ledgerId && (
                                   <button onClick={() => { setCurrentSettlementIdx(idx); setShowSettlementModal(true); }} className="absolute -bottom-5 right-0 text-[8px] font-black uppercase text-medical-600 hover:underline">Adjust Bills</button>
                                )}
                            </div>
                            <div className="col-span-1 sm:col-span-2 flex justify-end">
                                <button onClick={() => setNewVoucher(prev => ({ ...prev, entries: prev.entries?.filter(e => e.id !== entry.id) }))} className="p-2 text-rose-300 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={16}/></button>
                            </div>
                        </div>
                    ))}
                </div>
                <button onClick={handleAddVoucherEntry} className="text-[10px] font-black uppercase tracking-widest text-medical-600 flex items-center gap-2 bg-medical-50 px-4 py-2 rounded-xl hover:bg-medical-100 transition-all border border-medical-100">+ Add Row</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                <FormRow label="Transaction Narration">
                  <textarea className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-xs font-bold outline-none focus:ring-4 focus:ring-medical-500/5 resize-none h-[100px]" placeholder="Audit trail context..." value={newVoucher.narration || ''} onChange={(e) => setNewVoucher({...newVoucher, narration: e.target.value})} />
                </FormRow>
                {(newVoucher.type === 'Payment' || newVoucher.type === 'Receipt') && (
                  <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 space-y-4 shadow-sm">
                    <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-2"><Shield size={14}/> Statutory Deduction (TDS)</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <FormRow label="TDS Section">
                          <select className="w-full h-[42px] bg-white border border-amber-200 rounded-xl px-4 py-2 text-[10px] font-black uppercase outline-none" value={newVoucher.tdsSection || ''} onChange={(e) => { const section = e.target.value; let rate = 0; if (section === '194C') rate = 1; if (section === '194J') rate = 10; if (section === '194I') rate = 10; setNewVoucher(prev => ({ ...prev, tdsSection: section, tdsRate: rate })); }}>
                             <option value="">None</option><option value="194C">194C (Cont. - 1%)</option><option value="194J">194J (Prof. - 10%)</option><option value="194I">194I (Rent - 10%)</option>
                          </select>
                        </FormRow>
                        <div className="flex flex-col justify-center">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">TDS Amount</p>
                          <p className="text-lg font-black text-amber-600">₹{((newVoucher.entries?.[0]?.debit || newVoucher.entries?.[0]?.credit || 0) * (newVoucher.tdsRate || 0) / 100).toLocaleString('en-IN')}</p>
                        </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 sm:p-8 border-t border-slate-100 bg-slate-50/90 backdrop-blur-md flex flex-col sm:flex-row gap-4">
                <div className="flex-1 flex justify-between sm:justify-start gap-12 order-2 sm:order-1 px-4">
                    <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Debit</p><p className="text-xl font-black text-emerald-600">₹{newVoucher.entries?.reduce((sum, e) => sum + Number(e.debit || 0), 0).toLocaleString('en-IN')}</p></div>
                    <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Credit</p><p className="text-xl font-black text-rose-600">₹{newVoucher.entries?.reduce((sum, e) => sum + Number(e.credit || 0), 0).toLocaleString('en-IN')}</p></div>
                </div>
                <div className="flex-1 flex gap-3 order-1 sm:order-2">
                    <button onClick={() => setShowAddVoucher(false)} className="flex-1 bg-white border border-slate-300 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 shadow-sm">Discard</button>
                    <button onClick={handleSaveVoucher} className="flex-[2] bg-slate-800 text-white py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-500/20 active:scale-95 flex items-center justify-center gap-2"><Save size={16}/> Post Transaction</button>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* Ledger Detail Modal */}
      {selectedLedger && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-2 sm:p-4 animate-in fade-in">
           <div className="bg-white rounded-[2rem] sm:rounded-[3.5rem] shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col scale-100 animate-in zoom-in-95 overflow-hidden">
             <div className="p-6 sm:p-10 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-slate-50/50">
               <div className="flex items-center gap-5">
                 <div className="p-4 bg-medical-600 text-white rounded-[1.5rem] shadow-xl shadow-medical-500/20">
                   <BookOpen size={28} />
                 </div>
                 <div>
                   <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight leading-none">{selectedLedger.name}</h3>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-2"><Building2 size={12}/> Account Index | {selectedLedger.id}</p>
                 </div>
               </div>
               <div className="flex gap-2 w-full sm:w-auto">
                  <button className="flex-1 sm:flex-none p-3.5 bg-white text-slate-500 rounded-2xl border border-slate-200 shadow-sm hover:bg-slate-50 transition-all"><Printer size={20} /></button>
                  <button className="flex-1 sm:flex-none p-3.5 bg-white text-slate-500 rounded-2xl border border-slate-200 shadow-sm hover:bg-slate-50 transition-all"><Download size={20} /></button>
                  <button onClick={() => setSelectedLedger(null)} className="flex-1 sm:flex-none p-3.5 bg-white text-slate-500 rounded-2xl border border-slate-200 shadow-sm hover:bg-slate-50 transition-all"><X size={20} /></button>
               </div>
             </div>

             <div className="flex-1 overflow-auto custom-scrollbar">
               <table className="w-full text-left text-[11px]">
                 <thead className="bg-slate-50 text-[9px] uppercase font-black tracking-widest text-slate-400 sticky top-0 border-b z-10">
                   <tr>
                     <th className="px-8 py-5">Execution Date</th>
                     <th className="px-8 py-5">Offset Account (Particulars)</th>
                     <th className="px-8 py-5">Vch Type</th>
                     <th className="px-8 py-5">Registry #</th>
                     <th className="px-8 py-5 text-right">Debit (₹)</th>
                     <th className="px-8 py-5 text-right">Credit (₹)</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {vouchers
                     .filter(v => (v.entries || []).some(e => e.ledgerId === selectedLedger.id))
                     .map(v => {
                       const entry = v.entries.find(e => e.ledgerId === selectedLedger.id)!;
                       const oppositeEntries = v.entries.filter(e => e.ledgerId !== selectedLedger.id);
                       return (
                         <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                           <td className="px-8 py-6 font-bold text-slate-400">{v.date}</td>
                           <td className="px-8 py-6">
                             <div className="font-black text-slate-800 uppercase truncate max-w-[250px]">
                               {oppositeEntries.map(e => e.ledgerName).join(', ') || 'Self Reference'}
                             </div>
                             <p className="text-[10px] text-slate-400 font-bold mt-1 italic leading-tight">"{v.narration}"</p>
                           </td>
                           <td className="px-8 py-6 uppercase font-black text-[9px]"><span className="px-2 py-0.5 bg-slate-100 rounded-lg">{v.type}</span></td>
                           <td className="px-8 py-6 font-black text-medical-600">{v.voucherNumber}</td>
                           <td className="px-8 py-6 text-right font-black text-emerald-600">{(entry.debit || 0) > 0 ? `₹${entry.debit.toLocaleString('en-IN')}` : '---'}</td>
                           <td className="px-8 py-6 text-right font-black text-rose-600">{(entry.credit || 0) > 0 ? `₹${entry.credit.toLocaleString('en-IN')}` : '---'}</td>
                         </tr>
                       );
                     })}
                 </tbody>
               </table>
             </div>

             <div className="p-6 sm:p-10 border-t border-slate-100 bg-slate-50/90 backdrop-blur-md flex flex-col sm:flex-row justify-between items-center gap-8">
               <div className="flex flex-wrap gap-8 sm:gap-12 justify-center sm:justify-start">
                  <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Opening Balance</p><p className="font-black text-slate-800 uppercase tracking-tight">₹{(selectedLedger.openingBalance || 0).toLocaleString('en-IN')}</p></div>
                  <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Debit</p><p className="font-black text-emerald-600 uppercase tracking-tight">₹{vouchers.filter(v => (v.entries || []).some(e => e.ledgerId === selectedLedger.id)).reduce((sum, v) => sum + (v.entries.find(e => e.ledgerId === selectedLedger.id)!.debit || 0), 0).toLocaleString('en-IN')}</p></div>
                  <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Credit</p><p className="font-black text-rose-600 uppercase tracking-tight">₹{vouchers.filter(v => (v.entries || []).some(e => e.ledgerId === selectedLedger.id)).reduce((sum, v) => sum + (v.entries.find(e => e.ledgerId === selectedLedger.id)!.credit || 0), 0).toLocaleString('en-IN')}</p></div>
               </div>
               <div className="text-center sm:text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Closing Account Balance</p>
                  <p className={`text-4xl font-black tracking-tighter ${(selectedLedger.currentBalance || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    ₹{Math.abs(selectedLedger.currentBalance || 0).toLocaleString('en-IN')}
                    <span className="text-base ml-2">{(selectedLedger.currentBalance || 0) >= 0 ? 'Dr' : 'Cr'}</span>
                  </p>
               </div>
             </div>
           </div>
         </div>
       )}

      {selectedVoucher && (
        <VoucherDetailModal voucher={selectedVoucher} tab={viewVoucherTab} onTabChange={setViewVoucherTab} onClose={() => setSelectedVoucher(null)} />
      )}

      {/* Bill Settlement Modal */}
      {showSettlementModal && currentSettlementIdx !== null && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg flex flex-col scale-100 animate-in zoom-in-95 overflow-hidden">
            <div className="p-8 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2"><ListIcon size={20} className="text-indigo-600"/> Bill Settlement</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 leading-tight">Allocate to: <span className="text-indigo-600">{newVoucher.entries?.[currentSettlementIdx]?.ledgerName}</span></p>
            </div>
            <div className="flex-1 overflow-auto p-6 sm:p-8 space-y-4 custom-scrollbar">
              <div className="bg-indigo-600 p-6 rounded-3xl flex justify-between items-center shadow-xl shadow-indigo-200">
                <span className="text-[10px] font-black text-indigo-100 uppercase tracking-widest">Unallocated Pool</span>
                <span className="text-2xl font-black text-white">
                  ₹{((newVoucher.entries?.[currentSettlementIdx]?.debit || newVoucher.entries?.[currentSettlementIdx]?.credit || 0) - voucherSettlements.reduce((sum, s) => sum + (s.amount || 0), 0)).toLocaleString('en-IN')}
                </span>
              </div>

              <div className="space-y-3">
                {getOutstandingBills(newVoucher.entries?.[currentSettlementIdx]?.ledgerId || '').map(bill => {
                    const existing = voucherSettlements.find(s => s.invoiceId === bill.id);
                    return (
                    <div key={bill.id} className="p-5 rounded-2xl border border-slate-200 hover:border-indigo-400 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50 group hover:bg-white shadow-sm hover:shadow-md">
                        <div>
                        <p className="text-xs font-black text-slate-800 uppercase group-hover:text-indigo-600 transition-colors">{bill.invoiceNumber}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">{bill.date} | Bal: <span className="text-indigo-500">₹{(bill.balanceDue || bill.grandTotal || 0).toLocaleString('en-IN')}</span></p>
                        </div>
                        <div className="relative w-full sm:w-32">
                            <input 
                                type="number" 
                                placeholder="Adjust ₹" 
                                className="w-full h-[42px] bg-white border border-slate-300 rounded-xl px-4 text-right text-sm font-black outline-none focus:ring-4 focus:ring-indigo-500/10" 
                                value={existing?.amount || ''} 
                                onChange={(e) => { 
                                    const amt = Number(e.target.value); 
                                    setVoucherSettlements(prev => { 
                                        const other = prev.filter(s => s.invoiceId !== bill.id); 
                                        return amt > 0 ? [...other, { invoiceId: bill.id, invoiceNumber: bill.invoiceNumber || '', amount: amt, date: newVoucher.date || '', voucherId: '' }] : other; 
                                    }); 
                                }} 
                            />
                        </div>
                    </div>
                    );
                })}
              </div>

              {getOutstandingBills(newVoucher.entries?.[currentSettlementIdx]?.ledgerId || '').length === 0 && (
                <div className="text-center py-12 opacity-20"><Search size={48} className="mx-auto mb-3"/><p className="text-[10px] font-black uppercase tracking-widest">No Outstanding Invoices</p></div>
              )}
            </div>
            <div className="p-8 border-t border-slate-100 bg-slate-50/90 backdrop-blur-md flex gap-4">
              <button onClick={() => { setShowSettlementModal(false); setVoucherSettlements([]); }} className="flex-1 bg-white border border-slate-300 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400">Clear</button>
              <button onClick={() => setShowSettlementModal(false)} className="flex-[2] bg-indigo-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20 active:scale-95">Confirm Allocation</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const VoucherDetailModal: React.FC<{ 
  voucher: AccountingVoucher, 
  tab: 'details' | 'audit',
  onTabChange: (t: 'details' | 'audit') => void,
  onClose: () => void 
}> = ({ voucher, tab, onTabChange, onClose }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-2 sm:p-4 animate-in fade-in">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col scale-100 animate-in zoom-in-95 overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-slate-800 text-white rounded-2xl shadow-lg">
              <FileText size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{voucher.voucherNumber}</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-2"><Calendar size={12}/> {voucher.type} Registry | {voucher.date}</p>
            </div>
          </div>
          
          <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm w-full sm:w-auto">
            <button onClick={() => onTabChange('details')} className={`flex-1 sm:flex-none px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'details' ? 'bg-medical-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Summary</button>
            <button onClick={() => onTabChange('audit')} className={`flex-1 sm:flex-none px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'audit' ? 'bg-medical-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Audit Trail</button>
          </div>

          <button onClick={onClose} className="hidden sm:block p-3 bg-white text-slate-400 rounded-xl border border-slate-200 hover:text-slate-600 transition-all shadow-sm"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">
          {tab === 'details' ? (
            <div className="p-6 sm:p-10 space-y-8">
               <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-50 text-[9px] uppercase font-black tracking-widest text-slate-400 border-b">
                        <tr><th className="px-8 py-5">Account Particulars</th><th className="px-8 py-5 text-right w-32">Debit (₹)</th><th className="px-8 py-5 text-right w-32">Credit (₹)</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {voucher.entries.map(e => (
                        <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-8 py-6"><p className="font-black text-slate-800 uppercase tracking-tight text-xs">{e.ledgerName}</p><p className="text-[9px] text-slate-400 font-bold uppercase mt-1 leading-none">{e.ledgerId}</p></td>
                            <td className="px-8 py-6 text-right font-black text-emerald-600 text-sm">{(e.debit || 0) > 0 ? `₹${e.debit.toLocaleString('en-IN')}` : '---'}</td>
                            <td className="px-8 py-6 text-right font-black text-rose-600 text-sm">{(e.credit || 0) > 0 ? `₹${e.credit.toLocaleString('en-IN')}` : '---'}</td>
                        </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                        <tr className="font-black">
                            <td className="px-8 py-6 uppercase tracking-widest text-slate-400 text-[9px]">Consolidated Totals</td>
                            <td className="px-8 py-6 text-right text-emerald-600 text-base">₹{(voucher.totalAmount || 0).toLocaleString('en-IN')}</td>
                            <td className="px-8 py-6 text-right text-rose-600 text-base">₹{(voucher.totalAmount || 0).toLocaleString('en-IN')}</td>
                        </tr>
                    </tfoot>
                </table>
               </div>
               <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-200 shadow-inner">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2"><MessageSquare size={14}/> Narration Statement</p>
                  <p className="text-sm font-bold text-slate-600 leading-relaxed italic">"{voucher.narration || 'No narrative recorded for this transaction.'}"</p>
               </div>
            </div>
          ) : (
            <div className="p-6 sm:p-10 h-full"><AuditTrailViewer history={voucher.editHistory || []} /></div>
          )}
        </div>
      </div>
    </div>
  );
};

const BankReconciliationTerminal: React.FC = () => {
  const { ledgers, vouchers, updateVoucher, addNotification } = useData();
  const [selectedBank, setSelectedBank] = useState<string>('');
  
  const bankLedgers = ledgers.filter(l => l.groupId === 'GRP-CASH' || l.groupId === 'GRP-BANK');
  
  const bookBalance = useMemo(() => {
    const l = ledgers.find(lg => lg.id === selectedBank);
    return l ? (l.currentBalance || 0) : 0;
  }, [ledgers, selectedBank]);

  const unreconciledVouchers = useMemo(() => {
    if (!selectedBank) return [];
    return vouchers.filter(v => 
      (v.entries || []).some(e => e.ledgerId === selectedBank) && 
      !v.bankReconciliationDate
    );
  }, [vouchers, selectedBank]);

  const handleMatch = async (vId: string) => {
    const v = vouchers.find(v => v.id === vId);
    if (!v) return;
    const recoDate = new Date().toISOString().split('T')[0];
    await updateVoucher(vId, { bankReconciliationDate: recoDate }, `Bank reconciliation matched on ${recoDate}`);
    addNotification('Reconciled', `Voucher matched with bank on ${recoDate}`, 'success');
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 animate-in fade-in">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-80 space-y-4">
          <div className="bg-slate-50 p-6 sm:p-8 rounded-[2rem] border border-slate-200 shadow-sm">
            <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2"><Building2 size={16} className="text-indigo-500"/> Select Account</h3>
            <select className="w-full h-[46px] bg-white border border-slate-300 rounded-xl px-4 py-2 text-xs font-black uppercase outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-sm" value={selectedBank} onChange={(e) => setSelectedBank(e.target.value)}>
              <option value="">Select Cash/Bank Account...</option>
              {bankLedgers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>

          {selectedBank && (
            <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-slate-200 shadow-xl space-y-6 animate-in slide-in-from-left-4">
              <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2"><Activity size={16}/> Reco Summary</h3>
              <div className="space-y-4">
                <div className="flex justify-between text-[10px] font-black uppercase"><span className="text-slate-400">Book Balance</span><span className="text-slate-800">₹{bookBalance.toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between text-[10px] font-black uppercase"><span className="text-slate-400">Uncleared (+)</span><span className="text-emerald-600">₹{unreconciledVouchers.filter(v => v.entries.find(e => e.ledgerId === selectedBank)!.debit > 0).reduce((sum, v) => sum + (v.totalAmount || 0), 0).toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between text-[10px] font-black uppercase"><span className="text-slate-400">Unpresented (-)</span><span className="text-rose-600">₹{unreconciledVouchers.filter(v => v.entries.find(e => e.ledgerId === selectedBank)!.credit > 0).reduce((sum, v) => sum + (v.totalAmount || 0), 0).toLocaleString('en-IN')}</span></div>
                <div className="pt-4 border-t border-slate-100 flex justify-between items-end"><span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Expected Bank</span><span className="text-lg font-black text-indigo-600">₹{(bookBalance + unreconciledVouchers.reduce((sum, v) => { const e = v.entries.find(ent => ent.ledgerId === selectedBank)!; return sum + ((e.debit || 0) - (e.credit || 0)); }, 0)).toLocaleString('en-IN')}</span></div>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1">
          {!selectedBank ? (
            <div className="h-[400px] bg-slate-50 rounded-[3rem] border-4 border-dashed border-slate-100 flex flex-col items-center justify-center text-center p-12 opacity-50">
               <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-slate-200 mb-6 shadow-sm"><CheckCircle2 size={40} /></div>
               <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Reconciliation Terminal</h4>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] max-w-[240px] mt-2 leading-relaxed">Select a financial ledger to synchronize book entries with bank statements.</p>
            </div>
          ) : (
            <div className="bg-white rounded-[2.5rem] border border-slate-300 shadow-xl overflow-hidden flex flex-col animate-in fade-in">
              <div className="p-6 sm:p-8 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/30">
                 <div className="text-center sm:text-left">
                   <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Pending Book Entries</h4>
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Verification sequence required</p>
                 </div>
                 <button className="w-full sm:w-auto bg-slate-800 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-slate-500/20 active:scale-95" onClick={() => addNotification('Info', 'CSV Import sequence coming soon.', 'info')}><Download size={16} /> Import Statement</button>
              </div>
              
              <div className="overflow-auto max-h-[600px] custom-scrollbar">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-50 text-[9px] uppercase font-black tracking-widest text-slate-400 sticky top-0 border-b z-10">
                    <tr><th className="px-8 py-5">Date</th><th className="px-8 py-5">Particulars</th><th className="px-8 py-5 text-right">Debit (₹)</th><th className="px-8 py-5 text-right">Credit (₹)</th><th className="px-8 py-5 text-center">Action</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {unreconciledVouchers.length === 0 ? (
                      <tr><td colSpan={5} className="py-32 text-center text-slate-300 font-black uppercase tracking-[0.3em] text-[10px]">Registry is Synchronized</td></tr>
                    ) : unreconciledVouchers.map(v => {
                      const entry = v.entries.find(e => e.ledgerId === selectedBank)!;
                      const opposite = v.entries.find(e => e.ledgerId !== selectedBank);
                      return (
                        <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-8 py-6 font-bold text-slate-400">{v.date}</td>
                          <td className="px-8 py-6"><p className="font-black text-slate-800 uppercase">{opposite?.ledgerName || 'Multi-ledger Offset'}</p><p className="text-[9px] text-slate-400 font-bold uppercase mt-1 italic leading-tight truncate max-w-[200px]">"{v.narration}"</p></td>
                          <td className="px-8 py-6 text-right font-black text-emerald-600 text-sm">{(entry.debit || 0) > 0 ? `₹${entry.debit.toLocaleString('en-IN')}` : '---'}</td>
                          <td className="px-8 py-6 text-right font-black text-rose-600 text-sm">{(entry.credit || 0) > 0 ? `₹${entry.credit.toLocaleString('en-IN')}` : '---'}</td>
                          <td className="px-8 py-6 text-center"><button onClick={() => handleMatch(v.id)} className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all">Match Entry</button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const TrialBalanceView: React.FC<{ ledgers: Ledger[], accountGroups: AccountGroup[] }> = ({ ledgers, accountGroups }) => {
  const categories = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'];
  const totals = useMemo(() => {
    return ledgers.reduce((acc, l) => {
      const bal = l.currentBalance || 0;
      if (bal >= 0) acc.debit += bal;
      else acc.credit += Math.abs(bal);
      return acc;
    }, { debit: 0, credit: 0 });
  }, [ledgers]);

  return (
    <div className="p-4 sm:p-8 space-y-8 animate-in fade-in pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 border-b border-slate-100 pb-6">
        <div>
           <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2"><Briefcase size={20} className="text-medical-600"/> Trial Balance Statement</h3>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-2">Integrity Status: <span className={Math.abs(totals.debit - totals.credit) < 0.1 ? 'text-emerald-600' : 'text-rose-600'}>{Math.abs(totals.debit - totals.credit) < 0.1 ? 'Balanced Registry' : 'Mismatch Detected'}</span></p>
        </div>
        <div className="flex gap-8 bg-slate-50 p-6 rounded-3xl border border-slate-200 shadow-inner w-full sm:w-auto">
           <div className="text-right flex-1 sm:flex-none">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Debits</p>
              <p className="text-xl font-black text-emerald-600 tracking-tight">₹{totals.debit.toLocaleString('en-IN')}</p>
           </div>
           <div className="text-right flex-1 sm:flex-none">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Credits</p>
              <p className="text-xl font-black text-rose-600 tracking-tight">₹{totals.credit.toLocaleString('en-IN')}</p>
           </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-300 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-50 text-[9px] uppercase font-black tracking-widest text-slate-400 border-b">
                    <tr><th className="px-8 py-5">Particulars / Fiscal Classification</th><th className="px-8 py-5 text-right w-44">Debit (₹)</th><th className="px-8 py-5 text-right w-44">Credit (₹)</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {categories.map(cat => {
                        const groupsInCat = accountGroups.filter(g => g.type === cat);
                        const ledgersInCat = ledgers.filter(l => groupsInCat.some(g => g.id === l.groupId));
                        const catDebit = ledgersInCat.reduce((sum, l) => sum + ((l.currentBalance || 0) >= 0 ? (l.currentBalance || 0) : 0), 0);
                        const catCredit = ledgersInCat.reduce((sum, l) => sum + ((l.currentBalance || 0) < 0 ? Math.abs(l.currentBalance || 0) : 0), 0);
                        if (ledgersInCat.length === 0) return null;
                        return (
                            <React.Fragment key={cat}>
                                <tr className="bg-slate-50/80"><td className="px-8 py-4 font-black text-slate-800 uppercase tracking-widest text-[10px]">{cat} Ledger Accounts</td><td className="px-8 py-4 text-right font-black text-slate-800">{catDebit > 0 ? `₹${catDebit.toLocaleString('en-IN')}` : '---'}</td><td className="px-8 py-4 text-right font-black text-slate-800">{catCredit > 0 ? `₹${catCredit.toLocaleString('en-IN')}` : '---'}</td></tr>
                                {ledgersInCat.map(l => (
                                    <tr key={l.id} className="hover:bg-slate-50 transition-colors"><td className="px-12 py-3 text-slate-500 font-bold uppercase tracking-tight">{l.name}</td><td className="px-8 py-3 text-right font-black text-emerald-600">{(l.currentBalance || 0) >= 0 ? `₹${(l.currentBalance || 0).toLocaleString('en-IN')}` : '---'}</td><td className="px-8 py-3 text-right font-black text-rose-600">{(l.currentBalance || 0) < 0 ? `₹${Math.abs(l.currentBalance || 0).toLocaleString('en-IN')}` : '---'}</td></tr>
                                ))}
                            </React.Fragment>
                        );
                    })}
                </tbody>
                <tfoot className="bg-slate-900 text-white">
                    <tr><td className="px-8 py-8 font-black uppercase tracking-[0.3em] text-xs">Registry Consolidated Balance</td><td className="px-8 py-8 text-right font-black text-2xl tracking-tighter">₹{totals.debit.toLocaleString('en-IN')}</td><td className="px-8 py-8 text-right font-black text-2xl tracking-tighter">₹{totals.credit.toLocaleString('en-IN')}</td></tr>
                </tfoot>
            </table>
        </div>
      </div>
      
      {Math.abs(totals.debit - totals.credit) > 0.1 && (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-[2rem] flex items-center gap-4 text-rose-600 shadow-lg shadow-rose-100 animate-in slide-in-from-bottom-4">
           <AlertCircle size={24} className="shrink-0" /><p className="text-[11px] font-black uppercase tracking-widest leading-relaxed">Registry Mismatch of ₹{Math.abs(totals.debit - totals.credit).toLocaleString('en-IN')}. Verify audit trail for orphaned ledger postings.</p>
        </div>
      )}
    </div>
  );
};
