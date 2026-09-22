'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOutAction } from '@/app/actions/auth';
import { LogOut, User, Loader2, X, UserCheck, Menu, LayoutDashboard, Users, Wallet, ShieldCheck, FileText, ChevronRight } from 'lucide-react';
import { UserRole } from '@/types';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface HeaderProps {
  userEmail?: string;
  userRole?: UserRole;
  userName?: string;
}

export default function Header({ userEmail = 'admin@irrigation.org', userRole = 'admin', userName = 'System Administrator' }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const navItems = [
    { label: 'Overview Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'treasurer', 'auditor', 'member'] },
    { label: 'Manage User Accounts', href: '/dashboard/admin', icon: Users, roles: ['admin'] },
    { label: 'Collections & Expenses', href: '/dashboard/treasurer', icon: Wallet, roles: ['admin', 'treasurer'] },
    { label: 'Verification & Audit Queue', href: '/dashboard/auditor', icon: ShieldCheck, roles: ['admin', 'auditor'] },
    { label: 'Financial Statements', href: '/dashboard/statements', icon: FileText, roles: ['admin', 'treasurer', 'auditor', 'member'] },
    { label: 'My Account Settings', href: '/dashboard/account', icon: UserCheck, roles: ['admin', 'treasurer', 'auditor', 'member'] },
  ];

  const allowedNav = navItems.filter((item) => item.roles.includes(userRole));

  async function handleConfirmSignOut() {
    setIsSigningOut(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    await signOutAction();
    window.location.href = '/login';
  }

  const roleColors: Record<UserRole, string> = {
    admin: 'bg-rose-50 text-rose-700 border-rose-200',
    treasurer: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    auditor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    member: 'bg-amber-50 text-amber-800 border-amber-200',
  };

  return (
    <>
      <header className="h-16 border-b border-[#04B358]/30 bg-gradient-to-r from-[#015324] via-[#017631] to-[#01471f] text-white sticky top-0 z-30 px-2 sm:px-4 md:px-6 flex items-center justify-between shadow-lg print:hidden transition-all backdrop-blur-md">
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0 flex-1 sm:flex-initial mr-2">
          {/* Mobile Drawer Menu Toggle */}
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="p-1.5 sm:p-2 rounded-xl text-white/90 hover:bg-white/10 hover:text-white md:hidden transition-colors shrink-0"
            aria-label="Toggle Mobile Menu"
          >
            {showMobileMenu ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
          </button>

          {/* Direct Fitted Logo Graphic */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/api/logo?v=latest" alt="NLFIA Logo" className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 object-contain filter drop-shadow-md transition-transform hover:scale-105 shrink-0" />
          <div className="min-w-0 flex-1">
            <h2 className="text-[11px] sm:text-xs md:text-base font-black tracking-tight text-white leading-tight drop-shadow-sm truncate">
              NANGURISAN LAYA FARMERS IRRIGATORS ASSOC.
            </h2>
            <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1 min-w-0">
              <span className="inline-block w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#04B358] animate-pulse shrink-0 ring-2 ring-white/30"></span>
              <span className="text-[9px] sm:text-[10px] md:text-xs font-black bg-[#04B358] text-white px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full tracking-wide uppercase truncate shadow-xs">
                IARMS Executive Portal
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Role Badge */}
          <span className="hidden sm:inline-flex items-center px-3 py-1 text-xs font-black rounded-full border border-white/25 bg-white/15 text-white backdrop-blur-md tracking-wider uppercase shadow-xs">
            {userRole}
          </span>

          <div className="h-7 w-px bg-white/20"></div>

          {/* User Profile Pill */}
          <Link
            href="/dashboard/account"
            className="flex items-center gap-2.5 p-1.5 px-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 transition-all group cursor-pointer shadow-xs"
            title="Manage My Account"
          >
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-[#04B358] text-white flex items-center justify-center font-bold text-xs md:text-sm shadow-md ring-2 ring-white/40 shrink-0 group-hover:scale-105 transition-transform">
              <User className="w-4 h-4 md:w-5 md:h-5" />
            </div>
            <div className="hidden lg:block text-left text-xs">
              <div className="font-bold text-white leading-tight group-hover:text-emerald-200 transition-colors">{userName}</div>
              <div className="text-[11px] text-white/70 font-medium">{userEmail}</div>
            </div>
          </Link>

          <button
            onClick={() => setShowConfirmModal(true)}
            title="Sign Out"
            className="p-2 text-white/80 hover:text-white hover:bg-rose-500/20 border border-transparent hover:border-rose-300/30 rounded-xl transition-all ml-0.5 group"
          >
            <LogOut className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </header>

      {/* Mobile Drawer Navigation Overlay */}
      {showMobileMenu && (
        <div className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs md:hidden animate-in fade-in duration-200" onClick={() => setShowMobileMenu(false)}>
          <div
            className="w-72 max-w-[80vw] h-full bg-[#017631] text-white p-5 space-y-6 flex flex-col justify-between animate-in slide-in-from-left duration-200 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-white/20 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white p-1 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/api/logo" alt="NLFIA Logo" className="w-full h-full object-contain" />
                  </div>
                  <span className="text-xs font-black tracking-tight text-white uppercase">IARMS Navigation</span>
                </div>
                <button onClick={() => setShowMobileMenu(false)} className="p-1 rounded-lg text-white/70 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1.5">
                {allowedNav.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setShowMobileMenu(false)}
                      className={`flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all ${isActive ? 'bg-white text-[#017631] shadow-md font-extrabold' : 'text-white/90 hover:bg-white/10 hover:text-white'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                      {isActive && <ChevronRight className="w-4 h-4 text-[#017631]" />}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-[11px] text-slate-300 space-y-1">
              <div className="font-extrabold text-white flex items-center justify-between">
                <span>System Status</span>
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-900/80 text-emerald-300">ONLINE</span>
              </div>
              <p className="text-slate-400">Connected to local node</p>
            </div>
          </div>
        </div>
      )}

      {/* Sign Out Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0">
                  <LogOut className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-snug">Confirm Portal Logout</h3>
                  <p className="text-xs text-slate-500">IARMS Security Protocol</p>
                </div>
              </div>
              <button
                onClick={() => !isSigningOut && setShowConfirmModal(false)}
                disabled={isSigningOut}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
              Are you sure you want to log out of your session? Any unsaved changes in progress will be closed safely.
            </p>

            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSigningOut}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-all disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmSignOut}
                disabled={isSigningOut}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isSigningOut ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing out...</span>
                  </>
                ) : (
                  <>
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
