'use client';

import React from 'react';
import { FS3Data } from '@/types';
import { formatPHP } from '@/lib/utils/formatters';

interface FS3ViewProps {
  data: FS3Data;
}

export default function FS3View({ data }: FS3ViewProps) {
  const r = data.cashReceipts;
  const d = data.cashDisbursements;
  const c = data.composition;

  return (
    <div className="bg-white text-slate-900 font-sans p-4 sm:p-8 rounded-xl shadow-2xl space-y-4 sm:space-y-6 w-full border border-slate-300 print:shadow-none print:border-none print:p-0 print:space-y-1.5 print:text-[8pt] print:leading-tight printable-statement">
      {/* Header */}
      <div className="space-y-1 border-b pb-3 border-slate-400 print:pb-1 print:space-y-0.5">
        <div className="text-xs print:text-[8pt] font-semibold">Name of Irrigators Association: <span className="font-bold text-slate-900">{data.associationName}</span></div>
        <div className="text-xs print:text-[8pt]">Address: <span className="font-medium text-slate-800">{data.address}</span></div>
        <div className="text-xs print:text-[8pt] flex flex-wrap gap-3 sm:gap-6 font-mono text-slate-700">
          <span>SEC Registration No. : {data.secRegNo}</span>
          <span>TIN NO. : {data.tinNo}</span>
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
          <div className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 py-0.5 border-b border-slate-100 min-w-0">
            <span>1 Membership Fees</span>
            <span className="font-mono shrink-0">{r.membershipFees ? formatPHP(r.membershipFees) : 'P -'}</span>
          </div>
          <div className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 py-0.5 border-b border-slate-100 min-w-0">
            <span>2 Annual or Seasonal Dues</span>
            <span className="font-mono shrink-0">{r.annualDues ? formatPHP(r.annualDues) : 'P -'}</span>
          </div>
          <div className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 py-0.5 border-b border-slate-100 min-w-0">
            <span>3 Fees and Penalties</span>
            <span className="font-mono shrink-0">{r.feesPenalties ? formatPHP(r.feesPenalties) : 'P -'}</span>
          </div>
          <div className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 py-0.5 border-b border-slate-100 min-w-0">
            <span>4 Donations/Contributions</span>
            <span className="font-mono shrink-0">{r.donationsContributions ? formatPHP(r.donationsContributions) : 'P -'}</span>
          </div>
          <div className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 py-0.5 border-b border-slate-100 min-w-0">
            <span>5 Interest Earned (Bank)</span>
            <span className="font-mono shrink-0">{r.interestEarned ? formatPHP(r.interestEarned) : 'P -'}</span>
          </div>
          <div className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 py-0.5 border-b border-slate-100 min-w-0">
            <span>6 Operation Compensation (IA Subsidy)</span>
            <span className="font-mono shrink-0">{r.iaSubsidy ? formatPHP(r.iaSubsidy) : 'P -'}</span>
          </div>
          <div className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 py-0.5 border-b border-slate-100 min-w-0">
            <span>7 Canal Remuneration</span>
            <span className="font-mono shrink-0">{r.canalRemuneration ? formatPHP(r.canalRemuneration) : 'P -'}</span>
          </div>
          <div className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 py-0.5 border-b border-slate-100 min-w-0">
            <span>8 O and M Fee</span>
            <span className="font-mono shrink-0">{r.omFee ? formatPHP(r.omFee) : 'P -'}</span>
          </div>
          <div className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 py-0.5 border-b border-slate-100 min-w-0">
            <span>9 Other Income</span>
            <span className="font-mono shrink-0">{r.otherIncome ? formatPHP(r.otherIncome) : 'P -'}</span>
          </div>
          <div className="flex justify-between py-1 font-bold text-xs print:text-[8.5pt] border-t border-b border-slate-900 bg-slate-50">
            <span className="pl-4">Total Receipts</span>
            <span className="font-mono shrink-0">{formatPHP(r.total)}</span>
          </div>
        </div>
      </div>

      {/* Disbursements Table */}
      <div className="space-y-2 print:space-y-0.5 pt-1">
        <div className="text-xs print:text-[8pt] font-bold uppercase text-slate-900 border-b border-slate-900 pb-0.5">
          B. CASH DISBURSEMENTS:
        </div>

        <div className="space-y-0.5 text-xs print:text-[8pt]">
          <div className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 py-0.5 border-b border-slate-100 min-w-0">
            <span>1 Registration, Permit & Notarial fees</span>
            <span className="font-mono shrink-0">{d.registrationPermits ? formatPHP(d.registrationPermits) : 'P -'}</span>
          </div>
          <div className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 py-0.5 border-b border-slate-100 min-w-0">
            <span>2 Travel and Rep. Expenses</span>
            <span className="font-mono shrink-0">{d.travelRep ? formatPHP(d.travelRep) : 'P -'}</span>
          </div>
          <div className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 py-0.5 border-b border-slate-100 min-w-0">
            <span>3 Meeting Expenses</span>
            <span className="font-mono shrink-0">{d.meetingExpenses ? formatPHP(d.meetingExpenses) : 'P -'}</span>
          </div>
          <div className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 py-0.5 border-b border-slate-100 min-w-0">
            <span>4 Office Equipment/Supplies</span>
            <span className="font-mono shrink-0">{d.officeSupplies ? formatPHP(d.officeSupplies) : 'P -'}</span>
          </div>
          <div className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 py-0.5 border-b border-slate-100 min-w-0">
            <span>5 Honorarium/Salaries/Wages</span>
            <span className="font-mono shrink-0">{d.salariesWages ? formatPHP(d.salariesWages) : 'P -'}</span>
          </div>
          <div className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 py-0.5 border-b border-slate-100 min-w-0">
            <span>6 Canal Clearing, Repair and Maintenance Expenses</span>
            <span className="font-mono shrink-0">{d.canalClearingRepair ? formatPHP(d.canalClearingRepair) : 'P -'}</span>
          </div>
          <div className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 py-0.5 border-b border-slate-100 min-w-0">
            <span>7 Snacks(Meetings)</span>
            <span className="font-mono shrink-0">{d.snacksMeetings ? formatPHP(d.snacksMeetings) : 'P -'}</span>
          </div>
          <div className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 py-0.5 border-b border-slate-100 min-w-0">
            <span>8 Collection Expenses</span>
            <span className="font-mono shrink-0">{d.collectionExpenses ? formatPHP(d.collectionExpenses) : 'P -'}</span>
          </div>
          <div className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 py-0.5 border-b border-slate-100 min-w-0">
            <span>9 Misc. Expenses</span>
            <span className="font-mono shrink-0">{d.miscExpenses ? formatPHP(d.miscExpenses) : 'P -'}</span>
          </div>
          <div className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 py-0.5 border-b border-slate-100 min-w-0">
            <span>10 Other Expenses</span>
            <span className="font-mono shrink-0">{d.otherExpenses ? formatPHP(d.otherExpenses) : 'P -'}</span>
          </div>
          <div className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 py-0.5 border-b border-slate-100 min-w-0">
            <span>11 Distributed IA Share to Laterals</span>
            <span className="font-mono shrink-0">{d.distributedIAShare ? formatPHP(d.distributedIAShare) : 'P -'}</span>
          </div>
          <div className="flex justify-between py-1 font-bold text-xs print:text-[8.5pt] border-t border-b border-slate-900 bg-slate-50">
            <span className="pl-4">Total Disbursement (Expenses)</span>
            <span className="font-mono font-extrabold">{formatPHP(d.total)}</span>
          </div>
        </div>
      </div>

      {/* Summary Section C, D, E */}
      <div className="space-y-1 text-xs print:text-[8pt] border-t border-slate-900 pt-1.5">
        <div className="flex justify-between py-0.5 font-semibold">
          <span>C. Cash Balance this year</span>
          <span className="font-mono font-bold text-emerald-700">{formatPHP(data.cashBalanceThisYear)}</span>
        </div>
        <div className="flex justify-between py-0.5">
          <span>D. Add: Fund Balance last report</span>
          <span className="font-mono shrink-0">{formatPHP(data.fundBalanceLastReport)}</span>
        </div>
        <div className="flex justify-between py-1 font-extrabold text-xs print:text-[8.5pt] border-t border-b border-slate-900 bg-emerald-50">
          <span>E. Total Cash Balance as of this year</span>
          <span className="font-mono shrink-0">{formatPHP(data.totalCashBalance)}</span>
        </div>
      </div>

      {/* Section F Composition */}
      <div className="space-y-1.5 print:space-y-0.5 pt-1">
        <div className="text-xs print:text-[8pt] font-bold uppercase text-slate-900 border-b border-slate-900 pb-0.5">
          F. Composition of Cash Balance (where the cash is):
        </div>

        <div className="space-y-0.5 text-xs print:text-[8pt]">
          <div className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 py-0.5 border-b border-slate-100 min-w-0">
            <span className="pl-4">Cash on Hand-Petty Cash</span>
            <span className="font-mono shrink-0">{c.cashOnHandPetty ? formatPHP(c.cashOnHandPetty) : 'P -'}</span>
          </div>
          <div className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 py-0.5 border-b border-slate-100 min-w-0">
            <span className="pl-4">Undeposited/Unremitted Collections</span>
            <span className="font-mono shrink-0">{c.undepositedCollections ? formatPHP(c.undepositedCollections) : 'P -'}</span>
          </div>
          <div className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 py-0.5 border-b border-slate-100 min-w-0">
            <span className="pl-4">Cash in Bank (Regular Fund)</span>
            <span className="font-mono shrink-0">{c.cashInBankRegular ? formatPHP(c.cashInBankRegular) : 'P -'}</span>
          </div>
          <div className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 py-0.5 border-b border-slate-100 min-w-0">
            <span className="pl-4">Cash in Bank (CBU account)</span>
            <span className="font-mono shrink-0">{c.cashInBankCBU ? formatPHP(c.cashInBankCBU) : 'P -'}</span>
          </div>
          <div className="flex justify-between py-1 font-bold text-xs print:text-[8.5pt] border-t border-b border-slate-900 bg-slate-100">
            <span className="pl-6">Total Cash Balance</span>
            <span className="font-mono font-extrabold">{formatPHP(c.total)}</span>
          </div>
        </div>
      </div>

      {/* Signature Grid */}
      <div className="pt-4 print:pt-3 grid grid-cols-1 sm:grid-cols-3 signature-grid gap-4 print:grid-cols-3 text-xs print:text-[7.5pt] text-slate-900">
        <div>
          <div className="text-slate-700 mb-3 print:mb-1 font-medium">Prepared by:</div>
          <div className="border-b border-slate-900 font-bold text-center pb-0.5 font-mono uppercase">
            {data.officers.treasurerName}
          </div>
          <div className="text-[10px] print:text-[7pt] text-slate-600 text-center mt-0.5">IA Treasurer</div>
        </div>

        <div>
          <div className="text-slate-700 mb-3 print:mb-1 font-medium">Audited by:</div>
          <div className="border-b border-slate-900 font-bold text-center pb-0.5 font-mono uppercase">
            {data.officers.auditorName}
          </div>
          <div className="text-[10px] print:text-[7pt] text-slate-600 text-center mt-0.5">IA Auditor</div>
        </div>

        <div>
          <div className="text-slate-700 mb-3 print:mb-1 font-medium">Certified Correct:</div>
          <div className="border-b border-slate-900 font-bold text-center pb-0.5 font-mono uppercase">
            {data.officers.presidentName}
          </div>
          <div className="text-[10px] print:text-[7pt] text-slate-600 text-center mt-0.5">President</div>
        </div>
      </div>
    </div>
  );
}
