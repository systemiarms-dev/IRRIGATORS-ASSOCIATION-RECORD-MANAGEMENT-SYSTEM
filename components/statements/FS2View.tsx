'use client';

import React from 'react';
import { FS2Data, FinancialStatementEdits } from '@/types';
import { NumberField, TextField } from './editable';

interface FS2ViewProps {
  data: FS2Data;
  editable?: boolean;
  edits?: FinancialStatementEdits;
  onFieldChange?: (path: string, value: number | string) => void;
}

const P = 'fs2.';

const LOCKED = new Set([
  'cashFlows.netSurplus.current',
  'cashFlows.netSurplus.prior',
  'cashFlows.cashBalanceBeginning.current',
  'cashFlows.cashBalanceBeginning.prior',
  'cashFlows.cashBalanceEnd.current',
  'cashFlows.cashBalanceEnd.prior',
  'financialCondition.assets.currentAssets.current',
  'financialCondition.assets.currentAssets.prior',
  'financialCondition.assets.totalAssets.current',
  'financialCondition.assets.totalAssets.prior',
  'financialCondition.liabilitiesEquity.membersEquity.current',
  'financialCondition.liabilitiesEquity.membersEquity.prior',
  'financialCondition.liabilitiesEquity.totalLiabilitiesEquity.current',
  'financialCondition.liabilitiesEquity.totalLiabilitiesEquity.prior',
]);

