import React from 'react';
import { FileText, FileCheck2, FileX } from 'lucide-react';
import { FiledHistoryEntry } from '../types';

interface FiledStatusIndicatorProps {
  id: string;
  filedStatus?: 'Not Updated' | 'Filed' | 'Not Filed';
  filedHistory?: FiledHistoryEntry[];
  currentUser: string;
  onUpdate: (id: string, updates: { filedStatus: 'Filed' | 'Not Filed'; filedHistory: FiledHistoryEntry[] }) => Promise<void>;
}

export const FiledStatusIndicator: React.FC<FiledStatusIndicatorProps> = ({
  id,
  filedStatus = 'Not Updated',
  filedHistory = [],
  currentUser,
  onUpdate
}) => {
  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click select events
    
    const prevStatus = filedStatus;
    const newStatus = (filedStatus === 'Not Updated' || filedStatus === 'Not Filed') ? 'Filed' : 'Not Filed';
    
    const newEntry: FiledHistoryEntry = {
      changedBy: currentUser || 'System',
      changedAt: new Date().toISOString(),
      prevStatus,
      newStatus
    };
    
    const updatedHistory = [newEntry, ...filedHistory];
    
    await onUpdate(id, {
      filedStatus: newStatus,
      filedHistory: updatedHistory
    });
  };

  if (filedStatus === 'Filed') {
    return (
      <button
        type="button"
        onClick={handleToggle}
        title="Document Filed"
        className="inline-flex items-center justify-center w-7 h-7 rounded-[2rem] border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-300 transition-all cursor-pointer text-emerald-600 shadow-sm shadow-emerald-500/5"
      >
        <FileCheck2 size={14} className="stroke-[2.5]" />
      </button>
    );
  }

  if (filedStatus === 'Not Filed') {
    return (
      <button
        type="button"
        onClick={handleToggle}
        title="Document Not Filed"
        className="inline-flex items-center justify-center w-7 h-7 rounded-[2rem] border border-slate-350 bg-slate-100 hover:bg-slate-200 hover:border-slate-400 transition-all cursor-pointer text-slate-500 shadow-sm"
      >
        <FileX size={14} className="stroke-[2]" />
      </button>
    );
  }

  // Default: Not Updated
  return (
    <button
      type="button"
      onClick={handleToggle}
      title="Filed Status Not Updated"
      className="inline-flex items-center justify-center w-7 h-7 rounded-[2rem] border border-dashed border-slate-300 bg-transparent hover:border-slate-400 hover:bg-slate-50 transition-all cursor-pointer text-slate-300 hover:text-slate-500"
    >
      <FileText size={14} className="stroke-[1.5]" />
    </button>
  );
};
