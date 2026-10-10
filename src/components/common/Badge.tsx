import React from 'react';
import { clsx } from 'clsx';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'slate' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'cyan' | 'purple';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'slate',
  size = 'sm',
  className
}) => {
  const variantStyles = {
    slate: 'bg-[#F1F5F9] text-[#64748B] border-[#D8E1EC]',
    emerald: 'bg-[#DCFCE7] text-[#15803D] border-[#86EFAC]',
    amber: 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]',
    rose: 'bg-[#FEE2E2] text-[#B91C1C] border-[#FCA5A5]',
    indigo: 'bg-[#DBEAFE] text-[#123B70] border-[#BFDBFE]',
    cyan: 'bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD]',
    purple: 'bg-[#F3E8FF] text-[#7E22CE] border-[#E9D5FF]',
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs font-mono font-medium',
    md: 'px-2.5 py-1 text-xs font-mono font-bold',
  };

  return (
    <span className={clsx('inline-flex items-center rounded-md border', variantStyles[variant], sizeStyles[size], className)}>
      {children}
    </span>
  );
};
