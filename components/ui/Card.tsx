import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'emerald' | 'gold' | 'purple' | 'brown' | 'white' | 'glass';
  padding?: 'sm' | 'md' | 'lg';
  hover?: boolean;
  onClick?: () => void;
}

const variantStyles = {
  emerald: 'bg-gradient-to-br from-[#013D24] via-[#04542E] to-[#0A734A]',
  gold: 'bg-gradient-to-br from-[#C8A15A] via-[#D8B470] to-[#E6C98A]',
  purple: 'bg-gradient-to-br from-[#5A29D6] via-[#6F38E8] to-[#8652FF]',
  brown: 'bg-gradient-to-br from-[#5B3B24] via-[#6E4B31] to-[#826046]',
  white: 'bg-gradient-to-br from-white to-[#F8F7F4] dark:from-slate-900 dark:to-slate-800',
  glass: 'bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl',
};

const paddingStyles = {
  sm: 'p-5',
  md: 'p-7',
  lg: 'p-8',
};

const shadowStyles: Record<string, string> = {
  emerald: 'shadow-[0_20px_40px_-10px_rgba(1,61,36,0.45)]',
  gold: 'shadow-[0_20px_40px_-10px_rgba(200,161,90,0.40)]',
  purple: 'shadow-[0_20px_40px_-10px_rgba(90,41,214,0.35)]',
  brown: 'shadow-[0_20px_40px_-10px_rgba(91,59,36,0.35)]',
  white: 'shadow-[0_12px_30px_rgba(0,0,0,0.08)]',
  glass: 'shadow-[0_12px_30px_rgba(0,0,0,0.06)]',
};

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  variant = 'white',
  padding = 'md',
  hover = false,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`
        rounded-card transition-all duration-[250ms] ease-out
        ${variantStyles[variant]}
        ${paddingStyles[padding]}
        ${shadowStyles[variant]}
        ${hover ? 'hover:-translate-y-0.5 hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.18)] cursor-pointer' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        border border-white/10
        ${className}
      `}
      style={{
        boxShadow: variant === 'white' || variant === 'glass'
          ? '0 12px 30px rgba(0,0,0,0.08), inset 0 1px 1px rgba(255,255,255,0.6)'
          : undefined,
      }}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}> = ({ children, className = '', action }) => (
  <div className={`flex items-center justify-between mb-5 ${className}`}>
    <div className="font-black text-[10px] uppercase tracking-widest text-slate-800 dark:text-slate-100">
      {children}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

export const CardBody: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <div className={className}>{children}</div>
);
