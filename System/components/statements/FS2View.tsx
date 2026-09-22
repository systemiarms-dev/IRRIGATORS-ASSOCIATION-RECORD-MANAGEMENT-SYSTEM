'use client';

import React from 'react';
import { FS2Data } from '@/types';
import { formatPHP } from '@/lib/utils/formatters';

interface FS2ViewProps {
  data: FS2Data;
}

export default function FS2View({ data }: FS2ViewProps) {
  const cf = data.cashFlows;
  const fc = data.financialCondition;

  return (
    <div className="bg-white text-slate-900 font-sans p-4 sm:p-8 rounded-xl shadow-2xl space-y-4 sm:space-y-6 w-full border border-slate-300 print:shadow-none print:border-none print:p-0 print:space-y-1.5 print:text-[8pt] print:leading-tight printable-statement">
      {/* Header */}
      <div className="text-center space-y-1 border-b pb-4 border-slate-400">
        <h2 className="text-lg font-bold uppercase tracking-wide text-slate-900">{data.associationName}</h2>
        <div className="text-xs text-slate-700 uppercase font-medium">{data.address}</div>
        <div className="text-xs text-slate-600 font-mono">SEC Reg. No. {data.secRegNo}</div>

        <div className="pt-4">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">
            STATEMENT OF CASH FLOWS
          </h3>
          <div className="text-xs italic text-slate-700">
            For the year Ending December 31, {data.yearCurrent} & {data.yearPrior}
          </div>
        </div>
      </div>

      {/* Cash Flows Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-slate-900 border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-900 text-slate-900">
              <th className="text-left py-2 px-1 font-bold">Cash Flows from Operating Activities</th>
              <th className="text-right py-2 px-3 font-bold w-36">{data.yearCurrent}</th>
              <th className="text-right py-2 px-3 font-bold w-36">{data.yearPrior}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            <tr>
              <td className="py-2 px-3">Net Surplus for the Year</td>
              <td className="text-right py-2 px-3 font-mono font-semibold">{formatPHP(cf.netSurplus.current)}</td>
              <td className="text-right py-2 px-3 font-mono font-semibold">{formatPHP(cf.netSurplus.prior)}</td>
            </tr>
            <tr>
              <td className="py-2 px-3">Inventory of Supplies/Equipment Depreciation</td>
              <td className="text-right py-2 px-3 font-mono">{cf.depreciation.current ? formatPHP(cf.depreciation.current) : '-'}</td>
              <td className="text-right py-2 px-3 font-mono">{cf.depreciation.prior ? formatPHP(cf.depreciation.prior) : '-'}</td>
            </tr>
            <tr>
              <td className="py-2 px-3 font-medium">Add: Cash Balance Beginning</td>
              <td className="text-right py-2 px-3 font-mono">{formatPHP(cf.cashBalanceBeginning.current)}</td>
              <td className="text-right py-2 px-3 font-mono">{formatPHP(cf.cashBalanceBeginning.prior)}</td>
            </tr>
            <tr className="font-extrabold border-t-2 border-b-2 border-slate-900 bg-slate-100">
              <td className="py-2.5 px-1">Cash Balance at the End of the Year</td>
              <td className="text-right py-2.5 px-3 font-mono">{formatPHP(cf.cashBalanceEnd.current)}</td>
              <td className="text-right py-2.5 px-3 font-mono">{formatPHP(cf.cashBalanceEnd.prior)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Comparative Statement of Financial Condition */}
      <div className="pt-6 border-t-2 border-slate-900 space-y-4">
        <div className="text-center">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">
            COMPARATIVE STATEMENT OF FINANCIAL CONDITION
          </h3>
          <div className="text-xs italic text-slate-700">
            As of December 31, {data.yearPrior} & {data.yearCurrent}
          </div>
        </div>

        <table className="w-full text-xs text-slate-900 border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-900">
              <th className="text-left py-2 px-1 font-bold">ASSETS</th>
              <th className="text-right py-2 px-3 font-bold w-36">{data.yearPrior}</th>
              <th className="text-right py-2 px-3 font-bold w-36">{data.yearCurrent}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            <tr>
              <td className="py-2 px-3">Current Asset</td>
              <td className="text-right py-2 px-3 font-mono">{formatPHP(fc.assets.currentAssets.prior)}</td>
              <td className="text-right py-2 px-3 font-mono">{formatPHP(fc.assets.currentAssets.current)}</td>
            </tr>
            <tr>
              <td className="py-2 px-3">Inventory of Supplies/Equipment</td>
              <td className="text-right py-2 px-3 font-mono">{fc.assets.inventorySupplies.prior ? formatPHP(fc.assets.inventorySupplies.prior) : '-'}</td>
              <td className="text-right py-2 px-3 font-mono">{fc.assets.inventorySupplies.current ? formatPHP(fc.assets.inventorySupplies.current) : '-'}</td>
            </tr>
            <tr className="font-extrabold border-t-2 border-b-2 border-slate-900 bg-slate-50">
              <td className="py-2 px-1">Total Assets</td>
              <td className="text-right py-2 px-3 font-mono">{formatPHP(fc.assets.totalAssets.prior)}</td>
              <td className="text-right py-2 px-3 font-mono">{formatPHP(fc.assets.totalAssets.current)}</td>
            </tr>

            {/* Liabilities & Member's Equity */}
            <tr className="border-t-2 border-slate-900 bg-slate-100">
              <td colSpan={3} className="py-2 px-1 font-bold">LIABILITIES &amp; MEMBER&apos;S EQUITY</td>
            </tr>
            <tr>
              <td className="py-2 px-3 font-medium">Liabilities</td>
              <td className="text-right py-2 px-3 font-mono"></td>
              <td className="text-right py-2 px-3 font-mono"></td>
            </tr>
            <tr>
              <td className="py-1.5 px-6">Current Liabilities</td>
              <td className="text-right py-1.5 px-3 font-mono">{fc.liabilitiesEquity.currentLiabilities.prior ? formatPHP(fc.liabilitiesEquity.currentLiabilities.prior) : '-'}</td>
              <td className="text-right py-1.5 px-3 font-mono">{fc.liabilitiesEquity.currentLiabilities.current ? formatPHP(fc.liabilitiesEquity.currentLiabilities.current) : '-'}</td>
            </tr>
            <tr>
              <td className="py-1.5 px-6">Non-Current Liabilities</td>
              <td className="text-right py-1.5 px-3 font-mono">{fc.liabilitiesEquity.nonCurrentLiabilities.prior ? formatPHP(fc.liabilitiesEquity.nonCurrentLiabilities.prior) : '0'}</td>
              <td className="text-right py-1.5 px-3 font-mono">{fc.liabilitiesEquity.nonCurrentLiabilities.current ? formatPHP(fc.liabilitiesEquity.nonCurrentLiabilities.current) : '0'}</td>
            </tr>
            <tr>
              <td className="py-1.5 px-6 font-semibold">Member&apos;s Equity</td>
              <td className="text-right py-1.5 px-3 font-mono font-semibold">{formatPHP(fc.liabilitiesEquity.membersEquity.prior)}</td>
              <td className="text-right py-1.5 px-3 font-mono font-semibold">{formatPHP(fc.liabilitiesEquity.membersEquity.current)}</td>
            </tr>
            <tr className="font-extrabold border-t-2 border-b-2 border-slate-900 bg-emerald-50 text-emerald-950">
              <td className="py-2.5 px-1">Total Liabilities &amp; Member&apos;s Equity</td>
              <td className="text-right py-2.5 px-3 font-mono">{formatPHP(fc.liabilitiesEquity.totalLiabilitiesEquity.prior)}</td>
              <td className="text-right py-2.5 px-3 font-mono">{formatPHP(fc.liabilitiesEquity.totalLiabilitiesEquity.current)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Signature Section */}
      <div className="pt-12 grid grid-cols-1 sm:grid-cols-2 signature-grid gap-6 sm:gap-8 print:grid-cols-2 text-xs text-slate-900">
        <div>
          <div className="text-slate-700 mb-8 font-medium">Certified Correct:</div>
          <div className="border-b border-slate-900 w-full sm:w-48 font-bold text-center pb-1 font-mono uppercase">
            {data.officers.treasurerName}
          </div>
          <div className="text-[11px] text-slate-600 text-center w-full sm:w-48 mt-0.5">IA Treasurer</div>
        </div>

        <div>
          <div className="text-slate-700 mb-8 font-medium">Noted by:</div>
          <div className="border-b border-slate-900 w-full sm:w-48 font-bold text-center pb-1 font-mono uppercase">
            {data.officers.presidentName}
          </div>
          <div className="text-[11px] text-slate-600 text-center w-full sm:w-48 mt-0.5">IA President</div>
        </div>
      </div>
    </div>
  );
}
