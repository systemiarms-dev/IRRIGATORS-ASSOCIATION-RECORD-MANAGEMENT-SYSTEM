'use client';

import React, { useState } from 'react';
import { createAssociationAction, updateAssociationAction } from '@/app/actions/associations';
import { Association } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PhilippinePhoneInput, isValidPhilippineMobile } from '@/components/ui/philippine-phone-input';
import { Building2, Save, Loader2, MapPin, User, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

interface AssociationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  associationToEdit?: Association | null;
}

export default function AssociationFormModal({
  isOpen,
  onClose,
  onSuccess,
  associationToEdit,
}: AssociationFormModalProps) {
  const isEditing = Boolean(associationToEdit);

  const [name, setName] = useState(associationToEdit?.name || '');
  const [code, setCode] = useState(associationToEdit?.code || '');
  const [oldName, setOldName] = useState(associationToEdit?.old_name || '');
  const [mailingAddress, setMailingAddress] = useState(associationToEdit?.mailing_address || 'Sta. Cruz, Gonzaga, Cagayan');
  const [presidentName, setPresidentName] = useState(associationToEdit?.president_name || '');
  const [contactNumber, setContactNumber] = useState(associationToEdit?.contact_number || '');
  const [secRegNo, setSecRegNo] = useState(associationToEdit?.sec_registration_number || '');
  const [tinNumber, setTinNumber] = useState(associationToEdit?.tin_number || '');
  const [serviceAreaHa, setServiceAreaHa] = useState(associationToEdit ? String(associationToEdit.service_area_ha) : '0');
  const [operationalAreaHa, setOperationalAreaHa] = useState(associationToEdit ? String(associationToEdit.operational_area_ha) : '0');
  const [tsagCount, setTsagCount] = useState(associationToEdit ? String(associationToEdit.tsag_count) : '1');
  const [contractType, setContractType] = useState(associationToEdit?.contract_type || 'Modified IMT Contract');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  React.useEffect(() => {
    if (associationToEdit) {
      setName(associationToEdit.name);
      setCode(associationToEdit.code);
      setOldName(associationToEdit.old_name || '');
      setMailingAddress(associationToEdit.mailing_address);
      setPresidentName(associationToEdit.president_name);
      setContactNumber(associationToEdit.contact_number || '');
      setSecRegNo(associationToEdit.sec_registration_number);
      setTinNumber(associationToEdit.tin_number);
      setServiceAreaHa(String(associationToEdit.service_area_ha));
      setOperationalAreaHa(String(associationToEdit.operational_area_ha));
      setTsagCount(String(associationToEdit.tsag_count));
      setContractType(associationToEdit.contract_type || 'Modified IMT Contract');
    } else {
      setName('');
      setCode('');
      setOldName('');
      setMailingAddress('Sta. Cruz, Gonzaga, Cagayan');
      setPresidentName('');
      setContactNumber('');
      setSecRegNo('');
      setTinNumber('');
      setServiceAreaHa('0');
      setOperationalAreaHa('0');
      setTsagCount('1');
      setContractType('Modified IMT Contract');
    }
  }, [associationToEdit, isOpen]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (contactNumber.trim() && !isValidPhilippineMobile(contactNumber)) {
      setErrorMsg('Contact number must be a valid 11-digit Philippine number starting with 09.');
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append('name', name);
    formData.append('code', code);
    formData.append('old_name', oldName);
    formData.append('mailing_address', mailingAddress);
    formData.append('president_name', presidentName);
    formData.append('contact_number', contactNumber);
    formData.append('sec_registration_number', secRegNo);
    formData.append('tin_number', tinNumber);
    formData.append('service_area_ha', serviceAreaHa);
    formData.append('operational_area_ha', operationalAreaHa);
    formData.append('tsag_count', tsagCount);
    formData.append('contract_type', contractType);

    let res;
    if (isEditing && associationToEdit) {
      res = await updateAssociationAction(associationToEdit.id, formData);
    } else {
      res = await createAssociationAction(formData);
    }

    setLoading(false);

    if (res.success) {
      onSuccess();
      onClose();
    } else {
      setErrorMsg(res.message || 'Failed to save association.');
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 bg-white rounded-2xl">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black text-slate-900">
                {isEditing ? 'Edit Irrigators Association Profile' : 'Register New Irrigators Association'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                National Irrigation Administration (NIA) NIS IA Profile Registry — Region 02
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Basic IA Identification */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-bold text-slate-700">Official Association Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Nangurisan Laya Farmers Irrigators Association, Inc."
                className="w-full px-3 py-2 text-xs border rounded-xl border-slate-300 focus:outline-emerald-600"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Short Code (Acronym) *</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. NLFIA"
                className="w-full px-3 py-2 text-xs border rounded-xl border-slate-300 focus:outline-emerald-600 font-mono font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Old / Former Name of IA (Optional)</label>
              <input
                type="text"
                value={oldName}
                onChange={(e) => setOldName(e.target.value)}
                placeholder="e.g. Nangurisan/Baraikbak IA Inc."
                className="w-full px-3 py-2 text-xs border rounded-xl border-slate-300 focus:outline-emerald-600"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Mailing Address *</label>
              <input
                type="text"
                required
                value={mailingAddress}
                onChange={(e) => setMailingAddress(e.target.value)}
                placeholder="e.g. Sta. Cruz, Gonzaga, Cagayan"
                className="w-full px-3 py-2 text-xs border rounded-xl border-slate-300 focus:outline-emerald-600"
              />
            </div>
          </div>

          {/* Officers & Regulatory */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
              Leadership & Government Registry
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">President Name *</label>
                <input
                  type="text"
                  required
                  value={presidentName}
                  onChange={(e) => setPresidentName(e.target.value)}
                  placeholder="e.g. Meynard A. Tomaneng"
                  className="w-full px-3 py-2 text-xs border rounded-xl border-slate-300 bg-white focus:outline-emerald-600"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">SEC Registration No. *</label>
                <input
                  type="text"
                  required
                  value={secRegNo}
                  onChange={(e) => setSecRegNo(e.target.value)}
                  placeholder="e.g. CN202060557"
                  className="w-full px-3 py-2 text-xs border rounded-xl border-slate-300 bg-white font-mono focus:outline-emerald-600"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">IA TIN *</label>
                <input
                  type="text"
                  required
                  value={tinNumber}
                  onChange={(e) => setTinNumber(e.target.value)}
                  placeholder="e.g. 769-207-601-000"
                  className="w-full px-3 py-2 text-xs border rounded-xl border-slate-300 bg-white font-mono focus:outline-emerald-600"
                />
              </div>
            </div>
            <div className="space-y-1 pt-1">
              <label className="text-xs font-bold text-slate-700">Contact Number</label>
              <PhilippinePhoneInput value={contactNumber} onChange={setContactNumber} />
              <p className="text-[10px] text-slate-500 font-semibold">Philippine mobile number — 11 digits starting with 09.</p>
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
              Irrigation Coverage & Contracts
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Service Area (ha)</label>
                <input
                  type="number"
                  step="0.0001"
                  value={serviceAreaHa}
                  onChange={(e) => setServiceAreaHa(e.target.value)}
                  className="w-full px-3 py-2 text-xs border rounded-xl border-slate-300 bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Operational Area (ha)</label>
                <input
                  type="number"
                  step="0.0001"
                  value={operationalAreaHa}
                  onChange={(e) => setOperationalAreaHa(e.target.value)}
                  className="w-full px-3 py-2 text-xs border rounded-xl border-slate-300 bg-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">No. of TSAGs</label>
                <input
                  type="number"
                  value={tsagCount}
                  onChange={(e) => setTsagCount(e.target.value)}
                  className="w-full px-3 py-2 text-xs border rounded-xl border-slate-300 bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">IMT Contract Type</label>
                <input
                  type="text"
                  value={contractType}
                  onChange={(e) => setContractType(e.target.value)}
                  className="w-full px-3 py-2 text-xs border rounded-xl border-slate-300 bg-white"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 flex items-center gap-2 shadow-md active:scale-95 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isEditing ? 'Save Changes' : 'Create Association'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
