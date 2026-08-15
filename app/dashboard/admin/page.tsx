'use client';

import React, { useCallback, useState, useTransition, useEffect } from 'react';
import { useLoadOnce } from '@/lib/hooks/useLoadOnce';
import { 
  getProfilesAction, updateUserRoleAction, deleteUserAccountAction, 
  resetUserPasswordAction, createAccountAction, clearAllRecordsAction,
  updateUserProfileAction 
} from '@/app/actions/admin';
import { getAssociationsAction } from '@/app/actions/associations';
import { getSelfProfileAction } from '@/app/actions/auth';
import { Profile, UserRole, Association } from '@/types';
import { formatDate, formatNumber } from '@/lib/utils/formatters';
import { PhilippinePhoneInput, isValidPhilippineMobile } from '@/components/ui/philippine-phone-input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { 
  Users, Trash2, Filter, RefreshCw, Loader2, Key, ShieldCheck, 
  X, Printer, Download, UserPlus, Building2, CheckCircle2, ShieldAlert, Pencil, Eye, EyeOff 
} from 'lucide-react';
import { exportToExcelCSV, exportToPDFPrint, buildExportFilename } from '@/lib/utils/export';

export default function AdminUsersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [associations, setAssociations] = useState<Association[]>([]);
  const [selectedAssocId, setSelectedAssocId] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('super_admin');
  const [currentUserAssocId, setCurrentUserAssocId] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [isPending, startTransition] = useTransition();

  // Create User Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    fullName: '',
    username: '',
    password: '',
    role: 'treasurer' as UserRole,
    associationId: 'ia-nangurisan',
    farmLocation: '',
    farmSizeHectares: '0',
    contactNumber: '',
  });
  const [createMsg, setCreateMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  // Treasurer/Auditor usernames are fixed to the association short code (never editable).
  const fixedAssocId = currentUserRole === 'super_admin' ? createForm.associationId : currentUserAssocId || createForm.associationId;
  const selectedAssoc = associations.find((a) => a.id === fixedAssocId);
  const assocShortCode = (selectedAssoc?.code || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const isFixedUsername = createForm.role === 'treasurer' || createForm.role === 'auditor';
  const generatedUsername = isFixedUsername && assocShortCode ? `${createForm.role}_${assocShortCode}` : '';

  useEffect(() => {
    if (isFixedUsername && generatedUsername && createForm.username !== generatedUsername) {
      setCreateForm((prev) => ({ ...prev, username: generatedUsername }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFixedUsername, generatedUsername]);

  // Reset Password Modal State
  const [resetModalUser, setResetModalUser] = useState<Profile | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetMsg, setResetMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  // Edit User Modal State
  const [editModalUser, setEditModalUser] = useState<Profile | null>(null);
  const [editForm, setEditForm] = useState({
    fullName: '',
    contactNumber: '',
    farmLocation: '',
    farmSizeHectares: '0',
  });
  const [editMsg, setEditMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isEditingUser, setIsEditingUser] = useState(false);

  // Delete User Confirmation Modal State
  const [deleteModalUser, setDeleteModalUser] = useState<Profile | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [bannerMsg, setBannerMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Clear All Records Modal State
  const [showClearModal, setShowClearModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Client-only date for print reports (avoids hydration mismatch)
  const [printDate, setPrintDate] = useState('');
  useEffect(() => {
    const now = new Date();
    setPrintDate(
      now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) +
      ' ' +
      now.toLocaleTimeString('en-US')
    );
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [profRes, assocRes, selfRes] = await Promise.all([
        getProfilesAction(roleFilter, selectedAssocId),
        getAssociationsAction(),
        getSelfProfileAction(),
      ]);

      if (selfRes.success && selfRes.data) {
        const selfUser = selfRes.data;
        setCurrentUserRole(selfUser.role);
        setCurrentUserId(selfUser.id);
        if (selfUser.role !== 'super_admin' && selfUser.association_id) {
          setCurrentUserAssocId(selfUser.association_id);
          setSelectedAssocId(selfUser.association_id);
          setCreateForm((prev) => ({ ...prev, associationId: selfUser.association_id || 'ia-nangurisan' }));
        } else if (selfUser.association_id) {
          setCurrentUserAssocId(selfUser.association_id);
        }
      }

      if (profRes.success && profRes.data) setProfiles(profRes.data);
      if (assocRes.success && assocRes.data) {
        setAssociations(assocRes.data);
      }
    } catch (err) {
      console.error('Failed to load admin accounts:', err);
    } finally {
      setLoading(false);
    }
  }, [roleFilter, selectedAssocId]);

  useLoadOnce(loadData);

  async function handleClearAllRecords() {
    setIsClearing(true);
    try {
      const res = await clearAllRecordsAction(selectedAssocId);
      setShowClearModal(false);
      if (res.success) {
        setBannerMsg({ type: 'success', text: 'Financial records cleared successfully.' });
        loadData();
      } else {
        setBannerMsg({ type: 'error', text: res.message || 'Failed to clear records.' });
      }
    } catch (err: any) {
      setBannerMsg({ type: 'error', text: err?.message || 'Unexpected error while clearing records.' });
    } finally {
      setIsClearing(false);
    }
  }

  async function handleCreateUserSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsCreating(true);
    setCreateMsg(null);

    const formData = new FormData();
    formData.append('full_name', createForm.fullName);
    formData.append('username', generatedUsername || createForm.username);
    formData.append('password', createForm.password);
    formData.append('role', createForm.role);
    formData.append('association_id', currentUserRole === 'super_admin' ? createForm.associationId : currentUserAssocId);
    formData.append('farm_location', createForm.farmLocation);
    formData.append('farm_size_hectares', createForm.farmSizeHectares);
    formData.append('contact_number', createForm.contactNumber);

    const res = await createAccountAction(formData);
    setIsCreating(false);

    if (res.success) {
      setCreateMsg({ type: 'success', text: res.message });
      setTimeout(() => {
        setShowCreateModal(false);
        setCreateMsg(null);
        setCreateForm({
          fullName: '',
          username: '',
          password: '',
          role: 'treasurer',
          associationId: currentUserAssocId || associations[0]?.id || 'ia-nangurisan',
          farmLocation: '',
          farmSizeHectares: '0',
          contactNumber: '',
        });
        loadData();
      }, 700);
    } else {
      setCreateMsg({ type: 'error', text: res.message });
    }
  }

  function handleRoleChange(userId: string, newRole: UserRole) {
    startTransition(async () => {
      const res = await updateUserRoleAction(userId, newRole);
      if (res.success) {
        setBannerMsg({ type: 'success', text: res.message });
        loadData();
      } else {
        setBannerMsg({ type: 'error', text: res.message });
      }
    });
  }

  function handlePrintUsers() {
    const scopeCode =
      selectedAssocId && selectedAssocId !== 'all'
        ? associations.find((a) => a.id === selectedAssocId)?.code || 'IA'
        : 'AllAssociations';
    exportToPDFPrint(buildExportFilename(`Officer_Accounts_Directory_${scopeCode}`));
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetModalUser) return;
    setIsResetting(true);
    setResetMsg(null);

    const res = await resetUserPasswordAction(resetModalUser.id, newPassword);
    setIsResetting(false);

    if (res.success) {
      setResetMsg({ type: 'success', text: res.message });
      setTimeout(() => {
        setResetModalUser(null);
        setNewPassword('');
        setResetMsg(null);
      }, 700);
    } else {
      setResetMsg({ type: 'error', text: res.message });
    }
  }

  async function handleConfirmDelete() {
    if (!deleteModalUser || isDeletingUser) return;
    setIsDeletingUser(true);
    try {
      const res = await deleteUserAccountAction(deleteModalUser.id);
      setDeleteModalUser(null);
      if (res.success) {
        setBannerMsg({ type: 'success', text: res.message });
        loadData();
      } else {
        setBannerMsg({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setBannerMsg({ type: 'error', text: err?.message || 'Unexpected error while deleting the account.' });
    } finally {
      setIsDeletingUser(false);
    }
  }

  function openEditModal(u: Profile) {
    setEditForm({
      fullName: u.full_name || '',
      contactNumber: u.contact_number || '',
      farmLocation: u.farm_location || '',
      farmSizeHectares: String(u.farm_size_hectares ?? 0),
    });
    setEditMsg(null);
    setEditModalUser(u);
  }

  async function handleUpdateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!editModalUser || isEditingUser) return;
    setIsEditingUser(true);
    setEditMsg(null);

    const formData = new FormData();
    formData.append('full_name', editForm.fullName);
    formData.append('contact_number', editForm.contactNumber);
    formData.append('farm_location', editForm.farmLocation);
    formData.append('farm_size_hectares', editForm.farmSizeHectares);

    const res = await updateUserProfileAction(editModalUser.id, formData);
    setIsEditingUser(false);

    if (res.success) {
      setEditMsg({ type: 'success', text: res.message });
      setTimeout(() => {
        setEditModalUser(null);
        setEditMsg(null);
        loadData();
      }, 700);
    } else {
      setEditMsg({ type: 'error', text: res.message });
    }
  }

  function canEditUser(u: Profile): boolean {
    if (u.role === 'super_admin') return false;
    if (currentUserRole === 'super_admin') return u.id !== currentUserId;
    return (
      currentUserRole === 'admin' &&
      (u.role === 'treasurer' || u.role === 'auditor') &&
      u.association_id === currentUserAssocId &&
      u.id !== currentUserId
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Association Filter Strip for Super Admin */}
      {currentUserRole === 'super_admin' && (
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold text-slate-700">Filter Officers by Association:</span>
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
              All Associations ({profiles.length})
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
            <Users className="w-6 h-6" />
          </div>
          <div className="min-w-0 space-y-1">
            <div className="inline-flex items-center flex-wrap gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-[8.5px] sm:text-[10px] lg:text-[11px] font-extrabold border border-emerald-200">
              IRRIGATORS ASSOCIATION RECORD MANAGEMENT SYSTEM by NIA
            </div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 leading-tight break-words">
              {currentUserRole === 'super_admin' ? 'Association Officer Accounts Management' : 'Association Accounts Management'}
            </h1>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              {currentUserRole === 'super_admin'
                ? 'Manage officer credentials, roles, and password resets across all Irrigators Associations.'
                : 'Manage your association officers (Treasurer, Auditor, Head Admin) and reset credentials.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          <button
            onClick={handlePrintUsers}
            className="px-4 py-2.5 rounded-xl border border-emerald-200 text-emerald-800 hover:bg-emerald-50 font-bold text-xs flex items-center gap-2 transition-colors"
          >
            <Printer className="w-4 h-4" /> Print Accounts (PDF)
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs transition-all shadow-md flex items-center gap-2 active:scale-95"
          >
            <UserPlus className="w-4 h-4" /> Create Officer Account
          </button>

          {currentUserRole === 'super_admin' && (
            <button
              onClick={() => setShowClearModal(true)}
              className="px-3 py-2.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold text-xs flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              <span>Purge Records</span>
            </button>
          )}
        </div>
      </div>

      {bannerMsg && (
        <div className={`p-4 rounded-xl text-xs font-bold border flex items-center gap-2 print:hidden ${
          bannerMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <span>{bannerMsg.text}</span>
        </div>
      )}

      {/* Role Filter Tabs */}
      <div className="flex items-center justify-between gap-4 flex-wrap print:hidden">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-200/80 border border-slate-300 overflow-x-auto">
          <button
            onClick={() => setRoleFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              roleFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Accounts ({profiles.length})
          </button>
          <button
            onClick={() => setRoleFilter('admin')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              roleFilter === 'admin' ? 'bg-rose-800 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Head Admins
          </button>
          <button
            onClick={() => setRoleFilter('treasurer')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              roleFilter === 'treasurer' ? 'bg-emerald-800 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Treasurers
          </button>
          <button
            onClick={() => setRoleFilter('auditor')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              roleFilter === 'auditor' ? 'bg-emerald-800 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Auditors
          </button>
        </div>

        <button
          onClick={() => loadData()}
          className="p-2 rounded-xl border border-slate-300 text-slate-600 hover:bg-white text-xs font-bold flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Users Directory Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print:hidden">
        {loading ? (
          <div className="min-h-[300px] flex flex-col items-center justify-center text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-3" />
            <span className="text-xs font-medium">Loading user accounts from Supabase...</span>
          </div>
        ) : profiles.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <Users className="w-10 h-10 mx-auto text-slate-300" />
            <div className="text-sm font-bold">No accounts found.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-slate-800">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                  <th className="py-3 px-4 text-left">Officer Name</th>
                  <th className="py-3 px-3 text-left">Username</th>
                  <th className="py-3 px-3 text-left">Association</th>
                  <th className="py-3 px-3 text-left">Assigned Role</th>
                  <th className="py-3 px-3 text-left">Contact Number</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {profiles.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {u.full_name}
                    </td>

                    <td className="py-3 px-3 font-mono text-emerald-800 font-bold">
                      {u.username}
                    </td>

                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        {u.association?.code || 'IA'} &bull; {u.association?.name.split(' ')[0] || 'Assoc'}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      {currentUserRole === 'super_admin' ? (
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                          className="px-2 py-1 text-xs font-bold rounded-lg border border-slate-300 bg-white"
                        >
                          <option value="admin">Head Admin</option>
                          <option value="treasurer">Treasurer</option>
                          <option value="auditor">Auditor</option>
                        </select>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[11px] font-bold uppercase font-mono">
                          {u.role}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 font-mono text-slate-600">
                      {u.contact_number || '—'}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap space-x-1">
                      {canEditUser(u) && (
                        <button
                          onClick={() => openEditModal(u)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors inline-flex items-center"
                          title="Edit Account Details"
                        >
                          <Pencil className="w-3.5 h-3.5 text-emerald-600" />
                        </button>
                      )}

                      {canEditUser(u) && (
                        <button
                          onClick={() => setResetModalUser(u)}
                          className="px-2.5 py-1.5 rounded-lg text-slate-600 hover:text-emerald-800 hover:bg-emerald-50 border border-slate-200 text-xs font-bold transition-colors inline-flex items-center gap-1"
                          title="Reset Password"
                        >
                          <Key className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Reset Password</span>
                        </button>
                      )}

                      {canEditUser(u) && (
                        <button
                          onClick={() => setDeleteModalUser(u)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors inline-flex items-center"
                          title="Delete Account"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Account Modal */}
      {showCreateModal && (
        <Dialog open={showCreateModal} onOpenChange={() => setShowCreateModal(false)}>
          <DialogContent className="max-w-xl p-6 bg-white rounded-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-black text-slate-900">
                Register New Officer Account
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Create an authorized account for your association officers.
              </DialogDescription>
            </DialogHeader>

            {createMsg && (
              <div className={`p-3 rounded-xl text-xs font-bold border flex items-center gap-2 ${
                createMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}>
                <span>{createMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleCreateUserSubmit} className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Officer Full Name *</label>
                  <input
                    type="text"
                    required
                    value={createForm.fullName}
                    onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                    placeholder="e.g. Juan Dela Cruz"
                    className="w-full text-xs p-2.5 border rounded-xl border-slate-300"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Username *</label>
                  <input
                    type="text"
                    required
                    disabled={isFixedUsername}
                    readOnly={isFixedUsername}
                    value={isFixedUsername ? generatedUsername : createForm.username}
                    onChange={(e) => {
                      if (!isFixedUsername) setCreateForm({ ...createForm, username: e.target.value.toLowerCase().replace(/\s+/g, '_') });
                    }}
                    placeholder={isFixedUsername ? generatedUsername : 'e.g. admin_nlfia'}
                    className="w-full text-xs p-2.5 border rounded-xl border-slate-300 font-mono disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                  />
                  {isFixedUsername && (
                    <p className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      Username is fixed to this role + the association short code and cannot be changed.
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Initial Password *</label>
                  <div className="relative">
                    <input
                      type={showCreatePassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={createForm.password}
                      onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                      placeholder="&bull;&bull;&bull;&bull;&bull;&bull;"
                      className="w-full text-xs p-2.5 pr-10 border rounded-xl border-slate-300"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCreatePassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                      title={showCreatePassword ? 'Hide password' : 'Show password'}
                    >
                      {showCreatePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

<div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Officer Role *</label>
                    <select
                      value={createForm.role}
                      onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as UserRole })}
                      className="w-full text-xs p-2.5 border rounded-xl border-slate-300 font-bold"
                    >
                      <option value="treasurer">Association Treasurer</option>
                      <option value="auditor">Internal Auditor</option>
                      {currentUserRole === 'super_admin' && <option value="admin">Association Head Admin</option>}
                    </select>
                  </div>
              </div>

              {currentUserRole === 'super_admin' ? (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Associated Irrigators Association *</label>
                  <select
                    value={createForm.associationId}
                    onChange={(e) => setCreateForm({ ...createForm, associationId: e.target.value })}
                    className="w-full text-xs p-2.5 border rounded-xl border-slate-300 font-bold bg-slate-50"
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
                      {associations.find((a) => a.id === currentUserAssocId)?.name || 'Your Association'} ({associations.find((a) => a.id === currentUserAssocId)?.code || 'IA'})
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold shrink-0 ml-2">
                    Assigned IA
                  </span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Mobile / Contact Number</label>
                <PhilippinePhoneInput
                  value={createForm.contactNumber}
                  onChange={(v) => setCreateForm({ ...createForm, contactNumber: v })}
                />
                <p className="text-[10px] text-slate-500 font-semibold">Philippine mobile number — 11 digits starting with 09.</p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-800 text-white hover:bg-emerald-900 flex items-center gap-2"
                >
                  {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  Create Account
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Reset Password Modal */}
      {resetModalUser && (
        <Dialog open={!!resetModalUser} onOpenChange={() => setResetModalUser(null)}>
          <DialogContent className="max-w-md p-6 bg-white rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-2">
                <Key className="w-5 h-5 text-emerald-700" />
                Reset Password for {resetModalUser.full_name}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Set a new initial password for {resetModalUser.username}.
              </DialogDescription>
            </DialogHeader>

            {resetMsg && (
              <div className={`p-3 rounded-xl text-xs font-bold border flex items-center gap-2 ${
                resetMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}>
                <span>{resetMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">New Initial Password *</label>
                <div className="relative">
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter at least 6 characters"
                    className="w-full text-xs p-2.5 pr-10 border rounded-xl border-slate-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                    title={showResetPassword ? 'Hide password' : 'Show password'}
                  >
                    {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setResetModalUser(null)}
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResetting}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-800 text-white hover:bg-emerald-900 flex items-center gap-2"
                >
                  {isResetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                  Save New Password
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit User Modal */}
      {editModalUser && (
        <Dialog open={!!editModalUser} onOpenChange={() => setEditModalUser(null)}>
          <DialogContent className="max-w-md p-6 bg-white rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-2">
                <Pencil className="w-5 h-5 text-emerald-700" />
                Edit Account Details
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Update profile information for {editModalUser.full_name} ({editModalUser.username}).
              </DialogDescription>
            </DialogHeader>

            {editMsg && (
              <div className={`p-3 rounded-xl text-xs font-bold border flex items-center gap-2 ${
                editMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}>
                <span>{editMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleUpdateUser} className="space-y-4 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Full Name *</label>
                <input
                  type="text"
                  required
                  value={editForm.fullName}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, fullName: e.target.value }))}
                  placeholder="Enter full name"
                  className="w-full text-xs p-2.5 border rounded-xl border-slate-300"
                />
              </div>

              <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Mobile / Contact Number</label>
                  <PhilippinePhoneInput
                    value={editForm.contactNumber}
                    onChange={(v) => setEditForm((prev) => ({ ...prev, contactNumber: v }))}
                  />
                  <p className="text-[10px] text-slate-500 font-semibold">Philippine mobile number — 11 digits starting with 09.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Farm Size (hectares)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editForm.farmSizeHectares}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, farmSizeHectares: e.target.value }))}
                      className="w-full text-xs p-2.5 border rounded-xl border-slate-300"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Farm Location</label>
                    <input
                      type="text"
                      value={editForm.farmLocation}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, farmLocation: e.target.value }))}
                      placeholder="Optional farm location"
                      className="w-full text-xs p-2.5 border rounded-xl border-slate-300"
                    />
                  </div>
                </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setEditModalUser(null)}
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditingUser}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-800 text-white hover:bg-emerald-900 flex items-center gap-2"
                >
                  {isEditingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
                  Save Changes
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Purge Records Confirmation Modal */}
      {showClearModal && (
        <Dialog open={showClearModal} onOpenChange={() => setShowClearModal(false)}>
          <DialogContent className="max-w-md p-6 bg-white rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-black text-rose-600 flex items-center gap-2">
                <Trash2 className="w-5 h-5" /> Purge Financial Records
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                This permanently deletes ALL transactions, receipts, and generated statements
                {selectedAssocId === 'all' ? ' across every association' : ' for the selected association'} including their uploaded files. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                disabled={isClearing}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 text-slate-700 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearAllRecords}
                disabled={isClearing}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-700 text-white hover:bg-rose-800 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isClearing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {isClearing ? 'Purging...' : 'Yes, Purge All Records'}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete User Modal */}
      {deleteModalUser && (
        <Dialog open={!!deleteModalUser} onOpenChange={() => setDeleteModalUser(null)}>
          <DialogContent className="max-w-md p-6 bg-white rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-black text-rose-600 flex items-center gap-2">
                <Trash2 className="w-5 h-5" /> Delete User Account
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Are you sure you want to remove {deleteModalUser.full_name} ({deleteModalUser.username})? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => setDeleteModalUser(null)}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeletingUser}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isDeletingUser && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {isDeletingUser ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Print-Only Users Report */}
      <div id="Users-Report" className="hidden print:block">
        <div className="text-center mb-4 border-b border-black pb-3">
          <h1 className="text-sm font-black tracking-wide uppercase">
            IRRIGATORS ASSOCIATION RECORD MANAGEMENT SYSTEM
          </h1>
          <p className="text-[10px] font-semibold mt-0.5">
            by National Irrigation Administration (NIA)
          </p>
          <h2 className="text-base font-black mt-2 uppercase">
            {currentUserRole === 'super_admin'
              ? 'Association Officer Accounts Directory'
              : 'Association Accounts Directory'}
          </h2>
          <p className="text-[10px] font-medium mt-1">
            Scope:{' '}
            {selectedAssocId === 'all'
              ? 'All Associations (Consolidated)'
              : associations.find((a) => a.id === selectedAssocId)?.name || selectedAssocId}
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5">
            Generated on: {printDate || '...'}
          </p>
        </div>

        <table className="w-full text-[9px] border-collapse">
          <thead>
            <tr className="border-b border-black text-left uppercase font-bold">
              <th className="py-1.5 px-1.5 w-8">#</th>
              <th className="py-1.5 px-1.5">Officer Name</th>
              <th className="py-1.5 px-1.5">Username</th>
              <th className="py-1.5 px-1.5">Role</th>
              <th className="py-1.5 px-1.5">Association</th>
              <th className="py-1.5 px-1.5">Mobile #</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((u, idx) => (
              <tr key={u.id} className="border-b border-gray-200">
                <td className="py-1.5 px-1.5">{idx + 1}</td>
                <td className="py-1.5 px-1.5 font-bold">{u.full_name}</td>
                <td className="py-1.5 px-1.5">{u.username}</td>
                <td className="py-1.5 px-1.5 uppercase">{u.role}</td>
                <td className="py-1.5 px-1.5">{u.association?.code || 'IA'}</td>
                <td className="py-1.5 px-1.5">{u.contact_number || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="text-[9px] text-gray-400 mt-4 text-center border-t border-gray-200 pt-2">
          IARMS &bull; IRRIGATORS ASSOCIATION RECORD MANAGEMENT SYSTEM by NIA
        </p>
      </div>
    </div>
  );
}
