/**
 * Simple in-memory login rate limiter / brute-force protection.
 * Suitable for single-process production (npm start). For multi-instance
 * deployments swap this for a shared store (Redis etc.).
 */

const MAX_FAILURES = 5;
const LOCK_MS = 60 * 1000;

type Entry = { failures: number; lockedUntil: number };

const store = new Map<string, Entry>();

function cleanup() {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.lockedUntil > 0 && now > entry.lockedUntil) store.delete(key);
  }
}

export function checkLoginLockout(key: string): { locked: boolean; remainingMs: number } {
  cleanup();
  const entry = store.get(key);
  if (!entry) return { locked: false, remainingMs: 0 };
  const remainingMs = entry.lockedUntil - Date.now();
  if (remainingMs > 0) return { locked: true, remainingMs };
  store.delete(key);
  return { locked: false, remainingMs: 0 };
}

export function recordLoginFailure(key: string): number {
  cleanup();
  const entry = store.get(key) || { failures: 0, lockedUntil: 0 };
  entry.failures += 1;
  if (entry.failures >= MAX_FAILURES) {
    entry.lockedUntil = Date.now() + LOCK_MS;
    entry.failures = 0;
  }
  store.set(key, entry);
  return entry.lockedUntil > 0 ? entry.failures : entry.failures;
}

export function clearLoginLockout(key: string) {
  store.delete(key);
}