import React, { useState } from 'react';
import { useData } from './DataContext';
import { ArrowLeft, UserPlus, Building, DollarSign, Send, ArrowDownLeft, ArrowUpRight, CheckCircle2, Copy, ArrowRightLeft } from 'lucide-react';

interface Props {
  bankId: string;
  onBack: () => void;
}

export const BankLedger: React.FC<Props> = ({ bankId, onBack }) => {
  const { 
    bankDetailsList, 
    bankTransactions, 
    clients, 
    vendors, 
    invoices, 
    purchaseRecords,
    processClientPayment,
    processVendorPayment,
    processContraTransfer,
    addNotification,
    updateBankDetails
  } = useData();

  const [activeTab, setActiveTab] = useState<'transactions' | 'clientPayment' | 'vendorPayment' | 'contraTransfer'>('transactions');
  
  // Client Payment State
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [clientAmount, setClientAmount] = useState<string>('');
  const [clientMode, setClientMode] = useState<string>('Bank Transfer');
  const [clientRef, setClientRef] = useState<string>('');
  const [clientNotes, setClientNotes] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Vendor Payment State
  const [selectedVendorId, setSelectedVendorId] = useState<string>('');
  const [vendorAmount, setVendorAmount] = useState<string>('');
  const [vendorMode, setVendorMode] = useState<string>('Bank Transfer');
  const [vendorRef, setVendorRef] = useState<string>('');
  const [vendorNotes, setVendorNotes] = useState<string>('');

  // Contra Transfer State
  const [contraTargetBankId, setContraTargetBankId] = useState<string>('');
  const [contraAmount, setContraAmount] = useState<string>('');
  const [contraMode, setContraMode] = useState<string>('Bank Transfer');
  const [contraRef, setContraRef] = useState<string>('');
  const [contraNotes, setContraNotes] = useState<string>('');

  const bank = bankDetailsList.find(b => b.id === bankId);
  if (!bank) return null;

  const bankTxs = bankTransactions.filter(t => t.bankId === bankId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Calculate Bank Balance
  const initialBalance = bank.initialBalance || 0;
  const totalCredits = bankTxs.filter(t => t.type === 'Credit').reduce((acc, t) => acc + t.amount, 0);
  const totalDebits = bankTxs.filter(t => t.type === 'Debit').reduce((acc, t) => acc + t.amount, 0);
  const currentBalance = initialBalance + totalCredits - totalDebits;

  // Client Details Calc
  const selectedClient = clients.find(c => c.id === selectedClientId);
  const selectedClientPendingInvoices = selectedClient ? invoices.filter(i => (i.customerName === selectedClient.name || i.customerId === selectedClientId) && i.invoiceNumber && i.invoiceNumber.startsWith('SM/') && (i.status === 'Pending' || i.status === 'Partially Paid' || !i.status)).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()) : [];
  const selectedClientPending = selectedClientPendingInvoices.reduce((acc, i) => acc + (i.grandTotal - (i.amountPaid || 0)), 0);
  const selectedClientAdvance = selectedClient?.advanceBalance || 0;

  // Vendor Details Calc
  const selectedVendor = vendors.find(v => v.id === selectedVendorId);
  const selectedVendorPendingBills = selectedVendor ? purchaseRecords.filter(p => p.supplier === selectedVendor.name && (p.status === 'Pending' || p.status === 'Partially Paid' || !p.status)).sort((a,b) => new Date(a.dateSupply || '').getTime() - new Date(b.dateSupply || '').getTime()) : [];
  const selectedVendorPending = selectedVendorPendingBills.reduce((acc, p) => acc + (p.total - (p.paidAmount || 0)), 0);
  const selectedVendorAdvance = selectedVendor?.advanceBalance || 0;

  const handleSetInitialBalance = async () => {
    const pwd = window.prompt("Enter admin password to set initial balance:");
    if (pwd !== 'admin') {
      if (pwd !== null) addNotification('Invalid password', 'error');
      return;
    }
    const val = window.prompt("Enter initial/carry forward balance:");
    if (val === null) return;
    const num = parseFloat(val);
    if (isNaN(num)) {
      addNotification('Invalid amount', 'error');
      return;
    }
    
    try {
      await updateBankDetails(bankId, { initialBalance: num });
      addNotification('Initial balance set successfully', 'success');
    } catch (err: any) {
      addNotification('Failed to set balance', 'error');
    }
  };

  const handleClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId || !clientAmount) return;
    try {
      setIsProcessing(true);
      await processClientPayment(bankId, selectedClientId, parseFloat(clientAmount), clientMode, clientNotes, clientRef);
      addNotification('Success', 'Client payment processed successfully', 'success');
      setActiveTab('transactions');
      setClientAmount('');
      setClientNotes('');
      setClientRef('');
      setSelectedClientId('');
    } catch (error: any) {
      addNotification('Error', error.message || 'Failed to process payment', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVendorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendorId || !vendorAmount) return;
    try {
      setIsProcessing(true);
      await processVendorPayment(bankId, selectedVendorId, parseFloat(vendorAmount), vendorMode, vendorNotes, vendorRef);
      addNotification('Success', 'Vendor payment processed successfully', 'success');
      setActiveTab('transactions');
      setVendorAmount('');
      setVendorNotes('');
      setVendorRef('');
      setSelectedVendorId('');
    } catch (error: any) {
      addNotification('Error', error.message || 'Failed to process payment', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleContraSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contraTargetBankId || !contraAmount) return;
    try {
      setIsProcessing(true);
      await processContraTransfer(bankId, contraTargetBankId, parseFloat(contraAmount), contraMode, contraNotes, contraRef);
      addNotification('Success', 'Contra transfer processed successfully', 'success');
      setActiveTab('transactions');
      setContraAmount('');
      setContraNotes('');
      setContraRef('');
      setContraTargetBankId('');
    } catch (error: any) {
      addNotification('Error', error.message || 'Failed to process transfer', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 p-8 w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">{bank.bankName} Ledger</h1>
            <p className="text-slate-500 font-mono mt-1">A/C: {bank.accountNo}</p>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-900 px-6 py-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 text-right">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Available Balance</p>
          <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">₹{currentBalance.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 items-center justify-between">
        <div className="flex gap-2">
          <button onClick={() => setActiveTab('transactions')} className={`px-6 py-3 rounded-xl font-bold transition-colors ${activeTab === 'transactions' ? 'bg-slate-800 text-white shadow-md' : 'bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
            Transaction History
          </button>
          <button onClick={() => setActiveTab('clientPayment')} className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors ${activeTab === 'clientPayment' ? 'bg-emerald-600 text-white shadow-md' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'}`}>
            <ArrowDownLeft size={18} /> Receive from Client
          </button>
          <button onClick={() => setActiveTab('vendorPayment')} className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors ${activeTab === 'vendorPayment' ? 'bg-rose-600 text-white shadow-md' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40'}`}>
            <ArrowUpRight size={18} /> Pay to Vendor
          </button>
          <button onClick={() => setActiveTab('contraTransfer')} className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors ${activeTab === 'contraTransfer' ? 'bg-indigo-600 text-white shadow-md' : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40'}`}>
            <ArrowRightLeft size={18} /> Contra Transfer
          </button>
        </div>
        <button 
          onClick={handleSetInitialBalance}
          className="px-4 py-2 text-sm font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
        >
          Set Initial Balance
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
        
        {activeTab === 'transactions' && (
          <div className="flex-1 overflow-auto p-6">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <th className="py-4 px-4 text-xs font-black uppercase tracking-widest text-slate-400">Date</th>
                  <th className="py-4 px-4 text-xs font-black uppercase tracking-widest text-slate-400">Party</th>
                  <th className="py-4 px-4 text-xs font-black uppercase tracking-widest text-slate-400">Mode / Ref</th>
                  <th className="py-4 px-4 text-xs font-black uppercase tracking-widest text-slate-400 text-right">Debit</th>
                  <th className="py-4 px-4 text-xs font-black uppercase tracking-widest text-slate-400 text-right">Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {bankTxs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">No transactions recorded yet.</td>
                  </tr>
                )}
                {bankTxs.map(tx => (
                  <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                    <td className="py-4 px-4 whitespace-nowrap">
                      <p className="font-bold text-slate-700 dark:text-slate-300">{new Date(tx.date).toLocaleDateString('en-GB')}</p>
                      <p className="text-xs text-slate-400 font-mono mt-1 opacity-0 group-hover:opacity-100 transition-opacity">{tx.id.substring(0,8)}</p>
                    </td>
                    <td className="py-4 px-4">
                      <p className="font-bold text-slate-900 dark:text-white">{tx.partyName}</p>
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mt-1 ${tx.partyType === 'Client' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {tx.partyType}
                      </span>
                      {tx.allocations && tx.allocations.length > 0 && (
                        <div className="mt-2 pl-3 border-l-2 border-slate-200 dark:border-slate-700">
                           {tx.allocations.map((a, i) => (
                             <p key={i} className="text-[11px] text-slate-500">Allocated ₹{a.amountAllocated.toLocaleString()} to {a.documentNo}</p>
                           ))}
                           {tx.unallocatedAmount > 0 && (
                             <p className="text-[11px] text-blue-500 font-medium">Excess ₹{tx.unallocatedAmount.toLocaleString()} saved as Advance</p>
                           )}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <p className="font-medium text-slate-600 dark:text-slate-400">{tx.paymentMode}</p>
                      {tx.referenceNumber && <p className="text-xs text-slate-400 mt-1 font-mono">{tx.referenceNumber}</p>}
                    </td>
                    <td className="py-4 px-4 text-right font-mono font-bold text-rose-600">
                      {tx.type === 'Debit' ? `₹${tx.amount.toLocaleString('en-IN')}` : '-'}
                    </td>
                    <td className="py-4 px-4 text-right font-mono font-bold text-emerald-600">
                      {tx.type === 'Credit' ? `₹${tx.amount.toLocaleString('en-IN')}` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'clientPayment' && (
          <form onSubmit={handleClientSubmit} className="flex-1 overflow-y-auto p-4 md:p-8 w-full">
            <div className="max-w-3xl mx-auto w-full flex flex-col gap-6">
              <div className="mb-4">
                <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2"><ArrowDownLeft className="text-emerald-500"/> Receive Payment from Client</h2>
                <p className="text-slate-500 mt-2">Record money received. It will automatically settle oldest pending invoices first.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-full">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Select Client</label>
                <select 
                  value={selectedClientId} 
                  onChange={e => setSelectedClientId(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  <option value="">-- Choose Client --</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {selectedClientId && (
                <div className="col-span-full flex flex-col gap-4">
                  <div className="flex gap-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl">
                     <div className="flex-1">
                       <p className="text-xs font-bold text-emerald-600/70 uppercase tracking-wider mb-1">Pending Invoice Balance</p>
                       <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400 font-mono">₹{selectedClientPending.toLocaleString('en-IN')}</p>
                     </div>
                     <div className="w-[1px] bg-emerald-200/50 dark:bg-emerald-800/50 my-2"></div>
                     <div className="flex-1">
                       <p className="text-xs font-bold text-emerald-600/70 uppercase tracking-wider mb-1">Existing Advance</p>
                       <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400 font-mono">₹{selectedClientAdvance.toLocaleString('en-IN')}</p>
                     </div>
                  </div>

                  {selectedClientPendingInvoices.length > 0 && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                      <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pending Invoices ({selectedClientPendingInvoices.length})</p>
                        <p className="text-[10px] font-bold text-slate-400">Oldest First</p>
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        <table className="w-full text-left text-sm">
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                            {selectedClientPendingInvoices.map(inv => {
                              const pendingAmt = inv.grandTotal - (inv.amountPaid || 0);
                              return (
                                <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                  <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">{inv.invoiceNumber}</td>
                                  <td className="px-4 py-3 text-slate-500">{new Date(inv.date).toLocaleDateString('en-GB')}</td>
                                  <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">₹{pendingAmt.toLocaleString('en-IN')}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Amount Received (₹)</label>
                <input 
                  type="number" 
                  min="1"
                  step="0.01"
                  value={clientAmount}
                  onChange={e => setClientAmount(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-3 font-black text-xl font-mono text-emerald-600 focus:ring-2 focus:ring-emerald-500"
                  required
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Payment Mode</label>
                <select 
                  value={clientMode} 
                  onChange={e => setClientMode(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-emerald-500"
                >
                  <option>Bank Transfer</option>
                  <option>NEFT</option>
                  <option>RTGS</option>
                  <option>IMPS</option>
                  <option>UPI</option>
                  <option>Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Reference Number (Optional)</label>
                <input 
                  type="text" 
                  value={clientRef}
                  onChange={e => setClientRef(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-emerald-500"
                  placeholder="UTR / Cheque No"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Notes (Optional)</label>
                <input 
                  type="text" 
                  value={clientNotes}
                  onChange={e => setClientNotes(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-emerald-500"
                  placeholder="Additional details..."
                />
              </div>
            </div>

              <button disabled={isProcessing} className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex justify-center items-center gap-2">
                {isProcessing ? 'Processing...' : <><CheckCircle2 size={20}/> Save Payment</>}
              </button>
            </div>
          </form>
        )}

        {activeTab === 'vendorPayment' && (
          <form onSubmit={handleVendorSubmit} className="flex-1 overflow-y-auto p-4 md:p-8 w-full">
            <div className="max-w-3xl mx-auto w-full flex flex-col gap-6">
              <div className="mb-4">
                <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2"><ArrowUpRight className="text-rose-500"/> Make Payment to Vendor</h2>
                <p className="text-slate-500 mt-2">Record money paid out. It will automatically settle oldest pending purchase bills first.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-full">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Select Vendor</label>
                <select 
                  value={selectedVendorId} 
                  onChange={e => setSelectedVendorId(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-rose-500"
                  required
                >
                  <option value="">-- Choose Vendor --</option>
                  {vendors.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>

              {selectedVendorId && (
                <div className="col-span-full flex flex-col gap-4">
                  <div className="flex gap-4 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 rounded-xl">
                     <div className="flex-1">
                       <p className="text-xs font-bold text-rose-600/70 uppercase tracking-wider mb-1">Pending Bill Balance</p>
                       <p className="text-2xl font-black text-rose-700 dark:text-rose-400 font-mono">₹{selectedVendorPending.toLocaleString('en-IN')}</p>
                     </div>
                     <div className="w-[1px] bg-rose-200/50 dark:bg-rose-800/50 my-2"></div>
                     <div className="flex-1">
                       <p className="text-xs font-bold text-rose-600/70 uppercase tracking-wider mb-1">Existing Advance</p>
                       <p className="text-2xl font-black text-rose-700 dark:text-rose-400 font-mono">₹{selectedVendorAdvance.toLocaleString('en-IN')}</p>
                     </div>
                  </div>

                  {selectedVendorPendingBills.length > 0 && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                      <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pending Bills ({selectedVendorPendingBills.length})</p>
                        <p className="text-[10px] font-bold text-slate-400">Oldest First</p>
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        <table className="w-full text-left text-sm">
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                            {selectedVendorPendingBills.map(bill => {
                              const pendingAmt = bill.total - (bill.paidAmount || 0);
                              return (
                                <tr key={bill.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                  <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">{bill.invoiceNo || bill.poNumber || bill.id.substring(0,8)}</td>
                                  <td className="px-4 py-3 text-slate-500">{new Date(bill.dateSupply).toLocaleDateString('en-GB')}</td>
                                  <td className="px-4 py-3 text-right font-mono font-bold text-rose-600">₹{pendingAmt.toLocaleString('en-IN')}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Amount Paid (₹)</label>
                <input 
                  type="number" 
                  min="1"
                  step="0.01"
                  value={vendorAmount}
                  onChange={e => setVendorAmount(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-3 font-black text-xl font-mono text-rose-600 focus:ring-2 focus:ring-rose-500"
                  required
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Payment Mode</label>
                <select 
                  value={vendorMode} 
                  onChange={e => setVendorMode(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-rose-500"
                >
                  <option>Bank Transfer</option>
                  <option>NEFT</option>
                  <option>RTGS</option>
                  <option>IMPS</option>
                  <option>UPI</option>
                  <option>Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Reference Number (Optional)</label>
                <input 
                  type="text" 
                  value={vendorRef}
                  onChange={e => setVendorRef(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-rose-500"
                  placeholder="UTR / Cheque No"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Notes (Optional)</label>
                <input 
                  type="text" 
                  value={vendorNotes}
                  onChange={e => setVendorNotes(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-rose-500"
                  placeholder="Additional details..."
                />
              </div>
            </div>

              <button disabled={isProcessing} className="mt-4 w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-rose-600/30 transition-all flex justify-center items-center gap-2">
                {isProcessing ? 'Processing...' : <><CheckCircle2 size={20}/> Save Payment</>}
              </button>
            </div>
          </form>
        )}

        {activeTab === 'contraTransfer' && (
          <form onSubmit={handleContraSubmit} className="flex-1 overflow-y-auto p-4 md:p-8 w-full">
            <div className="max-w-3xl mx-auto w-full flex flex-col gap-6">
              <div className="mb-4">
                <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2"><ArrowRightLeft className="text-indigo-500"/> Contra Transfer</h2>
                <p className="text-slate-500 mt-2">Transfer funds to another internal bank account. This creates a debit here and a credit there.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-full">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Select Target Bank Account</label>
                  <select 
                    value={contraTargetBankId} 
                    onChange={e => setContraTargetBankId(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    <option value="">-- Choose Target Bank --</option>
                    {bankDetailsList.filter(b => b.id !== bankId).map(b => (
                      <option key={b.id} value={b.id}>{b.bankName} - {b.accountNo}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Transfer Amount (₹)</label>
                  <input 
                    type="number" 
                    min="1"
                    step="0.01"
                    value={contraAmount}
                    onChange={e => setContraAmount(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-indigo-500 font-mono text-lg"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Payment Mode</label>
                  <select 
                    value={contraMode} 
                    onChange={e => setContraMode(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-indigo-500"
                  >
                    <option>Bank Transfer</option>
                    <option>NEFT</option>
                    <option>RTGS</option>
                    <option>IMPS</option>
                    <option>UPI</option>
                    <option>Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Reference / UTR Number</label>
                  <input 
                    type="text" 
                    value={contraRef}
                    onChange={e => setContraRef(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-indigo-500 uppercase font-mono"
                    placeholder="e.g. UTR123456"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Internal Notes</label>
                  <input 
                    type="text" 
                    value={contraNotes}
                    onChange={e => setContraNotes(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-indigo-500"
                    placeholder="Transfer details..."
                  />
                </div>
              </div>

              <button disabled={isProcessing} className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex justify-center items-center gap-2">
                {isProcessing ? 'Processing...' : <><ArrowRightLeft size={20}/> Execute Transfer</>}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
