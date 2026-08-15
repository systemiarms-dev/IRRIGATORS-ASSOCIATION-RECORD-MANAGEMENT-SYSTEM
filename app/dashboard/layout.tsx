import React from 'react';
import { redirect } from 'next/navigation';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import Footer from '@/components/layout/Footer';
import { getSessionUser } from '@/lib/auth/session';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  if (!user) {
    redirect('/login');
  }

  const associationName = user.association?.name || (user.role === 'super_admin' ? 'IARMS' : 'Irrigators Association');
  const associationCode = user.association?.code || (user.role === 'super_admin' ? 'IARMS' : 'IA');

  return (
    <div
      className="h-screen supports-[height:100dvh]:h-dvh overflow-hidden flex flex-col bg-cover bg-center bg-no-repeat bg-fixed text-slate-900 print:h-auto print:overflow-visible print:bg-none print:block"
      style={{ backgroundImage: `linear-gradient(rgba(248, 250, 252, 0.83), rgba(248, 250, 252, 0.83)), url('/bg.png')` }}
    >
      <div className="shrink-0 print:hidden">
        <Header 
          username={user.username || 'user'}
          userRole={user.role} 
          userName={user.full_name}
          associationName={associationName}
          associationCode={associationCode}
        />
      </div>
      <div className="flex flex-1 min-h-0 w-full overflow-hidden print:overflow-visible print:min-h-0 print:h-auto print:block">
        <Sidebar 
          userRole={user.role} 
          associationName={associationName}
          associationCode={associationCode}
        />
        <main className="flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-4 md:p-6 max-w-7xl mx-auto w-full print:overflow-visible print:min-h-0 print:h-auto print:p-0">
          {children}
        </main>
      </div>
      <div className="shrink-0 print:hidden">
        <Footer />
      </div>
    </div>
  );
}