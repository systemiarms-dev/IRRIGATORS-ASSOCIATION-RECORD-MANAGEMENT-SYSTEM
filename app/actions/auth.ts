'use server';

import { localDb } from '@/lib/db/localDb';
import { ActionResponse, Profile, UserRole } from '@/types';
import { revalidatePath } from 'next/cache';
import { cookies, headers } from 'next/headers';
import { issueSessionToken, getSessionUser, toPublicProfile } from '@/lib/auth/session';
import { SESSION_COOKIE_NAME } from '@/lib/auth/sessionShared';
import { verifyPasswordAsync, isValidPassword } from '@/lib/auth/password';
import { checkLoginLockout, recordLoginFailure, clearLoginLockout } from '@/lib/auth/ratelimit';
import { isValidPhilippineMobile, normalizePhilippineMobile } from '@/lib/utils/phone';

const LEGACY_COOKIES = ['iarms_user_email', 'iarms_user_role', 'iarms_user_name'];

export async function loginAction(formData: FormData): Promise<ActionResponse<{ role: UserRole; association_id?: string | null }>> {
  const username = (formData.get('username') as string)?.trim();
  const password = formData.get('password') as string;

  if (!username || !password) {
    return { success: false, message: 'Username and password are required.' };
  }

  // Anti brute-force: lock per (username + client IP) after repeated failures.
  const forwarded = (await headers()).get('x-forwarded-for');
  const clientIp = forwarded?.split(',')[0]?.trim() || 'local';
  const lockKey = `${username.toLowerCase()}:${clientIp}`;
  const lock = checkLoginLockout(lockKey);
  if (lock.locked) {
    return {
      success: false,
      message: `Too many failed attempts. Try again in ${Math.ceil(lock.remainingMs / 1000)} second(s).`,
    };
  }

  // 1. Search Supabase Cloud database directly
  let user: Profile | undefined;
  try {
    user = await localDb.getUserAuthByUsername(username);
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Database connection error. Please ensure Supabase credentials are configured in .env.local',
    };
  }

  // 2. Validate password against stored scrypt hash (async to avoid blocking the event loop)
  if (!user || !(await verifyPasswordAsync(password, user.password))) {
    recordLoginFailure(lockKey);
    return { success: false, message: 'Invalid username or password. Please try again.' };
  }

  clearLoginLockout(lockKey);

  // 3. Persist signed HttpOnly session cookie
  const token = issueSessionToken({
    username: user.username || user.id,
    role: user.role,
    full_name: user.full_name,
    association_id: user.association_id || null,
    token_version: user.token_version || 0,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    // Secured by default in production builds; only opt out explicitly.
    secure: process.env.NODE_ENV === 'production' ? process.env.IARMS_COOKIE_SECURE !== 'false' : false,
  });

  for (const legacy of LEGACY_COOKIES) {
    cookieStore.delete(legacy);
  }

  revalidatePath('/', 'layout');
  return {
    success: true,
    message: 'Login successful.',
    data: { role: user.role, association_id: user.association_id }
  };
}

export async function signOutAction(): Promise<ActionResponse> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  for (const legacy of LEGACY_COOKIES) {
    cookieStore.delete(legacy);
  }

  revalidatePath('/', 'layout');
  return { success: true, message: 'Signed out successfully.' };
}

export async function getSelfProfileAction(): Promise<ActionResponse<Profile>> {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, message: 'Not authenticated.' };
  }

  return { success: true, message: 'Profile loaded.', data: user as Profile };
}

export async function updateSelfProfileAction(formData: FormData): Promise<ActionResponse<Profile>> {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, message: 'Not authenticated.' };
  }

  const fullName = (formData.get('full_name') as string)?.trim();
  const contactNumber = normalizePhilippineMobile((formData.get('contact_number') as string)?.trim() || '');
  const farmLocation = (formData.get('farm_location') as string)?.trim();
  const farmSizeHectares = parseFloat((formData.get('farm_size_hectares') as string) || '0');

  if (isNaN(farmSizeHectares) || farmSizeHectares < 0) {
    return { success: false, message: 'Farm size must be a valid number greater than or equal to 0.' };
  }

  if (contactNumber && !isValidPhilippineMobile(contactNumber)) {
    return { success: false, message: 'Mobile number must be a valid 11-digit Philippine number starting with 09.' };
  }

  if (!fullName) {
    return { success: false, message: 'Full Name is required.' };
  }

  const updated = await localDb.updateProfile(user.username || '', {
    full_name: fullName,
    contact_number: normalizePhilippineMobile(contactNumber) || null,
    farm_location: farmLocation || null,
    farm_size_hectares: farmSizeHectares,
  });

  if (!updated) {
    return { success: false, message: 'Could not update profile.' };
  }

  revalidatePath('/dashboard/account');
  return { success: true, message: 'Profile details updated.', data: toPublicProfile(updated) as Profile };
}

export async function updatePasswordAction(formData: FormData): Promise<ActionResponse> {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, message: 'Not authenticated.' };
  }

  const currentPassword = formData.get('current_password') as string;
  const newPassword = formData.get('new_password') as string;
  const confirmPassword = formData.get('confirm_password') as string;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { success: false, message: 'All password fields are required.' };
  }

  if (newPassword !== confirmPassword) {
    return { success: false, message: 'New password and confirmation do not match.' };
  }

  if (!isValidPassword(newPassword)) {
    return { success: false, message: 'New password must be at least 6 characters long.' };
  }

  const fullUser = await localDb.getUserAuthById(user.id);
  if (!fullUser || !(await verifyPasswordAsync(currentPassword, fullUser.password))) {
    return { success: false, message: 'Current password is incorrect.' };
  }

  await localDb.updateUserPassword(user.id, newPassword);

  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);

  return { success: true, message: 'Password changed successfully. Please log in again.' };
}

export { updatePasswordAction as changeSelfPasswordAction };