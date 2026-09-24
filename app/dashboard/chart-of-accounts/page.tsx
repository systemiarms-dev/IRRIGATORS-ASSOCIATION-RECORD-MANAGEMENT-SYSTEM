'use client';

import React, { useState, useEffect, useMemo, useTransition } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  PlusCircle,
  Search,
  Building2,
  Trash2,
  Lock,
  Loader2,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  AlertTriangle,
  Info,
  Layers,
  ChevronRight,
  ChevronDown,
  X,
  Wallet,
  Tractor,
  Calculator,
  Calendar,
  DollarSign,
  Tag,
  ShieldCheck,
  TrendingDown,
  FileSpreadsheet,
  Pencil,
} from 'lucide-react';
import {
  BudgetCategory,
  Association,
  UserRole,
  PublicProfile,
  AccountClassification,
  FixedAsset,
} from '@/types';
import { getSelfProfileAction } from '@/app/actions/auth';
import { getAssociationsAction } from '@/app/actions/associations';
import {
  getBudgetCategoriesAction,
  createBudgetCategoryAction,
  updateBudgetCategoryAction,
  deleteBudgetCategoryAction,
} from '@/app/actions/transactions';
import {
  getFixedAssetsAction,
  createFixedAssetAction,
  deleteFixedAssetAction,
} from '@/app/actions/fixedAssets';
import {
  PRESET_DEPRECIATION_OPTIONS,
  calculateAssetDepreciation,
  enrichFixedAsset,
} from '@/lib/utils/fixedAssets';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { formatPHP } from '@/lib/utils/formatters';

