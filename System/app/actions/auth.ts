'use server';

import { localDb } from '@/lib/db/localDb';
import { ActionResponse, Profile, UserRole } from '@/types';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { issueSessionToken, getSessionUser, toPublicProfile } from '@/lib/auth/session';
import { SESSION_COOKIE_NAME } from '@/lib/auth/sessionShared';
import { verifyPassword, isValidPassword } from '@/lib/auth/password';

const LEGACY_COOKIES = ['iarms_user_email', 'iarms_user_role', 'iarms_user_name'];

export async function loginAction(formData: FormData): Promise<ActionResponse<{ role: UserRole }>> {
  const username = (formData.get('username') as string || formData.get('email') as string)?.trim();
  const password = formData.get('password') as string;

  if (!username || !password) {
    return { success: false, message: 'Username and password are required.' };
  }

  // 1. Search local offline database by username or email
  const user = localDb.getUserByEmail(username);

  // 2. Validate password against stored hash
  if (!user || !verifyPassword(password, user.password)) {
    return { success: false, message: 'Invalid username or password. Please try again.' };
  }

  // 3. Persist a signed, HttpOnly session cookie
  const token = issueSessionToken({
    email: user.email,
    role: user.role,
    full_name: user.full_name,
    token_version: user.token_version || 0,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.IARMS_COOKIE_SECURE === 'true',
  });

  // Remove any legacy plaintext cookies that were previously used
  for (const legacy of LEGACY_COOKIES) {
    cookieStore.delete(legacy);
  }

  revalidatePath('/', 'layout');
  return {
    success: true,
    message: 'Login successful.',
    data: { role: user.role }
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

  return { success: true, message: 'Profile loaded.', data: user };
}

export async function updateSelfProfileAction(formData: FormData): Promise<ActionResponse<Profile>> {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, message: 'Not authenticated.' };
  }

  const fullName = (formData.get('full_name') as string)?.trim();
  const contactNumber = (formData.get('contact_number') as string)?.trim();
  const farmLocation = (formData.get('farm_location') as string)?.trim();
  const farmSizeHectares = parseFloat((formData.get('farm_size_hectares') as string) || '0');

  if (isNaN(farmSizeHectares) || farmSizeHectares < 0) {
    return { success: false, message: 'Farm size must be a valid number greater than or equal to 0.' };
  }

  if (!fullName) {
    return { success: false, message: 'Full Name is required.' };
  }

  const updated = localDb.updateProfile(user.email, {
    full_name: fullName,
    contact_number: contactNumber || null,
    farm_location: farmLocation || null,
    farm_size_hectares: farmSizeHectares,
  });

  if (!updated) {
    return { success: false, message: 'Failed to update profile.' };
  }

  revalidatePath('/', 'layout');

  return { success: true, message: 'Profile updated successfully!', data: toPublicProfile(updated) };
}

export async function changeSelfPasswordAction(formData: FormData): Promise<ActionResponse> {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, message: 'Not authenticated.' };
  }

  const currentPassword = formData.get('current_password') as string;
  const newPassword = formData.get('new_password') as string;

  if (!isValidPassword(newPassword)) {
    return { success: false, message: 'New password must be at least 6 characters.' };
  }

  const fullUser = localDb.getUserByEmail(user.email);
  if (!fullUser) {
    return { success: false, message: 'User profile not found.' };
  }

  if (!verifyPassword(currentPassword, fullUser.password)) {
    return { success: false, message: 'Current password does not match.' };
  }

  localDb.updateUserPassword(fullUser.id, newPassword);

  return { success: true, message: 'Password changed successfully!' };
}