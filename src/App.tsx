import React, { useState, useEffect } from 'react';
import { ShoppingBag, Package, Receipt, Settings, Store, Headphones, LogOut } from 'lucide-react';
import { BillingSection } from './components/billing/BillingSection';
import { ProductsSection } from './components/products/ProductsSection';
import { SalesSection } from './components/sales/SalesSection';
import { SettingsSection } from './components/settings/SettingsSection';
import { ToastContainer, ToastMessage } from './components/common/Toast';
import { SupportModal } from './components/common/SupportModal';
import { LoginPage } from './components/auth/LoginPage';
import { useAuthStore } from './store/useAuthStore';
import { useKeyboardShortcuts } from './utils/keyboard';
import { useProductStore } from './store/useProductStore';
import { useCustomerStore } from './store/useCustomerStore';
import { useSalesStore } from './store/useSalesStore';

export type MainSection = 'billing' | 'products' | 'sales' | 'settings';

function getInitialSection(): MainSection {
  if (typeof window !== 'undefined') {
    const hash = window.location.hash.replace('#', '') as MainSection;
    if (['billing', 'products', 'sales', 'settings'].includes(hash)) {
      return hash;
    }
    const saved = localStorage.getItem('webrajya_active_section') as MainSection;
    if (saved && ['billing', 'products', 'sales', 'settings'].includes(saved)) {
      return saved;
    }
  }
  return 'billing';
}

export function App() {
  const { isAuthenticated, logout, user } = useAuthStore();
  const loadProducts = useProductStore((state) => state.loadProducts);
  const loadCustomers = useCustomerStore((state) => state.loadCustomers);
  const loadInvoices = useSalesStore((state) => state.loadInvoices);

  // Restore current tab on page refresh
  const [activeSection, setActiveSection] = useState<MainSection>(getInitialSection);

  useEffect(() => {
    localStorage.setItem('webrajya_active_section', activeSection);
    window.location.hash = activeSection;
  }, [activeSection]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') as MainSection;
      if (['billing', 'products', 'sales', 'settings'].includes(hash)) {
        setActiveSection(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    loadProducts();
    loadCustomers();
    loadInvoices();

    const handleOnline = () => {
      loadInvoices();
      loadProducts();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [loadProducts, loadCustomers, loadInvoices]);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isAddProductOpenFromApp, setIsAddProductOpenFromApp] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);

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

  // Render Login Page if user is not authenticated
  if (!isAuthenticated) {
    return (
      <>
        <LoginPage onOpenSupport={() => setIsSupportOpen(true)} />
        <SupportModal isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F9FF] text-[#172B4D] flex flex-col font-sans antialiased">
      {/* SECTION 3: Compact Horizontal Top Navigation Bar (#123B70) */}
      <header className="no-print bg-[#123B70] text-white shrink-0 border-b border-[#0D2D56] shadow-xs sticky top-0 z-40 px-4 py-2 flex items-center justify-between">
        {/* Brand Identity */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white p-0.5 shadow-sm shrink-0 flex items-center justify-center overflow-hidden border border-white/20">
            <img src="/logo.png" alt="WebRajya Invoice" className="w-full h-full object-contain" />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-black text-white tracking-wide uppercase leading-none">
              WEBRAJYA <span className="text-[#FF8A00]">INVOICE</span>
            </h1>
            <span className="hidden sm:inline-block text-[11px] text-blue-200/80 font-medium border-l border-white/20 pl-2 leading-none">
              Stationery POS
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

        {/* Right Info: Vibrant Red Support Button & Logout */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSupportOpen(true)}
            className="bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-xs px-3 py-1.5 rounded-lg border border-red-400/50 shadow-md flex items-center gap-1.5 transition-all cursor-pointer hover:shadow-lg active:scale-95"
            title="Support (Aryan Rajput: 9630013483)"
          >
            <Headphones className="w-4 h-4 animate-bounce" />
            <span className="font-extrabold tracking-wide">Support</span>
          </button>

          <button
            onClick={() => logout()}
            className="bg-white/10 hover:bg-white/20 text-white/90 hover:text-white font-bold text-xs px-2.5 py-1.5 rounded-lg border border-white/15 flex items-center gap-1.5 transition-all cursor-pointer"
            title="Logout of POS"
          >
            <LogOut className="w-3.5 h-3.5 text-red-300" />
            <span className="hidden sm:inline">Logout</span>
          </button>
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

      {/* Support Contact Modal */}
      <SupportModal isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} />

      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
