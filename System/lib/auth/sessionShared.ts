import { UserRole } from '@/types';

// Shared constants used by BOTH the edge middleware and Node server code.
// Keep this file free of any Node-only APIs (fs, crypto) so middleware can import it.

export const SESSION_COOKIE_NAME = 'iarms_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 24;

// Fallback secret used only when IARMS_SESSION_SECRET env is not set (dev convenience).
// Set IARMS_SESSION_SECRET in .env.local for any real deployment.
export const DEV_SESSION_SECRET = 'iarms-local-dev-secret-change-me';

export function getSessionSecret(): string {
  return process.env.IARMS_SESSION_SECRET || DEV_SESSION_SECRET;
}

export interface SessionPayload {
  email: string;
  role: UserRole;
  full_name: string;
  token_version: number;
  iat: number;
  exp: number;
}