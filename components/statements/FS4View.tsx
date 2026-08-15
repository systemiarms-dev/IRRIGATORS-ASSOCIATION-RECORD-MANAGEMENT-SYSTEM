'use client';

import React from 'react';
import { FS4Data, FinancialStatementEdits } from '@/types';
import { NumberField, TextField } from './editable';

interface FS4ViewProps {
  data: FS4Data;
  editable?: boolean;
  edits?: FinancialStatementEdits;
  onFieldChange?: (path: string, value: number | string) => void;
}

const P = 'fs4.';

const LOCKED = new Set([
  'assets.cashOnHand',
  'assets.cashInBank',
  'assets.totalAssets',
  'liabilities.totalLiabilities',
  'netWorth',
]);

export default function FS4View({ data, editable = false, edits, onFieldChange }: FS4ViewProps) {
  const a = data.assets;
  const l = data.liabilities;
  const n = data.notaryBlock;

  const forced = (p: string) => edits?.[`${P}${p}`]?.mode === 'force';
  const locked = (p: string) => LOCKED.has(p);
  const set = (p: string) => (v: number | string) => onFieldChange?.(`${P}${p}`, v);
  const unpin = (p: string) => () => onFieldChange?.(`${P}${p}:unpin`, '');
  const cellEditable = (p: string) => editable && !locked(p);

  const row = (label: string, path: string, value: number) => (
    <div className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 py-1 border-b border-slate-100 min-w-0">
      <span>{label}</span>
      <span className="font-mono shrink-0">
        <NumberField value={value} editable={cellEditable(path)} hasOverride={forced(path)} onCommit={set(path)} onRemove={unpin(path)} emptyWhenZero />
      </span>
    </div>
  );
  const totalRow = (label: string, path: string, value: number, highlight: 'slate' | 'emerald' = 'slate') => (
    <div className={`flex justify-between py-2 font-bold text-sm border-t-2 border-b-2 border-slate-900 ${highlight === 'emerald' ? 'bg-emerald-50 text-emerald-950' : 'bg-slate-50'}`}>
      <span>{label}</span>
      <span className="font-mono font-extrabold">
        <NumberField value={value} editable={cellEditable(path)} hasOverride={forced(path)} onCommit={set(path)} onRemove={unpin(path)} />
      </span>
    </div>
  );

  return (
    <div className="bg-white text-slate-900 p-4 sm:p-6 rounded-xl shadow-2xl space-y-4 w-[210mm] max-w-full mx-auto overflow-x-auto print:overflow-visible border border-slate-300 print:shadow-none print:border-none print:p-0 print:space-y-1.5 print:text-[8pt] print:leading-tight printable-statement">
      {/* Header */}
      <div className="space-y-1 border-b pb-4 border-slate-400">
        <div className="text-xs font-semibold">
          Name of Irrigators Association:{' '}
          <span className="font-bold text-slate-900">
            <TextField value={data.associationName} editable={editable} hasOverride={forced('associationName')} onCommit={set('associationName')} onRemove={unpin('associationName')} inputClassName="w-56" />
          </span>
        </div>
        <div className="text-xs">
          Address:{' '}
          <span className="font-medium text-slate-800">
            <TextField value={data.address} editable={editable} hasOverride={forced('address')} onCommit={set('address')} onRemove={unpin('address')} inputClassName="w-56" />
          </span>
        </div>
        <div className="text-xs flex flex-wrap gap-3 sm:gap-6 font-mono text-slate-700">
          <span>SEC Registration No. :{' '}
            <TextField value={data.secRegNo} editable={editable} hasOverride={forced('secRegNo')} onCommit={set('secRegNo')} onRemove={unpin('secRegNo')} inputClassName="w-28" />
          </span>
          <span>TIN NO. :{' '}
            <TextField value={data.tinNo} editable={editable} hasOverride={forced('tinNo')} onCommit={set('tinNo')} onRemove={unpin('tinNo')} inputClassName="w-28" />
          </span>
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
          {row('CASH ON HAND', 'assets.cashOnHand', a.cashOnHand)}
          {row('CASH IN BANK', 'assets.cashInBank', a.cashInBank)}
          {row('RECEIVABLES : (CASH ADVANCE, LOANS, ETC)', 'assets.receivables', a.receivables)}

          <div className="pt-2">
            <div className="font-semibold text-slate-900 uppercase text-[11px]">MATERIALS AND SUPPLIES INVENTORY:</div>
            <div className="pl-4 text-slate-700 text-[11px] italic">
              Cleaning tools, grass cutters, equipment, office tables, cabinets, etc.
            </div>
            <div className="flex justify-end pt-1 font-mono">
              <NumberField value={a.materialsSuppliesInventory} editable={cellEditable('assets.materialsSuppliesInventory')} hasOverride={forced('assets.materialsSuppliesInventory')} onCommit={set('assets.materialsSuppliesInventory')} onRemove={unpin('assets.materialsSuppliesInventory')} emptyWhenZero />
            </div>
          </div>

          {row('IA OFFICE BUILDING', 'assets.officeBuilding', a.officeBuilding)}

          {totalRow('TOTAL ASSETS', 'assets.totalAssets', a.totalAssets)}
        </div>
      </div>

      {/* Section II. LIABILITIES */}
      <div className="space-y-3 pt-2">
        <div className="text-xs font-bold uppercase text-slate-900">
          II. LIABILITIES
        </div>

        <div className="space-y-1.5 text-xs pl-4">
          {row('Notarial Services, Permit Fees, etc.', 'liabilities.notarialPermitFees', l.notarialPermitFees)}
          {row('Honorarium/wages payables', 'liabilities.honorariumWagesPayable', l.honorariumWagesPayable)}
          {row('Other Accounts Payables', 'liabilities.otherAccountsPayable', l.otherAccountsPayable)}

          {totalRow('TOTAL LIABILITIES', 'liabilities.totalLiabilities', l.totalLiabilities)}
        </div>
      </div>

      {/* Section III. NET WORTH */}
      <div className="space-y-3 pt-2">
        <div className="text-xs font-bold uppercase text-slate-900">
          III. NET WORTH (Assets less Liabilities)
        </div>
        {totalRow('NET WORTH', 'netWorth', data.netWorth, 'emerald')}
      </div>

      {/* Certification statement */}
      <div className="pt-4 text-xs italic font-medium text-slate-800">
        I HEREBY CERTIFY THAT the foregoing information is true and correct.
      </div>

      {/* Treasurer Sign block */}
      <div className="pt-6 flex justify-start sm:justify-end text-xs text-slate-900">
        <div className="w-full max-w-xs sm:w-64 text-center">
          <div className="border-b border-slate-900 font-bold pb-1 font-mono uppercase">
            <TextField value={data.officer.treasurerName} editable={editable} hasOverride={forced('officer.treasurerName')} onCommit={set('officer.treasurerName')} onRemove={unpin('officer.treasurerName')} inputClassName="w-40 text-center" />
          </div>
          <div className="text-[11px] text-slate-700 mt-0.5">IA TREASURER</div>
          <div className="text-[11px] text-slate-600 font-mono">
            TIN ID No.:{' '}
            <TextField value={data.officer.treasurerTin} editable={editable} hasOverride={forced('officer.treasurerTin')} onCommit={set('officer.treasurerTin')} onRemove={unpin('officer.treasurerTin')} inputClassName="w-32 text-center" />
          </div>
        </div>
      </div>

      {/* Notarization / Jurat Block */}
      <div className="pt-8 border-t border-slate-300 space-y-4 text-xs text-slate-800">
        <div className="space-y-1">
          <div>Republic of the Philippines )</div>
          <div>Province of{' '}
            <TextField value={n.province} editable={editable} hasOverride={forced('notaryBlock.province')} onCommit={set('notaryBlock.province')} onRemove={unpin('notaryBlock.province')} inputClassName="w-32" />
            {' ) s.s'}
          </div>
          <div>Municipality of{' '}
            <TextField value={n.municipality} editable={editable} hasOverride={forced('notaryBlock.municipality')} onCommit={set('notaryBlock.municipality')} onRemove={unpin('notaryBlock.municipality')} inputClassName="w-32" />
            {' )'}
          </div>
        </div>

        <p className="leading-relaxed">
          SUBSCRIBED AND SWORN TO before me this ____ day of ____________ 20___ affiant exhibiting to me his Community Tax Certificate No.{' '}
          <span className="underline font-mono">
            <TextField value={n.ctcNo} editable={editable} hasOverride={forced('notaryBlock.ctcNo')} onCommit={set('notaryBlock.ctcNo')} onRemove={unpin('notaryBlock.ctcNo')} inputClassName="w-28" />
          </span>{' '}
          issued on{' '}
          <span className="underline font-mono">
            <TextField value={n.ctcIssuedOn} editable={editable} hasOverride={forced('notaryBlock.ctcIssuedOn')} onCommit={set('notaryBlock.ctcIssuedOn')} onRemove={unpin('notaryBlock.ctcIssuedOn')} inputClassName="w-28" />
          </span>{' '}
          20___ at{' '}
          <span className="underline">
            <TextField value={n.ctcIssuedAt} editable={editable} hasOverride={forced('notaryBlock.ctcIssuedAt')} onCommit={set('notaryBlock.ctcIssuedAt')} onRemove={unpin('notaryBlock.ctcIssuedAt')} inputClassName="w-28" />
          </span>
          , Cagayan.
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