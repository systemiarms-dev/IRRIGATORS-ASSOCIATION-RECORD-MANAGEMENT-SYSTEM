import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { Profile, PublicProfile, UserRole } from '@/types';
import { localDb } from '@/lib/db/localDb';
import { cached } from '@/lib/db/cache';
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  SessionPayload,
  getSessionSecret,
} from '@/lib/auth/sessionShared';

export const UNAUTHORIZED_RESPONSE = {
  success: false,
  message: 'Unauthorized. You do not have permission to perform this action.',
};

export function b64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input).toString('base64url');
}

export function b64UrlDecode(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8');
}

function signPayload(payloadB64: string, secret: string): string {
  return createHmac('sha256', secret).update(payloadB64).digest('base64url');
}

export function issueSessionToken(payload: Omit<SessionPayload, 'iat' | 'exp'>): string {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: SessionPayload = {
    ...payload,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };
  const payloadB64 = b64UrlEncode(JSON.stringify(fullPayload));
  const sig = signPayload(payloadB64, getSessionSecret());
  return `${payloadB64}.${sig}`;
}

export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;
  const expected = Buffer.from(signPayload(payloadB64, getSessionSecret()), 'base64url');
  const actual = Buffer.from(sigB64, 'base64url');
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return null;
  }
  try {
    const payload = JSON.parse(b64UrlDecode(payloadB64)) as SessionPayload;
    if (typeof payload.exp !== 'number' || payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function toPublicProfile(user: Profile): PublicProfile {
  const { password: _removed, ...publicUser } = user;
  return publicUser;
}

/**
 * Resolve the current authenticated user from the session cookie,
 * verifying identity directly against Supabase Cloud database.
 */
export async function getSessionUser(): Promise<PublicProfile | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = verifySessionToken(token);
  if (!payload) return null;

  const username = payload.username || payload.email;
  if (!username) return null;

  try {
    const cachedUser = await cached(`s:${username.toLowerCase()}`, async () => {
      const user = await localDb.getUserByUsername(username);
      if (!user) return null;
      const { password: _removed, ...safe } = user;
      return safe as PublicProfile;
    }, 15_000);

    if (!cachedUser) return null;

    // A password change bumps token_version, revoking all previously issued sessions.
    if ((payload.token_version ?? 0) !== (cachedUser.token_version ?? 0)) return null;

    return cachedUser;
  } catch {
    return null;
  }
}

/**
 * Require an authenticated user.
 */
export async function requireUser(): Promise<PublicProfile | null> {
  return getSessionUser();
}

/**
 * Require an authenticated user with one of the given roles.
 * Super Admin inherits all management permissions.
 */
export async function requireRole(...roles: UserRole[]): Promise<PublicProfile | null> {
  const user = await getSessionUser();
  if (!user) return null;
  if (user.role === 'super_admin' || roles.includes(user.role)) return user;
  return null;
}

/**
 * Require specifically Super Admin role.
 */
export async function requireSuperAdmin(): Promise<PublicProfile | null> {
  const user = await getSessionUser();
  if (!user || user.role !== 'super_admin') return null;
  return user;
}