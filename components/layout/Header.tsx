'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { signOutAction } from '@/app/actions/auth';
import { 
  LogOut, User, Loader2, X, UserCheck, Menu, LayoutDashboard, 
  Users, Wallet, ShieldCheck, FileText, ChevronRight, Building2, ChevronDown,
  AlertTriangle, Save
} from 'lucide-react';
import { UserRole } from '@/types';
import Link from 'next/link';
import { isUnsaved, markUnsaved, requestSave } from '@/lib/unsavedChanges';
import InstallAppButton from '@/components/pwa/InstallAppButton';

interface HeaderProps {
  username?: string;
  userRole?: UserRole;
  userName?: string;
  associationName?: string;
  associationCode?: string;
}

export default function Header({ 
  username = 'admin',
  userRole = 'admin', 
  userName = 'System Administrator',
  associationName = 'IARMS Irrigators Associations',
  associationCode = 'IARMS'
}: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [pendingNav, setPendingNav] = useState<{ href?: string; signOut?: boolean } | null>(null);
  const [navSaving, setNavSaving] = useState(false);

  const navItems = [
    { label: 'Overview Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['super_admin', 'admin', 'treasurer', 'auditor'] },
    { label: 'Irrigators Associations', href: '/dashboard/associations', icon: Building2, roles: ['super_admin'] },
    { label: 'Collections & Expenses', href: '/dashboard/treasurer', icon: Wallet, roles: ['super_admin', 'admin', 'treasurer'] },
    { label: 'Verification & Audit Queue', href: '/dashboard/auditor', icon: ShieldCheck, roles: ['super_admin', 'admin', 'auditor'] },
    { label: 'Financial Statements', href: '/dashboard/statements', icon: FileText, roles: ['super_admin', 'admin', 'treasurer', 'auditor'] },
    { label: 'User Account Manager', href: '/dashboard/admin', icon: Users, roles: ['super_admin', 'admin'] },
    { label: 'My Account Settings', href: '/dashboard/account', icon: UserCheck, roles: ['super_admin', 'admin', 'treasurer', 'auditor'] },
  ];

  const allowedNav = navItems.filter((item) => item.roles.includes(userRole));

  async function handleConfirmSignOut() {
    setIsSigningOut(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    await signOutAction();
    window.location.href = '/login';
  }

  function handleNavClick(href: string, e: React.MouseEvent) {
    if (pathname === href) return;
    if (!isUnsaved()) return;
    e.preventDefault();
    if (href === '/dashboard/account') setShowMobileMenu(false);
    setPendingNav({ href });
  }

  function handleSignOutTrigger() {
    if (isUnsaved()) {
      setShowMobileMenu(false);
      setPendingNav({ signOut: true });
      return;
    }
    setShowConfirmModal(true);
  }

  function cancelPendingNav() {
    if (navSaving) return;
    setPendingNav(null);
  }

  function discardPendingNav() {
    if (!pendingNav || navSaving) return;
    markUnsaved(false);
    const { href, signOut } = pendingNav;
    setPendingNav(null);
    if (signOut) {
      setShowConfirmModal(true);
    } else if (href) {
      setShowMobileMenu(false);
      router.push(href);
    }
  }

  async function savePendingNav() {
    if (!pendingNav || navSaving) return;
    setNavSaving(true);
    const ok = await requestSave();
    setNavSaving(false);
    if (!ok) {
      setPendingNav(null);
      return;
    }
    const { href, signOut } = pendingNav;
    setPendingNav(null);
    if (signOut) {
      setShowConfirmModal(true);
    } else if (href) {
      setShowMobileMenu(false);
      router.push(href);
    }
  }

  const roleLabels: Record<UserRole, string> = {
    super_admin: 'Super Admin',
    admin: 'Head Admin',
    treasurer: 'Treasurer',
    auditor: 'Auditor',
  };

  const roleColors: Record<UserRole, string> = {
    super_admin: 'bg-purple-500/20 text-purple-200 border-purple-400/30',
    admin: 'bg-rose-500/20 text-rose-200 border-rose-400/30',
    treasurer: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30',
    auditor: 'bg-indigo-500/20 text-indigo-200 border-indigo-400/30',
  };

  return (
    <>
      <header className="h-16 border-b border-[#00A84D]/30 bg-gradient-to-r from-[#005C2B] via-[#00843D] to-[#004721] text-white sticky top-0 z-30 px-2 sm:px-4 md:px-6 flex items-center justify-between shadow-lg print:hidden transition-all backdrop-blur-md">
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
          <img src="/Iarmslogo.png" alt="IARMS Logo" className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 object-contain filter drop-shadow-md transition-transform hover:scale-105 shrink-0" loading="lazy" decoding="async" />
          <div className="min-w-0 flex-1">
            <h2 className="text-[11px] sm:text-xs md:text-sm font-black tracking-tight text-white leading-tight drop-shadow-sm truncate">
              IRRIGATORS ASSOCIATION RECORD MANAGEMENT SYSTEM
            </h2>
            <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 min-w-0">
              <span className="text-[9px] sm:text-[10px] font-black bg-[#00843D] text-white px-2 py-0.5 rounded-full tracking-wide uppercase truncate shadow-xs">
                {associationName}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Role Badge */}
          <span className={`hidden sm:inline-flex items-center px-2.5 py-0.5 text-xs font-black rounded-full border tracking-wider uppercase shadow-xs ${roleColors[userRole]}`}>
            {roleLabels[userRole]}
          </span>

          <div className="h-7 w-px bg-white/20"></div>

          {/* User Profile Pill */}
          <Link
            href="/dashboard/account"
            onClick={(e) => handleNavClick('/dashboard/account', e)}
            className="flex items-center gap-2 p-1.5 px-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 transition-all group cursor-pointer shadow-xs"
            title="Manage My Account"
          >
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-[#00843D] text-white flex items-center justify-center font-bold text-xs md:text-sm shadow-md ring-2 ring-white/40 shrink-0 group-hover:scale-105 transition-transform">
              <User className="w-4 h-4 md:w-4 md:h-4" />
            </div>
            <div className="hidden lg:block text-left text-xs">
              <div className="font-bold text-white leading-tight group-hover:text-emerald-200 transition-colors">{userName}</div>
              <div className="text-[10px] text-emerald-200/90 font-mono font-semibold truncate max-w-[150px]">{username}</div>
            </div>
          </Link>

          {/* Sign Out Trigger */}
          <button
            onClick={handleSignOutTrigger}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-rose-600/80 transition-all border border-transparent hover:border-rose-400/50 shadow-xs"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {showMobileMenu && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden animate-in fade-in" onClick={() => setShowMobileMenu(false)}>
          <div
            className="w-72 max-w-[80vw] h-full bg-[#015324] text-white p-5 space-y-4 shadow-2xl flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/15 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-400/20 flex items-center justify-center font-bold text-emerald-300">
                    IA
                  </div>
                  <div>
                    <h3 className="text-xs font-black">IARMS Navigation</h3>
                    <p className="text-[10px] text-emerald-200">{roleLabels[userRole]}</p>
                  </div>
                </div>
                <button onClick={() => setShowMobileMenu(false)} className="p-1 rounded-lg hover:bg-white/10">
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
                      onClick={(e) => {
                        if (!isUnsaved()) {
                          setShowMobileMenu(false);
                          return;
                        }
                        e.preventDefault();
                        setPendingNav({ href: item.href });
                      }}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-white text-emerald-900 shadow-md'
                          : 'text-white/85 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="pt-3 border-t border-white/15 space-y-2">
              <InstallAppButton
                className="w-full"
                buttonClassName="w-full justify-center gap-2 py-2.5 rounded-xl bg-emerald-400/15 border border-emerald-400/30 text-emerald-200 text-xs font-bold hover:bg-emerald-400/25 transition-colors"
              />
              <button
                onClick={() => {
                  setShowMobileMenu(false);
                  handleSignOutTrigger();
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-600/30 border border-rose-400/40 text-rose-100 text-xs font-bold hover:bg-rose-600 transition-colors"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved Changes Confirmation */}
      {pendingNav && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl p-5 max-w-sm sm:max-w-md w-full shadow-2xl space-y-4 text-slate-900 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-black">Unsaved Changes</h3>
              <p className="text-xs text-slate-500">
                You have unsaved changes to this financial statement. Save before leaving, or discard them.
              </p>
            </div>
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={cancelPendingNav}
                disabled={navSaving}
                className="w-full sm:flex-1 py-2.5 text-xs font-bold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 flex items-center justify-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={discardPendingNav}
                disabled={navSaving}
                className="w-full sm:flex-1 py-2.5 text-xs font-bold rounded-xl border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <X className="w-3.5 h-3.5 shrink-0" /> Discard Changes
              </button>
              <button
                type="button"
                onClick={savePendingNav}
                disabled={navSaving}
                className="w-full sm:flex-1 py-2.5 text-xs font-bold rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white shadow-md disabled:opacity-60 flex items-center justify-center gap-1.5"
              >
                {navSaving ? <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" /> : <Save className="w-3.5 h-3.5 shrink-0" />} Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sign Out Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-slate-900 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <LogOut className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-black">Confirm Sign Out</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to end your active session in IARMS?
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 text-xs font-bold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSignOut}
                disabled={isSigningOut}
                className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-md flex items-center justify-center gap-2"
              >
                {isSigningOut ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Yes, Sign Out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
