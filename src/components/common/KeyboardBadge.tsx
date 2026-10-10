import React from 'react';
import { clsx } from 'clsx';

interface KeyboardBadgeProps {
  shortcut: string;
  label: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'emerald' | 'amber' | 'rose';
  className?: string;
}

export const KeyboardBadge: React.FC<KeyboardBadgeProps> = ({
  shortcut,
  label,
  onClick,
  variant = 'primary',
  className
}) => {
  const variantStyles = {
    primary: 'bg-[#DBEAFE] border-[#BFDBFE] text-[#123B70] hover:bg-[#BFDBFE]',
    secondary: 'bg-white border-[#D8E1EC] text-[#172B4D] hover:bg-[#F5F9FF]',
    emerald: 'bg-[#DCFCE7] border-[#86EFAC] text-[#15803D] hover:bg-[#BBF7D0]',
    amber: 'bg-[#FEF3C7] border-[#FDE68A] text-[#B45309] hover:bg-[#FDE68A]',
    rose: 'bg-[#FEE2E2] border-[#FCA5A5] text-[#B91C1C] hover:bg-[#FECDD3]',
  };

  return (
    <button
      onClick={onClick}
      type="button"
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-semibold transition-all shadow-sm active:scale-95 cursor-pointer',
        variantStyles[variant],
        className
      )}
    >
      <kbd className="px-1.5 py-0.5 rounded bg-[#123B70] text-white border border-[#0D2D56] text-[10px] font-mono font-bold shadow-sm">
        {shortcut}
      </kbd>
      <span>{label}</span>
    </button>
  );
};
