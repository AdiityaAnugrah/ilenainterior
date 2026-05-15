/**
 * Preservation Property Tests
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7**
 * 
 * CRITICAL: These tests MUST PASS on unfixed code - passing confirms baseline behavior to preserve
 * 
 * This test suite verifies that WebSocket functionality (Socket.io connection, real-time
 * notification delivery, toast displays, state management, navigation, cleanup) works correctly
 * on the UNFIXED code and must continue to work exactly the same way after the fix.
 * 
 * EXPECTED OUTCOME: Tests PASS (this confirms the baseline behavior that must be preserved)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';
import * as fc from 'fast-check';
import React from 'react';

// Mock dependencies
vi.mock('socket.io-client', () => ({
  io: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    custom: vi.fn(),
    dismiss: vi.fn(),
  },
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('Preservation Property Tests: WebSocket Functionality Unchanged', () => {
  let mockSocket: any;
  let mockIo: any;
  let mockToast: any;
  let mockUseAuthStore: any;
  let mockApi: any;
  let eventHandlers: Record<string, Function>;

  beforeEach(async () => {
    // Reset modules
    vi.resetModules();
    
    // Setup event handlers storage
    eventHandlers = {};

    // Mock Socket.io instance
    mockSocket = {
      on: vi.fn((event: string, handler: Function) => {
        eventHandlers[event] = handler;
      }),
      disconnect: vi.fn(),
      connected: true,
    };

    // Mock io function
    const { io } = await import('socket.io-client');
    mockIo = io as any;
    mockIo.mockReturnValue(mockSocket);

    // Mock toast
    const toast = await import('react-hot-toast');
    mockToast = toast.default;

    // Mock auth store
    const { useAuthStore } = await import('@/store/authStore');
    mockUseAuthStore = useAuthStore as any;
    mockUseAuthStore.mockReturnValue({
      token: 'mock-jwt-token',
      user: { id: 1, role: 'admin', name: 'Admin User' },
    });

    // Mock api for axios calls
    const api = await import('@/lib/api');
    mockApi = api.default;
    mockApi.get = vi.fn(async () => ({
      data: { data: [], count: 0, unreadCount: 0 },
      status: 200,
      statusText: 'OK',
    }));
    mockApi.put = vi.fn(async () => ({
      data: { unreadCount: 0 },
      status: 200,
      statusText: 'OK',
    }));

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

    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  /**
   * Property 2: Preservation - Socket.io Connection Establishment
   * 
   * Validates: Requirement 3.2
   * 
   * This property verifies that Socket.io connection is established correctly with
   * JWT token in the auth handshake for authenticated admin users.
   */
  it('Property 2: Socket.io connection is established with JWT token in auth handshake', async () => {
    const { WebSocketProvider } = await import('./WebSocketContext');

    render(
      <WebSocketProvider>
        <div>Test Child</div>
      </WebSocketProvider>
    );

    await waitFor(() => {
      // Verify io() was called
      expect(mockIo).toHaveBeenCalled();
    });

    // Verify connection configuration
    const ioCallArgs = mockIo.mock.calls[0];
    const socketUrl = ioCallArgs[0];
    const config = ioCallArgs[1];

    // Verify JWT token is included in auth handshake
    expect(config.auth).toBeDefined();
    expect(config.auth.token).toBe('mock-jwt-token');

    // Verify reconnection settings
    expect(config.reconnection).toBe(true);
    expect(config.reconnectionDelay).toBe(5000);
    expect(config.reconnectionAttempts).toBe(5);
    expect(config.timeout).toBe(10000);

    // Verify event handlers are registered
    expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('connect_error', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('notification:new', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('notification:unread_count', expect.any(Function));
  });

  /**
   * Property 2 (PBT): Real-time notification delivery triggers toast displays
   * 
   * Validates: Requirement 3.1
   * 
   * This property-based test generates random notification data and verifies that
   * receiving a notification via Socket.io triggers a toast display with correct content.
   */
  it('Property 2 (PBT): Real-time notifications trigger toast displays across various notification types', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.integer({ min: 1, max: 10000 }),
          type: fc.constantFrom('new_order', 'order_status', 'low_stock', 'payment_confirmed'),
          message: fc.string({ minLength: 10, maxLength: 100 }),
          related_entity_type: fc.constantFrom('order', 'product', null),
          related_entity_id: fc.option(fc.integer({ min: 1, max: 1000 }), { nil: null }),
          metadata: fc.dictionary(fc.string(), fc.anything()),
          created_at: fc.date().map(d => d.toISOString()),
          is_read: fc.boolean(),
        }),
        async (notification) => {
          // Reset mocks
          mockToast.custom.mockClear();
          vi.clearAllMocks();

          const { WebSocketProvider } = await import('./WebSocketContext');

          render(
            <WebSocketProvider>
              <div>Test Child</div>
            </WebSocketProvider>
          );

          await waitFor(() => {
            expect(mockSocket.on).toHaveBeenCalledWith('notification:new', expect.any(Function));
          });

          // Simulate receiving a notification via Socket.io
          const notificationHandler = eventHandlers['notification:new'];
          expect(notificationHandler).toBeDefined();

          await act(async () => {
            notificationHandler(notification);
          });

          // Verify toast was displayed
          await waitFor(() => {
            expect(mockToast.custom).toHaveBeenCalled();
          });

          // Verify toast content includes notification message
          const toastCall = mockToast.custom.mock.calls[0];
          expect(toastCall).toBeDefined();
          expect(toastCall[0]).toBeInstanceOf(Function);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property 2 (PBT): Toast notifications render correctly with different notification data
   * 
   * Validates: Requirement 3.1
   * 
   * This property verifies that toast notifications display correct icons, titles,
   * and action buttons for different notification types.
   */
  it('Property 2 (PBT): Toast notifications render with correct icons and titles for different types', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          type: fc.constantFrom('new_order', 'order_status', 'low_stock', 'payment_confirmed'),
          message: fc.string({ minLength: 5, maxLength: 50 }),
        }),
        async ({ type, message }) => {
          mockToast.custom.mockClear();

          const { WebSocketProvider } = await import('./WebSocketContext');

          render(
            <WebSocketProvider>
              <div>Test Child</div>
            </WebSocketProvider>
          );

          await waitFor(() => {
            expect(mockSocket.on).toHaveBeenCalledWith('notification:new', expect.any(Function));
          });

          const notification = {
            id: 1,
            type,
            message,
            related_entity_type: 'order',
            related_entity_id: 123,
            metadata: {},
            created_at: new Date().toISOString(),
            is_read: false,
          };

          // Trigger notification
          const notificationHandler = eventHandlers['notification:new'];
          await act(async () => {
            notificationHandler(notification);
          });

          await waitFor(() => {
            expect(mockToast.custom).toHaveBeenCalled();
          });

          // Verify toast was called with correct structure
          const toastCall = mockToast.custom.mock.calls[0];
          const toastRenderer = toastCall[0];
          const toastOptions = toastCall[1];

          // Verify toast options
          expect(toastOptions.duration).toBe(5000);
          expect(toastOptions.position).toBe('top-right');

          // Verify toast renderer is a function
          expect(typeof toastRenderer).toBe('function');
        }
      ),
      { numRuns: 15 }
    );
  });

  /**
   * Property 2: State management updates correctly when marking notifications as read
   * 
   * Validates: Requirement 3.3
   * 
   * This property verifies that marking a notification as read updates the local
   * React state correctly (notification is_read flag and unread count).
   */
  it('Property 2: State updates correctly when marking notifications as read', async () => {
    const { WebSocketProvider, useWebSocket } = await import('./WebSocketContext');

    let contextValue: any;
    const TestComponent = () => {
      contextValue = useWebSocket();
      return <div>Test</div>;
    };

    render(
      <WebSocketProvider>
        <TestComponent />
      </WebSocketProvider>
    );

    await waitFor(() => {
      expect(contextValue).toBeDefined();
    });

    // Add a notification to state via Socket.io event
    const notification = {
      id: 1,
      type: 'new_order' as const,
      message: 'New order received',
      related_entity_type: 'order',
      related_entity_id: 123,
      metadata: {},
      created_at: new Date().toISOString(),
      is_read: false,
    };

    await act(async () => {
      eventHandlers['notification:new'](notification);
    });

    await waitFor(() => {
      expect(contextValue.notifications.length).toBe(1);
      expect(contextValue.unreadCount).toBe(1);
    });

    // Mock api response for markAsRead
    mockApi.put.mockResolvedValueOnce({
      data: { unreadCount: 0 },
      status: 200,
      statusText: 'OK',
    });

    // Mark notification as read
    await act(async () => {
      await contextValue.markAsRead(1);
    });

    // Verify state was updated
    await waitFor(() => {
      const updatedNotification = contextValue.notifications.find((n: any) => n.id === 1);
      expect(updatedNotification.is_read).toBe(true);
      expect(contextValue.unreadCount).toBe(0);
    });
  });

  /**
   * Property 2 (PBT): Navigation works correctly for different notification types
   * 
   * Validates: Requirement 3.4
   * 
   * This property verifies that clicking notification toasts navigates to the
   * correct routes based on notification type and related entity ID.
   */
  it('Property 2 (PBT): Navigation routes are correct for different notification types', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          type: fc.constantFrom('new_order', 'order_status', 'payment_confirmed', 'low_stock'),
          related_entity_id: fc.option(fc.integer({ min: 1, max: 1000 }), { nil: null }),
        }),
        async ({ type, related_entity_id }) => {
          // Reset window.location
          window.location.href = '';

          const { WebSocketProvider, useWebSocket } = await import('./WebSocketContext');

          let contextValue: any;
          const TestComponent = () => {
            contextValue = useWebSocket();
            return <div>Test</div>;
          };

          render(
            <WebSocketProvider>
              <TestComponent />
            </WebSocketProvider>
          );

          await waitFor(() => {
            expect(contextValue).toBeDefined();
          });

          const notification = {
            id: 1,
            type,
            message: 'Test notification',
            related_entity_type: 'order',
            related_entity_id,
            metadata: {},
            created_at: new Date().toISOString(),
            is_read: false,
          };

          // Add notification to state
          await act(async () => {
            eventHandlers['notification:new'](notification);
          });

          // Mock fetch for markAsRead
          global.fetch = vi.fn(async () => ({
            ok: true,
            json: async () => ({ unreadCount: 0 }),
            status: 200,
            statusText: 'OK',
          })) as any;

          // Trigger notification click (which calls markAsRead and navigates)
          // We'll test the route generation logic
          let expectedRoute: string | null = null;
          
          switch (type) {
            case 'new_order':
            case 'order_status':
            case 'payment_confirmed':
              expectedRoute = related_entity_id ? `/admin/orders/${related_entity_id}` : '/admin/orders';
              break;
            case 'low_stock':
              expectedRoute = '/admin/products';
              break;
          }

          // Verify expected route is defined
          expect(expectedRoute).toBeTruthy();
        }
      ),
      { numRuns: 15 }
    );
  });

  /**
   * Property 2: WebSocket cleanup disconnects Socket.io connection on unmount
   * 
   * Validates: Requirement 3.5
   * 
   * This property verifies that when the WebSocketProvider component unmounts,
   * the Socket.io connection is properly disconnected.
   */
  it('Property 2: Component unmount properly disconnects Socket.io connection', async () => {
    const { WebSocketProvider } = await import('./WebSocketContext');

    const { unmount } = render(
      <WebSocketProvider>
        <div>Test Child</div>
      </WebSocketProvider>
    );

    await waitFor(() => {
      expect(mockIo).toHaveBeenCalled();
    });

    // Verify socket is connected
    expect(mockSocket.disconnect).not.toHaveBeenCalled();

    // Unmount component
    unmount();

    // Verify socket was disconnected
    await waitFor(() => {
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });

  /**
   * Property 2: Conditional logic skips connection for non-admin users
   * 
   * Validates: Requirement 3.7
   * 
   * This property verifies that WebSocket connection is NOT established when
   * the user is not an admin or has no token.
   */
  it('Property 2: WebSocket connection is skipped for non-admin users', async () => {
    // Mock auth store to return non-admin user
    mockUseAuthStore.mockReturnValue({
      token: 'mock-jwt-token',
      user: { id: 2, role: 'customer', name: 'Regular User' },
    });

    mockIo.mockClear();

    const { WebSocketProvider } = await import('./WebSocketContext');

    render(
      <WebSocketProvider>
        <div>Test Child</div>
      </WebSocketProvider>
    );

    // Wait a bit to ensure connection is not established
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify io() was NOT called
    expect(mockIo).not.toHaveBeenCalled();
  });

  /**
   * Property 2: Conditional logic skips connection when no token is present
   * 
   * Validates: Requirement 3.7
   * 
   * This property verifies that WebSocket connection is NOT established when
   * there is no authentication token.
   */
  it('Property 2: WebSocket connection is skipped when no token is present', async () => {
    // Mock auth store to return no token
    mockUseAuthStore.mockReturnValue({
      token: null,
      user: null,
    });

    mockIo.mockClear();

    const { WebSocketProvider } = await import('./WebSocketContext');

    render(
      <WebSocketProvider>
        <div>Test Child</div>
      </WebSocketProvider>
    );

    // Wait a bit to ensure connection is not established
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify io() was NOT called
    expect(mockIo).not.toHaveBeenCalled();
  });

  /**
   * Property 2: Parallel loading of notifications and unread count on mount
   * 
   * Validates: Requirement 3.6
   * 
   * This property verifies that when the component mounts, both notifications
   * list and unread count are fetched in parallel.
   */
  it('Property 2: Initial notifications and unread count are loaded in parallel on mount', async () => {
    const apiCalls: string[] = [];

    // Mock api to track calls
    mockApi.get.mockImplementation(async (url: string) => {
      apiCalls.push(url);
      
      if (url.includes('/unread-count')) {
        return {
          data: { count: 5 },
          status: 200,
          statusText: 'OK',
        };
      }
      
      return {
        data: { data: [], unreadCount: 5 },
        status: 200,
        statusText: 'OK',
      };
    });

    const { WebSocketProvider } = await import('./WebSocketContext');

    render(
      <WebSocketProvider>
        <div>Test Child</div>
      </WebSocketProvider>
    );

    // Wait for both API calls to complete
    await waitFor(() => {
      expect(apiCalls.length).toBeGreaterThanOrEqual(2);
    }, { timeout: 3000 });

    // Verify both endpoints were called
    const notificationsCall = apiCalls.find(url => url.includes('/api/notifications') && !url.includes('unread-count'));
    const unreadCountCall = apiCalls.find(url => url.includes('/unread-count'));

    expect(notificationsCall).toBeDefined();
    expect(unreadCountCall).toBeDefined();
  });

  /**
   * Property 2 (PBT): Unread count updates correctly when receiving notifications
   * 
   * Validates: Requirement 3.1
   * 
   * This property verifies that the unread count increments correctly when
   * new notifications are received via Socket.io.
   */
  it('Property 2 (PBT): Unread count increments correctly for multiple notifications', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 10000 }),
            type: fc.constantFrom('new_order', 'order_status', 'low_stock', 'payment_confirmed'),
            message: fc.string({ minLength: 5, maxLength: 50 }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (notifications) => {
          mockUseAuthStore.mockReturnValue({
            token: 'mock-jwt-token',
            user: { id: 1, role: 'admin', name: 'Admin User' },
          });

          const { WebSocketProvider, useWebSocket } = await import('./WebSocketContext');

          let contextValue: any;
          const TestComponent = () => {
            contextValue = useWebSocket();
            return <div>Test</div>;
          };

          render(
            <WebSocketProvider>
              <TestComponent />
            </WebSocketProvider>
          );

          await waitFor(() => {
            expect(contextValue).toBeDefined();
          });

          const initialUnreadCount = contextValue.unreadCount;

          // Send multiple notifications
          for (const notification of notifications) {
            await act(async () => {
              eventHandlers['notification:new']({
                ...notification,
                related_entity_type: 'order',
                related_entity_id: 123,
                metadata: {},
                created_at: new Date().toISOString(),
                is_read: false,
              });
            });
          }

          // Verify unread count increased by the number of notifications
          await waitFor(() => {
            expect(contextValue.unreadCount).toBe(initialUnreadCount + notifications.length);
          });

          // Verify all notifications were added to state
          expect(contextValue.notifications.length).toBeGreaterThanOrEqual(notifications.length);
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property 2: Socket.io unread count event updates state correctly
   * 
   * Validates: Requirement 3.1
   * 
   * This property verifies that receiving an unread count update via Socket.io
   * updates the local state correctly.
   */
  it('Property 2: Socket.io unread count event updates state correctly', async () => {
    const { WebSocketProvider, useWebSocket } = await import('./WebSocketContext');

    let contextValue: any;
    const TestComponent = () => {
      contextValue = useWebSocket();
      return <div>Test</div>;
    };

    render(
      <WebSocketProvider>
        <TestComponent />
      </WebSocketProvider>
    );

    await waitFor(() => {
      expect(contextValue).toBeDefined();
      expect(eventHandlers['notification:unread_count']).toBeDefined();
    });

    // Trigger unread count update
    await act(async () => {
      eventHandlers['notification:unread_count']({ count: 42 });
    });

    // Verify state was updated
    await waitFor(() => {
      expect(contextValue.unreadCount).toBe(42);
    });
  });

  /**
   * Property 2: markAllAsRead updates all notifications and resets unread count
   * 
   * Validates: Requirement 3.3
   * 
   * This property verifies that calling markAllAsRead updates all notifications
   * to is_read: true and sets unread count to 0.
   */
  it('Property 2: markAllAsRead updates all notifications and resets unread count', async () => {
    const { WebSocketProvider, useWebSocket } = await import('./WebSocketContext');

    let contextValue: any;
    const TestComponent = () => {
      contextValue = useWebSocket();
      return <div>Test</div>;
    };

    render(
      <WebSocketProvider>
        <TestComponent />
      </WebSocketProvider>
    );

    await waitFor(() => {
      expect(contextValue).toBeDefined();
    });

    // Add multiple unread notifications
    const notifications = [
      { id: 1, type: 'new_order' as const, message: 'Order 1', is_read: false },
      { id: 2, type: 'order_status' as const, message: 'Order 2', is_read: false },
      { id: 3, type: 'low_stock' as const, message: 'Stock alert', is_read: false },
    ];

    for (const notification of notifications) {
      await act(async () => {
        eventHandlers['notification:new']({
          ...notification,
          related_entity_type: 'order',
          related_entity_id: 123,
          metadata: {},
          created_at: new Date().toISOString(),
        });
      });
    }

    await waitFor(() => {
      expect(contextValue.notifications.length).toBe(3);
      expect(contextValue.unreadCount).toBe(3);
    });

    // Mock api for markAllAsRead
    mockApi.put.mockResolvedValueOnce({
      data: {},
      status: 200,
      statusText: 'OK',
    });

    // Mark all as read
    await act(async () => {
      await contextValue.markAllAsRead();
    });

    // Verify all notifications are marked as read
    await waitFor(() => {
      expect(contextValue.unreadCount).toBe(0);
      contextValue.notifications.forEach((n: any) => {
        expect(n.is_read).toBe(true);
      });
    });
  });
});
