/**
 * Bug Condition Exploration Test
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7**
 * 
 * CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists
 * 
 * This test verifies that the current implementation uses native fetch() instead of
 * the centralized api instance, which causes:
 * - Missing guest token headers for unauthenticated users
 * - 401 errors logged to console without redirect
 * - Guest tokens from responses not stored
 * - Manual Authorization header construction duplicates interceptor logic
 * 
 * EXPECTED OUTCOME: Test FAILS (this is correct - it proves the bug exists)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';

describe('Bug Condition Exploration: Native fetch() bypasses centralized authentication', () => {
  let originalFetch: typeof global.fetch;
  let fetchCalls: Array<{ url: string; options?: RequestInit }> = [];
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Store original fetch
    originalFetch = global.fetch;
    fetchCalls = [];
    
    // Mock fetch to track calls
    global.fetch = vi.fn(async (url: string | URL | Request, options?: RequestInit) => {
      const urlString = typeof url === 'string' ? url : url.toString();
      fetchCalls.push({ url: urlString, options });
      
      // Simulate successful response
      return {
        ok: true,
        json: async () => ({ data: [], count: 0, unreadCount: 0 }),
        status: 200,
        statusText: 'OK',
      } as Response;
    });

    // Spy on console.error
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => {
          if (key === 'ilena_token') return 'mock-jwt-token';
          return null;
        }),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    });

    // Mock window.location
    delete (window as any).location;
    window.location = { href: '' } as any;
  });

  afterEach(() => {
    // Restore original fetch
    global.fetch = originalFetch;
    consoleErrorSpy.mockRestore();
    vi.clearAllMocks();
  });

  /**
   * Property 1: Bug Condition - Native fetch() bypasses centralized authentication
   * 
   * This property tests that the four notification API functions currently use
   * native fetch() with manual Authorization headers instead of the centralized
   * api instance.
   */
  it('Property 1: refreshNotifications uses native fetch() with manual Authorization header', async () => {
    // Import the module to get access to the functions
    const { WebSocketProvider } = await import('./WebSocketContext');
    
    // We need to test the actual implementation by reading the source code
    const sourceCode = await import('fs').then(fs => 
      fs.promises.readFile(__dirname + '/WebSocketContext.tsx', 'utf-8')
    );

    // Verify refreshNotifications uses native fetch()
    const refreshNotificationsMatch = sourceCode.match(
      /const refreshNotifications = useCallback\(async \(\) => \{[\s\S]*?\}, \[.*?\]\);/
    );
    
    expect(refreshNotificationsMatch).toBeTruthy();
    const refreshNotificationsCode = refreshNotificationsMatch![0];
    
    // EXPECTED TO FAIL: The current code uses fetch() instead of api.get()
    expect(refreshNotificationsCode).toContain('api.get(');
    expect(refreshNotificationsCode).not.toContain('fetch(');
    expect(refreshNotificationsCode).not.toContain('Authorization: `Bearer ${token}`');
  });

  it('Property 1: fetchUnreadCount uses native fetch() with manual Authorization header', async () => {
    const sourceCode = await import('fs').then(fs => 
      fs.promises.readFile(__dirname + '/WebSocketContext.tsx', 'utf-8')
    );

    // Verify fetchUnreadCount uses native fetch()
    const fetchUnreadCountMatch = sourceCode.match(
      /const fetchUnreadCount = useCallback\(async \(\) => \{[\s\S]*?\}, \[.*?\]\);/
    );
    
    expect(fetchUnreadCountMatch).toBeTruthy();
    const fetchUnreadCountCode = fetchUnreadCountMatch![0];
    
    // EXPECTED TO FAIL: The current code uses fetch() instead of api.get()
    expect(fetchUnreadCountCode).toContain('api.get(');
    expect(fetchUnreadCountCode).not.toContain('fetch(');
    expect(fetchUnreadCountCode).not.toContain('Authorization: `Bearer ${token}`');
  });

  it('Property 1: markAsRead uses native fetch() with manual Authorization header', async () => {
    const sourceCode = await import('fs').then(fs => 
      fs.promises.readFile(__dirname + '/WebSocketContext.tsx', 'utf-8')
    );

    // Verify markAsRead uses native fetch()
    const markAsReadMatch = sourceCode.match(
      /const markAsRead = useCallback\(\s*async \(notificationId: number\) => \{[\s\S]*?\},\s*\[.*?\]\s*\);/
    );
    
    expect(markAsReadMatch).toBeTruthy();
    const markAsReadCode = markAsReadMatch![0];
    
    // EXPECTED TO FAIL: The current code uses fetch() instead of api.put()
    expect(markAsReadCode).toContain('api.put(');
    expect(markAsReadCode).not.toContain('fetch(');
    expect(markAsReadCode).not.toContain('Authorization: `Bearer ${token}`');
  });

  it('Property 1: markAllAsRead uses native fetch() with manual Authorization header', async () => {
    const sourceCode = await import('fs').then(fs => 
      fs.promises.readFile(__dirname + '/WebSocketContext.tsx', 'utf-8')
    );

    // Verify markAllAsRead uses native fetch()
    const markAllAsReadMatch = sourceCode.match(
      /const markAllAsRead = useCallback\(async \(\) => \{[\s\S]*?\}, \[.*?\]\);/
    );
    
    expect(markAllAsReadMatch).toBeTruthy();
    const markAllAsReadCode = markAllAsReadMatch![0];
    
    // EXPECTED TO FAIL: The current code uses fetch() instead of api.put()
    expect(markAllAsReadCode).toContain('api.put(');
    expect(markAllAsReadCode).not.toContain('fetch(');
    expect(markAllAsReadCode).not.toContain('Authorization: `Bearer ${token}`');
  });

  /**
   * Property-based test: Verify that native fetch() fails to include guest token headers
   * 
   * This test generates random scenarios where a guest user (no JWT token) makes API calls
   * and verifies that the X-Guest-Token header is NOT included (bug condition).
   */
  it('Property 1 (PBT): Native fetch() fails to include guest token headers for unauthenticated users', () => {
    fc.assert(
      fc.property(
        fc.record({
          endpoint: fc.constantFrom(
            '/api/notifications',
            '/api/notifications/unread-count',
            '/api/notifications/1/read',
            '/api/notifications/read-all'
          ),
          guestToken: fc.string({ minLength: 10, maxLength: 50 }),
        }),
        async ({ endpoint, guestToken }) => {
          // Reset fetch calls
          fetchCalls = [];
          
          // Mock localStorage to return no JWT token (guest user)
          (window.localStorage.getItem as any).mockImplementation((key: string) => {
            if (key === 'ilena_token') return null; // No JWT token
            if (key === 'guest_token') return guestToken;
            return null;
          });

          // Simulate a fetch call with manual Authorization header
          const token = localStorage.getItem('ilena_token');
          const headers: Record<string, string> = {};
          if (token) {
            headers.Authorization = `Bearer ${token}`;
          }

          await fetch(`http://localhost:5000${endpoint}`, { headers });

          // Verify that X-Guest-Token header is NOT included (bug condition)
          const lastCall = fetchCalls[fetchCalls.length - 1];
          const requestHeaders = lastCall.options?.headers as Record<string, string> || {};
          
          // EXPECTED TO FAIL: The current code does NOT include X-Guest-Token header
          expect(requestHeaders['X-Guest-Token']).toBe(guestToken);
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property-based test: Verify that 401 errors are logged to console without redirect
   * 
   * This test generates random 401 error scenarios and verifies that the current
   * implementation logs to console.error without triggering redirect logic.
   */
  it('Property 1 (PBT): Native fetch() fails to trigger centralized 401 error handling', () => {
    fc.assert(
      fc.property(
        fc.record({
          endpoint: fc.constantFrom(
            '/api/notifications',
            '/api/notifications/unread-count',
            '/api/notifications/1/read',
            '/api/notifications/read-all'
          ),
          errorMessage: fc.string({ minLength: 5, maxLength: 50 }),
        }),
        async ({ endpoint, errorMessage }) => {
          // Reset console.error spy
          consoleErrorSpy.mockClear();
          
          // Mock fetch to return 401 error
          global.fetch = vi.fn(async () => ({
            ok: false,
            status: 401,
            statusText: 'Unauthorized',
            json: async () => ({ error: errorMessage }),
          } as Response));

          // Simulate the current implementation's error handling
          try {
            const response = await fetch(`http://localhost:5000${endpoint}`, {
              headers: { Authorization: 'Bearer expired-token' },
            });
            
            if (!response.ok) {
              throw new Error('Unauthorized');
            }
          } catch (error) {
            console.error('Failed to fetch:', error);
          }

          // EXPECTED TO FAIL: The current code logs to console.error without redirect
          // After fix, this should trigger redirect to /login instead
          expect(consoleErrorSpy).toHaveBeenCalled();
          expect(window.location.href).toBe('/login');
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property-based test: Verify that guest tokens from responses are not stored
   * 
   * This test generates random API responses containing guest_token fields and
   * verifies that the current implementation does NOT store them.
   */
  it('Property 1 (PBT): Native fetch() fails to store guest tokens from API responses', () => {
    fc.assert(
      fc.property(
        fc.record({
          guestToken: fc.string({ minLength: 10, maxLength: 50 }),
          responseData: fc.array(fc.object()),
        }),
        async ({ guestToken, responseData }) => {
          // Mock fetch to return response with guest_token
          global.fetch = vi.fn(async () => ({
            ok: true,
            status: 200,
            json: async () => ({
              data: responseData,
              guest_token: guestToken,
            }),
          } as Response));

          // Simulate the current implementation
          const response = await fetch('http://localhost:5000/api/notifications');
          const data = await response.json();

          // EXPECTED TO FAIL: The current code does NOT store guest_token
          // After fix, the api instance should automatically store it
          expect(localStorage.setItem).toHaveBeenCalledWith('guest_token', guestToken);
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Static test: Verify that manual Authorization header construction duplicates interceptor logic
   * 
   * This test verifies that the current implementation manually constructs Authorization
   * headers, duplicating logic that already exists in the centralized api instance.
   */
  it('Property 1: Manual Authorization header construction duplicates interceptor logic', async () => {
    const sourceCode = await import('fs').then(fs => 
      fs.promises.readFile(__dirname + '/WebSocketContext.tsx', 'utf-8')
    );

    // Count occurrences of manual Authorization header construction
    const manualAuthHeaderPattern = /Authorization:\s*`Bearer \$\{token\}`/g;
    const matches = sourceCode.match(manualAuthHeaderPattern);
    
    // EXPECTED TO FAIL: The current code has 4 occurrences of manual header construction
    // After fix, there should be 0 occurrences (api instance handles it)
    expect(matches).toBeNull();
    
    // Verify that api instance is imported
    expect(sourceCode).toContain("import api from '@/lib/api'");
  });
});
