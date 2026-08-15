'use client';

import React, { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { useLoadOnce } from '@/lib/hooks/useLoadOnce';
import { 
  getFinancialStatementsAction, generateStatementAction, 
  deleteFinancialStatementAction, updateFinancialStatementAction, renameFinancialStatementAction
} from '@/app/actions/statements';
import { getAssociationsAction } from '@/app/actions/associations';
import { getSelfProfileAction } from '@/app/actions/auth';
import { 
  FinancialStatement, StatementType, FS1Data, FS2Data, FS3Data, FS4Data, 
  UserRole, StatementFinancialOverrides, Association, FinancialStatementEdits,
  FinancialStatementBreakdown
} from '@/types';
import { formatPHP } from '@/lib/utils/formatters';
import { recomputeBreakdown } from '@/lib/financial/recompute';
import { markUnsaved, announceSaveDone } from '@/lib/unsavedChanges';
import FS1View from '@/components/statements/FS1View';
import FS2View from '@/components/statements/FS2View';
import FS3View from '@/components/statements/FS3View';
import FS4View from '@/components/statements/FS4View';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, Printer, Loader2, Calculator, Trash2, 
  Layers, TrendingUp, Wallet, Landmark, HelpCircle, Shield, Pencil, 
  CheckCircle2, Tag, Building2, Save, Calendar, Sparkles, X, Users, AlertTriangle 
} from 'lucide-react';
import { exportToPDFPrint, buildExportFilename } from '@/lib/utils/export';

