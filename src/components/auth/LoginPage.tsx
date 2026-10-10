import React, { useState } from 'react';
import { 
  KeyRound, Mail, Eye, EyeOff, LogIn, Globe, Package, 
  Receipt, ShoppingBag, ShieldCheck, Headphones, AlertCircle, Sparkles, CheckCircle2
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

interface LoginPageProps {
  onOpenSupport?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onOpenSupport }) => {
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
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
    <div className="min-h-screen bg-gradient-to-br from-[#4C1D95] via-[#5B21B6] to-[#3B0764] p-3 sm:p-6 lg:p-8 flex flex-col justify-between font-sans relative overflow-hidden select-none">
      
      {/* Background Ambient Glow Orbs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-[#8B5CF6]/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#EC4899]/20 rounded-full blur-3xl pointer-events-none" />

      {/* TOP HEADER BAR */}
      <header className="w-full max-w-6xl mx-auto px-4 py-2 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white p-1 shadow-md flex items-center justify-center overflow-hidden border border-white/20">
            <img src="/logo.png" alt="WebRajya Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="text-sm font-black text-white tracking-wider uppercase leading-none">
              WEBRAJYA <span className="text-[#F59E0B]">INVOICE</span>
            </div>
            <div className="text-[11px] text-purple-200 font-medium">Stationery Billing & POS ERP</div>
          </div>
        </div>

        <a
          href="https://webrajya.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/20 shadow-xs"
        >
          <Globe className="w-3.5 h-3.5 text-[#F59E0B]" />
          <span>webrajya.com</span>
        </a>
      </header>

      {/* MAIN 2-COLUMN SPLIT LOGIN CARD CONTAINER (Dribbble Design) */}
      <main className="flex-1 flex items-center justify-center p-2 sm:p-4 z-10 my-4">
        <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[580px] border border-white/30">
          
          {/* LEFT COLUMN: ISOMETRIC POS & BILLING ILLUSTRATION */}
          <div className="md:w-1/2 bg-gradient-to-br from-[#F3F0FF] via-[#EDE9FE] to-[#DDD6FE] p-6 sm:p-10 flex flex-col items-center justify-center relative overflow-hidden border-b md:border-b-0 md:border-r border-[#E0D7FE]">
            
            {/* Background floating gradient elements */}
            <div className="absolute -top-12 -left-12 w-48 h-48 bg-[#A78BFA]/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-[#C4B5FD]/30 rounded-full blur-2xl pointer-events-none" />

            {/* Platform Tagline */}
            <div className="mb-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 border border-[#C4B5FD] text-[#5B21B6] text-[11px] font-mono font-bold uppercase tracking-wider shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-[#7C3AED]" />
              <span>Unified POS & ERP Ecosystem</span>
            </div>

            {/* Illustration */}
            <div className="relative z-10 w-full max-w-md flex justify-center py-2">
              <img 
                src="/login-illustration.png" 
                alt="WebRajya POS Billing Illustration" 
                className="w-full max-h-[380px] object-contain drop-shadow-xl hover:scale-105 transition-transform duration-500"
              />
            </div>

            {/* Caption */}
            <div className="text-center mt-3 z-10">
              <h3 className="text-lg font-black text-[#2E1065] tracking-tight">Connected Retail Software</h3>
              <p className="text-xs text-[#5B21B6] font-medium max-w-xs mx-auto mt-0.5">
                Fast billing, offline resilience, and automated inventory management.
              </p>
            </div>
          </div>

          {/* RIGHT COLUMN: LOGIN FORM (Dribbble Layout) */}
          <div className="md:w-1/2 bg-white p-6 sm:p-10 md:p-12 flex flex-col justify-between">
            <div>
              {/* Header Title */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 p-1 flex items-center justify-center">
                    <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-[#6D28D9] uppercase tracking-wider block">WebRajya POS</span>
                    <span className="text-xs font-semibold text-slate-500">Sign in to your account</span>
                  </div>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-[#1E1B4B] tracking-tight">
                  Hello,<br />Welcome back
                </h2>
              </div>

              {/* Quick Default Fill Banner */}
              <div className="mb-5 p-3 rounded-2xl bg-[#F5F3FF] border border-[#DDD6FE] flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="font-bold text-[#4C1D95] flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#7C3AED]" /> Default Admin Credentials:
                  </div>
                  <div className="font-mono text-[11px] text-[#5B21B6]">
                    ID: <span className="text-[#1E1B4B] font-bold">admin@gmail.com</span> | Pass: <span className="text-[#1E1B4B] font-bold">admin123</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleFillDefaultAdmin}
                  className="px-2.5 py-1.5 bg-[#6D28D9] hover:bg-[#5B21B6] text-white rounded-lg font-bold text-[11px] transition-all shrink-0 cursor-pointer shadow-xs active:scale-95"
                >
                  Fill Default
                </button>
              </div>

              {/* Error Alert */}
              {errorMsg && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-start gap-2 animate-in fade-in duration-200">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                    Username or email
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="w-4 h-4 absolute left-3.5 text-purple-400 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@gmail.com"
                      className="w-full pl-10 pr-4 py-3 bg-[#F8F6FF] border border-[#E0D7FE] rounded-xl text-sm text-[#1E1B4B] placeholder-purple-300 font-mono focus:outline-none focus:border-[#6D28D9] focus:bg-white focus:ring-2 focus:ring-[#6D28D9]/20 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                    Password
                  </label>
                  <div className="relative flex items-center">
                    <KeyRound className="w-4 h-4 absolute left-3.5 text-purple-400 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="admin123"
                      className="w-full pl-10 pr-11 py-3 bg-[#F8F6FF] border border-[#E0D7FE] rounded-xl text-sm text-[#1E1B4B] placeholder-purple-300 font-mono focus:outline-none focus:border-[#6D28D9] focus:bg-white focus:ring-2 focus:ring-[#6D28D9]/20 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 text-purple-400 hover:text-[#6D28D9] transition-colors cursor-pointer"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember me & Forgot password */}
                <div className="flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-600 font-medium">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded text-[#6D28D9] focus:ring-[#6D28D9] border-gray-300"
                    />
                    <span>Remember me</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleFillDefaultAdmin}
                    className="text-[#6D28D9] font-bold hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 bg-[#5B46F6] hover:bg-[#4C35E6] text-white rounded-xl font-bold text-sm transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 cursor-pointer mt-2 active:scale-[0.99] disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Login</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Bottom Support Link inside card */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Headphones className="w-3.5 h-3.5 text-[#DC2626]" /> Need Help?
              </span>
              <span className="font-bold text-[#1E1B4B]">Aryan Rajput: 9630013483</span>
            </div>
          </div>

        </div>
      </main>

      {/* FOOTER CATALOGUE & WEBRAJYA branding */}
      <footer className="w-full max-w-6xl mx-auto px-4 py-3 text-purple-100 z-10 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-black text-white">WEBRAJYA SOLUTIONS</span>
          <span>•</span>
          <span className="text-purple-200">Official POS & Billing Engine</span>
          <span>•</span>
          <a href="https://webrajya.com" target="_blank" rel="noopener noreferrer" className="text-[#F59E0B] font-bold hover:underline">
            webrajya.com
          </a>
        </div>

        <div className="flex items-center gap-4 text-[11px] font-mono text-purple-200">
          <span>Email: <strong>infowebrajya@gmail.com</strong></span>
          <span>Support: <strong>9630013483 (Aryan Rajput)</strong></span>
        </div>
      </footer>
    </div>
  );
};
