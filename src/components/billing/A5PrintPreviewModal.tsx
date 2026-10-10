import React from 'react';
import { Printer } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Invoice, ShopProfile, PrintSettings } from '../../types';
import { triggerA5Print } from '../../lib/print';
import { A5PrintInvoice } from './A5PrintInvoice';

interface A5PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  shopProfile: ShopProfile;
  printSettings: PrintSettings;
}

export const A5PrintPreviewModal: React.FC<A5PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  invoice,
  shopProfile,
  printSettings
}) => {
  if (!invoice) return null;

  const handlePrint = () => {
    triggerA5Print(invoice, shopProfile, printSettings);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`A5 Invoice Preview - ${invoice.invoiceNumber}`}
      subtitle="Standard Stationery Shop A5 Print Layout (148mm x 210mm)"
      maxWidth="4xl"
    >
      <div className="space-y-4">
        {/* Actions Bar */}
        <div className="flex items-center justify-between p-3 bg-[#F5F9FF] border border-[#D8E1EC] rounded-lg">
          <div className="text-xs text-[#64748B]">
            Document Type: <strong className="text-[#15803D] font-bold uppercase">{invoice.invoiceType === 'gst' ? 'GST Tax Invoice' : 'Retail Bill / Credit Estimate'}</strong> | Format: <strong className="text-[#2563EB]">A5 Portrait</strong>
          </div>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Print / Save as PDF
          </button>
        </div>

        {/* Invoice Preview Box */}
        <div className="bg-[#F1F5F9] p-4 rounded-lg border border-[#D8E1EC] max-h-[65vh] overflow-y-auto flex justify-center">
          <div className="bg-white shadow-md rounded p-2 text-black border border-slate-400">
            <A5PrintInvoice invoice={invoice} shopProfile={shopProfile} />
          </div>
        </div>
      </div>
    </Modal>
  );
};
