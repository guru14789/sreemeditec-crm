import React, { useState } from 'react';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ checked, onChange, disabled }) => {
  const [pressing, setPressing] = useState(false);

  return (
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
        relative w-[46px] h-[26px] rounded-full outline-none shrink-0
        transition-all duration-300 ease-in-out cursor-pointer
        ${disabled ? 'opacity-45 pointer-events-none' : ''}
        ${pressing ? 'scale-[0.96]' : ''}
        hover:brightness-110
      `}
      style={{
        background: checked
          ? 'linear-gradient(135deg, #022c22 0%, #14532d 100%)' // emerald-950 to green-900
          : 'linear-gradient(135deg, #c5a059 0%, #e5c185 100%)', // Monthly Intake card
        boxShadow: checked
          ? `0 10px 28px rgba(6,78,59,0.5), inset 0 1px 1px rgba(255,255,255,0.15)`
          : `0 8px 24px rgba(197,160,89,0.5), inset 0 1px 1px rgba(255,255,255,0.35)`,
      }}
    >
      <span
        className={`
          absolute top-[3px] left-[3px] w-5 h-5 rounded-full
          transition-all duration-300 ease-in-out
          ${checked ? 'translate-x-5' : 'translate-x-0'}
          ${pressing ? 'scale-105' : ''}
        `}
        style={{
          background: checked 
            ? 'linear-gradient(135deg, #065f46 0%, #059669 100%)' // emerald-800 to emerald-600
            : '#451a03', // amber-950 for contrast
          boxShadow: checked
            ? `0 0 18px rgba(16,185,129,0.4), 0 2px 4px rgba(0,0,0,0.2), inset 0 1px 1px rgba(255,255,255,0.4)`
            : `0 2px 4px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.2)`,
        }}
      />
    </button>
  );
};
