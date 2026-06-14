import React, { useState, useMemo, useEffect, useRef } from 'react';
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

interface AccountingModuleProps { userRole?: 'Admin' | 'Employee'; }

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

// ── Component ──────────────────────────────────────────────────────────────
export const AccountingModule: React.FC<AccountingModuleProps> = ({ userRole }) => {
  const isAdmin = userRole === 'Admin';
  const {
    ledgers = [], vouchers = [], accountGroups = [], invoices = [],
    fixedAssets = [], depreciationSchedule = [], bankStatements = [], costCentres = [],
    addLedger, updateLedger, removeLedger,
    addAccountGroup, removeAccountGroup, updateAccountGroup,
    reverseVoucher, updateVoucher, postToLedger,
    addFixedAsset, updateFixedAsset, removeFixedAsset, computeDepreciation, postDepreciationEntry,
    uploadBankStatement, autoMatchBankEntries, ensurePartyLedger,
    addNotification, currentUser,
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
  const [selLedger, setSelLedger] = useState<Ledger | null>(null);
  const [selVoucher, setSelVoucher] = useState<AccountingVoucher | null>(null);
  const [searchQ, setSearchQ] = useState('');

  // ── Voucher Form State ────────────────────────────────────────────────
  const vfInit: VFState = {
    type: 'Payment', date: today(), accountName: '', accountId: '',
    entries: [
      { id: genId(), ledgerId: '', ledgerName: '', debit: 0, credit: 0 },
      { id: genId(), ledgerId: '', ledgerName: '', debit: 0, credit: 0 },
    ],
    narration: '', refNo: '', chequeNo: '', chequeDate: '',
    tdsRate: 0, tdsSection: '', tdsLedgerId: '',
    settlements: [],
  };
  const [vf, setVf] = useState<VFState>({ ...vfInit });
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
    setVf({ ...vfInit, type, date: today() });
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
  const ledgerMap = useMemo(() => new Map(ledgers.map(l => [l.id, l])), [ledgers]);

  const stats = useMemo(() => {
    const isBank = (g: AccountGroup | undefined) => g?.id === 'GRP-CASH' || g?.id === 'GRP-BANK' || g?.name === 'Cash-in-Hand' || g?.name === 'Bank Accounts';
    const isDr = (g: AccountGroup | undefined) => g?.id === 'GRP-DEBTORS' || g?.name === 'Sundry Debtors';
    const isCr = (g: AccountGroup | undefined) => g?.id === 'GRP-CREDITORS' || g?.name === 'Sundry Creditors';
    const sum = (fn: (g: AccountGroup | undefined) => boolean) =>
      ledgers.filter(l => fn(groupMap.get(l.groupId))).reduce((s, l) => s + (l.currentBalance || 0), 0);
    return { cashBank: sum(isBank), debtors: sum(isDr), creditors: Math.abs(sum(isCr)) };
  }, [ledgers, groupMap]);

  // Pending invoices for bill-wise settlement
  const partyPendingInvoices = useMemo(() => {
    if (!vf.accountName) return [];
    return invoices.filter(i =>
      i.customerName?.toUpperCase() === vf.accountName.toUpperCase() &&
      i.documentType === 'Invoice' &&
      i.status !== 'Paid' && i.status !== 'Cancelled' && i.status !== 'Draft'
    );
  }, [invoices, vf.accountName]);

  // TDS ledger
  const tdsLedger = useMemo(() => ledgers.find(l => l.name === 'TDS Payable' || l.id === 'LED-TDS-PAYABLE'), [ledgers]);

  // GoTo items
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
    const h = (e: KeyboardEvent) => {
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
        if (showVf) { const d = prompt('Voucher date (YYYY-MM-DD):', vf.date); if (d) setVf(p => ({ ...p, date: d })); }
        else { const d = prompt('Change date (YYYY-MM-DD):', daybookDate); if (d) setDaybookDate(d); }
        return;
      }
      if (e.key === 'F3') { e.preventDefault(); addNotification('Company Info', 'Sreemeditec — current company.', 'info'); return; }
      if (e.altKey && e.key === 'F1') { e.preventDefault(); addNotification('View', 'Detailed view toggled.', 'success'); return; }
      if (e.altKey && e.key === 'F2') { e.preventDefault(); const d = prompt('Change period:', daybookDate); if (d) setDaybookDate(d); return; }
      if (e.key === 'F4') { e.preventDefault(); resetVf('Contra'); return; }
      if (e.key === 'F5') { e.preventDefault(); resetVf('Payment'); return; }
      if (e.key === 'F6') { e.preventDefault(); resetVf('Receipt'); return; }
      if (e.key === 'F7') { e.preventDefault(); resetVf('Journal'); return; }
      if (e.key === 'F8' && !e.ctrlKey) { e.preventDefault(); resetVf('Sales'); return; }
      if (e.key === 'F9' && !e.ctrlKey) { e.preventDefault(); resetVf('Purchase'); return; }
      if (e.ctrlKey && e.key === 'F8') { e.preventDefault(); resetVf('Credit Note'); return; }
      if (e.ctrlKey && e.key === 'F9') { e.preventDefault(); resetVf('Debit Note'); return; }
      if (e.key === 'F11') { e.preventDefault(); addNotification('Features', 'F11 configuration.', 'info'); return; }
      if (e.key === 'F12') { e.preventDefault(); addNotification('Configure', 'F12 configuration.', 'info'); return; }

      if (e.key === 'Escape') {
        if (showVf) { if (window.confirm('Quit without saving?')) { setShowVf(false); setScreen('gateway'); setStatusMsg('Gateway of Accounts'); } return; }
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
        if (e.ctrlKey && (e.key === 'q' || e.key === 'Q')) { e.preventDefault(); if (window.confirm('Quit without saving?')) { setShowVf(false); setScreen('gateway'); } return; }
        if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); handleSaveVoucher(); return; }
        if (e.altKey && (e.key === 'c' || e.key === 'C')) { e.preventDefault(); setShowCreateLedger(true); return; }
        if (e.altKey && (e.key === 'd' || e.key === 'D')) { e.preventDefault(); const entries = vf.entries; if (entries.length > 2) delEntry(entries[entries.length - 2]?.id || entries[0]?.id); return; }
        if (e.altKey && (e.key === 'i' || e.key === 'I')) { e.preventDefault(); addEntry(); return; }
        if (e.altKey && (e.key === 'b' || e.key === 'B')) { e.preventDefault(); setShowBillSettle(s => !s); return; }
        return;
      }
      if (e.ctrlKey && e.key === 'Home') { e.preventDefault(); window.scrollTo(0, 0); return; }
      if (e.ctrlKey && e.key === 'End') { e.preventDefault(); window.scrollTo(0, document.body.scrollHeight); return; }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [showGoto, showVf, showCreateLedger, screen, vf, filteredGoto, daybookDate]);

  // ── Save Voucher ───────────────────────────────────────────────────────
  const handleSaveVoucher = async () => {
    if (td !== tc) { addNotification('Unbalanced', `Debit ₹${fmt(td)} ≠ Credit ₹${fmt(tc)}. Difference: ₹${fmt(Math.abs(diff))}`, 'alert'); return; }
    if (td === 0) { addNotification('Invalid', 'Amount cannot be zero.', 'alert'); return; }

    const entries = vf.entries.map(({ autoGenerated, ...r }) => r);

    // Add TDS entry if applicable
    if (vf.tdsRate > 0 && tdsLedger) {
      const tdsAmt = Math.round(td * (vf.tdsRate / 100) * 100) / 100;
      if (tdsAmt > 0) {
        entries.push({ id: genId(), ledgerId: tdsLedger.id, ledgerName: tdsLedger.name, debit: 0, credit: tdsAmt, narration: `TDS @${vf.tdsRate}% u/s ${vf.tdsSection}` });
      }
    }

    await postToLedger({
      type: vf.type as unknown as VoucherType,
      date: vf.date,
      entries,
      narration: vf.narration,
      totalAmount: td,
      referenceNumber: vf.refNo || undefined,
      chequeNo: vf.chequeNo || undefined,
      chequeDate: vf.chequeDate || undefined,
      tdsRate: vf.tdsRate || undefined,
      tdsSection: vf.tdsSection || undefined,
      settlements: vf.settlements.length > 0 ? vf.settlements.map(s => ({ invoiceId: s.invoiceId, invoiceNumber: s.invoiceNumber, voucherId: '', amount: s.amount, date: vf.date })) : undefined,
    });
    addNotification('Voucher Posted', `${vf.type} saved successfully.`, 'success');
    setShowVf(false);
    setScreen('gateway');
    setStatusMsg('Gateway of Accounts');
    setShowBillSettle(false);
  };

  // ── Create Ledger ──────────────────────────────────────────────────────
  const handleCreateLedger = async () => {
    if (!createLedgerForm.name.trim()) { addNotification('Error', 'Ledger name is required.', 'alert'); return; }
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

    // Auto-select in current entry if there's a pending entry
    if (pendingEntryId) {
      updateEntry(pendingEntryId, { ledgerId: id, ledgerName: newLedger.name });
      setPendingEntryId(null);
    }
    setShowCreateLedger(false);
    setCreateLedgerForm({ name: '', groupId: 'GRP-DEBTORS', openingBalance: '0', gstin: '', phone: '', email: '', address: '' });
  };

  // ── GST JSON Export ────────────────────────────────────────────────────
  const handleGSTExport = () => {
    const salesV = vouchers.filter(v => v.type === 'Sales');
    const gstr1 = {
      gstin: '33APGPS4675G2ZL',
      fp: new Date().toLocaleDateString('en-IN', { month: '2-digit', year: 'numeric' }).replace('/', ''),
      version: 'GST3.2.0',
      hash: 'hash',
      b2b: salesV.map(v => {
        const inv = invoices.find(i => i.id === v.referenceId);
        const taxable = v.totalAmount / 1.12;
        const tax = v.totalAmount - taxable;
        return {
          ctin: inv?.customerGstin || 'UNREGISTERED',
          inv: [{
            inum: v.voucherNumber, idt: v.date.split('-').reverse().join('-'),
            val: v.totalAmount, pos: '33', rchrg: 'N', etin: '',
            itms: [{ num: 1, itm_det: { txval: Math.round(taxable * 100) / 100, rt: 12, csamt: 0, camt: Math.round(tax / 2 * 100) / 100, samt: Math.round(tax / 2 * 100) / 100 } }],
          }],
        };
      }),
      nil: { inv: [] },
      exp: { exp_typ: [] },
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
    for (const [ledgerId, balStr] of updates) {
      const bal = parseFloat(balStr) || 0;
      const ldg = ledgers.find(l => l.id === ledgerId);
      if (ldg && ldg.openingBalance !== bal) {
        const diff2 = bal - (ldg.openingBalance || 0);
        await updateLedger(ledgerId, { openingBalance: bal, currentBalance: (ldg.currentBalance || 0) + diff2 });
      }
    }
    setObEdits({});
    addNotification('Opening Balances Saved', 'All ledger balances updated.', 'success');
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
          i.customerName?.toUpperCase() === l.name.toUpperCase() &&
          i.documentType === docType &&
          i.status !== 'Paid' && i.status !== 'Cancelled'
        );
        const buckets = { b0_30: 0, b31_60: 0, b61_90: 0, b90plus: 0 };
        partyInvoices.forEach(i => {
          const days = daysDiff(i.date);
          const amt = i.balanceDue ?? i.grandTotal ?? 0;
          if (days <= 30) buckets.b0_30 += amt;
          else if (days <= 60) buckets.b31_60 += amt;
          else if (days <= 90) buckets.b61_90 += amt;
          else buckets.b90plus += amt;
        });
        const total = Math.abs(l.currentBalance || 0);
        return { ledger: l, total, ...buckets, invoiceCount: partyInvoices.length };
      }).filter(r => r.total > 0 || r.invoiceCount > 0);

    return { debtors: calcAging(debtors, 'Invoice'), creditors: calcAging(creditors, 'SupplierPO') };
  }, [ledgers, invoices, groupMap]);

  // ── TDS vouchers ───────────────────────────────────────────────────────
  const tdsVouchers = useMemo(() =>
    vouchers.filter(v => v.tdsRate && v.tdsRate > 0),
    [vouchers]
  );

  // ── Render Helpers ─────────────────────────────────────────────────────
  const getStatusHints = () => {
    if (showVf) return 'Ctrl+A: Accept | Ctrl+Q: Quit | Alt+C: New Ledger | Alt+I: Add Line | Alt+D: Delete Line | Alt+B: Bill Settle';
    if (screen === 'gateway') return 'F4-F9: Vouchers | F1: Gateway | Alt+G: Go To | F2: Date | Ctrl+Home/End: Navigate';
    if (screen === 'daybook') return 'F2: Change Date | F5-F9: New Voucher | Esc: Back';
    if (screen === 'coa') return 'Click ledger to view statement | Edit/Delete ledgers | Add new ledger';
    if (screen === 'ledger_stmt') return 'Showing all transactions for selected ledger | Esc: Back';
    if (screen === 'outstanding') return 'Real-time aging based on invoice dates | F5: Payment | F6: Receipt';
    if (screen === 'gst') return 'Alt+E: Export GSTR-1 JSON | Click Export button for download';
    if (screen === 'bank_recon') return 'Upload statement → Auto-match → Review unmatched';
    if (screen === 'fixed_assets') return 'Add assets → Run depreciation → Auto-post journal';
    if (screen === 'opening_bal') return 'Edit opening balances → Save All';
    return 'F5-F9: Vouchers | Alt+G: Go To | F1: Gateway | F2: Date | Esc: Back';
  };

  // ── Render: Top Bar ────────────────────────────────────────────────────
  const renderTopBar = () => (
    <div className="tally-top-bar">
      <div className="tally-top-bar-left">SREEMEDITEC &nbsp;|&nbsp; <span style={{ color: '#42A5F5' }}>Accounts with Inventory</span></div>
      <div className="tally-top-bar-right">
        <span>FY: 1-Apr-2025 to 31-Mar-2026</span>
        <span>Date: <span className="tally-highlight">{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span></span>
        <span>User: {currentUser?.name || 'Admin'}</span>
      </div>
    </div>
  );

  // ── Render: FKey Bar ───────────────────────────────────────────────────
  const renderFKeyBar = () => (
    <div className="tally-fkey-bar" style={{ flexWrap: 'wrap' }}>
      <div className={`tally-fkey ${screen === 'gateway' && !showVf ? 'active' : ''}`} onClick={() => { setScreen('gateway'); setShowVf(false); setStatusMsg('Gateway'); }}>F1: Gateway</div>
      <div className={`tally-fkey ${showVf && vf.type === 'Contra' ? 'active' : ''}`} onClick={() => resetVf('Contra')}>F4: Contra</div>
      <div className={`tally-fkey ${showVf && vf.type === 'Payment' ? 'active' : ''}`} onClick={() => resetVf('Payment')}>F5: Payment</div>
      <div className={`tally-fkey ${showVf && vf.type === 'Receipt' ? 'active' : ''}`} onClick={() => resetVf('Receipt')}>F6: Receipt</div>
      <div className={`tally-fkey ${showVf && vf.type === 'Journal' ? 'active' : ''}`} onClick={() => resetVf('Journal')}>F7: Journal</div>
      <div className={`tally-fkey ${showVf && vf.type === 'Sales' ? 'active' : ''}`} onClick={() => resetVf('Sales')}>F8: Sales</div>
      <div className={`tally-fkey ${showVf && vf.type === 'Purchase' ? 'active' : ''}`} onClick={() => resetVf('Purchase')}>F9: Purchase</div>
      <div className={`tally-fkey ${screen === 'daybook' ? 'active' : ''}`} onClick={() => setScreen('daybook')}>Day Book</div>
      <div className={`tally-fkey ${screen === 'coa' ? 'active' : ''}`} onClick={() => setScreen('coa')}>Accounts</div>
      <div className={`tally-fkey ${screen === 'outstanding' ? 'active' : ''}`} onClick={() => setScreen('outstanding')}>Outstanding</div>
      <div className={`tally-fkey ${screen === 'gst' ? 'active' : ''}`} onClick={() => setScreen('gst')}>GST</div>
      <div className={`tally-fkey ${screen === 'bank_recon' ? 'active' : ''}`} onClick={() => setScreen('bank_recon')}>Bank Recon</div>
      <div className={`tally-fkey ${screen === 'fixed_assets' ? 'active' : ''}`} onClick={() => setScreen('fixed_assets')}>Assets</div>
      <div className="tally-fkey" style={{ marginLeft: 'auto', background: '#0A3060', borderColor: '#2196F3', color: '#90CAF9' }} onClick={() => { setShowGoto(true); setTimeout(() => gotoRef.current?.focus(), 50); }}>Alt+G: Go To</div>
    </div>
  );

  // ── Render: Status Bar ─────────────────────────────────────────────────
  const renderStatusBar = () => (
    <div className="tally-status-bar">
      <span className="hint"><b>{statusMsg}</b></span>
      <span className="hint">{showVf ? `Dr: ₹${fmt(td)}  Cr: ₹${fmt(tc)}  ${diff !== 0 ? `⚠ Diff: ₹${fmt(diff)}` : '✓ Balanced'}` : `Ledgers: ${ledgers.length} | Vouchers: ${vouchers.length} | Assets: ${fixedAssets.length}`}</span>
      <span className="hint">{getStatusHints()}</span>
    </div>
  );

  // ── Render: GoTo ───────────────────────────────────────────────────────
  const renderGoTo = () => (
    <div className={`tally-goto-overlay ${showGoto ? 'show' : ''}`} onClick={() => { setShowGoto(false); setGotoQ(''); }}>
      <div className="tally-goto-box" onClick={e => e.stopPropagation()}>
        <div className="tally-goto-title">Go To (type to search)</div>
        <input ref={gotoRef} className="tally-goto-input" placeholder="Search screens, ledgers, reports..." value={gotoQ} onChange={e => setGotoQ(e.target.value)} />
        <div className="tally-goto-results">
          {filteredGoto.map(item => (
            <div key={item.id} className="tally-goto-result-item" onClick={() => { item.action(); setShowGoto(false); setGotoQ(''); }}>
              <span><span className="gtype">{item.type.toUpperCase()}</span> &nbsp; {item.label}</span>
              {item.shortcut && <span className="shortcut">{item.shortcut}</span>}
            </div>
          ))}
          {filteredGoto.length === 0 && <div style={{ padding: 10, textAlign: 'center', color: '#3A6A90', fontSize: 11 }}>No matches</div>}
        </div>
      </div>
    </div>
  );

  // ── Render: Left Menu ──────────────────────────────────────────────────
  const renderLeftMenu = () => (
    <div className="tally-left-menu">
      {[
        {
          section: 'TRANSACTIONS', items: [
            { label: 'Payment', action: () => resetVf('Payment'), shortcut: 'F5' },
            { label: 'Receipt', action: () => resetVf('Receipt'), shortcut: 'F6' },
            { label: 'Journal', action: () => resetVf('Journal'), shortcut: 'F7' },
            { label: 'Sales', action: () => resetVf('Sales'), shortcut: 'F8' },
            { label: 'Purchase', action: () => resetVf('Purchase'), shortcut: 'F9' },
            { label: 'Contra', action: () => resetVf('Contra'), shortcut: 'F4' },
            { label: 'Credit Note', action: () => resetVf('Credit Note'), shortcut: 'CF8' },
            { label: 'Debit Note', action: () => resetVf('Debit Note'), shortcut: 'CF9' },
          ]
        },
        {
          section: 'MASTERS', items: [
            { label: 'Chart of Accounts', action: () => setScreen('coa') },
            { label: 'Opening Balances', action: () => setScreen('opening_bal') },
            { label: 'Fixed Assets', action: () => setScreen('fixed_assets') },
          ]
        },
        {
          section: 'REPORTS', items: [
            { label: 'Day Book', action: () => setScreen('daybook') },
            { label: 'Balance Sheet', action: () => setScreen('bs') },
            { label: 'Profit & Loss', action: () => setScreen('pl') },
            { label: 'Trial Balance', action: () => setScreen('tb') },
            { label: 'Outstanding', action: () => setScreen('outstanding') },
            { label: 'GST Reports', action: () => setScreen('gst') },
            { label: 'TDS Report', action: () => setScreen('tds') },
            { label: 'Bank Recon', action: () => setScreen('bank_recon') },
          ]
        },
        { section: 'HELP', items: [{ label: '⌨ Shortcut Keys', action: () => setScreen('shortcuts') }] },
      ].map((sec, i) => (
        <React.Fragment key={i}>
          <div className="tally-menu-section-title">{sec.section}</div>
          {sec.items.map((item, j) => (
            <div key={j} className="tally-menu-item" onClick={item.action}>
              <span>{item.label}</span>
              {(item as any).shortcut && <span className="shortcut">{(item as any).shortcut}</span>}
            </div>
          ))}
        </React.Fragment>
      ))}
    </div>
  );

  // ── Render: Create Ledger Modal ────────────────────────────────────────
  const renderCreateLedgerModal = () => (
    <div style={{ display: showCreateLedger ? 'flex' : 'none', position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#0A1929', border: '1px solid #1E4976', borderRadius: 8, padding: 24, width: 480, maxWidth: '95vw' }}>
        <div style={{ color: '#90CAF9', fontSize: 13, fontWeight: 'bold', marginBottom: 16, borderBottom: '1px solid #1A3A5A', paddingBottom: 8 }}>
          Alt+C — Create New Ledger
        </div>
        {[
          { label: 'Ledger Name *', key: 'name', type: 'text' },
          { label: 'Opening Balance', key: 'openingBalance', type: 'number' },
          { label: 'GSTIN', key: 'gstin', type: 'text' },
          { label: 'Phone', key: 'phone', type: 'text' },
          { label: 'Email', key: 'email', type: 'email' },
          { label: 'Address', key: 'address', type: 'text' },
        ].map(f => (
          <div key={f.key} style={{ marginBottom: 10 }}>
            <div style={{ color: '#5A8AB0', fontSize: 10, marginBottom: 3 }}>{f.label}</div>
            <input
              type={f.type}
              value={(createLedgerForm as any)[f.key]}
              onChange={e => setCreateLedgerForm(p => ({ ...p, [f.key]: e.target.value }))}
              style={{ width: '100%', background: '#091D30', border: '1px solid #1A3A5A', color: '#A8CCE8', padding: '6px 10px', borderRadius: 4, fontSize: 12, boxSizing: 'border-box' }}
            />
          </div>
        ))}
        <div style={{ marginBottom: 14 }}>
          <div style={{ color: '#5A8AB0', fontSize: 10, marginBottom: 3 }}>Account Group *</div>
          <select
            value={createLedgerForm.groupId}
            onChange={e => setCreateLedgerForm(p => ({ ...p, groupId: e.target.value }))}
            style={{ width: '100%', background: '#091D30', border: '1px solid #1A3A5A', color: '#A8CCE8', padding: '6px 10px', borderRadius: 4, fontSize: 12 }}
          >
            {accountGroups.map(g => <option key={g.id} value={g.id}>{g.name} ({g.type})</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="tally-fkey" onClick={() => setShowCreateLedger(false)}>Cancel (Esc)</button>
          <button className="tally-fkey" style={{ background: '#0A3060', borderColor: '#2196F3', color: '#90CAF9' }} onClick={handleCreateLedger}>Create Ledger</button>
        </div>
      </div>
    </div>
  );

  // ── Render: Gateway ────────────────────────────────────────────────────
  const renderGateway = () => (
    <>
      <div className="tally-section-header">GATEWAY OF ACCOUNTS — <span style={{ color: '#64B5F6', fontWeight: 'normal', fontSize: 11 }}>Select a module or use keyboard shortcuts</span></div>
      <div className="tally-gateway">
        <div className="tally-gw-box">
          <div className="tally-gw-box-title">TRANSACTIONS</div>
          {(['Payment', 'Receipt', 'Journal', 'Sales', 'Purchase', 'Contra', 'Credit Note', 'Debit Note'] as VoucherMode[]).map(v => (
            <div key={v} className="tally-gw-item" style={{ color: '#42A5F5' }} onClick={() => resetVf(v)}>
              <span>→ {v}</span><span className="sk">{shortKeys[v]}</span>
            </div>
          ))}
        </div>
        <div className="tally-gw-box">
          <div className="tally-gw-box-title">REPORTS</div>
          {[
            { label: 'Balance Sheet', id: 'bs' }, { label: 'Profit & Loss', id: 'pl' },
            { label: 'Trial Balance', id: 'tb' }, { label: 'Day Book', id: 'daybook' },
            { label: 'Outstanding (Aging)', id: 'outstanding' }, { label: 'GST Reports', id: 'gst' },
            { label: 'TDS Report', id: 'tds' }, { label: 'Bank Reconciliation', id: 'bank_recon' },
          ].map((r, i) => (
            <div key={i} className="tally-gw-item" onClick={() => setScreen(r.id as TallyScreen)}><span>{r.label}</span></div>
          ))}
        </div>
        <div className="tally-gw-box">
          <div className="tally-gw-box-title">MASTERS</div>
          {[
            { label: 'Chart of Accounts', id: 'coa' }, { label: 'Opening Balances', id: 'opening_bal' },
            { label: 'Fixed Assets', id: 'fixed_assets' }, { label: 'Shortcut Keys', id: 'shortcuts' },
          ].map((r, i) => (
            <div key={i} className="tally-gw-item" onClick={() => setScreen(r.id as TallyScreen)}><span>{r.label}</span></div>
          ))}
          <div style={{ marginTop: 10 }}>
            <div className="tally-info-box">
              <div style={{ color: '#5A8AB0', fontSize: 10, marginBottom: 4 }}>COMPANY</div>
              <div style={{ color: '#A8CCE8', fontSize: 11 }}>Sreemeditec</div>
              <div style={{ color: '#4A90C4', fontSize: 10 }}>FY: Apr 2025 – Mar 2026</div>
              <div style={{ color: '#4A90C4', fontSize: 10 }}>{new Date().toLocaleDateString('en-IN')}</div>
            </div>
          </div>
        </div>
      </div>
      <div className="tally-dashboard">
        <div className="tally-dash-card">
          <div className="tally-dash-card-title">Cash & Bank</div>
          {ledgers.filter(l => { const g = groupMap.get(l.groupId); return g?.id === 'GRP-CASH' || g?.id === 'GRP-BANK' || g?.name === 'Cash-in-Hand' || g?.name === 'Bank Accounts'; }).slice(0, 5).map(l => (
            <div key={l.id} className="tally-dash-row"><span>{l.name}</span><span>₹{fmt(l.currentBalance)}</span></div>
          ))}
          <div className="tally-dash-row" style={{ borderTop: '1px solid #1A3A5A', marginTop: 4, paddingTop: 4 }}>
            <span style={{ color: '#90CAF9' }}>TOTAL</span>
            <span style={{ color: '#00C853', fontWeight: 'bold' }}>₹{fmt(stats.cashBank)}</span>
          </div>
        </div>
        <div className="tally-dash-card">
          <div className="tally-dash-card-title">Receivables & Payables</div>
          <div className="tally-dash-row"><span>Total Receivable</span><span className="tally-green">₹{fmt(stats.debtors)}</span></div>
          <div className="tally-dash-row"><span>Overdue 90+ days</span><span className="tally-red">₹{fmt(agingData.debtors.reduce((s, r) => s + r.b90plus, 0))}</span></div>
          <div className="tally-dash-row" style={{ borderTop: '1px solid #1A3A5A', marginTop: 4, paddingTop: 4 }}>
            <span>Total Payable</span><span className="tally-red">₹{fmt(stats.creditors)}</span>
          </div>
          <div className="tally-dash-row"><span>TDS Deducted (FY)</span><span className="tally-highlight">₹{fmt(tdsVouchers.reduce((s, v) => s + v.totalAmount * ((v.tdsRate || 0) / 100), 0))}</span></div>
        </div>
        <div className="tally-dash-card">
          <div className="tally-dash-card-title">Fixed Assets</div>
          <div className="tally-dash-row"><span>Total Assets</span><span className="tally-green">{fixedAssets.length}</span></div>
          <div className="tally-dash-row"><span>Gross Block</span><span>₹{fmt(fixedAssets.reduce((s, a) => s + (a.purchaseCost || 0), 0))}</span></div>
          <div className="tally-dash-row"><span>Net Book Value</span><span className="tally-highlight">₹{fmt(fixedAssets.reduce((s, a) => s + (a.netBookValue || 0), 0))}</span></div>
          <div className="tally-dash-row"><span>Accum. Depreciation</span><span className="tally-red">₹{fmt(fixedAssets.reduce((s, a) => s + (a.accumulatedDepreciation || 0), 0))}</span></div>
        </div>
      </div>
    </>
  );

  // ── Render: Voucher ────────────────────────────────────────────────────
  const renderVoucher = (type: VoucherMode) => {
    const prefixes: Record<VoucherMode, string> = { Payment: 'PMT', Receipt: 'RCP', Contra: 'CON', Journal: 'JNL', Sales: 'SLS', Purchase: 'PUR', 'Debit Note': 'DN', 'Credit Note': 'CN' };
    const autoNo = `${prefixes[type]}-2526-${String(vouchers.filter(v => v.type === type).length + 1).padStart(4, '0')}`;
    return (
      <>
        <div className="tally-voucher-header">
          <span className="tally-highlight">{type} Voucher</span>
          <span>No: <span style={{ color: '#42A5F5' }}>{autoNo}</span> &nbsp;|&nbsp; Ctrl+A: Post &nbsp;|&nbsp; F2: Date &nbsp;|&nbsp; Alt+C: New Ledger &nbsp;|&nbsp; Alt+B: Bill Settle &nbsp;|&nbsp; Esc: Quit</span>
        </div>
        <div className="tally-voucher-body">
          {/* Date */}
          <div className="tally-voucher-field">
            <span className="field-label">Date</span>
            <span className="field-value">
              <input className="field-input" style={{ width: 100 }} type="date" value={vf.date} onChange={e => setVf(p => ({ ...p, date: e.target.value }))} />
            </span>
          </div>
          {/* Account */}
          <div className="tally-voucher-field">
            <span className="field-label">Party Ledger</span>
            <span className="field-value">
              <select className="field-input" style={{ width: 300 }} value={vf.accountId} onChange={e => {
                const l = ledgers.find(x => x.id === e.target.value);
                setVf(p => ({ ...p, accountId: e.target.value, accountName: l?.name || '' }));
              }}>
                <option value="">-- Select Party --</option>
                {ledgers.filter(l => l.isActive !== false).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
              <button className="tally-fkey" style={{ marginLeft: 8, fontSize: 10 }} onClick={() => { setPendingEntryId(null); setShowCreateLedger(true); }}>+ New (Alt+C)</button>
            </span>
          </div>
          {/* Entries Table */}
          <div className="tally-voucher-field"><span className="field-label">Particulars</span></div>
          <table className="tally-vt">
            <thead>
              <tr>
                <th style={{ width: '42%' }}>Ledger Name</th>
                <th style={{ width: 110 }}>Dr Amount</th>
                <th style={{ width: 110 }}>Cr Amount</th>
                <th>Narration</th>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {vf.entries.map((e, idx) => (
                <tr key={e.id} className={idx === vf.entries.length - 1 ? 'cursor-row' : ''}>
                  <td>
                    <select className="field-input" style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid #2196F3' }}
                      value={e.ledgerId}
                      onChange={ev => updateEntry(e.id, { ledgerId: ev.target.value, ledgerName: ledgers.find(x => x.id === ev.target.value)?.name || '' })}>
                      <option value="">-- Select Ledger --</option>
                      {ledgers.filter(l => l.isActive !== false).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </td>
                  <td>
                    <input className="field-input" style={{ width: '100%', textAlign: 'right', background: 'transparent', border: 'none' }}
                      type="number" value={e.debit || ''}
                      onChange={ev => updateEntry(e.id, { debit: Number(ev.target.value) || 0, credit: 0 })} />
                  </td>
                  <td>
                    <input className="field-input" style={{ width: '100%', textAlign: 'right', background: 'transparent', border: 'none' }}
                      type="number" value={e.credit || ''}
                      onChange={ev => updateEntry(e.id, { credit: Number(ev.target.value) || 0, debit: 0 })} />
                  </td>
                  <td><input className="field-input" style={{ width: '100%', background: 'transparent', border: 'none', fontSize: 10 }}
                    value={e.narration || ''} onChange={ev => updateEntry(e.id, { narration: ev.target.value })} placeholder="optional..." /></td>
                  <td><button className="tally-fkey" style={{ fontSize: 9, padding: '0 4px' }} onClick={() => delEntry(e.id)} disabled={vf.entries.length <= 2}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="tally-voucher-total">
            Dr: <span style={{ color: '#64B5F6' }}>₹{fmt(td)}</span> &nbsp;|&nbsp; Cr: <span style={{ color: '#64B5F6' }}>₹{fmt(tc)}</span> &nbsp;|&nbsp;
            {diff !== 0 ? <span className="tally-red">⚠ Diff: ₹{fmt(diff)}</span> : <span style={{ color: '#00C853' }}>✓ Balanced</span>}
          </div>
          <button className="tally-fkey" onClick={addEntry} style={{ marginBottom: 8 }}>+ Add Entry (Alt+I)</button>

          {/* Narration */}
          <div className="tally-voucher-field">
            <span className="field-label">Narration</span>
            <span className="field-value">
              <input className="field-input" style={{ width: 400 }} value={vf.narration} onChange={e => setVf(p => ({ ...p, narration: e.target.value }))} placeholder="Enter description..." />
            </span>
          </div>

          {/* Ref No */}
          <div className="tally-voucher-field">
            <span className="field-label">Ref / Bill No.</span>
            <span className="field-value">
              <input className="field-input" style={{ width: 200 }} value={vf.refNo} onChange={e => setVf(p => ({ ...p, refNo: e.target.value }))} placeholder="e.g. INV-001" />
            </span>
          </div>

          {/* Cheque fields */}
          {(type === 'Payment' || type === 'Receipt') && (
            <div className="tally-voucher-field">
              <span className="field-label">Cheque / DD No.</span>
              <span className="field-value">
                <input className="field-input" style={{ width: 150 }} value={vf.chequeNo} onChange={e => setVf(p => ({ ...p, chequeNo: e.target.value }))} placeholder="Chq no." />
                &nbsp; Date: <input className="field-input" style={{ width: 90 }} type="date" value={vf.chequeDate} onChange={e => setVf(p => ({ ...p, chequeDate: e.target.value }))} />
              </span>
            </div>
          )}

          {/* TDS Section */}
          {(type === 'Payment' || type === 'Purchase') && (
            <div style={{ margin: '8px 0', padding: 10, background: '#060F18', border: '1px solid #1A3A5A', borderRadius: 4 }}>
              <div style={{ color: '#90CAF9', fontSize: 11, marginBottom: 6, fontWeight: 'bold' }}>TDS (Tax Deducted at Source)</div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ color: '#5A8AB0', fontSize: 10 }}>TDS Rate %</div>
                  <input className="field-input" style={{ width: 70 }} type="number" value={vf.tdsRate || ''} placeholder="0"
                    onChange={e => setVf(p => ({ ...p, tdsRate: Number(e.target.value) || 0 }))} />
                </div>
                <div>
                  <div style={{ color: '#5A8AB0', fontSize: 10 }}>Section</div>
                  <select className="field-input" style={{ width: 120 }} value={vf.tdsSection}
                    onChange={e => setVf(p => ({ ...p, tdsSection: e.target.value }))}>
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
                  <div style={{ color: '#FF9800', fontSize: 11 }}>
                    TDS Amount: ₹{fmt(td * vf.tdsRate / 100)}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bill-wise Settlement */}
          {showBillSettle && (type === 'Receipt' || type === 'Payment') && (
            <div style={{ margin: '8px 0', padding: 10, background: '#060F18', border: '1px solid #1A3A5A', borderRadius: 4 }}>
              <div style={{ color: '#90CAF9', fontSize: 11, marginBottom: 6, fontWeight: 'bold' }}>Bill-wise Settlement (Alt+B)</div>
              {partyPendingInvoices.length === 0 ? (
                <div style={{ color: '#3A6A90', fontSize: 11 }}>No pending invoices for this party.</div>
              ) : (
                <table className="tally-rpt" style={{ width: '100%' }}>
                  <thead><tr><th style={{ width: 30 }}></th><th>Invoice</th><th>Date</th><th style={{ textAlign: 'right' }}>Amount</th><th style={{ width: 100 }}>Settle Amt</th></tr></thead>
                  <tbody>
                    {partyPendingInvoices.map(inv => {
                      const existing = vf.settlements.find(s => s.invoiceId === inv.id);
                      return (
                        <tr key={inv.id}>
                          <td>
                            <input type="checkbox" checked={!!existing}
                              onChange={e => {
                                if (e.target.checked) {
                                  setVf(p => ({ ...p, settlements: [...p.settlements, { invoiceId: inv.id, invoiceNumber: inv.invoiceNumber, amount: inv.balanceDue ?? inv.grandTotal ?? 0 }] }));
                                } else {
                                  setVf(p => ({ ...p, settlements: p.settlements.filter(s => s.invoiceId !== inv.id) }));
                                }
                              }} />
                          </td>
                          <td style={{ color: '#42A5F5' }}>{inv.invoiceNumber}</td>
                          <td style={{ fontSize: 10 }}>{inv.date}</td>
                          <td className="amt">₹{fmt(inv.balanceDue ?? inv.grandTotal ?? 0)}</td>
                          <td>
                            {existing && (
                              <input className="field-input" type="number" style={{ width: 80 }} value={existing.amount}
                                onChange={e => setVf(p => ({ ...p, settlements: p.settlements.map(s => s.invoiceId === inv.id ? { ...s, amount: Number(e.target.value) } : s) }))} />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Action bar */}
          <div style={{ marginTop: 12, padding: 8, background: '#060F18', border: '1px solid #1A3A5A', fontSize: 11, color: '#4A90C4', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <span><span className="tally-highlight">Ctrl+A</span>: Post</span>
            <span><span className="tally-highlight">Alt+C</span>: New Ledger</span>
            <span><span className="tally-highlight">Alt+I</span>: Add Line</span>
            <span><span className="tally-highlight">Alt+D</span>: Delete Line</span>
            <span><span className="tally-highlight">Alt+B</span>: Bill Settle</span>
            <span><span className="tally-highlight">Esc</span>: Quit</span>
          </div>
        </div>
      </>
    );
  };

  // ── Render: Day Book ───────────────────────────────────────────────────
  const renderDayBook = () => {
    const dayVouchers = vouchers.filter(v => {
      if (dateFrom && dateTo) return v.date >= dateFrom && v.date <= dateTo;
      return v.date === daybookDate;
    }).sort((a, b) => a.date.localeCompare(b.date) || a.voucherNumber.localeCompare(b.voucherNumber));
    return (
      <>
        <div className="tally-section-header">DAY BOOK</div>
        <div className="tally-db-filter">
          <span>Single Date:</span>
          <input type="date" value={daybookDate} onChange={e => setDaybookDate(e.target.value)} />
          <span style={{ marginLeft: 12 }}>Range — From:</span>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <span>To:</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          <span style={{ marginLeft: 'auto' }}>{dayVouchers.length} entries</span>
        </div>
        <div style={{ padding: '8px 14px', flex: 1, overflow: 'auto' }}>
          <table className="tally-rpt" style={{ width: '100%' }}>
            <thead>
              <tr><th>Date</th><th>Voucher No</th><th>Type</th><th>Particulars</th><th style={{ textAlign: 'right' }}>Debit</th><th style={{ textAlign: 'right' }}>Credit</th></tr>
            </thead>
            <tbody>
              {dayVouchers.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 20, color: '#3A6A90' }}>No transactions. Press F2 to change date or adjust range.</td></tr>
              ) : dayVouchers.map(v => (
                <tr key={v.id} onClick={() => setSelVoucher(selVoucher?.id === v.id ? null : v)} style={{ cursor: 'pointer', background: selVoucher?.id === v.id ? '#091D30' : '' }}>
                  <td style={{ fontSize: 11 }}>{fmtDate(v.date)}</td>
                  <td style={{ fontWeight: 'bold', color: '#42A5F5' }}>{v.voucherNumber}</td>
                  <td style={{ fontSize: 10, color: '#90CAF9' }}>{v.type}</td>
                  <td style={{ fontSize: 11 }}>{v.narration || v.entries[0]?.ledgerName}</td>
                  <td className="amt">{v.entries.reduce((s, e) => s + e.debit, 0) > 0 ? `₹${fmt(v.entries.reduce((s, e) => s + e.debit, 0))}` : '-'}</td>
                  <td className="amt">{v.entries.reduce((s, e) => s + e.credit, 0) > 0 ? `₹${fmt(v.entries.reduce((s, e) => s + e.credit, 0))}` : '-'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="total-row">
                <td colSpan={4} style={{ padding: '6px 10px' }}>TOTALS</td>
                <td style={{ padding: '6px 10px', textAlign: 'right' }}>₹{fmt(dayVouchers.reduce((s, v) => s + v.entries.reduce((se, e) => se + e.debit, 0), 0))}</td>
                <td style={{ padding: '6px 10px', textAlign: 'right' }}>₹{fmt(dayVouchers.reduce((s, v) => s + v.entries.reduce((se, e) => se + e.credit, 0), 0))}</td>
              </tr>
            </tfoot>
          </table>
          {selVoucher && (
            <div style={{ marginTop: 12, background: '#091D30', border: '1px solid #1A3A5A', padding: 12 }}>
              <div style={{ color: '#90CAF9', fontSize: 12, fontWeight: 'bold', marginBottom: 6 }}>{selVoucher.type} — {selVoucher.voucherNumber} ({fmtDate(selVoucher.date)})</div>
              <table className="tally-rpt" style={{ width: '100%' }}>
                <thead><tr><th>Ledger</th><th style={{ textAlign: 'right' }}>Debit</th><th style={{ textAlign: 'right' }}>Credit</th></tr></thead>
                <tbody>
                  {selVoucher.entries.map((e, i) => (
                    <tr key={i}><td>{e.ledgerName}</td><td className="cr">{e.debit > 0 ? `₹${fmt(e.debit)}` : '-'}</td><td className="dr">{e.credit > 0 ? `₹${fmt(e.credit)}` : '-'}</td></tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: 6, fontSize: 11, color: '#5A8AB0' }}>Narration: {selVoucher.narration}</div>
              {selVoucher.chequeNo && <div style={{ fontSize: 11, color: '#5A8AB0' }}>Cheque: {selVoucher.chequeNo} dated {selVoucher.chequeDate}</div>}
              {selVoucher.tdsRate && <div style={{ fontSize: 11, color: '#FF9800' }}>TDS: @{selVoucher.tdsRate}% u/s {selVoucher.tdsSection}</div>}
              {isAdmin && (
                <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                  <button className="tally-fkey" style={{ fontSize: 10 }} onClick={async () => { await reverseVoucher(selVoucher.id, 'Cancelled by user'); setSelVoucher(null); addNotification('Cancelled', 'Voucher reversed.', 'success'); }}>Cancel Voucher</button>
                </div>
              )}
            </div>
          )}
        </div>
      </>
    );
  };

  // ── Render: Balance Sheet ──────────────────────────────────────────────
  const renderBS = () => {
    const isLiability = (g?: AccountGroup) => g && (g.type === 'Liability' || g.type === 'Equity');
    const isAsset = (g?: AccountGroup) => g && g.type === 'Asset';
    const lbs = ledgers.filter(l => isLiability(groupMap.get(l.groupId)));
    const as = ledgers.filter(l => isAsset(groupMap.get(l.groupId)));
    const totalL = lbs.reduce((s, l) => s + Math.abs(l.currentBalance || 0), 0);
    const totalA = as.reduce((s, l) => s + Math.abs(l.currentBalance || 0), 0);
    return (
      <div style={{ padding: '8px 14px', flex: 1, overflow: 'auto' }}>
        <div className="tally-section-header" style={{ textAlign: 'center', marginBottom: 12 }}>BALANCE SHEET — Sreemeditec <span style={{ fontSize: 11, color: '#64B5F6', fontWeight: 'normal' }}>as on {new Date().toLocaleDateString('en-IN')}</span></div>
        <table className="tally-rpt" style={{ maxWidth: 700, margin: '0 auto' }}>
          <thead><tr><th style={{ width: '50%' }}>LIABILITIES</th><th style={{ textAlign: 'right' }}>Amount</th><th style={{ width: '50%' }}>ASSETS</th><th style={{ textAlign: 'right' }}>Amount</th></tr></thead>
          <tbody>
            {Array.from({ length: Math.max(lbs.length, as.length, 1) }, (_, i) => (
              <tr key={i}>
                <td style={{ cursor: lbs[i] ? 'pointer' : 'default', color: lbs[i] ? '#A8CCE8' : '' }}
                  onClick={() => { if (lbs[i]) { setSelLedger(lbs[i]); setScreen('ledger_stmt'); } }}>{lbs[i]?.name || ''}</td>
                <td className="amt">{lbs[i] ? `₹${fmt(Math.abs(lbs[i].currentBalance))}` : ''}</td>
                <td style={{ cursor: as[i] ? 'pointer' : 'default', color: as[i] ? '#A8CCE8' : '' }}
                  onClick={() => { if (as[i]) { setSelLedger(as[i]); setScreen('ledger_stmt'); } }}>{as[i]?.name || ''}</td>
                <td className="amt">{as[i] ? `₹${fmt(Math.abs(as[i].currentBalance))}` : ''}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="total-row">
              <td>TOTAL LIABILITIES</td><td style={{ textAlign: 'right', padding: '6px 10px' }}>₹{fmt(totalL)}</td>
              <td>TOTAL ASSETS</td><td style={{ textAlign: 'right', padding: '6px 10px' }}>₹{fmt(totalA)}</td>
            </tr>
          </tfoot>
        </table>
        {totalL > 0 && totalA > 0 && Math.abs(totalL - totalA) < 1 && (
          <div style={{ textAlign: 'center', marginTop: 12, fontSize: 11, color: '#00C853' }}>✓ Balance Sheet Balanced: ₹{fmt(totalL)}</div>
        )}
        {Math.abs(totalL - totalA) > 1 && (
          <div style={{ textAlign: 'center', marginTop: 12, fontSize: 11, color: '#FF5252' }}>⚠ Difference: ₹{fmt(Math.abs(totalL - totalA))} — check Trial Balance</div>
        )}
        <div style={{ textAlign: 'center', marginTop: 8, fontSize: 10, color: '#3A6A90' }}>Click any ledger name to view its statement</div>
      </div>
    );
  };

  // ── Render: P&L ────────────────────────────────────────────────────────
  const renderPL = () => {
    const revLedgers = ledgers.filter(l => groupMap.get(l.groupId)?.type === 'Revenue');
    const expLedgers = ledgers.filter(l => groupMap.get(l.groupId)?.type === 'Expense');
    const rev = revLedgers.reduce((s, l) => s + (l.currentBalance || 0), 0);
    const exp = expLedgers.reduce((s, l) => s + (l.currentBalance || 0), 0);
    const net = rev - exp;
    return (
      <div style={{ padding: '8px 14px', flex: 1, overflow: 'auto' }}>
        <div className="tally-section-header" style={{ textAlign: 'center', marginBottom: 12 }}>PROFIT & LOSS STATEMENT <span style={{ fontSize: 11, color: '#64B5F6', fontWeight: 'normal' }}>FY 2025-26</span></div>
        <table className="tally-rpt" style={{ maxWidth: 560, margin: '0 auto' }}>
          <thead><tr><th>Particulars</th><th style={{ textAlign: 'right' }}>Amount</th></tr></thead>
          <tbody>
            <tr className="group-row"><td>INCOME</td><td></td></tr>
            {revLedgers.map(l => (
              <tr key={l.id} style={{ cursor: 'pointer' }} onClick={() => { setSelLedger(l); setScreen('ledger_stmt'); }}>
                <td style={{ paddingLeft: 20, color: '#A8CCE8' }}>{l.name}</td><td className="cr">₹{fmt(l.currentBalance)}</td>
              </tr>
            ))}
            <tr className="total-row"><td>TOTAL INCOME</td><td style={{ textAlign: 'right' }}>₹{fmt(rev)}</td></tr>
            <tr className="group-row"><td>EXPENSES</td><td></td></tr>
            {expLedgers.map(l => (
              <tr key={l.id} style={{ cursor: 'pointer' }} onClick={() => { setSelLedger(l); setScreen('ledger_stmt'); }}>
                <td style={{ paddingLeft: 20, color: '#A8CCE8' }}>{l.name}</td><td className="dr">₹{fmt(l.currentBalance)}</td>
              </tr>
            ))}
            <tr className="total-row"><td>TOTAL EXPENSES</td><td style={{ textAlign: 'right' }}>₹{fmt(exp)}</td></tr>
          </tbody>
          <tfoot>
            <tr className="total-row">
              <td style={{ fontSize: 13 }}>NET {net >= 0 ? 'PROFIT' : 'LOSS'}</td>
              <td className={net >= 0 ? 'cr' : 'dr'} style={{ fontSize: 13, fontWeight: 'bold' }}>₹{fmt(Math.abs(net))}</td>
            </tr>
          </tfoot>
        </table>
        <div style={{ textAlign: 'center', marginTop: 8, fontSize: 10, color: '#3A6A90' }}>Click any ledger to drill down to transactions</div>
      </div>
    );
  };

  // ── Render: Trial Balance ──────────────────────────────────────────────
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
      <div style={{ padding: '8px 14px', flex: 1, overflow: 'auto' }}>
        <div className="tally-section-header" style={{ textAlign: 'center', marginBottom: 12 }}>TRIAL BALANCE</div>
        {!bal && <div style={{ textAlign: 'center', marginBottom: 8, fontSize: 11, color: '#FF5252' }}>⚠ Difference: ₹{fmt(Math.abs(tdr - tcr))}</div>}
        <table className="tally-rpt" style={{ width: '100%' }}>
          <thead><tr><th>Ledger</th><th>Group</th><th style={{ textAlign: 'right' }}>Debit</th><th style={{ textAlign: 'right' }}>Credit</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ cursor: 'pointer' }} onClick={() => { setSelLedger(r.ledger); setScreen('ledger_stmt'); }}>
                <td style={{ color: '#A8CCE8' }}>{r.name}</td>
                <td style={{ color: '#4A90C4', fontSize: 10 }}>{r.group}</td>
                <td className="cr">{r.dr > 0 ? `₹${fmt(r.dr)}` : '-'}</td>
                <td className="dr">{r.cr > 0 ? `₹${fmt(r.cr)}` : '-'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="total-row"><td colSpan={2}>TOTAL</td><td style={{ textAlign: 'right' }}>₹{fmt(tdr)}</td><td style={{ textAlign: 'right' }}>₹{fmt(tcr)}</td></tr>
          </tfoot>
        </table>
        {bal && <div style={{ textAlign: 'center', marginTop: 8, fontSize: 11, color: '#00C853' }}>✓ Trial Balance is Balanced</div>}
        <div style={{ textAlign: 'center', marginTop: 6, fontSize: 10, color: '#3A6A90' }}>Click any row to view the Ledger Statement</div>
      </div>
    );
  };

  // ── Render: Outstanding (with real aging) ──────────────────────────────
  const renderOutstanding = () => {
    const AgingTable = ({ data, title }: { data: typeof agingData.debtors; title: string }) => (
      <>
        <div className="tally-section-header" style={{ marginBottom: 8 }}>{title}</div>
        <table className="tally-rpt" style={{ width: '100%', marginBottom: 20 }}>
          <thead>
            <tr><th>Party</th><th style={{ textAlign: 'right' }}>Total Due</th><th style={{ textAlign: 'right' }}>0-30 days</th><th style={{ textAlign: 'right' }}>31-60 days</th><th style={{ textAlign: 'right' }}>61-90 days</th><th style={{ textAlign: 'right', color: '#FF5252' }}>90+ days</th><th>Invoices</th></tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 16, color: '#3A6A90' }}>No outstanding amounts</td></tr>
            ) : data.map(r => (
              <tr key={r.ledger.id} style={{ cursor: 'pointer' }} onClick={() => { setSelLedger(r.ledger); setScreen('ledger_stmt'); }}>
                <td style={{ color: '#A8CCE8' }}>{r.ledger.name}</td>
                <td className="amt" style={{ fontWeight: 'bold' }}>₹{fmt(r.total)}</td>
                <td className="amt" style={{ color: '#00C853' }}>{r.b0_30 > 0 ? `₹${fmt(r.b0_30)}` : '-'}</td>
                <td className="amt" style={{ color: '#FF9800' }}>{r.b31_60 > 0 ? `₹${fmt(r.b31_60)}` : '-'}</td>
                <td className="amt" style={{ color: '#FF5722' }}>{r.b61_90 > 0 ? `₹${fmt(r.b61_90)}` : '-'}</td>
                <td className="amt" style={{ color: '#FF1744', fontWeight: 'bold' }}>{r.b90plus > 0 ? `₹${fmt(r.b90plus)}` : '-'}</td>
                <td style={{ fontSize: 10, color: '#4A90C4' }}>{r.invoiceCount} bills</td>
              </tr>
            ))}
          </tbody>
          {data.length > 0 && (
            <tfoot>
              <tr className="total-row">
                <td>TOTAL</td>
                <td style={{ textAlign: 'right' }}>₹{fmt(data.reduce((s, r) => s + r.total, 0))}</td>
                <td style={{ textAlign: 'right' }}>₹{fmt(data.reduce((s, r) => s + r.b0_30, 0))}</td>
                <td style={{ textAlign: 'right' }}>₹{fmt(data.reduce((s, r) => s + r.b31_60, 0))}</td>
                <td style={{ textAlign: 'right' }}>₹{fmt(data.reduce((s, r) => s + r.b61_90, 0))}</td>
                <td style={{ textAlign: 'right', color: '#FF1744' }}>₹{fmt(data.reduce((s, r) => s + r.b90plus, 0))}</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </>
    );
    return (
      <div style={{ padding: '8px 14px', flex: 1, overflow: 'auto' }}>
        <AgingTable data={agingData.debtors} title="OUTSTANDING RECEIVABLES — Sundry Debtors" />
        <AgingTable data={agingData.creditors} title="OUTSTANDING PAYABLES — Sundry Creditors" />
        <div style={{ fontSize: 10, color: '#3A6A90', marginTop: 8 }}>Aging calculated from invoice date. Click any party to view ledger statement.</div>
      </div>
    );
  };

  // ── Render: GST ───────────────────────────────────────────────────────
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
      <div style={{ padding: '8px 14px', flex: 1, overflow: 'auto' }}>
        <div className="tally-section-header" style={{ marginBottom: 12 }}>
          GSTR-1 REPORT — {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
        </div>
        <table className="tally-rpt" style={{ width: '100%', marginBottom: 12 }}>
          <thead><tr><th>Section</th><th style={{ textAlign: 'right' }}>Invoices</th><th style={{ textAlign: 'right' }}>Taxable Value</th><th style={{ textAlign: 'right' }}>CGST</th><th style={{ textAlign: 'right' }}>SGST</th><th style={{ textAlign: 'right' }}>Total GST</th><th>Status</th></tr></thead>
          <tbody>
            <tr><td>B2B (Registered)</td><td style={{ textAlign: 'right' }}>{salesV.length}</td><td className="amt">₹{fmt(taxable)}</td><td className="amt">₹{fmt(gst / 2)}</td><td className="amt">₹{fmt(gst / 2)}</td><td className="amt">₹{fmt(gst)}</td><td><span style={{ color: '#00C853' }}>Ready</span></td></tr>
            <tr><td>Credit Notes</td><td style={{ textAlign: 'right' }}>{cnV.length}</td><td className="amt">₹{fmt(totalCN / 1.12)}</td><td className="amt">-</td><td className="amt">-</td><td className="amt">₹{fmt(totalCN - totalCN / 1.12)}</td><td><span style={{ color: cnV.length > 0 ? '#00C853' : '#3A6A90' }}>Ready</span></td></tr>
          </tbody>
          <tfoot>
            <tr className="total-row"><td colSpan={2}>TOTALS</td><td style={{ textAlign: 'right' }}>₹{fmt(taxable - totalCN / 1.12)}</td><td colSpan={2}></td><td style={{ textAlign: 'right' }}>₹{fmt(gst)}</td><td></td></tr>
          </tfoot>
        </table>
        <div style={{ background: '#091D30', border: '1px solid #1A3A5A', padding: 12, marginBottom: 12 }}>
          <div style={{ color: '#90CAF9', fontSize: 11, fontWeight: 'bold', marginBottom: 8 }}>GST Liability Summary</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { label: 'Output CGST (Collected)', val: outCGST, color: '#FF9800' },
              { label: 'Output SGST (Collected)', val: outSGST, color: '#FF9800' },
              { label: 'Total GST Liability', val: outCGST + outSGST, color: '#FF5252' },
              { label: 'GST from Sales Vouchers', val: gst, color: '#42A5F5' },
            ].map((item, i) => (
              <div key={i} style={{ background: '#060F18', padding: 8, borderRadius: 4, border: '1px solid #1A3A5A' }}>
                <div style={{ color: '#5A8AB0', fontSize: 10 }}>{item.label}</div>
                <div style={{ color: item.color, fontSize: 14, fontWeight: 'bold' }}>₹{fmt(Math.abs(item.val))}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="tally-fkey" style={{ background: '#0A3060', borderColor: '#2196F3', color: '#90CAF9' }} onClick={handleGSTExport}>
            ⬇ Export GSTR-1 JSON
          </button>
          <button className="tally-fkey" onClick={() => {
            const csvRows = ['Voucher No,Date,Type,Amount,Narration', ...salesV.map(v => `${v.voucherNumber},${v.date},${v.type},${v.totalAmount},"${v.narration}"`)];
            const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `GST_Sales_${today()}.csv`; a.click();
          }}>⬇ Export CSV</button>
          <button className="tally-fkey" onClick={() => window.print()}>🖨 Print</button>
        </div>
      </div>
    );
  };

  // ── Render: COA / Ledger Management ───────────────────────────────────
  const renderCOA = () => {
    const filtered = ledgers.filter(l => !coaSearch || l.name.toLowerCase().includes(coaSearch.toLowerCase()) || (groupMap.get(l.groupId)?.name || '').toLowerCase().includes(coaSearch.toLowerCase()));
    const groupColors: Record<string, string> = { Asset: '#42A5F5', Liability: '#FF5252', Revenue: '#00C853', Expense: '#FF9800', Equity: '#AB47BC' };
    return (
      <div style={{ padding: '8px 14px', flex: 1, overflow: 'auto' }}>
        <div className="tally-section-header" style={{ marginBottom: 10 }}>CHART OF ACCOUNTS — Ledger Management</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['ledgers', 'groups'] as const).map(t => (
              <button key={t} className="tally-fkey" style={{ background: coaTab === t ? '#0A3060' : '', borderColor: coaTab === t ? '#2196F3' : '' }} onClick={() => setCoaTab(t)}>{t === 'ledgers' ? 'Ledgers' : 'Account Groups'}</button>
            ))}
          </div>
          <input style={{ background: '#091D30', border: '1px solid #1A3A5A', color: '#A8CCE8', padding: '4px 10px', borderRadius: 4, fontSize: 11, marginLeft: 8 }}
            placeholder="Search..." value={coaSearch} onChange={e => setCoaSearch(e.target.value)} />
          <button className="tally-fkey" style={{ marginLeft: 'auto', background: '#0A3060', borderColor: '#2196F3', color: '#90CAF9' }}
            onClick={() => { setEditLedger(null); setLedgerFormData({ groupId: accountGroups[0]?.id, openingBalance: 0, currentBalance: 0, isActive: true }); setShowLedgerForm(true); }}>
            + New Ledger
          </button>
        </div>

        {coaTab === 'ledgers' ? (
          <table className="tally-rpt" style={{ width: '100%' }}>
            <thead><tr><th>Ledger Name</th><th>Group</th><th>Type</th><th style={{ textAlign: 'right' }}>Opening Bal</th><th style={{ textAlign: 'right' }}>Current Bal</th><th>GSTIN</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map(l => {
                const g = groupMap.get(l.groupId);
                return (
                  <tr key={l.id} style={{ cursor: 'pointer' }}>
                    <td style={{ color: '#A8CCE8' }} onClick={() => { setSelLedger(l); setScreen('ledger_stmt'); }}>{l.name}</td>
                    <td style={{ fontSize: 10, color: '#4A90C4' }}>{g?.name || l.groupId}</td>
                    <td><span style={{ color: groupColors[g?.type || ''] || '#A8CCE8', fontSize: 10, fontWeight: 'bold' }}>{g?.type}</span></td>
                    <td className="amt" style={{ fontSize: 11 }}>₹{fmt(l.openingBalance || 0)}</td>
                    <td className="amt" style={{ color: (l.currentBalance || 0) >= 0 ? '#00C853' : '#FF5252' }}>₹{fmt(Math.abs(l.currentBalance || 0))}</td>
                    <td style={{ fontSize: 10, color: '#5A8AB0' }}>{l.gstin || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="tally-fkey" style={{ fontSize: 9, padding: '0 6px' }}
                          onClick={() => { setEditLedger(l); setLedgerFormData({ ...l }); setShowLedgerForm(true); }}>Edit</button>
                        {isAdmin && <button className="tally-fkey" style={{ fontSize: 9, padding: '0 6px', borderColor: '#FF5252', color: '#FF5252' }}
                          onClick={async () => { if (window.confirm(`Delete "${l.name}"?`)) await removeLedger(l.id); }}>Del</button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <table className="tally-rpt" style={{ width: '100%' }}>
            <thead><tr><th>Group Name</th><th>Type</th><th>Parent Group</th><th>Ledgers</th><th>Actions</th></tr></thead>
            <tbody>
              {accountGroups.filter(g => !coaSearch || g.name.toLowerCase().includes(coaSearch.toLowerCase())).map(g => (
                <tr key={g.id}>
                  <td style={{ color: groupColors[g.type] || '#A8CCE8' }}>{g.name}</td>
                  <td><span style={{ color: groupColors[g.type], fontSize: 10, fontWeight: 'bold' }}>{g.type}</span></td>
                  <td style={{ fontSize: 10, color: '#4A90C4' }}>{g.parentGroupId ? (groupMap.get(g.parentGroupId)?.name || g.parentGroupId) : '—'}</td>
                  <td style={{ fontSize: 11 }}>{ledgers.filter(l => l.groupId === g.id).length}</td>
                  <td>
                    {isAdmin && <button className="tally-fkey" style={{ fontSize: 9, padding: '0 6px', borderColor: '#FF5252', color: '#FF5252' }}
                      onClick={async () => { if (window.confirm(`Delete group "${g.name}"?`)) await removeAccountGroup(g.id); }}>Del</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Ledger Edit Form Modal */}
        {showLedgerForm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#0A1929', border: '1px solid #1E4976', borderRadius: 8, padding: 24, width: 500 }}>
              <div style={{ color: '#90CAF9', fontSize: 13, fontWeight: 'bold', marginBottom: 16 }}>{editLedger ? 'Edit Ledger' : 'New Ledger'}</div>
              {[
                { label: 'Ledger Name *', key: 'name', type: 'text' },
                { label: 'Opening Balance', key: 'openingBalance', type: 'number' },
                { label: 'GSTIN', key: 'gstin', type: 'text' },
                { label: 'Phone', key: 'phone', type: 'text' },
                { label: 'Email', key: 'email', type: 'email' },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: 10 }}>
                  <div style={{ color: '#5A8AB0', fontSize: 10, marginBottom: 3 }}>{f.label}</div>
                  <input type={f.type} value={(ledgerFormData as any)[f.key] || ''}
                    onChange={e => setLedgerFormData(p => ({ ...p, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value }))}
                    style={{ width: '100%', background: '#091D30', border: '1px solid #1A3A5A', color: '#A8CCE8', padding: '6px 10px', borderRadius: 4, fontSize: 12, boxSizing: 'border-box' }} />
                </div>
              ))}
              <div style={{ marginBottom: 14 }}>
                <div style={{ color: '#5A8AB0', fontSize: 10, marginBottom: 3 }}>Account Group *</div>
                <select value={ledgerFormData.groupId || ''} onChange={e => setLedgerFormData(p => ({ ...p, groupId: e.target.value }))}
                  style={{ width: '100%', background: '#091D30', border: '1px solid #1A3A5A', color: '#A8CCE8', padding: '6px 10px', borderRadius: 4, fontSize: 12 }}>
                  {accountGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="tally-fkey" onClick={() => setShowLedgerForm(false)}>Cancel</button>
                <button className="tally-fkey" style={{ background: '#0A3060', borderColor: '#2196F3', color: '#90CAF9' }} onClick={async () => {
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

  // ── Render: Ledger Statement ───────────────────────────────────────────
  const renderLedgerStatement = () => {
    if (!selLedger) return (
      <div style={{ padding: 40, textAlign: 'center', color: '#3A6A90' }}>
        <div style={{ fontSize: 13, marginBottom: 8 }}>No ledger selected</div>
        <div style={{ fontSize: 11 }}>Click a ledger from Trial Balance, Balance Sheet, or COA.</div>
        <button className="tally-fkey" style={{ marginTop: 12 }} onClick={() => setScreen('tb')}>Open Trial Balance</button>
      </div>
    );
    const ob = selLedger.openingBalance || 0;
    const totalDr = ledgerStatementRows.reduce((s, r) => s + r.dr, 0);
    const totalCr = ledgerStatementRows.reduce((s, r) => s + r.cr, 0);
    return (
      <div style={{ padding: '8px 14px', flex: 1, overflow: 'auto' }}>
        <div className="tally-section-header">
          LEDGER STATEMENT — <span style={{ color: '#64B5F6' }}>{selLedger.name}</span>
          <span style={{ float: 'right', fontSize: 10, fontWeight: 'normal', color: '#5A8AB0' }}>Group: {groupMap.get(selLedger.groupId)?.name}</span>
        </div>
        <div style={{ display: 'flex', gap: 16, marginBottom: 10, flexWrap: 'wrap' }}>
          {[
            { label: 'Opening Balance', val: fmt(Math.abs(ob)), color: '#42A5F5' },
            { label: 'Total Debit', val: fmt(totalDr), color: '#00C853' },
            { label: 'Total Credit', val: fmt(totalCr), color: '#FF5252' },
            { label: 'Closing Balance', val: fmt(Math.abs(selLedger.currentBalance || 0)), color: '#FF9800' },
          ].map(s => (
            <div key={s.label} style={{ background: '#091D30', border: '1px solid #1A3A5A', padding: '8px 14px', borderRadius: 4 }}>
              <div style={{ color: '#5A8AB0', fontSize: 10 }}>{s.label}</div>
              <div style={{ color: s.color, fontSize: 14, fontWeight: 'bold' }}>₹{s.val}</div>
            </div>
          ))}
        </div>
        <table className="tally-rpt" style={{ width: '100%' }}>
          <thead><tr><th>Date</th><th>Voucher No</th><th>Type</th><th>Particulars</th><th style={{ textAlign: 'right' }}>Debit</th><th style={{ textAlign: 'right' }}>Credit</th><th style={{ textAlign: 'right' }}>Balance</th></tr></thead>
          <tbody>
            <tr style={{ background: '#091D30' }}>
              <td colSpan={6}><span style={{ color: '#5A8AB0', fontSize: 11 }}>Opening Balance</span></td>
              <td className="amt" style={{ color: '#42A5F5' }}>₹{fmt(Math.abs(ob))}</td>
            </tr>
            {ledgerStatementRows.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 20, color: '#3A6A90' }}>No transactions for this ledger yet.</td></tr>
            ) : ledgerStatementRows.map((r, i) => (
              <tr key={i} style={{ cursor: 'pointer' }} onClick={() => setSelVoucher(selVoucher?.id === r.v.id ? null : r.v)}>
                <td style={{ fontSize: 11 }}>{fmtDate(r.v.date)}</td>
                <td style={{ color: '#42A5F5', fontWeight: 'bold' }}>{r.v.voucherNumber}</td>
                <td style={{ fontSize: 10, color: '#90CAF9' }}>{r.v.type}</td>
                <td style={{ fontSize: 11 }}>{r.v.narration || r.v.entries.find(e => e.ledgerId !== selLedger?.id)?.ledgerName || ''}</td>
                <td className="cr">{r.dr > 0 ? `₹${fmt(r.dr)}` : '-'}</td>
                <td className="dr">{r.cr > 0 ? `₹${fmt(r.cr)}` : '-'}</td>
                <td className="amt" style={{ color: r.runBal >= 0 ? '#00C853' : '#FF5252', fontWeight: 'bold' }}>₹{fmt(Math.abs(r.runBal))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="total-row">
              <td colSpan={4}>TOTALS / CLOSING</td>
              <td style={{ textAlign: 'right' }}>₹{fmt(totalDr)}</td>
              <td style={{ textAlign: 'right' }}>₹{fmt(totalCr)}</td>
              <td style={{ textAlign: 'right', color: '#FF9800', fontWeight: 'bold' }}>₹{fmt(Math.abs(selLedger.currentBalance || 0))}</td>
            </tr>
          </tfoot>
        </table>
        <button className="tally-fkey" style={{ marginTop: 10 }} onClick={() => setScreen('tb')}>← Back to Trial Balance</button>
      </div>
    );
  };

  // ── Render: Bank Reconciliation ────────────────────────────────────────
  const renderBankRecon = () => {
    const bankLedgers = ledgers.filter(l => { const g = groupMap.get(l.groupId); return g?.id === 'GRP-BANK' || g?.id === 'GRP-CASH' || g?.name === 'Bank Accounts' || g?.name === 'Cash-in-Hand'; });
    const reconStatements = bankStatements.filter(s => (s as any).ledgerId === reconLedgerId);
    const unmatched = reconStatements.filter(s => !s.isMatched);
    const matched = reconStatements.filter(s => s.isMatched);
    return (
      <div style={{ padding: '8px 14px', flex: 1, overflow: 'auto' }}>
        <div className="tally-section-header" style={{ marginBottom: 10 }}>BANK RECONCILIATION</div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <div style={{ color: '#5A8AB0', fontSize: 10, marginBottom: 3 }}>Select Bank Ledger</div>
            <select value={reconLedgerId} onChange={e => setReconLedgerId(e.target.value)}
              style={{ background: '#091D30', border: '1px solid #1A3A5A', color: '#A8CCE8', padding: '6px 10px', borderRadius: 4, fontSize: 12 }}>
              <option value="">-- Select --</option>
              {bankLedgers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <div style={{ color: '#5A8AB0', fontSize: 10, marginBottom: 3 }}>Upload Bank Statement (CSV)</div>
            <input ref={fileInputRef} type="file" accept=".csv" style={{ display: 'none' }}
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
            <button className="tally-fkey" onClick={() => fileInputRef.current?.click()}>⬆ Upload CSV</button>
          </div>
          {reconLedgerId && (
            <button className="tally-fkey" style={{ background: '#0A3060', borderColor: '#2196F3', color: '#90CAF9' }} disabled={autoMatching}
              onClick={handleAutoMatch}>{autoMatching ? '⏳ Matching...' : '⚡ Auto-Match'}</button>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          {[
            { label: 'Total Entries', val: reconStatements.length, color: '#42A5F5' },
            { label: 'Matched', val: matched.length, color: '#00C853' },
            { label: 'Unmatched', val: unmatched.length, color: '#FF5252' },
            { label: 'Match Rate', val: reconStatements.length > 0 ? `${Math.round(matched.length / reconStatements.length * 100)}%` : '—', color: '#FF9800' },
          ].map(s => (
            <div key={s.label} style={{ background: '#091D30', border: '1px solid #1A3A5A', padding: '8px 14px', borderRadius: 4 }}>
              <div style={{ color: '#5A8AB0', fontSize: 10 }}>{s.label}</div>
              <div style={{ color: s.color, fontSize: 16, fontWeight: 'bold' }}>{s.val}</div>
            </div>
          ))}
        </div>
        <div style={{ color: '#90CAF9', fontSize: 11, fontWeight: 'bold', marginBottom: 6 }}>Unmatched Bank Entries ({unmatched.length})</div>
        <table className="tally-rpt" style={{ width: '100%', marginBottom: 12 }}>
          <thead><tr><th>Date</th><th>Description</th><th>Type</th><th style={{ textAlign: 'right' }}>Amount</th><th>Reference</th><th>Action</th></tr></thead>
          <tbody>
            {unmatched.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 16, color: '#3A6A90' }}>No unmatched entries. Great!</td></tr>
            ) : unmatched.slice(0, 20).map((s, i) => (
              <tr key={i}>
                <td style={{ fontSize: 11 }}>{fmtDate(s.date)}</td>
                <td style={{ fontSize: 11 }}>{s.description}</td>
                <td><span style={{ color: s.type === 'Credit' ? '#00C853' : '#FF5252', fontSize: 10 }}>{s.type}</span></td>
                <td className="amt">₹{fmt(s.amount)}</td>
                <td style={{ fontSize: 10, color: '#5A8AB0' }}>{s.reference || '—'}</td>
                <td>
                  <button className="tally-fkey" style={{ fontSize: 9 }}
                    onClick={() => { resetVf(s.type === 'Credit' ? 'Receipt' : 'Payment'); setVf(p => ({ ...p, narration: s.description, refNo: s.reference || '' })); }}>
                    Create Voucher
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ color: '#90CAF9', fontSize: 11, fontWeight: 'bold', marginBottom: 6 }}>Matched Entries ({matched.length})</div>
        <table className="tally-rpt" style={{ width: '100%' }}>
          <thead><tr><th>Date</th><th>Description</th><th style={{ textAlign: 'right' }}>Amount</th><th>Status</th></tr></thead>
          <tbody>
            {matched.slice(0, 10).map((s, i) => (
              <tr key={i}>
                <td style={{ fontSize: 11 }}>{fmtDate(s.date)}</td>
                <td style={{ fontSize: 11 }}>{s.description}</td>
                <td className="amt">₹{fmt(s.amount)}</td>
                <td><span style={{ color: '#00C853', fontSize: 10 }}>✓ Matched</span></td>
              </tr>
            ))}
            {matched.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', padding: 12, color: '#3A6A90' }}>No matched entries yet. Upload a statement and run Auto-Match.</td></tr>}
          </tbody>
        </table>
        <div style={{ marginTop: 10, fontSize: 10, color: '#3A6A90' }}>CSV format: Date, Description, Debit, Credit, Reference (header row skipped)</div>
      </div>
    );
  };

  // ── Render: TDS Report ─────────────────────────────────────────────────
  const renderTDS = () => {
    const tdsTotal = tdsVouchers.reduce((s, v) => s + (v.totalAmount * ((v.tdsRate || 0) / 100)), 0);
    const tdsLedgerBal = tdsLedger?.currentBalance || 0;
    return (
      <div style={{ padding: '8px 14px', flex: 1, overflow: 'auto' }}>
        <div className="tally-section-header" style={{ marginBottom: 10 }}>TDS / TCS REPORT — FY 2025-26</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
          {[
            { label: 'TDS Deducted Vouchers', val: tdsVouchers.length, color: '#42A5F5' },
            { label: 'Total TDS Amount', val: `₹${fmt(tdsTotal)}`, color: '#FF9800' },
            { label: 'TDS Payable Balance', val: `₹${fmt(Math.abs(tdsLedgerBal))}`, color: '#FF5252' },
          ].map(s => (
            <div key={s.label} style={{ background: '#091D30', border: '1px solid #1A3A5A', padding: '8px 14px', borderRadius: 4 }}>
              <div style={{ color: '#5A8AB0', fontSize: 10 }}>{s.label}</div>
              <div style={{ color: s.color, fontSize: 16, fontWeight: 'bold' }}>{s.val}</div>
            </div>
          ))}
        </div>
        <div style={{ color: '#90CAF9', fontSize: 11, fontWeight: 'bold', marginBottom: 8 }}>TDS Deduction Details</div>
        <table className="tally-rpt" style={{ width: '100%', marginBottom: 12 }}>
          <thead><tr><th>Date</th><th>Voucher No</th><th>Party</th><th>Section</th><th style={{ textAlign: 'right' }}>Base Amount</th><th style={{ textAlign: 'right' }}>Rate</th><th style={{ textAlign: 'right' }}>TDS Amount</th></tr></thead>
          <tbody>
            {tdsVouchers.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 20, color: '#3A6A90' }}>No TDS entries. TDS rate can be set in Payment/Purchase vouchers.</td></tr>
            ) : tdsVouchers.map(v => {
              const tdsAmt = v.totalAmount * ((v.tdsRate || 0) / 100);
              const party = v.entries.find(e => !e.autoGenerated);
              return (
                <tr key={v.id}>
                  <td style={{ fontSize: 11 }}>{fmtDate(v.date)}</td>
                  <td style={{ color: '#42A5F5' }}>{v.voucherNumber}</td>
                  <td style={{ fontSize: 11 }}>{party?.ledgerName || v.narration}</td>
                  <td><span style={{ color: '#FF9800', fontSize: 10 }}>u/s {v.tdsSection}</span></td>
                  <td className="amt">₹{fmt(v.totalAmount)}</td>
                  <td style={{ textAlign: 'right', color: '#FF9800' }}>{v.tdsRate}%</td>
                  <td className="amt" style={{ color: '#FF5252', fontWeight: 'bold' }}>₹{fmt(tdsAmt)}</td>
                </tr>
              );
            })}
          </tbody>
          {tdsVouchers.length > 0 && (
            <tfoot>
              <tr className="total-row">
                <td colSpan={6}>TOTAL TDS DEDUCTED</td>
                <td style={{ textAlign: 'right', color: '#FF5252' }}>₹{fmt(tdsTotal)}</td>
              </tr>
            </tfoot>
          )}
        </table>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="tally-fkey" onClick={() => resetVf('Payment')}>+ TDS Payment (F5)</button>
          <button className="tally-fkey" onClick={() => {
            const csvRows = ['Date,VoucherNo,Party,Section,BaseAmount,Rate,TDSAmount', ...tdsVouchers.map(v => {
              const tdsAmt = v.totalAmount * ((v.tdsRate || 0) / 100);
              return `${v.date},${v.voucherNumber},"${v.narration}",${v.tdsSection},${v.totalAmount},${v.tdsRate}%,${fmt(tdsAmt)}`;
            })];
            const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `TDS_Report_${today()}.csv`; a.click();
          }}>⬇ Export TDS CSV</button>
        </div>
      </div>
    );
  };

  // ── Render: Fixed Assets ───────────────────────────────────────────────
  const renderFixedAssets = () => {
    const grossBlock = fixedAssets.reduce((s, a) => s + (a.purchaseCost || 0), 0);
    const accumDep = fixedAssets.reduce((s, a) => s + (a.accumulatedDepreciation || 0), 0);
    const netBlock = fixedAssets.reduce((s, a) => s + (a.netBookValue || 0), 0);
    return (
      <div style={{ padding: '8px 14px', flex: 1, overflow: 'auto' }}>
        <div className="tally-section-header" style={{ marginBottom: 10 }}>FIXED ASSETS — Register</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
          {[
            { label: 'Total Assets', val: fixedAssets.length, color: '#42A5F5' },
            { label: 'Gross Block', val: `₹${fmt(grossBlock)}`, color: '#90CAF9' },
            { label: 'Accum. Depreciation', val: `₹${fmt(accumDep)}`, color: '#FF5252' },
            { label: 'Net Block', val: `₹${fmt(netBlock)}`, color: '#00C853' },
          ].map(s => (
            <div key={s.label} style={{ background: '#091D30', border: '1px solid #1A3A5A', padding: '8px 12px', borderRadius: 4 }}>
              <div style={{ color: '#5A8AB0', fontSize: 10 }}>{s.label}</div>
              <div style={{ color: s.color, fontSize: 14, fontWeight: 'bold' }}>{s.val}</div>
            </div>
          ))}
        </div>
        <div style={{ marginBottom: 10 }}>
          <button className="tally-fkey" style={{ background: '#0A3060', borderColor: '#2196F3', color: '#90CAF9' }} onClick={() => setShowAssetForm(true)}>+ Add Fixed Asset</button>
        </div>
        <table className="tally-rpt" style={{ width: '100%' }}>
          <thead><tr><th>Asset Name</th><th>Purchase Date</th><th>Method</th><th style={{ textAlign: 'right' }}>Cost</th><th style={{ textAlign: 'right' }}>Accum. Dep.</th><th style={{ textAlign: 'right' }}>Net Book Value</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {fixedAssets.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 24, color: '#3A6A90' }}>No fixed assets recorded. Click "+ Add Fixed Asset" to start.</td></tr>
            ) : fixedAssets.map(a => (
              <tr key={a.id}>
                <td style={{ color: '#A8CCE8' }}>{a.name}</td>
                <td style={{ fontSize: 11 }}>{fmtDate(a.purchaseDate)}</td>
                <td><span style={{ color: '#90CAF9', fontSize: 10 }}>{a.depreciationMethod}</span></td>
                <td className="amt">₹{fmt(a.purchaseCost)}</td>
                <td className="amt" style={{ color: '#FF5252' }}>₹{fmt(a.accumulatedDepreciation || 0)}</td>
                <td className="amt" style={{ color: '#00C853', fontWeight: 'bold' }}>₹{fmt(a.netBookValue || 0)}</td>
                <td><span style={{ color: a.status === 'Active' ? '#00C853' : a.status === 'Fully Depreciated' ? '#FF9800' : '#FF5252', fontSize: 10 }}>{a.status}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {a.status === 'Active' && (
                      <button className="tally-fkey" style={{ fontSize: 9 }} onClick={() => handleRunDepreciation(a.id)}>Run Dep.</button>
                    )}
                    {isAdmin && <button className="tally-fkey" style={{ fontSize: 9, borderColor: '#FF5252', color: '#FF5252' }} onClick={async () => { if (window.confirm(`Delete "${a.name}"?`)) await removeFixedAsset(a.id); }}>Del</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          {fixedAssets.length > 0 && (
            <tfoot>
              <tr className="total-row">
                <td colSpan={3}>TOTALS</td>
                <td style={{ textAlign: 'right' }}>₹{fmt(grossBlock)}</td>
                <td style={{ textAlign: 'right', color: '#FF5252' }}>₹{fmt(accumDep)}</td>
                <td style={{ textAlign: 'right', color: '#00C853' }}>₹{fmt(netBlock)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>

        {/* Depreciation Schedule */}
        {depreciationSchedule.length > 0 && (
          <>
            <div style={{ color: '#90CAF9', fontSize: 11, fontWeight: 'bold', margin: '16px 0 8px' }}>Depreciation Schedule (Last 10 Entries)</div>
            <table className="tally-rpt" style={{ width: '100%' }}>
              <thead><tr><th>Date</th><th>Asset</th><th style={{ textAlign: 'right' }}>Dep. Amount</th><th style={{ textAlign: 'right' }}>Accum. Dep.</th><th style={{ textAlign: 'right' }}>Net Book Value</th></tr></thead>
              <tbody>
                {depreciationSchedule.slice(-10).reverse().map((d, i) => {
                  const asset = fixedAssets.find(a => a.id === d.assetId);
                  return (
                    <tr key={i}>
                      <td style={{ fontSize: 11 }}>{fmtDate(d.date)}</td>
                      <td style={{ color: '#A8CCE8' }}>{asset?.name || d.assetId}</td>
                      <td className="amt" style={{ color: '#FF5252' }}>₹{fmt(d.amount)}</td>
                      <td className="amt">₹{fmt(d.accumulatedDepreciation)}</td>
                      <td className="amt" style={{ color: '#00C853' }}>₹{fmt(d.netBookValue)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}

        {/* Add Asset Form Modal */}
        {showAssetForm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#0A1929', border: '1px solid #1E4976', borderRadius: 8, padding: 24, width: 480 }}>
              <div style={{ color: '#90CAF9', fontSize: 13, fontWeight: 'bold', marginBottom: 16 }}>Add Fixed Asset</div>
              {[
                { label: 'Asset Name *', key: 'name', type: 'text' },
                { label: 'Purchase Date *', key: 'purchaseDate', type: 'date' },
                { label: 'Purchase Cost (₹) *', key: 'purchaseCost', type: 'number' },
                { label: 'Useful Life (Years)', key: 'usefulLifeYears', type: 'number' },
                { label: 'Salvage Value (₹)', key: 'salvageValue', type: 'number' },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: 10 }}>
                  <div style={{ color: '#5A8AB0', fontSize: 10, marginBottom: 3 }}>{f.label}</div>
                  <input type={f.type} value={(assetForm as any)[f.key] || ''}
                    onChange={e => setAssetForm(p => ({ ...p, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value }))}
                    style={{ width: '100%', background: '#091D30', border: '1px solid #1A3A5A', color: '#A8CCE8', padding: '6px 10px', borderRadius: 4, fontSize: 12, boxSizing: 'border-box' }} />
                </div>
              ))}
              <div style={{ marginBottom: 10 }}>
                <div style={{ color: '#5A8AB0', fontSize: 10, marginBottom: 3 }}>Depreciation Method</div>
                <select value={assetForm.depreciationMethod || 'SLM'} onChange={e => setAssetForm(p => ({ ...p, depreciationMethod: e.target.value as 'SLM' | 'WDV' }))}
                  style={{ width: '100%', background: '#091D30', border: '1px solid #1A3A5A', color: '#A8CCE8', padding: '6px 10px', borderRadius: 4, fontSize: 12 }}>
                  <option value="SLM">SLM (Straight Line Method)</option>
                  <option value="WDV">WDV (Written Down Value)</option>
                </select>
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ color: '#5A8AB0', fontSize: 10, marginBottom: 3 }}>Asset Ledger</div>
                <select value={assetForm.ledgerId || ''} onChange={e => setAssetForm(p => ({ ...p, ledgerId: e.target.value }))}
                  style={{ width: '100%', background: '#091D30', border: '1px solid #1A3A5A', color: '#A8CCE8', padding: '6px 10px', borderRadius: 4, fontSize: 12 }}>
                  <option value="">-- Select Asset Ledger --</option>
                  {ledgers.filter(l => groupMap.get(l.groupId)?.type === 'Asset').map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="tally-fkey" onClick={() => setShowAssetForm(false)}>Cancel</button>
                <button className="tally-fkey" style={{ background: '#0A3060', borderColor: '#2196F3', color: '#90CAF9' }} onClick={handleSaveAsset}>Save Asset</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── Render: Opening Balances ───────────────────────────────────────────
  const renderOpeningBal = () => {
    const filtOB = ledgers.filter(l => !searchQ || l.name.toLowerCase().includes(searchQ.toLowerCase()));
    return (
      <div style={{ padding: '8px 14px', flex: 1, overflow: 'auto' }}>
        <div className="tally-section-header" style={{ marginBottom: 10 }}>OPENING BALANCES — Set Ledger Opening Balances</div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'center' }}>
          <input style={{ background: '#091D30', border: '1px solid #1A3A5A', color: '#A8CCE8', padding: '6px 10px', borderRadius: 4, fontSize: 11 }}
            placeholder="Filter ledgers..." value={searchQ} onChange={e => setSearchQ(e.target.value)} />
          <button className="tally-fkey" style={{ background: '#0A3060', borderColor: '#2196F3', color: '#90CAF9' }} onClick={handleSaveOpeningBalances}>
            💾 Save All Changes
          </button>
          <span style={{ color: '#5A8AB0', fontSize: 11 }}>{Object.keys(obEdits).length} edits pending</span>
        </div>
        <table className="tally-rpt" style={{ width: '100%' }}>
          <thead><tr><th>Ledger</th><th>Group</th><th>Type</th><th style={{ textAlign: 'right' }}>Current Opening Bal</th><th style={{ width: 160 }}>New Opening Bal</th></tr></thead>
          <tbody>
            {filtOB.map(l => {
              const g = groupMap.get(l.groupId);
              return (
                <tr key={l.id}>
                  <td style={{ color: '#A8CCE8' }}>{l.name}</td>
                  <td style={{ fontSize: 10, color: '#4A90C4' }}>{g?.name}</td>
                  <td style={{ fontSize: 10 }}>{g?.type}</td>
                  <td className="amt">₹{fmt(l.openingBalance || 0)}</td>
                  <td>
                    <input type="number"
                      value={obEdits[l.id] !== undefined ? obEdits[l.id] : (l.openingBalance || 0)}
                      onChange={e => setObEdits(p => ({ ...p, [l.id]: e.target.value }))}
                      style={{ width: 140, background: obEdits[l.id] !== undefined ? '#091D30' : 'transparent', border: obEdits[l.id] !== undefined ? '1px solid #2196F3' : '1px solid #1A3A5A', color: '#A8CCE8', padding: '4px 8px', borderRadius: 4, fontSize: 12 }} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ marginTop: 12, padding: 10, background: '#091D30', border: '1px solid #1A3A5A', fontSize: 11, color: '#4A90C4', borderRadius: 4 }}>
          ⚠ Editing opening balances will adjust the current balance by the difference. Use carefully at start of financial year.
        </div>
      </div>
    );
  };

  // ── Render: Shortcuts ──────────────────────────────────────────────────
  const renderShortcuts = () => {
    const groups = [
      {
        title: 'VOUCHER ENTRY', items: [
          { key: 'F4', desc: 'Contra Voucher' }, { key: 'F5', desc: 'Payment Voucher' },
          { key: 'F6', desc: 'Receipt Voucher' }, { key: 'F7', desc: 'Journal Voucher' },
          { key: 'F8', desc: 'Sales Invoice' }, { key: 'F9', desc: 'Purchase Invoice' },
          { key: 'Ctrl+F8', desc: 'Credit Note' }, { key: 'Ctrl+F9', desc: 'Debit Note' },
        ]
      },
      {
        title: 'NAVIGATION', items: [
          { key: 'F1', desc: 'Gateway of Accounts' }, { key: 'F2', desc: 'Change Date' },
          { key: 'Alt+G', desc: 'Go To (Global Search)' }, { key: 'Escape', desc: 'Go Back' },
          { key: 'Tab/Enter', desc: 'Next Field' }, { key: 'Ctrl+Home/End', desc: 'Scroll' },
        ]
      },
      {
        title: 'VOUCHER FORM', items: [
          { key: 'Ctrl+A', desc: 'Accept & Post Voucher' }, { key: 'Ctrl+Q', desc: 'Quit without Save' },
          { key: 'Alt+C', desc: 'Create New Ledger inline' }, { key: 'Alt+I', desc: 'Insert Entry Row' },
          { key: 'Alt+D', desc: 'Delete Entry Row' }, { key: 'Alt+B', desc: 'Bill-wise Settlement' },
        ]
      },
    ];
    return (
      <div style={{ padding: '8px 14px', flex: 1, overflow: 'auto' }}>
        <div className="tally-section-header" style={{ marginBottom: 12 }}>ALL SHORTCUT KEYS</div>
        {groups.map((g, i) => (
          <React.Fragment key={i}>
            <div className="tally-menu-section-title">{g.title}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, marginBottom: 8 }}>
              {g.items.map((item, j) => (
                <div key={j} className="tally-gw-item" style={{ padding: '5px 8px', cursor: 'default' }}>
                  <span className="tally-fkey" style={{ minWidth: 90, textAlign: 'center', fontSize: 10 }}>{item.key}</span>
                  <span style={{ color: '#A8CCE8', fontSize: 11, marginLeft: 8 }}>{item.desc}</span>
                </div>
              ))}
            </div>
          </React.Fragment>
        ))}
      </div>
    );
  };

  // ── Main Render ────────────────────────────────────────────────────────
  return (
    <div className="tally-shell" style={{ minHeight: '100%' }}>
      {renderTopBar()}
      {renderFKeyBar()}
      {renderGoTo()}
      {renderCreateLedgerModal()}
      <div className="tally-main-layout">
        {renderLeftMenu()}
        <div className="tally-content-area">
          <div className="tally-screen-panel">
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
          </div>
        </div>
      </div>
      {renderStatusBar()}
    </div>
  );
};
