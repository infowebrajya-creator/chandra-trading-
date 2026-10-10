import React from 'react';
import { PackageOpen } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = <PackageOpen className="w-12 h-12 text-[#64748B]" />,
  title,
  description,
  actionLabel,
  onAction
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-xl border border-dashed border-[#D8E1EC] bg-white shadow-sm">
      <div className="p-3 bg-[#F5F9FF] rounded-full mb-3 border border-[#D8E1EC]">
        {icon}
      </div>
      <h3 className="text-sm font-bold text-[#172B4D]">{title}</h3>
      <p className="text-xs text-[#64748B] mt-1 max-w-sm">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
