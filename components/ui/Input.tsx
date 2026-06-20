import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  wrapperClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', wrapperClassName = '', ...props }, ref) => {
    return (
      <div className={`space-y-1.5 ${wrapperClassName}`}>
        {label && (
          <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`
              w-full rounded-input transition-all duration-[250ms] ease-out
              bg-white/80 dark:bg-slate-800/80
              border border-slate-200/80 dark:border-slate-700/80
              text-slate-800 dark:text-slate-200
              placeholder:text-slate-400 dark:placeholder:text-slate-500
              ${icon ? 'pl-11' : 'pl-4'} pr-4 py-3.5
              text-[13px] font-medium
              shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]
              focus:outline-none focus:border-[#0F9964]/40 focus:shadow-[0_0_0_3px_rgba(15,153,100,0.12),_inset_0_2px_4px_rgba(0,0,0,0.02)]
              ${error ? 'border-[#D05B68]/50 focus:border-[#D05B68]/50 focus:shadow-[0_0_0_3px_rgba(208,91,104,0.12)]' : ''}
              ${className}
            `}
            {...props}
          />
        </div>
        {error && (
          <p className="text-[10px] font-bold text-[#D05B68] mt-1">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  wrapperClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = '', wrapperClassName = '', ...props }, ref) => {
    return (
      <div className={`space-y-1.5 ${wrapperClassName}`}>
        {label && (
          <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={`
            w-full rounded-input transition-all duration-[250ms] ease-out
            bg-white/80 dark:bg-slate-800/80
            border border-slate-200/80 dark:border-slate-700/80
            text-slate-800 dark:text-slate-200
            placeholder:text-slate-400 dark:placeholder:text-slate-500
            px-4 py-3.5 text-[13px] font-medium
            shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]
            focus:outline-none focus:border-[#0F9964]/40 focus:shadow-[0_0_0_3px_rgba(15,153,100,0.12),_inset_0_2px_4px_rgba(0,0,0,0.02)]
            ${error ? 'border-[#D05B68]/50' : ''}
            resize-none
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="text-[10px] font-bold text-[#D05B68] mt-1">{error}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
