'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import InstallAppButton from '@/components/pwa/InstallAppButton';

export default function LandingPage() {
  return (
    <div className="lg:h-[100dvh] lg:overflow-hidden relative flex flex-col text-white selection:bg-[#00843D] selection:text-white bg-[#002b13] min-h-screen">
      {/* High-Visibility Scenic Background Image */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat pointer-events-none opacity-85"
        style={{ backgroundImage: `url('/bg.png')` }}
      />
      {/* Soft Translucent Glass Tint - NIA Emerald Tone */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#003619]/55 via-[#005C2B]/35 to-[#002410]/65 pointer-events-none" />

      {/* 1. Header Bar (Logo & System Name on the Left) */}
      <header className="relative z-10 shrink-0 bg-gradient-to-r from-[#005C2B] via-[#00843D] to-[#004721] border-b border-[#00A84D]/40 px-4 sm:px-8 py-3 shadow-md">
        <div className="w-full flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/api/logo?v=latest"
            alt="NIA IARMS Logo"
            className="w-9 h-9 sm:w-10 sm:h-10 object-contain drop-shadow-md shrink-0"
          />
          <div>
            <span className="text-xs sm:text-[13px] font-black tracking-tight text-white uppercase block leading-tight">
              IRRIGATORS ASSOCIATION RECORD MANAGEMENT SYSTEM
            </span>
            <span className="text-[10px] text-emerald-200 font-extrabold tracking-widest uppercase block">
              National Irrigation Administration (NIA) &bull; Region 02
            </span>
          </div>
        </div>
      </header>

      {/* 2. Centered Hero */}
      <main className="relative z-10 flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-10 flex flex-col justify-center items-center text-center min-h-0">
        <div className="flex flex-col items-center gap-6">
          {/* Logo */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/api/logo?v=latest"
            alt="NIA IARMS Logo"
            className="w-40 h-40 sm:w-48 sm:h-48 object-contain drop-shadow-md animate-in zoom-in-95 fade-in duration-700"
          />

          {/* Headline */}
          <h1 className="text-xl sm:text-2xl lg:text-[30px] font-black tracking-tight leading-snug text-white animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
            IRRIGATORS ASSOCIATION RECORD MANAGEMENT SYSTEM
          </h1>

          {/* Accent Line */}
          <div className="w-16 h-1 rounded-full bg-gradient-to-r from-[#00843D] via-[#00A84D] to-[#00843D] animate-in fade-in duration-700 delay-200" />

          {/* Description */}
          <p className="text-xs sm:text-sm text-emerald-50 max-w-lg leading-relaxed font-medium animate-in fade-in slide-in-from-bottom-2 duration-700 delay-300">
            Official record management, financial statement generation (FS1&ndash;FS4), and
            collection ledgers for Irrigators Associations.
          </p>

          {/* Primary Call to Action Button */}
          <Link
            href="/login"
            className="group mt-1 px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#00843D] to-[#005C2B] hover:from-[#00A84D] hover:to-[#00843D] text-white font-bold text-sm transition-all shadow-lg shadow-emerald-950/40 flex items-center gap-2 active:scale-95 hover:scale-[1.02] animate-in fade-in slide-in-from-bottom-2 duration-700 delay-400"
          >
            <span>Sign In to Portal</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>

          {/* Install App Button */}
          <div className="mt-2 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-500">
            <InstallAppButton
              className="w-full"
              buttonClassName="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold transition-all"
            />
          </div>
        </div>
      </main>

      {/* 3. Centered Footer */}
      <footer className="relative z-10 shrink-0 bg-[#004721]/95 border-t border-[#00A84D]/30 px-4 sm:px-8 py-2.5 text-[10px] sm:text-[10.5px] text-emerald-200 mt-auto">
        <div className="w-full flex justify-center text-center">
          <span className="font-medium">
            IRRIGATORS ASSOCIATION RECORD MANAGEMENT SYSTEM &bull; National Irrigation Administration (NIA) &bull; Region 02
          </span>
        </div>
      </footer>
    </div>
  );
}
