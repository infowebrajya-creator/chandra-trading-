import React, { useState, useEffect } from 'react';
import { ShoppingBag, Package, Receipt, Settings, Store } from 'lucide-react';
import { BillingSection } from './components/billing/BillingSection';
import { ProductsSection } from './components/products/ProductsSection';
import { SalesSection } from './components/sales/SalesSection';
import { SettingsSection } from './components/settings/SettingsSection';
import { ToastContainer, ToastMessage } from './components/common/Toast';
import { useKeyboardShortcuts } from './utils/keyboard';
import { useProductStore } from './store/useProductStore';
import { useCustomerStore } from './store/useCustomerStore';

export type MainSection = 'billing' | 'products' | 'sales' | 'settings';

export function App() {
  const loadProducts = useProductStore((state) => state.loadProducts);
  const loadCustomers = useCustomerStore((state) => state.loadCustomers);

  useEffect(() => {
    loadProducts();
    loadCustomers();
  }, [loadProducts, loadCustomers]);
  // REQUIREMENT: Default screen is Billing POS
  const [activeSection, setActiveSection] = useState<MainSection>('billing');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isAddProductOpenFromApp, setIsAddProductOpenFromApp] = useState(false);

  const addToast = (type: 'success' | 'error' | 'info', title: string, description?: string) => {
    const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, type, title, description }]);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Global Keyboard Navigation Shortcuts
  useKeyboardShortcuts({
    onF2_NewBill: () => {
      setActiveSection('billing');
    },
    onF4_SearchProduct: () => {
      setActiveSection('billing');
    },
    onF8_QuickPay: () => {
      if (activeSection !== 'billing') setActiveSection('billing');
    },
    onF9_SaveAndPrint: () => {
      if (activeSection !== 'billing') setActiveSection('billing');
    },
    onF10_HoldDraft: () => {
      if (activeSection !== 'billing') setActiveSection('billing');
    }
  });

  const navItems: { id: MainSection; label: string; icon: React.ReactNode; shortcut: string }[] = [
    { id: 'billing', label: 'Billing POS', icon: <ShoppingBag className="w-4 h-4 text-white" />, shortcut: 'F2' },
    { id: 'products', label: 'Products', icon: <Package className="w-4 h-4 text-white" />, shortcut: '' },
    { id: 'sales', label: 'Sales History', icon: <Receipt className="w-4 h-4 text-white" />, shortcut: '' },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4 text-white" />, shortcut: '' },
  ];

  return (
    <div className="min-h-screen bg-[#F5F9FF] text-[#172B4D] flex flex-col font-sans antialiased">
      {/* SECTION 3: Compact Horizontal Top Navigation Bar (#123B70) */}
      <header className="no-print bg-[#123B70] text-white shrink-0 border-b border-[#0D2D56] shadow-xs sticky top-0 z-40 px-4 py-2 flex items-center justify-between">
        {/* Brand Identity */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center text-white shadow-xs shrink-0">
            <Store className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-black text-white tracking-wide uppercase leading-none">
              WEBRAJYA POS
            </h1>
            <span className="hidden sm:inline-block text-[11px] text-blue-200/80 font-medium border-l border-white/20 pl-2 leading-none">
              Stationery Store Billing
            </span>
          </div>
        </div>

        {/* Horizontal Navigation Tabs (Desktop only) */}
        <nav className="hidden md:flex items-center gap-1.5">
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#2563EB] text-white shadow-xs font-bold'
                    : 'text-white/85 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                {item.shortcut && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/20 text-white font-mono font-bold">
                    {item.shortcut}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Mobile current section indicator */}
        <div className="md:hidden flex items-center gap-1.5 px-2.5 py-1 bg-[#2563EB]/40 rounded-lg text-xs font-bold text-white border border-white/20">
          <span>{navItems.find(i => i.id === activeSection)?.label}</span>
        </div>

        {/* Right Info: Compact Marg ERP Mode Badge */}
        <div className="hidden lg:flex items-center gap-2 bg-white/10 border border-white/15 px-3 py-1 rounded-lg text-xs font-mono text-blue-100">
          <span className="font-bold text-white flex items-center gap-1.5">
            Marg ERP Mode
            <span className="px-1.5 py-0.2 text-[9px] bg-[#2563EB] text-white rounded font-black">FAST</span>
          </span>
          <span className="text-white/30">•</span>
          <span className="text-[10px] text-blue-200">F2: New | F4: Search | F8: Settle</span>
        </div>
      </header>

      {/* Main Workspace Area (#F5F9FF background) */}
      <main className="no-print flex-1 p-2 pb-24 md:p-3 md:pb-3 w-full mx-auto overflow-x-hidden">
        {activeSection === 'billing' && (
          <BillingSection 
            onToast={addToast} 
            onOpenAddProductModal={() => {
              setActiveSection('products');
              setIsAddProductOpenFromApp(true);
            }} 
          />
        )}
        {activeSection === 'products' && (
          <ProductsSection 
            onToast={addToast} 
            isAddModalOpenFromExternal={isAddProductOpenFromApp}
            onCloseExternalModal={() => setIsAddProductOpenFromApp(false)}
          />
        )}
        {activeSection === 'sales' && <SalesSection onToast={addToast} />}
        {activeSection === 'settings' && <SettingsSection onToast={addToast} />}
      </main>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#123B70] text-white border-t border-[#0D2D56] flex items-center justify-around py-1.5 px-2 shadow-2xl safe-area-pb">
        {navItems.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer flex-1 ${
                isActive
                  ? 'bg-[#2563EB] text-white shadow-xs font-black'
                  : 'text-blue-200/75 hover:text-white'
              }`}
            >
              <div className="w-5 h-5 flex items-center justify-center">
                {item.icon}
              </div>
              <span className="mt-0.5 leading-none">{item.label.replace(' POS', '')}</span>
            </button>
          );
        })}
      </nav>

      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
