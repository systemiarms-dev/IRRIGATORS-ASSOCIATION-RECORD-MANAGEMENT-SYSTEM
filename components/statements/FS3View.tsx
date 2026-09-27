'use client';

import React from 'react';
import { FS3Data, FinancialStatementEdits } from '@/types';
import { NumberField, TextField } from './editable';

interface FS3ViewProps {
  data: FS3Data;
  editable?: boolean;
  edits?: FinancialStatementEdits;
  onFieldChange?: (path: string, value: number | string) => void;
}

const P = 'fs3.';

const LOCKED = new Set([
  'cashReceipts.total',
  'cashDisbursements.total',
  'cashBalanceThisYear',
  'fundBalanceLastReport',
  'totalCashBalance',
  'composition.total',
]);

export default function FS3View({ data, editable = false, edits, onFieldChange }: FS3ViewProps) {
  const r = data.cashReceipts;
  const d = data.cashDisbursements;
  const c = data.composition;

  const forced = (p: string) => edits?.[`${P}${p}`]?.mode === 'force';
  const locked = (p: string) => LOCKED.has(p);
  const set = (p: string) => (v: number | string) => onFieldChange?.(`${P}${p}`, v);
  const unpin = (p: string) => () => onFieldChange?.(`${P}${p}:unpin`, '');
  const cellEditable = (p: string) => editable && !locked(p);

  const row = (label: string, path: string, value: number, indent = false) => (
    <div className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 py-0.5 border-b border-slate-100 min-w-0">
      <span className={indent ? 'pl-4' : ''}>{label}</span>
      <span className="font-mono shrink-0">
        <NumberField value={value} editable={cellEditable(path)} hasOverride={forced(path)} onCommit={set(path)} onRemove={unpin(path)} emptyWhenZero />
      </span>
    </div>
  );
  const totalRow = (label: string, path: string, value: number, highlight: 'slate' | 'emerald' = 'slate') => (
    <div className={`flex justify-between py-1 font-bold text-xs print:text-[8.5pt] border-t border-b border-slate-900 ${highlight === 'emerald' ? 'bg-emerald-50' : 'bg-slate-50'}`}>
      <span className="pl-4">{label}</span>
      <span className="font-mono shrink-0">
        <NumberField value={value} editable={cellEditable(path)} hasOverride={forced(path)} onCommit={set(path)} onRemove={unpin(path)} />
      </span>
    </div>
  );

  // Dynamic receipts: standard items with non-zero or pinned values, plus extraReceipts
  const standardReceiptList = [
    { label: 'Membership Fees', path: 'cashReceipts.membershipFees', value: r.membershipFees },
    { label: 'Annual or Seasonal Dues', path: 'cashReceipts.annualDues', value: r.annualDues },
    { label: 'Fees and Penalties', path: 'cashReceipts.feesPenalties', value: r.feesPenalties },
    { label: 'Donations/Contributions', path: 'cashReceipts.donationsContributions', value: r.donationsContributions },
    { label: 'Interest Earned (Bank)', path: 'cashReceipts.interestEarned', value: r.interestEarned },
    { label: 'Operation Compensation (IA Subsidy)', path: 'cashReceipts.iaSubsidy', value: r.iaSubsidy },
    { label: 'Canal Remuneration', path: 'cashReceipts.canalRemuneration', value: r.canalRemuneration },
    { label: 'O and M Fee', path: 'cashReceipts.omFee', value: r.omFee },
    { label: 'Other Income', path: 'cashReceipts.otherIncome', value: r.otherIncome },
  ].filter((item) => Number(item.value || 0) !== 0 || forced(item.path));

  const extraReceiptList = (data.extraReceipts || []).filter((x) => Number(x.current || 0) !== 0);
  const totalReceiptItemsCount = standardReceiptList.length + extraReceiptList.length;

  // Dynamic disbursements: standard items with non-zero or pinned values, plus extraDisbursements
  const standardDisbursementList = [
    { label: 'Registration, Permit & Notarial fees', path: 'cashDisbursements.registrationPermits', value: d.registrationPermits },
    { label: 'Travel and Rep. Expenses', path: 'cashDisbursements.travelRep', value: d.travelRep },
    { label: 'Meeting Expenses', path: 'cashDisbursements.meetingExpenses', value: d.meetingExpenses },
    { label: 'Office Equipment/Supplies', path: 'cashDisbursements.officeSupplies', value: d.officeSupplies },
    { label: 'Honorarium/Salaries/Wages', path: 'cashDisbursements.salariesWages', value: d.salariesWages },
    { label: 'Canal Clearing, Repair and Maintenance Expenses', path: 'cashDisbursements.canalClearingRepair', value: d.canalClearingRepair },
    { label: 'Snacks (Meetings)', path: 'cashDisbursements.snacksMeetings', value: d.snacksMeetings },
    { label: 'Collection Expenses', path: 'cashDisbursements.collectionExpenses', value: d.collectionExpenses },
    { label: 'Misc. Expenses', path: 'cashDisbursements.miscExpenses', value: d.miscExpenses },
    { label: 'Other Expenses', path: 'cashDisbursements.otherExpenses', value: d.otherExpenses },
    { label: 'Distributed IA Share to Laterals', path: 'cashDisbursements.distributedIAShare', value: d.distributedIAShare },
    { label: 'Professional Fee', path: 'cashDisbursements.professionalFee', value: (d as any).professionalFee },
    { label: 'Federation Share', path: 'cashDisbursements.federationShare', value: (d as any).federationShare },
    { label: 'Piso Mula sa Puso', path: 'cashDisbursements.pisoMulaSaPuso', value: (d as any).pisoMulaSaPuso },
  ].filter((item) => Number(item.value || 0) !== 0 || forced(item.path));

  const extraDisbursementList = (data.extraDisbursements || []).filter((x) => Number(x.current || 0) !== 0);
  const totalDisbursementItemsCount = standardDisbursementList.length + extraDisbursementList.length;

  return (
    <div className="bg-white text-slate-900 p-4 sm:p-6 rounded-xl shadow-2xl space-y-4 w-[210mm] max-w-full mx-auto overflow-x-auto print:overflow-visible border border-slate-300 print:shadow-none print:border-none print:p-0 print:space-y-1.5 print:text-[8pt] print:leading-tight printable-statement">
      {/* Header */}
      <div className="space-y-1 border-b pb-3 border-slate-400 print:pb-1 print:space-y-0.5">
        <div className="text-xs print:text-[8pt] font-semibold">
          Name of Irrigators Association:{' '}
          <span className="font-bold text-slate-900">
            <TextField value={data.associationName} editable={editable} hasOverride={forced('associationName')} onCommit={set('associationName')} onRemove={unpin('associationName')} inputClassName="w-56" />
          </span>
        </div>
        <div className="text-xs print:text-[8pt]">
          Address:{' '}
          <span className="font-medium text-slate-800">
            <TextField value={data.address} editable={editable} hasOverride={forced('address')} onCommit={set('address')} onRemove={unpin('address')} inputClassName="w-56" />
          </span>
        </div>
        <div className="text-xs print:text-[8pt] flex flex-wrap gap-3 sm:gap-6 font-mono text-slate-700">
          <span>SEC Registration No. :{' '}
            <TextField value={data.secRegNo} editable={editable} hasOverride={forced('secRegNo')} onCommit={set('secRegNo')} onRemove={unpin('secRegNo')} inputClassName="w-28" />
          </span>
          <span>TIN NO. :{' '}
            <TextField value={data.tinNo} editable={editable} hasOverride={forced('tinNo')} onCommit={set('tinNo')} onRemove={unpin('tinNo')} inputClassName="w-28" />
          </span>
        </div>

        <div className="pt-2 print:pt-1 text-center">
          <h3 className="text-sm print:text-[9.5pt] font-extrabold uppercase tracking-wider text-slate-900">
            Cash Statement
          </h3>
          <div className="text-xs print:text-[7.5pt] italic text-slate-700">
            Ending December 31, {data.yearEnding}
          </div>
        </div>
      </div>

      {/* Receipts Table */}
      <div className="space-y-2 print:space-y-0.5">
        <div className="text-xs print:text-[8pt] font-bold uppercase text-slate-900 border-b border-slate-900 pb-0.5">
          A. CASH RECEIPTS:
        </div>

        <div className="space-y-0.5 text-xs print:text-[8pt]">
          {totalReceiptItemsCount === 0 && (
            <div className="py-1.5 text-center text-slate-400 italic">
              No cash receipts recorded for this period
            </div>
          )}

          {standardReceiptList.map((item, idx) => (
            row(`${idx + 1} ${item.label}`, item.path, item.value)
          ))}

          {extraReceiptList.map((item, idx) => (
            <div key={`er-${idx}`} className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 py-0.5 border-b border-slate-100 min-w-0">
              <span>{`${standardReceiptList.length + idx + 1} ${item.label}`}</span>
              <span className="font-mono shrink-0">
                <NumberField value={item.current} editable={false} emptyWhenZero />
              </span>
            </div>
          ))}

          {totalRow('Total Receipts', 'cashReceipts.total', r.total)}
        </div>
      </div>

      {/* Disbursements Table */}
      <div className="space-y-2 print:space-y-0.5 pt-1">
        <div className="text-xs print:text-[8pt] font-bold uppercase text-slate-900 border-b border-slate-900 pb-0.5">
          B. CASH DISBURSEMENTS:
        </div>

        <div className="space-y-0.5 text-xs print:text-[8pt]">
          {totalDisbursementItemsCount === 0 && (
            <div className="py-1.5 text-center text-slate-400 italic">
              No cash disbursements recorded for this period
            </div>
          )}

          {standardDisbursementList.map((item, idx) => (
            row(`${idx + 1} ${item.label}`, item.path, item.value)
          ))}

          {extraDisbursementList.map((item, idx) => (
            <div key={`ed-${idx}`} className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 py-0.5 border-b border-slate-100 min-w-0">
              <span>{`${standardDisbursementList.length + idx + 1} ${item.label}`}</span>
              <span className="font-mono shrink-0">
                <NumberField value={item.current} editable={false} emptyWhenZero />
              </span>
            </div>
          ))}

          {totalRow('Total Disbursement (Expenses)', 'cashDisbursements.total', d.total)}
        </div>
      </div>

      {/* Summary Section C, D, E */}
      <div className="space-y-1 text-xs print:text-[8pt] border-t border-slate-900 pt-1.5">
        <div className="flex justify-between py-0.5 font-semibold">
          <span>C. Cash Balance this year</span>
          <span className="font-mono font-bold text-emerald-700">
            <NumberField value={data.cashBalanceThisYear} editable={cellEditable('cashBalanceThisYear')} hasOverride={forced('cashBalanceThisYear')} onCommit={set('cashBalanceThisYear')} onRemove={unpin('cashBalanceThisYear')} className="text-emerald-700" />
          </span>
        </div>
        <div className="flex justify-between py-0.5">
          <span>D. Add: Fund Balance last report</span>
          <span className="font-mono shrink-0">
            <NumberField value={data.fundBalanceLastReport} editable={cellEditable('fundBalanceLastReport')} hasOverride={forced('fundBalanceLastReport')} onCommit={set('fundBalanceLastReport')} onRemove={unpin('fundBalanceLastReport')} />
          </span>
        </div>
        <div className="flex justify-between py-1 font-extrabold text-xs print:text-[8.5pt] border-t border-b border-slate-900 bg-emerald-50">
          <span>E. Total Cash Balance as of this year</span>
          <span className="font-mono shrink-0">
            <NumberField value={data.totalCashBalance} editable={cellEditable('totalCashBalance')} hasOverride={forced('totalCashBalance')} onCommit={set('totalCashBalance')} onRemove={unpin('totalCashBalance')} />
          </span>
        </div>
      </div>

      {/* Section F Composition */}
      <div className="space-y-1.5 print:space-y-0.5 pt-1">
        <div className="text-xs print:text-[8pt] font-bold uppercase text-slate-900 border-b border-slate-900 pb-0.5">
          F. Composition of Cash Balance (where the cash is):
        </div>

        <div className="space-y-0.5 text-xs print:text-[8pt]">
          {row('Cash on Hand-Petty Cash', 'composition.cashOnHandPetty', c.cashOnHandPetty, true)}
          {row('Undeposited/Unremitted Collections', 'composition.undepositedCollections', c.undepositedCollections, true)}
          {row('Cash in Bank (Regular Fund)', 'composition.cashInBankRegular', c.cashInBankRegular, true)}
          {row('Cash in Bank (CBU account)', 'composition.cashInBankCBU', c.cashInBankCBU, true)}
          {totalRow('Total Cash Balance', 'composition.total', c.total)}
        </div>
      </div>

      {/* Signature Grid */}
      <div className="pt-4 print:pt-3 grid grid-cols-1 sm:grid-cols-3 signature-grid gap-4 print:grid-cols-3 text-xs print:text-[7.5pt] text-slate-900">
        <div>
          <div className="text-slate-700 mb-3 print:mb-1 font-medium">Prepared by:</div>
          <div className="border-b border-slate-900 font-bold text-center pb-0.5 font-mono uppercase">
            <TextField value={data.officers.treasurerName} editable={editable} hasOverride={forced('officers.treasurerName')} onCommit={set('officers.treasurerName')} onRemove={unpin('officers.treasurerName')} inputClassName="w-40 text-center" />
          </div>
          <div className="text-[10px] print:text-[7pt] text-slate-600 text-center mt-0.5">IA Treasurer</div>
        </div>

        <div>
          <div className="text-slate-700 mb-3 print:mb-1 font-medium">Audited by:</div>
          <div className="border-b border-slate-900 font-bold text-center pb-0.5 font-mono uppercase">
            <TextField value={data.officers.auditorName} editable={editable} hasOverride={forced('officers.auditorName')} onCommit={set('officers.auditorName')} onRemove={unpin('officers.auditorName')} inputClassName="w-40 text-center" />
          </div>
          <div className="text-[10px] print:text-[7pt] text-slate-600 text-center mt-0.5">IA Auditor</div>
        </div>

        <div>
          <div className="text-slate-700 mb-3 print:mb-1 font-medium">Certified Correct:</div>
          <div className="border-b border-slate-900 font-bold text-center pb-0.5 font-mono uppercase">
            <TextField value={data.officers.presidentName} editable={editable} hasOverride={forced('officers.presidentName')} onCommit={set('officers.presidentName')} onRemove={unpin('officers.presidentName')} inputClassName="w-40 text-center" />
          </div>
          <div className="text-[10px] print:text-[7pt] text-slate-600 text-center mt-0.5">President</div>
        </div>
      </div>
    </div>
  );
}