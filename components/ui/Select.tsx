import React, { forwardRef } from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  wrapperClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className = '', wrapperClassName = '', ...props }, ref) => {
    return (
      <div className={`space-y-1.5 ${wrapperClassName}`}>
        {label && (
          <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={`
              w-full rounded-input transition-all duration-[250ms] ease-out bg-white/80 dark:bg-slate-800/80
              border border-slate-200/80 dark:border-slate-700/80
              text-slate-800 dark:text-slate-200
              px-4 pr-10 py-3.5 text-[13px] font-medium
              shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]
              focus:outline-none focus:border-[#0F9964]/40 focus:shadow-[0_0_0_3px_rgba(15,153,100,0.12),_inset_0_2px_4px_rgba(0,0,0,0.02)]
              ${error ? 'border-[#D05B68]/50' : ''}
              ${!props.value ? 'text-slate-400' : ''}
              ${className}
            `}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>{placeholder}</option>
            )}
            {options.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
              <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
        {error && (
          <p className="text-[10px] font-bold text-[#D05B68] mt-1">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
