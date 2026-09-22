import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const PREFIX = 'scrypt$';
const KEY_LEN = 64;
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 } as const;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, KEY_LEN, SCRYPT_PARAMS);
  return `${PREFIX}${salt}$${derived.toString('hex')}`;
}

export function isHashedPassword(stored: string | null | undefined): boolean {
  return typeof stored === 'string' && stored.startsWith(PREFIX) && stored.split('$').length === 3;
}

export function verifyPassword(password: string, stored: string | null | undefined): boolean {
  if (!isHashedPassword(stored)) return false;
  const parts = (stored as string).split('$');
  const salt = parts[1];
  const expected = Buffer.from(parts[2], 'hex');
  const derived = scryptSync(password, salt, KEY_LEN, SCRYPT_PARAMS);
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

export function isValidPassword(password: string): boolean {
  return typeof password === 'string' && password.length >= 6;
}