export default function ChartOfAccountsPage() {
  const [currentUser, setCurrentUser] = useState<PublicProfile | null>(null);
  const [associations, setAssociations] = useState<Association[]>([]);
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [fixedAssets, setFixedAssets] = useState<FixedAsset[]>([]);
  const [selectedAssocId, setSelectedAssocId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Top-level Navigation Tab: 'chart' | 'assets'
  const [activeView, setActiveView] = useState<'chart' | 'assets'>('chart');

  // Filters for Chart of Accounts
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'collection' | 'disbursement'>('all');
  const [classificationFilter, setClassificationFilter] = useState<'all' | 'standard' | 'asset' | 'liability'>('all');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'standard' | 'custom'>('all');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddAssetModal, setShowAddAssetModal] = useState(false);
  const [deletingCat, setDeletingCat] = useState<BudgetCategory | null>(null);
  const [deletingAsset, setDeletingAsset] = useState<FixedAsset | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Add Category Form state
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formType, setFormType] = useState<'collection' | 'disbursement'>('collection');
  const [formClassification, setFormClassification] = useState<AccountClassification>('collection');
  const [formAssocId, setFormAssocId] = useState('');

  // Edit Category Form state
  const [editingCat, setEditingCat] = useState<BudgetCategory | null>(null);
  const [editName, setEditName] = useState('');
  const [editClassification, setEditClassification] = useState<AccountClassification>('collection');
  const [editAllocatedAmount, setEditAllocatedAmount] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Add Fixed Asset Form state
  const [assetName, setAssetName] = useState('');
  const [assetType, setAssetType] = useState<FixedAsset['asset_type']>('heavy_machinery');
  const [assetDateAcquired, setAssetDateAcquired] = useState(new Date().toISOString().split('T')[0]);
  const [assetCost, setAssetCost] = useState('');
  const [presetIndex, setPresetIndex] = useState<number>(1); // Default: 10% heavy machinery
  const [customDepRate, setCustomDepRate] = useState<string>('10');
  const [assetUsefulLife, setAssetUsefulLife] = useState<string>('10');
  const [assetSalvageValue, setAssetSalvageValue] = useState<string>('0');
  const [assetNotes, setAssetNotes] = useState('');

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isReadOnly = currentUser?.role === 'treasurer' || currentUser?.role === 'auditor';

  // Initial Load
  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const [userRes, assocRes] = await Promise.all([
          getSelfProfileAction(),
          getAssociationsAction(),
        ]);

        if (userRes.success && userRes.data) {
          setCurrentUser(userRes.data);
          const initialAssoc = userRes.data.role === 'super_admin'
            ? (assocRes.data?.[0]?.id || '')
            : (userRes.data.association_id || '');
          setSelectedAssocId(initialAssoc);
          setFormAssocId(initialAssoc);
        }

        if (assocRes.success && assocRes.data) {
          setAssociations(assocRes.data);
        }
      } catch (err) {
        console.error('Failed to load chart of accounts init data:', err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // Fetch categories & fixed assets when selected association changes
  useEffect(() => {
    if (!currentUser) return;
    async function loadData() {
      const targetAssoc = isSuperAdmin ? selectedAssocId : (currentUser?.association_id || undefined);
      setLoadingAssets(true);
      try {
        const [catRes, assetRes] = await Promise.all([
          getBudgetCategoriesAction(targetAssoc),
          getFixedAssetsAction(targetAssoc),
        ]);
        if (catRes.success && catRes.data) {
          setCategories(catRes.data);
        }
        if (assetRes.success && assetRes.data) {
          setFixedAssets(assetRes.data);
        }
      } catch (e) {
        console.error('Failed loading data:', e);
      } finally {
        setLoadingAssets(false);
      }
    }
    startTransition(() => {
      loadData();
    });
  }, [currentUser, selectedAssocId, isSuperAdmin]);

  // Filtered categories
  const filteredCategories = useMemo(() => {
    return categories.filter((c) => {
      // Type match
      if (typeFilter !== 'all' && c.category_type !== typeFilter) return false;

      // Classification Filter
      const classification = c.account_classification || c.category_type;
      if (classificationFilter === 'asset') {
        if (classification !== 'current_asset' && classification !== 'non_current_asset') return false;
      } else if (classificationFilter === 'liability') {
        if (classification !== 'current_liability' && classification !== 'non_current_liability') return false;
      } else if (classificationFilter === 'standard') {
        if (classification === 'current_asset' || classification === 'non_current_asset' ||
            classification === 'current_liability' || classification === 'non_current_liability') return false;
      }

      // Scope match
      const isCustom = !!c.association_id;
      if (scopeFilter === 'standard' && isCustom) return false;
      if (scopeFilter === 'custom' && !isCustom) return false;

      // Search match
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const codeMatch = c.code.toLowerCase().includes(query);
        const nameMatch = c.name.toLowerCase().includes(query);
        const descMatch = (c.description || '').toLowerCase().includes(query);
        return codeMatch || nameMatch || descMatch;
      }
      return true;
    });
  }, [categories, typeFilter, classificationFilter, scopeFilter, searchQuery]);

  // Stats for Categories
  const stats = useMemo(() => {
    const total = categories.length;
    const collections = categories.filter((c) => c.category_type === 'collection').length;
    const disbursements = categories.filter((c) => c.category_type === 'disbursement').length;
    const assets = categories.filter((c) => c.account_classification === 'current_asset' || c.account_classification === 'non_current_asset').length;
    const liabilities = categories.filter((c) => c.account_classification === 'current_liability' || c.account_classification === 'non_current_liability').length;
    return { total, collections, disbursements, assets, liabilities };
  }, [categories]);

  // Stats for Fixed Assets
  const assetStats = useMemo(() => {
    const totalCount = fixedAssets.length;
    const totalCost = fixedAssets.reduce((sum, a) => sum + (a.acquisition_cost || 0), 0);
    const totalAnnualDep = fixedAssets.reduce((sum, a) => sum + (a.annual_depreciation || 0), 0);
    const totalNetValue = fixedAssets.reduce((sum, a) => sum + (a.net_book_value ?? a.netBookValue ?? 0), 0);
    return { totalCount, totalCost, totalAnnualDep, totalNetValue };
  }, [fixedAssets]);

  // Open add category modal
  function handleOpenAddModal() {
    setFeedback(null);
    setFormName('');
    setFormCode('');
    setFormType('collection');
    setFormClassification('collection');
    setFormAssocId(isSuperAdmin ? selectedAssocId : (currentUser?.association_id || ''));
    setShowAddModal(true);
  }

  // Open add asset modal
  function handleOpenAddAssetModal() {
    setFeedback(null);
    setAssetName('');
    setAssetType('heavy_machinery');
    setAssetDateAcquired(new Date().toISOString().split('T')[0]);
    setAssetCost('');
    setPresetIndex(1);
    setCustomDepRate('10');
    setAssetUsefulLife('10');
    setAssetSalvageValue('0');
    setAssetNotes('');
    setShowAddAssetModal(true);
  }

  // Handle Preset Selection Change
  function handlePresetChange(idx: number) {
    setPresetIndex(idx);
    const preset = PRESET_DEPRECIATION_OPTIONS[idx];
    if (preset && preset.rate > 0) {
      setCustomDepRate(preset.rate.toString());
      setAssetUsefulLife(preset.years.toString());
      setAssetType(preset.type);
    }
  }

  // Live computation for the Asset Modal
  const modalLiveCalc = useMemo(() => {
    const cost = parseFloat(assetCost) || 0;
    const rate = presetIndex === 4 ? (parseFloat(customDepRate) || 0) : PRESET_DEPRECIATION_OPTIONS[presetIndex]?.rate || 0;
    const salvage = parseFloat(assetSalvageValue) || 0;
    return calculateAssetDepreciation(cost, rate, assetDateAcquired, salvage);
  }, [assetCost, presetIndex, customDepRate, assetSalvageValue, assetDateAcquired]);

  // Handle Add Category submit
  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) {
      setFeedback({ type: 'error', message: 'Category name is required.' });
      return;
    }

    setActionLoading(true);
    try {
      const res = await createBudgetCategoryAction({
        name: formName.trim(),
        category_type: formType,
        account_classification: formClassification,
        code: formCode.trim() || undefined,
        association_id: isSuperAdmin ? formAssocId : undefined,
      });

      if (!res.success || !res.data) {
        setFeedback({ type: 'error', message: res.message || 'Failed to add budget category.' });
        return;
      }

      setCategories((prev) => [...prev, res.data!]);
      setShowAddModal(false);
      setFeedback({ type: 'success', message: `Category "${res.data.name}" added to Chart of Accounts.` });
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Error creating category.' });
    } finally {
      setActionLoading(false);
    }
  }

  function handleOpenEditModal(cat: BudgetCategory) {
    setEditingCat(cat);
    setEditName(cat.name);
    setEditClassification(cat.account_classification || (cat.category_type as any));
    setEditAllocatedAmount(cat.allocated_amount ? String(cat.allocated_amount) : '0');
    const rawDesc = (cat.description || '').replace(/\[class:[a-z_]+\]\s*/g, '').trim();
    setEditDescription(rawDesc);
  }

  async function handleUpdateCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!editingCat) return;
    if (!editName.trim()) {
      setFeedback({ type: 'error', message: 'Category name is required.' });
      return;
    }

    setActionLoading(true);
    try {
      const res = await updateBudgetCategoryAction(editingCat.id, {
        name: editName.trim(),
        allocated_amount: parseFloat(editAllocatedAmount) || 0,
        account_classification: editClassification,
        description: editDescription.trim() || undefined,
      });

      if (!res.success || !res.data) {
        setFeedback({ type: 'error', message: res.message || 'Failed to update category.' });
        return;
      }

      setCategories((prev) => prev.map((c) => (c.id === editingCat.id ? res.data! : c)));
      setEditingCat(null);
      setFeedback({ type: 'success', message: `Category "${res.data.name}" updated successfully!` });
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Error updating category.' });
    } finally {
      setActionLoading(false);
    }
  }

  // Handle Add Fixed Asset submit
  async function handleAddFixedAsset(e: React.FormEvent) {
    e.preventDefault();
    if (!assetName.trim()) {
      setFeedback({ type: 'error', message: 'Equipment / Asset name is required.' });
      return;
    }
    const cost = parseFloat(assetCost);
    if (isNaN(cost) || cost <= 0) {
      setFeedback({ type: 'error', message: 'Please enter a valid positive acquisition cost in PHP.' });
      return;
    }

    const rate = presetIndex === 4 ? parseFloat(customDepRate) : PRESET_DEPRECIATION_OPTIONS[presetIndex]?.rate || 10;
    if (isNaN(rate) || rate < 0 || rate > 100) {
      setFeedback({ type: 'error', message: 'Depreciation rate must be between 0% and 100%.' });
      return;
    }

    setActionLoading(true);
    try {
      const targetAssoc = isSuperAdmin ? formAssocId : (currentUser?.association_id || '');
      const res = await createFixedAssetAction({
        name: assetName.trim(),
        asset_type: assetType,
        date_acquired: assetDateAcquired,
        acquisition_cost: cost,
        depreciation_rate: rate,
        useful_life_years: parseInt(assetUsefulLife, 10) || 5,
        salvage_value: parseFloat(assetSalvageValue) || 0,
        notes: assetNotes.trim() || undefined,
        association_id: targetAssoc,
      });

      if (!res.success || !res.data) {
        setFeedback({ type: 'error', message: res.message || 'Failed to register equipment/asset.' });
        return;
      }

      setFixedAssets((prev) => [res.data!, ...prev]);
      setShowAddAssetModal(false);
      setFeedback({
        type: 'success',
        message: `Registered "${res.data.name}" in Fixed Assets Registry with ${rate}% annual depreciation!`,
      });
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Error registering fixed asset.' });
    } finally {
      setActionLoading(false);
    }
  }

  // Handle Delete Category
  async function handleDeleteCategory() {
    if (!deletingCat) return;
    setActionLoading(true);
    try {
      const res = await deleteBudgetCategoryAction(deletingCat.id);
      if (!res.success) {
        setFeedback({ type: 'error', message: res.message || 'Could not delete category.' });
        setDeletingCat(null);
        return;
      }
      setCategories((prev) => prev.filter((c) => c.id !== deletingCat.id));
      setFeedback({ type: 'success', message: res.message || 'Category deleted.' });
      setDeletingCat(null);
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Unexpected error deleting category.' });
      setDeletingCat(null);
    } finally {
      setActionLoading(false);
    }
  }

  // Handle Delete Fixed Asset
  async function handleDeleteFixedAsset() {
    if (!deletingAsset) return;
    setActionLoading(true);
    try {
      const res = await deleteFixedAssetAction(deletingAsset.id);
      if (!res.success) {
        setFeedback({ type: 'error', message: res.message || 'Could not delete fixed asset.' });
        setDeletingAsset(null);
        return;
      }
      setFixedAssets((prev) => prev.filter((a) => a.id !== deletingAsset.id));
      setFeedback({ type: 'success', message: 'Asset removed from registry.' });
      setDeletingAsset(null);
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Unexpected error deleting asset.' });
      setDeletingAsset(null);
    } finally {
      setActionLoading(false);
    }
  }

  const selectedAssocObj = associations.find((a) => a.id === selectedAssocId);

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Super Admin Dedicated Association Selector Strip */}
      {isSuperAdmin && (
        <div className="p-3 sm:p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black text-slate-800 tracking-tight flex items-center gap-1.5">
                  <span>Scope by Association</span>
                  <span className="hidden sm:inline-block text-[11px] text-slate-400 font-normal">
                    (Super Admin Mode)
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium truncate hidden xs:block">
                  Choose which Irrigators Association chart of accounts &amp; fixed assets to inspect
                </p>
              </div>
            </div>

            {selectedAssocObj && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                Active: {selectedAssocObj.code}
              </span>
            )}
          </div>

          {/* Quick-Tap Horizontal Scrollable Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 pt-0.5">
            {associations.map((assoc) => {
              const isSelected = selectedAssocId === assoc.id;
              return (
                <button
                  key={assoc.id}
                  type="button"
                  onClick={() => {
                    setSelectedAssocId(assoc.id);
                    setFormAssocId(assoc.id);
                  }}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-emerald-800 text-white shadow-sm ring-2 ring-emerald-700/20'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  <span className="font-extrabold">{assoc.code}</span>
                  <span className="text-[11px] font-medium opacity-85">&bull; {assoc.name.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Top Banner with Navigation Tabs */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 text-emerald-200 shrink-0">
              {activeView === 'chart' ? <BookOpen className="w-6 h-6" /> : <Tractor className="w-6 h-6" />}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black tracking-tight">
                  {activeView === 'chart' ? 'Chart of Accounts' : 'Fixed Asset & Equipment Registry'}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-700/80 text-emerald-100 border border-emerald-500/40 shrink-0">
                  {activeView === 'chart' ? 'NIA Standard Ledger' : 'Automatic Depreciation Engine'}
                </span>
              </div>
              <p className="text-xs text-emerald-200/90 mt-0.5 truncate max-w-xl">
                {selectedAssocObj
                  ? `Scoped to ${selectedAssocObj.name} (${selectedAssocObj.code})`
                  : 'Authorized budget categories & capital machinery management.'}
              </p>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex items-center gap-2">
            {!isReadOnly && (
              activeView === 'chart' ? (
                <button
                  onClick={handleOpenAddModal}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white text-emerald-900 hover:bg-emerald-50 text-xs font-bold transition-all shadow-sm hover:shadow active:scale-95"
                >
                  <PlusCircle className="w-4 h-4 text-emerald-700" />
                  <span>Add Budget Category</span>
                </button>
              ) : (
                <button
                  onClick={handleOpenAddAssetModal}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white text-emerald-900 hover:bg-emerald-50 text-xs font-bold transition-all shadow-sm hover:shadow active:scale-95"
                >
                  <PlusCircle className="w-4 h-4 text-emerald-700" />
                  <span>Register Equipment / Asset</span>
                </button>
              )
            )}
          </div>
        </div>

        {/* View Switcher Pills */}
        <div className="flex items-center gap-2 pt-1 border-t border-emerald-700/60">
          <button
            type="button"
            onClick={() => setActiveView('chart')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeView === 'chart'
                ? 'bg-white text-emerald-950 shadow-md ring-2 ring-white/50'
                : 'bg-emerald-950/40 text-emerald-200 hover:bg-emerald-950/60'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Chart of Accounts ({categories.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveView('assets')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeView === 'assets'
                ? 'bg-white text-emerald-950 shadow-md ring-2 ring-white/50'
                : 'bg-emerald-950/40 text-emerald-200 hover:bg-emerald-950/60'
            }`}
          >
            <Tractor className="w-3.5 h-3.5" />
            <span>Fixed Asset Registry ({fixedAssets.length})</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="p-1 hover:bg-black/5 rounded">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 1: CHART OF ACCOUNTS                                                 */}
      {/* ========================================================================= */}
      {activeView === 'chart' && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Accounts</div>
                <div className="text-lg font-black text-slate-900">{stats.total}</div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-teal-50 text-teal-700">
                <ArrowDownLeft className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Collections (IN)</div>
                <div className="text-lg font-black text-teal-800">{stats.collections}</div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Disbursements (OUT)</div>
                <div className="text-lg font-black text-rose-800">{stats.disbursements}</div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-700">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assets &amp; Liabilities</div>
                <div className="text-lg font-black text-indigo-900">{stats.assets + stats.liabilities}</div>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Filter and Search Bar */}
            <div className="p-3.5 sm:p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Search */}
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search code, name, description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
                />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Type Filter */}
                <div className="p-1 bg-slate-100 rounded-lg flex items-center gap-1 font-semibold text-[11px]">
                  <button
                    onClick={() => setTypeFilter('all')}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      typeFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All Types
                  </button>
                  <button
                    onClick={() => setTypeFilter('collection')}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      typeFilter === 'collection' ? 'bg-emerald-700 text-white shadow-sm' : 'text-slate-600 hover:text-emerald-800'
                    }`}
                  >
                    Collections
                  </button>
                  <button
                    onClick={() => setTypeFilter('disbursement')}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      typeFilter === 'disbursement' ? 'bg-rose-700 text-white shadow-sm' : 'text-slate-600 hover:text-rose-800'
                    }`}
                  >
                    Disbursements
                  </button>
                </div>

                {/* Classification Filter */}
                <div className="p-1 bg-slate-100 rounded-lg flex items-center gap-1 font-semibold text-[11px]">
                  <button
                    onClick={() => setClassificationFilter('all')}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      classificationFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All Classes
                  </button>
                  <button
                    onClick={() => setClassificationFilter('asset')}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      classificationFilter === 'asset' ? 'bg-indigo-700 text-white shadow-sm' : 'text-slate-600 hover:text-indigo-800'
                    }`}
                  >
                    Assets
                  </button>
                  <button
                    onClick={() => setClassificationFilter('liability')}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      classificationFilter === 'liability' ? 'bg-amber-700 text-white shadow-sm' : 'text-slate-600 hover:text-amber-800'
                    }`}
                  >
                    Liabilities
                  </button>
                </div>
              </div>
            </div>

            {/* Table Content */}
            {loading ? (
              <div className="min-h-[250px] flex flex-col items-center justify-center text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
                <span className="text-xs font-medium">Loading Chart of Accounts...</span>
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="p-12 text-center text-slate-500 space-y-2">
                <BookOpen className="w-10 h-10 mx-auto text-slate-300" />
                <div className="text-sm font-bold">No budget categories match your filter.</div>
                <p className="text-xs text-slate-400">Clear your search query or adjust your filters above.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-slate-800">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                      <th className="py-3 px-4 text-left">Code</th>
                      <th className="py-3 px-4 text-left">Category Name / Line Item</th>
                      <th className="py-3 px-3 text-left">Classification</th>
                      <th className="py-3 px-3 text-left">Flow Type</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredCategories.map((c) => {
                      const isCoreStandard = !c.association_id;
                      const classification = c.account_classification || c.category_type;

                      return (
                        <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-800 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800 text-[11px]">
                              {c.code}
                            </span>
                          </td>

                          <td className="py-3 px-4 max-w-[260px]">
                            <div className="font-bold text-slate-900">{c.name}</div>
                            {c.description && (
                              <div className="text-[11px] text-slate-500 truncate mt-0.5">{c.description}</div>
                            )}
                          </td>

                          {/* Classification Badge */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            {classification === 'current_asset' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                🏢 Current Asset
                              </span>
                            ) : classification === 'non_current_asset' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                                🏗️ Non-Current Asset
                              </span>
                            ) : classification === 'current_liability' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                📑 Current Liability
                              </span>
                            ) : classification === 'non_current_liability' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-800 border border-orange-200">
                                🏛️ Non-Current Liability
                              </span>
                            ) : c.category_type === 'collection' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                📈 Collection (Income)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                                📉 Disbursement (Expense)
                              </span>
                            )}
                          </td>

                          {/* Flow Type */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            {c.category_type === 'collection' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                                <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                                Money IN
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700">
                                <ArrowUpRight className="w-3 h-3 text-rose-600" />
                                Money OUT
                              </span>
                            )}
                          </td>

                          {/* Action */}
                          <td className="py-3 px-4 text-right">
                            {isCoreStandard ? (
                              <span className="text-slate-400 text-[10px] italic flex items-center justify-end gap-1">
                                <Lock className="w-3 h-3 text-slate-400" /> Protected
                              </span>
                            ) : isReadOnly ? (
                              <span className="text-slate-400 text-[10px] italic">View Only</span>
                            ) : (
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(c)}
                                  className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                                  title={`Edit ${c.name}`}
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingCat(c)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title={`Delete ${c.name}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: FIXED ASSET & EQUIPMENT REGISTRY                                  */}
      {/* ========================================================================= */}
      {activeView === 'assets' && (
        <>
          {/* Asset Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700">
                <Tractor className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Registered Assets</div>
                <div className="text-lg font-black text-slate-900">{assetStats.totalCount}</div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-50 text-blue-700">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Acquisition Cost</div>
                <div className="text-lg font-black text-blue-900">₱{formatPHP(assetStats.totalCost)}</div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-amber-50 text-amber-700">
                <TrendingDown className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Annual Depreciation</div>
                <div className="text-lg font-black text-amber-900">₱{formatPHP(assetStats.totalAnnualDep)}/yr</div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-teal-50 text-teal-700">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Net Book Value</div>
                <div className="text-lg font-black text-teal-900">₱{formatPHP(assetStats.totalNetValue)}</div>
              </div>
            </div>
          </div>

          {/* Info Banner on Automation */}
          <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 flex items-start gap-3 text-xs text-emerald-900">
            <Calculator className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">100% Automated Depreciation &amp; FS Integration:</span> Any equipment, water pumps, or buildings registered here automatically compute straight-line annual depreciation and net book value. Annual depreciation feeds directly into <strong>FS-2 (Cash Flows)</strong> and net book value automatically populates <strong>FS-2 and FS-4 Non-Current Assets</strong> without any manual calculations!
            </div>
          </div>

          {/* Fixed Assets Table Container */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {loadingAssets ? (
              <div className="min-h-[250px] flex flex-col items-center justify-center text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
                <span className="text-xs font-medium">Loading Fixed Assets Registry...</span>
              </div>
            ) : fixedAssets.length === 0 ? (
              <div className="p-12 text-center text-slate-500 space-y-3">
                <Tractor className="w-12 h-12 mx-auto text-slate-300" />
                <div className="text-sm font-bold text-slate-700">No fixed assets or equipment registered yet.</div>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Click &ldquo;Register Equipment / Asset&rdquo; above to record tractors, water pumps, warehouses, or office facilities and start auto-calculating annual depreciation.
                </p>
                {!isReadOnly && (
                  <button
                    onClick={handleOpenAddAssetModal}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold shadow-sm hover:bg-emerald-800 transition-colors"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Register First Equipment</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-slate-800">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                      <th className="py-3 px-4 text-left">Equipment / Asset Name</th>
                      <th className="py-3 px-3 text-left">Type</th>
                      <th className="py-3 px-3 text-left">Date Acquired</th>
                      <th className="py-3 px-3 text-right">Cost (₱)</th>
                      <th className="py-3 px-3 text-center">Depreciation %</th>
                      <th className="py-3 px-3 text-right">Annual Dep. (₱/yr)</th>
                      <th className="py-3 px-3 text-right">Accumulated Dep. (₱)</th>
                      <th className="py-3 px-3 text-right font-black text-emerald-900">Net Book Value (₱)</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {fixedAssets.map((asset) => {
                      const netVal = asset.net_book_value ?? asset.netBookValue ?? 0;
                      return (
                        <tr key={asset.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 max-w-[240px]">
                            <div className="font-bold text-slate-900">{asset.name}</div>
                            {asset.notes && (
                              <div className="text-[10px] text-slate-500 truncate mt-0.5">{asset.notes}</div>
                            )}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap capitalize">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {asset.asset_type.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap font-mono text-slate-700">
                            {asset.date_acquired}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap text-right font-mono font-bold text-slate-900">
                            ₱{formatPHP(asset.acquisition_cost)}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              {asset.depreciation_rate}% / yr
                            </span>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap text-right font-mono font-bold text-rose-700">
                            ₱{formatPHP(asset.annual_depreciation || 0)}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap text-right font-mono text-slate-600">
                            ₱{formatPHP(asset.accumulated_depreciation || 0)}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap text-right font-mono font-black text-emerald-800 bg-emerald-50/40">
                            ₱{formatPHP(netVal)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {isReadOnly ? (
                              <span className="text-slate-400 text-[10px] italic">View Only</span>
                            ) : (
                              <button
                                onClick={() => setDeletingAsset(asset)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title={`Delete ${asset.name}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal: Add Budget Category */}
      {showAddModal && (
        <Dialog open={true} onOpenChange={(open) => { if (!open) setShowAddModal(false); }}>
          <DialogContent onClose={() => setShowAddModal(false)} className="max-w-md p-5">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-800 text-white shadow-md">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-black text-emerald-900">
                    Add Official Budget Line Item
                  </DialogTitle>
                  <DialogDescription className="mt-0.5 text-xs text-slate-500">
                    Define an authorized category in the association&apos;s Chart of Accounts
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <form onSubmit={handleAddCategory} className="space-y-3.5 pt-2">
              {/* Type Switcher */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Cash Flow Direction *</label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setFormType('collection');
                      setFormClassification('collection');
                    }}
                    className={`py-1.5 px-3 rounded-md text-xs font-bold transition-all ${
                      formType === 'collection' ? 'bg-emerald-700 text-white shadow-sm' : 'text-slate-500 hover:text-emerald-800'
                    }`}
                  >
                    Money IN (Collection)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormType('disbursement');
                      setFormClassification('disbursement');
                    }}
                    className={`py-1.5 px-3 rounded-md text-xs font-bold transition-all ${
                      formType === 'disbursement' ? 'bg-rose-700 text-white shadow-sm' : 'text-slate-500 hover:text-rose-800'
                    }`}
                  >
                    Money OUT (Expense)
                  </button>
                </div>
              </div>

              {/* Account Classification Sub-Choice */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Account Classification Type *</label>
                <select
                  value={formClassification}
                  onChange={(e) => setFormClassification(e.target.value as AccountClassification)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
                >
                  {formType === 'collection' ? (
                    <>
                      <option value="collection">📈 Collections &amp; Operating Income (Standard)</option>
                      <option value="current_asset">🏢 Current Asset (e.g. Accounts Receivable, Short-term Fund)</option>
                      <option value="non_current_asset">🏗️ Non-Current Asset (e.g. Land/Facility Capital Fund)</option>
                    </>
                  ) : (
                    <>
                      <option value="disbursement">📉 Disbursements &amp; Operating Expense (Standard)</option>
                      <option value="current_liability">📑 Current Liability (e.g. Accounts Payable, Accrued Dues)</option>
                      <option value="non_current_liability">🏛️ Non-Current Liability (e.g. Long-term Loans &amp; Obligations)</option>
                    </>
                  )}
                </select>
              </div>

              {/* Target Association for Super Admin */}
              {isSuperAdmin && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Target Association *</label>
                  <select
                    value={formAssocId}
                    onChange={(e) => setFormAssocId(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
                  >
                    {associations.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Category Name */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Category Name / Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Equipment Rental Share, Barangay Subsidy"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
                />
              </div>

              {/* Category Code (Optional) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-700">Category Code (Optional)</label>
                  <span className="text-[10px] text-slate-400">e.g. REC-RENT or DISB-FUEL</span>
                </div>
                <input
                  type="text"
                  placeholder={formType === 'collection' ? 'REC-...' : 'DISB-...'}
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-medium uppercase focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  disabled={actionLoading}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save to Chart of Accounts</span>
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal: Register Fixed Asset / Equipment */}
      {showAddAssetModal && (
        <Dialog open={true} onOpenChange={(open) => { if (!open) setShowAddAssetModal(false); }}>
          <DialogContent onClose={() => setShowAddAssetModal(false)} className="max-w-lg p-5 max-h-[92vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-800 text-white shadow-md">
                  <Tractor className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-black text-emerald-900">
                    Register Equipment / Fixed Asset
                  </DialogTitle>
                  <DialogDescription className="mt-0.5 text-xs text-slate-500">
                    Auto-calculates annual depreciation and populates FS-2 &amp; FS-4 reports
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <form onSubmit={handleAddFixedAsset} className="space-y-3.5 pt-2">
              {/* Asset Name */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Equipment / Asset Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kubota M9540 4WD Tractor, Submersible Water Pump #2"
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
                />
              </div>

              {/* Asset Type & Acquisition Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Asset Category *</label>
                  <select
                    value={assetType}
                    onChange={(e) => setAssetType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
                  >
                    <option value="heavy_machinery">🚜 Heavy Machinery / Tractors</option>
                    <option value="light_machinery">💧 Water Pumps &amp; Light Machinery</option>
                    <option value="building">🏢 Building / Warehouse / Facilities</option>
                    <option value="it_equipment">💻 Computers &amp; Office IT</option>
                    <option value="other">📦 Other Fixed Assets</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Date Acquired *</label>
                  <input
                    type="date"
                    required
                    value={assetDateAcquired}
                    onChange={(e) => setAssetDateAcquired(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
                  />
                </div>
              </div>

              {/* Acquisition Cost */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Acquisition Cost (PHP ₱) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-emerald-700">₱</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    placeholder="0.00"
                    value={assetCost}
                    onChange={(e) => setAssetCost(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
                  />
                </div>
              </div>

              {/* Preset Depreciation Rate Dropdown */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">
                  Preset Annual Depreciation Rate (%) *
                </label>
                <select
                  value={presetIndex}
                  onChange={(e) => handlePresetChange(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
                >
                  {PRESET_DEPRECIATION_OPTIONS.map((opt, idx) => (
                    <option key={idx} value={idx}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Rate Inputs if custom selected */}
              {presetIndex === 4 && (
                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 animate-fadeIn">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Custom Depreciation Rate (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      required
                      value={customDepRate}
                      onChange={(e) => setCustomDepRate(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Useful Life (Years)</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={assetUsefulLife}
                      onChange={(e) => setAssetUsefulLife(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-bold"
                    />
                  </div>
                </div>
              )}

              {/* Salvage Value & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Residual / Salvage Value (₱)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={assetSalvageValue}
                    onChange={(e) => setAssetSalvageValue(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
                  />
                  <p className="text-[10px] text-slate-400">Scrap value at end of life (usually 0)</p>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Serial No. / Notes (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. SN-KUB-9840, Station 2"
                    value={assetNotes}
                    onChange={(e) => setAssetNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
                  />
                </div>
              </div>

              {/* Live Calculation Preview Card */}
              {parseFloat(assetCost) > 0 && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
                  <div className="text-[11px] font-extrabold text-emerald-900 flex items-center gap-1.5">
                    <Calculator className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Live Depreciation Preview ({new Date().getFullYear()} Report):</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-white border border-emerald-100">
                      <div className="text-[9px] font-bold text-slate-400 uppercase">Annual Dep.</div>
                      <div className="text-xs font-black text-rose-700 mt-0.5">
                        ₱{formatPHP(modalLiveCalc.annualDepreciation)}/yr
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-white border border-emerald-100">
                      <div className="text-[9px] font-bold text-slate-400 uppercase">Accumulated Dep.</div>
                      <div className="text-xs font-black text-slate-700 mt-0.5">
                        ₱{formatPHP(modalLiveCalc.accumulatedDepreciation)}
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-white border border-emerald-100">
                      <div className="text-[9px] font-bold text-slate-400 uppercase">Net Book Value</div>
                      <div className="text-xs font-black text-emerald-800 mt-0.5">
                        ₱{formatPHP(modalLiveCalc.netBookValue)}
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] text-emerald-700 text-center font-medium">
                    ⚡ This Net Book Value will automatically reflect in FS-2 &amp; FS-4 Assets.
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddAssetModal(false)}
                  disabled={actionLoading}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save to Equipment Registry</span>
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal: Edit Budget Category */}
      {editingCat && (
        <Dialog open={true} onOpenChange={(open) => { if (!open) setEditingCat(null); }}>
          <DialogContent onClose={() => setEditingCat(null)} className="max-w-lg p-5">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-black text-slate-900">
                    Edit Budget Category / Line Item
                  </DialogTitle>
                  <DialogDescription className="mt-0.5 text-xs text-slate-500">
                    Update line item classification, allocated budget, and description.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <form onSubmit={handleUpdateCategory} className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Category Code</label>
                  <input
                    type="text"
                    disabled
                    value={editingCat.code}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs font-mono font-bold text-slate-500 cursor-not-allowed"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Account Classification</label>
                  <select
                    value={editClassification}
                    onChange={(e) => setEditClassification(e.target.value as AccountClassification)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
                  >
                    <option value="collection">📈 Collections (Income / Money IN)</option>
                    <option value="disbursement">📉 Disbursements (Expense / Money OUT)</option>
                    <option value="current_asset">🏢 Current Asset (Short-Term Receivables / Advances)</option>
                    <option value="non_current_asset">🏗️ Non-Current Asset (Long-term / Capital)</option>
                    <option value="current_liability">📑 Current Liability (Accrued Wages / Supplier Payables)</option>
                    <option value="non_current_liability">🏛️ Non-Current Liability (Long-Term Loans / Facility Financing)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">
                  Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Allocated Budget Limit (PHP)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editAllocatedAmount}
                  onChange={(e) => setEditAllocatedAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Description / Accounting Notes</label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Explain usage, turnouts covered, or NIA guideline references..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingCat(null)}
                  disabled={actionLoading}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal: Delete Category Confirmation */}
      {deletingCat && (
        <Dialog open={true} onOpenChange={(open) => { if (!open) setDeletingCat(null); }}>
          <DialogContent onClose={() => setDeletingCat(null)} className="max-w-md p-5">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-black text-rose-900">
                    Delete Budget Category?
                  </DialogTitle>
                  <DialogDescription className="mt-0.5 text-xs text-slate-500">
                    This will remove &ldquo;{deletingCat.name}&rdquo; from the association&apos;s Chart of Accounts.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
              <div className="font-bold">Important:</div>
              <p>
                Categories in use by active transactions cannot be deleted. If you proceed, the system will verify no ledger records depend on it.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingCat(null)}
                disabled={actionLoading}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteCategory}
                disabled={actionLoading}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Delete Category</span>
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal: Delete Asset Confirmation */}
      {deletingAsset && (
        <Dialog open={true} onOpenChange={(open) => { if (!open) setDeletingAsset(null); }}>
          <DialogContent onClose={() => setDeletingAsset(null)} className="max-w-md p-5">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-black text-rose-900">
                    Remove Equipment / Asset?
                  </DialogTitle>
                  <DialogDescription className="mt-0.5 text-xs text-slate-500">
                    Remove &ldquo;{deletingAsset.name}&rdquo; from Fixed Asset Registry.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
              <div className="font-bold">Note:</div>
              <p>
                Removing this asset will stop its automatic depreciation calculations on future financial reports.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingAsset(null)}
                disabled={actionLoading}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteFixedAsset}
                disabled={actionLoading}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Delete Asset</span>
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
