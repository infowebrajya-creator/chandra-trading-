import React from 'react';
import { Power, Edit } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import type { Product } from '../../types';

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onEdit: (product: Product) => void;
  onToggleActive: (id: string) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  isOpen,
  onClose,
  product,
  onEdit,
  onToggleActive
}) => {
  if (!product) return null;

  const marginAmount = Math.max(0, product.saleRate - product.purchaseRate);
  const marginPct = product.saleRate > 0 ? ((marginAmount / product.saleRate) * 100).toFixed(1) : '0';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={product.name}
      subtitle={`SKU: ${product.sku} | Barcode: ${product.barcode || 'N/A'}`}
      maxWidth="lg"
    >
      <div className="space-y-6 font-sans text-[#172B4D]">
        {/* Header Badges */}
        <div className="flex items-center justify-between p-3 bg-[#F5F9FF] border border-[#D8E1EC] rounded-xl">
          <div className="flex items-center gap-2">
            <Badge variant={product.isActive ? 'emerald' : 'rose'}>
              {product.isActive ? 'ACTIVE' : 'INACTIVE'}
            </Badge>
            <Badge variant="cyan">{product.category}</Badge>
            <Badge variant="slate">{product.unit}</Badge>
          </div>

          <button
            onClick={() => onToggleActive(product.id)}
            className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
              product.isActive ? 'bg-[#FEE2E2] text-[#B91C1C] hover:bg-[#FECDD3] border border-[#FCA5A5]' : 'bg-[#DCFCE7] text-[#15803D] hover:bg-[#BBF7D0] border border-[#86EFAC]'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            {product.isActive ? 'Deactivate' : 'Activate'}
          </button>
        </div>

        {/* Financial & Pricing Summary Grid */}
        <div className="grid grid-cols-3 gap-3 font-mono">
          <div className="p-3.5 bg-white border border-[#D8E1EC] rounded-xl text-center shadow-xs">
            <span className="text-[10px] text-[#64748B] uppercase font-sans font-bold">MRP</span>
            <div className="text-lg font-bold text-[#64748B] line-through mt-0.5">₹{product.mrp.toFixed(2)}</div>
          </div>

          <div className="p-3.5 bg-white border border-[#D8E1EC] rounded-xl text-center shadow-xs">
            <span className="text-[10px] text-[#64748B] uppercase font-sans font-bold">Purchase Cost</span>
            <div className="text-lg font-bold text-[#172B4D] mt-0.5">₹{product.purchaseRate.toFixed(2)}</div>
          </div>

          <div className="p-3.5 bg-[#DBEAFE] border border-[#BFDBFE] rounded-xl text-center shadow-xs">
            <span className="text-[10px] text-[#123B70] uppercase font-sans font-bold">Selling Rate</span>
            <div className="text-xl font-extrabold text-[#123B70] mt-0.5">₹{product.saleRate.toFixed(2)}</div>
            <div className="text-[10px] text-[#15803D] font-bold mt-1">Margin: +₹{marginAmount.toFixed(2)} ({marginPct}%)</div>
          </div>
        </div>

        {/* Detailed Attributes */}
        <div className="grid grid-cols-2 gap-3 bg-[#F5F9FF] border border-[#D8E1EC] p-4 rounded-xl text-xs">
          <div>
            <span className="text-[#64748B] font-medium">SKU / Item Code:</span>
            <div className="font-bold text-[#2563EB] font-mono">{product.sku}</div>
          </div>

          <div>
            <span className="text-[#64748B] font-medium">Barcode:</span>
            <div className="font-bold text-[#172B4D] font-mono">{product.barcode || 'N/A'}</div>
          </div>

          <div>
            <span className="text-[#64748B] font-medium">HSN Code:</span>
            <div className="font-bold text-[#172B4D] font-mono">{product.hsnCode || 'N/A'}</div>
          </div>

          <div>
            <span className="text-[#64748B] font-medium">GST Tax Slab:</span>
            <div className="font-bold text-[#2563EB] font-mono">{product.gstRate}% GST ({product.taxType.toUpperCase()})</div>
          </div>

          <div>
            <span className="text-[#64748B] font-medium">Pack Information:</span>
            <div className="font-bold text-[#172B4D]">{product.packInfo}</div>
          </div>

          <div>
            <span className="text-[#64748B] font-medium">Stock Quantity:</span>
            <div className={`font-bold font-mono ${product.stockQty <= product.minStockLevel ? 'text-[#B91C1C]' : 'text-[#15803D]'}`}>
              {product.stockQty} {product.unit} (Min Threshold: {product.minStockLevel})
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="flex justify-end gap-2 pt-2 border-t border-[#D8E1EC]">
          <button
            onClick={() => { onClose(); onEdit(product); }}
            className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Edit className="w-4 h-4" /> Edit Product Details
          </button>
        </div>
      </div>
    </Modal>
  );
};
