import React, { useState } from 'react';
import { useData } from './DataContext';
import { FileText, User, Building2, Calendar, FileCheck, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

export const PartyStatement: React.FC = () => {
  const { clients, vendors, invoices, purchaseRecords, bankTransactions, bankDetailsList } = useData();
  const [partyType, setPartyType] = useState<'Client' | 'Vendor'>('Client');
  const [selectedPartyId, setSelectedPartyId] = useState<string>('');

  const selectedParty = partyType === 'Client' 
    ? clients.find(c => c.id === selectedPartyId) 
    : vendors.find(v => v.id === selectedPartyId);

  let pendingBalance = 0;
  let totalTransactions = 0;
  let totalAmount = 0;

  if (selectedParty) {
    if (partyType === 'Client') {
      const pendingInvoices = invoices.filter(i => (i.customerName === selectedParty.name || i.customerId === selectedPartyId) && i.invoiceNumber && i.invoiceNumber.startsWith('SM/') && (i.status === 'Pending' || i.status === 'Partially Paid' || !i.status));
      pendingBalance = pendingInvoices.reduce((acc, i) => acc + (i.grandTotal - (i.amountPaid || 0)), 0);
    } else {
      const pendingBills = purchaseRecords.filter(p => p.supplier === selectedParty.name && (p.status === 'Pending' || p.status === 'Partially Paid' || !p.status));
      pendingBalance = pendingBills.reduce((acc, p) => acc + (p.total - (p.paidAmount || 0)), 0);
    }
  }

  const partyTransactions = bankTransactions
    .filter(t => t.partyType === partyType && t.partyId === selectedPartyId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  totalTransactions = partyTransactions.length;
  totalAmount = partyTransactions.reduce((acc, t) => acc + t.amount, 0);

  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-950 p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-500/30">
              <FileText size={24} />
            </div>
            <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Statements</h1>
          </div>
          <p className="text-sm font-bold text-slate-500 ml-1">Consolidated view of transactions across all bank accounts.</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Party Type</label>
              <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button
                  onClick={() => { setPartyType('Client'); setSelectedPartyId(''); }}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${partyType === 'Client' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  <User size={16} /> Client
                </button>
                <button
                  onClick={() => { setPartyType('Vendor'); setSelectedPartyId(''); }}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${partyType === 'Vendor' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  <Building2 size={16} /> Vendor
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Select {partyType}</label>
              <select
                value={selectedPartyId}
                onChange={(e) => setSelectedPartyId(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- Choose {partyType} --</option>
                {partyType === 'Client' 
                  ? clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                  : vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)
                }
              </select>
            </div>
          </div>
        </div>

        {selectedParty && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Total {partyType === 'Client' ? 'Received' : 'Paid'}</p>
                <p className="text-3xl font-black text-slate-800 dark:text-white font-mono">₹{totalAmount.toLocaleString('en-IN')}</p>
              </div>
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Transactions</p>
                <p className="text-3xl font-black text-slate-800 dark:text-white font-mono">{totalTransactions}</p>
              </div>
              <div className="bg-rose-50 dark:bg-rose-900/20 p-6 rounded-3xl border border-rose-200 dark:border-rose-800/50">
                <p className="text-xs font-bold text-rose-500 uppercase tracking-widest mb-1">Pending Balance</p>
                <p className="text-3xl font-black text-rose-600 dark:text-rose-400 font-mono">₹{pendingBalance.toLocaleString('en-IN')}</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <FileCheck className="text-slate-400" size={20} />
                <h3 className="font-bold text-slate-800 dark:text-white">Transaction Ledger</h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-100 dark:border-slate-800">
                      <th className="p-4 pl-6">Date</th>
                      <th className="p-4">Bank Account</th>
                      <th className="p-4">Type</th>
                      <th className="p-4">Mode / Ref</th>
                      <th className="p-4 text-right pr-6">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partyTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">
                          No transactions found for this {partyType.toLowerCase()}.
                        </td>
                      </tr>
                    ) : (
                      partyTransactions.map((tx) => {
                        const bank = bankDetailsList.find(b => b.id === tx.bankId);
                        return (
                          <tr key={tx.id} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="p-4 pl-6 font-medium text-slate-600 dark:text-slate-300">
                              {new Date(tx.date).toLocaleDateString('en-GB')}
                            </td>
                            <td className="p-4 font-bold text-slate-700 dark:text-slate-200">
                              {bank?.bankName || 'Unknown Bank'}
                            </td>
                            <td className="p-4">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                                tx.type === 'Credit' 
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                                  : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                              }`}>
                                {tx.type === 'Credit' ? <ArrowDownLeft size={12}/> : <ArrowUpRight size={12}/>} {tx.type}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="font-bold text-slate-700 dark:text-slate-300">{tx.paymentMode}</div>
                              {tx.referenceNumber && <div className="text-xs text-slate-500 font-mono">{tx.referenceNumber}</div>}
                            </td>
                            <td className="p-4 pr-6 text-right font-black font-mono text-slate-800 dark:text-white">
                              ₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