export default function FS2View({ data, editable = false, edits, onFieldChange }: FS2ViewProps) {
  const cf = data.cashFlows;
  const fc = data.financialCondition;

  const forced = (p: string) => edits?.[`${P}${p}`]?.mode === 'force';
  const locked = (p: string) => LOCKED.has(p);
  const set = (p: string) => (v: number | string) => onFieldChange?.(`${P}${p}`, v);
  const unpin = (p: string) => () => onFieldChange?.(`${P}${p}:unpin`, '');
  const cellEditable = (p: string) => editable && !locked(p);

  const cell = (path: string, value: number, bold = false) => (
    <td className={`text-right py-2 px-3 font-mono align-middle ${bold ? 'font-extrabold' : ''}`}>
      <NumberField value={value} editable={cellEditable(path)} hasOverride={forced(path)} onCommit={set(path)} onRemove={unpin(path)} />
    </td>
  );
  const cellSub = (path: string, value: number) => (
    <td className="text-right py-1.5 px-3 font-mono align-middle">
      <NumberField value={value} editable={cellEditable(path)} hasOverride={forced(path)} onCommit={set(path)} onRemove={unpin(path)} emptyWhenZero />
    </td>
  );

  return (
    <div className="bg-white text-slate-900 p-4 sm:p-6 rounded-xl shadow-2xl space-y-4 w-[210mm] max-w-full mx-auto overflow-x-auto print:overflow-visible border border-slate-300 print:shadow-none print:border-none print:p-0 print:space-y-1.5 print:text-[8pt] print:leading-tight printable-statement">
      {/* Header */}
      <div className="text-center space-y-1 border-b pb-4 border-slate-400">
        <h2 className="text-lg font-bold uppercase tracking-wide text-slate-900">
          <TextField value={data.associationName} editable={editable} hasOverride={forced('associationName')} onCommit={set('associationName')} onRemove={unpin('associationName')} inputClassName="w-64 text-center" />
        </h2>
        <div className="text-xs text-slate-700 uppercase font-medium">
          <TextField value={data.address} editable={editable} hasOverride={forced('address')} onCommit={set('address')} onRemove={unpin('address')} inputClassName="w-56 text-center" />
        </div>
        <div className="text-xs text-slate-600 font-mono">
          SEC Reg. No.{' '}
          <TextField value={data.secRegNo} editable={editable} hasOverride={forced('secRegNo')} onCommit={set('secRegNo')} onRemove={unpin('secRegNo')} inputClassName="w-32" />
        </div>

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
              {cell('cashFlows.netSurplus.current', cf.netSurplus.current, true)}
              {cell('cashFlows.netSurplus.prior', cf.netSurplus.prior, true)}
            </tr>
            <tr>
              <td className="py-2 px-3">Inventory of Supplies/Equipment Depreciation</td>
              {cellSub('cashFlows.depreciation.current', cf.depreciation.current)}
              {cellSub('cashFlows.depreciation.prior', cf.depreciation.prior)}
            </tr>
            <tr>
              <td className="py-2 px-3 font-medium">Add: Cash Balance Beginning</td>
              {cell('cashFlows.cashBalanceBeginning.current', cf.cashBalanceBeginning.current)}
              {cell('cashFlows.cashBalanceBeginning.prior', cf.cashBalanceBeginning.prior)}
            </tr>
            <tr className="font-extrabold border-t-2 border-b-2 border-slate-900 bg-slate-100">
              <td className="py-2.5 px-1">Cash Balance at the End of the Year</td>
              {cell('cashFlows.cashBalanceEnd.current', cf.cashBalanceEnd.current, true)}
              {cell('cashFlows.cashBalanceEnd.prior', cf.cashBalanceEnd.prior, true)}
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
              {cell('financialCondition.assets.currentAssets.prior', fc.assets.currentAssets.prior)}
              {cell('financialCondition.assets.currentAssets.current', fc.assets.currentAssets.current)}
            </tr>
            <tr>
              <td className="py-2 px-3">Inventory of Supplies/Equipment</td>
              {cellSub('financialCondition.assets.inventorySupplies.prior', fc.assets.inventorySupplies.prior)}
              {cellSub('financialCondition.assets.inventorySupplies.current', fc.assets.inventorySupplies.current)}
            </tr>
            <tr className="font-extrabold border-t-2 border-b-2 border-slate-900 bg-slate-50">
              <td className="py-2 px-1">Total Assets</td>
              {cell('financialCondition.assets.totalAssets.prior', fc.assets.totalAssets.prior, true)}
              {cell('financialCondition.assets.totalAssets.current', fc.assets.totalAssets.current, true)}
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
              {cellSub('financialCondition.liabilitiesEquity.currentLiabilities.prior', fc.liabilitiesEquity.currentLiabilities.prior)}
              {cellSub('financialCondition.liabilitiesEquity.currentLiabilities.current', fc.liabilitiesEquity.currentLiabilities.current)}
            </tr>
            <tr>
              <td className="py-1.5 px-6">Non-Current Liabilities</td>
              {cellSub('financialCondition.liabilitiesEquity.nonCurrentLiabilities.prior', fc.liabilitiesEquity.nonCurrentLiabilities.prior)}
              {cellSub('financialCondition.liabilitiesEquity.nonCurrentLiabilities.current', fc.liabilitiesEquity.nonCurrentLiabilities.current)}
            </tr>
            <tr>
              <td className="py-1.5 px-6 font-semibold">Member&apos;s Equity</td>
              {cell('financialCondition.liabilitiesEquity.membersEquity.prior', fc.liabilitiesEquity.membersEquity.prior, true)}
              {cell('financialCondition.liabilitiesEquity.membersEquity.current', fc.liabilitiesEquity.membersEquity.current, true)}
            </tr>
            <tr className="font-extrabold border-t-2 border-b-2 border-slate-900 bg-emerald-50 text-emerald-950">
              <td className="py-2.5 px-1">Total Liabilities &amp; Member&apos;s Equity</td>
              {cell('financialCondition.liabilitiesEquity.totalLiabilitiesEquity.prior', fc.liabilitiesEquity.totalLiabilitiesEquity.prior, true)}
              {cell('financialCondition.liabilitiesEquity.totalLiabilitiesEquity.current', fc.liabilitiesEquity.totalLiabilitiesEquity.current, true)}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Signature Section */}
      <div className="pt-12 grid grid-cols-1 sm:grid-cols-2 signature-grid gap-6 sm:gap-8 print:grid-cols-2 text-xs text-slate-900">
        <div>
          <div className="text-slate-700 mb-8 font-medium">Certified Correct:</div>
          <div className="border-b border-slate-900 w-full sm:w-48 font-bold text-center pb-1 font-mono uppercase">
            <TextField value={data.officers.treasurerName} editable={editable} hasOverride={forced('officers.treasurerName')} onCommit={set('officers.treasurerName')} onRemove={unpin('officers.treasurerName')} inputClassName="w-40 text-center" />
          </div>
          <div className="text-[11px] text-slate-600 text-center w-full sm:w-48 mt-0.5">IA Treasurer</div>
        </div>

        <div>
          <div className="text-slate-700 mb-8 font-medium">Noted by:</div>
          <div className="border-b border-slate-900 w-full sm:w-48 font-bold text-center pb-1 font-mono uppercase">
            <TextField value={data.officers.presidentName} editable={editable} hasOverride={forced('officers.presidentName')} onCommit={set('officers.presidentName')} onRemove={unpin('officers.presidentName')} inputClassName="w-40 text-center" />
          </div>
          <div className="text-[11px] text-slate-600 text-center w-full sm:w-48 mt-0.5">IA President</div>
        </div>
      </div>
    </div>
  );
}