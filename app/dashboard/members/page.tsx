'use client';

import React, { useCallback, useState } from 'react';
import { useLoadOnce } from '@/lib/hooks/useLoadOnce';
import { getMembersAction, createMemberAction, updateMemberAction, deleteMemberAction } from '@/app/actions/members';
import { getAssociationsAction } from '@/app/actions/associations';
import { getSelfProfileAction } from '@/app/actions/auth';
import { Profile, UserRole, Association } from '@/types';
import { formatDate } from '@/lib/utils/formatters';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Users, PlusCircle, Loader2, Trash2, Pencil, Building2, UserRound, MapPin, Phone, RefreshCw, ChevronUp, ChevronDown } from 'lucide-react';
import { PhilippinePhoneInput } from '@/components/ui/philippine-phone-input';

export default function MembersPage() {
  const [members, setMembers] = useState<Profile[]>([]);
  const [associations, setAssociations] = useState<Association[]>([]);
  const [selectedAssocId, setSelectedAssocId] = useState<string>('all');
  const [userRole, setUserRole] = useState<UserRole>('admin');
  const [userAssocId, setUserAssocId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState<Profile | null>(null);
  const [deleteMember, setDeleteMember] = useState<Profile | null>(null);
  const [bannerMsg, setBannerMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formName, setFormName] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formFarmSize, setFormFarmSize] = useState('');
  const [formContact, setFormContact] = useState('');
  const [formAssocId, setFormAssocId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [memRes, assocRes, selfRes] = await Promise.all([
        getMembersAction(selectedAssocId),
        getAssociationsAction(),
        getSelfProfileAction(),
      ]);
      if (memRes.success && memRes.data) setMembers(memRes.data);
      if (assocRes.success && assocRes.data) setAssociations(assocRes.data);
      if (selfRes.success && selfRes.data) {
        setUserRole(selfRes.data.role);
        if (selfRes.data.association_id) setUserAssocId(selfRes.data.association_id);
        if (selfRes.data.role !== 'super_admin' && selfRes.data.association_id) {
          setSelectedAssocId(selfRes.data.association_id);
        }
      }
    } catch (err) {
      console.error('Failed to load farmer members:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedAssocId]);

  useLoadOnce(loadData);

  function openCreateModal() {
    setEditingMember(null);
    setFormName('');
    setFormLocation('');
    setFormFarmSize('');
    setFormContact('');
    setFormAssocId(userRole === 'super_admin' ? (selectedAssocId !== 'all' ? selectedAssocId : '') : (userAssocId || ''));
    setFormError(null);
    setShowModal(true);
  }

  function bumpFarmSize(delta: number) {
    const current = parseFloat(formFarmSize) || 0;
    const next = Math.max(0, Math.round((current + delta) * 100) / 100);
    setFormFarmSize(String(next));
  }

  function openEditModal(member: Profile) {
    setEditingMember(member);
    setFormName(member.full_name);
    setFormLocation(member.farm_location || '');
    setFormFarmSize(member.farm_size_hectares ? String(member.farm_size_hectares) : '');
    setFormContact(member.contact_number || '');
    setFormAssocId(member.association_id || '');
    setFormError(null);
    setShowModal(true);
  }

  async function handleSaveMember(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setIsSaving(true);

    try {
      const formData = new FormData();
      formData.append('full_name', formName);
      formData.append('farm_location', formLocation);
      formData.append('farm_size_hectares', formFarmSize || '0');
      formData.append('contact_number', formContact);
      if (userRole === 'super_admin') formData.append('association_id', formAssocId);

      const res = editingMember
        ? await updateMemberAction(editingMember.id, formData)
        : await createMemberAction(formData);

      if (!res.success) {
        setFormError(res.message);
        return;
      }
      setShowModal(false);
      setBannerMsg({ type: 'success', text: res.message });
      loadData();
    } catch (err: any) {
      setFormError(err?.message || 'Unexpected error while saving the farmer member.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteMember() {
    if (!deleteMember || isDeleting) return;
    setIsDeleting(true);
    try {
      const res = await deleteMemberAction(deleteMember.id);
      setBannerMsg(res.success
        ? { type: 'success', text: res.message }
        : { type: 'error', text: res.message });
      if (res.success) {
        setDeleteMember(null);
        loadData();
      }
    } catch (err: any) {
      setBannerMsg({ type: 'error', text: err?.message || 'Unexpected error while removing the farmer member.' });
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Association Selector Strip for Super Admin */}
      {userRole === 'super_admin' && (
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold text-slate-700">Scope Members by Association:</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setSelectedAssocId('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedAssocId === 'all' ? 'bg-emerald-800 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All Associations
            </button>
            {associations.map((assoc) => (
              <button
                key={assoc.id}
                onClick={() => setSelectedAssocId(assoc.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedAssocId === assoc.id ? 'bg-emerald-800 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {assoc.code}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center shrink-0 shadow-xs">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-extrabold border border-emerald-200">
              Farmer Member Registry
            </div>
            <h1 className="text-xl font-black text-slate-900 leading-tight">Farmer Members</h1>
            <p className="text-xs text-slate-500 font-medium">
              Maintain the member registry for this Irrigators Association. Members are selectable as payers when logging collections.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs transition-all shadow-md flex items-center gap-2 active:scale-95"
          >
            <PlusCircle className="w-4 h-4" /> Register Farmer Member
          </button>
          <button
            onClick={() => loadData()}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-300 text-slate-600 hover:bg-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {bannerMsg && (
        <div className={`p-4 rounded-xl text-xs font-bold border flex items-center gap-2 ${
          bannerMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <span>{bannerMsg.text}</span>
        </div>
      )}

      {/* Members Grid */}
      {loading ? (
        <div className="min-h-[300px] flex flex-col items-center justify-center text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-3" />
          <span className="text-xs font-medium">Loading farmer members...</span>
        </div>
      ) : members.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center text-slate-500 space-y-2">
          <Users className="w-10 h-10 mx-auto text-slate-300" />
          <div className="text-sm font-bold">No farmer members registered yet.</div>
          <p className="text-xs text-slate-400">Click &ldquo;Register Farmer Member&rdquo; to add members to this association&rsquo;s registry.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((member) => (
            <div key={member.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-xs shrink-0">
                    {member.full_name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black text-slate-900 truncate">{member.full_name}</div>
                    <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                      <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                        {member.association?.code || 'IA'}
                      </span>
                      <span>Member</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEditModal(member)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                    title="Edit Member"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteMember(member)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Remove Member"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 text-[11px] text-slate-600">
                {member.farm_location && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{member.farm_location}</span>
                  </div>
                )}
                {member.farm_size_hectares > 0 && (
                  <div className="flex items-center gap-1.5">
                    <UserRound className="w-3 h-3 text-slate-400 shrink-0" />
                    <span><strong>{member.farm_size_hectares}</strong> ha farm area</span>
                  </div>
                )}
                {member.contact_number && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{member.contact_number}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-slate-400">
                  <UserRound className="w-3 h-3 shrink-0" />
                  <span>Registered {formatDate(member.created_at)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Member Modal */}
      <Dialog open={showModal} onOpenChange={(open) => { if (!open && !isSaving) setShowModal(false); }}>
        <DialogContent className="max-w-md p-5 bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-emerald-900">
              {editingMember ? 'Edit Farmer Member' : 'Register Farmer Member'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {editingMember
                ? 'Update the registry details of this farmer member.'
                : 'Add a farmer member to this association\'s registry. They will be selectable as a payer when logging collections.'}
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {formError}
            </div>
          )}

          <form onSubmit={handleSaveMember} className="space-y-3 pt-2">
            {userRole === 'super_admin' && !editingMember && (
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">Target Irrigators Association *</label>
                <select
                  value={formAssocId}
                  onChange={(e) => setFormAssocId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                >
                  <option value="">-- Select an Irrigation Association --</option>
                  {associations.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} ({a.code})</option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600">Full Name *</label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Juan Dela Cruz"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">Farm Location / Sector</label>
                <input
                  type="text"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  placeholder="e.g. Danak Lateral, Zone 1"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">Farm Size (hectares)</label>
                <div className="flex items-stretch rounded-lg border border-slate-300 bg-white focus-within:ring-2 focus-within:ring-emerald-300 overflow-hidden">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formFarmSize}
                    onChange={(e) => setFormFarmSize(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 text-xs text-slate-800 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <div className="flex flex-col border-l border-slate-200 shrink-0">
                    <button
                      type="button"
                      onClick={() => bumpFarmSize(0.25)}
                      disabled={isSaving}
                      className="px-2 py-0.5 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700 transition-colors disabled:opacity-40"
                      aria-label="Increase farm size"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <div className="h-px bg-slate-200" />
                    <button
                      type="button"
                      onClick={() => bumpFarmSize(-0.25)}
                      disabled={isSaving}
                      className="px-2 py-0.5 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700 transition-colors disabled:opacity-40"
                      aria-label="Decrease farm size"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600">Mobile Number</label>
              <PhilippinePhoneInput
                value={formContact}
                onChange={setFormContact}
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                disabled={isSaving}
                className="px-4 py-2 text-xs font-bold rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving || (userRole === 'super_admin' && !editingMember && !formAssocId)}
                className="px-5 py-2 text-xs font-bold rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white shadow-md active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                {isSaving ? 'Saving...' : (editingMember ? 'Save Changes' : 'Register Member')}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={Boolean(deleteMember)} onOpenChange={() => setDeleteMember(null)}>
        <DialogContent className="max-w-md p-6 bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-rose-800">Remove Farmer Member</DialogTitle>
            <DialogDescription className="text-xs text-slate-600 mt-2">
              Are you sure you want to remove <strong>{deleteMember?.full_name}</strong> from the farmer member registry?
              Existing transactions linked to this member will keep their records.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => setDeleteMember(null)}
              disabled={isDeleting}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteMember}
              disabled={isDeleting}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-700 text-white hover:bg-rose-800 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {isDeleting ? 'Removing...' : 'Remove Member'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}