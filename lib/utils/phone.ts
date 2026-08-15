/**
 * Philippine mobile number helpers.
 * Valid numbers: exactly 11 digits, starting with "09" (no +63 country code).
 */
export function isValidPhilippineMobile(value: string): boolean {
  return /^09\d{9}$/.test(value.replace(/\D/g, ''));
}

export function normalizePhilippineMobile(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Normalizes a stored/legacy number to the 09xxxxxxxxx (11-digit) form.
 * Converts legacy "+63 917 123 4567" or "639171234567" inputs to "09171234567";
 * numbers already in 09 form are left unchanged.
 */
export function normalizeStoredPhilippineMobile(value?: string | null): string | null {
  if (!value) return null;
  let digits = value.replace(/[^\d]/g, '');
  if (digits.startsWith('63') && digits.length >= 12) {
    // 63xxx... -> 09xxxx... (drop country code, prepend 0)
    digits = '0' + digits.slice(2, 12);
  }
  if (/^09\d{9}$/.test(digits)) return digits;
  return digits || null;
}