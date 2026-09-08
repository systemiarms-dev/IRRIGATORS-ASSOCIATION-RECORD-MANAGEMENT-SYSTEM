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
  Sparkles,
  ChevronRight,
  X,
  Wallet,
} from 'lucide-react';
import { BudgetCategory, Association, UserRole, PublicProfile } from '@/types';
import { getSelfProfileAction } from '@/app/actions/auth';
import { getAssociationsAction } from '@/app/actions/associations';
import {
  getBudgetCategoriesAction,
  createBudgetCategoryAction,
  deleteBudgetCategoryAction,
} from '@/app/actions/transactions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { formatPHP } from '@/lib/utils/formatters';

export default function ChartOfAccountsPage() {
  const [currentUser, setCurrentUser] = useState<PublicProfile | null>(null);
  const [associations, setAssociations] = useState<Association[]>([]);
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [selectedAssocId, setSelectedAssocId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'collection' | 'disbursement'>('all');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'standard' | 'custom'>('all');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingCat, setDeletingCat] = useState<BudgetCategory | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Add Form state
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formType, setFormType] = useState<'collection' | 'disbursement'>('collection');
  const [formAssocId, setFormAssocId] = useState('');
  const [formBudget, setFormBudget] = useState('');
  const [formDescription, setFormDescription] = useState('');

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

  // Fetch categories when selected association changes
  useEffect(() => {
    if (!currentUser) return;
    async function fetchCategories() {
      const targetAssoc = isSuperAdmin ? selectedAssocId : (currentUser?.association_id || undefined);
      const res = await getBudgetCategoriesAction(targetAssoc);
      if (res.success && res.data) {
        setCategories(res.data);
      }
    }
    startTransition(() => {
      fetchCategories();
    });
  }, [currentUser, selectedAssocId, isSuperAdmin]);

  // Core standard categories IDs that cannot be deleted
  const coreStandardIds = useMemo(() => new Set([
    'cat-1', 'cat-2', 'cat-3', 'cat-4', 'cat-5', 'cat-6', 'cat-7', 'cat-8',
    'cat-9', 'cat-10', 'cat-11', 'cat-12', 'cat-13', 'cat-14', 'cat-15', 'cat-16', 'cat-17'
  ]), []);

  // Filtered categories
  const filteredCategories = useMemo(() => {
    return categories.filter((c) => {
      // Type match
      if (typeFilter !== 'all' && c.category_type !== typeFilter) return false;

      // Scope match
      const isCustom = !!c.association_id && !coreStandardIds.has(c.id);
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
  }, [categories, typeFilter, scopeFilter, searchQuery, coreStandardIds]);

  // Stats
  const stats = useMemo(() => {
    const total = categories.length;
    const collections = categories.filter((c) => c.category_type === 'collection').length;
    const disbursements = categories.filter((c) => c.category_type === 'disbursement').length;
    const customCount = categories.filter((c) => !!c.association_id && !coreStandardIds.has(c.id)).length;
    return { total, collections, disbursements, customCount };
  }, [categories, coreStandardIds]);

  // Open add modal
  function handleOpenAddModal() {
    setFeedback(null);
    setFormName('');
    setFormCode('');
    setFormType('collection');
    setFormBudget('');
    setFormDescription('');
    setFormAssocId(isSuperAdmin ? selectedAssocId : (currentUser?.association_id || ''));
    setShowAddModal(true);
  }

  // Handle Add Category submit
  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) {
      setFeedback({ type: 'error', message: 'Category name is required.' });
      return;
    }

    setActionLoading(true);
    try {
      const budgetNum = formBudget.trim() ? parseFloat(formBudget) : 0;
      const res = await createBudgetCategoryAction({
        name: formName.trim(),
        category_type: formType,
        code: formCode.trim() || undefined,
        allocated_amount: isNaN(budgetNum) ? 0 : budgetNum,
        description: formDescription.trim() || undefined,
        association_id: isSuperAdmin ? formAssocId : undefined,
      });

      if (!res.success || !res.data) {
        setFeedback({ type: 'error', message: res.message || 'Failed to add budget category.' });
        return;
      }

      // Success
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

  // Handle Delete category
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

  const selectedAssocObj = associations.find((a) => a.id === selectedAssocId);

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white shadow-lg">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 text-emerald-200">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight">Chart of Accounts</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-700/80 text-emerald-100 border border-emerald-500/40">
                Official NIA &amp; IA Ledger Classifications
              </span>
            </div>
            <p className="text-xs text-emerald-200/90 mt-0.5">
              Authorized budget line items selectable when logging collections and disbursements.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Association Scoping */}
          {isSuperAdmin ? (
            <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/15 text-xs">
              <Building2 className="w-3.5 h-3.5 text-emerald-200 shrink-0" />
              <select
                value={selectedAssocId}
                onChange={(e) => setSelectedAssocId(e.target.value)}
                className="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer"
              >
                {associations.map((a) => (
                  <option key={a.id} value={a.id} className="text-slate-900 font-medium">
                    {a.name} ({a.code})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/15 text-xs">
              <Building2 className="w-3.5 h-3.5 text-emerald-200" />
              <span className="font-bold text-emerald-100">{selectedAssocObj?.name || 'Your Association'}</span>
            </div>
          )}

          {/* Role indicator or Add Button */}
          {isReadOnly ? (
            <div className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-200 text-xs font-bold flex items-center gap-1.5">
              <span>Read &amp; View Only ({currentUser?.role === 'auditor' ? 'Auditor' : 'Treasurer'})</span>
            </div>
          ) : (
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-emerald-900 hover:bg-emerald-50 text-xs font-bold transition-all shadow-sm hover:shadow active:scale-95"
            >
              <PlusCircle className="w-4 h-4 text-emerald-700" />
              <span>Add Budget Category</span>
            </button>
          )}
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
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700">
            <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Money IN (Collections)</div>
            <div className="text-lg font-black text-emerald-700">{stats.collections}</div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700">
            <ArrowUpRight className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Money OUT (Disbursements)</div>
            <div className="text-lg font-black text-rose-700">{stats.disbursements}</div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-50 text-amber-700">
            <Sparkles className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">IA Custom Line Items</div>
            <div className="text-lg font-black text-amber-700">{stats.customCount}</div>
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Controls Strip */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by code, title, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-700 font-medium"
            />
          </div>

          {/* Filter Pill Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {/* Type Filter */}
            <div className="p-1 bg-slate-200/70 rounded-lg flex items-center gap-1 font-semibold text-[11px]">
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

            {/* Scope Filter */}
            <div className="p-1 bg-slate-200/70 rounded-lg flex items-center gap-1 font-semibold text-[11px]">
              <button
                onClick={() => setScopeFilter('all')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  scopeFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Scopes
              </button>
              <button
                onClick={() => setScopeFilter('standard')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  scopeFilter === 'standard' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                NIA Standard
              </button>
              <button
                onClick={() => setScopeFilter('custom')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  scopeFilter === 'custom' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                IA Custom
              </button>
            </div>
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="min-h-[300px] flex flex-col items-center justify-center text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-3" />
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
                  <th className="py-3 px-3 text-left">Cash Flow Type</th>
                  <th className="py-3 px-3 text-left">Scope &amp; Authority</th>
                  <th className="py-3 px-4 text-right">Allocated Budget</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredCategories.map((c) => {
                  const isCoreStandard = coreStandardIds.has(c.id) || !c.association_id;
                  const isAssocCustom = !isCoreStandard && !!c.association_id;
                  const assocName = associations.find((a) => a.id === c.association_id)?.code || 'IA';

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Code */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-800 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800 text-[11px]">
                          {c.code}
                        </span>
                      </td>

                      {/* Name & Description */}
                      <td className="py-3 px-4 max-w-[280px]">
                        <div className="font-bold text-slate-900">{c.name}</div>
                        {c.description && (
                          <div className="text-[11px] text-slate-500 truncate mt-0.5">{c.description}</div>
                        )}
                      </td>

                      {/* Flow Type */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {c.category_type === 'collection' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                            Money IN (Collection)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <ArrowUpRight className="w-3 h-3 text-rose-600" />
                            Money OUT (Disbursement)
                          </span>
                        )}
                      </td>

                      {/* Scope & Authority */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {isCoreStandard ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            <Lock className="w-2.5 h-2.5 text-blue-600" />
                            NIA Standard
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                            IA Custom ({assocName})
                          </span>
                        )}
                      </td>

                      {/* Allocated Budget */}
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-700 whitespace-nowrap">
                        {c.allocated_amount && c.allocated_amount > 0 ? (
                          formatPHP(c.allocated_amount)
                        ) : (
                          <span className="text-slate-400 font-sans text-[11px]">Uncapped / As Needed</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {isCoreStandard ? (
                          <span className="text-slate-400 text-[10px] italic flex items-center justify-end gap-1">
                            <Lock className="w-3 h-3 text-slate-400" /> Protected
                          </span>
                        ) : isReadOnly ? (
                          <span className="text-slate-400 text-[10px] italic">View Only</span>
                        ) : (
                          <button
                            onClick={() => setDeletingCat(c)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title={`Delete ${c.name}`}
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

      {/* Footer Info Box */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3 text-xs text-slate-600">
        <Info className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-800">Chart of Accounts Governance:</span> Standard NIA classifications are system-wide official lines compliant with National Irrigation Administration audit guidelines. Custom categories added here become permanent choices in the <em>Log Financial Transaction</em> modal for your association. One-time notes entered during transaction logging are stored in transaction particulars without cluttering this official list.
        </div>
      </div>

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
                <label className="text-[11px] font-bold text-slate-700">Account Classification *</label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setFormType('collection')}
                    className={`py-1.5 px-3 rounded-md text-xs font-bold transition-all ${
                      formType === 'collection' ? 'bg-emerald-700 text-white shadow-sm' : 'text-slate-500 hover:text-emerald-800'
                    }`}
                  >
                    Money IN (Collection)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormType('disbursement')}
                    className={`py-1.5 px-3 rounded-md text-xs font-bold transition-all ${
                      formType === 'disbursement' ? 'bg-rose-700 text-white shadow-sm' : 'text-slate-500 hover:text-rose-800'
                    }`}
                  >
                    Money OUT (Expense)
                  </button>
                </div>
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

              {/* Allocated Budget (Optional) */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Allocated Budget in PHP (Optional)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={formBudget}
                  onChange={(e) => setFormBudget(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Description / Guidelines (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Notes on what expenses or collections belong to this category..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600/30 resize-none"
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

      {/* Modal: Delete Confirmation */}
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
    </div>
  );
}
