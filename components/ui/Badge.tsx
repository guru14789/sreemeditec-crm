import React from 'react';

type BadgeVariant = 'emerald' | 'gold' | 'purple' | 'danger' | 'brown' | 'ghost';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  dot?: boolean;
  pulse?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  emerald: 'bg-gradient-to-br from-[#04542E] to-[#0A734A] text-emerald-100 border border-emerald-400/20',
  gold: 'bg-gradient-to-br from-[#C8A15A] to-[#D8B470] text-[#2D1B0E] border border-[#E6C98A]/30',
  purple: 'bg-gradient-to-br from-[#5A29D6] to-[#6F38E8] text-purple-100 border border-[#8652FF]/20',
  danger: 'bg-gradient-to-br from-[#B24852] to-[#D05B68] text-red-100 border border-[#D05B68]/30',
  brown: 'bg-gradient-to-br from-[#5B3B24] to-[#6E4B31] text-amber-100 border border-[#826046]/30',
  ghost: 'bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60',
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'emerald',
  className = '',
  dot = false,
  pulse = false,
}) => {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        px-3 py-1 rounded-pill
        text-[8px] font-black uppercase tracking-wider
        ${variantStyles[variant]}
        shadow-[0_4px_12px_rgba(0,0,0,0.08)]
        ${className}
      `}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${pulse ? 'animate-pulse' : ''}`}
          style={{
            backgroundColor: variant === 'gold' || variant === 'ghost' ? 'currentColor' : 'rgba(255,255,255,0.7)',
          }}
        />
      )}
      {children}
    </span>
  );
};
