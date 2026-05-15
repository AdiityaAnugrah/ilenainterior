const GUEST_TOKEN_KEY = 'guest_token';

/**
 * Get guest token from localStorage
 */
export function getGuestToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(GUEST_TOKEN_KEY);
}

/**
 * Set guest token in localStorage
 */
export function setGuestToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(GUEST_TOKEN_KEY, token);
}

/**
 * Remove guest token from localStorage
 */
export function clearGuestToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(GUEST_TOKEN_KEY);
}

/**
 * Check if user is in guest mode
 */
export function isGuestMode(): boolean {
  return getGuestToken() !== null;
}
