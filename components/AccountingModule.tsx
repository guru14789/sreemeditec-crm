import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ArrowUpRight, ArrowDownLeft, ArrowLeftRight, FileText, Package,
  RefreshCcw, FileMinus, FilePlus,
  CalendarDays, Scale, TrendingUp, BarChart3, Clock, Landmark, ClipboardList, Building2,
  FolderOpen, Hash, Wrench, Keyboard,
  Search, Menu, ChevronRight, Check, AlertTriangle, X, Save,
  Loader2, Zap, Download, Upload, CheckCircle2, Trash2, Plus,
  PiggyBank, BadgeDollarSign
} from 'lucide-react';
import { useData } from './DataContext';
import { VoucherType, Ledger, AccountingVoucher, LedgerEntry, AccountGroup, GoToItem, FixedAsset, BankStatementEntry } from '../types';

// ── Types ──────────────────────────────────────────────────────────────────
type TallyScreen =
  'gateway' | 'daybook' | 'bs' | 'pl' | 'tb' | 'outstanding' | 'gst' | 'shortcuts' |
  'coa' | 'ledger_stmt' | 'bank_recon' | 'tds' | 'fixed_assets' | 'opening_bal' |
  'voucher_pay' | 'voucher_rec' | 'voucher_jnl' | 'voucher_sls' | 'voucher_pur' | 'contra';

type VoucherMode = 'Payment' | 'Receipt' | 'Contra' | 'Journal' | 'Sales' | 'Purchase' | 'Debit Note' | 'Credit Note';

interface VFState {
  type: VoucherMode;
  date: string;
  accountName: string;
  accountId: string;
  entries: LedgerEntry[];
  narration: string;
  refNo: string;
  chequeNo: string;
  chequeDate: string;
  tdsRate: number;
  tdsSection: string;
  tdsLedgerId: string;
  settlements: { invoiceId: string; invoiceNumber: string; amount: number }[];
}

interface CreateLedgerForm {
  name: string; groupId: string; openingBalance: string;
  gstin: string; phone: string; email: string; address: string;
}

interface AccountingModuleProps { userRole?: 'Admin' | 'Employee'; onClose?: () => void; }

// ── Helpers ────────────────────────────────────────────────────────────────
const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
const fmt = (n: number) => Math.abs(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
const today = () => new Date().toISOString().split('T')[0];
const fmtDate = (d: string) => { if (!d) return ''; const p = d.split('-'); return `${p[2]}/${p[1]}/${p[0].slice(2)}`; };
const daysDiff = (dateStr: string) => Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000));
const shortKeys: Record<VoucherMode, string> = {
  Payment: 'F5', Receipt: 'F6', Contra: 'F4', Journal: 'F7',
  Sales: 'F8', Purchase: 'F9', 'Debit Note': 'Ctrl+F9', 'Credit Note': 'Ctrl+F8',
};

// ── Voucher type colors ────────────────────────────────────────────────────
const voucherColors: Record<VoucherMode, string> = {
  Payment: 'bg-rose-100 text-rose-700 border-rose-200',
  Receipt: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Contra: 'bg-purple-100 text-purple-700 border-purple-200',
  Journal: 'bg-blue-100 text-blue-700 border-blue-200',
  Sales: 'bg-amber-100 text-amber-700 border-amber-200',
  Purchase: 'bg-orange-100 text-orange-700 border-orange-200',
  'Debit Note': 'bg-red-100 text-red-700 border-red-200',
  'Credit Note': 'bg-teal-100 text-teal-700 border-teal-200',
};

