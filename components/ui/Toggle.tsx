import React, { useState } from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  size?: 'sm' | 'md';
}

export const Toggle: React.FC<ToggleProps> = ({ checked, onChange, disabled, label, size = 'md' }) => {
  const [pressing, setPressing] = useState(false);

  const dimensions = size === 'sm' ? { width: 38, height: 22, thumb: 16, translate: 16 } : { width: 46, height: 26, thumb: 20, translate: 20 };

  return (
    <div className="flex items-center gap-2.5">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onMouseDown={() => setPressing(true)}
        onMouseUp={() => setPressing(false)}
        onMouseLeave={() => setPressing(false)}
        onClick={() => { if (!disabled) onChange(!checked); }}
        className={`
          relative rounded-full outline-none shrink-0
          transition-all duration-300 ease-out cursor-pointer
          ${disabled ? 'opacity-45 pointer-events-none' : ''}
          ${pressing ? 'scale-[0.96]' : ''}
          hover:brightness-110
        `}
        style={{
          width: dimensions.width,
          height: dimensions.height,
          background: checked
            ? 'linear-gradient(135deg, #022c22 0%, #14532d 100%)' // emerald-950 to green-900
            : 'linear-gradient(135deg, #c5a059 0%, #e5c185 100%)', // Monthly Intake card
          boxShadow: checked
            ? '0 8px 22px rgba(6,78,59,0.5), inset 0 1px 1px rgba(255,255,255,0.15)'
            : '0 6px 18px rgba(197,160,89,0.5), inset 0 1px 1px rgba(255,255,255,0.35)',
        }}
      >
        <span
          className={`
            absolute top-[3px] left-[3px] rounded-full
            transition-all duration-300 ease-out
            ${checked ? '' : ''}
            ${pressing ? 'scale-105' : ''}
          `}
          style={{
            width: dimensions.thumb,
            height: dimensions.thumb,
            transform: checked ? `translateX(${dimensions.translate}px)` : 'translateX(0)',
            background: checked
              ? 'linear-gradient(135deg, #065f46 0%, #059669 100%)' // emerald-800 to emerald-600
              : '#451a03', // amber-950 for contrast
            boxShadow: checked
              ? '0 0 18px rgba(16,185,129,0.4), 0 2px 4px rgba(0,0,0,0.2), inset 0 1px 1px rgba(255,255,255,0.4)'
              : '0 2px 4px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.2)',
          }}
        />
      </button>
      {label && (
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </span>
      )}
    </div>
  );
};
