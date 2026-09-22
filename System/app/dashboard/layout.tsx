import React from 'react';
import { redirect } from 'next/navigation';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import Footer from '@/components/layout/Footer';
import { getSessionUser } from '@/lib/auth/session';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  // No valid/verified session -> back to login
  if (!user) {
    redirect('/login');
  }

  return (
    <div
      className="h-screen supports-[height:100dvh]:h-dvh overflow-hidden flex flex-col bg-cover bg-center bg-no-repeat bg-fixed text-slate-900"
      style={{ backgroundImage: `linear-gradient(rgba(248, 250, 252, 0.83), rgba(248, 250, 252, 0.83)), url('/api/bg?v=latest')` }}
    >
      <div className="shrink-0 print:hidden">
        <Header userEmail={user.email} userRole={user.role} userName={user.full_name} />
      </div>
      <div className="flex flex-1 min-h-0 w-full overflow-hidden">
        <Sidebar userRole={user.role} />
        <main className="flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-4 md:p-6 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
      <div className="shrink-0 print:hidden">
        <Footer />
      </div>
    </div>
  );
}