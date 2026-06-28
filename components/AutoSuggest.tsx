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
          const primary = String(item[filterKey] || '').toLowerCase();
          const secondary = filterKey === 'hospital' ? String(item.name || '').toLowerCase() : '';
          return primary.includes(value.toLowerCase()) || secondary.includes(value.toLowerCase());
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
              className="px-4 py-2 hover:bg-medical-50 cursor-pointer transition-colors border-b border-slate-50 last:border-0"
              onClick={() => {
                onSelect(item);
                setShowSuggestions(false);
              }}
            >
              {renderSuggestion ? renderSuggestion(item) : (
                <div className="text-xs font-bold text-slate-700">{item[filterKey] || item.name || ''}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
