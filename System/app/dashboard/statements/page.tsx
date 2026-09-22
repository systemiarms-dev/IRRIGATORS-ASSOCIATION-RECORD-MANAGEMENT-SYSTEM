'use client';

import React, { useCallback, useEffect, useState, useTransition } from 'react';
import { getFinancialStatementsAction, generateStatementAction, deleteFinancialStatementAction, updateFinancialStatementAction, renameFinancialStatementAction } from '@/app/actions/statements';
import { getSelfProfileAction } from '@/app/actions/auth';
import { FinancialStatement, StatementType, FS1Data, FS2Data, FS3Data, FS4Data, UserRole, StatementFinancialOverrides } from '@/types';
import { formatPHP, formatDate } from '@/lib/utils/formatters';
import FS1View from '@/components/statements/FS1View';
import FS2View from '@/components/statements/FS2View';
import FS3View from '@/components/statements/FS3View';
import FS4View from '@/components/statements/FS4View';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Alert } from '@/components/ui/alert';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { FileText, Printer, RefreshCw, Loader2, Calculator, Trash2, Layers, TrendingUp, Wallet, Landmark, HelpCircle, Shield, Pencil, CheckCircle2, Tag } from 'lucide-react';

export default function FinancialStatementsPage() {
  const [statements, setStatements] = useState<FinancialStatement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatement, setSelectedStatement] = useState<FinancialStatement | null>(null);
  const [activeFSTab, setActiveFSTab] = useState<'FS1' | 'FS2' | 'FS3' | 'FS4'>('FS1');

  // Generator & Delete Modal State
  const [showModal, setShowModal] = useState(false);
  const [deleteModalStmt, setDeleteModalStmt] = useState<FinancialStatement | null>(null);
  const [renameStmt, setRenameStmt] = useState<FinancialStatement | null>(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [renameSaving, setRenameSaving] = useState(false);
  const [renameErrorMsg, setRenameErrorMsg] = useState<string | null>(null);
  const [genErrorMsg, setGenErrorMsg] = useState<string | null>(null);
  const [bannerMsg, setBannerMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [title, setTitle] = useState('');
  const [statementType, setStatementType] = useState<StatementType>('fs1');
  const currentYear = new Date().getFullYear();
  const [periodStart, setPeriodStart] = useState(`${currentYear}-01-01`);
  const [periodEnd, setPeriodEnd] = useState(`${currentYear}-12-31`);
  const [isPending, startTransition] = useTransition();

  const [userRole, setUserRole] = useState<UserRole>('member');

  const loadStatements = useCallback(async () => {
    setLoading(true);
    const res = await getFinancialStatementsAction();
    setLoading(false);
    if (res.success && res.data) {
      const data = res.data;
      setStatements(data);
      if (data.length > 0) {
        setSelectedStatement((prev) => prev ?? data[0]);
      }
    }
  }, []);

  useEffect(() => {
    async function init() {
      const selfRes = await getSelfProfileAction();
      if (selfRes.success && selfRes.data) {
        setUserRole(selfRes.data.role);
      }
      await loadStatements();
    }
    init();
  }, [loadStatements]);

  const [presidentName, setPresidentName] = useState('MEYNARD TOMANENG');
  const [treasurerName, setTreasurerName] = useState('RIC UNDAY');
  const [auditorName, setAuditorName] = useState('ARTUR GUIANG');
  const [treasurerTin, setTreasurerTin] = useState('440-615-026-000');
  const [secRegNo, setSecRegNo] = useState('CN202060557');
  const [associationTin, setAssociationTin] = useState('769-207-601-000');
  const [showAllYears, setShowAllYears] = useState(false);

  // Cash composition & balance sheet override inputs (FS3 / FS4)
  const [cashOnHand, setCashOnHand] = useState('');
  const [undepositedCollections, setUndepositedCollections] = useState('');
  const [cashInBankRegular, setCashInBankRegular] = useState('');
  const [cashInBankCBU, setCashInBankCBU] = useState('');
  const [savingsAccount, setSavingsAccount] = useState('');
  const [currentAccount, setCurrentAccount] = useState('');
  const [recv, setRecv] = useState('');
  const [materials, setMaterials] = useState('');
  const [officeBuilding, setOfficeBuilding] = useState('');
  const [notarialPermitFees, setNotarialPermitFees] = useState('');
  const [honorariumWagesPayable, setHonorariumWagesPayable] = useState('');
  const [otherAccountsPayable, setOtherAccountsPayable] = useState('');

  // Edit existing statement modal state
  const [editStmt, setEditStmt] = useState<FinancialStatement | null>(null);
  const [editErrorMsg, setEditErrorMsg] = useState<string | null>(null);
  const [editCashOnHand, setEditCashOnHand] = useState('');
  const [editUndepositedCollections, setEditUndepositedCollections] = useState('');
  const [editCashInBankRegular, setEditCashInBankRegular] = useState('');
  const [editCashInBankCBU, setEditCashInBankCBU] = useState('');
  const [editSavingsAccount, setEditSavingsAccount] = useState('');
  const [editCurrentAccount, setEditCurrentAccount] = useState('');
  const [editReceivables, setEditReceivables] = useState('');
  const [editMaterials, setEditMaterials] = useState('');
  const [editOfficeBuilding, setEditOfficeBuilding] = useState('');
  const [editNotarialPermitFees, setEditNotarialPermitFees] = useState('');
  const [editHonorariumWagesPayable, setEditHonorariumWagesPayable] = useState('');
  const [editOtherAccountsPayable, setEditOtherAccountsPayable] = useState('');
  const [editPresidentName, setEditPresidentName] = useState('');
  const [editTreasurerName, setEditTreasurerName] = useState('');
  const [editAuditorName, setEditAuditorName] = useState('');
  const [editTreasurerTin, setEditTreasurerTin] = useState('');
  const [editSecRegNo, setEditSecRegNo] = useState('');
  const [editAssociationTin, setEditAssociationTin] = useState('');

  function resetFormDefaults() {
    setTitle('');
    setPresidentName('MEYNARD TOMANENG');
    setTreasurerName('RIC UNDAY');
    setAuditorName('ARTUR GUIANG');
    setTreasurerTin('440-615-026-000');
    setSecRegNo('CN202060557');
    setAssociationTin('769-207-601-000');
    setCashOnHand('');
    setUndepositedCollections('');
    setCashInBankRegular('');
    setCashInBankCBU('');
    setSavingsAccount('');
    setCurrentAccount('');
    setRecv('');
    setMaterials('');
    setOfficeBuilding('');
    setNotarialPermitFees('');
    setHonorariumWagesPayable('');
    setOtherAccountsPayable('');
  }

  function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setGenErrorMsg(null);
    if (periodStart > periodEnd) {
      setGenErrorMsg('Period Start date cannot be later than Period End date.');
      return;
    }
    const hasCashOverrides = [cashOnHand, undepositedCollections, cashInBankRegular, cashInBankCBU, savingsAccount, currentAccount].some((v) => v.trim() !== '');
    const hasOtherOverrides = [recv, materials, officeBuilding, notarialPermitFees, honorariumWagesPayable, otherAccountsPayable].some((v) => v.trim() !== '');
    let overrides: StatementFinancialOverrides | undefined;
    if (hasCashOverrides || hasOtherOverrides) {
      overrides = {
        ...(cashOnHand.trim() ? { cashOnHand: Number(cashOnHand) } : {}),
        ...(undepositedCollections.trim() ? { undepositedCollections: Number(undepositedCollections) } : {}),
        ...(cashInBankRegular.trim() ? { cashInBankRegular: Number(cashInBankRegular) } : {}),
        ...(cashInBankCBU.trim() ? { cashInBankCBU: Number(cashInBankCBU) } : {}),
        ...(savingsAccount.trim() ? { savingsAccount: Number(savingsAccount) } : {}),
        ...(currentAccount.trim() ? { currentAccount: Number(currentAccount) } : {}),
        ...(recv.trim() ? { receivables: Number(recv) } : {}),
        ...(materials.trim() ? { materialsSuppliesInventory: Number(materials) } : {}),
        ...(officeBuilding.trim() ? { officeBuilding: Number(officeBuilding) } : {}),
        ...(notarialPermitFees.trim() ? { notarialPermitFees: Number(notarialPermitFees) } : {}),
        ...(honorariumWagesPayable.trim() ? { honorariumWagesPayable: Number(honorariumWagesPayable) } : {}),
        ...(otherAccountsPayable.trim() ? { otherAccountsPayable: Number(otherAccountsPayable) } : {}),
      };
    }
    startTransition(async () => {
      const res = await generateStatementAction(
        title,
        statementType,
        periodStart,
        periodEnd,
        true,
        { presidentName, treasurerName, auditorName, treasurerTin, secRegNo, associationTin },
        overrides
      );
      if (res.success && res.data) {
        setSelectedStatement(res.data);
        setShowModal(false);
        resetFormDefaults();
        setBannerMsg({ type: 'success', text: 'Financial statement report generated successfully.' });
        await loadStatements();
      } else if (!res.success) {
        setGenErrorMsg(res.message || 'Error generating financial statement.');
      }
    });
  }

  function openEdit(stmt: FinancialStatement) {
    const fs3 = stmt.report_data?.fs3 as FS3Data | undefined;
    const fs4 = stmt.report_data?.fs4 as FS4Data | undefined;
    const fs1 = stmt.report_data?.fs1 as FS1Data | undefined;
    setEditCashOnHand(fs3?.composition?.cashOnHandPetty != null ? String(fs3.composition.cashOnHandPetty) : '');
    setEditUndepositedCollections(fs3?.composition?.undepositedCollections != null ? String(fs3.composition.undepositedCollections) : '');
    setEditCashInBankRegular(fs3?.composition?.cashInBankRegular != null ? String(fs3.composition.cashInBankRegular) : '');
    setEditCashInBankCBU(fs3?.composition?.cashInBankCBU != null ? String(fs3.composition.cashInBankCBU) : '');
    setEditSavingsAccount(fs3?.composition?.savingsAccount != null ? String(fs3.composition.savingsAccount) : '');
    setEditCurrentAccount(fs3?.composition?.currentAccount != null ? String(fs3.composition.currentAccount) : '');
    setEditReceivables(fs4?.assets?.receivables != null ? String(fs4.assets.receivables) : '');
    setEditMaterials(fs4?.assets?.materialsSuppliesInventory != null ? String(fs4.assets.materialsSuppliesInventory) : '');
    setEditOfficeBuilding(fs4?.assets?.officeBuilding != null ? String(fs4.assets.officeBuilding) : '');
    setEditNotarialPermitFees(fs4?.liabilities?.notarialPermitFees != null ? String(fs4.liabilities.notarialPermitFees) : '');
    setEditHonorariumWagesPayable(fs4?.liabilities?.honorariumWagesPayable != null ? String(fs4.liabilities.honorariumWagesPayable) : '');
    setEditOtherAccountsPayable(fs4?.liabilities?.otherAccountsPayable != null ? String(fs4.liabilities.otherAccountsPayable) : '');
    // Officer fields live on edit state so the Generate form defaults are never mutated.
    setEditPresidentName(fs1?.officers?.presidentName || '');
    setEditTreasurerName(fs1?.officers?.treasurerName || fs3?.officers?.treasurerName || '');
    setEditAuditorName(fs1?.officers?.auditorName || fs3?.officers?.auditorName || '');
    setEditTreasurerTin(fs4?.officer?.treasurerTin || '');
    setEditSecRegNo(fs1?.secRegNo || fs3?.secRegNo || '');
    setEditAssociationTin(fs3?.tinNo || fs4?.tinNo || '');
    setEditErrorMsg(null);
    setEditStmt(stmt);
  }

  function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editStmt) return;
    setEditErrorMsg(null);
    const overrides: StatementFinancialOverrides = {
      cashOnHand: Number(editCashOnHand || 0),
      undepositedCollections: Number(editUndepositedCollections || 0),
      cashInBankRegular: Number(editCashInBankRegular || 0),
      cashInBankCBU: Number(editCashInBankCBU || 0),
      savingsAccount: Number(editSavingsAccount || 0),
      currentAccount: Number(editCurrentAccount || 0),
      receivables: Number(editReceivables || 0),
      materialsSuppliesInventory: Number(editMaterials || 0),
      officeBuilding: Number(editOfficeBuilding || 0),
      notarialPermitFees: Number(editNotarialPermitFees || 0),
      honorariumWagesPayable: Number(editHonorariumWagesPayable || 0),
      otherAccountsPayable: Number(editOtherAccountsPayable || 0),
    };
    startTransition(async () => {
      const res = await updateFinancialStatementAction(
        editStmt.id,
        { presidentName: editPresidentName, treasurerName: editTreasurerName, auditorName: editAuditorName, treasurerTin: editTreasurerTin, secRegNo: editSecRegNo, associationTin: editAssociationTin },
        overrides
      );
      if (res.success && res.data) {
        setSelectedStatement(res.data);
        setEditStmt(null);
        setBannerMsg({ type: 'success', text: 'Financial statement report updated successfully.' });
        await loadStatements();
      } else {
        setEditErrorMsg(res.message || 'Error updating financial statement.');
      }
    });
  }

  function handlePrintActivePDF() {
    setTimeout(() => {
      window.print();
    }, 100);
  }

  function handleConfirmDeleteStatement() {
    if (!deleteModalStmt) return;
    startTransition(async () => {
      await deleteFinancialStatementAction(deleteModalStmt.id);
      if (selectedStatement?.id === deleteModalStmt.id) {
        setSelectedStatement(null);
      }
      setBannerMsg({ type: 'success', text: 'Financial statement report deleted successfully.' });
      setDeleteModalStmt(null);
      await loadStatements();
    });
  }

  return (
    <TooltipProvider>
      <div className="space-y-6 animate-in fade-in duration-300">
      {bannerMsg && (
        <Alert variant={bannerMsg.type === 'error' ? 'destructive' : 'default'} className="mb-4 print:hidden">
          <div className="flex items-center justify-between w-full">
            <span>{bannerMsg.text}</span>
            <button onClick={() => setBannerMsg(null)} className="text-xs font-bold underline ml-4">Dismiss</button>
          </div>
        </Alert>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm print:hidden">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-50/80 border border-emerald-200 p-1 flex items-center justify-center shrink-0 shadow-xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/api/logo?v=latest" alt="NLFIA Logo" className="w-full h-full object-contain filter drop-shadow-xs" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-black tracking-tight text-slate-900 leading-tight">
              NIA Standard Financial Statements (FS1 - FS4)
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5 leading-relaxed">
              Comparative Receipts/Disbursements, Cash Flows, Cash Statement with Composition, and Balance Sheet with Notarization.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
          <button
            onClick={loadStatements}
            disabled={loading}
            className="p-2.5 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-xs active:scale-95 shrink-0"
            title="Refresh Statements"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {(userRole === 'admin' || userRole === 'treasurer') ? (
            <button
              onClick={() => setShowModal(true)}
              className="flex-1 sm:flex-none justify-center px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 active:scale-95 whitespace-nowrap"
            >
              <Calculator className="w-4 h-4 shrink-0" /> Generate FS Report
            </button>
          ) : (
            <span className="px-3.5 py-2.5 rounded-xl bg-slate-100 border border-slate-300 text-slate-600 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap">
              <Shield className="w-4 h-4 text-emerald-600 shrink-0" /> Read-Only FS View
            </span>
          )}
        </div>
      </div>

      {/* Main View Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-3 print:hidden">
          <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-400 px-1 flex items-center justify-between">
            <span>Generated FS Reports ({statements.length})</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          </h3>
          <div className="space-y-2 md:space-y-0 md:grid md:grid-cols-2 md:gap-2.5 xl:grid-cols-1 xl:space-y-0 xl:gap-2.5 max-h-[320px] sm:max-h-[420px] md:max-h-none lg:max-h-[600px] overflow-y-auto pr-1 overscroll-contain">
            {loading ? (
              <div className="p-8 text-center text-slate-400 md:col-span-2 xl:col-span-1">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                Loading statements...
              </div>
            ) : statements.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 bg-white border border-slate-200/90 rounded-2xl shadow-sm md:col-span-2 xl:col-span-1">
                No financial statements generated yet.
              </div>
            ) : (
              statements.map((stmt) => {
                const isSelected = selectedStatement?.id === stmt.id;
                return (
                  <div
                    key={stmt.id}
                    onClick={() => setSelectedStatement(stmt)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2.5 relative group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 ${
                      isSelected
                        ? 'bg-emerald-50/90 border-emerald-300 text-slate-900 shadow-md ring-1 ring-emerald-500/20'
                        : 'bg-white border-slate-200/90 text-slate-700 hover:border-slate-300 hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-[11px] font-black text-emerald-800 tracking-wide pt-0.5">{stmt.statement_number}</span>
                      <div className="flex items-center gap-0.5 shrink-0 -mr-1 -mt-0.5">
                        {(userRole === 'admin' || userRole === 'treasurer') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setRenameStmt(stmt);
                              setRenameTitle(stmt.title);
                              setRenameErrorMsg(null);
                            }}
                            title="Rename Report"
                            aria-label={`Rename ${stmt.statement_number}`}
                            className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 shrink-0"
                          >
                            <Tag className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {(userRole === 'admin' || userRole === 'treasurer') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEdit(stmt);
                            }}
                            title="Edit Statement Details"
                            aria-label={`Edit ${stmt.statement_number}`}
                            className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 shrink-0"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {userRole === 'admin' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteModalStmt(stmt);
                            }}
                            title="Delete Statement"
                            aria-label={`Delete ${stmt.statement_number}`}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="font-extrabold text-sm leading-snug text-slate-900 break-words">{stmt.title}</div>
                    <div className="pt-2 mt-1 border-t border-slate-100/80 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                      <span className="text-[11px] font-semibold text-slate-500">
                        {formatDate(stmt.period_start)} – {formatDate(stmt.period_end)}
                      </span>
                      <span className="font-mono text-[11px] font-black text-emerald-700 whitespace-nowrap">{formatPHP(Number(stmt.net_cash_flow))}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Active FS Tabbed Viewer */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-4">
          {selectedStatement ? (
            <Tabs value={activeFSTab} onValueChange={(v) => setActiveFSTab(v as any)} className="w-full space-y-4">
              {/* Action bar and Tab Switcher */}
              <div className="p-3 sm:p-4 bg-white border border-slate-200/90 rounded-2xl flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 shadow-sm print:hidden">
                {/* FS1, FS2, FS3, FS4 Tabs */}
                <TabsList className="grid grid-cols-2 sm:flex sm:flex-nowrap w-full lg:w-auto">
                  <TabsTrigger value="FS1" className="w-full sm:w-auto">
                    <Layers className="w-3.5 h-3.5 mr-1.5 shrink-0" /> FS1 <span className="font-semibold hidden sm:inline ml-1">(Receipts & Disb.)</span>
                  </TabsTrigger>
                  <TabsTrigger value="FS2" className="w-full sm:w-auto">
                    <TrendingUp className="w-3.5 h-3.5 mr-1.5 shrink-0" /> FS2 <span className="font-semibold hidden sm:inline ml-1">(Cash Flows)</span>
                  </TabsTrigger>
                  <TabsTrigger value="FS3" className="w-full sm:w-auto">
                    <Wallet className="w-3.5 h-3.5 mr-1.5 shrink-0" /> FS3 <span className="font-semibold hidden sm:inline ml-1">(Cash Balance)</span>
                  </TabsTrigger>
                  <TabsTrigger value="FS4" className="w-full sm:w-auto">
                    <Landmark className="w-3.5 h-3.5 mr-1.5 shrink-0" /> FS4 <span className="font-semibold hidden sm:inline ml-1">(Balance Sheet)</span>
                  </TabsTrigger>
                </TabsList>

                <div className="w-full lg:w-auto flex items-center justify-center lg:justify-end">
                  <button
                    onClick={handlePrintActivePDF}
                    className="flex-1 sm:flex-none justify-center px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs active:scale-95 whitespace-nowrap"
                    title="Print current FS report"
                  >
                    <Printer className="w-3.5 h-3.5 shrink-0" /> Print PDF
                  </button>
                </div>
              </div>

              {/* Render Selected FS View Component */}
              <TabsContent value="FS1">
                {selectedStatement.report_data?.fs1 && (
                  <FS1View data={selectedStatement.report_data.fs1 as FS1Data} />
                )}
              </TabsContent>
              <TabsContent value="FS2">
                {selectedStatement.report_data?.fs2 && (
                  <FS2View data={selectedStatement.report_data.fs2 as FS2Data} />
                )}
              </TabsContent>
              <TabsContent value="FS3">
                {selectedStatement.report_data?.fs3 && (
                  <FS3View data={selectedStatement.report_data.fs3 as FS3Data} />
                )}
              </TabsContent>
              <TabsContent value="FS4">
                {selectedStatement.report_data?.fs4 && (
                  <FS4View data={selectedStatement.report_data.fs4 as FS4Data} />
                )}
              </TabsContent>
            </Tabs>
          ) : (
            <div className="h-40 sm:h-64 p-6 flex items-center justify-center text-center text-slate-400 bg-white border border-slate-200/90 rounded-2xl shadow-sm font-medium text-xs">
              Select a report from the left panel to inspect statement metrics.
            </div>
          )}
        </div>
      </div>

      {/* Generator Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
          <div className="m-auto w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl p-4 sm:p-6 space-y-4 text-slate-900 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-emerald-700" /> Compile FS1 - FS4 Statement Suite
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700 text-xs font-bold px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors">
                Close
              </button>
            </div>

            <form onSubmit={handleGenerate} className="space-y-4 text-xs">
              {genErrorMsg && (
                <Alert variant="destructive">
                  {genErrorMsg}
                </Alert>
              )}

              <div>
                <label className="block font-black uppercase text-[10px] tracking-wider text-slate-500 mb-1.5">
                  Report Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                  placeholder="e.g. Annual Financial Statement Suite 2025"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all text-xs"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-black uppercase text-[10px] tracking-wider text-slate-500">
                    Reporting Fiscal Year *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAllYears(!showAllYears)}
                    className="text-[10px] text-emerald-700 hover:text-emerald-800 font-bold underline"
                  >
                    {showAllYears ? 'Show Concise List' : 'See More Years...'}
                  </button>
                </div>
                <Select
                  value={periodStart.split('-')[0]}
                  onValueChange={(yr) => {
                    const startMonthDay = periodStart.substring(5) || '01-01';
                    const endMonthDay = periodEnd.substring(5) || '12-31';
                    setPeriodStart(`${yr}-${startMonthDay}`);
                    setPeriodEnd(`${yr}-${endMonthDay}`);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select fiscal year..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(showAllYears
                      ? Array.from({ length: Math.max(15, new Date().getFullYear() - 2020 + 10) }, (_, i) => 2020 + i)
                      : Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i)
                    ).map((yr) => (
                      <SelectItem key={yr} value={String(yr)}>
                        FY {yr} (Comparative {yr} vs {yr - 1})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-black uppercase text-[10px] tracking-wider text-slate-500 mb-1.5">
                    Period Start (Month & Day) *
                  </label>
                  <input
                    type="date"
                    required
                    min={`${periodStart.split('-')[0]}-01-01`}
                    max={`${periodStart.split('-')[0]}-12-31`}
                    value={periodStart}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const newDate = e.target.value;
                      const selectedYr = periodStart.split('-')[0];
                      if (newDate) {
                        const monthDay = newDate.substring(5);
                        setPeriodStart(`${selectedYr}-${monthDay}`);
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all text-xs"
                  />
                </div>
                <div>
                  <label className="block font-black uppercase text-[10px] tracking-wider text-slate-500 mb-1.5">
                    Period End (Month & Day) *
                  </label>
                  <input
                    type="date"
                    required
                    min={`${periodStart.split('-')[0]}-01-01`}
                    max={`${periodStart.split('-')[0]}-12-31`}
                    value={periodEnd}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const newDate = e.target.value;
                      const selectedYr = periodStart.split('-')[0];
                      if (newDate) {
                        const monthDay = newDate.substring(5);
                        setPeriodEnd(`${selectedYr}-${monthDay}`);
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all text-xs"
                  />
                </div>
              </div>

              {/* Editable Official Signatories */}
              <div className="border-t border-slate-200 pt-3 space-y-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="font-black uppercase text-[10px] tracking-wider text-slate-700">
                    Official Signatories & Officers (Editable)
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="text-slate-400 hover:text-slate-600 transition-colors">
                        <HelpCircle className="w-3.5 h-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Officer names and TIN numbers propagate across all printed financial reports (FS1-FS4) and auto-reset after compilation.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-medium text-[10px] text-slate-500 mb-1">
                      IA President
                    </label>
                    <input
                      type="text"
                      value={presidentName}
                      onChange={(e) => setPresidentName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-[10px] text-slate-500 mb-1">
                      IA Treasurer
                    </label>
                    <input
                      type="text"
                      value={treasurerName}
                      onChange={(e) => setTreasurerName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-[10px] text-slate-500 mb-1">
                      IA Auditor
                    </label>
                    <input
                      type="text"
                      value={auditorName}
                      onChange={(e) => setAuditorName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-[10px] text-slate-500 mb-1">
                      Treasurer TIN
                    </label>
                    <input
                      type="text"
                      value={treasurerTin}
                      onChange={(e) => setTreasurerTin(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-[10px] text-slate-500 mb-1">
                      SEC Reg. No.
                    </label>
                    <input
                      type="text"
                      value={secRegNo}
                      onChange={(e) => setSecRegNo(e.target.value)}
                      placeholder="CN202060557"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-[10px] text-slate-500 mb-1">
                      Association TIN No.
                    </label>
                    <input
                      type="text"
                      value={associationTin}
                      onChange={(e) => setAssociationTin(e.target.value)}
                      placeholder="769-207-601-000"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 text-xs font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Optional Cash Composition & Balance Sheet overrides (FS3/FS4) */}
              <div className="border-t border-slate-200 pt-3 space-y-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="font-black uppercase text-[10px] tracking-wider text-slate-700">
                    Optional: Cash Position & Balance Sheet
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="text-slate-400 hover:text-slate-600 transition-colors">
                        <HelpCircle className="w-3.5 h-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Leave blank to auto-allocate the fund balance into cash on hand (15%) and bank (85%). Enter real figures to reflect where the cash actually is, and add real receivables/assets/liabilities so FS4 matches your books.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="text-[10px] font-semibold text-slate-500">Cash Composition (FS3) — must total the fund balance</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block font-medium text-[10px] text-slate-500 mb-1">Cash on Hand (Petty)</label>
                    <input
                      type="number" min="0" step="0.01"
                      value={cashOnHand}
                      onChange={(e) => setCashOnHand(e.target.value)}
                      placeholder="Auto"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-[10px] text-slate-500 mb-1">Undeposited Collections</label>
                    <input
                      type="number" min="0" step="0.01"
                      value={undepositedCollections}
                      onChange={(e) => setUndepositedCollections(e.target.value)}
                      placeholder="0"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-[10px] text-slate-500 mb-1">Cash in Bank (Regular)</label>
                    <input
                      type="number" min="0" step="0.01"
                      value={cashInBankRegular}
                      onChange={(e) => setCashInBankRegular(e.target.value)}
                      placeholder="Auto"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-[10px] text-slate-500 mb-1">Cash in Bank (CBU)</label>
                    <input
                      type="number" min="0" step="0.01"
                      value={cashInBankCBU}
                      onChange={(e) => setCashInBankCBU(e.target.value)}
                      placeholder="Auto"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-[10px] text-slate-500 mb-1">Savings Account</label>
                    <input
                      type="number" min="0" step="0.01"
                      value={savingsAccount}
                      onChange={(e) => setSavingsAccount(e.target.value)}
                      placeholder="0"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-[10px] text-slate-500 mb-1">Current Account</label>
                    <input
                      type="number" min="0" step="0.01"
                      value={currentAccount}
                      onChange={(e) => setCurrentAccount(e.target.value)}
                      placeholder="0"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 text-xs font-semibold"
                    />
                  </div>
                </div>
                <div className="text-[10px] font-semibold text-slate-500 pt-1">Balance Sheet (FS4) — leave blank for P 0</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block font-medium text-[10px] text-slate-500 mb-1">Receivables</label>
                    <input
                      type="number" min="0" step="0.01"
                      value={recv}
                      onChange={(e) => setRecv(e.target.value)}
                      placeholder="0"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-[10px] text-slate-500 mb-1">Materials & Supplies Inv.</label>
                    <input
                      type="number" min="0" step="0.01"
                      value={materials}
                      onChange={(e) => setMaterials(e.target.value)}
                      placeholder="0"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-[10px] text-slate-500 mb-1">IA Office Building</label>
                    <input
                      type="number" min="0" step="0.01"
                      value={officeBuilding}
                      onChange={(e) => setOfficeBuilding(e.target.value)}
                      placeholder="0"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-[10px] text-slate-500 mb-1">Notarial/Permit Fees Payable</label>
                    <input
                      type="number" min="0" step="0.01"
                      value={notarialPermitFees}
                      onChange={(e) => setNotarialPermitFees(e.target.value)}
                      placeholder="0"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-[10px] text-slate-500 mb-1">Honorarium/Wages Payable</label>
                    <input
                      type="number" min="0" step="0.01"
                      value={honorariumWagesPayable}
                      onChange={(e) => setHonorariumWagesPayable(e.target.value)}
                      placeholder="0"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-[10px] text-slate-500 mb-1">Other Accounts Payable</label>
                    <input
                      type="number" min="0" step="0.01"
                      value={otherAccountsPayable}
                      onChange={(e) => setOtherAccountsPayable(e.target.value)}
                      placeholder="0"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 text-xs font-semibold"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2 active:scale-95 text-xs"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Compile FS1-FS4 Financial Suite'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Statement Report Modal */}
      <Dialog open={!!deleteModalStmt} onOpenChange={(open) => !open && setDeleteModalStmt(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-rose-100 text-rose-800 border border-rose-200">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle>Delete Statement Report?</DialogTitle>
                <DialogDescription>Permanently remove generated report</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {deleteModalStmt && (
            <div className="space-y-3">
              <Alert variant="destructive">
                Are you sure you want to delete report <strong>{deleteModalStmt.statement_number}</strong> ({deleteModalStmt.title})?
              </Alert>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeleteModalStmt(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteStatement}
                  disabled={isPending}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold transition-all shadow-md active:scale-95 flex items-center gap-2"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Yes, Delete Report
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Statement Report Modal */}
      <Dialog open={!!editStmt} onOpenChange={(open) => !open && setEditStmt(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200">
                <Pencil className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle>Edit Statement Details</DialogTitle>
                <DialogDescription>{editStmt?.statement_number} — {editStmt?.title}</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {editStmt && (
            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              {editErrorMsg && <Alert variant="destructive">{editErrorMsg}</Alert>}

              <div className="border-b border-slate-200 pb-3 space-y-2.5">
                <span className="block font-black uppercase text-[10px] tracking-wider text-slate-700">
                  Official Signatories & Officers
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-medium text-[10px] text-slate-500 mb-1">IA President</label>
                    <input type="text" value={editPresidentName} onChange={(e) => setEditPresidentName(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block font-medium text-[10px] text-slate-500 mb-1">IA Treasurer</label>
                    <input type="text" value={editTreasurerName} onChange={(e) => setEditTreasurerName(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block font-medium text-[10px] text-slate-500 mb-1">IA Auditor</label>
                    <input type="text" value={editAuditorName} onChange={(e) => setEditAuditorName(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block font-medium text-[10px] text-slate-500 mb-1">Treasurer TIN</label>
                    <input type="text" value={editTreasurerTin} onChange={(e) => setEditTreasurerTin(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block font-medium text-[10px] text-slate-500 mb-1">SEC Reg. No.</label>
                    <input type="text" value={editSecRegNo} onChange={(e) => setEditSecRegNo(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block font-medium text-[10px] text-slate-500 mb-1">Association TIN No.</label>
                    <input type="text" value={editAssociationTin} onChange={(e) => setEditAssociationTin(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 text-xs font-semibold" />
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="font-black uppercase text-[10px] tracking-wider text-slate-700">
                    Cash Composition (FS3)
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="text-slate-400 hover:text-slate-600 transition-colors">
                        <HelpCircle className="w-3.5 h-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Must total the statement&apos;s fund balance. Adjust to match your real cash in hand and bank accounts.</TooltipContent>
                  </Tooltip>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block font-medium text-[10px] text-slate-500 mb-1">Cash on Hand (Petty)</label>
                    <input type="number" min="0" step="0.01" value={editCashOnHand} onChange={(e) => setEditCashOnHand(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block font-medium text-[10px] text-slate-500 mb-1">Undeposited Collections</label>
                    <input type="number" min="0" step="0.01" value={editUndepositedCollections} onChange={(e) => setEditUndepositedCollections(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block font-medium text-[10px] text-slate-500 mb-1">Cash in Bank (Regular)</label>
                    <input type="number" min="0" step="0.01" value={editCashInBankRegular} onChange={(e) => setEditCashInBankRegular(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block font-medium text-[10px] text-slate-500 mb-1">Cash in Bank (CBU)</label>
                    <input type="number" min="0" step="0.01" value={editCashInBankCBU} onChange={(e) => setEditCashInBankCBU(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block font-medium text-[10px] text-slate-500 mb-1">Savings Account</label>
                    <input type="number" min="0" step="0.01" value={editSavingsAccount} onChange={(e) => setEditSavingsAccount(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block font-medium text-[10px] text-slate-500 mb-1">Current Account</label>
                    <input type="number" min="0" step="0.01" value={editCurrentAccount} onChange={(e) => setEditCurrentAccount(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 text-xs font-semibold" />
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                <span className="block font-black uppercase text-[10px] tracking-wider text-slate-700">
                  Balance Sheet Assets & Liabilities (FS4)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block font-medium text-[10px] text-slate-500 mb-1">Receivables</label>
                    <input type="number" min="0" step="0.01" value={editReceivables} onChange={(e) => setEditReceivables(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block font-medium text-[10px] text-slate-500 mb-1">Materials & Supplies Inv.</label>
                    <input type="number" min="0" step="0.01" value={editMaterials} onChange={(e) => setEditMaterials(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block font-medium text-[10px] text-slate-500 mb-1">IA Office Building</label>
                    <input type="number" min="0" step="0.01" value={editOfficeBuilding} onChange={(e) => setEditOfficeBuilding(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block font-medium text-[10px] text-slate-500 mb-1">Notarial/Permit Fees Payable</label>
                    <input type="number" min="0" step="0.01" value={editNotarialPermitFees} onChange={(e) => setEditNotarialPermitFees(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block font-medium text-[10px] text-slate-500 mb-1">Honorarium/Wages Payable</label>
                    <input type="number" min="0" step="0.01" value={editHonorariumWagesPayable} onChange={(e) => setEditHonorariumWagesPayable(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block font-medium text-[10px] text-slate-500 mb-1">Other Accounts Payable</label>
                    <input type="number" min="0" step="0.01" value={editOtherAccountsPayable} onChange={(e) => setEditOtherAccountsPayable(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 text-xs font-semibold" />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditStmt(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2 disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Save Changes
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Rename Statement Report Modal */}
      <Dialog open={!!renameStmt} onOpenChange={(open) => !open && setRenameStmt(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200">
                <Tag className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle>Rename Report</DialogTitle>
                <DialogDescription>{renameStmt?.statement_number} — give this report a new title.</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {renameStmt && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setRenameErrorMsg(null);
                setRenameSaving(true);
                const res = await renameFinancialStatementAction(renameStmt.id, renameTitle);
                setRenameSaving(false);
                if (!res.success) {
                  setRenameErrorMsg(res.message);
                  return;
                }
                setStatements((prev) => prev.map((s) => (s.id === renameStmt.id ? { ...s, title: (res.data?.title || '').trim() || renameTitle.trim() } : s)));
                setSelectedStatement((prev) => (prev && prev.id === renameStmt.id ? { ...prev, title: (res.data?.title || '').trim() || renameTitle.trim() } : prev));
                setBannerMsg({ type: 'success', text: res.message });
                setRenameStmt(null);
              }}
              className="space-y-4 text-xs"
            >
              {renameErrorMsg && <Alert variant="destructive">{renameErrorMsg}</Alert>}

              <div>
                <label className="block font-medium text-[10px] text-slate-500 mb-1">Report Title</label>
                <input
                  type="text"
                  required
                  maxLength={200}
                  value={renameTitle}
                  onChange={(e) => setRenameTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 text-xs font-semibold"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRenameStmt(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={renameSaving}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2 disabled:opacity-50"
                >
                  {renameSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Save New Title
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </TooltipProvider>
  );
}
