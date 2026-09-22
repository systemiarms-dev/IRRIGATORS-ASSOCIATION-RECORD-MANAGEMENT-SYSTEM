'use client';

import React from 'react';
import { FS1Data } from '@/types';
import { formatPHP } from '@/lib/utils/formatters';

interface FS1ViewProps {
  data: FS1Data;
}

export default function FS1View({ data }: FS1ViewProps) {
  const r = data.receipts;
  const d = data.disbursements;
  const eq = data.membersEquity;

  return (
    <div className="bg-white text-slate-900 font-sans p-4 sm:p-8 rounded-xl shadow-2xl space-y-4 sm:space-y-6 w-full border border-slate-300 print:shadow-none print:border-none print:p-0 print:space-y-1.5 print:text-[8pt] print:leading-tight printable-statement">
      {/* Header */}
      <div className="text-center space-y-1 border-b pb-4 border-slate-400">
        <h2 className="text-base sm:text-lg font-bold uppercase tracking-wide text-slate-900">{data.associationName}</h2>
        <div className="text-xs text-slate-700 uppercase font-medium">{data.address}</div>
        <div className="text-xs text-slate-600 font-mono">SEC Reg. No. {data.secRegNo}</div>

        <div className="pt-4">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">
            COMPARATIVE STATEMENT OF CASH RECEIPTS & DISBURSEMENTS
          </h3>
          <div className="text-xs italic text-slate-700">
            For the year Ending December 31, {data.yearPrior} & {data.yearCurrent}
          </div>
        </div>
      </div>

      {/* Receipts & Disbursements Grid Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-slate-900 border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-900 text-slate-900">
              <th className="text-left py-2 px-1 font-bold">RECEIPTS</th>
              <th className="text-right py-2 px-3 font-bold w-36">{data.yearCurrent}</th>
              <th className="text-right py-2 px-3 font-bold w-36">{data.yearPrior}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            <tr>
              <td className="py-1.5 px-3">Membership Fees</td>
              <td className="text-right py-1.5 px-3 font-mono">{r.membershipFees.current ? formatPHP(r.membershipFees.current) : '-'}</td>
              <td className="text-right py-1.5 px-3 font-mono">{r.membershipFees.prior ? formatPHP(r.membershipFees.prior) : '-'}</td>
            </tr>
            <tr>
              <td className="py-1.5 px-3">Annual Dues</td>
              <td className="text-right py-1.5 px-3 font-mono">{r.annualDues.current ? formatPHP(r.annualDues.current) : '-'}</td>
              <td className="text-right py-1.5 px-3 font-mono">{r.annualDues.prior ? formatPHP(r.annualDues.prior) : '-'}</td>
            </tr>
            <tr>
              <td className="py-1.5 px-3">O&M Subsidy</td>
              <td className="text-right py-1.5 px-3 font-mono">{r.omSubsidy.current ? formatPHP(r.omSubsidy.current) : '-'}</td>
              <td className="text-right py-1.5 px-3 font-mono">{r.omSubsidy.prior ? formatPHP(r.omSubsidy.prior) : '-'}</td>
            </tr>
            <tr>
              <td className="py-1.5 px-3">Canal Remu. Incentive</td>
              <td className="text-right py-1.5 px-3 font-mono">{r.canalRemuIncentive.current ? formatPHP(r.canalRemuIncentive.current) : '-'}</td>
              <td className="text-right py-1.5 px-3 font-mono">{r.canalRemuIncentive.prior ? formatPHP(r.canalRemuIncentive.prior) : '-'}</td>
            </tr>
            <tr>
              <td className="py-1.5 px-3">Fines & Penalties</td>
              <td className="text-right py-1.5 px-3 font-mono">{r.finesPenalties.current ? formatPHP(r.finesPenalties.current) : '-'}</td>
              <td className="text-right py-1.5 px-3 font-mono">{r.finesPenalties.prior ? formatPHP(r.finesPenalties.prior) : '-'}</td>
            </tr>
            <tr>
              <td className="py-1.5 px-3">Interest Earned (Bank)</td>
              <td className="text-right py-1.5 px-3 font-mono">{r.interestEarned.current ? formatPHP(r.interestEarned.current) : '-'}</td>
              <td className="text-right py-1.5 px-3 font-mono">{r.interestEarned.prior ? formatPHP(r.interestEarned.prior) : '-'}</td>
            </tr>
            <tr>
              <td className="py-1.5 px-3">Other Income</td>
              <td className="text-right py-1.5 px-3 font-mono">{r.otherIncome.current ? formatPHP(r.otherIncome.current) : '-'}</td>
              <td className="text-right py-1.5 px-3 font-mono">{r.otherIncome.prior ? formatPHP(r.otherIncome.prior) : '-'}</td>
            </tr>
            <tr className="font-bold border-t-2 border-slate-900 bg-slate-50">
              <td className="py-2 px-1">TOTAL RECEIPTS</td>
              <td className="text-right py-2 px-3 font-mono">{formatPHP(r.total.current)}</td>
              <td className="text-right py-2 px-3 font-mono">{formatPHP(r.total.prior)}</td>
            </tr>

            {/* Disbursements */}
            <tr className="border-t-2 border-slate-900">
              <td colSpan={3} className="py-2 px-1 font-bold italic">less: DISBURSEMENT</td>
            </tr>
            <tr>
              <td className="py-1.5 px-3">Registration, Permit & Notarial fees</td>
              <td className="text-right py-1.5 px-3 font-mono">{d.registrationPermits.current ? formatPHP(d.registrationPermits.current) : '-'}</td>
              <td className="text-right py-1.5 px-3 font-mono">{d.registrationPermits.prior ? formatPHP(d.registrationPermits.prior) : '-'}</td>
            </tr>
            <tr>
              <td className="py-1.5 px-3">Travel, Meeting and Rep. Expenses</td>
              <td className="text-right py-1.5 px-3 font-mono">{d.travelRep.current ? formatPHP(d.travelRep.current) : '-'}</td>
              <td className="text-right py-1.5 px-3 font-mono">{d.travelRep.prior ? formatPHP(d.travelRep.prior) : '-'}</td>
            </tr>
            <tr>
              <td className="py-1.5 px-3">IA Meeting Expenses</td>
              <td className="text-right py-1.5 px-3 font-mono">{d.meetingExpenses.current ? formatPHP(d.meetingExpenses.current) : '-'}</td>
              <td className="text-right py-1.5 px-3 font-mono">{d.meetingExpenses.prior ? formatPHP(d.meetingExpenses.prior) : '-'}</td>
            </tr>
            <tr>
              <td className="py-1.5 px-3">Office Equipment/Supplies</td>
              <td className="text-right py-1.5 px-3 font-mono">{d.officeSupplies.current ? formatPHP(d.officeSupplies.current) : '-'}</td>
              <td className="text-right py-1.5 px-3 font-mono">{d.officeSupplies.prior ? formatPHP(d.officeSupplies.prior) : '-'}</td>
            </tr>
            <tr>
              <td className="py-1.5 px-3">Honorarium/Salaries/Wages</td>
              <td className="text-right py-1.5 px-3 font-mono">{d.salariesWages.current ? formatPHP(d.salariesWages.current) : '-'}</td>
              <td className="text-right py-1.5 px-3 font-mono">{d.salariesWages.prior ? formatPHP(d.salariesWages.prior) : '-'}</td>
            </tr>
            <tr>
              <td className="py-1.5 px-3">Canal Clearing, Repair and Maint. Expenses</td>
              <td className="text-right py-1.5 px-3 font-mono">{d.canalClearingRepair.current ? formatPHP(d.canalClearingRepair.current) : '-'}</td>
              <td className="text-right py-1.5 px-3 font-mono">{d.canalClearingRepair.prior ? formatPHP(d.canalClearingRepair.prior) : '-'}</td>
            </tr>
            <tr>
              <td className="py-1.5 px-3">Tax & Licenses</td>
              <td className="text-right py-1.5 px-3 font-mono">{d.taxLicenses.current ? formatPHP(d.taxLicenses.current) : '-'}</td>
              <td className="text-right py-1.5 px-3 font-mono">{d.taxLicenses.prior ? formatPHP(d.taxLicenses.prior) : '-'}</td>
            </tr>
            <tr>
              <td className="py-1.5 px-3">Other Expenses</td>
              <td className="text-right py-1.5 px-3 font-mono">{d.otherExpenses.current ? formatPHP(d.otherExpenses.current) : '-'}</td>
              <td className="text-right py-1.5 px-3 font-mono">{d.otherExpenses.prior ? formatPHP(d.otherExpenses.prior) : '-'}</td>
            </tr>
            <tr>
              <td className="py-1.5 px-3">Repair and Maintenance</td>
              <td className="text-right py-1.5 px-3 font-mono">{d.repairMaintenance.current ? formatPHP(d.repairMaintenance.current) : '-'}</td>
              <td className="text-right py-1.5 px-3 font-mono">{d.repairMaintenance.prior ? formatPHP(d.repairMaintenance.prior) : '-'}</td>
            </tr>
            <tr>
              <td className="py-1.5 px-3">Distributed IA Share to Laterals/Federation Share</td>
              <td className="text-right py-1.5 px-3 font-mono">{d.distributedIAShare.current ? formatPHP(d.distributedIAShare.current) : '-'}</td>
              <td className="text-right py-1.5 px-3 font-mono">{d.distributedIAShare.prior ? formatPHP(d.distributedIAShare.prior) : '-'}</td>
            </tr>
            <tr className="font-bold border-t-2 border-slate-900 bg-slate-50">
              <td className="py-2 px-1">Total Expenses for the Year</td>
              <td className="text-right py-2 px-3 font-mono">{formatPHP(d.total.current)}</td>
              <td className="text-right py-2 px-3 font-mono">{formatPHP(d.total.prior)}</td>
            </tr>
            <tr className="font-extrabold border-t-2 border-b-2 border-slate-900 bg-emerald-50 text-emerald-950">
              <td className="py-2.5 px-1">Net Surplus for the Year</td>
              <td className="text-right py-2.5 px-3 font-mono">{formatPHP(data.netSurplus.current)}</td>
              <td className="text-right py-2.5 px-3 font-mono">{formatPHP(data.netSurplus.prior)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Member's Equity Block */}
      <div className="pt-6 border-t-2 border-slate-900 space-y-3">
        <div className="text-center">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
            STATEMENT OF CHANGES IN THE MEMBER&apos;S EQUITY
          </h4>
          <div className="text-[11px] italic text-slate-700">
            For the Year Ending December 31, {data.yearPrior} & {data.yearCurrent}
          </div>
        </div>

        <table className="w-full text-xs text-slate-900 border-collapse">
          <thead>
            <tr className="border-b border-slate-400">
              <th className="text-left py-1.5 px-1 font-bold"></th>
              <th className="text-right py-1.5 px-3 font-bold w-36">{data.yearCurrent}</th>
              <th className="text-right py-1.5 px-3 font-bold w-36">{data.yearPrior}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            <tr>
              <td className="py-1.5 px-3">Fund Balance Beginning</td>
              <td className="text-right py-1.5 px-3 font-mono">{formatPHP(eq.fundBalanceBeginning.current)}</td>
              <td className="text-right py-1.5 px-3 font-mono">{formatPHP(eq.fundBalanceBeginning.prior)}</td>
            </tr>
            <tr>
              <td className="py-1.5 px-3">Add: Net Savings for the Year</td>
              <td className="text-right py-1.5 px-3 font-mono">{formatPHP(eq.netSavingsYear.current)}</td>
              <td className="text-right py-1.5 px-3 font-mono">{formatPHP(eq.netSavingsYear.prior)}</td>
            </tr>
            <tr className="font-extrabold border-t-2 border-b-2 border-slate-900 bg-slate-100">
              <td className="py-2 px-1">TOTAL: Fund Bal. End of the Year</td>
              <td className="text-right py-2 px-3 font-mono">{formatPHP(eq.fundBalanceEnd.current)}</td>
              <td className="text-right py-2 px-3 font-mono">{formatPHP(eq.fundBalanceEnd.prior)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Signature Grid */}
      <div className="pt-6 print:pt-4 grid grid-cols-1 sm:grid-cols-3 signature-grid gap-4 print:grid-cols-3 text-xs print:text-[7.5pt] text-slate-900">
        <div>
          <div className="text-slate-700 mb-3 print:mb-1 font-medium">Prepared by:</div>
          <div className="border-b border-slate-900 font-bold text-center pb-0.5 font-mono uppercase">
            {data.officers?.treasurerName || 'RIC UNDAY'}
          </div>
          <div className="text-[10px] print:text-[7pt] text-slate-600 text-center mt-0.5">IA Treasurer</div>
        </div>

        <div>
          <div className="text-slate-700 mb-3 print:mb-1 font-medium">Audited by:</div>
          <div className="border-b border-slate-900 font-bold text-center pb-0.5 font-mono uppercase">
            {data.officers?.auditorName || 'ARTUR GUIANG'}
          </div>
          <div className="text-[10px] print:text-[7pt] text-slate-600 text-center mt-0.5">IA Auditor</div>
        </div>

        <div>
          <div className="text-slate-700 mb-3 print:mb-1 font-medium">Certified Correct:</div>
          <div className="border-b border-slate-900 font-bold text-center pb-0.5 font-mono uppercase">
            {data.officers?.presidentName || 'MEYNARD TOMANENG'}
          </div>
          <div className="text-[10px] print:text-[7pt] text-slate-600 text-center mt-0.5">IA President</div>
        </div>
      </div>
    </div>
  );
}
