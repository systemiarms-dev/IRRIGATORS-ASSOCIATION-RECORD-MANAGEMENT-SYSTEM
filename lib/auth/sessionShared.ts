import { UserRole } from '@/types';

// Shared constants used by BOTH the edge middleware and Node server code.
// Keep this file free of any Node-only APIs (fs, crypto) so middleware can import it.

export const SESSION_COOKIE_NAME = 'iarms_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

// Fallback secret used only when IARMS_SESSION_SECRET env is not set (dev convenience).
// Set IARMS_SESSION_SECRET in .env.local for any real deployment.
export const DEV_SESSION_SECRET = 'iarms-multi-association-secret-key-2026';

export function getSessionSecret(): string {
  const secret = process.env.IARMS_SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;
  // Fail closed in production: a missing/weak secret must never mean "no auth".
  if (process.env.NODE_ENV === 'production') {
    throw new Error('IARMS_SESSION_SECRET must be set (>=32 chars) in production.');
  }
  // Dev-only convenience fallback (never used in production builds).
  return DEV_SESSION_SECRET;
}

export interface SessionPayload {
  username: string;
  email?: string | null;
  role: UserRole;
  full_name: string;
  association_id?: string | null;
  token_version: number;
  iat: number;
  exp: number;
}