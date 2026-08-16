import type { Metadata } from 'next';
import { Public_Sans } from 'next/font/google';
import ServiceWorkerRegister from '@/components/pwa/ServiceWorkerRegister';
import './globals.css';

const publicSans = Public_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'IARMS',
  description: 'Irrigation Record & Financial Management System (IARMS) for Irrigators Associations.',
  applicationName: 'IARMS',
  icons: {
    icon: '/Iarmslogo.png',
    shortcut: '/Iarmslogo.png',
    apple: '/icons/icon-192.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${publicSans.variable} min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans antialiased`}>
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
