import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'NANGURISAN LAYA FARMERS IRRIGATORS ASSOCIATION, INC.',
  description: 'Irrigation Record & Financial Management System (IARMS) for Nangurisan Laya Farmers Irrigators Association, Inc. (Ipil, Gonzaga, Cagayan).',
  icons: {
    icon: '/api/logo?v=latest',
    shortcut: '/api/logo?v=latest',
    apple: '/api/logo?v=latest',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} min-h-full flex flex-col bg-slate-50 text-slate-900 antialiased`}>
        {children}
      </body>
    </html>
  );
}
