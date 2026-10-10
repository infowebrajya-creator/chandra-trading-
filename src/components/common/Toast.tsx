import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { clsx } from 'clsx';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  description?: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-[#15803D] shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-[#B91C1C] shrink-0" />,
    info: <Info className="w-5 h-5 text-[#2563EB] shrink-0" />,
  };

  const bgStyles = {
    success: 'bg-white border-[#86EFAC] text-[#172B4D]',
    error: 'bg-white border-[#FCA5A5] text-[#172B4D]',
    info: 'bg-white border-[#BFDBFE] text-[#172B4D]',
  };

  return (
    <div
      className={clsx(
        'pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg border shadow-lg transition-all transform translate-y-0 animate-in fade-in slide-in-from-top-2 duration-200',
        bgStyles[toast.type]
      )}
    >
      {icons[toast.type]}
      <div className="flex-1 min-w-0">
        <h4 className="text-xs font-bold text-[#172B4D]">{toast.title}</h4>
        {toast.description && <p className="text-xs text-[#64748B] mt-0.5 leading-snug">{toast.description}</p>}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-[#64748B] hover:text-[#172B4D] p-0.5 rounded"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
