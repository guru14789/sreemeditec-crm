
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[2rem] border border-slate-300 shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-200">
            <FileBox size={24} />
          </div>
          <div>
            <h2 className="font-black text-slate-800 uppercase tracking-tight text-xl leading-tight">Permanent Financial Archive</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Immutable monthly & yearly CSV records</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-200">
          <ShieldCheck size={18} className="text-emerald-600" />
          <span className="text-[10px] font-black uppercase text-slate-500">Compliance Verified</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-white rounded-[2rem] border border-slate-300 shadow-sm flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
          <div className="flex items-center gap-2">
            <History size={16} className="text-slate-400" />
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Document Registry</span>
          </div>
          <p className="text-[10px] font-bold text-slate-400 bg-white px-3 py-1 rounded-full border">Total: {reports.length} Records</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {loading ? (
            <div className="h-full flex items-center justify-center p-20 text-slate-400 italic font-medium">Synchronizing Secure Archive...</div>
          ) : reports.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-20 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-4 border-2 border-dashed border-slate-200">
                <FileBox size={32} />
              </div>
              <p className="font-black text-slate-300 uppercase text-xs tracking-widest">No Archival Records Found</p>
              <p className="text-slate-400 text-[10px] mt-2 max-w-[200px]">Archives are automatically generated on the 1st of every month.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reports.map(report => (
                <div key={report.id} className="p-5 rounded-3xl border border-slate-200 bg-white hover:border-emerald-400 transition-all group shadow-sm hover:shadow-xl">
                  <div className="flex justify-between items-start mb-4">
                    <div className={`p-2 rounded-xl ${report.type === 'annual_expenses' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      {report.type === 'annual_expenses' ? <ShieldCheck size={20} /> : <Calendar size={20} />}
                    </div>
                    <button 
                      onClick={() => downloadCSV(report)}
                      className="p-2.5 bg-slate-50 text-slate-400 hover:bg-emerald-600 hover:text-white rounded-xl transition-all shadow-sm group-hover:scale-110 active:scale-95"
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
                    <div className="flex-1 bg-slate-50 px-3 py-2 rounded-xl">
                      <p className="text-[8px] font-black text-slate-300 uppercase leading-none mb-1">Snapshot Date</p>
                      <p className="text-[10px] font-black text-slate-600 leading-none">{new Date(report.timestamp).toLocaleDateString()}</p>
                    </div>
                    <div className="flex-1 bg-slate-50 px-3 py-2 rounded-xl">
                      <p className="text-[8px] font-black text-slate-300 uppercase leading-none mb-1">{report.type === 'annual_expenses' ? 'Months' : 'Records'}</p>
                      <p className="text-[10px] font-black text-slate-600 leading-none">{report.type === 'annual_expenses' ? report.monthsIncluded?.length : report.recordCount}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 bg-emerald-950 text-emerald-50 mt-auto flex items-start gap-4">
          <Info size={18} className="shrink-0 mt-0.5 text-emerald-400" />
          <p className="text-[10px] font-medium leading-relaxed opacity-80">
            <span className="font-black uppercase text-emerald-300">Regulatory Advisory:</span> These records are immutable and stored for multi-year compliance. Modifying historical data is disabled. In case of audit requirements, please consult the CSV hashes in the system logs.
          </p>
        </div>
      </div>
    </div>
  );
};
