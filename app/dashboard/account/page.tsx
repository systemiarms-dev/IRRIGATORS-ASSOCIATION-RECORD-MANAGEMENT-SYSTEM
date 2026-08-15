'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { getSelfProfileAction, updateSelfProfileAction, changeSelfPasswordAction } from '@/app/actions/auth';
import { Profile } from '@/types';
import { getRoleBadgeProps, formatDate } from '@/lib/utils/formatters';
import { User, Lock, CheckCircle2, ShieldAlert, ShieldCheck, KeyRound, Loader2, Save, UserCheck, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { PhilippinePhoneInput, isValidPhilippineMobile } from '@/components/ui/philippine-phone-input';

export default function AccountManagementPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile Form state
  const [fullName, setFullName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [farmLocation, setFarmLocation] = useState('');
  const [farmSize, setFarmSize] = useState('0');
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSavingProfile, startSavingProfile] = useTransition();

  // Security Form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSavingPassword, startSavingPassword] = useTransition();

  async function loadProfile() {
    setLoading(true);
    try {
      const res = await getSelfProfileAction();
      if (res.success && res.data) {
        setProfile(res.data);
        setFullName(res.data.full_name || '');
        setContactNumber(res.data.contact_number || '');
        setFarmLocation(res.data.farm_location || '');
        setFarmSize(res.data.farm_size_hectares ? String(res.data.farm_size_hectares) : '0');
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileMsg(null);

    if (contactNumber.trim() && !isValidPhilippineMobile(contactNumber)) {
      setProfileMsg({ type: 'error', text: 'Mobile number must be a valid 11-digit Philippine number starting with 09.' });
      return;
    }

    const formData = new FormData();
    formData.append('full_name', fullName);
    formData.append('contact_number', contactNumber);
    formData.append('farm_location', farmLocation);
    formData.append('farm_size_hectares', farmSize);

    startSavingProfile(async () => {
      const res = await updateSelfProfileAction(formData);
      if (res.success && res.data) {
        setProfile(res.data);
        setProfileMsg({ type: 'success', text: res.message });
      } else {
        setProfileMsg({ type: 'error', text: res.message });
      }
    });
  }

  function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }

    const formData = new FormData();
    formData.append('current_password', currentPassword);
    formData.append('new_password', newPassword);

    startSavingPassword(async () => {
      const res = await changeSelfPasswordAction(formData);
      if (res.success) {
        setPasswordMsg({ type: 'success', text: res.message });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordMsg({ type: 'error', text: res.message });
      }
    });
  }

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mr-2" />
        Loading account details...
      </div>
    );
  }

  const roleProps = profile ? getRoleBadgeProps(profile.role) : { label: 'User', variant: 'amber' };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Card */}
      <Card className="bg-white/95 backdrop-blur-md">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center shrink-0 shadow-xs">
              <User className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-xl font-black text-slate-900 leading-tight">
                My Account & Profile Settings
              </CardTitle>
              <CardDescription className="mt-0.5">
                Manage personal credentials, contact info, and security credentials for your assigned role.
              </CardDescription>
            </div>
          </div>

          {profile && (
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-xs font-bold text-slate-500">Role:</span>
              <Badge variant={roleProps.variant as any} className="uppercase">
                {roleProps.label}
              </Badge>
            </div>
          )}
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: User Profile Badge & Information Form */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="bg-white/95 backdrop-blur-md">
            <CardHeader className="space-y-4 pb-4">
              <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
                <div className="w-16 h-16 rounded-full bg-[#04B358] text-white font-black text-2xl flex items-center justify-center shadow-md shrink-0">
                  {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-black text-slate-900 truncate">{profile?.full_name}</h2>
                  <div className="text-xs text-slate-600 font-extrabold flex items-center gap-1.5 mt-0.5">
                    <span className="text-slate-400 font-normal">Username:</span>
                    <span className="font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {profile?.username || 'user'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 font-mono">
                    Member Since: {profile ? formatDate(profile.created_at) : 'N/A'}
                  </div>
                </div>
              </div>

              <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2 pt-2">
                <UserCheck className="w-4 h-4 text-emerald-600" /> Personal Profile Information
              </CardTitle>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                {profileMsg && (
                  <div
                    className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                      profileMsg.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {profileMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                    <span>{profileMsg.text}</span>
                  </div>
                )}

                {profile?.role === 'super_admin' ? (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                    <p className="font-bold text-slate-800 mb-1">System Super Administrator</p>
                    <p>Super Admin accounts are managed system-wide and are not tied to a specific farm or association. To update your name or credentials, please contact the system developer.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="full_name">Full Name *</Label>
                      <Input
                        id="full_name"
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="contact_number">Mobile / Contact Number</Label>
                      <PhilippinePhoneInput
                        value={contactNumber}
                        onChange={setContactNumber}
                      />
                      <p className="text-[10px] text-slate-500 font-semibold">Philippine mobile number — 11 digits starting with 09.</p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="farm_location">Farm Sector / Location</Label>
                      <Input
                        id="farm_location"
                        type="text"
                        value={farmLocation}
                        onChange={(e) => setFarmLocation(e.target.value)}
                        placeholder="e.g. Sector 3, Main Canal"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="farm_size">Farm Size (Hectares)</Label>
                      <Input
                        id="farm_size"
                        type="number"
                        step="0.1"
                        value={farmSize}
                        onChange={(e) => setFarmSize(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                                {profile?.role !== 'super_admin' && (
                  <div className="pt-2 flex justify-end">
                    <Button type="submit" variant="emerald" disabled={isSavingProfile}>
                      {isSavingProfile ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />} Save Profile Changes
                    </Button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Security / Password Reset & Privilege Summary */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="bg-white/95 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-emerald-600" /> Security & Password Update
              </CardTitle>
            </CardHeader>

            <CardContent>
              {passwordMsg && (
                <div
                  className={`p-3 mb-4 rounded-xl text-xs font-bold flex items-center gap-2 ${
                    passwordMsg.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {passwordMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                  <span>{passwordMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="curr_pass">Current Password</Label>
                  <div className="relative flex items-center">
                    <Input
                      id="curr_pass"
                      type={showCurrentPassword ? 'text' : 'password'}
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors p-1.5 rounded-lg hover:bg-slate-200/50 flex items-center justify-center"
                      title={showCurrentPassword ? 'Hide password' : 'Show password'}
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="new_pass">New Password</Label>
                  <div className="relative flex items-center">
                    <Input
                      id="new_pass"
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors p-1.5 rounded-lg hover:bg-slate-200/50 flex items-center justify-center"
                      title={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="conf_pass">Confirm New Password</Label>
                  <div className="relative flex items-center">
                    <Input
                      id="conf_pass"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors p-1.5 rounded-lg hover:bg-slate-200/50 flex items-center justify-center"
                      title={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <Button type="submit" variant="default" disabled={isSavingPassword} className="w-full">
                    {isSavingPassword ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Lock className="w-4 h-4 mr-1" />} Update Password
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Role Privilege Overview Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-md space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Role Privilege Summary</h3>
            </div>
            <p className="text-xs text-slate-300 font-medium leading-relaxed">
              You are signed in as <strong className="text-emerald-400 uppercase">{profile?.role}</strong>. Your assigned permissions include:
            </p>
            <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside font-medium">
              {profile?.role === 'super_admin' && (
                <>
                  <li>System-wide administration across all 3 Irrigators Associations.</li>
                  <li>Association creation, registry management & officer provisioning.</li>
                  <li>Consolidated NIS irrigation statements and cross-association financial audit.</li>
                </>
              )}
              {profile?.role === 'admin' && (
                <>
                  <li>Association executive management and officer credential oversight.</li>
                  <li>Review and certified approval of FS1–FS4 comparative financial statements.</li>
                  <li>Complete financial ledger inspection & association profile editing.</li>
                </>
              )}
              {profile?.role === 'treasurer' && (
                <>
                  <li>Logging collections & official disbursement voucher entries.</li>
                  <li>Recording operational expenditures across 15 official budget line items.</li>
                  <li>Compiling and recalculating FS1–FS4 comparative financial statements.</li>
                </>
              )}
              {profile?.role === 'auditor' && (
                <>
                  <li>Verification queue: reviewing pending expense vouchers & receipt uploads.</li>
                  <li>Approving, flagging discrepancies, or rejecting disbursement logs.</li>
                  <li>Inspecting and auditing official NIA financial statements.</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
