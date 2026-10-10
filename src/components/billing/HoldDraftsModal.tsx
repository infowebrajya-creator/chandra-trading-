import React, { useState } from 'react';
import { Clock, Play, Trash2, Save, FileText } from 'lucide-react';
import { Modal } from '../common/Modal';
import { useBillingStore } from '../../store/useBillingStore';
import { formatDate } from '../../utils/formatters';

interface HoldDraftsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onToast: (type: 'success' | 'error' | 'info', title: string, desc?: string) => void;
}

export const HoldDraftsModal: React.FC<HoldDraftsModalProps> = ({
  isOpen,
  onClose,
  onToast
}) => {
  const { drafts, items, saveCurrentAsDraft, loadDraftIntoActiveBill, deleteDraft } = useBillingStore();
  const [draftName, setDraftName] = useState('');

  const handleSaveDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      onToast('error', 'Cannot Save Empty Draft', 'Add items to the bill before holding as draft.');
      return;
    }
    try {
      await saveCurrentAsDraft(draftName);
      setDraftName('');
      onToast('success', 'Bill Saved as Draft [F10]', 'You can recall this bill anytime.');
      onClose();
    } catch (err: any) {
      onToast('error', 'Failed to Save Draft', err.message);
    }
  };

  const handleRecall = async (draftId: string) => {
    await loadDraftIntoActiveBill(draftId);
    onToast('info', 'Draft Recalled', 'Draft bill loaded into active workspace.');
    onClose();
  };

  const handleDelete = async (draftId: string) => {
    await deleteDraft(draftId);
    onToast('info', 'Draft Removed');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Hold & Draft Bills [F10]"
      subtitle="Save active bill on hold or restore previous pending drafts"
      maxWidth="lg"
    >
      <div className="space-y-6">
        {/* Save Current as Draft Box */}
        <form onSubmit={handleSaveDraft} className="p-4 bg-[#F5F9FF] border border-[#D8E1EC] rounded-xl space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#172B4D]">
            <Save className="w-4 h-4 text-[#2563EB]" />
            Hold Active Bill ({items.length} items)
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Optional Draft Note / Customer Name..."
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              className="flex-1 px-3 py-1.5 bg-white border border-[#D8E1EC] rounded-lg text-xs text-[#172B4D] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] font-mono shadow-xs"
            />
            <button
              type="submit"
              disabled={items.length === 0}
              className="px-3.5 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
            >
              Hold Bill
            </button>
          </div>
        </form>

        {/* Saved Drafts List */}
        <div>
          <h4 className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#B45309]" /> Saved Pending Drafts ({drafts.length})
          </h4>

          {drafts.length === 0 ? (
            <div className="py-8 text-center text-[#64748B] text-xs border border-dashed border-[#D8E1EC] rounded-lg bg-white">
              <FileText className="w-6 h-6 mx-auto mb-1.5 text-[#94A3B8]" />
              No pending hold drafts found.
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {drafts.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between p-3 bg-white border border-[#D8E1EC] rounded-lg hover:bg-[#F5F9FF] transition-colors"
                >
                  <div>
                    <div className="text-xs font-bold text-[#172B4D]">{d.draftName}</div>
                    <div className="text-[11px] text-[#64748B] mt-0.5 flex items-center gap-2 font-mono">
                      <span>{d.items.length} items</span>
                      <span>•</span>
                      <span>{formatDate(d.updatedAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRecall(d.id)}
                      className="px-2.5 py-1 bg-[#15803D] hover:bg-[#166534] text-white rounded text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Play className="w-3 h-3 fill-current" /> Load
                    </button>
                    <button
                      onClick={() => handleDelete(d.id)}
                      className="p-1 text-[#64748B] hover:text-[#B91C1C] hover:bg-[#FEE2E2] rounded transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