export default function FinancialStatementsPage() {
  const [statements, setStatements] = useState<FinancialStatement[]>([]);
  const [associations, setAssociations] = useState<Association[]>([]);
  const [selectedAssocId, setSelectedAssocId] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [selectedStatement, setSelectedStatement] = useState<FinancialStatement | null>(null);
  const [activeFSTab, setActiveFSTab] = useState<'FS1' | 'FS2' | 'FS3' | 'FS4'>('FS1');
  const [userRole, setUserRole] = useState<UserRole>('auditor');

  // Generator & Modal State
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deleteModalStmt, setDeleteModalStmt] = useState<FinancialStatement | null>(null);
  const [bannerMsg, setBannerMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Auto-dismiss notifications after a few seconds
  useEffect(() => {
    if (!bannerMsg) return;
    const timer = setTimeout(() => setBannerMsg(null), 6000);
    return () => clearTimeout(timer);
  }, [bannerMsg]);

  const FS_TAB_LABELS: Record<'FS1' | 'FS2' | 'FS3' | 'FS4', string> = {
    FS1: 'FS1: Receipts & Expenses',
    FS2: 'FS2: Financial Condition',
    FS3: 'FS3: Cash Composition',
    FS4: 'FS4: Balance Sheet',
  };

  // Generator Inputs (Comparative Years Layout)
  const currentYearNum = new Date().getFullYear();
  const [genAssocId, setGenAssocId] = useState('ia-nangurisan');
  const [genTitle, setGenTitle] = useState('');
  const [genOfficerPresident, setGenOfficerPresident] = useState('');
  const [genOfficerTreasurer, setGenOfficerTreasurer] = useState('');
  const [genOfficerAuditor, setGenOfficerAuditor] = useState('');
  const [selectedYear, setSelectedYear] = useState<number>(currentYearNum);
  const [priorYear, setPriorYear] = useState<number>(currentYearNum - 1);
  const [periodStart, setPeriodStart] = useState(`${currentYearNum}-01-01`);
  const [periodEnd, setPeriodEnd] = useState(`${currentYearNum}-12-31`);

  // Editable FS State (Interconnected calculation)
  const [editFS1, setEditFS1] = useState<FS1Data | null>(null);
  const [editFS2, setEditFS2] = useState<FS2Data | null>(null);
  const [editFS3, setEditFS3] = useState<FS3Data | null>(null);
  const [editFS4, setEditFS4] = useState<FS4Data | null>(null);

  // Inline edit modes: 'auto' (accounting-linked, read-only) or 'manual' (edit line items inline)
  const [editMode, setEditMode] = useState<'auto' | 'manual'>('auto');
  const [draftData, setDraftData] = useState<FinancialStatementBreakdown | null>(null);
  const [hasEdits, setHasEdits] = useState(false);
  const [savingInline, setSavingInline] = useState(false);
  const [navConfirm, setNavConfirm] = useState<{ message: string; action: () => void } | null>(null);

  const canEditReports =
    userRole === 'super_admin' || userRole === 'admin' || userRole === 'treasurer';

  const MODE_LABELS = {
    auto: { label: 'View Only', hint: 'Generated from the ledger/transactions. Read-only.' },
    manual: { label: 'Edit', hint: 'Click any line item to change it — totals and all sheets auto-recompute.' },
  };

  // Reset inline editing when switching statements
  useEffect(() => {
    setEditMode('auto');
    setDraftData(null);
    setHasEdits(false);
  }, [selectedStatement?.id]);

  const pinCount = (edits?: FinancialStatementEdits) =>
    edits ? Object.values(edits).filter((e) => e?.mode === 'force').length : 0;

  function viewReportData(): FinancialStatementBreakdown | null {
    if (!selectedStatement?.report_data) return null;
    if (editMode === 'manual' && draftData) return draftData;
    return selectedStatement.report_data;
  }

  function viewEdits(): FinancialStatementEdits | undefined {
    if (!selectedStatement?.report_data) return undefined;
    if (editMode === 'manual') return draftData?.edits;
    return selectedStatement.report_data.edits;
  }

  function enterManualEdit() {
    if (!selectedStatement?.report_data) return;
    setDraftData(JSON.parse(JSON.stringify(selectedStatement.report_data)));
    setHasEdits(false);
    setEditMode('manual');
  }

  function switchEditMode(mode: 'auto' | 'manual') {
    if (mode === editMode) return;
    if (mode === 'manual') {
      enterManualEdit();
      return;
    }
    requestNav(() => {
      setDraftData(null);
      setHasEdits(false);
      setEditMode('auto');
    }, 'You have unsaved changes. Going back to View Only will keep them un-saved in the ledger.');
  }

  const saveHandlerRef = useRef<() => Promise<boolean>>(async () => false);
  saveHandlerRef.current = handleSaveInline;

  useEffect(() => {
    markUnsaved(editMode === 'manual' && hasEdits);
  }, [editMode, hasEdits]);

  useEffect(() => {
    const onSaveRequest = async () => {
      announceSaveDone(await saveHandlerRef.current());
    };
    window.addEventListener('iarms:save-request', onSaveRequest);
    return () => window.removeEventListener('iarms:save-request', onSaveRequest);
  }, []);

  function requestNav(action: () => void, message?: string) {
    if (editMode === 'manual' && hasEdits) {
      setNavConfirm({ message: message || 'You have unsaved changes to this report.', action });
    } else {
      action();
    }
  }

  async function handleNavSave() {
    if (!navConfirm) return;
    const { action } = navConfirm;
    setNavConfirm(null);
    await handleSaveInline();
    action();
  }

  function handleNavDiscard() {
    if (!navConfirm) return;
    const { action } = navConfirm;
    setNavConfirm(null);
    setDraftData(null);
    setHasEdits(false);
    setEditMode('auto');
    action();
  }

  function handleNavCancel() {
    setNavConfirm(null);
  }

  function handleReportFieldChange(path: string, value: number | string) {
    setHasEdits(true);
    setDraftData((prev) => {
      const base = prev ?? JSON.parse(JSON.stringify(selectedStatement?.report_data || {}));
      const next = JSON.parse(JSON.stringify(base));

      // Custom FS1 line: add a new row (label + current/prior amounts)
      if (path === 'fs1.extraReceipts:add' || path === 'fs1.extraDisbursements:add') {
        const key = path === 'fs1.extraReceipts:add' ? 'extraReceipts' : 'extraDisbursements';
        next.fs1 = next.fs1 || {};
        next.fs1[key] = [...(next.fs1[key] || []), { label: '', current: 0, prior: 0 }];
        return recomputeBreakdown(next);
      }

      // Custom FS1 line: remove a row + clear its override pins
      const removeMatch = path.match(/^(fs1\.(extraReceipts|extraDisbursements)):remove:(\d+)$/);
      if (removeMatch) {
        const [, prefix, , idxStr] = removeMatch;
        const idx = Number(idxStr);
        const key = removeMatch[2] as 'extraReceipts' | 'extraDisbursements';
        const arr = next.fs1?.[key];
        if (Array.isArray(arr) && idx >= 0 && idx < arr.length) {
          next.fs1[key] = arr.filter((_, i) => i !== idx);
          if (next.edits) {
            for (const k of Object.keys(next.edits)) {
              if (k.startsWith(`${prefix}.${idx}.`)) delete next.edits[k];
            }
          }
        }
        return recomputeBreakdown(next);
      }

      // Reset a manual override back to the computed value
      if (path.endsWith(':unpin')) {
        const basePath = path.slice(0, -':unpin'.length);
        if (next.edits) {
          delete next.edits[basePath];
          if (Object.keys(next.edits).length === 0) delete next.edits;
        }
        return recomputeBreakdown(next);
      }

      // Manual pin on a line item
      next.edits = next.edits || {};
      next.edits[path] = { mode: 'force', value, updatedAt: new Date().toISOString() };
      return recomputeBreakdown(next);
    });
  }

  function discardManual() {
    setDraftData(null);
    setHasEdits(false);
    setEditMode('auto');
  }

  async function handleSaveInline(): Promise<boolean> {
    if (!selectedStatement || !selectedStatement.report_data || savingInline) return false;
    const rd = draftData ?? selectedStatement.report_data;
    const cleanExtra = (rows?: Array<{ label: string; current: number; prior: number }>) =>
      (rows || []).filter((x) => {
        const hasAmount = Number(x.current || 0) !== 0 || Number(x.prior || 0) !== 0;
        const hasLabel = !!String(x.label || '').trim();
        return hasAmount || hasLabel;
      });
    const savePayload = {
      fs1: rd.fs1,
      fs2: rd.fs2,
      fs3: rd.fs3,
      fs4: rd.fs4,
      edits: rd.edits,
    };
    if (savePayload.fs1) {
      savePayload.fs1 = {
        ...savePayload.fs1,
        extraReceipts: cleanExtra(savePayload.fs1.extraReceipts),
        extraDisbursements: cleanExtra(savePayload.fs1.extraDisbursements),
      };
    }
    setSavingInline(true);
    const res = await updateFinancialStatementAction(selectedStatement.id, { ...savePayload } as any);
    setSavingInline(false);
    setBannerMsg({ type: res.success ? 'success' : 'error', text: res.message });
    if (res.success && res.data) {
      setStatements((prev) => prev.map((s) => (s.id === res.data!.id ? res.data! : s)));
      setSelectedStatement(res.data);
    }
    setDraftData(null);
    setHasEdits(false);
    setEditMode('auto');
    return res.success;
  }

  // Sync dates when selectedYear changes
  function handleYearChange(year: number) {
    setSelectedYear(year);
    setPriorYear(year - 1);
    setPeriodStart(`${year}-01-01`);
    setPeriodEnd(`${year}-12-31`);
  }

  const loadStatements = useCallback(async () => {
    setLoading(true);
    try {
      const [stmtRes, assocRes, selfRes] = await Promise.all([
        getFinancialStatementsAction(selectedAssocId),
        getAssociationsAction(),
        getSelfProfileAction(),
      ]);

      if (selfRes.success && selfRes.data) {
        setUserRole(selfRes.data.role);
        if (selfRes.data.role !== 'super_admin' && selfRes.data.association_id) {
          setSelectedAssocId(selfRes.data.association_id);
          setGenAssocId(selfRes.data.association_id);
        }
      }
      if (assocRes.success && assocRes.data) {
        setAssociations(assocRes.data);
        if (assocRes.data[0] && selfRes.data?.role === 'super_admin') {
          setGenAssocId(assocRes.data[0].id);
        }
      }
      if (stmtRes.success && stmtRes.data) {
        setStatements(stmtRes.data);
        if (stmtRes.data.length > 0) {
          setSelectedStatement(stmtRes.data[0]);
        } else {
          setSelectedStatement(null);
        }
      }
    } catch (err) {
      console.error('Failed to load financial statements:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedAssocId]);

  useLoadOnce(loadStatements);

  // Open Edit Modal with current statement's JSON data
  function openEditModal() {
    if (!selectedStatement || !selectedStatement.report_data) return;
    const rd = selectedStatement.report_data;
    setEditFS1(rd.fs1 ? JSON.parse(JSON.stringify(rd.fs1)) : null);
    setEditFS2(rd.fs2 ? JSON.parse(JSON.stringify(rd.fs2)) : null);
    setEditFS3(rd.fs3 ? JSON.parse(JSON.stringify(rd.fs3)) : null);
    setEditFS4(rd.fs4 ? JSON.parse(JSON.stringify(rd.fs4)) : null);
    setShowEditModal(true);
  }

  // Handle live recalculation across all interconnected statements
  function handleRecalculateAndSave() {
    if (!selectedStatement || !editFS1) return;

    // Recalculate FS1 Totals & Net Surplus
    const r = editFS1.receipts;
    const rCurrentTotal = 
      (Number(r.membershipFees?.current) || 0) +
      (Number(r.annualDues?.current) || 0) +
      (Number(r.omSubsidy?.current) || 0) +
      (Number(r.canalRemuIncentive?.current) || 0) +
      (Number(r.finesPenalties?.current) || 0) +
      (Number(r.interestEarned?.current) || 0) +
      (Number(r.otherIncome?.current) || 0);

    const rPriorTotal = 
      (Number(r.membershipFees?.prior) || 0) +
      (Number(r.annualDues?.prior) || 0) +
      (Number(r.omSubsidy?.prior) || 0) +
      (Number(r.canalRemuIncentive?.prior) || 0) +
      (Number(r.finesPenalties?.prior) || 0) +
      (Number(r.interestEarned?.prior) || 0) +
      (Number(r.otherIncome?.prior) || 0);

    r.total = { current: rCurrentTotal, prior: rPriorTotal };

    const d = editFS1.disbursements;
    const dCurrentTotal = 
      (Number(d.registrationPermits?.current) || 0) +
      (Number(d.travelRep?.current) || 0) +
      (Number(d.meetingExpenses?.current) || 0) +
      (Number(d.officeSupplies?.current) || 0) +
      (Number(d.salariesWages?.current) || 0) +
      (Number(d.canalClearingRepair?.current) || 0) +
      (Number(d.professionalFee?.current) || 0) +
      (Number(d.federationShare?.current) || 0) +
      (Number(d.pisoMulaSaPuso?.current) || 0) +
      (Number(d.taxLicenses?.current) || 0) +
      (Number(d.otherExpenses?.current) || 0) +
      (Number(d.repairMaintenance?.current) || 0) +
      (Number(d.distributedIAShare?.current) || 0);

    const dPriorTotal = 
      (Number(d.registrationPermits?.prior) || 0) +
      (Number(d.travelRep?.prior) || 0) +
      (Number(d.meetingExpenses?.prior) || 0) +
      (Number(d.officeSupplies?.prior) || 0) +
      (Number(d.salariesWages?.prior) || 0) +
      (Number(d.canalClearingRepair?.prior) || 0) +
      (Number(d.professionalFee?.prior) || 0) +
      (Number(d.federationShare?.prior) || 0) +
      (Number(d.pisoMulaSaPuso?.prior) || 0) +
      (Number(d.taxLicenses?.prior) || 0) +
      (Number(d.otherExpenses?.prior) || 0) +
      (Number(d.repairMaintenance?.prior) || 0) +
      (Number(d.distributedIAShare?.prior) || 0);

    d.total = { current: dCurrentTotal, prior: dPriorTotal };

    const netSurplusCurrent = rCurrentTotal - dCurrentTotal;
    const netSurplusPrior = rPriorTotal - dPriorTotal;
    editFS1.netSurplus = { current: netSurplusCurrent, prior: netSurplusPrior };

    const begCurrent = Number(editFS1.membersEquity?.fundBalanceBeginning?.current) || 0;
    const begPrior = Number(editFS1.membersEquity?.fundBalanceBeginning?.prior) || 0;
    const endCurrent = begCurrent + netSurplusCurrent;
    const endPrior = begPrior + netSurplusPrior;

    editFS1.membersEquity = {
      fundBalanceBeginning: { current: begCurrent, prior: begPrior },
      netSavingsYear: { current: netSurplusCurrent, prior: netSurplusPrior },
      fundBalanceEnd: { current: endCurrent, prior: endPrior },
    };

    // Interconnect FS2
    if (editFS2) {
      editFS2.cashFlows = {
        netSurplus: { current: netSurplusCurrent, prior: netSurplusPrior },
        depreciation: { current: Number(editFS2.cashFlows?.depreciation?.current) || 0, prior: 0 },
        cashBalanceBeginning: { current: begCurrent, prior: begPrior },
        cashBalanceEnd: { current: endCurrent, prior: endPrior },
      };
      const inv = Number(editFS2.financialCondition?.assets?.inventorySupplies?.current) || 0;
      const bld = Number(editFS2.financialCondition?.assets?.officeBuilding?.current) || 0;
      editFS2.financialCondition.assets.currentAssets = { current: endCurrent, prior: endPrior };
      editFS2.financialCondition.assets.totalAssets = { current: endCurrent + inv + bld, prior: endPrior };
      editFS2.financialCondition.liabilitiesEquity.membersEquity = { current: endCurrent, prior: endPrior };
    }

    // Interconnect FS3
    if (editFS3) {
      editFS3.cashBalanceThisYear = netSurplusCurrent;
      editFS3.fundBalanceLastReport = begCurrent;
      editFS3.totalCashBalance = endCurrent;
      if (editFS3.composition) {
        editFS3.composition.total = endCurrent;
      }
    }

    // Interconnect FS4
    if (editFS4) {
      const coh = Number(editFS4.assets?.cashOnHand) || 0;
      const cib = Number(editFS4.assets?.cashInBank) || 0;
      const rec = Number(editFS4.assets?.receivables) || 0;
      const mat = Number(editFS4.assets?.materialsSuppliesInventory) || 0;
      const bld = Number(editFS4.assets?.officeBuilding) || 0;
      const totalAssets = coh + cib + rec + mat + bld;
      editFS4.assets.totalAssets = totalAssets;

      const not = Number(editFS4.liabilities?.notarialPermitFees) || 0;
      const wag = Number(editFS4.liabilities?.honorariumWagesPayable) || 0;
      const oth = Number(editFS4.liabilities?.otherAccountsPayable) || 0;
      const totalLiab = not + wag + oth;
      editFS4.liabilities.totalLiabilities = totalLiab;
      editFS4.netWorth = totalAssets - totalLiab;
    }

    startTransition(async () => {
      try {
        const res = await updateFinancialStatementAction(selectedStatement.id, {
          fs1: editFS1,
          fs2: editFS2 || undefined,
          fs3: editFS3 || undefined,
          fs4: editFS4 || undefined,
        });

        if (res.success && res.data) {
          setSelectedStatement(res.data);
          setShowEditModal(false);
          setBannerMsg({ type: 'success', text: 'Financial statement figures recalculated and saved successfully.' });
          loadStatements();
        } else {
          setBannerMsg({ type: 'error', text: res.message || 'Failed to update statement.' });
        }
      } catch (err: any) {
        setBannerMsg({ type: 'error', text: err?.message || 'Unexpected error while saving the statement.' });
      }
    });
  }

  // Handle Generate FS Report Submit
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleGenerateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isGenerating || isPending) return;
    const targetAssoc = associations.find((a) => a.id === genAssocId);
    setIsGenerating(true);

    try {
      const res = await generateStatementAction(
        genTitle || `${targetAssoc?.name || 'IA'} Financial Statement (${selectedYear})`,
        'fs1',
        periodStart,
        periodEnd,
        true,
        genAssocId,
        {
          associationName: targetAssoc?.name,
          address: targetAssoc?.mailing_address,
          presidentName: genOfficerPresident.trim() || targetAssoc?.president_name,
          treasurerName: genOfficerTreasurer.trim() || 'RIC UNDAY',
          auditorName: genOfficerAuditor.trim() || 'ARTUR GUIANG',
          secRegNo: targetAssoc?.sec_registration_number,
          associationTin: targetAssoc?.tin_number,
        }
      );

      setShowGenerateModal(false);
      if (res.success && res.data) {
        setBannerMsg({ type: 'success', text: res.message });
        setSelectedStatement(res.data);
        loadStatements();
      } else {
        setBannerMsg({ type: 'error', text: res.message || 'Failed to generate statement.' });
      }
    } catch (err: any) {
      setShowGenerateModal(false);
      setBannerMsg({ type: 'error', text: err?.message || 'Unexpected error while generating the statement.' });
    } finally {
      setIsGenerating(false);
    }
  }

  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDeleteStatement() {
    if (!deleteModalStmt || isDeleting) return;
    setIsDeleting(true);
    try {
      const res = await deleteFinancialStatementAction(deleteModalStmt.id);
      if (res.success) {
        setDeleteModalStmt(null);
        setBannerMsg({ type: 'success', text: 'Statement removed successfully.' });
        loadStatements();
      } else {
        setBannerMsg({ type: 'error', text: res.message || 'Failed to delete statement.' });
      }
    } catch (err: any) {
      setBannerMsg({ type: 'error', text: err?.message || 'Unexpected error while deleting the statement.' });
    } finally {
      setIsDeleting(false);
    }
  }

  // Inline rename state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const renamingRef = useRef(false);

  function startRename(s: FinancialStatement) {
    setEditingId(s.id);
    setEditTitle(s.title);
  }

  function cancelRename() {
    setEditingId(null);
    setEditTitle('');
  }

  async function handleRenameStatement() {
    if (!editingId || renamingRef.current) return;
    const id = editingId;
    const newTitle = editTitle.trim();
    renamingRef.current = true;
    setEditingId(null);
    setEditTitle('');
    if (!newTitle) {
      renamingRef.current = false;
      return;
    }
    setIsRenaming(true);
    try {
      const res = await renameFinancialStatementAction(id, newTitle);
      if (res.success) {
        setStatements((prev) => prev.map((s) => (s.id === id ? { ...s, title: newTitle } : s)));
        setSelectedStatement((prev) => (prev && prev.id === id ? { ...prev, title: newTitle } : prev));
        setBannerMsg({ type: 'success', text: 'Statement renamed successfully.' });
      } else {
        setBannerMsg({ type: 'error', text: res.message || 'Failed to rename statement.' });
      }
    } catch (err: any) {
      setBannerMsg({ type: 'error', text: err?.message || 'Unexpected error while renaming the statement.' });
    } finally {
      setIsRenaming(false);
      renamingRef.current = false;
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Association Filter Strip for Super Admin */}
      {userRole === 'super_admin' && (
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold text-slate-700">Filter FS Reports by Association:</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setSelectedAssocId('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedAssocId === 'all'
                  ? 'bg-emerald-800 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All Associations ({statements.length})
            </button>
            {associations.map((assoc) => (
              <button
                key={assoc.id}
                onClick={() => setSelectedAssocId(assoc.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedAssocId === assoc.id
                    ? 'bg-emerald-800 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {assoc.code}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm print:hidden">
        <div className="flex items-start gap-3 sm:gap-4 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center shrink-0 shadow-xs">
            <FileText className="w-6 h-6" />
          </div>
          <div className="min-w-0 space-y-1">
            <div className="inline-flex items-center flex-wrap gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-[8.5px] sm:text-[10px] lg:text-[11px] font-extrabold border border-emerald-200">
              IRRIGATORS ASSOCIATION RECORD MANAGEMENT SYSTEM by NIA
            </div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 leading-tight break-words">
              Official Financial Statements (FS1 &ndash; FS4)
            </h1>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Generate FS reports with comparative years, customize line figures, and export NIA official printouts.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {(userRole === 'super_admin' || userRole === 'admin' || userRole === 'treasurer') && (
            <>
              <button
                onClick={() => requestNav(() => setShowGenerateModal(true), 'You have unsaved changes. Generating a new report will start with the saved ledger figures.')}
                disabled={isGenerating}
                className="px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs transition-all shadow-md flex items-center gap-2 active:scale-95 disabled:opacity-60 disabled:pointer-events-none"
              >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />} Generate FS Report
              </button>
            </>
          )}
        </div>
      </div>

      {bannerMsg && (
        <div className={`p-3.5 rounded-xl text-xs font-bold border flex items-center justify-between gap-2 print:hidden animate-in fade-in ${
          bannerMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <span className="flex items-center gap-2 min-w-0">
            {bannerMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <Shield className="w-4 h-4 shrink-0" />}
            <span className="truncate">{bannerMsg.text}</span>
          </span>
          <button
            type="button"
            onClick={() => setBannerMsg(null)}
            className="p-1 rounded-lg hover:bg-slate-900/10 text-current/70 hover:text-current transition-colors shrink-0"
            title="Dismiss notification"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Statement Explorer */}
      {loading ? (
        <div className="min-h-[400px] flex flex-col items-center justify-center text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-3" />
          <span className="text-xs font-medium">Loading financial statements...</span>
        </div>
      ) : statements.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 space-y-3 print:hidden">
          <FileText className="w-12 h-12 mx-auto text-slate-300" />
          <div className="text-base font-bold text-slate-700">No Financial Statements Generated Yet</div>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Click &ldquo;Generate FS Report&rdquo; to compile live ledger records into official NIA FS1&ndash;FS4 comparative statements.
          </p>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Left: Statement List Panel */}
          <aside className="lg:w-80 lg:shrink-0 space-y-3 print:hidden">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Active Statement</label>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  {statements.length}
                </span>
              </div>
              <div className="max-h-[45vh] lg:max-h-[65vh] overflow-y-auto divide-y divide-slate-100">
                {statements.map((s) => {
                  const isActive = selectedStatement?.id === s.id;
                  const isEditing = editingId === s.id;
                  return (
                    <div
                      key={s.id}
                      onClick={() => {
                        if (isEditing || s.id === selectedStatement?.id) return;
                        requestNav(() => setSelectedStatement(s), 'You have unsaved changes. Switching statement before saving will keep them un-saved in the ledger.');
                      }}
                      className={`w-full text-left px-4 py-3 flex flex-col gap-1 transition-all border-l-4 cursor-pointer ${
                        isActive ? 'bg-emerald-50/80 border-emerald-700' : 'border-transparent hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        {isEditing ? (
                          <input
                            autoFocus
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRenameStatement();
                              if (e.key === 'Escape') cancelRename();
                            }}
                            onBlur={handleRenameStatement}
                            placeholder="Statement name"
                            className="w-full min-w-0 text-xs font-black text-emerald-800 bg-white border border-emerald-300 rounded-md px-2 py-1 outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        ) : (
                          <>
                            <span className={`text-xs font-black truncate ${isActive ? 'text-emerald-800' : 'text-slate-900'}`}>
                              {s.title}
                            </span>
                            {isActive && (
                              <div className="flex items-center gap-0.5 shrink-0">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startRename(s);
                                  }}
                                  className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-emerald-100 rounded-md transition-colors"
                                  title="Rename statement"
                                >
                                  {isRenaming ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Pencil className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteModalStmt(s);
                                  }}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                                  title="Delete statement"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[10px] text-slate-400">{s.statement_number}</span>
                        <span className={`text-[10px] font-bold ${isActive ? 'text-emerald-700' : 'text-slate-500'}`}>
                          {s.period_start} &ndash; {s.period_end}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* Right: Report Viewer */}
          <div className="flex-1 min-w-0 space-y-3">
            {/* FS Sub-Tabs (shadcn) */}
            <Tabs
              value={activeFSTab}
              onValueChange={(v) =>
                requestNav(
                  () => setActiveFSTab(v as 'FS1' | 'FS2' | 'FS3' | 'FS4'),
                  `You have unsaved changes. Switching to ${v} before saving will keep them un-saved in the ledger.`
                )
              }
              className="self-start print:hidden"
            >
              <TabsList className="justify-start overflow-x-auto max-w-full">
                <TabsTrigger value="FS1">FS1: Receipts &amp; Expenses</TabsTrigger>
                <TabsTrigger value="FS2">FS2: Financial Condition</TabsTrigger>
                <TabsTrigger value="FS3">FS3: Cash Composition</TabsTrigger>
                <TabsTrigger value="FS4">FS4: Balance Sheet</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Active Statement View */}
            {selectedStatement && selectedStatement.report_data && (
              <div className="print:hidden space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2.5 p-2 rounded-xl border border-slate-200 bg-white shadow-sm">
                  {canEditReports && (
                    <div className="inline-flex items-center gap-1 p-1 rounded-lg border border-slate-200 bg-slate-50">
                      {(['auto', 'manual'] as const).map((m) => (
                        <button
                          key={m}
                          onClick={() => switchEditMode(m)}
                          title={MODE_LABELS[m].hint}
                          className={`px-3.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors inline-flex items-center gap-1.5 ${
                            editMode === m
                              ? m === 'manual'
                                ? 'bg-amber-500 text-white shadow-sm'
                                : 'bg-emerald-700 text-white shadow-sm'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {m === 'auto' ? (
                            <Layers className="w-3.5 h-3.5 shrink-0" />
                          ) : (
                            <Pencil className="w-3.5 h-3.5 shrink-0" />
                          )}
                          {MODE_LABELS[m].label}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center flex-wrap gap-2.5">
                    {editMode === 'auto' && (
                      <button
                        onClick={() => {
                          const stmtCode =
                            selectedStatement.association?.code ||
                            associations.find((a) => a.id === selectedStatement.association_id)?.code ||
                            'IA';
                          const fsLabel = FS_TAB_LABELS[activeFSTab].replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '').toUpperCase();
                          exportToPDFPrint(
                            buildExportFilename(stmtCode, fsLabel, selectedStatement.statement_number, selectedStatement.title)
                          );
                        }}
                        className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95"
                      >
                        <Printer className="w-4 h-4 text-emerald-400" /> Print {FS_TAB_LABELS[activeFSTab]}
                      </button>
                    )}
                    {editMode === 'manual' && hasEdits && (
                      <>
                        <button
                          onClick={handleSaveInline}
                          disabled={savingInline}
                          className="px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs transition-all shadow-md flex items-center gap-2 active:scale-95 disabled:opacity-60 disabled:pointer-events-none"
                        >
                          {savingInline ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Changes
                        </button>
                        <button
                          onClick={discardManual}
                          disabled={savingInline}
                          className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-2 transition-colors"
                        >
                          <X className="w-4 h-4" /> Discard
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold flex items-start gap-2.5 ${
                  editMode === 'manual'
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}>
                  {editMode === 'manual' ? (
                    <Pencil className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <Layers className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <span>
                    {MODE_LABELS[editMode].hint}
                    {editMode === 'auto' && canEditReports && (
                      <span className="block text-[10px] font-semibold text-emerald-700 mt-0.5">
                        Generated from the accounting input. Switch to Edit to change line items inline &mdash; totals auto-recompute.
                      </span>
                    )}
                  </span>
                </div>
              </div>
            )}

            {/* Active Statement View */}
            <div id="FS-Report" className="bg-slate-100/80 border border-slate-200 rounded-2xl p-2.5 sm:p-4 shadow-sm print:p-0 print:border-none print:shadow-none print:rounded-none print:bg-transparent">
              {selectedStatement && selectedStatement.report_data && (() => {
                const rd = viewReportData();
                const edits = viewEdits();
                return (
                  <>
                    {activeFSTab === 'FS1' && rd?.fs1 && (
                      <FS1View data={rd.fs1} editable={editMode === 'manual'} edits={edits} onFieldChange={handleReportFieldChange} />
                    )}
                    {activeFSTab === 'FS2' && rd?.fs2 && (
                      <FS2View data={rd.fs2} editable={editMode === 'manual'} edits={edits} onFieldChange={handleReportFieldChange} />
                    )}
                    {activeFSTab === 'FS3' && rd?.fs3 && (
                      <FS3View data={rd.fs3} editable={editMode === 'manual'} edits={edits} onFieldChange={handleReportFieldChange} />
                    )}
                    {activeFSTab === 'FS4' && rd?.fs4 && (
                      <FS4View data={rd.fs4} editable={editMode === 'manual'} edits={edits} onFieldChange={handleReportFieldChange} />
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Generate FS Report Modal (Comparative Years Layout) */}
      {showGenerateModal && (
        <Dialog open={showGenerateModal} onOpenChange={() => setShowGenerateModal(false)}>
          <DialogContent className="max-w-xl p-6 bg-white rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-emerald-700" />
                Generate Official FS Report (FS1 &ndash; FS4)
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Compile comparative financial statements matching NIA standard accounting templates.
              </DialogDescription>
            </DialogHeader>

            <div className="relative">
              <form onSubmit={handleGenerateSubmit} className="space-y-4 pt-2">
              {userRole === 'super_admin' && associations.length > 0 ? (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Target Irrigators Association *</label>
                  <select
                    value={genAssocId}
                    onChange={(e) => {
                      setGenAssocId(e.target.value);
                      const a = associations.find((x) => x.id === e.target.value);
                      if (a?.president_name) setGenOfficerPresident(a.president_name);
                    }}
                    className="w-full text-xs p-2.5 border rounded-xl border-slate-300 font-bold bg-white text-slate-800"
                  >
                    {associations.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.code})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700 truncate">
                    <Building2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>Association:</span>
                    <span className="text-emerald-800 font-mono font-bold truncate">
                      {associations.find((a) => a.id === genAssocId)?.name || 'Your Association'} ({associations.find((a) => a.id === genAssocId)?.code || 'IA'})
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold shrink-0 ml-2">
                    Assigned IA
                  </span>
                </div>
              )}

              {/* Comparative Years Selection */}
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-900">
                  <Calendar className="w-4 h-4 text-emerald-700" />
                  Comparative Reporting Period
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Reporting Year (Current) *</label>
                    <select
                      value={selectedYear}
                      onChange={(e) => handleYearChange(parseInt(e.target.value, 10))}
                      className="w-full text-xs p-2 border rounded-lg border-emerald-300 bg-white font-bold text-emerald-950"
                    >
                      {[2027, 2026, 2025, 2024, 2023, 2022].map((yr) => (
                        <option key={yr} value={yr}>
                          CY {yr} (Current Year)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Comparative Prior Year *</label>
                    <input
                      type="text"
                      disabled
                      value={`CY ${priorYear} (Prior Year)`}
                      className="w-full text-xs p-2 border rounded-lg border-slate-200 bg-slate-100 font-bold text-slate-600 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Report Title</label>
                <input
                  type="text"
                  placeholder={`e.g. Annual Financial Statement CY ${selectedYear}`}
                  value={genTitle}
                  onChange={(e) => setGenTitle(e.target.value)}
                  className="w-full text-xs p-2.5 border rounded-xl border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Period Start Date *</label>
                  <input
                    type="date"
                    required
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                    className="w-full text-xs p-2.5 border rounded-xl border-slate-300"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Period End Date *</label>
                  <input
                    type="date"
                    required
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                    className="w-full text-xs p-2.5 border rounded-xl border-slate-300"
                  />
                </div>
              </div>

              {/* Authorized Signatories */}
              <div className="p-3.5 bg-amber-50/50 border border-amber-200 rounded-xl space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-900">
                  <Users className="w-4 h-4 text-amber-700" />
                  Authorized Signatories (editable)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 block">IA President</label>
                    <input
                      type="text"
                      placeholder="e.g. MEYNARD A. TOMANENG"
                      value={genOfficerPresident}
                      onChange={(e) => setGenOfficerPresident(e.target.value)}
                      className="w-full text-xs p-2 border rounded-lg border-amber-300 bg-white font-bold uppercase"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 block">IA Treasurer</label>
                    <input
                      type="text"
                      placeholder="e.g. RIC UNDAY"
                      value={genOfficerTreasurer}
                      onChange={(e) => setGenOfficerTreasurer(e.target.value)}
                      className="w-full text-xs p-2 border rounded-lg border-amber-300 bg-white font-bold uppercase"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 block">IA Auditor</label>
                    <input
                      type="text"
                      placeholder="e.g. ARTUR GUIANG"
                      value={genOfficerAuditor}
                      onChange={(e) => setGenOfficerAuditor(e.target.value)}
                      className="w-full text-xs p-2 border rounded-lg border-amber-300 bg-white font-bold uppercase"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  disabled={isGenerating}
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGenerating || isPending}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-800 text-white hover:bg-emerald-900 flex items-center gap-2 shadow-sm active:scale-95 disabled:opacity-60 disabled:pointer-events-none"
                >
                  {isGenerating || isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
                  {isGenerating || isPending ? 'Generating...' : 'Generate FS Report'}
                </button>
              </div>
              </form>

              {/* Generating Overlay (anti-spam) */}
              {isGenerating && (
                <div className="absolute inset-0 z-10 bg-white/90 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shadow-md">
                    <Loader2 className="w-7 h-7 animate-spin text-emerald-700" />
                  </div>
                  <div className="text-xs font-black text-slate-800">Compiling Financial Statements (FS1 &ndash; FS4)...</div>
                  <div className="text-[10px] text-slate-500 font-medium">Calculating comparative figures, cash flows &amp; balances</div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Comparative Figures Modal */}
      {showEditModal && editFS1 && (
        <Dialog open={showEditModal} onOpenChange={() => setShowEditModal(false)}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto p-6 bg-white rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-2">
                <Pencil className="w-5 h-5 text-emerald-700" />
                Edit Comparative Line Figures (FS1 - FS4)
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Update Current and Prior Year figures with automated recalculation across interconnected FS statements.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 pt-2">
              {/* FS1 Receipts Section */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/50">
                <div className="font-extrabold text-xs text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                  FS1: Cash Receipts &amp; Collections
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {Object.entries(editFS1.receipts || {}).map(([key, val]: [string, any]) => {
                    if (key === 'total') return null;
                    return (
                      <div key={key} className="p-2.5 bg-white border border-slate-200 rounded-lg space-y-1.5">
                        <span className="font-bold text-slate-700 capitalize text-[11px] block">
                          {key.replace(/([A-Z])/g, ' $1')}
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[10px] text-slate-500 font-semibold">Current Year</span>
                            <input
                              type="number"
                              value={val?.current ?? 0}
                              onChange={(e) => {
                                const copy = { ...editFS1 };
                                (copy.receipts as any)[key] = {
                                  ...val,
                                  current: parseFloat(e.target.value) || 0,
                                };
                                setEditFS1(copy);
                              }}
                              className="w-full text-xs p-1.5 border rounded border-slate-300 font-mono font-bold"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 font-semibold">Prior Year</span>
                            <input
                              type="number"
                              value={val?.prior ?? 0}
                              onChange={(e) => {
                                const copy = { ...editFS1 };
                                (copy.receipts as any)[key] = {
                                  ...val,
                                  prior: parseFloat(e.target.value) || 0,
                                };
                                setEditFS1(copy);
                              }}
                              className="w-full text-xs p-1.5 border rounded border-slate-300 font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRecalculateAndSave}
                  disabled={isPending}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-800 text-white hover:bg-emerald-900 flex items-center gap-2 shadow-sm"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Recalculate &amp; Save FS Figures
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Unsaved Changes Confirmation */}
      {navConfirm && (
        <Dialog open={!!navConfirm} onOpenChange={(open) => { if (!open) handleNavCancel(); }}>
          <DialogContent className="max-w-sm sm:max-w-md p-5 max-h-[90vh] overflow-y-auto rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-black text-amber-700 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 shrink-0" /> Unsaved Changes
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                {navConfirm.message}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5 pt-3 border-t">
              <button
                type="button"
                onClick={handleNavCancel}
                disabled={savingInline}
                className="w-full sm:flex-1 px-4 py-2.5 text-xs font-bold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center justify-center disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleNavDiscard}
                disabled={savingInline}
                className="w-full sm:flex-1 px-4 py-2.5 text-xs font-bold rounded-xl border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5 shrink-0" /> Discard Changes
              </button>
              <button
                type="button"
                onClick={handleNavSave}
                disabled={savingInline}
                className="w-full sm:flex-1 px-4 py-2.5 text-xs font-bold rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-60"
              >
                {savingInline ? <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" /> : <Save className="w-3.5 h-3.5 shrink-0" />} Save Changes
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Statement Confirmation Modal */}
      {deleteModalStmt && (
        <Dialog open={!!deleteModalStmt} onOpenChange={() => setDeleteModalStmt(null)}>
          <DialogContent className="max-w-md p-6 bg-white rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-black text-rose-600 flex items-center gap-2">
                <Trash2 className="w-5 h-5" /> Delete Financial Statement
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Are you sure you want to delete &ldquo;{deleteModalStmt.title}&rdquo; ({deleteModalStmt.statement_number})? This cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => setDeleteModalStmt(null)}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteStatement}
                disabled={isDeleting}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
