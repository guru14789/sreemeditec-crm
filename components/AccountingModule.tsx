import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  Activity,
  MessageSquare,
  Edit3,
  Check,
  AlertTriangle,
  FolderArchive,
  Pencil,
  Settings,
  Receipt,
  Percent,
  TrendingUp,
  BarChart3,
  Upload,
  Calculator,
  UploadCloud,
  RotateCcw,
  HardDrive,
  Target,
  Lock
} from 'lucide-react';

import { useData } from './DataContext';
import { VoucherType, Ledger, AccountingVoucher, LedgerEntry, AccountGroup, BillSettlement, CostCentre, FixedAsset, BankStatementEntry } from '../types';
import { AuditTrailViewer } from './AuditTrailViewer';
import { TallyService } from '../services/TallyService';
import { AutoSuggest } from './AutoSuggest';

const FormRow = ({ label, children }: { label: string, children?: React.ReactNode }) => (
    <div className="flex flex-col gap-1.5 w-full">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 truncate whitespace-nowrap min-h-[14px]">{label}</label>
        {children}
    </div>
);

interface AccountingModuleProps {
  userRole?: 'Admin' | 'Employee';
}

export const AccountingModule: React.FC<AccountingModuleProps> = ({ userRole }) => {
  const { 
    ledgers = [], 
    vouchers = [], 
    accountGroups = [], 
    invoices = [],
    addLedger,
    updateLedger,
    removeLedger,
    addAccountGroup,
    removeAccountGroup,
    updateAccountGroup,
    reverseVoucher,
    updateVoucher,
    postToLedger, 
    addNotification,
    fetchMoreData
  } = useData();
  const [activeTab, setActiveTab] = useState<'ledgers' | 'vouchers' | 'daybook' | 'reports' | 'trial-balance' | 'reconciliation' | 'aging' | 'gst' | 'costcentres' | 'fixedassets' | 'tds'>('ledgers');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddVoucher, setShowAddVoucher] = useState(false);
  const [selectedLedger, setSelectedLedger] = useState<Ledger | null>(null);
  const [selectedVoucher, setSelectedVoucher] = useState<AccountingVoucher | null>(null);
  const [viewVoucherTab, setViewVoucherTab] = useState<'details' | 'audit'>('details');

  // --- LEDGER EDIT / DELETE STATE ---
  const [editingLedger, setEditingLedger] = useState<Ledger | null>(null);
  const [showEditLedger, setShowEditLedger] = useState(false);
  const [showDeleteLedgerConfirm, setShowDeleteLedgerConfirm] = useState<Ledger | null>(null);

  // --- GROUP MANAGEMENT STATE ---
  const [showGroupManager, setShowGroupManager] = useState(false);
  const [editingGroup, setEditingGroup] = useState<AccountGroup | null>(null);
  const [showEditGroup, setShowEditGroup] = useState(false);
  const [showDeleteGroupConfirm, setShowDeleteGroupConfirm] = useState<AccountGroup | null>(null);

  // --- VOUCHER EDIT STATE ---
  const [editingVoucher, setEditingVoucher] = useState<AccountingVoucher | null>(null);

  // --- DAYBOOK STATE ---
  const [daybookDate, setDaybookDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // --- BILL SETTLEMENT STATE ---
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [currentSettlementIdx, setCurrentSettlementIdx] = useState<number | null>(null);
  const [voucherSettlements, setVoucherSettlements] = useState<BillSettlement[]>([]);
  const [entriesLocked, setEntriesLocked] = useState(false);
  const [selectedRefInvoice, setSelectedRefInvoice] = useState<string>('');

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

  // --- LEDGER / GROUP CREATION STATES ---
  const [showAddLedger, setShowAddLedger] = useState(false);
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [newLedger, setNewLedger] = useState<Partial<Ledger>>({
    name: '',
    groupId: '',
    openingBalance: 0,
    currentBalance: 0,
    description: '',
    gstin: '',
    email: '',
    phone: ''
  });
  const [newGroup, setNewGroup] = useState<Partial<AccountGroup>>({
    name: '',
    type: 'Asset',
    parentGroupId: ''
  });

  const computedRunningBalances = useMemo(() => {
    if (!selectedLedger) return [];
    const entries = vouchers
      .filter(v => (v.entries || []).some(e => e.ledgerId === selectedLedger.id))
      .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

    let balance = selectedLedger.openingBalance || 0;
    return entries.map(v => {
      const entry = v.entries.find(e => e.ledgerId === selectedLedger.id)!;
      balance += (entry.debit || 0) - (entry.credit || 0);
      return {
        voucher: v,
        entry,
        runningBalance: balance
      };
    });
  }, [vouchers, selectedLedger]);

  const handleCreateGroup = async () => {
    if (!newGroup.name) {
      addNotification('Validation Error', 'Group name is required.', 'alert');
      return;
    }
    const id = `GRP-${Date.now()}`;
    const group: AccountGroup = {
      id,
      name: newGroup.name.toUpperCase(),
      type: newGroup.type || 'Asset',
      parentGroupId: newGroup.parentGroupId || undefined
    };
    await addAccountGroup(group);
    addNotification('Group Created', `"${group.name}" registered.`, 'success');
    setShowAddGroup(false);
    setNewGroup({
      name: '',
      type: 'Asset',
      parentGroupId: ''
    });
  };

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
    // From ledger balances (Firestore-synced)
    const cashBankIds = ledgers.filter(l => l.groupId === 'GRP-CASH' || l.groupId === 'GRP-BANK').map(l => l.id);
    const debtorIds = ledgers.filter(l => l.groupId === 'GRP-DEBTORS').map(l => l.id);
    const creditorIds = ledgers.filter(l => l.groupId === 'GRP-CREDITORS').map(l => l.id);

    let totalCashBank = cashBankIds.reduce((sum, id) => sum + (ledgers.find(l => l.id === id)?.currentBalance || 0), 0);
    let totalDebtors = debtorIds.reduce((sum, id) => sum + (ledgers.find(l => l.id === id)?.currentBalance || 0), 0);
    let totalCreditors = creditorIds.reduce((sum, id) => sum + Math.abs(ledgers.find(l => l.id === id)?.currentBalance || 0), 0);

    // Also compute directly from voucher entries for real-time accuracy
    // (catches entries posted but not yet reflected in ledger balances)
    const voucherBalances: Record<string, number> = {};
    vouchers.forEach(v => {
      (v.entries || []).forEach(e => {
        voucherBalances[e.ledgerId] = (voucherBalances[e.ledgerId] || 0) + (e.debit || 0) - (e.credit || 0);
      });
    });

    // Merge: use voucher-computed balance if it differs from ledger balance
    const getEffectiveBalance = (ledgerId: string) => {
      const ledger = ledgers.find(l => l.id === ledgerId);
      const ledgerBal = ledger?.currentBalance || 0;
      const voucherBal = voucherBalances[ledgerId] || 0;
      return voucherBal !== 0 ? voucherBal : ledgerBal;
    };

    totalCashBank = cashBankIds.reduce((sum, id) => sum + getEffectiveBalance(id), 0);
    totalDebtors = debtorIds.reduce((sum, id) => sum + getEffectiveBalance(id), 0);
    totalCreditors = creditorIds.reduce((sum, id) => sum + Math.abs(getEffectiveBalance(id)), 0);

    return { totalCashBank, totalDebtors, totalCreditors };
  }, [ledgers, vouchers]);

  const handleAddVoucherEntry = () => {
    setNewVoucher(prev => ({
      ...prev,
      entries: [...(prev.entries || []), { id: Date.now().toString(), ledgerId: '', ledgerName: '', debit: 0, credit: 0 }]
    }));
  };

  const handleUpdateEntry = (id: string, updates: Partial<LedgerEntry>) => {
    if (entriesLocked) return;
    setNewVoucher(prev => ({
      ...prev,
      entries: prev.entries?.map(e => e.id === id ? { ...e, ...updates } : e)
    }));
  };

  const generateAutoEntries = (type: VoucherType, totalAmount: number, customerName?: string): LedgerEntry[] => {
    if (type === 'Sales') {
      const salesLedger = ledgers.find(l => l.id === 'LDG-SALES');
      const cgstLedger = ledgers.find(l => l.id === 'LDG-CGST-OUT');
      const sgstLedger = ledgers.find(l => l.id === 'LDG-SGST-OUT');
      return [
        { id: `${Date.now()}-DEBTOR`, ledgerId: '', ledgerName: customerName || 'Sundry Debtor', debit: totalAmount, credit: 0, autoGenerated: true },
        { id: `${Date.now()}-SALES`, ledgerId: salesLedger?.id || '', ledgerName: 'Sales Account', debit: 0, credit: Math.round(totalAmount * 0.82 * 100) / 100, autoGenerated: true },
        { id: `${Date.now()}-CGST`, ledgerId: cgstLedger?.id || '', ledgerName: 'Output CGST', debit: 0, credit: Math.round(totalAmount * 0.09 * 100) / 100, autoGenerated: true },
        { id: `${Date.now()}-SGST`, ledgerId: sgstLedger?.id || '', ledgerName: 'Output SGST', debit: 0, credit: Math.round(totalAmount * 0.09 * 100) / 100, autoGenerated: true },
      ];
    }
    if (type === 'Purchase') {
      return [
        { id: `${Date.now()}-PUR`, ledgerId: '', ledgerName: 'Purchase Account', debit: totalAmount, credit: 0, autoGenerated: true },
        { id: `${Date.now()}-CREDITOR`, ledgerId: '', ledgerName: customerName || 'Sundry Creditor', debit: 0, credit: totalAmount, autoGenerated: true },
      ];
    }
    return [];
  };

  const resetVoucherForm = () => {
    setEntriesLocked(false);
    setSelectedRefInvoice('');
    setVoucherSettlements([]);
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

    if (newVoucher.type === 'Contra') {
      const invalidEntries = (newVoucher.entries || []).filter(e => {
        const ledger = ledgers.find(l => l.id === e.ledgerId);
        return !ledger || (ledger.groupId !== 'GRP-CASH' && ledger.groupId !== 'GRP-BANK');
      });
      if (invalidEntries.length > 0) {
        addNotification('Contra Validation Failed', 'Contra entries must only use Cash or Bank ledgers.', 'alert');
        return;
      }
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

    // Strip UI-only flags before saving
    const cleanEntries = entries.map(({ autoGenerated, ...rest }) => rest);

    if (editingVoucher) {
      await reverseVoucher(editingVoucher.id, `Edited: ${narration || 'Corrected entries'}`);
      await postToLedger({
        ...newVoucher,
        entries: cleanEntries,
        narration: `[EDITED] ${narration}`,
        totalAmount: totalDebit,
        settlements: voucherSettlements
      });
      setEditingVoucher(null);
      addNotification('Transaction Updated', 'Original reversed and corrected voucher posted.', 'success');
    } else {
      await postToLedger({
        ...newVoucher,
        entries: cleanEntries,
        narration,
        totalAmount: totalDebit,
        settlements: voucherSettlements
      });
      addNotification('Transaction Posted', `Voucher recorded in audit trail.`, 'success');
    }

    setShowAddVoucher(false);
    resetVoucherForm();
  };

  const getOutstandingBills = (ledgerId: string) => {
    const ledger = ledgers.find(l => l.id === ledgerId);
    if (!ledger) return [];
    // Match by customer name, GSTIN, phone, or email (in order of reliability)
    return invoices.filter(inv => 
      (inv.customerName === ledger.name ||
       (ledger.email && inv.email && inv.email.toLowerCase() === ledger.email.toLowerCase()) ||
       (ledger.phone && inv.phone === ledger.phone) ||
       (ledger.gstin && inv.customerGstin === ledger.gstin)) &&
      (inv.balanceDue === undefined || inv.balanceDue > 0) &&
      inv.status !== 'Draft' &&
      inv.documentType === 'Invoice'
    );
  };

  const handleCreateLedger = async () => {
    if (!newLedger.name || !newLedger.groupId) {
      addNotification('Validation Error', 'Name and Group are required.', 'alert');
      return;
    }
    const id = `LED-${Date.now()}`;
    const ledger: Ledger = {
      id,
      name: newLedger.name.toUpperCase(),
      groupId: newLedger.groupId,
      openingBalance: Number(newLedger.openingBalance || 0),
      currentBalance: Number(newLedger.openingBalance || 0),
      description: newLedger.description || '',
      gstin: newLedger.gstin || '',
      email: newLedger.email || '',
      phone: newLedger.phone || ''
    };
    await addLedger(ledger);
    addNotification('Ledger Created', `"${ledger.name}" registered.`, 'success');
    setShowAddLedger(false);
    setNewLedger({
      name: '',
      groupId: '',
      openingBalance: 0,
      currentBalance: 0,
      description: '',
      gstin: '',
      email: '',
      phone: ''
    });
  };

  const handleEditLedger = async () => {
    if (!editingLedger || !editingLedger.name || !editingLedger.groupId) {
      addNotification('Validation Error', 'Name and Group are required.', 'alert');
      return;
    }
    const updates: Partial<Ledger> = {
      name: editingLedger.name.toUpperCase(),
      groupId: editingLedger.groupId,
      openingBalance: Number(editingLedger.openingBalance || 0),
      currentBalance: Number(editingLedger.currentBalance || 0),
      description: editingLedger.description || '',
      gstin: editingLedger.gstin || '',
      email: editingLedger.email || '',
      phone: editingLedger.phone || ''
    };
    await updateLedger(editingLedger.id, updates);
    addNotification('Ledger Updated', `"${editingLedger.name}" modified.`, 'success');
    setShowEditLedger(false);
    setEditingLedger(null);
  };

  const handleDeleteLedger = async () => {
    if (!showDeleteLedgerConfirm) return;
    try {
      await removeLedger(showDeleteLedgerConfirm.id);
      addNotification('Ledger Deleted', `"${showDeleteLedgerConfirm.name}" removed.`, 'success');
    } catch (err: any) {
      addNotification('Error', err.message || 'Cannot delete ledger with non-zero balance.', 'alert');
    }
    setShowDeleteLedgerConfirm(null);
  };

  const handleEditVoucher = (voucher: AccountingVoucher) => {
    setEditingVoucher(voucher);
    setNewVoucher({
      type: voucher.type,
      date: voucher.date,
      entries: voucher.entries.map(e => ({ ...e })),
      narration: voucher.narration,
      totalAmount: voucher.totalAmount,
      tdsRate: voucher.tdsRate || 0,
      tdsSection: voucher.tdsSection || ''
    });
    setShowAddVoucher(true);
  };

  const handleEditGroup = async () => {
    if (!editingGroup || !editingGroup.name) {
      addNotification('Validation Error', 'Group name is required.', 'alert');
      return;
    }
    await updateAccountGroup(editingGroup.id, {
      name: editingGroup.name.toUpperCase(),
      type: editingGroup.type || 'Asset',
      parentGroupId: editingGroup.parentGroupId || undefined
    });
    addNotification('Group Updated', `"${editingGroup.name}" modified.`, 'success');
    setShowEditGroup(false);
    setEditingGroup(null);
  };

  const handleDeleteGroup = async () => {
    if (!showDeleteGroupConfirm) return;
    const linkedLedgers = ledgers.filter(l => l.groupId === showDeleteGroupConfirm.id);
    if (linkedLedgers.length > 0) {
      addNotification('Error', `Cannot delete group with ${linkedLedgers.length} linked ledger(s). Reassign ledgers first.`, 'alert');
      setShowDeleteGroupConfirm(null);
      return;
    }
    await removeAccountGroup(showDeleteGroupConfirm.id);
    addNotification('Group Deleted', `"${showDeleteGroupConfirm.name}" removed.`, 'success');
    setShowDeleteGroupConfirm(null);
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

      <div className="w-full bg-white p-1 rounded-2xl border border-slate-300 shadow-sm overflow-x-auto no-scrollbar">
          <div className="flex gap-1 min-w-max">
            {[
              { id: 'ledgers', label: 'Ledgers', icon: BookOpen },
              { id: 'vouchers', label: 'Vouchers', icon: FileText },
              { id: 'daybook', label: 'Day Book', icon: Calendar },
              { id: 'reports', label: 'P&L / BS', icon: PieChart },
              { id: 'trial-balance', label: 'Trial Bal', icon: Briefcase },
              { id: 'reconciliation', label: 'Bank Reco', icon: CheckCircle2 },
              { id: 'aging', label: 'Aging', icon: TrendingUp },
              { id: 'gst', label: 'GST', icon: Percent },
              { id: 'costcentres', label: 'Cost Ctr', icon: Target },
              { id: 'fixedassets', label: 'Assets', icon: HardDrive },
              { id: 'tds', label: 'TDS', icon: Shield }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 sm:px-5 py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all shrink-0 whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'bg-medical-600 text-white shadow-md' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <tab.icon size={13} />
                {tab.label}
              </button>
            ))}
          </div>
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
            <div className="flex flex-wrap gap-2 w-full sm:w-auto items-center">
              {activeTab === 'ledgers' && (
                <>
                  <button 
                    onClick={() => setShowAddGroup(true)} 
                    className="px-5 py-2.5 bg-white text-indigo-600 border border-indigo-200 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all"
                  >
                    + Group
                  </button>
                  <button 
                    onClick={() => { setShowGroupManager(true); }} 
                    className="px-5 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all"
                  >
                    <Settings size={14}/> Groups
                  </button>
                  <button 
                    onClick={() => setShowAddLedger(true)} 
                    className="px-5 py-2.5 bg-white text-emerald-600 border border-emerald-200 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all"
                  >
                    + Ledger
                  </button>
                </>
              )}
              {activeTab === 'daybook' && (
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Target Date:</span>
                  <input 
                    type="date" 
                    className="h-[38px] bg-white border border-slate-300 rounded-xl px-4 text-xs font-black outline-none" 
                    value={daybookDate} 
                    onChange={(e) => setDaybookDate(e.target.value)} 
                  />
                </div>
              )}
              <button 
                onClick={() => setShowAddVoucher(true)}
                className="bg-slate-800 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-slate-500/20 active:scale-95"
              >
                <Plus size={16} /> New Voucher
              </button>
            </div>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">
          {activeTab === 'ledgers' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4 sm:p-6">
              {filteredLedgers.map(ledger => (
                <div 
                  key={ledger.id}
                  onClick={() => setSelectedLedger(ledger)}
                  className="bg-slate-50 hover:bg-white p-5 rounded-2xl border border-slate-200 hover:border-medical-400 hover:shadow-xl transition-all cursor-pointer group flex flex-col justify-between h-[140px] relative"
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-white rounded-xl text-medical-600 shadow-sm group-hover:bg-medical-600 group-hover:text-white transition-all">
                        <BookOpen size={16} />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 bg-slate-200 rounded-lg text-slate-500">
                          {ledger.groupId.replace('GRP-', '')}
                          </span>
                          <div className="relative">
                            <button 
                              onClick={(e) => { e.stopPropagation(); setEditingLedger(ledger); setShowEditLedger(true); }} 
                              className="p-1 text-slate-300 hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-all"
                              title="Edit Ledger"
                            >
                              <Pencil size={12} />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); setShowDeleteLedgerConfirm(ledger); }} 
                              className="p-1 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                              title="Delete Ledger"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
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
          {activeTab === 'daybook' && <DayBookView vouchers={vouchers} date={daybookDate} onVoucherSelect={setSelectedVoucher} />}
          {activeTab === 'aging' && <AgingView invoices={invoices} />}
          {activeTab === 'gst' && <GSTView invoices={invoices} />}
          {activeTab === 'costcentres' && <CostCentreManager />}
          {activeTab === 'fixedassets' && <FixedAssetRegister />}
          {activeTab === 'tds' && <TDSRegisterView />}
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
                <select className="flex-1 sm:flex-none h-[42px] bg-white border border-slate-300 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest outline-none" value={newVoucher.type} onChange={(e) => {
                  const newType = e.target.value as VoucherType;
                  if (newType === 'Sales' || newType === 'Purchase') {
                    setEntriesLocked(true);
                    setNewVoucher(prev => ({
                      ...prev,
                      type: newType,
                      entries: generateAutoEntries(newType, prev.totalAmount || 0)
                    }));
                  } else {
                    setEntriesLocked(false);
                    setSelectedRefInvoice('');
                    setNewVoucher(prev => ({
                      ...prev,
                      type: newType,
                      entries: [
                        { id: '1', ledgerId: '', ledgerName: '', debit: 0, credit: 0 },
                        { id: '2', ledgerId: '', ledgerName: '', debit: 0, credit: 0 }
                      ]
                    }));
                  }
                }}>
                  <option>Journal</option><option>Contra</option><option>Payment</option><option>Receipt</option><option>Sales</option><option>Purchase</option><option>Debit Note</option><option>Credit Note</option>
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
                          {entriesLocked ? (
                            <>
                              <div className="col-span-1 sm:col-span-6 flex items-center gap-2">
                                <Lock size={12} className="text-slate-300 shrink-0" />
                                <span className="text-xs font-bold text-slate-500 uppercase truncate">{entry.ledgerName || '—'}</span>
                              </div>
                              <div className="col-span-1 sm:col-span-2 text-right">
                                <span className="text-sm font-black text-emerald-600">{entry.debit ? `₹${entry.debit.toLocaleString('en-IN')}` : '—'}</span>
                              </div>
                              <div className="col-span-1 sm:col-span-2 text-right">
                                <span className="text-sm font-black text-rose-600">{entry.credit ? `₹${entry.credit.toLocaleString('en-IN')}` : '—'}</span>
                              </div>
                              <div className="col-span-1 sm:col-span-2" />
                            </>
                          ) : (
                            <>
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
                                {(newVoucher.type === 'Receipt' || newVoucher.type === 'Payment' || newVoucher.type === 'Sales' || newVoucher.type === 'Purchase') && entry.ledgerId && (
                                   <button onClick={() => { setCurrentSettlementIdx(idx); setShowSettlementModal(true); }} className="absolute -bottom-5 right-0 text-[8px] font-black uppercase text-medical-600 hover:underline">Adjust Bills</button>
                                )}
                              </div>
                              <div className="col-span-1 sm:col-span-2 flex justify-end">
                                <button onClick={() => setNewVoucher(prev => ({ ...prev, entries: prev.entries?.filter(e => e.id !== entry.id) }))} className="p-2 text-rose-300 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={16}/></button>
                              </div>
                            </>
                          )}
                        </div>
                    ))}
                </div>
                {!entriesLocked && <button onClick={handleAddVoucherEntry} className="text-[10px] font-black uppercase tracking-widest text-medical-600 flex items-center gap-2 bg-medical-50 px-4 py-2 rounded-xl hover:bg-medical-100 transition-all border border-medical-100">+ Add Row</button>}
              </div>

              {entriesLocked && (
                <div className="bg-blue-50 p-5 rounded-3xl border border-blue-100 space-y-3">
                  <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2"><FileText size={14}/> Invoice Reference</h4>
                  <select className="w-full h-[42px] bg-white border border-blue-200 rounded-xl px-4 py-2 text-xs font-bold outline-none" value={selectedRefInvoice} onChange={(e) => {
                    const invId = e.target.value;
                    setSelectedRefInvoice(invId);
                    const inv = invoices.find(i => i.id === invId);
                    if (inv) {
                      const total = inv.grandTotal;
                      const entries = generateAutoEntries(newVoucher.type as VoucherType, total, inv.customerName);
                      setNewVoucher(prev => ({
                        ...prev,
                        entries,
                        totalAmount: total,
                        referenceId: inv.id,
                        referenceNumber: inv.invoiceNumber,
                        narration: `${prev.type} — ${inv.invoiceNumber} (${inv.customerName})`
                      }));
                    }
                  }}>
                    <option value="">— Select Invoice —</option>
                    {invoices.filter(i => i.documentType === 'Invoice' && i.status !== 'Draft').map(inv => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} — {inv.customerName} (₹{inv.grandTotal.toLocaleString('en-IN')})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                <FormRow label="Transaction Narration">
                  <textarea className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-xs font-bold outline-none focus:ring-4 focus:ring-medical-500/5 resize-none h-[100px]" placeholder="Audit trail context..." value={newVoucher.narration || ''} onChange={(e) => setNewVoucher({...newVoucher, narration: e.target.value})} />
                </FormRow>
                {(newVoucher.type === 'Payment' || newVoucher.type === 'Receipt' || newVoucher.type === 'Sales' || newVoucher.type === 'Purchase') && (
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
        <VoucherDetailModal voucher={selectedVoucher} tab={viewVoucherTab} onTabChange={setViewVoucherTab} onClose={() => setSelectedVoucher(null)} onEdit={handleEditVoucher} />
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

      {/* Add Ledger Modal */}
      {showAddLedger && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg flex flex-col scale-100 animate-in zoom-in-95 overflow-hidden">
            <div className="p-8 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2"><BookOpen size={20} className="text-emerald-600"/> Create Ledger</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 leading-tight">Register a new audited general ledger account</p>
            </div>
            <div className="flex-1 overflow-auto p-6 sm:p-8 space-y-4 custom-scrollbar max-h-[60vh]">
              <FormRow label="Ledger Name *">
                <input type="text" className="w-full h-[42px] bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-bold uppercase outline-none focus:ring-4 focus:ring-emerald-500/5" value={newLedger.name || ''} onChange={(e) => setNewLedger({...newLedger, name: e.target.value})} placeholder="e.g. DUST & CO LTD" />
              </FormRow>
              <FormRow label="Account Group *">
                <select className="w-full h-[42px] bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-bold uppercase outline-none focus:ring-4 focus:ring-emerald-500/5" value={newLedger.groupId || ''} onChange={(e) => setNewLedger({...newLedger, groupId: e.target.value})}>
                  <option value="">Select Group</option>
                  {accountGroups.map(g => (
                    <option key={g.id} value={g.id}>{g.name} ({g.type})</option>
                  ))}
                </select>
              </FormRow>
              <FormRow label="Opening Balance (Dr is positive, Cr is negative)">
                <input type="number" className="w-full h-[42px] bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-bold outline-none focus:ring-4 focus:ring-emerald-500/5" value={newLedger.openingBalance || ''} onChange={(e) => setNewLedger({...newLedger, openingBalance: Number(e.target.value)})} placeholder="0.00" />
              </FormRow>
              <FormRow label="GSTIN / Tax Registry # (Optional)">
                <input type="text" className="w-full h-[42px] bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-bold uppercase outline-none focus:ring-4 focus:ring-emerald-500/5" value={newLedger.gstin || ''} onChange={(e) => setNewLedger({...newLedger, gstin: e.target.value})} placeholder="e.g. 33AAAAA1111A1Z1" />
              </FormRow>
              <div className="grid grid-cols-2 gap-4">
                <FormRow label="Email Address">
                  <input type="email" className="w-full h-[42px] bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-bold outline-none focus:ring-4 focus:ring-emerald-500/5" value={newLedger.email || ''} onChange={(e) => setNewLedger({...newLedger, email: e.target.value})} placeholder="office@vendor.com" />
                </FormRow>
                <FormRow label="Phone Number">
                  <input type="text" className="w-full h-[42px] bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-bold outline-none focus:ring-4 focus:ring-emerald-500/5" value={newLedger.phone || ''} onChange={(e) => setNewLedger({...newLedger, phone: e.target.value})} placeholder="+91 9999999999" />
                </FormRow>
              </div>
              <FormRow label="Description / Audit Notes">
                <input type="text" className="w-full h-[42px] bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-bold outline-none focus:ring-4 focus:ring-emerald-500/5" value={newLedger.description || ''} onChange={(e) => setNewLedger({...newLedger, description: e.target.value})} placeholder="Brief context..." />
              </FormRow>
            </div>
            <div className="p-8 border-t border-slate-100 bg-slate-50/90 backdrop-blur-md flex gap-4">
              <button onClick={() => setShowAddLedger(false)} className="flex-1 bg-white border border-slate-300 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400">Cancel</button>
              <button onClick={handleCreateLedger} className="flex-[2] bg-emerald-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95">Save Ledger</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Ledger Modal */}
      {showEditLedger && editingLedger && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg flex flex-col scale-100 animate-in zoom-in-95 overflow-hidden">
            <div className="p-8 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2"><Pencil size={20} className="text-indigo-600"/> Edit Ledger</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 leading-tight">{editingLedger.id}</p>
            </div>
            <div className="flex-1 overflow-auto p-6 sm:p-8 space-y-4 custom-scrollbar max-h-[60vh]">
              <FormRow label="Ledger Name *">
                <input type="text" className="w-full h-[42px] bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-bold uppercase outline-none focus:ring-4 focus:ring-indigo-500/5" value={editingLedger.name || ''} onChange={(e) => setEditingLedger({...editingLedger, name: e.target.value})} placeholder="e.g. DUST & CO LTD" />
              </FormRow>
              <FormRow label="Account Group *">
                <select className="w-full h-[42px] bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-bold uppercase outline-none focus:ring-4 focus:ring-indigo-500/5" value={editingLedger.groupId || ''} onChange={(e) => setEditingLedger({...editingLedger, groupId: e.target.value})}>
                  <option value="">Select Group</option>
                  {accountGroups.map(g => (
                    <option key={g.id} value={g.id}>{g.name} ({g.type})</option>
                  ))}
                </select>
              </FormRow>
              <FormRow label="Opening Balance (Dr + / Cr -)">
                <input type="number" className="w-full h-[42px] bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5" value={editingLedger.openingBalance || 0} onChange={(e) => setEditingLedger({...editingLedger, openingBalance: Number(e.target.value), currentBalance: Number(e.target.value) + ((editingLedger.currentBalance || 0) - (editingLedger.openingBalance || 0))})} />
              </FormRow>
              <div className="grid grid-cols-2 gap-4">
                <FormRow label="Email">
                  <input type="email" className="w-full h-[42px] bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5" value={editingLedger.email || ''} onChange={(e) => setEditingLedger({...editingLedger, email: e.target.value})} />
                </FormRow>
                <FormRow label="Phone">
                  <input type="text" className="w-full h-[42px] bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5" value={editingLedger.phone || ''} onChange={(e) => setEditingLedger({...editingLedger, phone: e.target.value})} />
                </FormRow>
              </div>
              <FormRow label="GSTIN">
                <input type="text" className="w-full h-[42px] bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-bold uppercase outline-none focus:ring-4 focus:ring-indigo-500/5" value={editingLedger.gstin || ''} onChange={(e) => setEditingLedger({...editingLedger, gstin: e.target.value})} />
              </FormRow>
              <FormRow label="Description">
                <input type="text" className="w-full h-[42px] bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5" value={editingLedger.description || ''} onChange={(e) => setEditingLedger({...editingLedger, description: e.target.value})} />
              </FormRow>
            </div>
            <div className="p-8 border-t border-slate-100 bg-slate-50/90 backdrop-blur-md flex gap-4">
              <button onClick={() => { setShowEditLedger(false); setEditingLedger(null); }} className="flex-1 bg-white border border-slate-300 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400">Cancel</button>
              <button onClick={handleEditLedger} className="flex-[2] bg-indigo-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20 active:scale-95 flex items-center justify-center gap-2"><Save size={16}/> Update Ledger</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Ledger Confirm */}
      {showDeleteLedgerConfirm && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md flex flex-col scale-100 animate-in zoom-in-95 overflow-hidden">
            <div className="p-8 border-b border-slate-100 bg-rose-50/50">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2 text-rose-600"><AlertTriangle size={20}/> Delete Ledger</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 leading-tight">"{showDeleteLedgerConfirm.name}"</p>
            </div>
            <div className="p-8">
              <p className="text-sm font-bold text-slate-600">Are you sure? This action cannot be undone. Ledgers with non-zero balance cannot be deleted.</p>
            </div>
            <div className="p-8 border-t border-slate-100 bg-slate-50/90 backdrop-blur-md flex gap-4">
              <button onClick={() => setShowDeleteLedgerConfirm(null)} className="flex-1 bg-white border border-slate-300 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400">Keep</button>
              <button onClick={handleDeleteLedger} className="flex-[2] bg-rose-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-rose-500/20 active:scale-95">Delete Permanently</button>
            </div>
          </div>
        </div>
      )}

      {/* Group Manager Modal */}
      {showGroupManager && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl flex flex-col scale-100 animate-in zoom-in-95 overflow-hidden">
            <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2"><FolderArchive size={20} className="text-indigo-600"/> Group Management</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{accountGroups.length} groups registered</p>
              </div>
              <button onClick={() => setShowGroupManager(false)} className="p-3 bg-white text-slate-400 rounded-xl border border-slate-200 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-auto p-6 sm:p-8 custom-scrollbar max-h-[60vh]">
              <table className="w-full text-left text-[11px]">
                <thead className="text-[9px] uppercase font-black tracking-widest text-slate-400 border-b">
                  <tr><th className="px-4 py-4">Group Name</th><th className="px-4 py-4">Type</th><th className="px-4 py-4">Parent</th><th className="px-4 py-4">Ledgers</th><th className="px-4 py-4 text-right">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {accountGroups.map(g => {
                    const parentName = g.parentGroupId ? accountGroups.find(ag => ag.id === g.parentGroupId)?.name || '-' : '-';
                    const ledgerCount = ledgers.filter(l => l.groupId === g.id).length;
                    return (
                      <tr key={g.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-4 font-black text-slate-800 uppercase">{g.name}</td>
                        <td className="px-4 py-4"><span className="px-2 py-0.5 bg-slate-100 rounded-lg font-black text-[9px] uppercase tracking-widest">{g.type}</span></td>
                        <td className="px-4 py-4 font-bold text-slate-400">{parentName}</td>
                        <td className="px-4 py-4 font-black text-slate-600">{ledgerCount}</td>
                        <td className="px-4 py-4 text-right">
                          <button onClick={() => { setEditingGroup({ ...g }); setShowEditGroup(true); }} className="p-1.5 text-indigo-400 hover:bg-indigo-50 rounded-lg transition-all mr-1" title="Edit Group"><Pencil size={14} /></button>
                          <button onClick={() => setShowDeleteGroupConfirm(g)} className="p-1.5 text-rose-400 hover:bg-rose-50 rounded-lg transition-all" title="Delete Group"><Trash2 size={14} /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {accountGroups.length === 0 && (
                <div className="py-20 text-center text-[10px] font-black uppercase tracking-widest text-slate-300">No groups defined.</div>
              )}
            </div>
            <div className="p-8 border-t border-slate-100 bg-slate-50/90 backdrop-blur-md flex gap-4">
              <button onClick={() => setShowAddGroup(true)} className="flex-[2] bg-indigo-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20 active:scale-95 flex items-center justify-center gap-2"><Plus size={16}/> Create New Group</button>
              <button onClick={() => setShowGroupManager(false)} className="flex-1 bg-white border border-slate-300 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Group Modal */}
      {showEditGroup && editingGroup && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg flex flex-col scale-100 animate-in zoom-in-95 overflow-hidden">
            <div className="p-8 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2"><FolderArchive size={20} className="text-indigo-600"/> Edit Group</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 leading-tight">{editingGroup.id}</p>
            </div>
            <div className="flex-1 overflow-auto p-6 sm:p-8 space-y-4 custom-scrollbar max-h-[60vh]">
              <FormRow label="Group Name *">
                <input type="text" className="w-full h-[42px] bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-bold uppercase outline-none focus:ring-4 focus:ring-indigo-500/5" value={editingGroup.name || ''} onChange={(e) => setEditingGroup({...editingGroup, name: e.target.value})} placeholder="e.g. STRATEGIC VENDORS" />
              </FormRow>
              <FormRow label="Financial Classification *">
                <select className="w-full h-[42px] bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-bold uppercase outline-none focus:ring-4 focus:ring-indigo-500/5" value={editingGroup.type || 'Asset'} onChange={(e) => setEditingGroup({...editingGroup, type: e.target.value as any})}>
                  <option value="Asset">Asset</option>
                  <option value="Liability">Liability</option>
                  <option value="Equity">Equity</option>
                  <option value="Revenue">Revenue</option>
                  <option value="Expense">Expense</option>
                </select>
              </FormRow>
              <FormRow label="Parent Group (Optional)">
                <select className="w-full h-[42px] bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-bold uppercase outline-none focus:ring-4 focus:ring-indigo-500/5" value={editingGroup.parentGroupId || ''} onChange={(e) => setEditingGroup({...editingGroup, parentGroupId: e.target.value})}>
                  <option value="">None (Top-Level)</option>
                  {accountGroups.filter(g => g.id !== editingGroup.id).map(g => (
                    <option key={g.id} value={g.id}>{g.name} ({g.type})</option>
                  ))}
                </select>
              </FormRow>
            </div>
            <div className="p-8 border-t border-slate-100 bg-slate-50/90 backdrop-blur-md flex gap-4">
              <button onClick={() => { setShowEditGroup(false); setEditingGroup(null); }} className="flex-1 bg-white border border-slate-300 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400">Cancel</button>
              <button onClick={handleEditGroup} className="flex-[2] bg-indigo-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20 active:scale-95 flex items-center justify-center gap-2"><Save size={16}/> Update Group</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Group Confirm */}
      {showDeleteGroupConfirm && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md flex flex-col scale-100 animate-in zoom-in-95 overflow-hidden">
            <div className="p-8 border-b border-slate-100 bg-rose-50/50">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2 text-rose-600"><AlertTriangle size={20}/> Delete Group</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 leading-tight">"{showDeleteGroupConfirm.name}"</p>
            </div>
            <div className="p-8">
              <p className="text-sm font-bold text-slate-600">Are you sure? Groups with linked ledgers cannot be deleted. Reassign ledgers first.</p>
            </div>
            <div className="p-8 border-t border-slate-100 bg-slate-50/90 backdrop-blur-md flex gap-4">
              <button onClick={() => setShowDeleteGroupConfirm(null)} className="flex-1 bg-white border border-slate-300 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400">Keep</button>
              <button onClick={handleDeleteGroup} className="flex-[2] bg-rose-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-rose-500/20 active:scale-95">Delete Group</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Group Modal */}
      {showAddGroup && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg flex flex-col scale-100 animate-in zoom-in-95 overflow-hidden">
            <div className="p-8 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2"><FolderArchive size={20} className="text-indigo-600"/> Create Account Group</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 leading-tight">Define a new parent financial categorization</p>
            </div>
            <div className="flex-1 overflow-auto p-6 sm:p-8 space-y-4 custom-scrollbar max-h-[60vh]">
              <FormRow label="Group Name *">
                <input type="text" className="w-full h-[42px] bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-bold uppercase outline-none focus:ring-4 focus:ring-indigo-500/5" value={newGroup.name || ''} onChange={(e) => setNewGroup({...newGroup, name: e.target.value})} placeholder="e.g. STRATEGIC VENDORS" />
              </FormRow>
              <FormRow label="Financial Classification *">
                <select className="w-full h-[42px] bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-bold uppercase outline-none focus:ring-4 focus:ring-indigo-500/5" value={newGroup.type || ''} onChange={(e) => setNewGroup({...newGroup, type: e.target.value as any})}>
                  <option value="Asset">Asset</option>
                  <option value="Liability">Liability</option>
                  <option value="Income">Income</option>
                  <option value="Expense">Expense</option>
                </select>
              </FormRow>
              <FormRow label="Parent Group (Optional)">
                <select className="w-full h-[42px] bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-bold uppercase outline-none focus:ring-4 focus:ring-indigo-500/5" value={newGroup.parentGroupId || ''} onChange={(e) => setNewGroup({...newGroup, parentGroupId: e.target.value})}>
                  <option value="">None (Top-Level)</option>
                  {accountGroups.map(g => (
                    <option key={g.id} value={g.id}>{g.name} ({g.type})</option>
                  ))}
                </select>
              </FormRow>
            </div>
            <div className="p-8 border-t border-slate-100 bg-slate-50/90 backdrop-blur-md flex gap-4">
              <button onClick={() => setShowAddGroup(false)} className="flex-1 bg-white border border-slate-300 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400">Cancel</button>
              <button onClick={handleCreateGroup} className="flex-[2] bg-indigo-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20 active:scale-95">Save Group</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- COST CENTRE MANAGER ---
const CostCentreManager: React.FC = () => {
  const { costCentres, addCostCentre, updateCostCentre, removeCostCentre, addNotification } = useData();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CostCentre | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSave = async () => {
    if (!name.trim()) {
      addNotification('Error', 'Cost Centre name is required.', 'alert');
      return;
    }
    if (editing) {
      await updateCostCentre(editing.id, { name: name.toUpperCase(), description });
      addNotification('Updated', `Cost Centre "${name}" updated.`, 'success');
    } else {
      await addCostCentre({
        id: `CC-${Date.now()}`,
        name: name.toUpperCase(),
        description
      });
      addNotification('Created', `Cost Centre "${name}" created.`, 'success');
    }
    setShowForm(false);
    setEditing(null);
    setName('');
    setDescription('');
  };

  const handleEdit = (cc: CostCentre) => {
    setEditing(cc);
    setName(cc.name);
    setDescription(cc.description || '');
    setShowForm(true);
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 animate-in fade-in overflow-auto custom-scrollbar flex-1">
      <div className="flex items-center justify-between border-b border-slate-100 pb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl"><Target size={20} /></div>
          <div>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Cost Centre Management</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{costCentres.length} centres registered</p>
          </div>
        </div>
        <button onClick={() => { setShowForm(true); setEditing(null); setName(''); setDescription(''); }} className="bg-slate-800 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-slate-500/20 active:scale-95"><Plus size={16} /> New Centre</button>
      </div>

      {showForm && (
        <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-4 animate-in fade-in">
          <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">{editing ? 'Edit' : 'New'} Cost Centre</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" placeholder="Cost Centre Name *" className="h-[42px] bg-white border border-slate-300 rounded-xl px-4 text-xs font-bold uppercase outline-none" value={name} onChange={(e) => setName(e.target.value)} />
            <input type="text" placeholder="Description (optional)" className="h-[42px] bg-white border border-slate-300 rounded-xl px-4 text-xs font-bold outline-none" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="flex gap-3">
            <button onClick={handleSave} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 active:scale-95"><Save size={14} /> Save</button>
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="px-6 py-2.5 bg-white border border-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[2.5rem] border border-slate-300 shadow-xl overflow-hidden">
        <table className="w-full text-left text-[11px]">
          <thead className="bg-slate-50 text-[9px] uppercase font-black tracking-widest text-slate-400 border-b">
            <tr><th className="px-6 py-4">Code</th><th className="px-6 py-4">Name</th><th className="px-6 py-4">Description</th><th className="px-6 py-4 text-right">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {costCentres.length === 0 ? (
              <tr><td colSpan={4} className="py-16 text-center text-[10px] font-black uppercase tracking-widest text-slate-300">No cost centres defined</td></tr>
            ) : costCentres.map(cc => (
              <tr key={cc.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-mono text-medical-600 font-black text-[10px]">{cc.id}</td>
                <td className="px-6 py-4 font-black text-slate-800 uppercase">{cc.name}</td>
                <td className="px-6 py-4 font-bold text-slate-400">{cc.description || '---'}</td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => handleEdit(cc)} className="p-1.5 text-indigo-400 hover:bg-indigo-50 rounded-lg transition-all mr-1"><Pencil size={14} /></button>
                  <button onClick={() => removeCostCentre(cc.id)} className="p-1.5 text-rose-400 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- FIXED ASSET REGISTER ---
const FixedAssetRegister: React.FC = () => {
  const { fixedAssets, depreciationSchedule, ledgers, accountGroups, addFixedAsset, updateFixedAsset, removeFixedAsset, computeDepreciation, postDepreciationEntry, addLedger, addNotification } = useData();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FixedAsset | null>(null);
  const [form, setForm] = useState<Partial<FixedAsset>>({});

  const handleSave = async () => {
    if (!form.name || !form.purchaseCost || !form.usefulLifeYears) {
      addNotification('Error', 'Name, Cost, and Useful Life are required.', 'alert');
      return;
    }
    if (editing) {
      await updateFixedAsset(editing.id, form);
      addNotification('Updated', `Asset "${form.name}" updated.`, 'success');
    } else {
      // Auto-create asset ledger
      const assetLedgerId = `LED-FA-${Date.now()}`;
      const assetGroup = accountGroups.find(g => g.id === 'GRP-FIXED-ASSETS');
      if (assetGroup) {
        await addLedger({
          id: assetLedgerId,
          name: form.name.toUpperCase(),
          groupId: 'GRP-FIXED-ASSETS',
          openingBalance: Number(form.purchaseCost),
          currentBalance: Number(form.purchaseCost),
          description: `Fixed Asset: ${form.name}`
        });
      }
      const asset: FixedAsset = {
        id: `FA-${Date.now()}`,
        name: form.name.toUpperCase(),
        ledgerId: assetLedgerId,
        purchaseDate: form.purchaseDate || new Date().toISOString().split('T')[0],
        purchaseCost: Number(form.purchaseCost),
        usefulLifeYears: Number(form.usefulLifeYears),
        salvageValue: Number(form.salvageValue || 0),
        depreciationMethod: (form.depreciationMethod as 'SLM' | 'WDV') || 'SLM',
        accumulatedDepreciation: 0,
        netBookValue: Number(form.purchaseCost),
        status: 'Active'
      };
      await addFixedAsset(asset);
      addNotification('Created', `Asset "${asset.name}" registered with ledger.`, 'success');
    }
    setShowForm(false);
    setEditing(null);
    setForm({});
  };

  const handleComputeAll = async () => {
    for (const asset of fixedAssets) {
      if (asset.status === 'Active') {
        await computeDepreciation(asset.id);
      }
    }
    addNotification('Depreciation', 'Computed for all active assets.', 'success');
  };

  const handlePostDepreciation = async (asset: FixedAsset) => {
    const pendingEntries = depreciationSchedule.filter(d => d.assetId === asset.id && !d.id.startsWith('POSTED'));
    const latest = pendingEntries.sort((a, b) => b.date.localeCompare(a.date))[0];
    if (latest) {
      await postDepreciationEntry(asset.id, latest);
      addNotification('Posted', `Depreciation ₹${latest.amount} posted for ${asset.name}.`, 'success');
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 animate-in fade-in overflow-auto custom-scrollbar flex-1">
      <div className="flex items-center justify-between border-b border-slate-100 pb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-amber-100 text-amber-600 rounded-xl"><HardDrive size={20} /></div>
          <div>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Fixed Asset Register</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{fixedAssets.length} assets | {fixedAssets.filter(a => a.status === 'Active').length} active</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleComputeAll} className="px-5 py-2.5 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm active:scale-95"><Calculator size={14} /> Compute Depr.</button>
          <button onClick={() => { setShowForm(true); setEditing(null); setForm({}); }} className="bg-slate-800 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-slate-500/20 active:scale-95"><Plus size={16} /> Register Asset</button>
        </div>
      </div>

      {showForm && (
        <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-4 animate-in fade-in">
          <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">{editing ? 'Edit' : 'Register'} Fixed Asset</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input type="text" placeholder="Asset Name *" className="h-[42px] bg-white border border-slate-300 rounded-xl px-4 text-xs font-bold uppercase outline-none" value={form.name || ''} onChange={(e) => setForm({...form, name: e.target.value})} />
            <input type="number" placeholder="Purchase Cost *" className="h-[42px] bg-white border border-slate-300 rounded-xl px-4 text-xs font-bold outline-none" value={form.purchaseCost || ''} onChange={(e) => setForm({...form, purchaseCost: Number(e.target.value)})} />
            <input type="number" placeholder="Useful Life (Years) *" className="h-[42px] bg-white border border-slate-300 rounded-xl px-4 text-xs font-bold outline-none" value={form.usefulLifeYears || ''} onChange={(e) => setForm({...form, usefulLifeYears: Number(e.target.value)})} />
            <input type="number" placeholder="Salvage Value" className="h-[42px] bg-white border border-slate-300 rounded-xl px-4 text-xs font-bold outline-none" value={form.salvageValue || ''} onChange={(e) => setForm({...form, salvageValue: Number(e.target.value)})} />
            <input type="date" className="h-[42px] bg-white border border-slate-300 rounded-xl px-4 text-xs font-bold outline-none" value={form.purchaseDate || ''} onChange={(e) => setForm({...form, purchaseDate: e.target.value})} />
            <select className="h-[42px] bg-white border border-slate-300 rounded-xl px-4 text-xs font-bold uppercase outline-none" value={form.depreciationMethod || 'SLM'} onChange={(e) => setForm({...form, depreciationMethod: e.target.value as any})}>
              <option value="SLM">Straight Line (SLM)</option>
              <option value="WDV">Written Down Value (WDV)</option>
            </select>
          </div>
          <div className="flex gap-3">
            <button onClick={handleSave} className="px-6 py-2.5 bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/20 active:scale-95"><Save size={14} /> Save</button>
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="px-6 py-2.5 bg-white border border-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {fixedAssets.map(asset => {
          const assetDepSched = depreciationSchedule.filter(d => d.assetId === asset.id).sort((a, b) => a.date.localeCompare(b.date));
          return (
            <div key={asset.id} className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden hover:shadow-lg transition-all">
              <div className="p-6 border-b border-slate-100 flex justify-between items-start">
                <div>
                  <h4 className="font-black text-slate-800 uppercase text-xs">{asset.name}</h4>
                  <p className="text-[9px] font-bold text-slate-400 mt-1">{asset.depreciationMethod} | {asset.usefulLifeYears}yrs life</p>
                </div>
                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${asset.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : asset.status === 'Fully Depreciated' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>{asset.status}</span>
              </div>
              <div className="p-6 space-y-3">
                <div className="flex justify-between text-[10px]"><span className="font-black text-slate-400 uppercase">Cost</span><span className="font-black text-slate-800">₹{asset.purchaseCost.toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between text-[10px]"><span className="font-black text-slate-400 uppercase">Depreciated</span><span className="font-black text-amber-600">₹{Math.round(asset.accumulatedDepreciation).toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between text-[10px] pt-2 border-t border-slate-100"><span className="font-black text-slate-600 uppercase">Net Book Value</span><span className="font-black text-lg text-indigo-600">₹{Math.round(asset.netBookValue).toLocaleString('en-IN')}</span></div>
              </div>
              {assetDepSched.length > 0 && (
                <div className="px-6 pb-4">
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Last 3 Depreciation Entries</p>
                    {assetDepSched.slice(-3).reverse().map(d => (
                      <div key={d.id} className="flex justify-between text-[9px] py-1">
                        <span className="font-bold text-slate-500">{d.date}</span>
                        <span className="font-black text-amber-600">₹{d.amount.toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex gap-2">
                <button onClick={() => handlePostDepreciation(asset)} disabled={asset.status !== 'Active'} className="flex-1 py-2 bg-indigo-600 disabled:bg-slate-300 text-white rounded-xl text-[8px] font-black uppercase tracking-widest active:scale-95 transition-all"><Upload size={12} className="inline mr-1" /> Post Depr.</button>
                <button onClick={() => { setEditing(asset); setForm(asset); setShowForm(true); }} className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-[8px] font-black text-slate-500 uppercase tracking-widest"><Pencil size={12} /></button>
                <button onClick={() => removeFixedAsset(asset.id)} className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-[8px] font-black text-rose-400 uppercase tracking-widest"><Trash2 size={12} /></button>
              </div>
            </div>
          );
        })}
        {fixedAssets.length === 0 && (
          <div className="col-span-full py-16 text-center text-[10px] font-black uppercase tracking-widest text-slate-300">No fixed assets registered</div>
        )}
      </div>
    </div>
  );
};

// --- TDS REGISTER VIEW ---
const TDSRegisterView: React.FC = () => {
  const { vouchers, addNotification } = useData();

  const tdsData = useMemo(() => {
    const tdsVouchers = vouchers.filter(v => v.tdsSection && (v.tdsRate || 0) > 0);
    const bySection: Record<string, { vouchers: AccountingVoucher[], totalBase: number, totalTDS: number }> = {};

    tdsVouchers.forEach(v => {
      const section = v.tdsSection || 'UNKNOWN';
      if (!bySection[section]) bySection[section] = { vouchers: [], totalBase: 0, totalTDS: 0 };
      bySection[section].vouchers.push(v);
      const baseAmount = v.entries?.[0]?.debit || v.entries?.[0]?.credit || 0;
      const tdsAmt = Math.floor(baseAmount * (v.tdsRate || 0) / 100);
      bySection[section].totalBase += baseAmount;
      bySection[section].totalTDS += tdsAmt;
    });

    return bySection;
  }, [vouchers]);

  const totalTDS = useMemo(() => Object.values(tdsData).reduce((s, d) => s + d.totalTDS, 0), [tdsData]);

  const handleExport = () => {
    let csv = 'Section,TDS Rate,Base Amount,TDS Amount,Voucher Count\n';
    Object.entries(tdsData).forEach(([section, data]) => {
      const rate = data.vouchers[0]?.tdsRate || 0;
      csv += `${section},${rate}%,${data.totalBase},${data.totalTDS},${data.vouchers.length}\n`;
    });
    csv += `\nTotal TDS Payable,${totalTDS}\n`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TDS_Register_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addNotification('Exported', 'TDS Register CSV downloaded.', 'success');
  };

  const sectionDetails: Record<string, string> = {
    '194C': 'Contract Payments',
    '194J': 'Professional Fees',
    '194I': 'Rent Payments',
    '194A': 'Interest',
    '194H': 'Commission',
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 animate-in fade-in overflow-auto custom-scrollbar flex-1">
      <div className="flex items-center justify-between border-b border-slate-100 pb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-rose-100 text-rose-600 rounded-xl"><Shield size={20} /></div>
          <div>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">TDS Payable Register</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{Object.keys(tdsData).length} sections | ₹{totalTDS.toLocaleString('en-IN')} total payable</p>
          </div>
        </div>
        <button onClick={handleExport} className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95"><Download size={16} /> Export CSV</button>
      </div>

      {Object.keys(tdsData).length === 0 ? (
        <div className="py-16 text-center">
          <Shield size={48} className="mx-auto text-slate-200 mb-4" />
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">No TDS transactions recorded</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(tdsData).map(([section, data]) => {
            const rate = data.vouchers[0]?.tdsRate || 0;
            return (
              <div key={section} className="bg-white rounded-[2.5rem] border border-slate-300 shadow-xl overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-rose-100 text-rose-600 rounded-xl"><Shield size={16} /></div>
                    <div>
                      <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Section {section}</h4>
                      <p className="text-[9px] font-bold text-slate-400">{sectionDetails[section] || 'Other'} | Rate: {rate}%</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">TDS Payable</p>
                    <p className="text-xl font-black text-rose-600">₹{data.totalTDS.toLocaleString('en-IN')}</p>
                  </div>
                </div>
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-50 text-[9px] uppercase font-black tracking-widest text-slate-400 border-b">
                    <tr><th className="px-6 py-4">Voucher #</th><th className="px-6 py-4">Date</th><th className="px-6 py-4">Narration</th><th className="px-6 py-4 text-right">Base Amount</th><th className="px-6 py-4 text-right">TDS @{rate}%</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.vouchers.map(v => {
                      const baseAmount = v.entries?.[0]?.debit || v.entries?.[0]?.credit || 0;
                      const tdsAmount = Math.floor(baseAmount * rate / 100);
                      return (
                        <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-black text-medical-600">{v.voucherNumber}</td>
                          <td className="px-6 py-4 font-bold text-slate-400">{v.date}</td>
                          <td className="px-6 py-4 font-bold text-slate-600 italic truncate max-w-[200px]">{v.narration}</td>
                          <td className="px-6 py-4 text-right font-black text-slate-600">₹{baseAmount.toLocaleString('en-IN')}</td>
                          <td className="px-6 py-4 text-right font-black text-rose-600">₹{tdsAmount.toLocaleString('en-IN')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-rose-50">
                    <tr>
                      <td colSpan={3} className="px-6 py-4 font-black uppercase tracking-widest text-[10px] text-rose-600">Section {section} Total</td>
                      <td className="px-6 py-4 text-right font-black text-slate-800">₹{data.totalBase.toLocaleString('en-IN')}</td>
                      <td className="px-6 py-4 text-right font-black text-rose-600 text-sm">₹{data.totalTDS.toLocaleString('en-IN')}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            );
          })}

          <div className="bg-slate-900 text-white rounded-[2rem] p-8 flex justify-between items-center shadow-xl">
            <div className="flex items-center gap-4">
              <Shield size={28} className="text-amber-400" />
              <div>
                <h4 className="font-black uppercase tracking-widest text-sm">Consolidated TDS Payable</h4>
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1">Total across all sections</p>
              </div>
            </div>
            <p className="text-3xl font-black">₹{totalTDS.toLocaleString('en-IN')}</p>
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
  onClose: () => void,
  onEdit?: (v: AccountingVoucher) => void
}> = ({ voucher, tab, onTabChange, onClose, onEdit }) => {
  const { reverseVoucher, updateVoucher, addNotification } = useData();
  const [isEditingNarration, setIsEditingNarration] = useState(false);
  const [narrationText, setNarrationText] = useState(voucher.narration || '');
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const isCancelled = voucher.voucherNumber.startsWith('REV/') || (voucher.narration || '').startsWith('[CANCELLED]');

  const handleSaveNarration = async () => {
    try {
      await updateVoucher(voucher.id, { narration: narrationText }, 'Modified transaction narration');
      addNotification('Success', 'Narration updated successfully.', 'success');
      setIsEditingNarration(false);
    } catch (err: any) {
      addNotification('Error', err.message || 'Failed to update narration.', 'alert');
    }
  };

  const handleCancelVoucher = async () => {
    if (!cancelReason.trim()) {
      addNotification('Error', 'Please provide a cancellation reason.', 'alert');
      return;
    }
    try {
      await reverseVoucher(voucher.id, cancelReason);
      addNotification('Voucher Cancelled', 'Reversal entry posted successfully.', 'success');
      setShowCancelPrompt(false);
      onClose();
    } catch (err: any) {
      addNotification('Error', err.message || 'Failed to cancel voucher.', 'alert');
    }
  };

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
                <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-200 shadow-inner relative group">
                   <div className="flex justify-between items-center mb-3">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><MessageSquare size={14}/> Narration Statement</p>
                      {!isEditingNarration ? (
                        <button onClick={() => setIsEditingNarration(true)} className="text-[9px] font-black uppercase text-medical-600 flex items-center gap-1 hover:underline">
                          <Edit3 size={12}/> Edit Narration
                        </button>
                      ) : (
                        <div className="flex gap-2">
                          <button onClick={() => setIsEditingNarration(false)} className="text-[9px] font-black uppercase text-slate-400 hover:underline">Cancel</button>
                          <button onClick={handleSaveNarration} className="text-[9px] font-black uppercase text-emerald-600 flex items-center gap-1 hover:underline"><Check size={12}/> Save</button>
                        </div>
                      )}
                   </div>
                   
                   {isEditingNarration ? (
                     <textarea 
                       className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-4 focus:ring-medical-500/5 resize-none h-[80px]"
                       value={narrationText}
                       onChange={(e) => setNarrationText(e.target.value)}
                     />
                   ) : (
                     <p className="text-sm font-bold text-slate-600 leading-relaxed italic">"{voucher.narration || 'No narrative recorded for this transaction.'}"</p>
                   )}
                </div>

                {!isCancelled && (
                  <div className="flex justify-end pt-4 border-t border-slate-100 gap-3">
                    {onEdit && (
                      <button 
                        onClick={() => { onEdit(voucher); onClose(); }}
                        className="px-6 py-3 bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 transition-all rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 active:scale-95"
                      >
                        <Edit3 size={14}/> Edit Voucher
                      </button>
                    )}
                    <button 
                      onClick={() => setShowCancelPrompt(true)}
                      className="px-6 py-3 bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 transition-all rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 active:scale-95"
                    >
                      <AlertTriangle size={14}/> Cancel / Reverse Voucher
                    </button>
                  </div>
                )}
             </div>
           ) : (
             <div className="p-6 sm:p-10 h-full"><AuditTrailViewer history={voucher.editHistory || []} /></div>
           )}
         </div>
       </div>

       {showCancelPrompt && (
         <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in">
           <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md flex flex-col scale-100 animate-in zoom-in-95 overflow-hidden">
             <div className="p-8 border-b border-slate-100 bg-rose-50/50">
               <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2 text-rose-600"><AlertTriangle size={20}/> Cancel Transaction</h3>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 leading-tight">This will post a counter reversal voucher for audited integrity.</p>
             </div>
             <div className="p-8 space-y-4">
               <FormRow label="Cancellation Reason">
                 <input 
                   type="text" 
                   className="w-full h-[42px] bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-bold outline-none focus:ring-4 focus:ring-rose-500/5"
                   placeholder="e.g. Duplicate voucher entry / Typo in amounts"
                   value={cancelReason}
                   onChange={(e) => setCancelReason(e.target.value)}
                 />
               </FormRow>
             </div>
             <div className="p-8 border-t border-slate-100 bg-slate-50/90 backdrop-blur-md flex gap-4">
               <button onClick={() => { setShowCancelPrompt(false); setCancelReason(''); }} className="flex-1 bg-white border border-slate-300 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400">Abort</button>
               <button onClick={handleCancelVoucher} className="flex-[2] bg-rose-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-rose-500/20 active:scale-95">Post Reversal</button>
             </div>
           </div>
         </div>
       )}
     </div>
   );
 };

const BankReconciliationTerminal: React.FC = () => {
  const { ledgers, vouchers, bankStatements, updateVoucher, uploadBankStatement, autoMatchBankEntries, addNotification, bankDetailsList } = useData();
  const [selectedBank, setSelectedBank] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isAutoMatching, setIsAutoMatching] = useState(false);
  
  const bankLedgers = ledgers.filter(l => l.groupId === 'GRP-CASH' || l.groupId === 'GRP-BANK');

  const currentStatements = useMemo(() => {
    return bankStatements.filter(s => (s as any).ledgerId === selectedBank);
  }, [bankStatements, selectedBank]);
  
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

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedBank) return;
    setIsImporting(true);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      const entries: BankStatementEntry[] = [];
      
      // Auto-detect delimiter (CSV or tab-separated)
      const delimiter = text.includes('\t') ? '\t' : ',';
      // Skip header row
      const startIdx = lines[0].toLowerCase().includes('date') ? 1 : 0;
      
      for (let i = startIdx; i < lines.length; i++) {
        const cols = lines[i].split(delimiter).map(c => c.trim().replace(/^"|"$/g, ''));
        if (cols.length < 3) continue;

        // Expected: Date, Description/Narration, Amount (or Debit, Credit separately)
        const date = cols[0];
        const description = cols[1] || '';
        const amount1 = parseFloat(cols[2]?.replace(/[^0-9.-]/g, '')) || 0;
        const amount2 = parseFloat(cols[3]?.replace(/[^0-9.-]/g, '')) || 0;

        let amount = amount1;
        let type: 'Debit' | 'Credit' = amount >= 0 ? 'Credit' : 'Debit';

        // If we have separate debit/credit columns
        if (cols.length >= 4 && amount1 > 0 && amount2 > 0) {
          amount = amount1 > 0 ? amount1 : amount2;
          type = amount1 > 0 ? 'Debit' : 'Credit';
          amount = amount1 || amount2;
        } else if (amount < 0) {
          amount = Math.abs(amount);
          type = 'Debit';
        }

        entries.push({
          id: `BANK-STMT-${Date.now()}-${i}`,
          date,
          description,
          amount,
          type,
          isMatched: false
        });
      }

      if (entries.length === 0) {
        addNotification('Import Failed', 'No valid entries found in the CSV. Check format: Date, Description, Amount.', 'alert');
        setIsImporting(false);
        return;
      }

      await uploadBankStatement(selectedBank, entries);
      addNotification('Imported', `${entries.length} bank statement entries imported.`, 'success');
    } catch (err: any) {
      addNotification('Import Error', err.message || 'Failed to parse CSV.', 'alert');
    }
    
    setIsImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAutoMatch = async () => {
    if (!selectedBank) return;
    setIsAutoMatching(true);
    const count = await autoMatchBankEntries(selectedBank);
    addNotification('Auto-Match', `${count} entries auto-matched.`, count > 0 ? 'success' : 'info');
    setIsAutoMatching(false);
  };

  const matchedStatements = useMemo(() => currentStatements.filter(s => s.isMatched), [currentStatements]);
  const unmatchedStatements = useMemo(() => currentStatements.filter(s => !s.isMatched), [currentStatements]);

  return (
    <div className="p-4 sm:p-8 space-y-6 animate-in fade-in">
      <input ref={fileInputRef} type="file" accept=".csv,.tsv,.txt" className="hidden" onChange={handleCSVImport} />
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-80 space-y-4">
          <div className="bg-slate-50 p-6 sm:p-8 rounded-[2rem] border border-slate-200 shadow-sm">
            <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2"><Building2 size={16} className="text-indigo-500"/> Select Account</h3>
            <select className="w-full h-[46px] bg-white border border-slate-300 rounded-xl px-4 py-2 text-xs font-black uppercase outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-sm" value={selectedBank} onChange={(e) => setSelectedBank(e.target.value)}>
              <option value="">Select Cash/Bank Account...</option>
              {bankLedgers.map(l => {
                const configBank = bankDetailsList.find(b => b.bankName.toUpperCase() === l.name.toUpperCase());
                const label = configBank ? `${l.name} (${configBank.accountNo})` : l.name;
                return <option key={l.id} value={l.id}>{label}</option>;
              })}
            </select>
          </div>

          {selectedBank && (
            <>
              <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-slate-200 shadow-xl space-y-6 animate-in slide-in-from-left-4">
                <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2"><Activity size={16}/> Reco Summary</h3>
                <div className="space-y-4">
                  <div className="flex justify-between text-[10px] font-black uppercase"><span className="text-slate-400">Book Balance</span><span className="text-slate-800">₹{bookBalance.toLocaleString('en-IN')}</span></div>
                  <div className="flex justify-between text-[10px] font-black uppercase"><span className="text-slate-400">Statement Entries</span><span className="text-slate-800">{currentStatements.length}</span></div>
                  <div className="flex justify-between text-[10px] font-black uppercase"><span className="text-slate-400">Auto-Matched</span><span className="text-emerald-600">{matchedStatements.length}</span></div>
                  <div className="flex justify-between text-[10px] font-black uppercase"><span className="text-slate-400">Pending Match</span><span className="text-amber-600">{unmatchedStatements.length}</span></div>
                  <div className="flex justify-between text-[10px] font-black uppercase"><span className="text-slate-400">Uncleared (+)</span><span className="text-emerald-600">₹{unreconciledVouchers.filter(v => v.entries.find(e => e.ledgerId === selectedBank)!.debit > 0).reduce((sum, v) => sum + (v.totalAmount || 0), 0).toLocaleString('en-IN')}</span></div>
                  <div className="flex justify-between text-[10px] font-black uppercase"><span className="text-slate-400">Unpresented (-)</span><span className="text-rose-600">₹{unreconciledVouchers.filter(v => v.entries.find(e => e.ledgerId === selectedBank)!.credit > 0).reduce((sum, v) => sum + (v.totalAmount || 0), 0).toLocaleString('en-IN')}</span></div>
                  <div className="pt-4 border-t border-slate-100 flex justify-between items-end"><span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Expected Bank</span><span className="text-lg font-black text-indigo-600">₹{(bookBalance + unreconciledVouchers.reduce((sum, v) => { const e = v.entries.find(ent => ent.ledgerId === selectedBank)!; return sum + ((e.debit || 0) - (e.credit || 0)); }, 0)).toLocaleString('en-IN')}</span></div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button onClick={handleAutoMatch} disabled={isAutoMatching} className="w-full py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-95 disabled:opacity-50">
                  <RotateCcw size={14} className={isAutoMatching ? 'animate-spin' : ''} /> {isAutoMatching ? 'Matching...' : 'Auto-Match Entries'}
                </button>
              </div>
            </>
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-6">
          {!selectedBank ? (
            <div className="h-[400px] bg-slate-50 rounded-[3rem] border-4 border-dashed border-slate-100 flex flex-col items-center justify-center text-center p-12 opacity-50">
               <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-slate-200 mb-6 shadow-sm"><CheckCircle2 size={40} /></div>
               <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Reconciliation Terminal</h4>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] max-w-[240px] mt-2 leading-relaxed">Select a financial ledger to synchronize book entries with bank statements.</p>
            </div>
          ) : (
            <>
              {/* Statement Entries */}
              {currentStatements.length > 0 && (
                <div className="bg-white rounded-[2.5rem] border border-slate-300 shadow-xl overflow-hidden">
                  <div className="p-6 border-b border-slate-100 bg-slate-50/30 flex justify-between items-center">
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Bank Statement ({currentStatements.length})</h4>
                    <span className="text-[9px] font-black text-slate-400">{matchedStatements.length} matched | {unmatchedStatements.length} open</span>
                  </div>
                  <div className="overflow-auto max-h-[300px] custom-scrollbar">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-50 text-[9px] uppercase font-black tracking-widest text-slate-400 sticky top-0 border-b z-10">
                        <tr><th className="px-6 py-3">Date</th><th className="px-6 py-3">Description</th><th className="px-6 py-3 text-right">Amount</th><th className="px-6 py-3 text-center">Status</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {currentStatements.sort((a, b) => b.date.localeCompare(a.date)).map(s => (
                          <tr key={s.id} className={`hover:bg-slate-50 transition-colors ${s.isMatched ? 'opacity-60' : ''}`}>
                            <td className="px-6 py-3 font-bold text-slate-400">{s.date}</td>
                            <td className="px-6 py-3 font-bold text-slate-600 truncate max-w-[200px]">{s.description}</td>
                            <td className={`px-6 py-3 text-right font-black ${s.type === 'Credit' ? 'text-emerald-600' : 'text-rose-600'}`}>₹{s.amount.toLocaleString('en-IN')}</td>
                            <td className="px-6 py-3 text-center">
                              <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase ${s.isMatched ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{s.isMatched ? 'Matched' : 'Open'}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Pending Book Entries */}
              <div className="bg-white rounded-[2.5rem] border border-slate-300 shadow-xl overflow-hidden flex flex-col animate-in fade-in">
                <div className="p-6 sm:p-8 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/30">
                    <div className="text-center sm:text-left">
                      <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Pending Book Entries</h4>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Verification sequence required</p>
                    </div>
                    <div className="flex gap-2 items-center">
                      <div className="hidden sm:block relative group">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest cursor-help border-b border-dotted border-slate-300">CSV Format</span>
                        <div className="absolute bottom-full right-0 mb-2 w-64 bg-slate-900 text-white text-[8px] font-bold p-3 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50 leading-relaxed">
                          Expected columns: <span className="text-emerald-300">Date, Description, Amount</span><br/>
                          Or: <span className="text-emerald-300">Date, Description, Debit, Credit</span><br/>
                          Auto-detects comma or tab delimiter.<br/>
                          First row with "date" is treated as header.
                        </div>
                      </div>
                      <button onClick={handleAutoMatch} disabled={isAutoMatching} className="px-4 py-2.5 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 active:scale-95">
                        <RotateCcw size={14} /> Auto-Match
                      </button>
                      <button onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="px-4 py-2.5 bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-slate-500/20 active:scale-95">
                        <UploadCloud size={16} /> {isImporting ? 'Importing...' : 'Import CSV'}
                      </button>
                    </div>
                </div>
                
                <div className="overflow-auto max-h-[400px] custom-scrollbar">
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
            </>
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

const DayBookView: React.FC<{ 
  vouchers: AccountingVoucher[], 
  date: string, 
  onVoucherSelect: (v: AccountingVoucher) => void 
}> = ({ vouchers, date, onVoucherSelect }) => {
  const dayVouchers = useMemo(() => {
    return vouchers
      .filter(v => v.date === date)
      .sort((a, b) => a.id.localeCompare(b.id));
  }, [vouchers, date]);

  const totals = useMemo(() => {
    return dayVouchers.reduce((acc, v) => acc + (v.totalAmount || 0), 0);
  }, [dayVouchers]);

  return (
    <div className="p-4 sm:p-8 space-y-6 animate-in fade-in pb-20 overflow-auto custom-scrollbar flex-1">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 border-b border-slate-100 pb-6">
        <div>
           <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
             <Calendar size={20} className="text-medical-600"/> Day Book Registry
           </h3>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-2">
             Date: <span className="text-medical-600 font-black">{date}</span> | Transactions: <span className="text-medical-600 font-black">{dayVouchers.length}</span>
           </p>
        </div>
        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 shadow-inner w-full sm:w-auto text-right">
           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Consolidated Value</p>
           <p className="text-xl font-black text-slate-800 tracking-tight">₹{totals.toLocaleString('en-IN')}</p>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-300 shadow-xl overflow-hidden">
        <table className="w-full text-left text-[11px]">
            <thead className="bg-slate-50 text-[9px] uppercase font-black tracking-widest text-slate-400 border-b">
                <tr>
                  <th className="px-8 py-5">Vch Number</th>
                  <th className="px-8 py-5">Particulars / Ledgers</th>
                  <th className="px-8 py-5">Vch Type</th>
                  <th className="px-8 py-5 text-right w-44">Total Amount (₹)</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {dayVouchers.length === 0 ? (
                  <tr><td colSpan={4} className="py-32 text-center text-slate-300 font-black uppercase tracking-[0.3em] text-[10px]">No Transactions Logged Today</td></tr>
                ) : dayVouchers.map(v => (
                  <tr key={v.id} onClick={() => onVoucherSelect(v)} className="hover:bg-slate-50 transition-colors cursor-pointer group">
                    <td className="px-8 py-6 font-black text-medical-600">{v.voucherNumber}</td>
                    <td className="px-8 py-6">
                      <div className="font-bold text-slate-800 uppercase">
                        {v.entries.map(e => e.ledgerName).join(' | ')}
                      </div>
                      {v.narration && <p className="text-[9px] text-slate-400 italic font-bold mt-1">"{v.narration}"</p>}
                    </td>
                    <td className="px-8 py-6 uppercase font-black text-[9px]"><span className="px-2 py-0.5 bg-slate-100 rounded-lg">{v.type}</span></td>
                    <td className="px-8 py-6 text-right font-black text-slate-900 text-sm">₹{(v.totalAmount || 0).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
            </tbody>
        </table>
      </div>
    </div>
  );
};

const AGING_BUCKETS = [
  { label: '0–30 Days', min: 0, max: 30, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { label: '31–60 Days', min: 31, max: 60, color: 'text-amber-600', bg: 'bg-amber-50' },
  { label: '61–90 Days', min: 61, max: 90, color: 'text-orange-600', bg: 'bg-orange-50' },
  { label: '90+ Days', min: 91, max: Infinity, color: 'text-rose-600', bg: 'bg-rose-50' },
];

const AgingView: React.FC<{ invoices: any[] }> = ({ invoices }) => {
  const today = new Date();

  const outstanding = useMemo(() => {
    return invoices.filter(inv =>
      inv.status !== 'Draft' &&
      inv.status !== 'Cancelled' &&
      inv.documentType !== 'Quotation' &&
      (inv.balanceDue === undefined || inv.balanceDue > 0)
    );
  }, [invoices]);

  const getAgingBucket = (dateStr: string) => {
    const invDate = new Date(dateStr);
    const daysDiff = Math.floor((today.getTime() - invDate.getTime()) / (1000 * 60 * 60 * 24));
    return AGING_BUCKETS.find(b => daysDiff >= b.min && daysDiff <= b.max) || AGING_BUCKETS[AGING_BUCKETS.length - 1];
  };

  const receivables = useMemo(() => outstanding.filter(i => i.documentType === 'Invoice' || !i.documentType), [outstanding]);
  const payables = useMemo(() => outstanding.filter(i => i.documentType === 'SupplierPO'), [outstanding]);

  const renderAgingTable = (title: string, items: any[], icon: React.ReactNode) => {
    const buckets = AGING_BUCKETS.map(b => {
      const bucketItems = items.filter(i => getAgingBucket(i.date) === b);
      const total = bucketItems.reduce((sum: number, i: any) => sum + (i.balanceDue || i.grandTotal || 0), 0);
      return { ...b, items: bucketItems, total };
    });
    const grandTotal = buckets.reduce((sum: number, b: any) => sum + b.total, 0);

    return (
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
          {icon}
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">{title}</h3>
          <span className="ml-auto text-xs font-black text-slate-500">₹{grandTotal.toLocaleString('en-IN')}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-slate-50 text-[9px] uppercase font-black tracking-widest text-slate-400 border-b">
              <tr>
                <th className="px-6 py-4">Customer / Vendor</th>
                <th className="px-6 py-4">Invoice #</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4 text-right">Balance Due</th>
                <th className="px-6 py-4 text-center">Aging</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length === 0 ? (
                <tr><td colSpan={6} className="py-16 text-center text-[10px] font-black uppercase tracking-widest text-slate-300">No outstanding</td></tr>
              ) : items.map((inv: any) => {
                const bucket = getAgingBucket(inv.date);
                const daysDiff = Math.floor((today.getTime() - new Date(inv.date).getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-black text-slate-800 uppercase">{inv.customerName}</td>
                    <td className="px-6 py-4 font-bold text-medical-600">{inv.invoiceNumber}</td>
                    <td className="px-6 py-4 font-bold text-slate-400">{inv.date}</td>
                    <td className="px-6 py-4 text-right font-black text-slate-600">₹{(inv.grandTotal || 0).toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 text-right font-black text-rose-600">₹{(inv.balanceDue || inv.grandTotal || 0).toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-0.5 rounded-lg font-black text-[9px] uppercase tracking-widest ${bucket.color} ${bucket.bg}`}>{bucket.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {buckets.map((b: any) => (
            <div key={b.label} className={`${b.bg} ${b.color} p-3 rounded-xl text-center`}>
              <p className="text-[9px] font-black uppercase tracking-widest">{b.label}</p>
              <p className="text-sm font-black">₹{b.total.toLocaleString('en-IN')}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 animate-in fade-in overflow-auto custom-scrollbar flex-1">
      <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
        <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl"><TrendingUp size={20} /></div>
        <div>
          <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Outstanding Aging Report</h3>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{outstanding.length} outstanding invoices</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Outstanding</p>
          <p className="text-2xl font-black text-slate-800">₹{outstanding.reduce((s: number, i: any) => s + (i.balanceDue || i.grandTotal || 0), 0).toLocaleString('en-IN')}</p>
        </div>
      </div>
      {renderAgingTable('Receivables (Sales)', receivables, <ArrowUpRight size={18} className="text-emerald-600" />)}
      {payables.length > 0 && renderAgingTable('Payables (Purchases)', payables, <ArrowDownLeft size={18} className="text-rose-600" />)}
    </div>
  );
};

const GSTView: React.FC<{ invoices: any[] }> = ({ invoices }) => {
  const [gstTab, setGstTab] = useState<'gstr1' | 'gstr3b' | 'hsn'>('gstr1');

  const gstInvoices = useMemo(() => {
    return invoices.filter(i =>
      i.status !== 'Draft' &&
      i.status !== 'Cancelled' &&
      i.documentType !== 'Quotation' &&
      (i.documentType === 'Invoice' || !i.documentType) &&
      i.items && i.items.length > 0
    );
  }, [invoices]);

  const gstSummary = useMemo(() => {
    let totalTaxable = 0, totalCGST = 0, totalSGST = 0, totalIGST = 0;
    const hsnMap: Record<string, { taxable: number; cgst: number; sgst: number; igst: number; qty: number }> = {};

    gstInvoices.forEach(inv => {
      (inv.items || []).forEach((item: any) => {
        const taxable = item.amount || 0;
        totalTaxable += taxable;
        totalCGST += item.cgstRate ? (taxable * item.cgstRate / 100) : 0;
        totalSGST += item.sgstRate ? (taxable * item.sgstRate / 100) : 0;
        totalIGST += item.igstRate ? (taxable * item.igstRate / 100) : 0;

        const hsn = item.hsn || 'GENERAL';
        if (!hsnMap[hsn]) hsnMap[hsn] = { taxable: 0, cgst: 0, sgst: 0, igst: 0, qty: 0 };
        hsnMap[hsn].taxable += taxable;
        hsnMap[hsn].cgst += item.cgstRate ? (taxable * item.cgstRate / 100) : 0;
        hsnMap[hsn].sgst += item.sgstRate ? (taxable * item.sgstRate / 100) : 0;
        hsnMap[hsn].igst += item.igstRate ? (taxable * item.igstRate / 100) : 0;
        hsnMap[hsn].qty += item.quantity || 0;
      });
    });

    return { totalTaxable, totalCGST, totalSGST, totalIGST, hsnMap };
  }, [gstInvoices]);

  const gstr3bData = useMemo(() => {
    const outward = gstInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
    return {
      outwardTaxable: gstSummary.totalTaxable,
      outwardTotal: outward,
      totalCGST: gstSummary.totalCGST,
      totalSGST: gstSummary.totalSGST,
      totalIGST: gstSummary.totalIGST,
      totalTax: gstSummary.totalCGST + gstSummary.totalSGST + gstSummary.totalIGST
    };
  }, [gstInvoices, gstSummary]);

  return (
    <div className="p-4 sm:p-8 space-y-6 animate-in fade-in overflow-auto custom-scrollbar flex-1">
      <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
        <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl"><Percent size={20} /></div>
        <div>
          <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">GST Reports</h3>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{gstInvoices.length} taxable invoices</p>
        </div>
      </div>

      <div className="flex bg-white p-1 rounded-2xl border border-slate-300 w-fit shadow-sm">
        {[
          { id: 'gstr1', label: 'GSTR-1 Summary' },
          { id: 'gstr3b', label: 'GSTR-3B Summary' },
          { id: 'hsn', label: 'HSN Grouping' }
        ].map(t => (
          <button key={t.id} onClick={() => setGstTab(t.id as any)}
            className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${gstTab === t.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
          >{t.label}</button>
        ))}
      </div>

      {gstTab === 'gstr1' && (
        <div className="bg-white rounded-[2.5rem] border border-slate-300 shadow-xl overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">GSTR-1 — Outward Supply Summary</h4>
          </div>
          <table className="w-full text-left text-[11px]">
            <thead className="bg-slate-50 text-[9px] uppercase font-black tracking-widest text-slate-400 border-b">
              <tr><th className="px-6 py-4">Invoice #</th><th className="px-6 py-4">Customer</th><th className="px-6 py-4">Date</th><th className="px-6 py-4 text-right">Taxable</th><th className="px-6 py-4 text-right">CGST</th><th className="px-6 py-4 text-right">SGST</th><th className="px-6 py-4 text-right">IGST</th><th className="px-6 py-4 text-right">Total</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {gstInvoices.length === 0 ? (
                <tr><td colSpan={8} className="py-16 text-center text-[10px] font-black uppercase tracking-widest text-slate-300">No GST invoices found</td></tr>
              ) : gstInvoices.map(inv => {
                const invCGST = (inv.items || []).reduce((s: number, it: any) => s + (it.amount || 0) * (it.cgstRate || 0) / 100, 0);
                const invSGST = (inv.items || []).reduce((s: number, it: any) => s + (it.amount || 0) * (it.sgstRate || 0) / 100, 0);
                const invIGST = (inv.items || []).reduce((s: number, it: any) => s + (it.amount || 0) * (it.igstRate || 0) / 100, 0);
                const invTaxable = (inv.items || []).reduce((s: number, it: any) => s + (it.amount || 0), 0);
                return (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-black text-medical-600">{inv.invoiceNumber}</td>
                    <td className="px-6 py-4 font-black text-slate-800 uppercase">{inv.customerName}</td>
                    <td className="px-6 py-4 font-bold text-slate-400">{inv.date}</td>
                    <td className="px-6 py-4 text-right font-black text-slate-600">₹{invTaxable.toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 text-right font-black text-emerald-600">₹{invCGST.toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 text-right font-black text-emerald-600">₹{invSGST.toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 text-right font-black text-indigo-600">₹{invIGST.toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 text-right font-black text-slate-900">₹{(inv.grandTotal || 0).toLocaleString('en-IN')}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-900 text-white">
              <tr>
                <td colSpan={3} className="px-6 py-5 font-black uppercase tracking-widest text-[10px]">Totals</td>
                <td className="px-6 py-5 text-right font-black">₹{gstSummary.totalTaxable.toLocaleString('en-IN')}</td>
                <td className="px-6 py-5 text-right font-black">₹{gstSummary.totalCGST.toLocaleString('en-IN')}</td>
                <td className="px-6 py-5 text-right font-black">₹{gstSummary.totalSGST.toLocaleString('en-IN')}</td>
                <td className="px-6 py-5 text-right font-black">₹{gstSummary.totalIGST.toLocaleString('en-IN')}</td>
                <td className="px-6 py-5 text-right font-black">₹{(gstSummary.totalTaxable + gstSummary.totalCGST + gstSummary.totalSGST + gstSummary.totalIGST).toLocaleString('en-IN')}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {gstTab === 'gstr3b' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-[2.5rem] border border-slate-300 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">GSTR-3B — Summary Return</h4>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-4">
                {[
                  { label: 'Outward Taxable Supplies', value: gstr3bData.outwardTaxable },
                  { label: 'Total Outward Value (incl. Tax)', value: gstr3bData.outwardTotal },
                ].map(d => (
                  <div key={d.label} className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{d.label}</span>
                    <span className="text-sm font-black text-slate-800">₹{d.value.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
              <div className="pt-4 border-t-2 border-slate-200">
                <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Tax Liability</h5>
                <div className="space-y-3">
                  {[
                    { label: 'CGST Liability', value: gstr3bData.totalCGST, color: 'text-emerald-600' },
                    { label: 'SGST Liability', value: gstr3bData.totalSGST, color: 'text-emerald-600' },
                    { label: 'IGST Liability', value: gstr3bData.totalIGST, color: 'text-indigo-600' },
                  ].map(d => (
                    <div key={d.label} className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{d.label}</span>
                      <span className={`text-sm font-black ${d.color}`}>₹{d.value.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                    <span className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Total Tax</span>
                    <span className="text-lg font-black text-slate-900">₹{gstr3bData.totalTax.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-slate-50 rounded-[2.5rem] border border-slate-200 shadow-sm p-8 flex flex-col items-center justify-center text-center">
            <BarChart3 size={48} className="text-slate-300 mb-4" />
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Tax Composition</h4>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">CGST / SGST / IGST</p>
            <div className="w-full mt-6 space-y-3">
              {[
                { label: 'CGST', value: gstr3bData.totalCGST, color: 'bg-emerald-500' },
                { label: 'SGST', value: gstr3bData.totalSGST, color: 'bg-emerald-400' },
                { label: 'IGST', value: gstr3bData.totalIGST, color: 'bg-indigo-500' },
              ].map(d => {
                const pct = gstr3bData.totalTax > 0 ? (d.value / gstr3bData.totalTax * 100) : 0;
                return (
                  <div key={d.label} className="text-left">
                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest mb-1">
                      <span className="text-slate-500">{d.label}</span>
                      <span className="text-slate-700">{pct.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${d.color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {gstTab === 'hsn' && (
        <div className="bg-white rounded-[2.5rem] border border-slate-300 shadow-xl overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">HSN-wise Summary</h4>
          </div>
          <table className="w-full text-left text-[11px]">
            <thead className="bg-slate-50 text-[9px] uppercase font-black tracking-widest text-slate-400 border-b">
              <tr><th className="px-6 py-4">HSN / SAC</th><th className="px-6 py-4 text-right">Qty</th><th className="px-6 py-4 text-right">Taxable Value</th><th className="px-6 py-4 text-right">CGST</th><th className="px-6 py-4 text-right">SGST</th><th className="px-6 py-4 text-right">IGST</th><th className="px-6 py-4 text-right">Total Tax</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Object.entries(gstSummary.hsnMap).length === 0 ? (
                <tr><td colSpan={7} className="py-16 text-center text-[10px] font-black uppercase tracking-widest text-slate-300">No HSN data</td></tr>
              ) : Object.entries(gstSummary.hsnMap).map(([hsn, data]: [string, any]) => (
                <tr key={hsn} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-black text-slate-800 uppercase">{hsn}</td>
                  <td className="px-6 py-4 text-right font-bold text-slate-500">{data.qty}</td>
                  <td className="px-6 py-4 text-right font-black text-slate-600">₹{data.taxable.toLocaleString('en-IN')}</td>
                  <td className="px-6 py-4 text-right font-black text-emerald-600">₹{data.cgst.toLocaleString('en-IN')}</td>
                  <td className="px-6 py-4 text-right font-black text-emerald-600">₹{data.sgst.toLocaleString('en-IN')}</td>
                  <td className="px-6 py-4 text-right font-black text-indigo-600">₹{data.igst.toLocaleString('en-IN')}</td>
                  <td className="px-6 py-4 text-right font-black text-slate-900">₹{(data.cgst + data.sgst + data.igst).toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-900 text-white">
              <tr>
                <td className="px-6 py-5 font-black uppercase tracking-widest text-[10px]">Total</td>
                <td className="px-6 py-5 text-right font-black">{Object.values(gstSummary.hsnMap).reduce((s: number, d: any) => s + d.qty, 0)}</td>
                <td className="px-6 py-5 text-right font-black">₹{gstSummary.totalTaxable.toLocaleString('en-IN')}</td>
                <td className="px-6 py-5 text-right font-black">₹{gstSummary.totalCGST.toLocaleString('en-IN')}</td>
                <td className="px-6 py-5 text-right font-black">₹{gstSummary.totalSGST.toLocaleString('en-IN')}</td>
                <td className="px-6 py-5 text-right font-black">₹{gstSummary.totalIGST.toLocaleString('en-IN')}</td>
                <td className="px-6 py-5 text-right font-black">₹{(gstSummary.totalCGST + gstSummary.totalSGST + gstSummary.totalIGST).toLocaleString('en-IN')}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};
