'use client';

import React, { useCallback, useEffect, useState, useTransition } from 'react';
import { getProfilesAction, updateUserRoleAction, deleteUserAccountAction, resetUserPasswordAction, createAccountAction, clearAllRecordsAction } from '@/app/actions/admin';
import { Profile, UserRole } from '@/types';
import { formatDate, formatNumber } from '@/lib/utils/formatters';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Alert } from '@/components/ui/alert';
import { Users, Trash2, Filter, RefreshCw, Loader2, Key, ShieldCheck, X, Printer, Download, UserPlus } from 'lucide-react';
import { exportToExcelCSV, exportToPDFPrint } from '@/lib/utils/export';

export default function AdminUsersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [isPending, startTransition] = useTransition();

  // Create User Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'member' as UserRole,
    farmLocation: '',
    farmSizeHectares: '0',
    contactNumber: '',
  });
  const [createMsg, setCreateMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Reset Password Modal State
  const [resetModalUser, setResetModalUser] = useState<Profile | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetMsg, setResetMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  // Delete User Confirmation Modal State
  const [deleteModalUser, setDeleteModalUser] = useState<Profile | null>(null);
  const [bannerMsg, setBannerMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Clear All Records Modal State
  const [showClearModal, setShowClearModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  async function handleClearAllRecords() {
    setIsClearing(true);
    const res = await clearAllRecordsAction();
    setIsClearing(false);
    setShowClearModal(false);
    if (res.success) {
      setBannerMsg({ type: 'success', text: 'All transactions, receipts, and financial statements have been cleared successfully.' });
      loadProfiles();
    } else {
      setBannerMsg({ type: 'error', text: res.message || 'Failed to clear records.' });
    }
  }

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    const res = await getProfilesAction(roleFilter);
    setLoading(false);
    if (res.success && res.data) {
      setProfiles(res.data);
    }
  }, [roleFilter]);

  async function handleCreateUserSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsCreating(true);
    setCreateMsg(null);

    const formData = new FormData();
    formData.append('full_name', createForm.fullName);
    formData.append('email', createForm.email);
    formData.append('password', createForm.password);
    formData.append('role', createForm.role);
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
          email: '',
          password: '',
          role: 'member',
          farmLocation: '',
          farmSizeHectares: '0',
          contactNumber: '',
        });
        loadProfiles();
      }, 1200);
    } else {
      setCreateMsg({ type: 'error', text: res.message });
    }
  }

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  function handleRoleUpdate(userId: string, newRole: UserRole) {
    startTransition(async () => {
      const res = await updateUserRoleAction(userId, newRole);
      await loadProfiles();
      if (res.success) {
        setBannerMsg({
          type: 'success',
          text: `${res.message} The role applies immediately the next time the user loads a page — no sign-in required.`,
        });
      } else {
        setBannerMsg({ type: 'error', text: res.message || 'Failed to update the user role.' });
      }
    });
  }

  function handleConfirmDeleteUser() {
    if (!deleteModalUser) return;
    startTransition(async () => {
      const res = await deleteUserAccountAction(deleteModalUser.id);
      setDeleteModalUser(null);
      if (res.success) {
        setBannerMsg({ type: 'success', text: `Account for ${deleteModalUser.full_name} deleted successfully.` });
        await loadProfiles();
      } else {
        setBannerMsg({ type: 'error', text: res.message || 'Failed to delete user account.' });
      }
    });
  }

  async function handleConfirmResetPassword(e: React.FormEvent) {
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
        setResetMsg(null);
        loadProfiles();
      }, 1200);
    } else {
      setResetMsg({ type: 'error', text: res.message });
    }
  }

  // The built-in system admin (admin@iarms.org) and any admin-role accounts are
  // operators, not end users, so they are excluded from directory counts and the table.
  const visibleProfiles = profiles.filter((p) => p.role !== 'admin' && p.email !== 'admin@iarms.org');

  function handleExportUsersExcel() {
    exportToExcelCSV(
      'NLFIA_User_Directory',
      'Association Member & User Account Directory',
      {
        'Role Filter': roleFilter.toUpperCase(),
        'Total Count': visibleProfiles.length,
      },
      ['Full Name', 'Email', 'Assigned Role', 'Farm Location', 'Farm Size (Ha)', 'Contact Number', 'Registration Date'],
      visibleProfiles.map((p) => [
        p.full_name,
        p.email,
        p.role.toUpperCase(),
        p.farm_location || 'N/A',
        p.farm_size_hectares || 0,
        p.contact_number || 'N/A',
        formatDate(p.created_at),
      ])
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {bannerMsg && (
        <Alert variant={bannerMsg.type === 'error' ? 'destructive' : 'default'} className="mb-4">
          <div className="flex items-center justify-between w-full">
            <span>{bannerMsg.text}</span>
            <button onClick={() => setBannerMsg(null)} className="text-xs font-bold underline ml-4">Dismiss</button>
          </div>
        </Alert>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm print:hidden">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center shrink-0 shadow-xs">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 leading-tight">
              User Account Management
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Provision new accounts, assign system roles, and manage association member access.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <button
            onClick={() => {
              setShowCreateModal(true);
              setCreateMsg(null);
            }}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 active:scale-95"
            title="Create new user account"
          >
            <UserPlus className="w-4 h-4" /> Create User Account
          </button>

          <button
            onClick={() => exportToPDFPrint()}
            className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs active:scale-95"
            title="Print / Export PDF"
          >
            <Printer className="w-4 h-4" /> Print PDF
          </button>

          <button
            onClick={handleExportUsersExcel}
            className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95"
            title="Export to Excel CSV"
          >
            <Download className="w-4 h-4" /> Export Excel
          </button>

          <button
            onClick={() => setShowClearModal(true)}
            className="px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-black transition-all flex items-center gap-1.5 active:scale-95"
            title="Delete all financial transaction, receipt, and statement records"
          >
            <Trash2 className="w-4 h-4 text-rose-600" /> Delete All Records
          </button>

          <button
            onClick={loadProfiles}
            disabled={loading || isPending}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold transition-all active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filters & KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition-all">
          <div className="text-[11px] text-slate-500 font-black uppercase tracking-wider">Total Registered</div>
          <div className="text-3xl font-black text-slate-900 mt-1">{visibleProfiles.length}</div>
        </div>
        <div className="p-5 rounded-2xl bg-emerald-50/80 border border-emerald-200/90 shadow-sm hover:shadow-md transition-all">
          <div className="text-[11px] text-emerald-900 font-black uppercase tracking-wider">Member Accounts</div>
          <div className="text-3xl font-black text-emerald-900 mt-1">
            {visibleProfiles.filter((p) => p.role === 'member').length}
          </div>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition-all">
          <div className="text-[11px] text-slate-500 font-black uppercase tracking-wider">Staff & Officers</div>
          <div className="text-3xl font-black text-slate-900 mt-1">
            {visibleProfiles.filter((p) => p.role !== 'member').length}
          </div>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-100 text-slate-600">
            <Filter className="w-5 h-5" />
          </div>
          <div className="space-y-1 w-full">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Filter Role</label>
            <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as UserRole | 'all')}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="member">Members</SelectItem>
                <SelectItem value="treasurer">Treasurer</SelectItem>
                <SelectItem value="auditor">Auditor</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Profiles Data Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto print:max-h-none print:overflow-visible print:overflow-x-visible">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-900 text-white text-xs font-bold uppercase tracking-wider border-b border-slate-800 sticky top-0 z-10 print:static">
              <tr>
                <th className="px-6 py-4">User Details</th>
                <th className="px-6 py-4">Assigned Role</th>
                <th className="px-6 py-4">Farm Details</th>
                <th className="px-6 py-4">Registered Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                    Loading user directory...
                  </td>
                </tr>
              ) : profiles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">
                    No matching user profiles found.
                  </td>
                </tr>
              ) : (
                visibleProfiles.map((profile) => {
                  return (
                    <tr key={profile.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{profile.full_name}</div>
                        <div className="text-xs text-slate-500 font-medium">{profile.email}</div>
                        {profile.contact_number && (
                          <div className="text-[11px] text-slate-400">{profile.contact_number}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Select value={profile.role} onValueChange={(v) => handleRoleUpdate(profile.id, v as UserRole)} disabled={isPending}>
                          <SelectTrigger className="w-[150px] capitalize">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="treasurer">Treasurer</SelectItem>
                            <SelectItem value="auditor">Auditor</SelectItem>
                            <SelectItem value="member">Member</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-6 py-4 text-xs">
                        {profile.farm_location ? (
                          <>
                            <div className="text-slate-800 font-bold">{profile.farm_location}</div>
                            <div className="text-slate-500 font-medium">{formatNumber(profile.farm_size_hectares, 1)} Ha</div>
                          </>
                        ) : (
                          <span className="text-slate-400">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                        {formatDate(profile.created_at)}
                      </td>
                      <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => {
                            setResetModalUser(profile);
                            setNewPassword('Iarms2026!');
                            setResetMsg(null);
                          }}
                          disabled={isPending}
                          title="Reset User Password"
                          className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold transition-all inline-flex items-center gap-1.5 active:scale-95"
                        >
                          <Key className="w-3.5 h-3.5 text-amber-700" /> Reset Password
                        </button>
                        <button
                          onClick={() => setDeleteModalUser(profile)}
                          disabled={isPending}
                          title="Delete User Account"
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors inline-block"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin Reset Password Modal */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200 overflow-y-auto">
          <div className="m-auto bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-800 border border-amber-200">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 leading-tight">Administrative Password Reset</h3>
                  <p className="text-xs text-slate-500 font-medium">Overriding credentials for member access</p>
                </div>
              </div>
              <button
                onClick={() => setResetModalUser(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <div className="font-extrabold text-slate-900">{resetModalUser.full_name}</div>
              <div className="text-slate-500">{resetModalUser.email} &bull; <span className="uppercase font-bold text-emerald-700">{resetModalUser.role}</span></div>
            </div>

            {resetMsg && (
              <div
                className={`p-3.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                  resetMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-rose-50 text-rose-800 border-rose-300'
                }`}
              >
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>{resetMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleConfirmResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                  Set New Temporary Password
                </label>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min. 6 characters)..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white font-mono text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setResetModalUser(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResetting}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold transition-all shadow-md active:scale-95 flex items-center gap-2"
                >
                  {isResetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                  Confirm Password Reset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Admin Create User Account Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200 overflow-y-auto">
          <div className="m-auto bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-lg w-full p-5 sm:p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 leading-tight">Create User Account</h3>
                  <p className="text-xs text-slate-500 font-medium">Provision new administrative or member access</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createMsg && (
              <div
                className={`p-3.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                  createMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-rose-50 text-rose-800 border-rose-300'
                }`}
              >
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>{createMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleCreateUserSubmit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-extrabold text-slate-700">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={createForm.fullName}
                    onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                    placeholder="e.g. Juan Dela Cruz"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-extrabold text-slate-700">Username *</label>
                  <input
                    type="text"
                    required
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="e.g. juan"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-extrabold text-slate-700">Initial Password *</label>
                  <input
                    type="text"
                    required
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-extrabold text-slate-700">System Role *</label>
                  <Select value={createForm.role} onValueChange={(v) => setCreateForm({ ...createForm, role: v as UserRole })}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="treasurer">Treasurer</SelectItem>
                      <SelectItem value="auditor">Auditor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-extrabold text-slate-700">Farm Location</label>
                  <input
                    type="text"
                    value={createForm.farmLocation}
                    onChange={(e) => setCreateForm({ ...createForm, farmLocation: e.target.value })}
                    placeholder="e.g. Zone 1, Nangurisan"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-extrabold text-slate-700">Farm Size (Hectares)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={createForm.farmSizeHectares}
                    onChange={(e) => setCreateForm({ ...createForm, farmSizeHectares: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-extrabold text-slate-700">Contact Number</label>
                <input
                  type="text"
                  value={createForm.contactNumber}
                  onChange={(e) => setCreateForm({ ...createForm, contactNumber: e.target.value })}
                  placeholder="e.g. 09171234567"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold transition-all shadow-md active:scale-95 flex items-center gap-2"
                >
                  {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clear All Records Modal */}
      <Dialog open={showClearModal} onOpenChange={setShowClearModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-rose-100 text-rose-800 border border-rose-200">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle>Delete All Financial Records?</DialogTitle>
                <DialogDescription>Purge all transactions, receipts, and FS reports</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <Alert variant="destructive">
            Warning: This action will permanently delete all collections, disbursements, uploaded receipts, and generated financial statements from the database. Registered user accounts will not be deleted.
          </Alert>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowClearModal(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleClearAllRecords}
              disabled={isClearing}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold transition-all shadow-md active:scale-95 flex items-center gap-2"
            >
              {isClearing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Yes, Delete All Records
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete User Account Modal */}
      <Dialog open={!!deleteModalUser} onOpenChange={(open) => !open && setDeleteModalUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-rose-100 text-rose-800 border border-rose-200">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle>Delete User Account?</DialogTitle>
                <DialogDescription>Permanently remove account from the system</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {deleteModalUser && (
            <div className="space-y-3">
              <Alert variant="destructive">
                Are you sure you want to permanently delete the account for <strong>{deleteModalUser.full_name}</strong> ({deleteModalUser.email})? This action cannot be undone.
              </Alert>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeleteModalUser(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteUser}
                  disabled={isPending}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold transition-all shadow-md active:scale-95 flex items-center gap-2"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Yes, Delete Account
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
