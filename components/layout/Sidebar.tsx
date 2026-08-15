'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  Wallet, 
  ShieldCheck, 
  FileText, 
  ChevronRight, 
  UserCheck, 
  Shield,
  Building2,
  AlertTriangle,
  Save,
  X,
  Loader2
} from 'lucide-react';
import InstallAppButton from '@/components/pwa/InstallAppButton';
import { UserRole } from '@/types';
import { isUnsaved, markUnsaved, requestSave } from '@/lib/unsavedChanges';

interface SidebarProps {
  userRole?: UserRole;
  associationName?: string;
  associationCode?: string;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: UserRole[];
  description: string;
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export default function Sidebar({ 
  userRole = 'admin',
  associationName = 'IARMS Irrigators Associations',
  associationCode = 'IARMS'
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [navSaving, setNavSaving] = useState(false);

  const navSections: NavSection[] = [
    {
      title: 'Core Management',
      items: [
        {
          label: 'Overview Dashboard',
          href: '/dashboard',
          icon: LayoutDashboard,
          roles: ['super_admin', 'admin', 'treasurer', 'auditor'],
          description: 'System overview & KPIs',
        },
        {
          label: 'Irrigators Associations',
          href: '/dashboard/associations',
          icon: Building2,
          roles: ['super_admin'],
          badge: 'Registry',
          description: 'Registry & NIA Profile',
        },
      ],
    },
    {
      title: 'Financial Suite',
      items: [
        {
          label: 'Collections & Expenses',
          href: '/dashboard/treasurer',
          icon: Wallet,
          roles: ['super_admin', 'admin', 'treasurer'],
          badge: 'Ledger',
          description: 'Record cash flows & vouchers',
        },
        {
          label: 'Verification & Audit Queue',
          href: '/dashboard/auditor',
          icon: ShieldCheck,
          roles: ['super_admin', 'admin', 'auditor'],
          badge: 'Audit',
          description: 'Approve pending items',
        },
        {
          label: 'Financial Statements',
          href: '/dashboard/statements',
          icon: FileText,
          roles: ['super_admin', 'admin', 'treasurer', 'auditor'],
          badge: 'FS1 - FS4',
          description: 'Compile official NIA reports',
        },
      ],
    },
    {
      title: 'Administration',
      items: [
        {
          label: 'User Account Manager',
          href: '/dashboard/admin',
          icon: Users,
          roles: ['super_admin', 'admin'],
          description: 'Roles & user accounts',
        },
        {
          label: 'My Account Settings',
          href: '/dashboard/account',
          icon: UserCheck,
          roles: ['super_admin', 'admin', 'treasurer', 'auditor'],
          description: 'Profile & security',
        },
      ],
    },
  ];

  function handleNavClick(href: string, e: React.MouseEvent) {
    if (pathname === href) return;
    if (!isUnsaved()) return;
    e.preventDefault();
    setPendingHref(href);
  }

  function cancelNav() {
    if (navSaving) return;
    setPendingHref(null);
  }

  function discardAndGo() {
    if (!pendingHref || navSaving) return;
    markUnsaved(false);
    setPendingHref(null);
    router.push(pendingHref);
  }

  async function saveAndGo() {
    if (!pendingHref || navSaving) return;
    setNavSaving(true);
    const ok = await requestSave();
    setNavSaving(false);
    if (ok) {
      setPendingHref(null);
      router.push(pendingHref);
    } else {
      setPendingHref(null);
    }
  }

  return (
    <>
      <aside className="w-80 bg-gradient-to-b from-[#005C2B] via-[#00843D] to-[#004721] text-white flex flex-col justify-between p-5 shrink-0 hidden lg:flex shadow-2xl print:hidden transition-all border-r border-[#005C2B]/50 select-none overflow-y-auto">
        <div className="space-y-6">
          {/* Clean Minimalist Brand Header */}
          <div className="p-4 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md shadow-md space-y-1 hover:bg-white/15 transition-all">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-black tracking-tight text-white uppercase">
                IARMS Portal
              </h1>
              <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-400/30 uppercase tracking-wide">
                {associationCode}
              </span>
            </div>
            <p className="text-[11px] font-bold text-emerald-100/90 truncate">
              {associationName}
            </p>
            <div className="flex items-center gap-1 pt-1 text-[9px] font-semibold text-emerald-200/70 border-t border-white/10 mt-1">
              <Shield className="w-3 h-3 text-emerald-300 shrink-0" />
              <span className="truncate">National Irrigation Administration (NIA)</span>
            </div>
          </div>

          {/* Categorized Navigation */}
          <div className="space-y-5">
            {navSections.map((section) => {
              const filteredItems = section.items.filter((item) => item.roles.includes(userRole));
              if (filteredItems.length === 0) return null;

              return (
                <div key={section.title} className="space-y-2">
                  <div className="text-[10px] font-black text-emerald-300 uppercase tracking-widest px-2.5">
                    {section.title}
                  </div>
                  <nav className="space-y-1">
                    {filteredItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={(e) => handleNavClick(item.href, e)}
                          className={`flex items-center justify-between px-3.5 py-3 rounded-xl text-xs transition-all duration-200 group relative ${
                            isActive
                              ? 'bg-white text-[#00843D] shadow-xl shadow-black/15 font-black translate-x-1'
                              : 'text-white/85 hover:text-white hover:bg-white/10 font-bold hover:translate-x-0.5'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`p-2 rounded-lg transition-colors ${
                                isActive
                                  ? 'bg-[#00843D] text-white shadow-sm'
                                  : 'bg-white/10 text-white/90 group-hover:text-white group-hover:bg-white/20'
                              }`}
                            >
                              <Icon className="w-4 h-4 transition-transform group-hover:scale-110" />
                            </div>
                            <div>
                              <div className="tracking-wide text-xs">{item.label}</div>
                              <div className={`text-[9.5px] font-normal leading-tight transition-colors ${
                                isActive ? 'text-[#00843D]/90 font-semibold' : 'text-emerald-100/60 group-hover:text-emerald-100/80'
                              }`}>
                                {item.description}
                              </div>
                            </div>
                          </div>

                          {item.badge && !isActive && (
                            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-emerald-900/60 text-emerald-200 border border-emerald-700/50">
                              {item.badge}
                            </span>
                          )}

                          {isActive && (
                            <ChevronRight className="w-4 h-4 text-[#00843D] animate-in slide-in-from-left-1 shrink-0" />
                          )}
                        </Link>
                      );
                    })}
                  </nav>
                </div>
              );
            })}
          </div>
        </div>

        {/* Install App Button */}
        <div className="pt-4 mt-4 border-t border-white/10">
          <InstallAppButton
            className="w-full"
            buttonClassName="w-full justify-center px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/90 hover:text-white text-xs font-bold transition-all border border-white/10"
          />
        </div>
      </aside>

      {/* Unsaved Changes Confirmation */}
      {pendingHref && (
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
                onClick={cancelNav}
                disabled={navSaving}
                className="w-full sm:flex-1 py-2.5 text-xs font-bold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 flex items-center justify-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={discardAndGo}
                disabled={navSaving}
                className="w-full sm:flex-1 py-2.5 text-xs font-bold rounded-xl border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <X className="w-3.5 h-3.5 shrink-0" /> Discard Changes
              </button>
              <button
                type="button"
                onClick={saveAndGo}
                disabled={navSaving}
                className="w-full sm:flex-1 py-2.5 text-xs font-bold rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white shadow-md disabled:opacity-60 flex items-center justify-center gap-1.5"
              >
                {navSaving ? <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" /> : <Save className="w-3.5 h-3.5 shrink-0" />} Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}