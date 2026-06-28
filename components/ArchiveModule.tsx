
import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Download, FileBox, Calendar, ShieldCheck, History, Info } from 'lucide-react';

interface ArchivedReport {
  id: string;
  type: 'monthly_expenses' | 'annual_expenses';
  monthId?: string;
  fyId?: string;
  csvContent: string;
  timestamp: string;
  recordCount?: number;
  monthsIncluded?: string[];
}

export const ArchiveModule: React.FC = () => {
  const [reports, setReports] = useState<ArchivedReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "archived_reports"), orderBy("timestamp", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setReports(snap.docs.map(d => ({ id: d.id, ...d.data() } as ArchivedReport)));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const downloadCSV = (report: ArchivedReport) => {
    const filename = report.type === 'monthly_expenses' 
      ? `Expenses_${report.monthId}.csv` 
      : `Annual_Report_${report.fyId}.csv`;
    
    const blob = new Blob([report.csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="h-full flex flex-col gap-6 p-2 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
      {/* Header Section */}
      <div className="bg-gradient-to-br from-emerald-950 to-green-900 flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 m-1 md:m-3 lg:m-4 p-4 md:p-6 rounded-[1.5rem] md:rounded-[36px] shadow-[0_30px_60px_-15px_rgba(6,78,59,0.55),_inset_0_2px_3px_rgba(255,255,255,0.1)] shrink-0 relative overflow-hidden group">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
        <div className="flex items-center gap-3 md:gap-5 relative z-10 w-full overflow-hidden">
          <div className="w-10 h-10 md:w-14 md:h-14 flex items-center justify-center text-[#c5a059] drop-shadow-md transition-transform group-hover:scale-110 shrink-0">
            <FileBox size={24} className="hidden md:block" />
            <FileBox size={20} className="md:hidden" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg xl:text-xl font-playfair font-bold tracking-tight text-white uppercase leading-none whitespace-nowrap">Permanent Financial Archive</h2>
            <p className="text-emerald-100/80 text-[11px] md:text-xs font-semibold leading-relaxed truncate">Immutable Monthly & Yearly Csv Records</p>
          </div>
        </div>
        
        <div className="flex items-center justify-center gap-2 md:gap-3 bg-gradient-to-r from-[#c5a059] to-[#e5c185] px-4 md:px-6 py-2 md:py-3 rounded-[1.5rem] md:rounded-[2rem] shadow-[0_15px_30px_-5px_rgba(197,160,89,0.4)] relative z-10 shrink-0 w-full md:w-auto">
          <ShieldCheck size={14} className="text-amber-950 md:hidden" />
          <ShieldCheck size={18} className="text-amber-950 hidden md:block" />
          <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.15em] text-amber-950">Compliance Verified</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-white rounded-[1.5rem] md:rounded-[2rem] border border-slate-300 shadow-sm flex flex-col overflow-hidden mx-1 md:mx-0">
        <div className="p-4 md:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
          <div className="flex items-center gap-2">
            <History size={16} className="text-slate-400" />
            <span className="text-[9px] md:text-[10px] font-black uppercase text-slate-500 tracking-widest">Document Registry</span>
          </div>
          <p className="text-[9px] md:text-[10px] font-bold text-slate-400 bg-white px-2.5 py-1 rounded-full border">Total: {reports.length}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-3 md:p-4 custom-scrollbar">
          {loading ? (
            <div className="h-full flex items-center justify-center p-10 md:p-20 text-slate-400 italic font-medium text-xs md:text-base">Synchronizing Secure Archive...</div>
          ) : reports.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-10 md:p-20 text-center">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-3 md:mb-4 border-2 border-dashed border-slate-200">
                <FileBox size={24} className="md:hidden" />
                <FileBox size={32} className="hidden md:block" />
              </div>
              <p className="font-black text-slate-300 uppercase text-[10px] md:text-xs tracking-widest">No Archival Records Found</p>
              <p className="text-slate-400 text-[9px] md:text-[10px] mt-1.5 md:mt-2 max-w-[200px]">Archives are automatically generated on the 1st of every month.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {reports.map(report => (
                <div key={report.id} className="p-5 rounded-3xl border border-slate-200 bg-white hover:border-emerald-400 transition-all group shadow-sm hover:shadow-xl">
                  <div className="flex justify-between items-start mb-4">
                    <div className={`p-2 rounded-[2rem] ${report.type === 'annual_expenses' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      {report.type === 'annual_expenses' ? <ShieldCheck size={20} /> : <Calendar size={20} />}
                    </div>
                    <button 
                      onClick={() => downloadCSV(report)}
                      className="p-2.5 bg-slate-50 text-slate-400 hover:bg-emerald-600 hover:text-white rounded-[2rem] transition-all shadow-sm group-hover:scale-110 active:scale-95"
                    >
                      <Download size={18} />
                    </button>
                  </div>
                  
                  <h3 className="font-black text-slate-800 text-sm uppercase tracking-tight mb-1">
                    {report.type === 'annual_expenses' ? `Financial Year ${report.fyId}` : `Expenses ${report.monthId}`}
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                    {report.type === 'annual_expenses' ? 'Consolidated Annual Archive' : 'Monthly Operational Record'}
                  </p>
                  
                  <div className="flex items-center gap-3 pt-4 border-t border-slate-50 mt-auto">
                    <div className="flex-1 bg-slate-50 px-3 py-2 rounded-[2rem]">
                      <p className="text-[8px] font-black text-slate-300 uppercase leading-none mb-1">Snapshot Date</p>
                      <p className="text-[10px] font-black text-slate-600 leading-none">{new Date(report.timestamp).toLocaleDateString()}</p>
                    </div>
                    <div className="flex-1 bg-slate-50 px-3 py-2 rounded-[2rem]">
                      <p className="text-[8px] font-black text-slate-300 uppercase leading-none mb-1">{report.type === 'annual_expenses' ? 'Months' : 'Records'}</p>
                      <p className="text-[10px] font-black text-slate-600 leading-none">{report.type === 'annual_expenses' ? report.monthsIncluded?.length : report.recordCount}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 md:p-6 bg-emerald-950 text-emerald-50 mt-auto flex flex-col sm:flex-row items-start gap-3 md:gap-4">
          <Info size={16} className="shrink-0 mt-0.5 text-emerald-400 hidden sm:block" />
          <p className="text-[9px] md:text-[10px] font-medium leading-relaxed opacity-80">
            <span className="font-black uppercase text-emerald-300 block sm:inline mb-1 sm:mb-0"><Info size={12} className="inline mr-1 sm:hidden" /> Regulatory Advisory:</span> These records are immutable and stored for multi-year compliance. Modifying historical data is disabled. In case of audit requirements, please consult the CSV hashes in the system logs.
          </p>
        </div>
      </div>
    </div>
  );
};
