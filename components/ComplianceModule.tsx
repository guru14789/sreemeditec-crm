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
  ArrowRight,
  Grid
} from 'lucide-react';
import { useData } from './DataContext';

interface ComplianceModuleProps {
  userRole?: 'Admin' | 'Employee';
}

const getTaxRates = (taxRate: number, customerGstin: string, sellerGstin: string) => {
  const custState = (customerGstin || '').trim().slice(0, 2);
  const sellState = (sellerGstin || '33APGPS4675G2ZL').trim().slice(0, 2);
  const isIntraState = !custState || custState === sellState;
  
  if (isIntraState) {
    return {
      cgstRate: taxRate / 2,
      sgstRate: taxRate / 2,
      igstRate: 0
    };
  } else {
    return {
      cgstRate: 0,
      sgstRate: 0,
      igstRate: taxRate
    };
  }
};

export const ComplianceModule: React.FC<ComplianceModuleProps> = ({ userRole }) => {
  const { invoices = [], ledgers = [], vouchers = [], purchaseRecords = [] } = useData();
  const [activeTab, setActiveTab] = useState<'gstr1' | 'gstr3b' | 'hsn' | 'tds'>('gstr1');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  // --- GST REPORTING LOGIC ---
  
  const gstr1Data = useMemo(() => {
    return invoices.filter(i => 
      i.date.startsWith(selectedMonth) && 
      i.status !== 'Draft' && 
      i.status !== 'Cancelled' && 
      i.documentType !== 'Quotation' &&
      i.documentType !== 'SupplierPO'
    );
  }, [invoices, selectedMonth]);

  const gstr3bSummary = useMemo(() => {
    let salesTaxable = 0;
    let salesCGST = 0;
    let salesSGST = 0;
    let salesIGST = 0;

    gstr1Data.forEach(inv => {
      const customerGstin = inv.customerGstin || '';
      const sellerGstin = inv.sellerProfile?.gstin || '33APGPS4675G2ZL';

      (inv.items || []).forEach((item: any) => {
        const taxable = item.amount || (item.unitPrice * item.quantity) || 0;
        const taxRate = item.taxRate !== undefined ? item.taxRate : 18;
        const rates = getTaxRates(taxRate, customerGstin, sellerGstin);

        salesTaxable += taxable;
        salesCGST += (taxable * rates.cgstRate) / 100;
        salesSGST += (taxable * rates.sgstRate) / 100;
        salesIGST += (taxable * rates.igstRate) / 100;
      });
    });

    let itcTaxable = 0;
    let itcCGST = 0;
    let itcSGST = 0;
    let itcIGST = 0;

    purchaseRecords.filter(p => 
      p.dateSupply.startsWith(selectedMonth) &&
      p.status !== 'Draft' &&
      p.status !== 'Cancelled'
    ).forEach(p => {
      if (p.items && p.items.length > 0) {
        p.items.forEach((it: any) => {
          const taxable = (it.rate * it.qty) || 0;
          itcTaxable += taxable;
          
          const cgstRate = it.cgstPercent !== undefined ? it.cgstPercent : (it.gstPercent ? it.gstPercent / 2 : 9);
          const sgstRate = it.sgstPercent !== undefined ? it.sgstPercent : (it.gstPercent ? it.gstPercent / 2 : 9);
          const igstRate = it.igstPercent !== undefined ? it.igstPercent : (it.totalIgst ? (it.totalIgst * 100 / taxable) : 0);

          itcCGST += (taxable * cgstRate) / 100;
          itcSGST += (taxable * sgstRate) / 100;
          itcIGST += (taxable * igstRate) / 100;
        });
      } else {
        const taxable = p.total - (p.totalGst || p.totalIgst || 0) - (p.packingCharges || 0) - (p.forwardingCharges || 0) - (p.freightCharges || 0);
        itcTaxable += Math.max(0, taxable);
        
        if (p.totalIgst > 0) {
          itcIGST += p.totalIgst;
        } else {
          itcCGST += (p.totalGst || 0) / 2;
          itcSGST += (p.totalGst || 0) / 2;
        }
      }
    });

    return {
      sales: {
        taxable: salesTaxable,
        cgst: salesCGST,
        sgst: salesSGST,
        igst: salesIGST,
        tax: salesCGST + salesSGST + salesIGST
      },
      itc: {
        taxable: itcTaxable,
        cgst: itcCGST,
        sgst: itcSGST,
        igst: itcIGST,
        tax: itcCGST + itcSGST + itcIGST
      }
    };
  }, [gstr1Data, purchaseRecords, selectedMonth]);

  const hsnSummary = useMemo(() => {
    const hsnMap: Record<string, { taxable: number; cgst: number; sgst: number; igst: number; qty: number; desc: string }> = {};

    gstr1Data.forEach(inv => {
      const customerGstin = inv.customerGstin || '';
      const sellerGstin = inv.sellerProfile?.gstin || '33APGPS4675G2ZL';

      (inv.items || []).forEach((item: any) => {
        const taxable = item.amount || (item.unitPrice * item.quantity) || 0;
        const taxRate = item.taxRate !== undefined ? item.taxRate : 18;
        const rates = getTaxRates(taxRate, customerGstin, sellerGstin);

        const cgst = (taxable * rates.cgstRate) / 100;
        const sgst = (taxable * rates.sgstRate) / 100;
        const igst = (taxable * rates.igstRate) / 100;

        const hsn = item.hsn || 'GENERAL';
        if (!hsnMap[hsn]) {
          hsnMap[hsn] = { taxable: 0, cgst: 0, sgst: 0, igst: 0, qty: 0, desc: item.equipmentName || 'Goods/Services' };
        }
        hsnMap[hsn].taxable += taxable;
        hsnMap[hsn].cgst += cgst;
        hsnMap[hsn].sgst += sgst;
        hsnMap[hsn].igst += igst;
        hsnMap[hsn].qty += item.quantity || 0;
      });
    });

    return hsnMap;
  }, [gstr1Data]);

  const handleExportGSTR1 = () => {
    const headers = ["GSTIN", "Receiver Name", "Invoice No", "Date", "Value", "Taxable Value", "CGST", "SGST", "IGST", "Total Tax"];
    const rows = gstr1Data.map(i => {
      const sellerGstin = i.sellerProfile?.gstin || '33APGPS4675G2ZL';
      let invTaxable = 0, invCGST = 0, invSGST = 0, invIGST = 0;
      (i.items || []).forEach((it: any) => {
        const taxable = it.amount || (it.unitPrice * it.quantity) || 0;
        const taxRate = it.taxRate !== undefined ? it.taxRate : 18;
        const rates = getTaxRates(taxRate, i.customerGstin || '', sellerGstin);
        invTaxable += taxable;
        invCGST += (taxable * rates.cgstRate) / 100;
        invSGST += (taxable * rates.sgstRate) / 100;
        invIGST += (taxable * rates.igstRate) / 100;
      });

      return [
        i.customerGstin || "Unregistered",
        `"${i.customerName.replace(/"/g, '""')}"`,
        i.invoiceNumber,
        i.date,
        i.grandTotal,
        invTaxable,
        invCGST,
        invSGST,
        invIGST,
        invCGST + invSGST + invIGST
      ];
    });

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
      gstin: "33APGPS4675G2ZL",
      fp: selectedMonth.replace('-', ''),
      version: "V1.0",
      b2b: b2bInvoices.map(i => {
        const sellerGstin = i.sellerProfile?.gstin || '33APGPS4675G2ZL';
        const itms = (i.items || []).map((it: any, idx: number) => {
          const taxable = it.amount || (it.unitPrice * it.quantity) || 0;
          const taxRate = it.taxRate !== undefined ? it.taxRate : 18;
          const rates = getTaxRates(taxRate, i.customerGstin || '', sellerGstin);
          
          return {
            num: idx + 1,
            itm_det: {
              ty: "G",
              hsn_sc: it.hsn || "0000",
              txval: taxable,
              rt: taxRate,
              iamt: rates.igstRate > 0 ? (taxable * rates.igstRate / 100) : 0,
              camt: rates.cgstRate > 0 ? (taxable * rates.cgstRate / 100) : 0,
              samt: rates.sgstRate > 0 ? (taxable * rates.sgstRate / 100) : 0
            }
          };
        });

        return {
          ctin: i.customerGstin,
          inv: [{
            inum: i.invoiceNumber,
            idt: i.date,
            val: i.grandTotal,
            pos: (i.customerGstin || '').trim().slice(0, 2) || "33",
            rchrg: "N",
            inv_typ: "R",
            itms
          }]
        };
      }),
      b2cs: b2csInvoices.map(i => {
        const sellerGstin = i.sellerProfile?.gstin || '33APGPS4675G2ZL';
        const invTaxable = (i.items || []).reduce((s: number, it: any) => s + (it.amount || (it.unitPrice * it.quantity) || 0), 0);
        const invTax = (i.items || []).reduce((s: number, it: any) => s + (it.amount || (it.unitPrice * it.quantity) || 0) * (it.taxRate !== undefined ? it.taxRate : 18) / 100, 0);
        const firstItemRate = i.items?.[0]?.taxRate || 18;
        const rates = getTaxRates(firstItemRate, '', sellerGstin);

        return {
          sply_ty: rates.igstRate > 0 ? "INTER" : "INTRA",
          pos: "33",
          typ: "OE",
          txval: invTaxable,
          rt: firstItemRate,
          iamt: rates.igstRate > 0 ? invTax : 0,
          camt: rates.cgstRate > 0 ? invTax / 2 : 0,
          samt: rates.sgstRate > 0 ? invTax / 2 : 0
        };
      })
    };

    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `GSTR1_${selectedMonth}.json`;
    link.click();
  };

  const handleExportHSN = () => {
    const headers = ["HSN/SAC", "Description", "Quantity", "Taxable Value", "CGST", "SGST", "IGST", "Total Tax"];
    const rows = Object.entries(hsnSummary).map(([hsn, data]) => [
      hsn,
      `"${data.desc.replace(/"/g, '""')}"`,
      data.qty,
      data.taxable,
      data.cgst,
      data.sgst,
      data.igst,
      data.cgst + data.sgst + data.igst
    ]);

    const csvContent = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `HSN_Summary_${selectedMonth}.csv`;
    link.click();
  };

  return (
    <div className="h-full flex flex-col gap-4 md:gap-6 overflow-hidden p-1 md:p-2">
      {/* Header & Month Picker */}
      <div className="bg-gradient-to-br from-emerald-950 to-green-900 flex flex-col md:flex-row justify-between items-center gap-4 md:gap-6 m-0 md:m-3 lg:m-4 p-4 md:p-6 rounded-[1.5rem] md:rounded-[36px] shadow-[0_30px_60px_-15px_rgba(6,78,59,0.55),_inset_0_2px_3px_rgba(255,255,255,0.1)] shrink-0 relative overflow-hidden group">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
        <div className="flex items-center gap-3 md:gap-5 relative z-10 w-full md:w-auto">
          <div className="w-10 h-10 md:w-14 md:h-14 shrink-0 flex items-center justify-center text-[#c5a059] drop-shadow-md transition-transform group-hover:scale-110">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h2 className="text-lg xl:text-xl font-playfair font-bold tracking-tight text-white uppercase leading-none whitespace-nowrap">Compliance Terminal</h2>
            <p className="text-emerald-100/80 text-[11px] md:text-xs font-semibold leading-relaxed">Statutory Tax & Regulatory Reporting</p>
          </div>
        </div>

        <div className="flex items-center w-full md:w-auto justify-center gap-2 bg-gradient-to-r from-[#c5a059] to-[#e5c185] px-4 py-2 md:px-5 md:py-2.5 rounded-[1.5rem] md:rounded-[2rem] shadow-[0_15px_30px_-5px_rgba(197,160,89,0.4)] hover:scale-[1.02] hover:shadow-[0_20px_40px_-5px_rgba(197,160,89,0.6)] transition-all relative z-10 shrink-0 cursor-pointer relative overflow-hidden">
          <Calendar size={16} className="text-amber-950 shrink-0" />
          <input 
            type="month" 
            className="bg-transparent border-none text-xs md:text-sm font-black uppercase outline-none text-amber-950 focus:ring-0 cursor-pointer w-full text-center md:text-left md:w-auto"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-4 md:gap-6 overflow-hidden">
        {/* Navigation Sidebar */}
        <div className="w-full md:w-64 flex flex-row md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0 shrink-0 snap-x custom-scrollbar">
          {[
            { id: 'gstr1', label: 'GSTR-1 (Outward)', icon: FileSpreadsheet, desc: 'Sales & Supplies' },
            { id: 'gstr3b', label: 'GSTR-3B (Monthly)', icon: PieChart, desc: 'Summary Return' },
            { id: 'hsn', label: 'HSN Grouping', icon: Grid, desc: 'HSN-wise Summary' },
            { id: 'tds', label: 'TDS / TCS Log', icon: IndianRupee, desc: 'Withholding Tax' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`shrink-0 min-w-[180px] md:min-w-0 md:w-full p-3 md:p-6 rounded-[1rem] md:rounded-[2rem] text-left transition-all border flex items-center gap-3 md:gap-4 group snap-start ${
                activeTab === tab.id 
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-500/20' 
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 hover:border-indigo-500'
              }`}
            >
              <div className={`p-2 rounded-[1rem] md:rounded-[2rem] transition-colors shrink-0 ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-indigo-600'}`}>
                <tab.icon size={16} className="md:w-[18px] md:h-[18px]" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1 truncate">{tab.label}</p>
                <p className={`text-[8px] font-bold uppercase opacity-60 truncate ${activeTab === tab.id ? 'text-white' : 'text-slate-400'}`}>{tab.desc}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Main Report Area */}
        <div className="flex-1 bg-white dark:bg-slate-900 rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden">
          {activeTab === 'gstr1' && (
            <>
              <div className="p-4 md:p-8 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/50">
                <div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">Outward Supplies (GSTR-1)</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Total {gstr1Data.length} records found for {selectedMonth}</p>
                </div>
                <div className="flex flex-wrap gap-2 md:gap-3 w-full md:w-auto">
                  <button 
                    onClick={handleExportGSTR1}
                    className="flex-1 md:flex-none justify-center bg-white border border-slate-200 text-slate-600 px-4 md:px-6 py-2 md:py-2.5 rounded-[1.5rem] md:rounded-[2rem] text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-50 transition-all font-bold"
                  >
                    <Download size={14} /> CSV
                  </button>
                  <button 
                    onClick={handleExportGSTR1JSON}
                    className="flex-1 md:flex-none justify-center bg-emerald-600 text-white px-4 md:px-6 py-2 md:py-2.5 rounded-[1.5rem] md:rounded-[2rem] text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                  >
                    <Download size={14} /> JSON
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-[9px] uppercase font-black tracking-widest text-slate-400 sticky top-0 border-b border-slate-100 dark:border-slate-700">
                    <tr>
                      <th className="px-4 py-2">GSTIN / Recipient</th>
                      <th className="px-4 py-2">Invoice Details</th>
                      <th className="px-4 py-2 text-right">Taxable (₹)</th>
                      <th className="px-4 py-2 text-right">CGST (₹)</th>
                      <th className="px-4 py-2 text-right">SGST (₹)</th>
                      <th className="px-4 py-2 text-right">IGST (₹)</th>
                      <th className="px-4 py-2 text-right">Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {gstr1Data.map(i => {
                      const sellerGstin = i.sellerProfile?.gstin || '33APGPS4675G2ZL';
                      let invTaxable = 0, invCGST = 0, invSGST = 0, invIGST = 0;
                      (i.items || []).forEach((it: any) => {
                        const taxable = it.amount || (it.unitPrice * it.quantity) || 0;
                        const taxRate = it.taxRate !== undefined ? it.taxRate : 18;
                        const rates = getTaxRates(taxRate, i.customerGstin || '', sellerGstin);
                        invTaxable += taxable;
                        invCGST += (taxable * rates.cgstRate) / 100;
                        invSGST += (taxable * rates.sgstRate) / 100;
                        invIGST += (taxable * rates.igstRate) / 100;
                      });

                      return (
                        <tr key={i.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-2">
                            <p className="font-black text-slate-800 dark:text-white uppercase truncate max-w-[200px]">{i.customerName}</p>
                            <p className="text-[9px] font-bold text-indigo-500 uppercase">{i.customerGstin || 'Unregistered'}</p>
                          </td>
                          <td className="px-4 py-2">
                            <p className="font-black text-slate-400"><span className="font-inter font-bold tracking-widest">{i.invoiceNumber}</span></p>
                            <p className="text-[9px] font-bold">{i.date}</p>
                          </td>
                          <td className="px-4 py-2 text-right font-bold text-slate-600 dark:text-slate-300">₹{invTaxable.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-2 text-right font-bold text-emerald-600">₹{invCGST.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-2 text-right font-bold text-emerald-600">₹{invSGST.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-2 text-right font-bold text-indigo-600">₹{invIGST.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-2 text-right font-black text-slate-900 dark:text-white">₹{i.grandTotal.toLocaleString('en-IN')}</td>
                        </tr>
                      );
                    })}
                    {gstr1Data.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-20 text-center text-slate-300 font-bold uppercase tracking-widest text-[10px] opacity-30">
                          No outward supply records found for this period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {activeTab === 'gstr3b' && (
            <div className="flex-1 overflow-auto p-4 md:p-8 space-y-4 md:space-y-5">
              <div className="max-w-4xl mx-auto space-y-4 md:space-y-5">
                <div className="text-center space-y-2">
                  <h3 className="text-xl md:text-2xl font-playfair font-bold tracking-tight text-slate-800 dark:text-white uppercase">GSTR-3B Self-Assessment</h3>
                  <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">Consolidated Tax Summary for {selectedMonth}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                  {/* Outward Liabilities */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-[2rem]"><ArrowRight size={18} /></div>
                        <h4 className="font-black text-xs uppercase tracking-widest text-slate-700 dark:text-slate-300">Outward Supplies (Liability)</h4>
                      </div>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Taxable Value</span>
                          <span className="text-sm font-black text-slate-800 dark:text-white">₹{gstr3bSummary.sales.taxable.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="space-y-2 pt-2">
                          <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase">
                            <span>CGST Liability</span>
                            <span>₹{gstr3bSummary.sales.cgst.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase">
                            <span>SGST Liability</span>
                            <span>₹{gstr3bSummary.sales.sgst.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase">
                            <span>IGST Liability</span>
                            <span>₹{gstr3bSummary.sales.igst.toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-6 mt-6 border-t border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Total Output Tax</span>
 <span className="text-xl font-bold tracking-tight text-rose-600">₹{gstr3bSummary.sales.tax.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {/* ITC Availability */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-[2rem]"><IndianRupee size={18} /></div>
                        <h4 className="font-black text-xs uppercase tracking-widest text-slate-700 dark:text-slate-300">Input Tax Credit (ITC)</h4>
                      </div>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Eligible Purchase Value</span>
                          <span className="text-sm font-black text-slate-800 dark:text-white">₹{gstr3bSummary.itc.taxable.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="space-y-2 pt-2">
                          <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase">
                            <span>CGST Credit</span>
                            <span>₹{gstr3bSummary.itc.cgst.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase">
                            <span>SGST Credit</span>
                            <span>₹{gstr3bSummary.itc.sgst.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase">
                            <span>IGST Credit</span>
                            <span>₹{gstr3bSummary.itc.igst.toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-6 mt-6 border-t border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Total ITC Claimable</span>
 <span className="text-xl font-bold tracking-tight text-emerald-600">₹{gstr3bSummary.itc.tax.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                {/* Net Liability */}
                <div className="bg-indigo-600 p-6 md:p-10 rounded-[1.5rem] md:rounded-[3rem] text-white shadow-2xl shadow-indigo-500/40 relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-8 opacity-10"><CheckCircle2 size={120} /></div>
                   <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6 md:gap-8">
                     <div className="space-y-2 text-center md:text-left">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-200">Net Tax Payable (Self-Assessment)</h4>
 <p className="text-4xl font-bold tracking-tighter">₹{Math.max(0, gstr3bSummary.sales.tax - gstr3bSummary.itc.tax).toLocaleString('en-IN')}</p>
                        {gstr3bSummary.itc.tax > gstr3bSummary.sales.tax && (
                          <p className="text-[9px] font-black text-emerald-300 uppercase tracking-widest mt-1">Excess ITC of ₹{(gstr3bSummary.itc.tax - gstr3bSummary.sales.tax).toLocaleString('en-IN')} to carry forward</p>
                        )}
                     </div>
                     <button className="bg-white text-indigo-600 px-6 md:px-10 py-3 md:py-4 rounded-[1.5rem] md:rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:scale-105 transition-all w-full md:w-auto">
                       Submit Data to Portal
                     </button>
                   </div>
                </div>

                <div className="flex items-center gap-2 text-amber-500 bg-amber-50 dark:bg-amber-900/10 p-4 rounded-[2rem] border border-amber-100 dark:border-amber-800/50">
                   <AlertCircle size={14} className="shrink-0" />
                   <p className="text-[9px] font-bold uppercase leading-tight">Note: This is a generated summary for review. Please cross-verify with actual invoices before filing.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'hsn' && (
            <>
              <div className="p-4 md:p-8 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/50">
                <div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">HSN-wise Summary</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Summary of supplies by HSN / SAC code</p>
                </div>
                <button 
                  onClick={handleExportHSN}
                  className="bg-white border border-slate-200 text-slate-600 px-4 md:px-6 py-2 md:py-2.5 rounded-[1.5rem] md:rounded-[2rem] text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-50 transition-all font-bold w-full md:w-auto"
                >
                  <Download size={14} /> Export CSV
                </button>
              </div>
              <div className="flex-1 overflow-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-[9px] uppercase font-black tracking-widest text-slate-400 sticky top-0 border-b border-slate-100 dark:border-slate-700">
                    <tr>
                      <th className="px-4 py-2">HSN/SAC</th>
                      <th className="px-4 py-2">Description</th>
                      <th className="px-4 py-2 text-right">Qty</th>
                      <th className="px-4 py-2 text-right">Taxable Value (₹)</th>
                      <th className="px-4 py-2 text-right">CGST (₹)</th>
                      <th className="px-4 py-2 text-right">SGST (₹)</th>
                      <th className="px-4 py-2 text-right">IGST (₹)</th>
                      <th className="px-4 py-2 text-right">Total Tax (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {Object.entries(hsnSummary).map(([hsn, data]) => (
                      <tr key={hsn} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-2 font-black text-slate-800 dark:text-white uppercase">{hsn}</td>
                        <td className="px-4 py-2 font-bold text-slate-400 uppercase">{data.desc}</td>
                        <td className="px-4 py-2 text-right font-bold text-slate-700 dark:text-slate-300">{data.qty}</td>
                        <td className="px-4 py-2 text-right font-black text-slate-600 dark:text-slate-300">₹{data.taxable.toLocaleString('en-IN')}</td>
                        <td className="px-4 py-2 text-right font-black text-emerald-600">₹{data.cgst.toLocaleString('en-IN')}</td>
                        <td className="px-4 py-2 text-right font-black text-emerald-600">₹{data.sgst.toLocaleString('en-IN')}</td>
                        <td className="px-4 py-2 text-right font-black text-indigo-600">₹{data.igst.toLocaleString('en-IN')}</td>
                        <td className="px-4 py-2 text-right font-black text-slate-900 dark:text-white">₹{(data.cgst + data.sgst + data.igst).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                    {Object.keys(hsnSummary).length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-20 text-center text-slate-300 font-bold uppercase tracking-widest text-[10px] opacity-30">
                          No HSN records found for this period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {activeTab === 'tds' && (
             <div className="flex-1 overflow-auto p-4 md:p-8 space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 md:mb-8">
                  <div>
                    <h3 className="text-lg md:text-xl font-playfair font-bold tracking-tight text-slate-800 dark:text-white uppercase">Withholding Tax (TDS/TCS) Log</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Summary of tax deducted at source for {selectedMonth}</p>
                  </div>
                  <div className="bg-amber-100 dark:bg-amber-900/30 p-4 rounded-[1.5rem] md:rounded-[2rem] flex items-center justify-between md:justify-start gap-4 w-full md:w-auto">
                     <div className="text-left md:text-right">
                        <p className="text-[8px] font-black text-amber-600 uppercase">Total TDS Liability</p>
 <p className="text-lg md:text-xl font-bold tracking-tight text-amber-600">₹{vouchers.filter(v => v.date.startsWith(selectedMonth) && v.narration.toLowerCase().includes('tds')).reduce((sum, v) => sum + v.totalAmount, 0).toLocaleString('en-IN')}</p>
                     </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-[9px] uppercase font-black tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-700">
                      <tr>
                        <th className="px-4 py-2">Date</th>
                        <th className="px-4 py-2">Particulars</th>
                        <th className="px-4 py-2">Section</th>
                        <th className="px-4 py-2 text-right">Taxable Amount (₹)</th>
                        <th className="px-4 py-2 text-right">Tax Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                      {vouchers
                        .filter(v => v.date.startsWith(selectedMonth) && v.narration.toLowerCase().includes('tds'))
                        .map(v => (
                        <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-2 font-bold text-slate-400">{v.date}</td>
                          <td className="px-4 py-2">
                            <p className="font-black text-slate-800 dark:text-white uppercase">{v.entries[0]?.ledgerName}</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 italic">{v.narration}</p>
                          </td>
                          <td className="px-4 py-2 uppercase font-black text-amber-600">
                             {v.narration.match(/194[CIJ]/)?.[0] || '194C'}
                          </td>
                          <td className="px-4 py-2 text-right font-bold text-slate-600">₹{((v.totalAmount * 100) / (v.narration.includes('10%') ? 10 : 1)).toLocaleString('en-IN')}</td>
                          <td className="px-4 py-2 text-right font-black text-rose-600">₹{v.totalAmount.toLocaleString('en-IN')}</td>
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
