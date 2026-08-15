'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { loginAction } from '@/app/actions/auth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Lock, User, ShieldAlert, ArrowRight, Loader2, Eye, EyeOff,
  CheckCircle2, Home, KeyRound
} from 'lucide-react';

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/dashboard';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    const formData = new FormData();
    formData.append('username', username.trim());
    formData.append('password', password);

    const res = await loginAction(formData);

    if (!res.success) {
      setLoading(false);
      setErrorMsg(res.message);
      return;
    }

    setSuccessMsg('Authentication successful! Loading dashboard...');
    setTimeout(() => {
      const target = redirectTo.startsWith('/dashboard') ? redirectTo : '/dashboard';
      window.location.href = target;
    }, 600);
  }

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-[#002b13] text-slate-900 relative flex flex-col justify-between select-none">
      {/* High-Visibility Scenic Background Image */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat pointer-events-none opacity-85"
        style={{ backgroundImage: `url('/bg.png')` }}
      />
      {/* Light Glassy Tint Overlay so Background Remains Clearly Visible */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#003619]/45 via-[#005C2B]/25 to-[#002410]/55 pointer-events-none backdrop-blur-[0.5px]" />

      {/* 1. Header Bar (Logo & System Name on the Left) */}
      <header className="relative z-10 w-full text-white px-4 sm:px-8 py-3 border-b border-[#00A84D]/40 bg-gradient-to-r from-[#005C2B] via-[#00843D] to-[#004721] backdrop-blur-md shrink-0 shadow-lg">
        <div className="w-full flex items-center justify-between gap-3 min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/api/logo?v=latest" alt="IARMS Logo" className="w-9 h-9 sm:w-10 sm:h-10 object-contain drop-shadow-md shrink-0" />
            <div className="min-w-0">
              <span className="text-xs sm:text-[13px] font-black tracking-tight text-white uppercase block leading-tight">
                IRRIGATORS ASSOCIATION RECORD MANAGEMENT SYSTEM
              </span>
              <span className="text-[10px] text-emerald-200 font-extrabold tracking-widest uppercase block">
                National Irrigation Administration (NIA) &bull; Region 02
              </span>
            </div>
          </div>

          <Link
            href="/"
            className="px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-[11px] font-bold flex items-center gap-1.5 transition-colors shrink-0 shadow-sm"
          >
            <Home className="w-3.5 h-3.5 text-emerald-300" />
            <span>Home</span>
          </Link>
        </div>
      </header>

      {/* 2. Centered Login Card */}
      <main className="relative z-10 flex-1 max-w-sm mx-auto w-full px-4 py-8 flex flex-col justify-center items-center min-h-0">
        <div className="w-full">
          <div className="rounded-3xl bg-white/95 backdrop-blur-2xl border border-white/35 shadow-2xl overflow-hidden animate-in fade-in zoom-in-92 duration-500 ease-out">
            {/* Accent Bar */}
            <div className="h-1.5 bg-gradient-to-r from-[#005C2B] via-[#00843D] to-[#00A84D]" />

            {/* Card Header */}
            <div className="px-7 pt-7 pb-2 text-center space-y-2.5">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-50 border-2 border-emerald-100 flex items-center justify-center shadow-sm">
                <Lock className="w-7 h-7 text-[#00843D]" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl sm:text-[22px] font-black text-slate-900 tracking-tight">Portal Sign In</h2>
                <p className="text-xs text-slate-600 font-medium">
                  Access your association records &amp; financial statements.
                </p>
              </div>
            </div>

            <div className="space-y-4 px-7 pt-4 pb-8">
              {errorMsg && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[#005C2B] text-xs font-bold flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-[#00843D]" />
                  <span>{successMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-bold text-slate-700 block">Username</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4 text-[#00843D]" />
                    </div>
                    <input
                      type="text"
                      required
                      autoFocus
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter username"
                      className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00843D] focus:border-transparent transition-all shadow-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-bold text-slate-700 block">Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4 text-[#00843D]" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00843D] focus:border-transparent transition-all shadow-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-[10px] text-slate-400 font-medium">Need help accessing your account?</span>
                  <button
                    type="button"
                    onClick={() => setShowForgot(true)}
                    className="text-[11px] font-bold text-[#00843D] hover:text-[#005C2B] hover:underline transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#005C2B] via-[#00843D] to-[#005C2B] hover:from-[#004721] hover:to-[#004721] text-white font-bold text-xs sm:text-sm transition-all shadow-lg shadow-emerald-950/20 flex items-center justify-center gap-2 active:scale-98 disabled:opacity-75 cursor-pointer mt-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Verifying Credentials...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to Portal</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* Forgot Password Dialog */}
      <Dialog open={showForgot} onOpenChange={setShowForgot}>
        <DialogContent className="max-w-md p-6 bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-[#00843D]" />
              Forgot Password?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 leading-relaxed">
              If you forgot your password, please contact your&nbsp;
              <span className="font-bold text-slate-700">Head Admin / Administrator</span>
              &nbsp;to have it reset.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-end gap-3 pt-3 border-t">
            <button
              type="button"
              onClick={() => setShowForgot(false)}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-800 text-white hover:bg-emerald-900 transition-colors"
            >
              Got It
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 3. Centered Footer */}
      <footer className="relative z-10 w-full text-emerald-200 px-4 sm:px-8 py-2.5 text-center text-[10px] sm:text-[10.5px] border-t border-[#00A84D]/30 bg-[#004721]/95 backdrop-blur-md shrink-0 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-center">
          <span className="font-medium">IRRIGATORS ASSOCIATION RECORD MANAGEMENT SYSTEM &bull; National Irrigation Administration (NIA)</span>
        </div>
      </footer>
    </div>
  );
}
