import React from 'react';
import { History, User, Clock, ArrowRight, AlertCircle } from 'lucide-react';
import { AuditLogEntry } from '../types';

interface Props {
  history: AuditLogEntry[];
  title?: string;
}

export const AuditTrailViewer: React.FC<Props> = ({ history, title = "Audit Log / Edit History" }) => {
  if (!history || history.length === 0) {
    return (
      <div className="p-10 text-center opacity-30">
        <History size={40} className="mx-auto mb-2" />
        <p className="text-[10px] font-black uppercase tracking-widest">No edit history recorded for this document</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2">
          <History size={16} className="text-indigo-500" />
          {title}
        </h3>
      </div>
      
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {history.map((entry, idx) => (
          <div key={entry.id} className="relative pl-8 pb-2 border-l-2 border-slate-200 dark:border-slate-800 last:border-0 last:pb-0">
            {/* Timeline Dot */}
            <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-4 border-slate-50 dark:border-slate-900 ${
              entry.action === 'Created' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.4)]'
            }`}></div>
            
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-500">
                    <User size={14} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-800 dark:text-white uppercase leading-none mb-1">{entry.user}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase flex items-center gap-1">
                      <Clock size={8} /> {new Date(entry.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                  entry.action === 'Created' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'
                }`}>
                  {entry.action}
                </span>
              </div>

              {entry.reason && (
                <div className="mb-4 flex items-start gap-2 bg-amber-50 dark:bg-amber-900/10 p-3 rounded-xl border border-amber-100 dark:border-amber-800/50">
                   <AlertCircle size={12} className="text-amber-500 mt-0.5 shrink-0" />
                   <p className="text-[9px] font-bold text-amber-700 dark:text-amber-400 uppercase italic">"{entry.reason}"</p>
                </div>
              )}

              <div className="space-y-3">
                {entry.changes.map((change, cIdx) => (
                  <div key={cIdx} className="flex flex-col gap-1">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{change.field}</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 rounded-lg border border-slate-100 dark:border-slate-800 overflow-hidden">
                        <p className="text-[9px] font-bold text-slate-500 truncate">{JSON.stringify(change.oldValue) || 'NULL'}</p>
                      </div>
                      <ArrowRight size={12} className="text-slate-300 shrink-0" />
                      <div className="flex-1 bg-indigo-50/50 dark:bg-indigo-900/10 px-3 py-2 rounded-lg border border-indigo-100/50 dark:border-indigo-800 overflow-hidden">
                        <p className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 truncate">{JSON.stringify(change.newValue) || 'NULL'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
