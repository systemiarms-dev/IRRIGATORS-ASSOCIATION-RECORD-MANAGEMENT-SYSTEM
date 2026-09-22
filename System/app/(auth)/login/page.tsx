'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginAction } from '@/app/actions/auth';
import { Lock, User, ShieldAlert, ArrowRight, Loader2, Eye, EyeOff, CheckCircle2, ShieldCheck, FileText, Wallet, Landmark } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);

    const res = await loginAction(formData);

    if (!res.success) {
      setLoading(false);
      setErrorMsg(res.message);
      return;
    }

    setSuccessMsg('Authentication successful! Access granted. Redirecting to Executive Dashboard...');
    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 1000);
  }

  return (
    <div className="h-screen supports-[height:100dvh]:h-dvh flex flex-col bg-[#01471f] text-slate-900 relative overflow-hidden">
      {/* Background Image + Brand Gradient Overlay */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url('/api/bg?v=latest')` }}
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#01170c]/60 via-[#017631]/40 to-[#02200f]/65" />
      <div className="absolute inset-0 z-0 bg-gradient-to-t from-black/40 via-transparent to-black/10" />
      {/* Decorative Glows */}
      <div className="absolute -top-28 -right-28 z-0 w-96 h-96 rounded-full bg-[#04B358]/25 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 z-0 w-[30rem] h-[30rem] rounded-full bg-emerald-400/15 blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -left-24 z-0 w-64 h-64 rounded-full bg-[#04B358]/15 blur-3xl pointer-events-none" />

      {/* Top Brand Strip */}
<header className="relative z-10 w-full text-white px-3 sm:px-6 py-2 border-b border-white/10 bg-white/5 backdrop-blur-sm shrink-0">
        <div className="max-w-6xl mx-auto flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="shrink-0 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/api/logo?v=latest" alt="NLFIA Logo" className="w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 object-contain filter drop-shadow-lg" />
          </div>
          <div className="min-w-0">
            <h1 className="text-[10px] sm:text-sm md:text-base font-black tracking-tight text-white leading-tight truncate">
              NANGURISAN LAYA FARMERS IRRIGATORS ASSOCIATION, INC.
            </h1>
            <div className="hidden sm:flex flex-wrap items-center gap-1.5 mt-0.5">
              <span className="inline-flex items-center gap-1 text-[10px] text-[#04B358] bg-white/10 px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wide">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#04B358] animate-pulse" />
                IARMS Executive Portal
              </span>
              <span className="hidden sm:inline text-[10px] text-white/60 font-medium">
                • Irrigation Record & Financial Management System
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Split Layout */}
      <main className="relative z-10 flex-1 min-h-0 overflow-y-auto flex flex-col p-3 sm:p-6 md:p-10">
        <div className="m-auto w-full max-w-6xl grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left Branding Panel (Desktop) */}
          <div className="hidden lg:flex flex-col text-white">
            <div className="mb-7">
              <div className="text-[11px] font-black uppercase tracking-widest text-[#04B358] drop-shadow-sm">NIA Standard Compliance</div>
              <h2 className="text-xl font-black leading-tight drop-shadow-sm mt-1">Financial & Irrigation Record System</h2>
            </div>

            <h3 className="text-3xl xl:text-4xl font-black leading-tight tracking-tight drop-shadow-md">
              Empowering Transparent<br />
              <span className="text-[#04B358]">Irrigation Governance</span>
            </h3>
            <p className="mt-4 text-sm text-white/90 leading-relaxed max-w-md font-medium drop-shadow-sm">
              Manage member ISF collections, operational disbursements, audit workflows, and NIA-standard
              FS1&ndash;FS4 financial statements from one secure portal.
            </p>

            <ul className="mt-8 space-y-3.5">
              {[
                { icon: ShieldCheck, title: 'Role-Based Secure Access', desc: 'Admin, Treasurer, Auditor & member permissions' },
                { icon: Wallet, title: 'ISF Collections & Disbursements', desc: 'Log official receipts and expense vouchers' },
                { icon: FileText, title: 'FS1 – FS4 Statements', desc: 'Generate NIA-standard financial reports' },
                { icon: Landmark, title: 'Member Dues & Balances', desc: 'Track fund balances and audit trails' },
              ].map(({ icon: Icon, title, desc }) => (
                <li key={title} className="flex items-start gap-3.5 group">
                  <div className="w-10 h-10 rounded-xl bg-[#04B358]/25 border border-[#04B358]/40 text-[#04B358] flex items-center justify-center shrink-0 transition-transform group-hover:scale-110">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-white drop-shadow-sm">{title}</div>
                    <div className="text-xs text-white/80 font-medium">{desc}</div>
                  </div>
                </li>
              ))}
            </ul>

            {/* Trust Strip */}
            <div className="mt-9 pt-6 border-t border-white/15 grid grid-cols-3 gap-4">
              {[
                { value: '4', label: 'FS Modules' },
                { value: '3', label: 'Officer Roles' },
                { value: '24/7', label: 'Local Access' },
              ].map((s) => (
                <div key={s.label}>
                  <div className="text-2xl font-black text-[#04B358] drop-shadow-sm">{s.value}</div>
                  <div className="text-[11px] text-white/75 font-semibold uppercase tracking-wider">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Sign-In Card */}
          <div className="w-full max-w-[26rem] mx-auto lg:mx-0 lg:justify-self-end">
            <Card className="w-full bg-white/80 backdrop-blur-xl shadow-2xl border border-emerald-100/70 rounded-3xl overflow-hidden">
                {/* Accent top bar */}
                <div className="h-1.5 w-full bg-gradient-to-r from-[#04B358] via-[#017631] to-[#01321a]" />

                <CardHeader className="text-center space-y-1.5 sm:space-y-2 pb-3 pt-3 sm:pt-6 px-7 sm:px-10">
                  {/* Logo inside the card */}
                  <div className="inline-flex items-center justify-center mx-auto">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/api/logo?v=latest" alt="NLFIA Logo" className="w-24 h-24 sm:w-40 sm:h-40 md:w-48 md:h-48 object-contain drop-shadow-lg" />
                  </div>
                  <CardTitle className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Welcome Back
                  </CardTitle>
                  <CardDescription className="text-[12px] sm:text-[13px] text-slate-600 font-medium">
                    Sign in to access the Irrigation & Financial Management Portal
                  </CardDescription>
                </CardHeader>

              <CardContent className="space-y-3 sm:space-y-4 px-5 sm:px-10 pt-2 sm:pt-3">
                {errorMsg && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-start gap-2.5 animate-in fade-in duration-200">
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2.5 animate-in fade-in zoom-in-95 duration-300 shadow-sm">
                    <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 animate-bounce" />
                    <div className="flex-1">
                      <div>{successMsg}</div>
                      <div className="text-[11px] text-emerald-600 font-normal mt-0.5 flex items-center gap-1.5">
                        <Loader2 className="w-3 h-3 animate-spin" /> Preparing system workspace...
                      </div>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="username">Username</Label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
                      <Input
                        id="username"
                        type="text"
                        name="username"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="e.g. admin, treasurer, auditor"
                        className="pl-10 h-9 sm:h-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Account Password</Label>
                    </div>
                    <div className="relative flex items-center">
                      <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter account password"
                        className="pl-10 pr-10 h-9 sm:h-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors p-1.5 rounded-lg hover:bg-slate-200/50 flex items-center justify-center"
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    variant="emerald"
                    size="lg"
                    disabled={loading}
                    className="w-full mt-1 h-11 sm:h-12"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>Sign In to Portal</span>
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </Button>
                </form>

                {/* Security note */}
                <div className="flex items-center justify-center gap-2 pt-1 text-[11px] text-slate-400 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Secured portal session • LAN encrypted
                </div>
              </CardContent>

              <CardFooter className="justify-center border-t border-slate-100 pt-3 pb-4 sm:pt-4 sm:pb-6 px-5 sm:px-10 text-xs text-slate-500 font-medium text-center">
                Forgot password? Contact admin or reach the admin office for request
              </CardFooter>
            </Card>
          </div>
        </div>

        {/* Minimal Copyright Line */}
        <p className="text-center text-[10px] sm:text-[11px] text-white/50 font-medium mt-3 sm:mt-6">
          © 2022&ndash;2026 Nangurisan Laya Farmers Irrigators Association, Inc. — NLFIA Irrigation Record & Financial Management System (IARMS)
        </p>
      </main>
    </div>
  );
}
