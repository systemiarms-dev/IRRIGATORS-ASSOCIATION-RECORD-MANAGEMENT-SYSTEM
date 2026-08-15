'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { getAssociationsAction, deleteAssociationAction } from '@/app/actions/associations';
import { getSelfProfileAction } from '@/app/actions/auth';
import { Association, UserRole } from '@/types';
import AssociationFormModal from '@/components/forms/AssociationFormModal';
import { 
  Building2, PlusCircle, Pencil, Trash2, MapPin, User, Phone, 
  FileText, Shield, Layers, Users, Loader2, CheckCircle2, ArrowRight
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export default function AssociationsManagementPage() {
  const [associations, setAssociations] = useState<Association[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole>('super_admin');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingAssoc, setEditingAssoc] = useState<Association | null>(null);
  const [deleteModalAssoc, setDeleteModalAssoc] = useState<Association | null>(null);
  const [bannerMsg, setBannerMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [assocRes, selfRes] = await Promise.all([
        getAssociationsAction(),
        getSelfProfileAction(),
      ]);

      if (assocRes.success && assocRes.data) {
        const selfData = selfRes.success && selfRes.data ? selfRes.data : null;
        if (selfData && selfData.role !== 'super_admin' && selfData.association_id) {
          setAssociations(assocRes.data.filter((a) => a.id === selfData.association_id));
        } else {
          setAssociations(assocRes.data);
        }
      }
      if (selfRes.success && selfRes.data) {
        setUserRole(selfRes.data.role);
      }
    } catch (err) {
      console.error('Failed to load associations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleConfirmDelete() {
    if (!deleteModalAssoc || isDeleting) return;
    setIsDeleting(true);
    try {
      const res = await deleteAssociationAction(deleteModalAssoc.id);
      setDeleteModalAssoc(null);
      if (res.success) {
        setBannerMsg({ type: 'success', text: `Association "${deleteModalAssoc.name}" removed successfully.` });
        await loadData();
      } else {
        setBannerMsg({ type: 'error', text: res.message || 'Failed to remove association.' });
      }
    } catch (err: any) {
      setBannerMsg({ type: 'error', text: err?.message || 'Unexpected error while removing the association.' });
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center shrink-0 shadow-xs">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-extrabold border border-emerald-200">
              NIS IA Registry & Multi-Tenant Management
            </div>
            <h1 className="text-xl font-black text-slate-900 leading-tight">
              IARMS Irrigators Associations
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              National Irrigation Administration (NIA) Region 02 &mdash; Gonzaga, Cagayan
            </p>
          </div>
        </div>

        {userRole === 'super_admin' && (
          <button
            onClick={() => {
              setEditingAssoc(null);
              setShowModal(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs transition-all shadow-md flex items-center gap-2 active:scale-95 shrink-0"
          >
            <PlusCircle className="w-4 h-4" /> Register New Association
          </button>
        )}
      </div>

      {bannerMsg && (
        <div className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 border ${
          bannerMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{bannerMsg.text}</span>
        </div>
      )}

      {loading ? (
        <div className="min-h-[300px] flex flex-col items-center justify-center text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-3" />
          <span className="text-sm font-medium">Loading Irrigators Associations Registry...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {associations.map((assoc) => (
            <div
              key={assoc.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
            >
              <div className="p-5 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="space-y-1">
                    <span className="inline-block px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black tracking-wider uppercase font-mono">
                      {assoc.code}
                    </span>
                    <h2 className="text-sm font-black text-slate-900 leading-snug">
                      {assoc.name}
                    </h2>
                    {assoc.old_name && (
                      <p className="text-[11px] text-slate-500 italic">
                        Formerly: {assoc.old_name}
                      </p>
                    )}
                  </div>
                </div>

                {/* Info List */}
                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="text-slate-500">President:</span>
                    <span className="font-bold text-slate-900">{assoc.president_name}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="text-slate-500">Address:</span>
                    <span className="font-medium text-slate-800 truncate">{assoc.mailing_address}</span>
                  </div>

                  {assoc.contact_number && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="text-slate-500">Contact:</span>
                      <span className="font-mono text-slate-800">{assoc.contact_number}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                    <Shield className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="text-slate-500">SEC Reg:</span>
                    <span className="font-mono text-xs font-bold text-slate-900">{assoc.sec_registration_number}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="text-slate-500">IA TIN:</span>
                    <span className="font-mono text-xs text-slate-900">{assoc.tin_number}</span>
                  </div>
                </div>

                {/* Service Area */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
                    <div className="text-[10px] text-slate-500 font-bold uppercase">Service Area</div>
                    <div className="text-xs font-black text-slate-900">{assoc.service_area_ha} ha</div>
                    <div className="text-[9px] text-slate-500">Oper: {assoc.operational_area_ha} ha</div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
                    <div className="text-[10px] text-slate-500 font-bold uppercase">TSAGs</div>
                    <div className="text-xs font-black text-slate-900">{assoc.tsag_count}</div>
                    <div className="text-[9px] text-slate-500">{assoc.contract_type}</div>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              {userRole === 'super_admin' && (
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      setEditingAssoc(assoc);
                      setShowModal(true);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5 text-slate-600" /> Edit Profile
                  </button>

                  {associations.length > 1 && (
                    <button
                      onClick={() => setDeleteModalAssoc(assoc)}
                      className="px-2.5 py-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold flex items-center gap-1 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      <AssociationFormModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={() => {
          setBannerMsg({ type: 'success', text: 'Association saved successfully.' });
          loadData();
        }}
        associationToEdit={editingAssoc}
      />

      {/* Delete Confirmation Modal */}
      {deleteModalAssoc && (
        <Dialog open={Boolean(deleteModalAssoc)} onOpenChange={() => setDeleteModalAssoc(null)}>
          <DialogContent className="max-w-md p-6 bg-white rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-black text-rose-800">
                Confirm Association Removal
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-600 mt-2">
                Are you sure you want to remove <strong>{deleteModalAssoc.name}</strong> from the system?
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => setDeleteModalAssoc(null)}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-700 text-white hover:bg-rose-800 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {isDeleting ? 'Deleting...' : 'Delete Association'}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
