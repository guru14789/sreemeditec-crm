import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  FileSpreadsheet, 
  Download, 
  Search, 
  Calendar, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  IndianRupee,
  PieChart,
  ArrowRight
} from 'lucide-react';
import { useData } from './DataContext';

export const ComplianceModule: React.FC = () => {
  const { invoices, ledgers, vouchers } = useData();
  const [activeTab, setActiveTab] = useState<'gstr1' | 'gstr3b' | 'tds'>('gstr1');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  // --- GST REPORTING LOGIC ---
  
  const gstr1Data = useMemo(() => {
    // Filter finalized invoices for the selected month
    return invoices.filter(i => 
      i.date.startsWith(selectedMonth) && 
      i.status === 'Finalized' && 
      i.documentType !== 'Quotation' &&
      i.documentType !== 'SupplierPO'
    );
  }, [invoices, selectedMonth]);

  const gstr3bSummary = useMemo(() => {
    const sales = gstr1Data.reduce((acc, i) => {
      acc.taxable += i.subtotal || 0;
      acc.tax += i.taxTotal || 0;
      return acc;
    }, { taxable: 0, tax: 0 });

    // Assuming purchase invoices are recorded in purchaseRecords or similar
    // For now, using SupplierPO or Expenses as a proxy for ITC
    const itc = invoices.filter(i => 
      i.date.startsWith(selectedMonth) && 
      i.status === 'Finalized' && 
      i.documentType === 'SupplierPO'
    ).reduce((acc, i) => {
      acc.taxable += i.subtotal || 0;
      acc.tax += i.taxTotal || 0;
      return acc;
    }, { taxable: 0, tax: 0 });

    return { sales, itc };
  }, [gstr1Data, invoices, selectedMonth]);

  const handleExportGSTR1 = () => {
    const headers = ["GSTIN", "Receiver Name", "Invoice No", "Date", "Value", "Taxable Value", "GST Rate", "Tax Amount"];
    const rows = gstr1Data.map(i => [
      i.customerGstin || "Unregistered",
      `"${i.customerName.replace(/"/g, '""')}"`,
      i.invoiceNumber,
      i.date,
      i.grandTotal,
      i.subtotal,
      "Multiple",
      i.taxTotal
    ]);

    const csvContent = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `GSTR1_${selectedMonth}.csv`;
    link.click();
  };

  const handleExportGSTR1JSON = () => {
    const b2bInvoices = gstr1Data.filter(i => i.customerGstin);
    const b2csInvoices = gstr1Data.filter(i => !i.customerGstin);

    const json = {
      gstin: "32XXXXX1234X1Z1", // This should be from system settings
      fp: selectedMonth.replace('-', ''),
      version: "V1.0",
      b2b: b2bInvoices.map(i => ({
        ctin: i.customerGstin,
        inv: [{
          inum: i.invoiceNumber,
          idt: i.date,
          val: i.grandTotal,
          pos: "32", // Default to Kerala for now
          rchrg: "N",
          inv_typ: "R",
          itms: [{
            num: 1,
            itm_det: {
              ty: "G",
              hsn_sc: i.items[0]?.hsn || "0000",
              txval: i.subtotal,
              irt: i.items[0]?.taxRate || 18,
              iamt: i.taxTotal
            }
          }]
        }]
      })),
      b2cs: b2csInvoices.map(i => ({
        sply_ty: "INTER",
        pos: "32",
        typ: "OE",
        txval: i.subtotal,
        irt: i.items[0]?.taxRate || 18,
        iamt: i.taxTotal
      }))
    };

    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `GSTR1_${selectedMonth}.json`;
    link.click();
  };

  return (
    <div className="h-full flex flex-col gap-6 overflow-hidden p-2">
      {/* Header & Month Picker */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-medical-600 text-white rounded-2xl shadow-lg">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Compliance Terminal</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Statutory Tax & Regulatory Reporting</p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800 p-2 rounded-2xl">
          <Calendar size={16} className="text-slate-400 ml-2" />
          <input 
            type="month" 
            className="bg-transparent border-none text-xs font-black uppercase outline-none text-slate-700 dark:text-slate-200"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden">
        {/* Navigation Sidebar */}
        <div className="w-full md:w-64 space-y-2">
          {[
            { id: 'gstr1', label: 'GSTR-1 (Outward)', icon: FileSpreadsheet, desc: 'Sales & Supplies' },
            { id: 'gstr3b', label: 'GSTR-3B (Monthly)', icon: PieChart, desc: 'Summary Return' },
            { id: 'tds', label: 'TDS / TCS Log', icon: IndianRupee, desc: 'Withholding Tax' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full p-6 rounded-[2rem] text-left transition-all border flex items-center gap-4 group ${
                activeTab === tab.id 
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-500/20' 
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 hover:border-indigo-500'
              }`}
            >
              <div className={`p-2 rounded-xl transition-colors ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-indigo-600'}`}>
                <tab.icon size={18} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">{tab.label}</p>
                <p className={`text-[8px] font-bold uppercase opacity-60 ${activeTab === tab.id ? 'text-white' : 'text-slate-400'}`}>{tab.desc}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Main Report Area */}
        <div className="flex-1 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden">
          {activeTab === 'gstr1' && (
            <>
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">Outward Supplies (GSTR-1)</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Total {gstr1Data.length} records found for {selectedMonth}</p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={handleExportGSTR1}
                    className="bg-white border border-slate-200 text-slate-600 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-50 transition-all"
                  >
                    <Download size={14} /> CSV
                  </button>
                  <button 
                    onClick={handleExportGSTR1JSON}
                    className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                  >
                    <Download size={14} /> Portal JSON
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-[9px] uppercase font-black tracking-widest text-slate-400 sticky top-0 border-b border-slate-100 dark:border-slate-700">
                    <tr>
                      <th className="px-6 py-4">GSTIN / Recipient</th>
                      <th className="px-6 py-4">Invoice Details</th>
                      <th className="px-6 py-4 text-right">Taxable (₹)</th>
                      <th className="px-6 py-4 text-right">Tax (₹)</th>
                      <th className="px-6 py-4 text-right">Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {gstr1Data.map(i => (
                      <tr key={i.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-black text-slate-800 dark:text-white uppercase truncate max-w-[200px]">{i.customerName}</p>
                          <p className="text-[9px] font-bold text-indigo-500 uppercase">{i.customerGstin || 'Unregistered'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-black text-slate-400">{i.invoiceNumber}</p>
                          <p className="text-[9px] font-bold">{i.date}</p>
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-slate-600 dark:text-slate-300">₹{i.subtotal.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right font-bold text-indigo-500">₹{i.taxTotal.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right font-black text-slate-900 dark:text-white">₹{i.grandTotal.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {activeTab === 'gstr3b' && (
            <div className="p-10 space-y-10">
              <div className="max-w-2xl mx-auto space-y-8">
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">GSTR-3B Self-Assessment</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Consolidated Tax Summary for {selectedMonth}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Outward Liabilities */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl"><ArrowRight size={18} /></div>
                      <h4 className="font-black text-xs uppercase tracking-widest">Outward Supplies</h4>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Taxable Value</span>
                        <span className="text-sm font-black">₹{gstr3bSummary.sales.taxable.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Liability (Output GST)</span>
                        <span className="text-lg font-black text-rose-600">₹{gstr3bSummary.sales.tax.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* ITC Availability */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl"><IndianRupee size={18} /></div>
                      <h4 className="font-black text-xs uppercase tracking-widest">Input Tax Credit</h4>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Eligible ITC Value</span>
                        <span className="text-sm font-black">₹{gstr3bSummary.itc.taxable.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">ITC Claimable</span>
                        <span className="text-lg font-black text-emerald-600">₹{gstr3bSummary.itc.tax.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Net Liability */}
                <div className="bg-indigo-600 p-10 rounded-[3rem] text-white shadow-2xl shadow-indigo-500/40 relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-8 opacity-10"><CheckCircle2 size={120} /></div>
                   <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                     <div className="space-y-2">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-200">Net Tax Payable (Self-Assessment)</h4>
                        <p className="text-4xl font-black tracking-tighter">₹{(gstr3bSummary.sales.tax - gstr3bSummary.itc.tax).toLocaleString()}</p>
                     </div>
                     <button className="bg-white text-indigo-600 px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:scale-105 transition-all">
                       Submit Data to Portal
                     </button>
                   </div>
                </div>

                <div className="flex items-center gap-2 text-amber-500 bg-amber-50 dark:bg-amber-900/10 p-4 rounded-2xl border border-amber-100 dark:border-amber-800/50">
                   <AlertCircle size={14} className="shrink-0" />
                   <p className="text-[9px] font-bold uppercase leading-tight">Note: This is a generated summary for review. Please cross-verify with actual invoices before filing.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tds' && (
             <div className="flex-1 overflow-auto p-8 space-y-6">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Withholding Tax (TDS/TCS) Log</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Summary of tax deducted at source for {selectedMonth}</p>
                  </div>
                  <div className="bg-amber-100 dark:bg-amber-900/30 p-4 rounded-2xl flex items-center gap-4">
                     <div className="text-right">
                        <p className="text-[8px] font-black text-amber-600 uppercase">Total TDS Liability</p>
                        <p className="text-xl font-black text-amber-600">₹{vouchers.filter(v => v.date.startsWith(selectedMonth) && v.narration.toLowerCase().includes('tds')).reduce((sum, v) => sum + v.totalAmount, 0).toLocaleString()}</p>
                     </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-[9px] uppercase font-black tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-700">
                      <tr>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Particulars</th>
                        <th className="px-6 py-4">Section</th>
                        <th className="px-6 py-4 text-right">Taxable Amount (₹)</th>
                        <th className="px-6 py-4 text-right">Tax Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                      {vouchers
                        .filter(v => v.date.startsWith(selectedMonth) && v.narration.toLowerCase().includes('tds'))
                        .map(v => (
                        <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-400">{v.date}</td>
                          <td className="px-6 py-4">
                            <p className="font-black text-slate-800 dark:text-white uppercase">{v.entries[0]?.ledgerName}</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 italic">{v.narration}</p>
                          </td>
                          <td className="px-6 py-4 uppercase font-black text-amber-600">
                             {v.narration.match(/194[CIJ]/)?.[0] || '194C'}
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-slate-600">₹{((v.totalAmount * 100) / (v.narration.includes('10%') ? 10 : 1)).toLocaleString()}</td>
                          <td className="px-6 py-4 text-right font-black text-rose-600">₹{v.totalAmount.toLocaleString()}</td>
                        </tr>
                      ))}
                      {vouchers.filter(v => v.date.startsWith(selectedMonth) && v.narration.toLowerCase().includes('tds')).length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-20 text-center text-slate-300 font-bold uppercase tracking-widest text-[10px] opacity-30">
                             No TDS records found for this period.
                          </td>
                        </tr>
                      )}
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
