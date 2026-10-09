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
          return primary.includes(valLower) || name.includes(valLower) || hospital.includes(valLower) || branch.includes(valLower) || parent.includes(valLower) || gstin.includes(valLower);
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
        <div className="absolute z-[100] w-full mt-1 bg-white border border-slate-200 rounded-[2rem] shadow-xl max-h-48 md:max-h-60 overflow-y-auto py-2 animate-in fade-in slide-in-from-top-1 duration-200 custom-scrollbar">
          {filtered.map((item, index) => (
            <div
              key={index}
              className="px-4 py-2 hover:bg-emerald-50 cursor-pointer transition-colors border-b border-slate-100 last:border-0"
              onClick={() => {
                onSelect(item);
                setShowSuggestions(false);
              }}
            >
              {renderSuggestion ? renderSuggestion(item) : (
                <div className="flex flex-col gap-0.5">
                  <div className="text-xs font-bold text-slate-800 flex items-center justify-between gap-2">
                    <span>{item[filterKey] || item.name || ''}</span>
                    {item.branchName && (
                      <span className="text-[8px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 uppercase shrink-0">
                        {item.branchName}
                      </span>
                    )}
                  </div>
                  {(item.parentClientName || item.hospital || item.address || item.gstin) && (
                    <div className="text-[9px] text-slate-500 font-medium truncate flex items-center gap-1.5">
                      {item.parentClientName && item.parentClientName !== item.name && (
                        <span className="font-semibold text-slate-700">Group: {item.parentClientName} •</span>
                      )}
                      {item.address && <span className="truncate">{item.address}</span>}
                      {item.gstin && <span className="font-mono text-emerald-700 font-bold shrink-0">• GST: {item.gstin}</span>}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
