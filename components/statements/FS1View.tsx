'use client';

import React from 'react';
import { FS1Data, FinancialStatementEdits } from '@/types';
import { NumberField, TextField } from './editable';
import { X } from 'lucide-react';

interface FS1ViewProps {
  data: FS1Data;
  editable?: boolean;
  edits?: FinancialStatementEdits;
  onFieldChange?: (path: string, value: number | string) => void;
}

const P = 'fs1.';

const LOCKED = new Set([
  'receipts.total.current',
  'receipts.total.prior',
  'disbursements.total.current',
  'disbursements.total.prior',
  'netSurplus.current',
  'netSurplus.prior',
  'membersEquity.netSavingsYear.current',
  'membersEquity.netSavingsYear.prior',
  'membersEquity.fundBalanceEnd.current',
  'membersEquity.fundBalanceEnd.prior',
]);

export default function FS1View({ data, editable = false, edits, onFieldChange }: FS1ViewProps) {
  const r = data.receipts;
  const d = data.disbursements;
  const eq = data.membersEquity;
  const extraR = data.extraReceipts || [];
  const extraD = data.extraDisbursements || [];

  const forced = (p: string) => edits?.[`${P}${p}`]?.mode === 'force';
  const locked = (p: string) => LOCKED.has(p);
  const set = (p: string) => (v: number | string) => onFieldChange?.(`${P}${p}`, v);
  const unpin = (p: string) => () => onFieldChange?.(`${P}${p}:unpin`, '');
  const cellEditable = (p: string) => editable && !locked(p);

  const numCell = (path: string, value: number) => (
    <td className="text-right py-1.5 px-3 font-mono align-middle">
      <NumberField value={value} editable={cellEditable(path)} hasOverride={forced(path)} onCommit={set(path)} onRemove={unpin(path)} emptyWhenZero />
    </td>
  );
  const numCellBold = (path: string, value: number) => (
    <td className="text-right py-2 px-3 font-mono align-middle font-bold">
      <NumberField value={value} editable={cellEditable(path)} hasOverride={forced(path)} onCommit={set(path)} onRemove={unpin(path)} emptyWhenZero />
    </td>
  );
  const numCellLineOnly = (path: string, value: number) => (
    <td className="text-right py-1.5 px-3 font-mono align-middle">
      <NumberField value={value} editable={cellEditable(path)} onCommit={set(path)} emptyWhenZero />
    </td>
  );

  return (
    <div className="bg-white text-slate-900 p-4 sm:p-6 rounded-xl shadow-2xl space-y-4 w-[210mm] max-w-full mx-auto overflow-x-auto print:overflow-visible border border-slate-300 print:shadow-none print:border-none print:p-0 print:space-y-1.5 print:text-[8pt] print:leading-tight printable-statement">
      {/* Header */}
      <div className="text-center space-y-1 border-b pb-3 border-slate-400">
        <h2 className="text-base sm:text-lg font-bold uppercase tracking-wide text-slate-900">
          <TextField value={data.associationName} editable={editable} hasOverride={forced('associationName')} onCommit={set('associationName')} onRemove={unpin('associationName')} inputClassName="w-64 text-center" />
        </h2>
        <div className="text-xs text-slate-700 uppercase font-medium">
          <TextField value={data.address} editable={editable} hasOverride={forced('address')} onCommit={set('address')} onRemove={unpin('address')} inputClassName="w-56 text-center" />
        </div>
        <div className="text-xs text-slate-600 font-mono">
          SEC Reg. No.{' '}
          <TextField value={data.secRegNo} editable={editable} hasOverride={forced('secRegNo')} onCommit={set('secRegNo')} onRemove={unpin('secRegNo')} inputClassName="w-32" />
        </div>

        <div className="pt-3">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">
            COMPARATIVE STATEMENT OF CASH RECEIPTS &amp; DISBURSEMENTS
          </h3>
          <div className="text-xs italic text-slate-700">
            For the year Ending December 31, {data.yearPrior} &amp; {data.yearCurrent}
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
              {numCell('receipts.membershipFees.current', r.membershipFees?.current || 0)}
              {numCell('receipts.membershipFees.prior', r.membershipFees?.prior || 0)}
            </tr>
            <tr>
              <td className="py-1.5 px-3">Annual Dues</td>
              {numCell('receipts.annualDues.current', r.annualDues?.current || 0)}
              {numCell('receipts.annualDues.prior', r.annualDues?.prior || 0)}
            </tr>
            <tr>
              <td className="py-1.5 px-3">O&amp;M Subsidy</td>
              {numCell('receipts.omSubsidy.current', r.omSubsidy?.current || 0)}
              {numCell('receipts.omSubsidy.prior', r.omSubsidy?.prior || 0)}
            </tr>
            <tr>
              <td className="py-1.5 px-3">Canal Remu. Incentive</td>
              {numCell('receipts.canalRemuIncentive.current', r.canalRemuIncentive?.current || 0)}
              {numCell('receipts.canalRemuIncentive.prior', r.canalRemuIncentive?.prior || 0)}
            </tr>
            <tr>
              <td className="py-1.5 px-3">Fines &amp; Penalties</td>
              {numCell('receipts.finesPenalties.current', r.finesPenalties?.current || 0)}
              {numCell('receipts.finesPenalties.prior', r.finesPenalties?.prior || 0)}
            </tr>
            <tr>
              <td className="py-1.5 px-3">Interest Earned (Bank)</td>
              {numCell('receipts.interestEarned.current', r.interestEarned?.current || 0)}
              {numCell('receipts.interestEarned.prior', r.interestEarned?.prior || 0)}
            </tr>
            <tr>
              <td className="py-1.5 px-3">Other Income</td>
              {numCell('receipts.otherIncome.current', r.otherIncome?.current || 0)}
              {numCell('receipts.otherIncome.prior', r.otherIncome?.prior || 0)}
            </tr>

            {/* Custom Receipt Lines */}
            {extraR.map((x, i) => (
              <tr key={`er-${i}`}>
                <td className="py-1.5 px-3">
                  <span className="inline-flex items-center gap-1.5 min-w-0">
                    <TextField
                      value={x.label}
                      editable={editable}
                      onCommit={set(`extraReceipts.${i}.label`)}
                      inputClassName="w-40"
                      placeholder="e.g. Barangay Share"
                    />
                    {editable && (
                      <button
                        type="button"
                        onClick={() => onFieldChange?.(`${P}extraReceipts:remove:${i}`, '')}
                        className="p-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 transition-colors shrink-0"
                        title="Delete this line"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </span>
                </td>
                {numCellLineOnly(`extraReceipts.${i}.current`, x.current || 0)}
                {numCellLineOnly(`extraReceipts.${i}.prior`, x.prior || 0)}
              </tr>
            ))}
            {editable && (
              <tr>
                <td colSpan={3} className="py-1 px-3">
                  <button
                    type="button"
                    onClick={() => onFieldChange?.(`${P}extraReceipts:add`, '')}
                    className="text-[10px] font-bold text-slate-600 bg-slate-50 border border-slate-300 rounded-md px-2 py-1 hover:bg-slate-100 transition-colors"
                  >
                    + Add Receipt Line
                  </button>
                </td>
              </tr>
            )}

            <tr className="font-bold border-t-2 border-slate-900 bg-slate-50">
              <td className="py-2 px-1">TOTAL RECEIPTS</td>
              {numCellBold('receipts.total.current', r.total?.current || 0)}
              {numCellBold('receipts.total.prior', r.total?.prior || 0)}
            </tr>

            {/* Disbursements */}
            <tr className="border-t-2 border-slate-900">
              <td colSpan={3} className="py-2 px-1 font-bold italic">less: DISBURSEMENT</td>
            </tr>
            <tr>
              <td className="py-1.5 px-3">Registration, Permit &amp; Notarial fees</td>
              {numCell('disbursements.registrationPermits.current', d.registrationPermits?.current || 0)}
              {numCell('disbursements.registrationPermits.prior', d.registrationPermits?.prior || 0)}
            </tr>
            <tr>
              <td className="py-1.5 px-3">Travel, Meeting and Rep. Expenses</td>
              {numCell('disbursements.travelRep.current', d.travelRep?.current || 0)}
              {numCell('disbursements.travelRep.prior', d.travelRep?.prior || 0)}
            </tr>
            <tr>
              <td className="py-1.5 px-3">IA Meeting Expenses</td>
              {numCell('disbursements.meetingExpenses.current', d.meetingExpenses?.current || 0)}
              {numCell('disbursements.meetingExpenses.prior', d.meetingExpenses?.prior || 0)}
            </tr>
            <tr>
              <td className="py-1.5 px-3">Office Equipment/Supplies</td>
              {numCell('disbursements.officeSupplies.current', d.officeSupplies?.current || 0)}
              {numCell('disbursements.officeSupplies.prior', d.officeSupplies?.prior || 0)}
            </tr>
            <tr>
              <td className="py-1.5 px-3">Honorarium/Salaries/Wages</td>
              {numCell('disbursements.salariesWages.current', d.salariesWages?.current || 0)}
              {numCell('disbursements.salariesWages.prior', d.salariesWages?.prior || 0)}
            </tr>
            <tr>
              <td className="py-1.5 px-3">Canal Clearing, Repair and Maint. Expenses</td>
              {numCell('disbursements.canalClearingRepair.current', d.canalClearingRepair?.current || 0)}
              {numCell('disbursements.canalClearingRepair.prior', d.canalClearingRepair?.prior || 0)}
            </tr>
            <tr>
              <td className="py-1.5 px-3">Professional Fee (Audited FS Processing)</td>
              {numCell('disbursements.professionalFee.current', d.professionalFee?.current || 0)}
              {numCell('disbursements.professionalFee.prior', d.professionalFee?.prior || 0)}
            </tr>
            <tr>
              <td className="py-1.5 px-3">Federation Share (IA Fed Share)</td>
              {numCell('disbursements.federationShare.current', d.federationShare?.current || 0)}
              {numCell('disbursements.federationShare.prior', d.federationShare?.prior || 0)}
            </tr>
            <tr>
              <td className="py-1.5 px-3">Piso Mula sa Puso Contribution</td>
              {numCell('disbursements.pisoMulaSaPuso.current', d.pisoMulaSaPuso?.current || 0)}
              {numCell('disbursements.pisoMulaSaPuso.prior', d.pisoMulaSaPuso?.prior || 0)}
            </tr>
            <tr>
              <td className="py-1.5 px-3">Tax &amp; Licenses</td>
              {numCell('disbursements.taxLicenses.current', d.taxLicenses?.current || 0)}
              {numCell('disbursements.taxLicenses.prior', d.taxLicenses?.prior || 0)}
            </tr>
            <tr>
              <td className="py-1.5 px-3">Other Expenses / Miscellaneous</td>
              {numCell('disbursements.otherExpenses.current', d.otherExpenses?.current || 0)}
              {numCell('disbursements.otherExpenses.prior', d.otherExpenses?.prior || 0)}
            </tr>
            <tr>
              <td className="py-1.5 px-3">Repair and Maintenance</td>
              {numCell('disbursements.repairMaintenance.current', d.repairMaintenance?.current || 0)}
              {numCell('disbursements.repairMaintenance.prior', d.repairMaintenance?.prior || 0)}
            </tr>
            <tr>
              <td className="py-1.5 px-3">Distributed IA Share to Laterals (Danak / Barakibak)</td>
              {numCell('disbursements.distributedIAShare.current', d.distributedIAShare?.current || 0)}
              {numCell('disbursements.distributedIAShare.prior', d.distributedIAShare?.prior || 0)}
            </tr>

            {/* Custom Disbursement Lines */}
            {extraD.map((x, i) => (
              <tr key={`ed-${i}`}>
                <td className="py-1.5 px-3">
                  <span className="inline-flex items-center gap-1.5 min-w-0">
                    <TextField
                      value={x.label}
                      editable={editable}
                      onCommit={set(`extraDisbursements.${i}.label`)}
                      inputClassName="w-40"
                      placeholder="e.g. Rice Assistance"
                    />
                    {editable && (
                      <button
                        type="button"
                        onClick={() => onFieldChange?.(`${P}extraDisbursements:remove:${i}`, '')}
                        className="p-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 transition-colors shrink-0"
                        title="Delete this line"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </span>
                </td>
                {numCellLineOnly(`extraDisbursements.${i}.current`, x.current || 0)}
                {numCellLineOnly(`extraDisbursements.${i}.prior`, x.prior || 0)}
              </tr>
            ))}
            {editable && (
              <tr>
                <td colSpan={3} className="py-1 px-3">
                  <button
                    type="button"
                    onClick={() => onFieldChange?.(`${P}extraDisbursements:add`, '')}
                    className="text-[10px] font-bold text-slate-600 bg-slate-50 border border-slate-300 rounded-md px-2 py-1 hover:bg-slate-100 transition-colors"
                  >
                    + Add Expense Line
                  </button>
                </td>
              </tr>
            )}

            <tr className="font-bold border-t-2 border-slate-900 bg-slate-50">
              <td className="py-2 px-1">TOTAL DISBURSEMENT</td>
              {numCellBold('disbursements.total.current', d.total?.current || 0)}
              {numCellBold('disbursements.total.prior', d.total?.prior || 0)}
            </tr>

            {/* Net Surplus */}
            <tr className="font-bold border-t-2 border-slate-900">
              <td className="py-2 px-1 uppercase">NET SURPLUS (DEFICIT)</td>
              {numCellBold('netSurplus.current', data.netSurplus?.current || 0)}
              {numCellBold('netSurplus.prior', data.netSurplus?.prior || 0)}
            </tr>

            {/* Members Equity */}
            <tr className="border-t-2 border-slate-900">
              <td colSpan={3} className="py-2 px-1 font-bold italic">MEMBERS EQUITY</td>
            </tr>
            <tr>
              <td className="py-1.5 px-3">Fund Balance, Beginning</td>
              {numCell('membersEquity.fundBalanceBeginning.current', eq.fundBalanceBeginning?.current || 0)}
              {numCell('membersEquity.fundBalanceBeginning.prior', eq.fundBalanceBeginning?.prior || 0)}
            </tr>
            <tr>
              <td className="py-1.5 px-3">Net Savings this year</td>
              {numCell('membersEquity.netSavingsYear.current', eq.netSavingsYear?.current || 0)}
              {numCell('membersEquity.netSavingsYear.prior', eq.netSavingsYear?.prior || 0)}
            </tr>
            <tr className="font-bold border-t border-b-2 border-slate-900 bg-slate-50">
              <td className="py-2 px-1">Fund Balance, End</td>
              {numCellBold('membersEquity.fundBalanceEnd.current', eq.fundBalanceEnd?.current || 0)}
              {numCellBold('membersEquity.fundBalanceEnd.prior', eq.fundBalanceEnd?.prior || 0)}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Signatories Block */}
      <div className="pt-6 border-t border-slate-400 grid grid-cols-3 gap-4 text-center print:pt-4">
        <div className="space-y-1">
          <div className="text-[11px] text-slate-600">Prepared by:</div>
          <div className="pt-6 font-bold uppercase underline text-xs">
            <TextField value={data.officers?.treasurerName || 'RIC UNDAY'} editable={editable} hasOverride={forced('officers.treasurerName')} onCommit={set('officers.treasurerName')} onRemove={unpin('officers.treasurerName')} inputClassName="w-40 text-center" />
          </div>
          <div className="text-[10px] text-slate-600">IA Treasurer</div>
        </div>
        <div className="space-y-1">
          <div className="text-[11px] text-slate-600">Audited by:</div>
          <div className="pt-6 font-bold uppercase underline text-xs">
            <TextField value={data.officers?.auditorName || 'ARTUR GUIANG'} editable={editable} hasOverride={forced('officers.auditorName')} onCommit={set('officers.auditorName')} onRemove={unpin('officers.auditorName')} inputClassName="w-40 text-center" />
          </div>
          <div className="text-[10px] text-slate-600">IA Auditor</div>
        </div>
        <div className="space-y-1">
          <div className="text-[11px] text-slate-600">Approved by:</div>
          <div className="pt-6 font-bold uppercase underline text-xs">
            <TextField value={data.officers?.presidentName || 'MEYNARD A. TOMANENG'} editable={editable} hasOverride={forced('officers.presidentName')} onCommit={set('officers.presidentName')} onRemove={unpin('officers.presidentName')} inputClassName="w-40 text-center" />
          </div>
          <div className="text-[10px] text-slate-600">IA President</div>
        </div>
      </div>
    </div>
  );
}