// ── Component ──────────────────────────────────────────────────────────────
export const AccountingModule: React.FC<AccountingModuleProps> = ({ userRole, onClose }) => {
  const isAdmin = userRole === 'Admin';
  const {
    ledgers = [], vouchers = [], accountGroups = [], invoices = [], purchaseRecords = [],
    fixedAssets = [], depreciationSchedule = [], bankStatements = [], costCentres = [],
    addLedger, updateLedger, removeLedger,
    addAccountGroup, removeAccountGroup, updateAccountGroup,
    reverseVoucher, updateVoucher, postToLedger, reconcileLedgerBalances,
    addFixedAsset, updateFixedAsset, removeFixedAsset, computeDepreciation, postDepreciationEntry,
    uploadBankStatement, autoMatchBankEntries, ensurePartyLedger,
    addNotification, currentUser, showAlert, showConfirm, showPrompt
  } = useData();

  // ── Screen / Navigation State ─────────────────────────────────────────
  const [screen, setScreen] = useState<TallyScreen>('gateway');
  const [showGoto, setShowGoto] = useState(false);
  const [gotoQ, setGotoQ] = useState('');
  const [statusMsg, setStatusMsg] = useState('Ready');
  const gotoRef = useRef<HTMLInputElement>(null);
  const [daybookDate, setDaybookDate] = useState(today());
  const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; });
  const [dateTo, setDateTo] = useState(today());
  const [daybookRangeMode, setDaybookRangeMode] = useState(false);
  const [selLedger, setSelLedger] = useState<Ledger | null>(null);
  const [selVoucher, setSelVoucher] = useState<AccountingVoucher | null>(null);
  const [searchQ, setSearchQ] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // ── Voucher Form State ────────────────────────────────────────────────
  const makeVfInit = (type: VoucherMode = 'Payment'): VFState => ({
    type, date: today(), accountName: '', accountId: '',
    entries: [
      { id: genId(), ledgerId: '', ledgerName: '', debit: 0, credit: 0 },
      { id: genId(), ledgerId: '', ledgerName: '', debit: 0, credit: 0 },
    ],
    narration: '', refNo: '', chequeNo: '', chequeDate: '',
    tdsRate: 0, tdsSection: '', tdsLedgerId: '',
    settlements: [],
  });
  const [vf, setVf] = useState<VFState>(makeVfInit());
  const [showVf, setShowVf] = useState(false);
  const [diff, setDiff] = useState(0);

  // ── Create Ledger Modal State ─────────────────────────────────────────
  const [showCreateLedger, setShowCreateLedger] = useState(false);
  const [pendingEntryId, setPendingEntryId] = useState<string | null>(null);
  const [createLedgerForm, setCreateLedgerForm] = useState<CreateLedgerForm>({
    name: '', groupId: 'GRP-DEBTORS', openingBalance: '0', gstin: '', phone: '', email: '', address: '',
  });

  // ── COA / Ledger Management State ────────────────────────────────────
  const [editLedger, setEditLedger] = useState<Ledger | null>(null);
  const [showLedgerForm, setShowLedgerForm] = useState(false);
  const [ledgerFormData, setLedgerFormData] = useState<Partial<Ledger>>({});
  const [coaTab, setCoaTab] = useState<'ledgers' | 'groups'>('ledgers');
  const [coaSearch, setCoaSearch] = useState('');

  // ── Opening Balance State ─────────────────────────────────────────────
  const [obEdits, setObEdits] = useState<Record<string, string>>({});

  // ── Fixed Assets State ────────────────────────────────────────────────
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [assetForm, setAssetForm] = useState<Partial<FixedAsset>>({
    name: '', purchaseDate: today(), purchaseCost: 0, usefulLifeYears: 5,
    salvageValue: 0, depreciationMethod: 'SLM', accumulatedDepreciation: 0,
    netBookValue: 0, status: 'Active', ledgerId: '',
  });

  // ── Bank Recon State ──────────────────────────────────────────────────
  const [reconLedgerId, setReconLedgerId] = useState('');
  const [autoMatching, setAutoMatching] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Bill Settlement State ──────────────────────────────────────────────
  const [showBillSettle, setShowBillSettle] = useState(false);

  // ── Voucher form helpers ───────────────────────────────────────────────
  const resetVf = (type: VoucherMode) => {
    setVf(makeVfInit(type));
    setShowVf(true);
    setDiff(0);
    setStatusMsg(`${type} Voucher`);
    setShowBillSettle(false);
  };
  const updateEntry = (id: string, u: Partial<LedgerEntry>) =>
    setVf(p => ({ ...p, entries: p.entries.map(e => e.id === id ? { ...e, ...u } : e) }));
  const addEntry = () => setVf(p => ({ ...p, entries: [...p.entries, { id: genId(), ledgerId: '', ledgerName: '', debit: 0, credit: 0 }] }));
  const delEntry = (id: string) => setVf(p => ({ ...p, entries: p.entries.filter(e => e.id !== id) }));
  const td = useMemo(() => vf.entries.reduce((s, e) => s + Number(e.debit || 0), 0), [vf.entries]);
  const tc = useMemo(() => vf.entries.reduce((s, e) => s + Number(e.credit || 0), 0), [vf.entries]);
  useEffect(() => { setDiff(td - tc); }, [td, tc]);

  // ── Computed ───────────────────────────────────────────────────────────
  const groupMap = useMemo(() => new Map(accountGroups.map(g => [g.id, g])), [accountGroups]);

  const stats = useMemo(() => {
    const isBank = (g: AccountGroup | undefined) => g?.id === 'GRP-CASH' || g?.id === 'GRP-BANK' || g?.name === 'Cash-in-Hand' || g?.name === 'Bank Accounts';
    const isDr = (g: AccountGroup | undefined) => g?.id === 'GRP-DEBTORS' || g?.name === 'Sundry Debtors';
    const isCr = (g: AccountGroup | undefined) => g?.id === 'GRP-CREDITORS' || g?.name === 'Sundry Creditors';
    const sum = (fn: (g: AccountGroup | undefined) => boolean) =>
      ledgers.filter(l => fn(groupMap.get(l.groupId))).reduce((s, l) => s + (l.currentBalance || 0), 0);
    return { cashBank: sum(isBank), debtors: sum(isDr), creditors: Math.abs(sum(isCr)) };
  }, [ledgers, groupMap]);

  const partyPendingInvoices = useMemo(() => {
    if (!vf.accountName) return [];
    const name = vf.accountName.toUpperCase();
    if (vf.type === 'Payment' || vf.type === 'Purchase') {
      const vendorBills = (purchaseRecords || []).filter((p) =>
        (p.supplier || '').toUpperCase() === name &&
        p.status !== 'Paid' && p.status !== 'Cancelled'
      ).map((p) => ({ id: p.id, invoiceNumber: p.invoiceNo || p.id, date: p.dateSupply || p.materialReceivedDate, grandTotal: p.total || 0, balanceDue: (p.total || 0) - (p.paidAmount || 0), documentType: 'SupplierPO', status: p.status }));
      return vendorBills;
    }
    return invoices.filter(i =>
      (i.customerName || '').toUpperCase() === name &&
      i.documentType === 'Invoice' &&
      i.status !== 'Paid' && i.status !== 'Cancelled' && i.status !== 'Draft'
    );
  }, [invoices, purchaseRecords, vf.accountName, vf.type]);

  const tdsLedger = useMemo(() => ledgers.find(l => l.name === 'TDS Payable' || l.id === 'LED-TDS-PAYABLE'), [ledgers]);

  const goToItems: GoToItem[] = useMemo(() => [
    { id: 'gt0', label: 'Gateway', type: 'screen', action: () => setScreen('gateway'), shortcut: 'F1' },
    { id: 'gt1', label: 'Payment Voucher', type: 'screen', action: () => resetVf('Payment'), shortcut: 'F5' },
    { id: 'gt2', label: 'Receipt Voucher', type: 'screen', action: () => resetVf('Receipt'), shortcut: 'F6' },
    { id: 'gt3', label: 'Journal', type: 'screen', action: () => resetVf('Journal'), shortcut: 'F7' },
    { id: 'gt4', label: 'Sales Invoice', type: 'screen', action: () => resetVf('Sales'), shortcut: 'F8' },
    { id: 'gt5', label: 'Purchase Invoice', type: 'screen', action: () => resetVf('Purchase'), shortcut: 'F9' },
    { id: 'gt6', label: 'Day Book', type: 'screen', action: () => setScreen('daybook') },
    { id: 'gt7', label: 'Balance Sheet', type: 'screen', action: () => setScreen('bs') },
    { id: 'gt8', label: 'Profit & Loss', type: 'screen', action: () => setScreen('pl') },
    { id: 'gt9', label: 'Trial Balance', type: 'screen', action: () => setScreen('tb') },
    { id: 'gt10', label: 'Outstanding', type: 'screen', action: () => setScreen('outstanding') },
    { id: 'gt11', label: 'GST Reports', type: 'screen', action: () => setScreen('gst') },
    { id: 'gt12', label: 'Chart of Accounts', type: 'screen', action: () => setScreen('coa') },
    { id: 'gt13', label: 'Bank Reconciliation', type: 'screen', action: () => setScreen('bank_recon') },
    { id: 'gt14', label: 'TDS Report', type: 'screen', action: () => setScreen('tds') },
    { id: 'gt15', label: 'Fixed Assets', type: 'screen', action: () => setScreen('fixed_assets') },
    { id: 'gt16', label: 'Opening Balances', type: 'screen', action: () => setScreen('opening_bal') },
    { id: 'gt17', label: 'Shortcut Keys', type: 'screen', action: () => setScreen('shortcuts') },
    ...ledgers.slice(0, 20).map(l => ({ id: `gl-${l.id}`, label: `Ledger: ${l.name}`, type: 'ledger' as const, action: () => { setSelLedger(l); setScreen('ledger_stmt'); }, shortcut: '' })),
  ], [ledgers]);

  const filteredGoto = useMemo(() => {
    const q = gotoQ.toLowerCase();
    return goToItems.filter(i => !q || i.label.toLowerCase().includes(q) || i.type.includes(q) || (i.shortcut || '').toLowerCase().includes(q));
  }, [gotoQ, goToItems]);

  // ── Keyboard handler ───────────────────────────────────────────────────
  useEffect(() => {
    const h = async (e: KeyboardEvent) => {
      if (showGoto) {
        if (e.key === 'Escape') { e.preventDefault(); setShowGoto(false); setGotoQ(''); return; }
        if (e.key === 'Enter' && filteredGoto.length > 0) { e.preventDefault(); filteredGoto[0].action(); setShowGoto(false); setGotoQ(''); return; }
        return;
      }
      if (showCreateLedger) {
        if (e.key === 'Escape') { e.preventDefault(); setShowCreateLedger(false); return; }
        return;
      }
      if (e.altKey && (e.key === 'g' || e.key === 'G')) { e.preventDefault(); setShowGoto(true); setTimeout(() => gotoRef.current?.focus(), 50); return; }
      if (e.key === 'F1') { e.preventDefault(); setShowVf(false); setScreen('gateway'); setStatusMsg('Gateway of Accounts'); return; }
      if (e.key === 'F2') {
        e.preventDefault();
        if (showVf) { const d = await showPrompt('Voucher date (YYYY-MM-DD):', vf.date); if (d) setVf(p => ({ ...p, date: d })); }
        else { const d = await showPrompt('Change date (YYYY-MM-DD):', daybookDate); if (d) setDaybookDate(d); }
        return;
      }
      if (e.key === 'F3') { e.preventDefault(); addNotification('Company Info', 'Sreemeditec — current company.', 'info'); return; }
      if (e.key === 'F4') { e.preventDefault(); resetVf('Contra'); return; }
      if (e.key === 'F5') { e.preventDefault(); resetVf('Payment'); return; }
      if (e.key === 'F6') { e.preventDefault(); resetVf('Receipt'); return; }
      if (e.key === 'F7') { e.preventDefault(); resetVf('Journal'); return; }
      if (e.key === 'F8' && !e.ctrlKey) { e.preventDefault(); resetVf('Sales'); return; }
      if (e.key === 'F9' && !e.ctrlKey) { e.preventDefault(); resetVf('Purchase'); return; }
      if (e.ctrlKey && e.key === 'F8') { e.preventDefault(); resetVf('Credit Note'); return; }
      if (e.ctrlKey && e.key === 'F9') { e.preventDefault(); resetVf('Debit Note'); return; }
      if (e.key === 'Escape') {
        if (showVf) { const confirmed = await showConfirm('Quit without saving?'); if (confirmed) { setShowVf(false); setScreen('gateway'); setStatusMsg('Gateway of Accounts'); } return; }
        if (screen !== 'gateway') { e.preventDefault(); setScreen('gateway'); setStatusMsg('Gateway of Accounts'); return; }
      }
      if (showVf) {
        if (e.key === 'Enter' && !e.ctrlKey && !e.altKey) {
          const active = document.activeElement;
          if (active && (active.tagName === 'INPUT' || active.tagName === 'SELECT' || active.tagName === 'TEXTAREA')) {
            e.preventDefault();
            const focusables = Array.from(document.querySelectorAll('input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])')) as HTMLElement[];
            const index = focusables.indexOf(active as HTMLElement);
            if (index > -1) { const next = focusables[index + (e.shiftKey ? -1 : 1)]; if (next) next.focus(); }
            return;
          }
        }
        if (e.ctrlKey && (e.key === 'a' || e.key === 'A')) { e.preventDefault(); handleSaveVoucher(); return; }
        if (e.ctrlKey && (e.key === 'q' || e.key === 'Q')) { e.preventDefault(); const confirmed = await showConfirm('Quit without saving?'); if (confirmed) { setShowVf(false); setScreen('gateway'); } return; }
        if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); handleSaveVoucher(); return; }
        if (e.altKey && (e.key === 'c' || e.key === 'C')) { e.preventDefault(); setShowCreateLedger(true); return; }
        if (e.altKey && (e.key === 'd' || e.key === 'D')) { e.preventDefault(); const entries = vf.entries; if (entries.length > 2) delEntry(entries[entries.length - 2]?.id || entries[0]?.id); return; }
        if (e.altKey && (e.key === 'i' || e.key === 'I')) { e.preventDefault(); addEntry(); return; }
        if (e.altKey && (e.key === 'b' || e.key === 'B')) { e.preventDefault(); setShowBillSettle(s => !s); return; }
        return;
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [showGoto, showVf, showCreateLedger, screen, vf, filteredGoto, daybookDate]);

  // ── Save Voucher ───────────────────────────────────────────────────────
  const handleSaveVoucher = async () => {
    if (td === 0 && tc === 0) { addNotification('Invalid', 'Amount cannot be zero.', 'alert'); return; }
    const entries = vf.entries.map(({ autoGenerated, ...r }) => r);
    let tdsAmt = 0;
    if (vf.tdsRate > 0 && tdsLedger) {
      tdsAmt = Math.round(td * (vf.tdsRate / 100) * 100) / 100;
      if (tdsAmt > 0) {
        entries.push({ id: genId(), ledgerId: tdsLedger.id, ledgerName: tdsLedger.name, debit: 0, credit: tdsAmt, narration: `TDS @${vf.tdsRate}% u/s ${vf.tdsSection}` });
      }
    }
    const finalTd = entries.reduce((s, e) => s + (e.debit || 0), 0);
    const finalTc = entries.reduce((s, e) => s + (e.credit || 0), 0);
    if (Math.abs(finalTd - finalTc) > 0.01) {
      addNotification('Unbalanced', `Debit ₹${fmt(finalTd)} ≠ Credit ₹${fmt(finalTc)}. Difference: ₹${fmt(Math.abs(finalTd - finalTc))}`, 'alert');
      return;
    }
    await postToLedger({
      type: vf.type as unknown as VoucherType,
      date: vf.date,
      entries,
      narration: vf.narration,
      totalAmount: finalTd,
      referenceNumber: vf.refNo || undefined,
      chequeNo: vf.chequeNo || undefined,
      chequeDate: vf.chequeDate || undefined,
      tdsRate: vf.tdsRate > 0 ? vf.tdsRate : undefined,
      tdsSection: vf.tdsSection || undefined,
      status: 'POSTED',
      settlements: vf.settlements.length > 0 ? vf.settlements.map(s => ({ invoiceId: s.invoiceId, invoiceNumber: s.invoiceNumber, voucherId: '', amount: s.amount, date: vf.date })) : undefined,
    });
    addNotification('Voucher Posted', `${vf.type} posted — ₹${fmt(finalTd)}.`, 'success');
    setShowVf(false);
    setScreen('daybook');
    setDaybookDate(vf.date);
    setStatusMsg('Voucher Posted — Day Book');
    setShowBillSettle(false);
  };

  // ── Create Ledger ──────────────────────────────────────────────────────
  const handleCreateLedger = async () => {
    if (!createLedgerForm.name.trim()) { addNotification('Error', 'Ledger name is required.', 'alert'); return; }
    const grp = accountGroups.find(g => g.id === createLedgerForm.groupId);
    if (grp?.isSystem) { addNotification('Error', 'Cannot create ledger in system group.', 'alert'); return; }
    const id = `LED-${Date.now()}`;
    const ob = parseFloat(createLedgerForm.openingBalance) || 0;
    const newLedger: Ledger = {
      id, name: createLedgerForm.name.trim(), groupId: createLedgerForm.groupId,
      openingBalance: ob, currentBalance: ob,
      gstin: createLedgerForm.gstin || undefined,
      phone: createLedgerForm.phone || undefined,
      email: createLedgerForm.email || undefined,
      address: createLedgerForm.address || undefined,
      isActive: true,
    };
    await addLedger(newLedger);
    addNotification('Ledger Created', `"${newLedger.name}" added to Chart of Accounts.`, 'success');
    if (pendingEntryId) {
      updateEntry(pendingEntryId, { ledgerId: id, ledgerName: newLedger.name });
      setPendingEntryId(null);
    }
    setShowCreateLedger(false);
    setCreateLedgerForm({ name: '', groupId: 'GRP-DEBTORS', openingBalance: '0', gstin: '', phone: '', email: '', address: '' });
  };

  // ── GST Export ────────────────────────────────────────────────────────
  const handleGSTExport = () => {
    const salesV = vouchers.filter(v => v.type === 'Sales');
    const gstr1 = {
      gstin: '33APGPS4675G2ZL',
      fp: new Date().toLocaleDateString('en-IN', { month: '2-digit', year: 'numeric' }).replace('/', ''),
      version: 'GST3.2.0', hash: 'hash',
      b2b: salesV.map(v => {
        const inv = invoices.find(i => i.id === v.referenceId);
        const taxable = v.totalAmount / 1.12;
        const tax = v.totalAmount - taxable;
        return {
          ctin: inv?.customerGstin || 'UNREGISTERED',
          inv: [{ inum: v.voucherNumber, idt: v.date.split('-').reverse().join('-'), val: v.totalAmount, pos: '33', rchrg: 'N', etin: '', itms: [{ num: 1, itm_det: { txval: Math.round(taxable * 100) / 100, rt: 12, csamt: 0, camt: Math.round(tax / 2 * 100) / 100, samt: Math.round(tax / 2 * 100) / 100 } }] }],
        };
      }),
      nil: { inv: [] }, exp: { exp_typ: [] },
      cdnr: vouchers.filter(v => v.type === 'Credit Note').map(v => ({ ctin: '', nt: [{ ntty: 'C', nt_num: v.voucherNumber, nt_dt: v.date.split('-').reverse().join('-'), val: v.totalAmount, pos: '33', rchrg: 'N', itms: [] }] })),
    };
    const blob = new Blob([JSON.stringify(gstr1, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `GSTR1_${new Date().toISOString().split('T')[0]}.json`;
    a.click(); URL.revokeObjectURL(url);
    addNotification('Export Complete', 'GSTR-1 JSON downloaded.', 'success');
  };

  // ── Save Opening Balances ──────────────────────────────────────────────
  const handleSaveOpeningBalances = async () => {
    const updates = Object.entries(obEdits);
    let count = 0;
    for (const [ledgerId, balStr] of updates) {
      const bal = parseFloat(balStr) || 0;
      const ldg = ledgers.find(l => l.id === ledgerId);
      if (ldg && Math.abs((ldg.openingBalance || 0) - bal) > 0.001) {
        const balDiff = bal - (ldg.openingBalance || 0);
        await updateLedger(ledgerId, { openingBalance: bal, currentBalance: (ldg.currentBalance || 0) + balDiff });
        count++;
      }
    }
    setObEdits({});
    addNotification('Opening Balances Saved', `${count} ledger${count !== 1 ? 's' : ''} updated.`, 'success');
  };

  // ── Fixed Asset Handlers ───────────────────────────────────────────────
  const handleSaveAsset = async () => {
    if (!assetForm.name || !assetForm.purchaseDate) { addNotification('Error', 'Name and purchase date are required.', 'alert'); return; }
    const id = `FA-${Date.now()}`;
    const cost = assetForm.purchaseCost || 0;
    const newAsset: FixedAsset = {
      id, name: assetForm.name!, ledgerId: assetForm.ledgerId || '',
      purchaseDate: assetForm.purchaseDate!, purchaseCost: cost,
      usefulLifeYears: assetForm.usefulLifeYears || 5,
      salvageValue: assetForm.salvageValue || 0,
      depreciationMethod: assetForm.depreciationMethod || 'SLM',
      accumulatedDepreciation: 0, netBookValue: cost, status: 'Active',
    };
    await addFixedAsset(newAsset);
    addNotification('Asset Added', `${newAsset.name} recorded.`, 'success');
    setShowAssetForm(false);
    setAssetForm({ name: '', purchaseDate: today(), purchaseCost: 0, usefulLifeYears: 5, salvageValue: 0, depreciationMethod: 'SLM', accumulatedDepreciation: 0, netBookValue: 0, status: 'Active', ledgerId: '' });
  };

  const handleRunDepreciation = async (assetId: string) => {
    try {
      await computeDepreciation(assetId);
      await postDepreciationEntry(assetId);
      addNotification('Depreciation Posted', 'Depreciation computed and journal posted.', 'success');
    } catch (err) {
      addNotification('Error', String(err), 'alert');
    }
  };

  // ── Bank Recon ─────────────────────────────────────────────────────────
  const handleAutoMatch = async () => {
    if (!reconLedgerId) { addNotification('Error', 'Select a bank ledger first.', 'alert'); return; }
    setAutoMatching(true);
    try {
      const matched = await autoMatchBankEntries(reconLedgerId, today());
      addNotification('Auto-Match Complete', `${matched} entries matched.`, 'success');
    } catch (err) {
      addNotification('Error', String(err), 'alert');
    } finally {
      setAutoMatching(false);
    }
  };

  // ── Ledger Statement data ─────────────────────────────────────────────
  const ledgerStatementVouchers = useMemo(() => {
    if (!selLedger) return [];
    return vouchers
      .filter(v => v.entries.some(e => e.ledgerId === selLedger.id))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [selLedger, vouchers]);

  const ledgerStatementRows = useMemo(() => {
    let runBal = selLedger?.openingBalance || 0;
    const g = selLedger ? groupMap.get(selLedger.groupId) : undefined;
    const isDebitNormal = g?.type === 'Asset' || g?.type === 'Expense';
    return ledgerStatementVouchers.map(v => {
      const entry = v.entries.find(e => e.ledgerId === selLedger?.id);
      const dr = entry?.debit || 0;
      const cr = entry?.credit || 0;
      runBal += isDebitNormal ? (dr - cr) : (cr - dr);
      return { v, dr, cr, runBal };
    });
  }, [ledgerStatementVouchers, selLedger, groupMap]);

  // ── Aging calculation ──────────────────────────────────────────────────
  const agingData = useMemo(() => {
    const debtors = ledgers.filter(l => { const g = groupMap.get(l.groupId); return g?.id === 'GRP-DEBTORS' || g?.name === 'Sundry Debtors'; });
    const creditors = ledgers.filter(l => { const g = groupMap.get(l.groupId); return g?.id === 'GRP-CREDITORS' || g?.name === 'Sundry Creditors'; });
    const calcAging = (partyLedgers: Ledger[], docType: 'Invoice' | 'SupplierPO') =>
      partyLedgers.map(l => {
        const partyInvoices = invoices.filter(i =>
          (i.customerName || '').toUpperCase() === l.name.toUpperCase() &&
          i.documentType === docType &&
          i.status !== 'Paid' && i.status !== 'Cancelled'
        );
        const buckets = { b0_30: 0, b31_60: 0, b61_90: 0, b90plus: 0 };
        const total = Math.abs(l.currentBalance || 0);
        if (partyInvoices.length > 0) {
          partyInvoices.forEach(i => {
            const days = daysDiff(i.date);
            const amt = i.balanceDue ?? i.grandTotal ?? 0;
            if (days <= 30) buckets.b0_30 += amt;
            else if (days <= 60) buckets.b31_60 += amt;
            else if (days <= 90) buckets.b61_90 += amt;
            else buckets.b90plus += amt;
          });
        } else if (total > 0) {
          buckets.b0_30 = total;
        }
        return { ledger: l, total, ...buckets, invoiceCount: partyInvoices.length };
      }).filter(r => r.total > 0 || r.invoiceCount > 0);
    return { debtors: calcAging(debtors, 'Invoice'), creditors: calcAging(creditors, 'SupplierPO') };
  }, [ledgers, invoices, groupMap]);

  const tdsVouchers = useMemo(() => vouchers.filter(v => v.tdsRate && v.tdsRate > 0), [vouchers]);

  // ── WhatsApp outstanding ───────────────────────────────────────────────
  const handleOutstandingWhatsApp = async (r: any) => {
    let phone = r.ledger.phone || '';
    if (!phone) {
      const result = await showPrompt(`Enter phone for ${r.ledger.name} (with country code):`);
      if (!result) return;
      phone = result;
    }
    phone = phone.replace(/\D/g, '');
    if (!phone.startsWith('91') && phone.length === 10) phone = '91' + phone;
    const message = `Dear ${r.ledger.name},\nThis is a friendly reminder that an outstanding amount of *₹${fmt(r.total)}* is pending with Sree Meditec. Please arrange for payment at the earliest.\nThank you!\n- Sree Meditec`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  // ══════════════════════════════════════════════════════════════════════
  // ── RENDER HELPERS ────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════

  // Shared table styles
  const thCls = "px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-50 border-b border-slate-200";
  const thRCls = "px-3 py-2.5 text-right text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-50 border-b border-slate-200";
  const tdCls = "px-3 py-2 text-xs text-slate-700 border-b border-slate-100";
  const tdRCls = "px-3 py-2 text-xs text-slate-700 border-b border-slate-100 text-right tabular-nums";
  const inputCls = "w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all";
  const selectCls = "w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all";
  const btnPrimary = "inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white text-[11px] font-bold rounded-xl shadow-sm hover:from-emerald-700 hover:to-emerald-800 transition-all";
  const btnSecondary = "inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 text-[11px] font-semibold rounded-xl hover:bg-slate-50 transition-all";
  const btnDanger = "inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-semibold rounded-xl hover:bg-rose-100 transition-all";
  const sectionTitle = "text-[10px] font-black uppercase tracking-widest text-slate-400 px-4 pt-4 pb-1";
  const cardCls = "bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden";

  // ── GoTo Modal ─────────────────────────────────────────────────────────
  const renderGoTo = () => (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-all ${showGoto ? 'bg-black/50 backdrop-blur-sm' : 'pointer-events-none opacity-0'}`}
      onClick={() => { setShowGoto(false); setGotoQ(''); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-emerald-950 to-green-900 px-5 py-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300 mb-1">Alt+G — Quick Navigate</p>
          <input
            ref={gotoRef}
            className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            placeholder="Search screens, ledgers, reports..."
            value={gotoQ}
            onChange={e => setGotoQ(e.target.value)}
          />
        </div>
        <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
          {filteredGoto.map(item => (
            <div
              key={item.id}
              className="flex items-center justify-between px-4 py-3 hover:bg-emerald-50 cursor-pointer transition-colors"
              onClick={() => { item.action(); setShowGoto(false); setGotoQ(''); }}
            >
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{item.type}</span>
                <span className="text-xs font-semibold text-slate-700">{item.label}</span>
              </div>
              {item.shortcut && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">{item.shortcut}</span>}
            </div>
          ))}
          {filteredGoto.length === 0 && <div className="py-8 text-center text-xs text-slate-400">No matches found</div>}
        </div>
      </div>
    </div>
  );

  // ── Create Ledger Modal ────────────────────────────────────────────────
  const renderCreateLedgerModal = () => (
    <div style={{ display: showCreateLedger ? 'flex' : 'none' }} className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-950 to-green-900 px-6 py-4">
          <h3 className="text-sm font-bold text-white">Create New Ledger</h3>
          <p className="text-[10px] text-emerald-300 mt-0.5">Alt+C — Add to Chart of Accounts</p>
        </div>
        <div className="p-6 space-y-3">
          {[
            { label: 'Ledger Name *', key: 'name', type: 'text' },
            { label: 'Opening Balance', key: 'openingBalance', type: 'number' },
            { label: 'GSTIN', key: 'gstin', type: 'text' },
            { label: 'Phone', key: 'phone', type: 'text' },
            { label: 'Email', key: 'email', type: 'email' },
            { label: 'Address', key: 'address', type: 'text' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1 block">{f.label}</label>
              <input type={f.type} value={(createLedgerForm as any)[f.key]} onChange={e => setCreateLedgerForm(p => ({ ...p, [f.key]: e.target.value }))} className={inputCls} />
            </div>
          ))}
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1 block">Account Group *</label>
            <select value={createLedgerForm.groupId} onChange={e => setCreateLedgerForm(p => ({ ...p, groupId: e.target.value }))} className={selectCls}>
              {accountGroups.map(g => <option key={g.id} value={g.id}>{g.name} ({g.type})</option>)}
            </select>
          </div>
        </div>
        <div className="px-6 pb-5 flex gap-2 justify-end">
          <button className={btnSecondary} onClick={() => setShowCreateLedger(false)}>Cancel</button>
          <button className={btnPrimary} onClick={handleCreateLedger}>Create Ledger</button>
        </div>
      </div>
    </div>
  );

  // ── Sidebar Navigation ─────────────────────────────────────────────────
  const navGroups: { section: string; items: { label: string; action: () => void; shortcut?: string; id?: string; icon: React.ReactNode; color: string }[] }[] = [
    {
      section: 'TRANSACTIONS',
      items: [
        { label: 'Payment', action: () => resetVf('Payment'), shortcut: 'F5', icon: <ArrowUpRight size={13} />, color: 'text-rose-600' },
        { label: 'Receipt', action: () => resetVf('Receipt'), shortcut: 'F6', icon: <ArrowDownLeft size={13} />, color: 'text-emerald-600' },
        { label: 'Journal', action: () => resetVf('Journal'), shortcut: 'F7', icon: <ArrowLeftRight size={13} />, color: 'text-blue-600' },
        { label: 'Sales', action: () => resetVf('Sales'), shortcut: 'F8', icon: <FileText size={13} />, color: 'text-amber-600' },
        { label: 'Purchase', action: () => resetVf('Purchase'), shortcut: 'F9', icon: <Package size={13} />, color: 'text-orange-600' },
        { label: 'Contra', action: () => resetVf('Contra'), shortcut: 'F4', icon: <RefreshCcw size={13} />, color: 'text-purple-600' },
        { label: 'Credit Note', action: () => resetVf('Credit Note'), shortcut: 'CF8', icon: <FileMinus size={13} />, color: 'text-teal-600' },
        { label: 'Debit Note', action: () => resetVf('Debit Note'), shortcut: 'CF9', icon: <FilePlus size={13} />, color: 'text-red-600' },
      ]
    },
    {
      section: 'REPORTS',
      items: [
        { label: 'Day Book', action: () => { setShowVf(false); setScreen('daybook'); }, id: 'daybook', icon: <CalendarDays size={13} />, color: 'text-slate-600' },
        { label: 'Balance Sheet', action: () => { setShowVf(false); setScreen('bs'); }, id: 'bs', icon: <Scale size={13} />, color: 'text-slate-600' },
        { label: 'Profit & Loss', action: () => { setShowVf(false); setScreen('pl'); }, id: 'pl', icon: <TrendingUp size={13} />, color: 'text-emerald-600' },
        { label: 'Trial Balance', action: () => { setShowVf(false); setScreen('tb'); }, id: 'tb', icon: <BarChart3 size={13} />, color: 'text-blue-600' },
        { label: 'Outstanding', action: () => { setShowVf(false); setScreen('outstanding'); }, id: 'outstanding', icon: <Clock size={13} />, color: 'text-amber-600' },
        { label: 'GST Reports', action: () => { setShowVf(false); setScreen('gst'); }, id: 'gst', icon: <Landmark size={13} />, color: 'text-orange-600' },
        { label: 'TDS Report', action: () => { setShowVf(false); setScreen('tds'); }, id: 'tds', icon: <ClipboardList size={13} />, color: 'text-red-600' },
        { label: 'Bank Recon', action: () => { setShowVf(false); setScreen('bank_recon'); }, id: 'bank_recon', icon: <Building2 size={13} />, color: 'text-purple-600' },
      ]
    },
    {
      section: 'MASTERS',
      items: [
        { label: 'Chart of Accounts', action: () => { setShowVf(false); setScreen('coa'); }, id: 'coa', icon: <FolderOpen size={13} />, color: 'text-slate-600' },
        { label: 'Opening Balances', action: () => { setShowVf(false); setScreen('opening_bal'); }, id: 'opening_bal', icon: <Hash size={13} />, color: 'text-slate-600' },
        { label: 'Fixed Assets', action: () => { setShowVf(false); setScreen('fixed_assets'); }, id: 'fixed_assets', icon: <Wrench size={13} />, color: 'text-slate-600' },
        { label: 'Shortcuts', action: () => { setShowVf(false); setScreen('shortcuts'); }, id: 'shortcuts', icon: <Keyboard size={13} />, color: 'text-slate-600' },
      ]
    },
  ];

  const renderSidebar = () => (
    <aside className={`${sidebarOpen ? 'w-52' : 'w-0 overflow-hidden'} transition-all duration-300 shrink-0 bg-white border-r border-slate-200 flex flex-col overflow-y-auto`}>
      {navGroups.map((group, gi) => (
        <div key={gi}>
          <p className={sectionTitle}>{group.section}</p>
          {group.items.map((item, ii) => {
            const isActive = !showVf && screen === ((item as any).id);
            const isVfActive = showVf && item.label === vf.type;
            const active = isActive || isVfActive;
            return (
              <button
                key={ii}
                onClick={item.action}
                className={`w-full flex items-center justify-between px-4 py-2 text-[11px] font-semibold transition-all group ${active ? 'bg-emerald-50 text-emerald-700 border-r-2 border-emerald-500' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
              >
                <span className="flex items-center gap-2">
                  <span className={(item as any).color}>{item.icon}</span>
                  {item.label}
                </span>
                {(item as any).shortcut && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>{(item as any).shortcut}</span>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </aside>
  );

  // ── Top Header ─────────────────────────────────────────────────────────
  const renderHeader = () => (
    <div className="bg-gradient-to-br from-emerald-950 to-green-900 px-4 md:px-6 py-4 flex flex-col gap-3 shadow-[0_20px_40px_-10px_rgba(6,78,59,0.5)] shrink-0 relative overflow-hidden">
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none" />
      <div className="flex items-center justify-between gap-4 relative z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => setSidebarOpen(s => !s)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all shrink-0">
            <Menu size={16} />
          </button>
          <div>
            <h2 className="text-lg font-playfair font-bold text-white uppercase leading-none tracking-tight">Accounting</h2>
            <p className="text-emerald-100/70 text-[10px] font-semibold mt-0.5">Enterprise Financial Records</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* KPI Pills */}
          <div className="hidden md:flex items-center gap-2">
            {[
              { label: 'Cash & Bank', val: `₹${fmt(stats.cashBank)}`, col: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30' },
              { label: 'Receivable', val: `₹${fmt(stats.debtors)}`, col: 'bg-blue-500/20 text-blue-200 border-blue-500/30' },
              { label: 'Payable', val: `₹${fmt(stats.creditors)}`, col: 'bg-rose-500/20 text-rose-200 border-rose-500/30' },
            ].map(k => (
              <div key={k.label} className={`border rounded-xl px-3 py-1.5 ${k.col}`}>
                <p className="text-[9px] font-black uppercase tracking-widest opacity-70">{k.label}</p>
                <p className="text-sm font-bold tabular-nums leading-none mt-0.5">{k.val}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 bg-gradient-to-r from-[#c5a059] to-[#e5c185] px-4 py-2 rounded-xl shadow-[0_8px_16px_-4px_rgba(197,160,89,0.4)] shrink-0">
            <span className="text-[9px] font-black uppercase tracking-widest text-amber-950">FY 2025-26</span>
          </div>
          <button
            onClick={() => { setShowGoto(true); setTimeout(() => gotoRef.current?.focus(), 50); }}
            className="hidden md:flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-2 rounded-xl text-[10px] font-bold text-white transition-all"
          >
            <Search size={12} />
            Alt+G
          </button>
          {(screen !== 'gateway' || showVf) && (
            <button onClick={() => { setShowVf(false); setScreen('gateway'); setStatusMsg('Gateway of Accounts'); }} className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-3 py-2 rounded-xl text-[10px] font-bold transition-all">← Back</button>
          )}
          {screen === 'gateway' && !showVf && onClose && (
            <button onClick={onClose} className="bg-rose-900/50 hover:bg-rose-800 border border-rose-500/30 text-rose-200 px-3 py-2 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1"><X size={10} /> Close</button>
          )}
        </div>
      </div>
      {/* Status bar */}
      <div className="relative z-10 flex items-center gap-3 text-[10px] text-emerald-200/60 font-semibold border-t border-white/10 pt-2">
        <span className="text-emerald-300 font-bold">{statusMsg}</span>
        <span className="ml-auto">
          {showVf
            ? `Dr: ₹${fmt(td)}  Cr: ₹${fmt(tc)}  ${diff !== 0 ? `Diff: ₹${fmt(diff)}` : 'Balanced'}`
            : `Ledgers: ${ledgers.length} | Vouchers: ${vouchers.length} | Assets: ${fixedAssets.length}`
          }
        </span>
      </div>
    </div>
  );

  // ── Gateway / Dashboard ────────────────────────────────────────────────
  const renderGateway = () => (
    <div className="p-4 md:p-6 space-y-6 overflow-y-auto h-full">
      <div>
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Quick Actions — Voucher Entry</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(['Payment', 'Receipt', 'Journal', 'Sales', 'Purchase', 'Contra', 'Credit Note', 'Debit Note'] as VoucherMode[]).map(v => (
            <button
              key={v}
              onClick={() => resetVf(v)}
              className="flex flex-col items-start gap-2 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-300 hover:-translate-y-0.5 transition-all group text-left"
            >
              <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full border ${voucherColors[v]}`}>{shortKeys[v]}</span>
              <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">{v}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Cash & Bank */}
        <div className={cardCls}>
          <div className="px-4 pt-4 pb-2 border-b border-slate-100">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cash & Bank</p>
          </div>
          <div className="p-4 space-y-2">
            {ledgers.filter(l => { const g = groupMap.get(l.groupId); return g?.id === 'GRP-CASH' || g?.id === 'GRP-BANK' || g?.name === 'Cash-in-Hand' || g?.name === 'Bank Accounts'; }).slice(0, 5).map(l => (
              <div key={l.id} className="flex items-center justify-between">
                <span className="text-xs text-slate-600">{l.name}</span>
                <span className={`text-xs font-bold tabular-nums ${(l.currentBalance || 0) < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                  {(l.currentBalance || 0) < 0 ? '(OD) ' : ''}₹{fmt(Math.abs(l.currentBalance || 0))}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-[10px] font-black uppercase text-slate-400">Total</span>
              <span className="text-sm font-bold text-emerald-700 tabular-nums">₹{fmt(stats.cashBank)}</span>
            </div>
          </div>
        </div>

        {/* Receivables & Payables */}
        <div className={cardCls}>
          <div className="px-4 pt-4 pb-2 border-b border-slate-100">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Receivables & Payables</p>
          </div>
          <div className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600">Total Receivable</span>
              <span className="text-xs font-bold text-emerald-700 tabular-nums">₹{fmt(stats.debtors)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600">Overdue 90+ days</span>
              <span className="text-xs font-bold text-rose-600 tabular-nums">₹{fmt(agingData.debtors.reduce((s, r) => s + r.b90plus, 0))}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-600">Total Payable</span>
              <span className="text-xs font-bold text-rose-600 tabular-nums">₹{fmt(stats.creditors)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600">TDS Deducted</span>
              <span className="text-xs font-bold text-amber-600 tabular-nums">₹{fmt(tdsVouchers.reduce((s, v) => s + v.totalAmount * ((v.tdsRate || 0) / 100), 0))}</span>
            </div>
          </div>
        </div>

        {/* Fixed Assets */}
        <div className={cardCls}>
          <div className="px-4 pt-4 pb-2 border-b border-slate-100">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fixed Assets</p>
          </div>
          <div className="p-4 space-y-2">
            {[
              { label: 'Total Assets', val: fixedAssets.length.toString(), color: 'text-blue-600' },
              { label: 'Gross Block', val: `₹${fmt(fixedAssets.reduce((s, a) => s + (a.purchaseCost || 0), 0))}`, color: 'text-slate-700' },
              { label: 'Net Book Value', val: `₹${fmt(fixedAssets.reduce((s, a) => s + (a.netBookValue || 0), 0))}`, color: 'text-emerald-700' },
              { label: 'Accum. Depreciation', val: `₹${fmt(fixedAssets.reduce((s, a) => s + (a.accumulatedDepreciation || 0), 0))}`, color: 'text-rose-600' },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between">
                <span className="text-xs text-slate-600">{s.label}</span>
                <span className={`text-xs font-bold tabular-nums ${s.color}`}>{s.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reports grid */}
      <div>
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Financial Reports</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Balance Sheet', id: 'bs', color: 'bg-slate-50 border-slate-200 hover:border-slate-400' },
            { label: 'Profit & Loss', id: 'pl', color: 'bg-emerald-50 border-emerald-200 hover:border-emerald-400' },
            { label: 'Trial Balance', id: 'tb', color: 'bg-blue-50 border-blue-200 hover:border-blue-400' },
            { label: 'Day Book', id: 'daybook', color: 'bg-amber-50 border-amber-200 hover:border-amber-400' },
            { label: 'Outstanding', id: 'outstanding', color: 'bg-orange-50 border-orange-200 hover:border-orange-400' },
            { label: 'GST Reports', id: 'gst', color: 'bg-purple-50 border-purple-200 hover:border-purple-400' },
            { label: 'TDS Report', id: 'tds', color: 'bg-red-50 border-red-200 hover:border-red-400' },
            { label: 'Bank Recon', id: 'bank_recon', color: 'bg-teal-50 border-teal-200 hover:border-teal-400' },
          ].map(r => (
            <button
              key={r.id}
              onClick={() => setScreen(r.id as TallyScreen)}
              className={`p-3 rounded-2xl border text-left transition-all hover:-translate-y-0.5 hover:shadow-sm ${r.color}`}
            >
              <span className="text-xs font-bold text-slate-700">{r.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // ── Voucher Form ───────────────────────────────────────────────────────
  const renderVoucher = (type: VoucherMode) => {
    const prefixes: Record<VoucherMode, string> = { Payment: 'PMT', Receipt: 'RCP', Contra: 'CON', Journal: 'JNL', Sales: 'SLS', Purchase: 'PUR', 'Debit Note': 'DN', 'Credit Note': 'CN' };
    const autoNo = `${prefixes[type]}-2526-${String(vouchers.filter(v => v.type === type).length + 1).padStart(4, '0')}`;
    return (
      <div className="p-4 md:p-6 overflow-y-auto h-full space-y-4">
        {/* Voucher header card */}
        <div className={cardCls}>
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full border ${voucherColors[type]}`}>{type} Voucher</span>
              <span className="text-xs text-slate-500 font-mono font-bold">{autoNo}</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-semibold flex-wrap">
              <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg font-bold">Ctrl+A: Post</span>
              <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg font-bold">Alt+C: New Ledger</span>
              <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg font-bold">Alt+B: Bill Settle</span>
              <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg font-bold">Esc: Quit</span>
            </div>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 block">Date</label>
              <input type="date" value={vf.date} onChange={e => setVf(p => ({ ...p, date: e.target.value }))} className={inputCls} />
            </div>
            <div className="sm:col-span-1 md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 block">Party Ledger</label>
              <div className="flex gap-2">
                <select className={selectCls} value={vf.accountId} onChange={e => {
                  const l = ledgers.find(x => x.id === e.target.value);
                  setVf(p => ({ ...p, accountId: e.target.value, accountName: l?.name || '' }));
                }}>
                  <option value="">-- Select Party --</option>
                  {ledgers.filter(l => l.isActive !== false).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
                <button className={btnSecondary} onClick={() => { setPendingEntryId(null); setShowCreateLedger(true); }}>+ New</button>
              </div>
            </div>
          </div>
        </div>

        {/* Entries table */}
        <div className={cardCls}>
          <div className="px-5 py-3 border-b border-slate-100">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Particulars / Journal Entries</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className={thCls} style={{ width: '42%' }}>Ledger Name</th>
                  <th className={thRCls}>Dr Amount (₹)</th>
                  <th className={thRCls}>Cr Amount (₹)</th>
                  <th className={thCls}>Narration</th>
                  <th className={thCls} style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {vf.entries.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 border-b border-slate-100">
                      <select
                        className="w-full bg-transparent border-b border-emerald-400 focus:outline-none text-xs text-slate-700 py-1"
                        value={e.ledgerId}
                        onChange={ev => updateEntry(e.id, { ledgerId: ev.target.value, ledgerName: ledgers.find(x => x.id === ev.target.value)?.name || '' })}
                      >
                        <option value="">-- Select Ledger --</option>
                        {ledgers.filter(l => l.isActive !== false).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2 border-b border-slate-100">
                      <input
                        type="number"
                        className="w-full bg-transparent border-b border-slate-200 focus:border-emerald-400 focus:outline-none text-xs text-right tabular-nums py-1"
                        value={e.debit || ''}
                        onChange={ev => updateEntry(e.id, { debit: Number(ev.target.value) || 0, credit: 0 })}
                      />
                    </td>
                    <td className="px-3 py-2 border-b border-slate-100">
                      <input
                        type="number"
                        className="w-full bg-transparent border-b border-slate-200 focus:border-emerald-400 focus:outline-none text-xs text-right tabular-nums py-1"
                        value={e.credit || ''}
                        onChange={ev => updateEntry(e.id, { credit: Number(ev.target.value) || 0, debit: 0 })}
                      />
                    </td>
                    <td className="px-3 py-2 border-b border-slate-100">
                      <input
                        className="w-full bg-transparent border-b border-slate-200 focus:border-emerald-400 focus:outline-none text-xs py-1"
                        value={e.narration || ''}
                        onChange={ev => updateEntry(e.id, { narration: ev.target.value })}
                        placeholder="optional..."
                      />
                    </td>
                    <td className="px-2 py-2 border-b border-slate-100">
                      <button
                        onClick={() => delEntry(e.id)}
                        disabled={vf.entries.length <= 2}
                        className="w-6 h-6 flex items-center justify-center text-rose-400 hover:text-rose-600 disabled:opacity-20 hover:bg-rose-50 rounded-lg transition-all"
                      ><X size={10} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 flex items-center justify-between border-t border-slate-100 bg-slate-50/50">
            <button onClick={addEntry} className={btnSecondary}>+ Add Entry (Alt+I)</button>
            <div className="flex items-center gap-4 text-xs font-bold">
              <span className="text-slate-500">Dr: <span className="text-blue-600 tabular-nums">₹{fmt(td)}</span></span>
              <span className="text-slate-500">Cr: <span className="text-blue-600 tabular-nums">₹{fmt(tc)}</span></span>
              {diff !== 0
                ? <span className="text-rose-600 bg-rose-50 border border-rose-200 px-2 py-1 rounded-lg flex items-center gap-1"><AlertTriangle size={11} /> Diff: ₹{fmt(diff)}</span>
                : <span className="text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg flex items-center gap-1"><Check size={11} /> Balanced</span>
              }
            </div>
          </div>
        </div>

        {/* Misc fields */}
        <div className={`${cardCls} p-5`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 block">Narration</label>
              <input className={inputCls} value={vf.narration} onChange={e => setVf(p => ({ ...p, narration: e.target.value }))} placeholder="Enter description..." />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 block">Ref / Bill No.</label>
              <input className={inputCls} value={vf.refNo} onChange={e => setVf(p => ({ ...p, refNo: e.target.value }))} placeholder="e.g. INV-001" />
            </div>
            {(type === 'Payment' || type === 'Receipt') && (
              <>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 block">Cheque / DD No.</label>
                  <input className={inputCls} value={vf.chequeNo} onChange={e => setVf(p => ({ ...p, chequeNo: e.target.value }))} placeholder="Cheque no." />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 block">Cheque Date</label>
                  <input type="date" className={inputCls} value={vf.chequeDate} onChange={e => setVf(p => ({ ...p, chequeDate: e.target.value }))} />
                </div>
              </>
            )}
          </div>
        </div>

        {/* TDS Section */}
        {(type === 'Payment' || type === 'Purchase') && (
          <div className={`${cardCls} p-5`}>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">TDS — Tax Deducted at Source</p>
            <div className="flex items-end gap-4 flex-wrap">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 block">TDS Rate %</label>
                <input type="number" className={`${inputCls} w-28`} value={vf.tdsRate || ''} placeholder="0" onChange={e => setVf(p => ({ ...p, tdsRate: Number(e.target.value) || 0 }))} />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 block">Section</label>
                <select className={`${selectCls} w-44`} value={vf.tdsSection} onChange={e => setVf(p => ({ ...p, tdsSection: e.target.value }))}>
                  <option value="">-- Select --</option>
                  <option value="194C">194C (Contractors)</option>
                  <option value="194J">194J (Professional)</option>
                  <option value="194I">194I (Rent)</option>
                  <option value="194H">194H (Commission)</option>
                  <option value="192">192 (Salary)</option>
                  <option value="194A">194A (Interest)</option>
                </select>
              </div>
              {vf.tdsRate > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
                  <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">TDS Amount</p>
                  <p className="text-sm font-bold text-amber-700 tabular-nums">₹{fmt(td * vf.tdsRate / 100)}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bill Settlement */}
        {showBillSettle && (type === 'Receipt' || type === 'Payment') && (
          <div className={cardCls}>
            <div className="px-5 py-3 border-b border-slate-100">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Bill-wise Settlement (Alt+B)</p>
            </div>
            {partyPendingInvoices.length === 0 ? (
              <p className="px-5 py-4 text-xs text-slate-400">No pending invoices for this party.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr>
                    <th className={thCls} style={{ width: 32 }}></th>
                    <th className={thCls}>Invoice</th>
                    <th className={thCls}>Date</th>
                    <th className={thRCls}>Amount</th>
                    <th className={thCls}>Settle Amt</th>
                  </tr></thead>
                  <tbody>
                    {partyPendingInvoices.map(inv => {
                      const existing = vf.settlements.find(s => s.invoiceId === inv.id);
                      return (
                        <tr key={inv.id} className="hover:bg-slate-50">
                          <td className={tdCls}>
                            <input type="checkbox" checked={!!existing} className="rounded"
                              onChange={e => {
                                if (e.target.checked) {
                                  setVf(p => ({ ...p, settlements: [...p.settlements, { invoiceId: inv.id, invoiceNumber: inv.invoiceNumber, amount: inv.balanceDue ?? inv.grandTotal ?? 0 }] }));
                                } else {
                                  setVf(p => ({ ...p, settlements: p.settlements.filter(s => s.invoiceId !== inv.id) }));
                                }
                              }} />
                          </td>
                          <td className={`${tdCls} font-bold text-blue-600 font-mono`}>{inv.invoiceNumber}</td>
                          <td className={tdCls}>{inv.date}</td>
                          <td className={tdRCls}>₹{fmt(inv.balanceDue ?? inv.grandTotal ?? 0)}</td>
                          <td className={tdCls}>
                            {existing && (
                              <input type="number" className="w-24 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs" value={existing.amount}
                                onChange={e => setVf(p => ({ ...p, settlements: p.settlements.map(s => s.invoiceId === inv.id ? { ...s, amount: Number(e.target.value) } : s) }))} />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3 pb-2">
          <button onClick={handleSaveVoucher} className={`${btnPrimary} text-sm px-6 py-2.5`}><Check size={14} /> Post Voucher (Ctrl+A)</button>
          <button onClick={() => setShowBillSettle(s => !s)} className={btnSecondary}>Alt+B: Bill Settle</button>
          <button onClick={() => { setPendingEntryId(null); setShowCreateLedger(true); }} className={btnSecondary}>Alt+C: New Ledger</button>
          <button onClick={async () => { const confirmed = await showConfirm('Quit without saving?'); if (confirmed) { setShowVf(false); setScreen('gateway'); } }} className={btnDanger}>Esc: Quit</button>
        </div>
      </div>
    );
  };

  // ── Day Book ───────────────────────────────────────────────────────────
  const renderDayBook = () => {
    const dayVouchers = vouchers.filter(v => {
      if (daybookRangeMode) return v.date >= dateFrom && v.date <= dateTo;
      return v.date === daybookDate;
    }).sort((a, b) => a.date.localeCompare(b.date) || a.voucherNumber.localeCompare(b.voucherNumber));
    return (
      <div className="p-4 md:p-6 overflow-y-auto h-full space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-sm font-bold text-slate-800">Day Book</h3>
          <div className="flex gap-1">
            <button onClick={() => setDaybookRangeMode(false)} className={`px-3 py-1.5 text-[10px] font-bold rounded-lg border transition-all ${!daybookRangeMode ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>Single Date</button>
            <button onClick={() => setDaybookRangeMode(true)} className={`px-3 py-1.5 text-[10px] font-bold rounded-lg border transition-all ${daybookRangeMode ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>Date Range</button>
          </div>
          {!daybookRangeMode ? (
            <input type="date" value={daybookDate} onChange={e => setDaybookDate(e.target.value)} className={`${inputCls} w-auto`} />
          ) : (
            <div className="flex items-center gap-2">
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={`${inputCls} w-auto`} />
              <span className="text-xs text-slate-400">to</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={`${inputCls} w-auto`} />
            </div>
          )}
          <span className="ml-auto text-xs text-slate-400 font-semibold">{dayVouchers.length} entries</span>
        </div>
        <div className={cardCls}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr>
                <th className={thCls}>Date</th>
                <th className={thCls}>Voucher No</th>
                <th className={thCls}>Type</th>
                <th className={thCls}>Particulars</th>
                <th className={thRCls}>Debit</th>
                <th className={thRCls}>Credit</th>
              </tr></thead>
              <tbody>
                {dayVouchers.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-10 text-xs text-slate-400">No transactions. Change date or add vouchers.</td></tr>
                ) : dayVouchers.map(v => (
                  <tr key={v.id} onClick={() => setSelVoucher(selVoucher?.id === v.id ? null : v)} className={`cursor-pointer hover:bg-emerald-50 transition-colors ${selVoucher?.id === v.id ? 'bg-emerald-50' : ''}`}>
                    <td className={tdCls}>{fmtDate(v.date)}</td>
                    <td className={`${tdCls} font-bold text-blue-600 font-mono`}>{v.voucherNumber}</td>
                    <td className={tdCls}><span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${voucherColors[v.type as VoucherMode] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>{v.type}</span></td>
                    <td className={tdCls}>{v.narration || v.entries[0]?.ledgerName}</td>
                    <td className={tdRCls}>{v.entries.reduce((s, e) => s + e.debit, 0) > 0 ? `₹${fmt(v.entries.reduce((s, e) => s + e.debit, 0))}` : '-'}</td>
                    <td className={tdRCls}>{v.entries.reduce((s, e) => s + e.credit, 0) > 0 ? `₹${fmt(v.entries.reduce((s, e) => s + e.credit, 0))}` : '-'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50">
                  <td colSpan={4} className="px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-500">Totals</td>
                  <td className="px-3 py-2.5 text-right text-xs font-bold text-slate-700 tabular-nums">₹{fmt(dayVouchers.reduce((s, v) => s + v.entries.reduce((se, e) => se + e.debit, 0), 0))}</td>
                  <td className="px-3 py-2.5 text-right text-xs font-bold text-slate-700 tabular-nums">₹{fmt(dayVouchers.reduce((s, v) => s + v.entries.reduce((se, e) => se + e.credit, 0), 0))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
        {selVoucher && (
          <div className={`${cardCls} p-5`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full border ${voucherColors[selVoucher.type as VoucherMode] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>{selVoucher.type}</span>
                <span className="text-sm font-bold text-slate-800 font-mono">{selVoucher.voucherNumber}</span>
                <span className="text-xs text-slate-400">{fmtDate(selVoucher.date)}</span>
              </div>
              {isAdmin && (
                <button className={btnDanger} onClick={async () => { await reverseVoucher(selVoucher.id, 'Cancelled by user'); setSelVoucher(null); addNotification('Cancelled', 'Voucher reversed.', 'success'); }}>Cancel Voucher</button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr>
                  <th className={thCls}>Ledger</th>
                  <th className={thRCls}>Debit</th>
                  <th className={thRCls}>Credit</th>
                </tr></thead>
                <tbody>
                  {selVoucher.entries.map((e, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className={tdCls}>{e.ledgerName}</td>
                      <td className={tdRCls}>{e.debit > 0 ? `₹${fmt(e.debit)}` : '-'}</td>
                      <td className={tdRCls}>{e.credit > 0 ? `₹${fmt(e.credit)}` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {selVoucher.narration && <p className="mt-2 text-xs text-slate-500">Narration: {selVoucher.narration}</p>}
            {selVoucher.chequeNo && <p className="text-xs text-slate-500">Cheque: {selVoucher.chequeNo} dated {selVoucher.chequeDate}</p>}
            {selVoucher.tdsRate && <p className="text-xs text-amber-600 font-semibold">TDS: @{selVoucher.tdsRate}% u/s {selVoucher.tdsSection}</p>}
          </div>
        )}
      </div>
    );
  };

  // ── Balance Sheet ──────────────────────────────────────────────────────
  const renderBS = () => {
    const isLiability = (g?: AccountGroup) => g && (g.type === 'Liability' || g.type === 'Equity');
    const isAsset = (g?: AccountGroup) => g && g.type === 'Asset';
    const lbs = ledgers.filter(l => isLiability(groupMap.get(l.groupId)));
    const as = ledgers.filter(l => isAsset(groupMap.get(l.groupId)));
    const totalL = lbs.reduce((s, l) => s + Math.abs(l.currentBalance || 0), 0);
    const totalA = as.reduce((s, l) => s + Math.abs(l.currentBalance || 0), 0);
    const balanced = totalL > 0 && totalA > 0 && Math.abs(totalL - totalA) < 1;
    return (
      <div className="p-4 md:p-6 overflow-y-auto h-full space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Balance Sheet</h3>
            <p className="text-xs text-slate-400">Sreemeditec — as on {new Date().toLocaleDateString('en-IN')}</p>
          </div>
          {balanced
            ? <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-full flex items-center gap-1"><CheckCircle2 size={11} /> Balanced: ₹{fmt(totalL)}</span>
            : Math.abs(totalL - totalA) > 1
              ? <span className="text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-full flex items-center gap-1"><AlertTriangle size={11} /> Diff: ₹{fmt(Math.abs(totalL - totalA))}</span>
              : null
          }
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={cardCls}>
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Liabilities & Equity</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <tbody>
                  {lbs.map(l => (
                    <tr key={l.id} className="hover:bg-emerald-50 cursor-pointer transition-colors" onClick={() => { setSelLedger(l); setScreen('ledger_stmt'); }}>
                      <td className={`${tdCls} text-blue-600 font-semibold`}>{l.name}</td>
                      <td className={tdRCls}>₹{fmt(Math.abs(l.currentBalance))}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50">
                    <td className="px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-500">Total Liabilities</td>
                    <td className="px-3 py-2.5 text-right text-sm font-bold text-slate-800 tabular-nums">₹{fmt(totalL)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          <div className={cardCls}>
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Assets</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <tbody>
                  {as.map(l => (
                    <tr key={l.id} className="hover:bg-emerald-50 cursor-pointer transition-colors" onClick={() => { setSelLedger(l); setScreen('ledger_stmt'); }}>
                      <td className={`${tdCls} text-blue-600 font-semibold`}>{l.name}</td>
                      <td className={tdRCls}>₹{fmt(Math.abs(l.currentBalance))}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50">
                    <td className="px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-500">Total Assets</td>
                    <td className="px-3 py-2.5 text-right text-sm font-bold text-slate-800 tabular-nums">₹{fmt(totalA)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
        <p className="text-[10px] text-slate-400">Click any ledger name to drill down to its statement.</p>
      </div>
    );
  };

  // ── P&L ────────────────────────────────────────────────────────────────
  const renderPL = () => {
    const revLedgers = ledgers.filter(l => groupMap.get(l.groupId)?.type === 'Revenue');
    const expLedgers = ledgers.filter(l => groupMap.get(l.groupId)?.type === 'Expense');
    const rev = revLedgers.reduce((s, l) => s + (l.currentBalance || 0), 0);
    const exp = expLedgers.reduce((s, l) => s + (l.currentBalance || 0), 0);
    const net = rev - exp;
    return (
      <div className="p-4 md:p-6 overflow-y-auto h-full space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Profit & Loss Statement</h3>
            <p className="text-xs text-slate-400">FY 2025-26</p>
          </div>
          <div className={`px-4 py-2 rounded-xl border ${net >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
            <p className={`text-[10px] font-black uppercase tracking-wider ${net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>Net {net >= 0 ? 'Profit' : 'Loss'}</p>
            <p className={`text-lg font-bold tabular-nums ${net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>₹{fmt(Math.abs(net))}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={cardCls}>
            <div className="px-5 py-3 border-b border-slate-100 bg-emerald-50">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Income</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <tbody>
                  {revLedgers.map(l => (
                    <tr key={l.id} className="hover:bg-emerald-50 cursor-pointer transition-colors" onClick={() => { setSelLedger(l); setScreen('ledger_stmt'); }}>
                      <td className={`${tdCls} text-blue-600`}>{l.name}</td>
                      <td className={`${tdRCls} text-emerald-700 font-bold`}>₹{fmt(l.currentBalance)}</td>
                    </tr>
                  ))}
                  {revLedgers.length === 0 && <tr><td colSpan={2} className="text-center py-6 text-xs text-slate-400">No revenue entries</td></tr>}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50">
                    <td className="px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-500">Total Income</td>
                    <td className="px-3 py-2.5 text-right text-sm font-bold text-emerald-700 tabular-nums">₹{fmt(rev)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          <div className={cardCls}>
            <div className="px-5 py-3 border-b border-slate-100 bg-rose-50">
              <p className="text-[10px] font-black uppercase tracking-widest text-rose-600">Expenses</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <tbody>
                  {expLedgers.map(l => (
                    <tr key={l.id} className="hover:bg-rose-50 cursor-pointer transition-colors" onClick={() => { setSelLedger(l); setScreen('ledger_stmt'); }}>
                      <td className={`${tdCls} text-blue-600`}>{l.name}</td>
                      <td className={`${tdRCls} text-rose-600 font-bold`}>₹{fmt(l.currentBalance)}</td>
                    </tr>
                  ))}
                  {expLedgers.length === 0 && <tr><td colSpan={2} className="text-center py-6 text-xs text-slate-400">No expense entries</td></tr>}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50">
                    <td className="px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-500">Total Expenses</td>
                    <td className="px-3 py-2.5 text-right text-sm font-bold text-rose-600 tabular-nums">₹{fmt(exp)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── Trial Balance ──────────────────────────────────────────────────────
  const renderTB = () => {
    const rows = ledgers.map(l => {
      const g = groupMap.get(l.groupId);
      const nd = g?.type === 'Asset' || g?.type === 'Expense';
      const dr = (nd && (l.currentBalance || 0) >= 0) || (!nd && (l.currentBalance || 0) < 0) ? Math.abs(l.currentBalance || 0) : 0;
      const cr = (!nd && (l.currentBalance || 0) >= 0) || (nd && (l.currentBalance || 0) < 0) ? Math.abs(l.currentBalance || 0) : 0;
      return { name: l.name, group: g?.name || '', dr, cr, ledger: l };
    }).filter(r => r.dr > 0 || r.cr > 0);
    const tdr = rows.reduce((s, r) => s + r.dr, 0);
    const tcr = rows.reduce((s, r) => s + r.cr, 0);
    const bal = Math.abs(tdr - tcr) < 0.01;
    return (
      <div className="p-4 md:p-6 overflow-y-auto h-full space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">Trial Balance</h3>
          {bal
            ? <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-full flex items-center gap-1"><CheckCircle2 size={11} /> Balanced</span>
            : <span className="text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-full flex items-center gap-1"><AlertTriangle size={11} /> Diff: ₹{fmt(Math.abs(tdr - tcr))}</span>
          }
        </div>
        <div className={cardCls}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr>
                <th className={thCls}>Ledger</th>
                <th className={thCls}>Group</th>
                <th className={thRCls}>Debit</th>
                <th className={thRCls}>Credit</th>
              </tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="hover:bg-emerald-50 cursor-pointer transition-colors" onClick={() => { setSelLedger(r.ledger); setScreen('ledger_stmt'); }}>
                    <td className={`${tdCls} text-blue-600 font-semibold`}>{r.name}</td>
                    <td className={`${tdCls} text-slate-400`}>{r.group}</td>
                    <td className={`${tdRCls} text-emerald-700 font-bold`}>{r.dr > 0 ? `₹${fmt(r.dr)}` : '-'}</td>
                    <td className={`${tdRCls} text-rose-600 font-bold`}>{r.cr > 0 ? `₹${fmt(r.cr)}` : '-'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50">
                  <td colSpan={2} className="px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-500">Total</td>
                  <td className="px-3 py-2.5 text-right text-sm font-bold text-emerald-700 tabular-nums">₹{fmt(tdr)}</td>
                  <td className="px-3 py-2.5 text-right text-sm font-bold text-rose-600 tabular-nums">₹{fmt(tcr)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
        <p className="text-[10px] text-slate-400">Click any row to view the Ledger Statement.</p>
      </div>
    );
  };

  // ── Outstanding ────────────────────────────────────────────────────────
  const renderOutstanding = () => {
    const AgingTable = ({ data, title, accentColor }: { data: typeof agingData.debtors; title: string; accentColor: string }) => (
      <div className={cardCls}>
        <div className={`px-5 py-3 border-b border-slate-100 ${accentColor}`}>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">{title}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>
              <th className={thCls}>Party</th>
              <th className={thRCls}>Total Due</th>
              <th className={thRCls}>0-30 days</th>
              <th className={thRCls}>31-60 days</th>
              <th className={thRCls}>61-90 days</th>
              <th className={`${thRCls} text-rose-500`}>90+ days</th>
              <th className={thCls}>Bills</th>
              <th className={thCls}></th>
            </tr></thead>
            <tbody>
              {data.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-xs text-slate-400">No outstanding amounts</td></tr>
              ) : data.map(r => (
                <tr key={r.ledger.id} className="hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => { setSelLedger(r.ledger); setScreen('ledger_stmt'); }}>
                  <td className={`${tdCls} font-semibold text-blue-600`}>{r.ledger.name}</td>
                  <td className={`${tdRCls} font-bold text-slate-800`}>₹{fmt(r.total)}</td>
                  <td className={`${tdRCls} text-emerald-600`}>{r.b0_30 > 0 ? `₹${fmt(r.b0_30)}` : '-'}</td>
                  <td className={`${tdRCls} text-amber-600`}>{r.b31_60 > 0 ? `₹${fmt(r.b31_60)}` : '-'}</td>
                  <td className={`${tdRCls} text-orange-600`}>{r.b61_90 > 0 ? `₹${fmt(r.b61_90)}` : '-'}</td>
                  <td className={`${tdRCls} text-rose-600 font-bold`}>{r.b90plus > 0 ? `₹${fmt(r.b90plus)}` : '-'}</td>
                  <td className={`${tdCls} text-slate-400 text-[10px]`}>{r.invoiceCount} bills</td>
                  <td className={tdCls} onClick={e => e.stopPropagation()}>
                    <button onClick={() => handleOutstandingWhatsApp(r)} className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg hover:bg-emerald-100 transition-all">WA</button>
                  </td>
                </tr>
              ))}
            </tbody>
            {data.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50">
                  <td className="px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-500">Total</td>
                  <td className="px-3 py-2.5 text-right text-xs font-bold tabular-nums">₹{fmt(data.reduce((s, r) => s + r.total, 0))}</td>
                  <td className="px-3 py-2.5 text-right text-xs font-bold text-emerald-600 tabular-nums">₹{fmt(data.reduce((s, r) => s + r.b0_30, 0))}</td>
                  <td className="px-3 py-2.5 text-right text-xs font-bold text-amber-600 tabular-nums">₹{fmt(data.reduce((s, r) => s + r.b31_60, 0))}</td>
                  <td className="px-3 py-2.5 text-right text-xs font-bold text-orange-600 tabular-nums">₹{fmt(data.reduce((s, r) => s + r.b61_90, 0))}</td>
                  <td className="px-3 py-2.5 text-right text-xs font-bold text-rose-600 tabular-nums">₹{fmt(data.reduce((s, r) => s + r.b90plus, 0))}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    );
    return (
      <div className="p-4 md:p-6 overflow-y-auto h-full space-y-4">
        <h3 className="text-sm font-bold text-slate-800">Outstanding — Aging Analysis</h3>
        <AgingTable data={agingData.debtors} title="Sundry Debtors — Receivables" accentColor="bg-emerald-50" />
        <AgingTable data={agingData.creditors} title="Sundry Creditors — Payables" accentColor="bg-rose-50" />
        <p className="text-[10px] text-slate-400">Aging calculated from invoice date. Click any party to view ledger statement.</p>
      </div>
    );
  };

  // ── GST Report ─────────────────────────────────────────────────────────
  const renderGST = () => {
    const salesV = vouchers.filter(v => v.type === 'Sales');
    const cnV = vouchers.filter(v => v.type === 'Credit Note');
    const totalSales = salesV.reduce((s, v) => s + v.totalAmount, 0);
    const totalCN = cnV.reduce((s, v) => s + v.totalAmount, 0);
    const taxable = totalSales / 1.12;
    const gst = totalSales - taxable;
    const outCGST = ledgers.find(l => l.id === 'LDG-CGST-OUT')?.currentBalance || 0;
    const outSGST = ledgers.find(l => l.id === 'LDG-SGST-OUT')?.currentBalance || 0;
    return (
      <div className="p-4 md:p-6 overflow-y-auto h-full space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800">GST Reports — GSTR-1</h3>
            <p className="text-xs text-slate-400">{new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleGSTExport} className={btnPrimary}><Download size={12} /> Export GSTR-1 JSON</button>
            <button onClick={() => {
              const csvRows = ['Voucher No,Date,Type,Amount,Narration', ...salesV.map(v => `${v.voucherNumber},${v.date},${v.type},${v.totalAmount},"${v.narration}"`)];
              const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
              const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `GST_Sales_${today()}.csv`; a.click();
            }} className={btnSecondary}><Download size={12} /> Export CSV</button>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Output CGST', val: `₹${fmt(outCGST)}`, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
            { label: 'Output SGST', val: `₹${fmt(outSGST)}`, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
            { label: 'Total GST Liability', val: `₹${fmt(outCGST + outSGST)}`, color: 'text-rose-700', bg: 'bg-rose-50 border-rose-200' },
            { label: 'GST from Sales Vouchers', val: `₹${fmt(gst)}`, color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
          ].map(s => (
            <div key={s.label} className={`rounded-2xl border p-4 ${s.bg}`}>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">{s.label}</p>
              <p className={`text-lg font-bold tabular-nums ${s.color}`}>{s.val}</p>
            </div>
          ))}
        </div>
        <div className={cardCls}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr>
                <th className={thCls}>Section</th>
                <th className={thRCls}>Invoices</th>
                <th className={thRCls}>Taxable Value</th>
                <th className={thRCls}>CGST</th>
                <th className={thRCls}>SGST</th>
                <th className={thRCls}>Total GST</th>
                <th className={thCls}>Status</th>
              </tr></thead>
              <tbody>
                <tr className="hover:bg-slate-50">
                  <td className={tdCls}>B2B (Registered)</td>
                  <td className={tdRCls}>{salesV.length}</td>
                  <td className={tdRCls}>₹{fmt(taxable)}</td>
                  <td className={tdRCls}>₹{fmt(gst / 2)}</td>
                  <td className={tdRCls}>₹{fmt(gst / 2)}</td>
                  <td className={`${tdRCls} text-amber-700 font-bold`}>₹{fmt(gst)}</td>
                  <td className={tdCls}><span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">Ready</span></td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className={tdCls}>Credit Notes</td>
                  <td className={tdRCls}>{cnV.length}</td>
                  <td className={tdRCls}>₹{fmt(totalCN / 1.12)}</td>
                  <td className={tdRCls}>-</td>
                  <td className={tdRCls}>-</td>
                  <td className={`${tdRCls} text-rose-600 font-bold`}>₹{fmt(totalCN - totalCN / 1.12)}</td>
                  <td className={tdCls}><span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">Ready</span></td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="bg-slate-50">
                  <td colSpan={2} className="px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-500">Totals</td>
                  <td className="px-3 py-2.5 text-right text-xs font-bold tabular-nums">₹{fmt(taxable - totalCN / 1.12)}</td>
                  <td colSpan={2}></td>
                  <td className="px-3 py-2.5 text-right text-sm font-bold text-amber-700 tabular-nums">₹{fmt(gst)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // ── Chart of Accounts ──────────────────────────────────────────────────
  const renderCOA = () => {
    const filtered = ledgers.filter(l => !coaSearch || l.name.toLowerCase().includes(coaSearch.toLowerCase()) || (groupMap.get(l.groupId)?.name || '').toLowerCase().includes(coaSearch.toLowerCase()));
    const typeColors: Record<string, string> = {
      Asset: 'text-blue-700 bg-blue-50 border-blue-200',
      Liability: 'text-rose-700 bg-rose-50 border-rose-200',
      Revenue: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      Expense: 'text-amber-700 bg-amber-50 border-amber-200',
      Equity: 'text-purple-700 bg-purple-50 border-purple-200',
    };
    return (
      <div className="p-4 md:p-6 overflow-y-auto h-full space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-sm font-bold text-slate-800">Chart of Accounts</h3>
          <div className="flex gap-1">
            {(['ledgers', 'groups'] as const).map(t => (
              <button key={t} onClick={() => setCoaTab(t)} className={`px-3 py-1.5 text-[10px] font-bold rounded-lg border transition-all ${coaTab === t ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                {t === 'ledgers' ? 'Ledgers' : 'Account Groups'}
              </button>
            ))}
          </div>
          <input className={`${inputCls} w-44`} placeholder="Search..." value={coaSearch} onChange={e => setCoaSearch(e.target.value)} />
          <div className="flex gap-2 ml-auto">
            <button className={btnPrimary} onClick={() => { setEditLedger(null); setLedgerFormData({ groupId: accountGroups[0]?.id, openingBalance: 0, currentBalance: 0, isActive: true }); setShowLedgerForm(true); }}>+ New Ledger</button>
            <button className={`${btnSecondary} border-amber-200 text-amber-700 hover:bg-amber-50`} onClick={async () => {
              addNotification('Reconciling…', 'Recalculating all ledger balances from vouchers.', 'info');
              const fixed = await reconcileLedgerBalances();
              addNotification('Reconciliation Done', `${fixed} ledger${fixed !== 1 ? 's' : ''} corrected.`, fixed > 0 ? 'success' : 'info');
            }}><RefreshCcw size={12} /> Reconcile</button>
          </div>
        </div>
        {coaTab === 'ledgers' ? (
          <div className={cardCls}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr>
                  <th className={thCls}>Ledger Name</th>
                  <th className={thCls}>Group</th>
                  <th className={thCls}>Type</th>
                  <th className={thRCls}>Opening Bal</th>
                  <th className={thRCls}>Current Bal</th>
                  <th className={thCls}>GSTIN</th>
                  <th className={thCls}>Actions</th>
                </tr></thead>
                <tbody>
                  {filtered.map(l => {
                    const g = groupMap.get(l.groupId);
                    return (
                      <tr key={l.id} className="hover:bg-slate-50">
                        <td className={`${tdCls} text-blue-600 font-semibold cursor-pointer`} onClick={() => { setSelLedger(l); setScreen('ledger_stmt'); }}>{l.name}</td>
                        <td className={`${tdCls} text-slate-400`}>{g?.name || l.groupId}</td>
                        <td className={tdCls}><span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${typeColors[g?.type || ''] || 'text-slate-600 bg-slate-50 border-slate-200'}`}>{g?.type}</span></td>
                        <td className={tdRCls}>₹{fmt(l.openingBalance || 0)}</td>
                        <td className={`${tdRCls} ${(l.currentBalance || 0) >= 0 ? 'text-emerald-700' : 'text-rose-600'} font-bold`}>₹{fmt(Math.abs(l.currentBalance || 0))}</td>
                        <td className={`${tdCls} text-slate-400 font-mono text-[10px]`}>{l.gstin || '—'}</td>
                        <td className={tdCls}>
                          <div className="flex gap-1">
                            <button className={btnSecondary} onClick={() => { setEditLedger(l); setLedgerFormData({ ...l }); setShowLedgerForm(true); }}>Edit</button>
                            {isAdmin && <button className={btnDanger} onClick={async () => { const confirmed = await showConfirm(`Delete "${l.name}"?`); if (confirmed) await removeLedger(l.id); }}>Del</button>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className={cardCls}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr>
                  <th className={thCls}>Group Name</th>
                  <th className={thCls}>Type</th>
                  <th className={thCls}>Parent Group</th>
                  <th className={thCls}>Ledgers</th>
                  <th className={thCls}>Actions</th>
                </tr></thead>
                <tbody>
                  {accountGroups.filter(g => !coaSearch || g.name.toLowerCase().includes(coaSearch.toLowerCase())).map(g => (
                    <tr key={g.id} className="hover:bg-slate-50">
                      <td className={`${tdCls} font-semibold`}>{g.name}</td>
                      <td className={tdCls}><span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${typeColors[g.type] || ''}`}>{g.type}</span></td>
                      <td className={`${tdCls} text-slate-400`}>{g.parentGroupId ? (groupMap.get(g.parentGroupId)?.name || g.parentGroupId) : '—'}</td>
                      <td className={tdCls}>{ledgers.filter(l => l.groupId === g.id).length}</td>
                      <td className={tdCls}>
                        {isAdmin && <button className={btnDanger} onClick={async () => {
                          const assignedCount = ledgers.filter(l => l.groupId === g.id).length;
                          if (assignedCount > 0) { addNotification('Cannot Delete', `"${g.name}" has ${assignedCount} ledger(s). Reassign first.`, 'alert'); return; }
                          const confirmed = await showConfirm(`Delete group "${g.name}"?`);
                          if (confirmed) await removeAccountGroup(g.id);
                        }}>Del</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {/* Ledger Form Modal */}
        {showLedgerForm && (
          <div className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-950 to-green-900 px-6 py-4">
                <h3 className="text-sm font-bold text-white">{editLedger ? 'Edit Ledger' : 'New Ledger'}</h3>
              </div>
              <div className="p-6 space-y-3">
                {[
                  { label: 'Ledger Name *', key: 'name', type: 'text' },
                  { label: 'Opening Balance', key: 'openingBalance', type: 'number' },
                  { label: 'GSTIN', key: 'gstin', type: 'text' },
                  { label: 'Phone', key: 'phone', type: 'text' },
                  { label: 'Email', key: 'email', type: 'email' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 block">{f.label}</label>
                    <input type={f.type} value={(ledgerFormData as any)[f.key] || ''} onChange={e => setLedgerFormData(p => ({ ...p, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value }))} className={inputCls} />
                  </div>
                ))}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 block">Account Group *</label>
                  <select value={ledgerFormData.groupId || ''} onChange={e => setLedgerFormData(p => ({ ...p, groupId: e.target.value }))} className={selectCls}>
                    {accountGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="px-6 pb-5 flex gap-2 justify-end">
                <button className={btnSecondary} onClick={() => setShowLedgerForm(false)}>Cancel</button>
                <button className={btnPrimary} onClick={async () => {
                  if (!ledgerFormData.name) { addNotification('Error', 'Ledger name required.', 'alert'); return; }
                  if (editLedger) {
                    await updateLedger(editLedger.id, ledgerFormData);
                    addNotification('Updated', `${ledgerFormData.name} updated.`, 'success');
                  } else {
                    const id = `LED-${Date.now()}`;
                    const ob = (ledgerFormData.openingBalance as number) || 0;
                    await addLedger({ id, name: ledgerFormData.name!, groupId: ledgerFormData.groupId!, openingBalance: ob, currentBalance: ob, gstin: ledgerFormData.gstin, phone: ledgerFormData.phone, email: ledgerFormData.email, isActive: true });
                    addNotification('Created', `${ledgerFormData.name} added.`, 'success');
                  }
                  setShowLedgerForm(false);
                }}>{editLedger ? 'Update' : 'Create'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── Ledger Statement ───────────────────────────────────────────────────
  const renderLedgerStatement = () => {
    if (!selLedger) return (
      <div className="p-8 text-center space-y-3">
        <p className="text-sm font-semibold text-slate-600">No ledger selected</p>
        <p className="text-xs text-slate-400">Click a ledger from Trial Balance, Balance Sheet, or Chart of Accounts.</p>
        <button className={btnSecondary} onClick={() => setScreen('tb')}>Open Trial Balance</button>
      </div>
    );
    const ob = selLedger.openingBalance || 0;
    const totalDr = ledgerStatementRows.reduce((s, r) => s + r.dr, 0);
    const totalCr = ledgerStatementRows.reduce((s, r) => s + r.cr, 0);
    return (
      <div className="p-4 md:p-6 overflow-y-auto h-full space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Ledger Statement — {selLedger.name}</h3>
            <p className="text-xs text-slate-400">Group: {groupMap.get(selLedger.groupId)?.name}</p>
          </div>
          <button className={btnSecondary} onClick={() => setScreen('tb')}>← Trial Balance</button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Opening Balance', val: fmt(Math.abs(ob)), color: 'text-blue-700 bg-blue-50 border-blue-200' },
            { label: 'Total Debit', val: fmt(totalDr), color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
            { label: 'Total Credit', val: fmt(totalCr), color: 'text-rose-700 bg-rose-50 border-rose-200' },
            { label: 'Closing Balance', val: fmt(Math.abs(selLedger.currentBalance || 0)), color: 'text-amber-700 bg-amber-50 border-amber-200' },
          ].map(s => (
            <div key={s.label} className={`rounded-2xl border p-4 ${s.color}`}>
              <p className="text-[10px] font-black uppercase tracking-wider opacity-60">{s.label}</p>
              <p className="text-lg font-bold tabular-nums">₹{s.val}</p>
            </div>
          ))}
        </div>
        <div className={cardCls}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr>
                <th className={thCls}>Date</th>
                <th className={thCls}>Voucher No</th>
                <th className={thCls}>Type</th>
                <th className={thCls}>Particulars</th>
                <th className={thRCls}>Debit</th>
                <th className={thRCls}>Credit</th>
                <th className={thRCls}>Balance</th>
              </tr></thead>
              <tbody>
                <tr className="bg-blue-50">
                  <td colSpan={6} className="px-3 py-2 text-xs text-blue-600 font-semibold">Opening Balance</td>
                  <td className={`${tdRCls} text-blue-700 font-bold`}>₹{fmt(Math.abs(ob))}</td>
                </tr>
                {ledgerStatementRows.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-xs text-slate-400">No transactions for this ledger yet.</td></tr>
                ) : ledgerStatementRows.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => setSelVoucher(selVoucher?.id === r.v.id ? null : r.v)}>
                    <td className={tdCls}>{fmtDate(r.v.date)}</td>
                    <td className={`${tdCls} font-bold text-blue-600 font-mono`}>{r.v.voucherNumber}</td>
                    <td className={tdCls}><span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full border ${voucherColors[r.v.type as VoucherMode] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>{r.v.type}</span></td>
                    <td className={tdCls}>{r.v.narration || r.v.entries.find(e => e.ledgerId !== selLedger?.id)?.ledgerName || ''}</td>
                    <td className={`${tdRCls} text-emerald-700`}>{r.dr > 0 ? `₹${fmt(r.dr)}` : '-'}</td>
                    <td className={`${tdRCls} text-rose-600`}>{r.cr > 0 ? `₹${fmt(r.cr)}` : '-'}</td>
                    <td className={`${tdRCls} font-bold ${r.runBal >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>₹{fmt(Math.abs(r.runBal))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50">
                  <td colSpan={4} className="px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-500">Totals / Closing</td>
                  <td className="px-3 py-2.5 text-right text-xs font-bold text-emerald-700 tabular-nums">₹{fmt(totalDr)}</td>
                  <td className="px-3 py-2.5 text-right text-xs font-bold text-rose-600 tabular-nums">₹{fmt(totalCr)}</td>
                  <td className="px-3 py-2.5 text-right text-sm font-bold text-amber-700 tabular-nums">₹{fmt(Math.abs(selLedger.currentBalance || 0))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // ── Bank Reconciliation ────────────────────────────────────────────────
  const renderBankRecon = () => {
    const bankLedgers = ledgers.filter(l => { const g = groupMap.get(l.groupId); return g?.id === 'GRP-BANK' || g?.id === 'GRP-CASH' || g?.name === 'Bank Accounts' || g?.name === 'Cash-in-Hand'; });
    const reconStatements = bankStatements.filter(s => (s as any).ledgerId === reconLedgerId);
    const unmatched = reconStatements.filter(s => !s.isMatched);
    const matched = reconStatements.filter(s => s.isMatched);
    return (
      <div className="p-4 md:p-6 overflow-y-auto h-full space-y-4">
        <h3 className="text-sm font-bold text-slate-800">Bank Reconciliation</h3>
        <div className={`${cardCls} p-5`}>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 block">Bank Ledger</label>
              <select value={reconLedgerId} onChange={e => setReconLedgerId(e.target.value)} className={`${selectCls} w-52`}>
                <option value="">-- Select --</option>
                {bankLedgers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 block">Bank Statement CSV</label>
              <input ref={fileInputRef} type="file" accept=".csv" className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file || !reconLedgerId) return;
                  const text = await file.text();
                  const lines = text.split('\n').slice(1);
                  const entries: BankStatementEntry[] = lines.filter(l => l.trim()).map((l, i) => {
                    const [date, description, debit, credit, reference] = l.split(',').map(s => s.trim().replace(/"/g, ''));
                    return { id: `BS-${Date.now()}-${i}`, date: date || today(), description: description || '', amount: parseFloat(credit || debit || '0') || 0, type: credit ? 'Credit' : 'Debit', reference, isMatched: false };
                  });
                  await uploadBankStatement(reconLedgerId, entries);
                  addNotification('Uploaded', `${entries.length} bank entries imported.`, 'success');
                }} />
              <button className={btnSecondary} onClick={() => fileInputRef.current?.click()}><Upload size={12} /> Upload CSV</button>
            </div>
            {reconLedgerId && (
              <button className={btnPrimary} disabled={autoMatching} onClick={handleAutoMatch}>
                {autoMatching ? <><Loader2 size={12} className="animate-spin" /> Matching...</> : <><Zap size={12} /> Auto-Match</>}
              </button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Entries', val: reconStatements.length, color: 'text-blue-700 bg-blue-50 border-blue-200' },
            { label: 'Matched', val: matched.length, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
            { label: 'Unmatched', val: unmatched.length, color: 'text-rose-700 bg-rose-50 border-rose-200' },
            { label: 'Match Rate', val: reconStatements.length > 0 ? `${Math.round(matched.length / reconStatements.length * 100)}%` : '—', color: 'text-amber-700 bg-amber-50 border-amber-200' },
          ].map(s => (
            <div key={s.label} className={`rounded-2xl border p-4 ${s.color}`}>
              <p className="text-[10px] font-black uppercase tracking-wider opacity-60">{s.label}</p>
              <p className="text-2xl font-bold">{s.val}</p>
            </div>
          ))}
        </div>
        <div className={cardCls}>
          <div className="px-5 py-3 border-b border-slate-100">
            <p className="text-[10px] font-black uppercase tracking-widest text-rose-500">Unmatched Bank Entries ({unmatched.length})</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr>
                <th className={thCls}>Date</th>
                <th className={thCls}>Description</th>
                <th className={thCls}>Type</th>
                <th className={thRCls}>Amount</th>
                <th className={thCls}>Reference</th>
                <th className={thCls}>Action</th>
              </tr></thead>
              <tbody>
                {unmatched.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-xs text-emerald-600 font-semibold"><span className="inline-flex items-center gap-1.5"><CheckCircle2 size={13} /> No unmatched entries. Great!</span></td></tr>
                ) : unmatched.slice(0, 20).map((s, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className={tdCls}>{fmtDate(s.date)}</td>
                    <td className={tdCls}>{s.description}</td>
                    <td className={tdCls}><span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${s.type === 'Credit' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-rose-700 bg-rose-50 border-rose-200'}`}>{s.type}</span></td>
                    <td className={tdRCls}>₹{fmt(s.amount)}</td>
                    <td className={`${tdCls} font-mono text-[10px] text-slate-400`}>{s.reference || '—'}</td>
                    <td className={tdCls}>
                      <button className={btnSecondary} onClick={() => { resetVf(s.type === 'Credit' ? 'Receipt' : 'Payment'); setVf(p => ({ ...p, narration: s.description, refNo: s.reference || '' })); }}>Create Voucher</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p className="text-[10px] text-slate-400">CSV format: Date, Description, Debit, Credit, Reference (header row skipped)</p>
      </div>
    );
  };

  // ── TDS Report ─────────────────────────────────────────────────────────
  const renderTDS = () => {
    const tdsTotal = tdsVouchers.reduce((s, v) => s + (v.totalAmount * ((v.tdsRate || 0) / 100)), 0);
    const tdsLedgerBal = tdsLedger?.currentBalance || 0;
    return (
      <div className="p-4 md:p-6 overflow-y-auto h-full space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">TDS / TCS Report — FY 2025-26</h3>
          <button className={btnSecondary} onClick={() => {
            const csvRows = ['Date,VoucherNo,Party,Section,BaseAmount,Rate,TDSAmount', ...tdsVouchers.map(v => {
              const tdsAmt = v.totalAmount * ((v.tdsRate || 0) / 100);
              return `${v.date},${v.voucherNumber},"${v.narration}",${v.tdsSection},${v.totalAmount},${v.tdsRate}%,${fmt(tdsAmt)}`;
            })];
            const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `TDS_Report_${today()}.csv`; a.click();
          }}><Download size={12} /> Export CSV</button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Vouchers with TDS', val: tdsVouchers.length.toString(), color: 'text-blue-700 bg-blue-50 border-blue-200' },
            { label: 'Total TDS Amount', val: `₹${fmt(tdsTotal)}`, color: 'text-amber-700 bg-amber-50 border-amber-200' },
            { label: 'TDS Payable Balance', val: `₹${fmt(Math.abs(tdsLedgerBal))}`, color: 'text-rose-700 bg-rose-50 border-rose-200' },
          ].map(s => (
            <div key={s.label} className={`rounded-2xl border p-4 ${s.color}`}>
              <p className="text-[10px] font-black uppercase tracking-wider opacity-60">{s.label}</p>
              <p className="text-xl font-bold tabular-nums">{s.val}</p>
            </div>
          ))}
        </div>
        <div className={cardCls}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr>
                <th className={thCls}>Date</th>
                <th className={thCls}>Voucher No</th>
                <th className={thCls}>Party</th>
                <th className={thCls}>Section</th>
                <th className={thRCls}>Base Amount</th>
                <th className={thRCls}>Rate</th>
                <th className={thRCls}>TDS Amount</th>
              </tr></thead>
              <tbody>
                {tdsVouchers.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-xs text-slate-400">No TDS entries. TDS rate can be set in Payment/Purchase vouchers.</td></tr>
                ) : tdsVouchers.map(v => {
                  const tdsAmt = v.totalAmount * ((v.tdsRate || 0) / 100);
                  const party = v.entries.find(e => !e.autoGenerated);
                  return (
                    <tr key={v.id} className="hover:bg-slate-50">
                      <td className={tdCls}>{fmtDate(v.date)}</td>
                      <td className={`${tdCls} font-bold text-blue-600 font-mono`}>{v.voucherNumber}</td>
                      <td className={tdCls}>{party?.ledgerName || v.narration}</td>
                      <td className={tdCls}><span className="text-[9px] font-black uppercase text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">u/s {v.tdsSection}</span></td>
                      <td className={tdRCls}>₹{fmt(v.totalAmount)}</td>
                      <td className={`${tdRCls} text-amber-600 font-bold`}>{v.tdsRate}%</td>
                      <td className={`${tdRCls} text-rose-600 font-bold`}>₹{fmt(tdsAmt)}</td>
                    </tr>
                  );
                })}
              </tbody>
              {tdsVouchers.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-50">
                    <td colSpan={6} className="px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-500">Total TDS Deducted</td>
                    <td className="px-3 py-2.5 text-right text-sm font-bold text-rose-600 tabular-nums">₹{fmt(tdsTotal)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
        <button className={btnPrimary} onClick={() => resetVf('Payment')}>+ TDS Payment (F5)</button>
      </div>
    );
  };

  // ── Fixed Assets ───────────────────────────────────────────────────────
  const renderFixedAssets = () => {
    const grossBlock = fixedAssets.reduce((s, a) => s + (a.purchaseCost || 0), 0);
    const accumDep = fixedAssets.reduce((s, a) => s + (a.accumulatedDepreciation || 0), 0);
    const netBlock = fixedAssets.reduce((s, a) => s + (a.netBookValue || 0), 0);
    return (
      <div className="p-4 md:p-6 overflow-y-auto h-full space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">Fixed Assets Register</h3>
          <button className={btnPrimary} onClick={() => setShowAssetForm(true)}>+ Add Asset</button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Assets', val: fixedAssets.length.toString(), color: 'text-blue-700 bg-blue-50 border-blue-200' },
            { label: 'Gross Block', val: `₹${fmt(grossBlock)}`, color: 'text-slate-700 bg-slate-50 border-slate-200' },
            { label: 'Net Book Value', val: `₹${fmt(netBlock)}`, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
            { label: 'Accum. Depreciation', val: `₹${fmt(accumDep)}`, color: 'text-rose-700 bg-rose-50 border-rose-200' },
          ].map(s => (
            <div key={s.label} className={`rounded-2xl border p-4 ${s.color}`}>
              <p className="text-[10px] font-black uppercase tracking-wider opacity-60">{s.label}</p>
              <p className="text-xl font-bold tabular-nums">{s.val}</p>
            </div>
          ))}
        </div>
        <div className={cardCls}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr>
                <th className={thCls}>Asset Name</th>
                <th className={thCls}>Purchase Date</th>
                <th className={thCls}>Method</th>
                <th className={thRCls}>Cost</th>
                <th className={thRCls}>Accum. Dep.</th>
                <th className={thRCls}>Net Book Value</th>
                <th className={thCls}>Status</th>
                <th className={thCls}>Actions</th>
              </tr></thead>
              <tbody>
                {fixedAssets.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-10 text-xs text-slate-400">No fixed assets recorded. Click "+ Add Asset" to start.</td></tr>
                ) : fixedAssets.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className={`${tdCls} font-semibold text-slate-800`}>{a.name}</td>
                    <td className={tdCls}>{fmtDate(a.purchaseDate)}</td>
                    <td className={tdCls}><span className="text-[9px] font-black uppercase text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">{a.depreciationMethod}</span></td>
                    <td className={tdRCls}>₹{fmt(a.purchaseCost)}</td>
                    <td className={`${tdRCls} text-rose-600`}>₹{fmt(a.accumulatedDepreciation || 0)}</td>
                    <td className={`${tdRCls} text-emerald-700 font-bold`}>₹{fmt(a.netBookValue || 0)}</td>
                    <td className={tdCls}>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${a.status === 'Active' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : a.status === 'Fully Depreciated' ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-rose-700 bg-rose-50 border-rose-200'}`}>{a.status}</span>
                    </td>
                    <td className={tdCls}>
                      <div className="flex gap-1">
                        {a.status === 'Active' && <button className={btnSecondary} onClick={() => handleRunDepreciation(a.id)}>Run Dep.</button>}
                        {isAdmin && <button className={btnDanger} onClick={async () => { const confirmed = await showConfirm(`Delete "${a.name}"?`); if (confirmed) await removeFixedAsset(a.id); }}>Del</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {fixedAssets.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-50">
                    <td colSpan={3} className="px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-500">Totals</td>
                    <td className="px-3 py-2.5 text-right text-xs font-bold tabular-nums">₹{fmt(grossBlock)}</td>
                    <td className="px-3 py-2.5 text-right text-xs font-bold text-rose-600 tabular-nums">₹{fmt(accumDep)}</td>
                    <td className="px-3 py-2.5 text-right text-xs font-bold text-emerald-700 tabular-nums">₹{fmt(netBlock)}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
        {depreciationSchedule.length > 0 && (
          <div className={cardCls}>
            <div className="px-5 py-3 border-b border-slate-100">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Depreciation Schedule (Last 10 Entries)</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr>
                  <th className={thCls}>Date</th>
                  <th className={thCls}>Asset</th>
                  <th className={thRCls}>Dep. Amount</th>
                  <th className={thRCls}>Accum. Dep.</th>
                  <th className={thRCls}>Net Book Value</th>
                </tr></thead>
                <tbody>
                  {depreciationSchedule.slice(-10).reverse().map((d, i) => {
                    const asset = fixedAssets.find(a => a.id === d.assetId);
                    return (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className={tdCls}>{fmtDate(d.date)}</td>
                        <td className={`${tdCls} font-semibold`}>{asset?.name || d.assetId}</td>
                        <td className={`${tdRCls} text-rose-600 font-bold`}>₹{fmt(d.amount)}</td>
                        <td className={tdRCls}>₹{fmt(d.accumulatedDepreciation)}</td>
                        <td className={`${tdRCls} text-emerald-700 font-bold`}>₹{fmt(d.netBookValue)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {/* Add Asset Modal */}
        {showAssetForm && (
          <div className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-950 to-green-900 px-6 py-4">
                <h3 className="text-sm font-bold text-white">Add Fixed Asset</h3>
              </div>
              <div className="p-6 space-y-3">
                {[
                  { label: 'Asset Name *', key: 'name', type: 'text' },
                  { label: 'Purchase Date *', key: 'purchaseDate', type: 'date' },
                  { label: 'Purchase Cost (₹) *', key: 'purchaseCost', type: 'number' },
                  { label: 'Useful Life (Years)', key: 'usefulLifeYears', type: 'number' },
                  { label: 'Salvage Value (₹)', key: 'salvageValue', type: 'number' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 block">{f.label}</label>
                    <input type={f.type} value={(assetForm as any)[f.key] || ''} onChange={e => setAssetForm(p => ({ ...p, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value }))} className={inputCls} />
                  </div>
                ))}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 block">Depreciation Method</label>
                  <select value={assetForm.depreciationMethod || 'SLM'} onChange={e => setAssetForm(p => ({ ...p, depreciationMethod: e.target.value as 'SLM' | 'WDV' }))} className={selectCls}>
                    <option value="SLM">SLM (Straight Line Method)</option>
                    <option value="WDV">WDV (Written Down Value)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 block">Asset Ledger</label>
                  <select value={assetForm.ledgerId || ''} onChange={e => setAssetForm(p => ({ ...p, ledgerId: e.target.value }))} className={selectCls}>
                    <option value="">-- Select Asset Ledger --</option>
                    {ledgers.filter(l => groupMap.get(l.groupId)?.type === 'Asset').map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="px-6 pb-5 flex gap-2 justify-end">
                <button className={btnSecondary} onClick={() => setShowAssetForm(false)}>Cancel</button>
                <button className={btnPrimary} onClick={handleSaveAsset}>Save Asset</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── Opening Balances ───────────────────────────────────────────────────
  const renderOpeningBal = () => {
    const filtOB = ledgers.filter(l => !searchQ || l.name.toLowerCase().includes(searchQ.toLowerCase()));
    return (
      <div className="p-4 md:p-6 overflow-y-auto h-full space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-sm font-bold text-slate-800">Opening Balances</h3>
          <input className={`${inputCls} w-48`} placeholder="Filter ledgers..." value={searchQ} onChange={e => setSearchQ(e.target.value)} />
          <div className="flex items-center gap-2 ml-auto">
            {Object.keys(obEdits).length > 0 && <span className="text-xs text-amber-600 font-semibold">{Object.keys(obEdits).length} edits pending</span>}
            <button className={btnPrimary} onClick={handleSaveOpeningBalances}><Save size={12} /> Save All Changes</button>
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3">
          <p className="text-xs text-amber-700 font-semibold flex items-start gap-1.5"><AlertTriangle size={13} className="shrink-0 mt-0.5" /> Editing opening balances will adjust the current balance by the difference. Use carefully at start of financial year.</p>
        </div>
        <div className={cardCls}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr>
                <th className={thCls}>Ledger</th>
                <th className={thCls}>Group</th>
                <th className={thCls}>Type</th>
                <th className={thRCls}>Current Opening Bal</th>
                <th className={thCls}>New Opening Bal</th>
              </tr></thead>
              <tbody>
                {filtOB.map(l => {
                  const g = groupMap.get(l.groupId);
                  const hasEdit = obEdits[l.id] !== undefined;
                  return (
                    <tr key={l.id} className={`hover:bg-slate-50 ${hasEdit ? 'bg-blue-50' : ''}`}>
                      <td className={`${tdCls} font-semibold`}>{l.name}</td>
                      <td className={`${tdCls} text-slate-400`}>{g?.name}</td>
                      <td className={tdCls}>{g?.type}</td>
                      <td className={tdRCls}>₹{fmt(l.openingBalance || 0)}</td>
                      <td className={tdCls}>
                        <input
                          type="number"
                          value={obEdits[l.id] !== undefined ? obEdits[l.id] : (l.openingBalance || 0)}
                          onChange={e => setObEdits(p => ({ ...p, [l.id]: e.target.value }))}
                          className={`w-36 bg-white border rounded-lg px-2 py-1 text-xs text-right focus:outline-none focus:ring-2 transition-all ${hasEdit ? 'border-emerald-400 ring-emerald-100' : 'border-slate-200'}`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // ── Shortcuts ──────────────────────────────────────────────────────────
  const renderShortcuts = () => {
    const groups = [
      {
        title: 'VOUCHER ENTRY', color: 'bg-blue-50 border-blue-200', items: [
          { key: 'F4', desc: 'Contra Voucher' }, { key: 'F5', desc: 'Payment Voucher' },
          { key: 'F6', desc: 'Receipt Voucher' }, { key: 'F7', desc: 'Journal Voucher' },
          { key: 'F8', desc: 'Sales Invoice' }, { key: 'F9', desc: 'Purchase Invoice' },
          { key: 'Ctrl+F8', desc: 'Credit Note' }, { key: 'Ctrl+F9', desc: 'Debit Note' },
        ]
      },
      {
        title: 'NAVIGATION', color: 'bg-emerald-50 border-emerald-200', items: [
          { key: 'F1', desc: 'Gateway of Accounts' }, { key: 'F2', desc: 'Change Date' },
          { key: 'Alt+G', desc: 'Go To (Global Search)' }, { key: 'Escape', desc: 'Go Back' },
          { key: 'Tab / Enter', desc: 'Next Field' }, { key: 'Ctrl+Home/End', desc: 'Scroll' },
        ]
      },
      {
        title: 'VOUCHER FORM', color: 'bg-amber-50 border-amber-200', items: [
          { key: 'Ctrl+A', desc: 'Accept & Post Voucher' }, { key: 'Ctrl+Q', desc: 'Quit without Save' },
          { key: 'Alt+C', desc: 'Create New Ledger inline' }, { key: 'Alt+I', desc: 'Insert Entry Row' },
          { key: 'Alt+D', desc: 'Delete Entry Row' }, { key: 'Alt+B', desc: 'Bill-wise Settlement' },
        ]
      },
    ];
    return (
      <div className="p-4 md:p-6 overflow-y-auto h-full space-y-6">
        <h3 className="text-sm font-bold text-slate-800">Keyboard Shortcuts</h3>
        {groups.map((g, i) => (
          <div key={i} className={`${cardCls}`}>
            <div className={`px-5 py-3 border-b border-slate-100 ${g.color}`}>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{g.title}</p>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {g.items.map((item, j) => (
                <div key={j} className="flex items-center gap-3 py-1.5">
                  <span className="text-[10px] font-black bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-lg min-w-[80px] text-center font-mono">{item.key}</span>
                  <span className="text-xs text-slate-600 font-semibold">{item.desc}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════════════
  // ── MAIN RENDER ───────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════
  return (
    <div className="h-full flex flex-col bg-slate-50/50 overflow-hidden">
      {renderGoTo()}
      {renderCreateLedgerModal()}
      {renderHeader()}
      <div className="flex flex-1 overflow-hidden">
        {renderSidebar()}
        <main className="flex-1 overflow-hidden">
          {screen === 'gateway' && !showVf && renderGateway()}
          {showVf && renderVoucher(vf.type)}
          {screen === 'daybook' && !showVf && renderDayBook()}
          {screen === 'bs' && !showVf && renderBS()}
          {screen === 'pl' && !showVf && renderPL()}
          {screen === 'tb' && !showVf && renderTB()}
          {screen === 'outstanding' && !showVf && renderOutstanding()}
          {screen === 'gst' && !showVf && renderGST()}
          {screen === 'coa' && !showVf && renderCOA()}
          {screen === 'ledger_stmt' && !showVf && renderLedgerStatement()}
          {screen === 'bank_recon' && !showVf && renderBankRecon()}
          {screen === 'tds' && !showVf && renderTDS()}
          {screen === 'fixed_assets' && !showVf && renderFixedAssets()}
          {screen === 'opening_bal' && !showVf && renderOpeningBal()}
          {screen === 'shortcuts' && !showVf && renderShortcuts()}
        </main>
      </div>
    </div>
  );
};
