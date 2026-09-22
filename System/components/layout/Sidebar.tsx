'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  Wallet, 
  ShieldCheck, 
  FileText, 
  ChevronRight, 
  UserCheck, 
  Shield
} from 'lucide-react';
import { UserRole } from '@/types';

interface SidebarProps {
  userRole?: UserRole;
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

export default function Sidebar({ userRole = 'admin' }: SidebarProps) {
  const pathname = usePathname();

  const navSections: NavSection[] = [
    {
      title: 'Core Management',
      items: [
        {
          label: 'Overview Dashboard',
          href: '/dashboard',
          icon: LayoutDashboard,
          roles: ['admin', 'treasurer', 'auditor', 'member'],
          description: 'System overview & KPIs',
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
          roles: ['admin', 'treasurer'],
          badge: 'Ledger',
          description: 'Record cash flows & receipts',
        },
        {
          label: 'Verification & Audit Queue',
          href: '/dashboard/auditor',
          icon: ShieldCheck,
          roles: ['admin', 'auditor'],
          badge: 'Audit',
          description: 'Approve pending items',
        },
        {
          label: 'Financial Statements',
          href: '/dashboard/statements',
          icon: FileText,
          roles: ['admin', 'treasurer', 'auditor', 'member'],
          badge: 'FS1 - FS4',
          description: 'Compile official reports',
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
          roles: ['admin'],
          description: 'Roles & user privileges',
        },
        {
          label: 'My Account Settings',
          href: '/dashboard/account',
          icon: UserCheck,
          roles: ['admin', 'treasurer', 'auditor', 'member'],
          description: 'Profile & preferences',
        },
      ],
    },
  ];

  const roleLabelMap: Record<UserRole, string> = {
    admin: 'System Administrator',
    treasurer: 'Association Treasurer',
    auditor: 'Internal Auditor',
    member: 'IA Member',
  };

  return (
    <aside className="w-80 bg-gradient-to-b from-[#015e27] via-[#017631] to-[#014d20] text-white flex flex-col justify-between p-5 shrink-0 hidden lg:flex shadow-2xl print:hidden transition-all border-r border-emerald-900/50 select-none overflow-y-auto">
      <div className="space-y-6">
        {/* Clean Minimalist Brand Header */}
        <div className="p-4 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md shadow-md space-y-1 hover:bg-white/15 transition-all">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-black tracking-tight text-white uppercase">
              IARMS Portal
            </h1>
            <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-400/30 uppercase tracking-wide">
              Official
            </span>
          </div>
          <p className="text-[11px] font-bold text-emerald-100/90 truncate">
            Nangurisan Laya FIA, Inc.
          </p>
          <div className="flex items-center gap-1 pt-1 text-[9px] font-semibold text-emerald-200/70 border-t border-white/10 mt-1">
            <Shield className="w-3 h-3 text-emerald-300 shrink-0" />
            <span className="truncate">SEC Reg. CN202060557</span>
          </div>
        </div>

        {/* Categorized Navigation */}
        <div className="space-y-5">
          {navSections.map((section) => {
            const filteredItems = section.items.filter((item) => item.roles.includes(userRole));
            if (filteredItems.length === 0) return null;

            return (
              <div key={section.title} className="space-y-2">
                <div className="px-3 text-[10px] font-black uppercase tracking-widest text-emerald-200/60 flex items-center justify-between">
                  <span>{section.title}</span>
                  <span className="w-1 h-1 rounded-full bg-emerald-400/80"></span>
                </div>
                <nav className="space-y-1.5">
                  {filteredItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center justify-between px-3.5 py-3 rounded-xl text-xs transition-all duration-200 group relative ${
                          isActive
                            ? 'bg-white text-[#017631] shadow-xl shadow-black/15 font-black translate-x-1'
                            : 'text-white/85 hover:text-white hover:bg-white/10 font-bold hover:translate-x-0.5'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-lg transition-colors ${
                              isActive
                                ? 'bg-[#017631] text-white shadow-sm'
                                : 'bg-white/10 text-white/90 group-hover:text-white group-hover:bg-white/20'
                            }`}
                          >
                            <Icon className="w-4 h-4 transition-transform group-hover:scale-110" />
                          </div>
                          <div>
                            <div className="tracking-wide text-xs">{item.label}</div>
                            <div className={`text-[9.5px] font-normal leading-tight transition-colors ${
                              isActive ? 'text-[#017631]/80 font-semibold' : 'text-emerald-100/60 group-hover:text-emerald-100/80'
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
                          <ChevronRight className="w-4 h-4 text-[#017631] animate-in slide-in-from-left-1 shrink-0" />
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

      {/* Footer Session Card */}
      <div className="pt-4 mt-6 border-t border-emerald-800/40">
        <div className="p-3.5 rounded-2xl bg-black/20 border border-white/15 text-xs text-white/90 space-y-2.5 shadow-inner backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="font-extrabold text-white text-[11px] uppercase tracking-wide">
                System Operational
              </span>
            </div>
            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
              Local LAN
            </span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[10px] text-emerald-200/80">
            <span className="flex items-center gap-1 font-semibold">
              <Shield className="w-3 h-3 text-emerald-400" />
              {roleLabelMap[userRole]}
            </span>
            <span className="font-mono text-[9px] text-emerald-300/70">v2.4 Prod</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
