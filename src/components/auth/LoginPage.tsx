import React, { useState } from 'react';
import { 
  KeyRound, Mail, Eye, EyeOff, LogIn, Globe, Package, 
  Receipt, ShoppingBag, ShieldCheck, Headphones, CheckCircle2, AlertCircle, ArrowRight
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

interface LoginPageProps {
  onOpenSupport?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onOpenSupport }) => {
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    setTimeout(() => {
      const res = login(email, password);
      setIsLoading(false);
      if (!res.success) {
        setErrorMsg(res.message || 'Invalid credentials');
      }
    }, 300);
  };

  const handleFillDefaultAdmin = () => {
    setEmail('admin@gmail.com');
    setPassword('admin123');
    setErrorMsg('');
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-[#F8FAFC] flex flex-col justify-between font-sans relative overflow-hidden select-none">
      {/* Background Decorative Gradients */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#2563EB]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 right-0 w-96 h-96 bg-[#FF8A00]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-[#123B70]/40 rounded-full blur-3xl pointer-events-none" />

      {/* TOP BAR */}
      <header className="px-6 py-4 flex items-center justify-between z-10 border-b border-white/10 backdrop-blur-md bg-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white p-1 shadow-md flex items-center justify-center overflow-hidden border border-white/20">
            <img src="/logo.png" alt="WebRajya Invoice Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="text-sm font-black text-white tracking-wider uppercase leading-none">
              WEBRAJYA <span className="text-[#FF8A00]">INVOICE</span>
            </div>
            <div className="text-[11px] text-blue-200/80 font-medium">Stationery Billing & ERP POS</div>
          </div>
        </div>

        <a
          href="https://webrajya.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/15 shadow-xs"
        >
          <Globe className="w-3.5 h-3.5 text-[#FF8A00]" />
          <span>webrajya.com</span>
        </a>
      </header>

      {/* MAIN LOGIN BOX */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 z-10">
        <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
          
          {/* Logo Header */}
          <div className="text-center mb-6">
            <div className="w-20 h-20 rounded-3xl bg-white p-2.5 mx-auto mb-3 shadow-xl border-2 border-white/30 flex items-center justify-center">
              <img src="/logo.png" alt="WebRajya Logo" className="w-full h-full object-contain" />
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">Sign In to Billing POS</h2>
            <p className="text-xs text-blue-200 mt-1">Enter default administrator credentials to access system</p>
          </div>

          {/* Quick Default Fill Banner */}
          <div className="mb-5 p-3 rounded-2xl bg-[#2563EB]/15 border border-[#2563EB]/40 flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <div className="font-bold text-blue-100 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#FF8A00]" /> Default Admin Login:
              </div>
              <div className="font-mono text-[11px] text-blue-200">
                ID: <span className="text-white font-bold">admin@gmail.com</span> | Pass: <span className="text-white font-bold">admin123</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleFillDefaultAdmin}
              className="px-2.5 py-1 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg font-bold text-[11px] transition-all shrink-0 cursor-pointer shadow-xs active:scale-95"
            >
              Fill Default
            </button>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs font-semibold flex items-start gap-2 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-blue-200 mb-1.5 uppercase tracking-wider">
                Email Address / User ID
              </label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 absolute left-3.5 text-blue-300 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@gmail.com"
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-sm text-white placeholder-blue-300/50 font-mono focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/40 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-blue-200 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative flex items-center">
                <KeyRound className="w-4 h-4 absolute left-3.5 text-blue-300 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="admin123"
                  className="w-full pl-10 pr-11 py-3 bg-white/10 border border-white/20 rounded-xl text-sm text-white placeholder-blue-300/50 font-mono focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/40 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-blue-300 hover:text-white transition-colors cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:from-[#1D4ED8] hover:to-[#1E40AF] text-white rounded-xl font-black text-sm transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer mt-2 active:scale-[0.99] disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" /> Sign In to WebRajya POS
                </>
              )}
            </button>
          </form>

          {/* Direct Support Contact Quick Link */}
          <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-blue-200">
            <span className="flex items-center gap-1 text-slate-300">
              <Headphones className="w-3.5 h-3.5 text-[#DC2626]" /> Need Help?
            </span>
            <span className="font-bold text-white">Aryan Rajput: 9630013483</span>
          </div>
        </div>
      </main>

      {/* PRODUCT CATALOGUE & WEBRAJYA FOOTER */}
      <footer className="z-10 bg-white/5 border-t border-white/10 backdrop-blur-md px-6 py-6 space-y-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* WebRajya Branding & Website */}
          <div className="space-y-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <span className="text-sm font-black text-white tracking-wider">WEBRAJYA SOLUTIONS</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FF8A00] text-black font-black uppercase">Official</span>
            </div>
            <p className="text-xs text-blue-200/80">
              Enterprise Billing & Retail POS Software | Visit <a href="https://webrajya.com" target="_blank" rel="noopener noreferrer" className="text-[#FF8A00] font-bold hover:underline">webrajya.com</a>
            </p>
          </div>

          {/* WebRajya Product Catalogue Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] font-medium text-blue-100">
            <span className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/15 flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5 text-[#FF8A00]" /> Stationery POS
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/15 flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-[#2563EB]" /> GST E-Invoicing
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/15 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-emerald-400" /> Smart Stock Inventory
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/15 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-purple-400" /> Retail ERP Suite
            </span>
          </div>
        </div>

        {/* Bottom Copyright & Contact Bar */}
        <div className="max-w-6xl mx-auto pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-[11px] text-blue-300/70 gap-2">
          <div>
            © {new Date().getFullYear()} <strong className="text-white">WebRajya</strong> (webrajya.com). All rights reserved.
          </div>
          <div className="flex items-center gap-3 font-mono">
            <span>Contact: <strong>infowebrajya@gmail.com</strong></span>
            <span>•</span>
            <span>Support: <strong className="text-white">9630013483 (Aryan Rajput)</strong></span>
          </div>
        </div>
      </footer>
    </div>
  );
};
