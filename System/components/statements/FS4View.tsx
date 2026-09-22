'use client';

import React from 'react';
import { FS4Data } from '@/types';
import { formatPHP } from '@/lib/utils/formatters';

interface FS4ViewProps {
  data: FS4Data;
}

export default function FS4View({ data }: FS4ViewProps) {
  const a = data.assets;
  const l = data.liabilities;
  const n = data.notaryBlock;

  return (
    <div className="bg-white text-slate-900 font-sans p-4 sm:p-8 rounded-xl shadow-2xl space-y-4 sm:space-y-6 w-full border border-slate-300 print:shadow-none print:border-none print:p-0 print:space-y-1.5 print:text-[8pt] print:leading-tight printable-statement">
      {/* Header */}
      <div className="space-y-1 border-b pb-4 border-slate-400">
        <div className="text-xs font-semibold">Name of Irrigators Association: <span className="font-bold text-slate-900">{data.associationName}</span></div>
        <div className="text-xs">Address: <span className="font-medium text-slate-800">{data.address}</span></div>
        <div className="text-xs flex flex-wrap gap-3 sm:gap-6 font-mono text-slate-700">
          <span>SEC Registration No. : {data.secRegNo}</span>
          <span>TIN NO. : {data.tinNo}</span>
        </div>

        <div className="pt-4 text-center">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">
            BALANCE SHEET
          </h3>
          <div className="text-xs italic text-slate-700">
            As of {data.asOfDate}
          </div>
        </div>
      </div>

      {/* Section I. ASSETS */}
      <div className="space-y-3">
        <div className="text-xs font-bold uppercase text-slate-900">
          I. ASSETS
        </div>

        <div className="space-y-1.5 text-xs pl-4">
          <div className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 py-1 border-b border-slate-100 min-w-0">
            <span>CASH ON HAND</span>
            <span className="font-mono shrink-0">{a.cashOnHand ? formatPHP(a.cashOnHand) : 'P -'}</span>
          </div>
          <div className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 py-1 border-b border-slate-100 min-w-0">
            <span>CASH IN BANK</span>
            <span className="font-mono shrink-0">{a.cashInBank ? formatPHP(a.cashInBank) : 'P -'}</span>
          </div>
          <div className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 py-1 border-b border-slate-100 min-w-0">
            <span>RECEIVABLES : (CASH ADVANCE, LOANS, ETC)</span>
            <span className="font-mono shrink-0">{a.receivables ? formatPHP(a.receivables) : 'P -'}</span>
          </div>

          <div className="pt-2">
            <div className="font-semibold text-slate-900 uppercase text-[11px]">MATERIALS AND SUPPLIES INVENTORY:</div>
            <div className="pl-4 text-slate-700 text-[11px] italic">
              Cleaning tools, grass cutters, equipment, office tables, cabinets, etc.
            </div>
            <div className="flex justify-end pt-1 font-mono">{a.materialsSuppliesInventory ? formatPHP(a.materialsSuppliesInventory) : 'P -'}</div>
          </div>

          <div className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 py-1 border-b border-slate-100 min-w-0">
            <span>IA OFFICE BUILDING</span>
            <span className="font-mono shrink-0">{a.officeBuilding ? formatPHP(a.officeBuilding) : 'P -'}</span>
          </div>

          <div className="flex justify-between py-2 font-bold text-sm border-t-2 border-b-2 border-slate-900 bg-slate-50">
            <span>TOTAL ASSETS</span>
            <span className="font-mono font-extrabold">{formatPHP(a.totalAssets)}</span>
          </div>
        </div>
      </div>

      {/* Section II. LIABILITIES */}
      <div className="space-y-3 pt-2">
        <div className="text-xs font-bold uppercase text-slate-900">
          II. LIABILITIES
        </div>

        <div className="space-y-1.5 text-xs pl-4">
          <div className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 py-1 border-b border-slate-100 min-w-0">
            <span>Notarial Services, Permit Fees, etc.</span>
            <span className="font-mono shrink-0">{l.notarialPermitFees ? formatPHP(l.notarialPermitFees) : 'P -'}</span>
          </div>
          <div className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 py-1 border-b border-slate-100 min-w-0">
            <span>Honorarium/wages payables</span>
            <span className="font-mono shrink-0">{l.honorariumWagesPayable ? formatPHP(l.honorariumWagesPayable) : 'P -'}</span>
          </div>
          <div className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 py-1 border-b border-slate-100 min-w-0">
            <span>Other Accounts Payables</span>
            <span className="font-mono shrink-0">{l.otherAccountsPayable ? formatPHP(l.otherAccountsPayable) : 'P -'}</span>
          </div>

          <div className="flex justify-between py-2 font-bold text-sm border-t-2 border-b-2 border-slate-900 bg-slate-50">
            <span>TOTAL LIABILITIES</span>
            <span className="font-mono font-extrabold">{formatPHP(l.totalLiabilities)}</span>
          </div>
        </div>
      </div>

      {/* Section III. NET WORTH */}
      <div className="space-y-3 pt-2">
        <div className="text-xs font-bold uppercase text-slate-900">
          III. NET WORTH (Assets less Liabilities)
        </div>
        <div className="flex justify-between py-2.5 px-4 font-extrabold text-sm border-t-2 border-b-2 border-slate-900 bg-emerald-50 text-emerald-950">
          <span>NET WORTH</span>
          <span className="font-mono shrink-0">{formatPHP(data.netWorth)}</span>
        </div>
      </div>

      {/* Certification statement */}
      <div className="pt-4 text-xs italic font-medium text-slate-800">
        I HEREBY CERTIFY THAT the foregoing information is true and correct.
      </div>

      {/* Treasurer Sign block */}
      <div className="pt-6 flex justify-start sm:justify-end text-xs text-slate-900">
        <div className="w-full max-w-xs sm:w-64 text-center">
          <div className="border-b border-slate-900 font-bold pb-1 font-mono uppercase">
            {data.officer.treasurerName}
          </div>
          <div className="text-[11px] text-slate-700 mt-0.5">IA TREASURER</div>
          <div className="text-[11px] text-slate-600 font-mono">TIN ID No.: {data.officer.treasurerTin}</div>
        </div>
      </div>

      {/* Notarization / Jurat Block */}
      <div className="pt-8 border-t border-slate-300 space-y-4 text-xs text-slate-800">
        <div className="space-y-1">
          <div>Republic of the Philippines )</div>
          <div>Province of {n.province} ) s.s</div>
          <div>Municipality of {n.municipality} )</div>
        </div>

        <p className="leading-relaxed">
          SUBSCRIBED AND SWORN TO before me this ____ day of ____________ 20___ affiant exhibiting to me his Community Tax Certificate No. <span className="underline font-mono">{n.ctcNo}</span> issued on <span className="underline font-mono">{n.ctcIssuedOn}</span> 20___ at <span className="underline">{n.ctcIssuedAt}</span>, Cagayan.
        </p>

        <div className="pt-6 flex justify-end">
          <div className="w-56 text-center space-y-1">
            <div className="border-b border-slate-900 pb-1 font-bold">Notary Public</div>
            <div className="text-[11px] text-left text-slate-600 space-y-0.5 pt-1 font-mono">
              <div>PTR No. _________________</div>
              <div>Issued at ________________, Cagayan</div>
              <div>Until _____________________</div>
            </div>
          </div>
        </div>

        <div className="pt-4 font-mono text-[11px] text-slate-600 space-y-0.5">
          <div>Doc. No. ________</div>
          <div>Page No. ________</div>
          <div>Book No. ________</div>
          <div>Series of 202_</div>
        </div>
      </div>
    </div>
  );
}
