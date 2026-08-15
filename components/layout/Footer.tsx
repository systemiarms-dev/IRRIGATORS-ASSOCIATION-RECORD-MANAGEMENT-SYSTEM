import { ShieldCheck, MapPin } from 'lucide-react';
import InstallAppButton from '@/components/pwa/InstallAppButton';

export default function Footer() {
  return (
    <footer className="w-full bg-slate-900 border-t border-slate-800 text-slate-300 py-2 px-3 sm:px-6 print:hidden">
      <div className="w-full flex flex-col gap-1.5 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-center text-[11px]">
        <div className="flex flex-col items-start min-w-0 order-1">
          <div className="font-bold text-white tracking-wide flex items-center gap-1.5 truncate max-w-full text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">NLFIA - Nangurisan Laya Farmers Irrigators Association, Inc.</span>
          </div>
          <div className="hidden sm:flex text-slate-500 items-center gap-1.5">
            <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
            <span>Ipil, Gonzaga, Cagayan &bull; SEC Reg. No. CN202060557 &bull; NIA</span>
          </div>
        </div>
        <div className="text-slate-500 font-medium text-[10px] sm:text-[11px] whitespace-nowrap shrink-0 order-3 lg:order-2 self-center lg:self-auto">
          Developed by CBEA Students &bull; NIA Region 02
        </div>
        <div className="flex items-center justify-start lg:justify-end min-w-0 order-2 lg:order-3">
          <InstallAppButton
            className="flex items-start"
            buttonClassName="text-emerald-300 hover:text-white"
          />
        </div>
      </div>
    </footer>
  );
}

