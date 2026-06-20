import React, { forwardRef } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'warning' | 'purple' | 'ghost' | 'gold';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, { bg: string; shadow: string; hover: string; text: string }> = {
  primary: {
    bg: 'bg-gradient-to-br from-[#04542E] via-[#0A734A] to-[#0F9964]',
    shadow: 'shadow-[0_8px_20px_rgba(4,84,46,0.35)]',
    hover: 'hover:shadow-[0_12px_28px_rgba(4,84,46,0.50)] hover:brightness-110',
    text: 'text-white',
  },
  secondary: {
    bg: 'bg-gradient-to-br from-white/90 to-white/70 dark:from-slate-800/90 dark:to-slate-800/70',
    shadow: 'shadow-[0_8px_20px_rgba(0,0,0,0.06)]',
    hover: 'hover:shadow-[0_12px_28px_rgba(0,0,0,0.10)] hover:brightness-105',
    text: 'text-slate-800 dark:text-slate-200',
  },
  danger: {
    bg: 'bg-gradient-to-br from-[#B24852] to-[#D05B68]',
    shadow: 'shadow-[0_8px_20px_rgba(178,72,82,0.30)]',
    hover: 'hover:shadow-[0_12px_28px_rgba(178,72,82,0.45)] hover:brightness-110',
    text: 'text-white',
  },
  warning: {
    bg: 'bg-gradient-to-br from-[#C8A15A] to-[#D8B470]',
    shadow: 'shadow-[0_8px_20px_rgba(200,161,90,0.30)]',
    hover: 'hover:shadow-[0_12px_28px_rgba(200,161,90,0.45)] hover:brightness-110',
    text: 'text-[#5B3B24]',
  },
  purple: {
    bg: 'bg-gradient-to-br from-[#5A29D6] via-[#6F38E8] to-[#8652FF]',
    shadow: 'shadow-[0_8px_20px_rgba(90,41,214,0.30)]',
    hover: 'hover:shadow-[0_12px_28px_rgba(90,41,214,0.45)] hover:brightness-110',
    text: 'text-white',
  },
  ghost: {
    bg: 'bg-transparent',
    shadow: '',
    hover: 'hover:bg-black/5 dark:hover:bg-white/10 hover:brightness-100',
    text: 'text-slate-600 dark:text-slate-400',
  },
  gold: {
    bg: 'bg-gradient-to-br from-[#C8A15A] via-[#D8B470] to-[#E6C98A]',
    shadow: 'shadow-[0_8px_20px_rgba(200,161,90,0.35)]',
    hover: 'hover:shadow-[0_12px_28px_rgba(200,161,90,0.50)] hover:brightness-110',
    text: 'text-[#2D1B0E]',
  },
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-[10px] gap-1.5',
  md: 'px-6 py-3 text-[11px] gap-2',
  lg: 'px-8 py-4 text-[12px] gap-2.5',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, icon, disabled, children, className = '', ...props }, ref) => {
    const v = variantStyles[variant];
    const s = sizeStyles[size];

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`
          inline-flex items-center justify-center font-black uppercase tracking-widest
          rounded-button transition-all duration-[250ms] ease-out
          ${v.bg} ${v.shadow} ${v.hover} ${v.text}
          ${s}
          ${disabled ? 'opacity-40 pointer-events-none' : 'cursor-pointer active:scale-[0.97]'}
          ${loading ? 'pointer-events-none' : ''}
          ${variant === 'ghost' ? 'shadow-none' : ''}
          ${className}
        `}
        {...props}
      >
        {loading ? (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : icon ? (
          <span className="shrink-0">{icon}</span>
        ) : null}
        {children && <span>{children}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
