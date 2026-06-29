import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, X } from 'lucide-react';

export type FilingFilterValue = 'All' | 'Filed' | 'Not Filed' | 'Not Updated';

interface FilingFilterDropdownProps {
    value: FilingFilterValue;
    onChange: (val: FilingFilterValue) => void;
}

export const FilingFilterDropdown: React.FC<FilingFilterDropdownProps> = ({ value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    
    useEffect(() => {
        setMounted(true);
    }, []);
    
    const options: { label: string, value: FilingFilterValue }[] = [
        { label: 'All Filing', value: 'All' },
        { label: 'Filed', value: 'Filed' },
        { label: 'Not Filed', value: 'Not Filed' },
        { label: 'Not Updated', value: 'Not Updated' }
    ];

    const selectedLabel = options.find(o => o.value === value)?.label || 'All Filing';

    const modalContent = isOpen ? (
        <div className="fixed inset-0 z-[99999] flex flex-col justify-end bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full rounded-t-[2rem] shadow-2xl flex flex-col max-h-[80vh] overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
                <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-white">
                        Filter By Status
                    </h3>
                    <button 
                        onClick={() => setIsOpen(false)}
                        className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-full transition-colors"
                    >
                        <X size={16} strokeWidth={3} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                    <div className="flex flex-col">
                        {options.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => { onChange(opt.value); setIsOpen(false); }}
                                className={`p-4 text-left font-bold rounded-[1.5rem] transition-colors uppercase ${value === opt.value ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    ) : null;

    return (
        <>
            <div 
                onClick={() => setIsOpen(true)}
                className="relative w-full sm:w-auto min-w-[120px] h-full bg-emerald-900/40 border border-emerald-700/50 text-white rounded-[2rem] pl-4 pr-10 py-3 sm:py-2 text-[12px] sm:text-[10px] font-bold cursor-pointer hover:bg-emerald-900/60 transition-all uppercase shadow-inner flex items-center justify-between"
            >
                <span className="truncate">{selectedLabel}</span>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400 pointer-events-none" />
            </div>
            {mounted && modalContent && createPortal(modalContent, document.body)}
        </>
    );
};
