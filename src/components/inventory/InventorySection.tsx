import React, { useState, useEffect } from 'react';
import { 
  Boxes, AlertTriangle, TrendingUp, DollarSign, 
  RefreshCw, PackageCheck 
} from 'lucide-react';
import { useProductStore } from '../../store/useProductStore';
import { db } from '../../lib/db';
import { StockMovement } from '../../types';
import { Badge } from '../common/Badge';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface InventorySectionProps {
  onToast: (type: 'success' | 'error' | 'info', title: string, desc?: string) => void;
}

export const InventorySection: React.FC<InventorySectionProps> = ({ onToast }) => {
  const { products, loadProducts } = useProductStore();
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');
  const [movements, setMovements] = useState<StockMovement[]>([]);

  useEffect(() => {
    loadProducts();
    loadMovements();
  }, []);

  const loadMovements = async () => {
    const logs = await db.stockMovements.orderBy('createdAt').reverse().limit(50).toArray();
    setMovements(logs);
  };

  const lowStockItems = products.filter(p => p.stockQty > 0 && p.stockQty <= p.minStockLevel);
  const outOfStockItems = products.filter(p => p.stockQty <= 0);

  const totalCostValuation = products.reduce((acc, p) => acc + (p.purchaseRate * p.stockQty), 0);
  const totalMrpValuation = products.reduce((acc, p) => acc + (p.mrp * p.stockQty), 0);

  const filteredProducts = products.filter(p => {
    if (stockFilter === 'low') return p.stockQty > 0 && p.stockQty <= p.minStockLevel;
    if (stockFilter === 'out') return p.stockQty <= 0;
    return true;
  });

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] gap-3 font-sans text-[#172B4D]">
      {/* Metrics Row */}
      <div className="grid grid-cols-4 gap-3 shrink-0">
        <div className="p-4 bg-white border border-[#D8E1EC] rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Total Unique Items</span>
            <div className="p-2 bg-[#DBEAFE] text-[#2563EB] rounded-lg">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#172B4D] font-mono mt-2">{products.length} SKUs</div>
          <p className="text-[11px] text-[#64748B] mt-0.5">Active stationery catalog</p>
        </div>

        <div className="p-4 bg-white border border-[#D8E1EC] rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Low Stock Alert</span>
            <div className="p-2 bg-[#FEF3C7] text-[#B45309] rounded-lg">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#B45309] font-mono mt-2">{lowStockItems.length} Items</div>
          <p className="text-[11px] text-[#64748B] mt-0.5">Below reorder minimum</p>
        </div>

        <div className="p-4 bg-white border border-[#D8E1EC] rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Out of Stock</span>
            <div className="p-2 bg-[#FEE2E2] text-[#B91C1C] rounded-lg">
              <PackageCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#B91C1C] font-mono mt-2">{outOfStockItems.length} Items</div>
          <p className="text-[11px] text-[#64748B] mt-0.5">Requires replenishment</p>
        </div>

        <div className="p-4 bg-white border border-[#D8E1EC] rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Inventory Cost Value</span>
            <div className="p-2 bg-[#DCFCE7] text-[#15803D] rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#15803D] font-mono mt-2">{formatCurrency(totalCostValuation)}</div>
          <p className="text-[11px] text-[#64748B] mt-0.5 font-mono">MRP Value: {formatCurrency(totalMrpValuation)}</p>
        </div>
      </div>

      {/* Main Content Split: Stock List & Movement Log */}
      <div className="grid grid-cols-12 gap-3 flex-1 min-h-0">
        {/* Stock Status Table */}
        <div className="col-span-7 bg-white border border-[#D8E1EC] rounded-xl overflow-hidden flex flex-col shadow-sm">
          <div className="p-3 bg-[#F5F9FF] border-b border-[#D8E1EC] flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-[#172B4D] uppercase tracking-wider">Stationery Stock Balances</h3>
            <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-[#D8E1EC] text-[11px]">
              <button
                onClick={() => setStockFilter('all')}
                className={`px-2.5 py-1 rounded transition-colors font-bold cursor-pointer ${stockFilter === 'all' ? 'bg-[#2563EB] text-white' : 'text-[#64748B] hover:text-[#172B4D]'}`}
              >
                All ({products.length})
              </button>
              <button
                onClick={() => setStockFilter('low')}
                className={`px-2.5 py-1 rounded transition-colors font-bold cursor-pointer ${stockFilter === 'low' ? 'bg-[#B45309] text-white' : 'text-[#64748B] hover:text-[#172B4D]'}`}
              >
                Low Stock ({lowStockItems.length})
              </button>
              <button
                onClick={() => setStockFilter('out')}
                className={`px-2.5 py-1 rounded transition-colors font-bold cursor-pointer ${stockFilter === 'out' ? 'bg-[#B91C1C] text-white' : 'text-[#64748B] hover:text-[#172B4D]'}`}
              >
                Out of Stock ({outOfStockItems.length})
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#F1F5F9] text-[#172B4D] uppercase font-bold sticky top-0 border-b border-[#D8E1EC] text-[11px]">
                <tr>
                  <th className="p-2.5">Item Name</th>
                  <th className="p-2.5">Category</th>
                  <th className="p-2.5 text-right">Current Stock</th>
                  <th className="p-2.5 text-right">Min Level</th>
                  <th className="p-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredProducts.map((p) => {
                  const isOut = p.stockQty <= 0;
                  const isLow = p.stockQty > 0 && p.stockQty <= p.minStockLevel;
                  return (
                    <tr key={p.id} className="hover:bg-[#F0F6FF] transition-colors">
                      <td className="p-2.5 font-semibold text-[#172B4D]">{p.name}</td>
                      <td className="p-2.5 text-[#64748B] text-[11px]">{p.category}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-[#172B4D]">{p.stockQty} {p.unit}</td>
                      <td className="p-2.5 text-right font-mono text-[#64748B]">{p.minStockLevel} {p.unit}</td>
                      <td className="p-2.5 text-center font-mono">
                        {isOut ? (
                          <Badge variant="rose">OUT OF STOCK</Badge>
                        ) : isLow ? (
                          <Badge variant="amber">LOW STOCK</Badge>
                        ) : (
                          <Badge variant="emerald">HEALTHY</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stock Movement History Log */}
        <div className="col-span-5 bg-white border border-[#D8E1EC] rounded-xl overflow-hidden flex flex-col shadow-sm">
          <div className="p-3 bg-[#F5F9FF] border-b border-[#D8E1EC] flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-[#172B4D] uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-[#15803D]" /> Recent Stock Movements Log
            </h3>
            <button
              onClick={loadMovements}
              className="text-[#64748B] hover:text-[#172B4D] p-1 rounded hover:bg-white border border-transparent hover:border-[#D8E1EC] cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs">
            {movements.length === 0 ? (
              <div className="py-12 text-center text-[#64748B] text-xs">
                No stock movement logs recorded yet.
              </div>
            ) : (
              movements.map((m) => (
                <div key={m.id} className="p-2.5 bg-[#F5F9FF] border border-[#D8E1EC] rounded-lg space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#172B4D] truncate">{m.productName}</span>
                    <span className={`font-mono font-bold ${m.quantityChange > 0 ? 'text-[#15803D]' : 'text-[#B91C1C]'}`}>
                      {m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-[#64748B]">
                    <span>Reason: {m.reason}</span>
                    <span className="font-mono">{formatDate(m.createdAt)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
