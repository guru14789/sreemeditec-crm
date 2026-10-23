import React, { useState, useEffect, useRef } from 'react';

interface AutoSuggestProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (item: any) => void;
  suggestions: any[];
  placeholder?: string;
  className?: string;
  renderSuggestion?: (item: any) => React.ReactNode;
  filterKey: string;
}

export const AutoSuggest: React.FC<AutoSuggestProps> = ({
  value,
  onChange,
  onSelect,
  suggestions,
  placeholder,
  className,
  renderSuggestion,
  filterKey
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filtered, setFiltered] = useState<any[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showSuggestions) {
      if (!value) {
        setFiltered(suggestions.slice(0, 50));
      } else {
        const results = suggestions.filter(item => {
          const valLower = value.toLowerCase();
          const primary = String(item[filterKey] || '').toLowerCase();
          const name = String(item.name || '').toLowerCase();
          const hospital = String(item.hospital || '').toLowerCase();
          const branch = String(item.branchName || '').toLowerCase();
          const parent = String(item.parentClientName || '').toLowerCase();
          const gstin = String(item.gstin || '').toLowerCase();
          const brand = String(item.brand || '').toLowerCase();
          const model = String(item.model || '').toLowerCase();
          const category = String(item.category || '').toLowerCase();
          const phone = String(item.phone || item.contactPhone || '').toLowerCase();
          const contact = String(item.contactPerson || '').toLowerCase();
          return (
            primary.includes(valLower) ||
            name.includes(valLower) ||
            hospital.includes(valLower) ||
            branch.includes(valLower) ||
            parent.includes(valLower) ||
            gstin.includes(valLower) ||
            brand.includes(valLower) ||
            model.includes(valLower) ||
            category.includes(valLower) ||
            phone.includes(valLower) ||
            contact.includes(valLower)
          );
        });
        setFiltered(results.slice(0, 50));
      }
    } else {
      setFiltered([]);
    }
  }, [value, suggestions, filterKey, showSuggestions]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={containerRef}>
      <input
        type="text"
        className={className}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setShowSuggestions(true);
        }}
        onFocus={() => setShowSuggestions(true)}
        placeholder={placeholder}
      />
      {showSuggestions && filtered.length > 0 && (
        <div className="absolute z-[300] w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-h-56 md:max-h-64 overflow-y-auto py-2 animate-in fade-in slide-in-from-top-1 duration-200 custom-scrollbar">
          {filtered.map((item, index) => (
            <div
              key={index}
              className="px-4 py-2.5 hover:bg-teal-50 dark:hover:bg-slate-800/90 cursor-pointer transition-colors border-b border-slate-100 dark:border-slate-800/60 last:border-0"
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(item);
                setShowSuggestions(false);
              }}
            >
              {renderSuggestion ? renderSuggestion(item) : (
                <div className="flex flex-col gap-0.5">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center justify-between gap-2">
                    <span className="truncate">{item[filterKey] || item.name || item.hospital || ''}</span>
                    {item.branchName && (
                      <span className="text-[8px] font-black text-teal-800 dark:text-teal-300 bg-teal-100 dark:bg-teal-950/60 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800 uppercase shrink-0">
                        {item.branchName}
                      </span>
                    )}
                    {item.category && !item.branchName && (
                      <span className="text-[8px] font-black text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800 uppercase shrink-0">
                        {item.category}
                      </span>
                    )}
                  </div>
                  <div className="text-[9px] text-slate-500 dark:text-slate-400 font-medium truncate flex items-center gap-1.5 flex-wrap">
                    {item.parentClientName && item.parentClientName !== item.name && (
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Group: {item.parentClientName} •</span>
                    )}
                    {item.hospital && item.hospital !== item[filterKey] && item.hospital !== item.name && (
                      <span className="font-semibold text-slate-600 dark:text-slate-400">{item.hospital} •</span>
                    )}
                    {item.brand && (
                      <span className="font-semibold text-slate-600 dark:text-slate-400">Brand: {item.brand} •</span>
                    )}
                    {item.model && (
                      <span className="font-mono text-teal-600 dark:text-teal-400 font-bold shrink-0">Model: {item.model} •</span>
                    )}
                    {item.contactPerson && (
                      <span className="text-slate-500 dark:text-slate-400">Contact: {item.contactPerson} •</span>
                    )}
                    {item.phone && (
                      <span className="text-slate-500 dark:text-slate-400">📞 {item.phone} •</span>
                    )}
                    {item.address && <span className="truncate">{item.address}</span>}
                    {item.gstin && <span className="font-mono text-emerald-700 dark:text-emerald-400 font-bold shrink-0">• GST: {item.gstin}</span>}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
