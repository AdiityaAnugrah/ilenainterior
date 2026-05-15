'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

interface Notification {
  id: number;
  type: 'new_order' | 'order_status' | 'low_stock' | 'payment_confirmed';
  message: string;
  related_entity_type: string | null;
  related_entity_id: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  is_read: boolean;
}

interface WebSocketContextState {
  connected: boolean;
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (notificationId: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const WebSocketContext = createContext<WebSocketContextState | null>(null);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context;
};

interface WebSocketProviderProps {
  children: React.ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const { token, user } = useAuthStore();
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Helper function for notification icons
  const getNotificationIcon = useCallback((type: string) => {
    switch (type) {
      case 'new_order':
        return (
          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
            <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
        );
      case 'order_status':
        return (
          <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
            <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case 'payment_confirmed':
        return (
          <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case 'low_stock':
        return (
          <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
            <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
            <svg className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
        );
    }
  }, []);

  const getNotificationTitle = useCallback((type: string) => {
    switch (type) {
      case 'new_order':
        return 'New Order';
      case 'order_status':
        return 'Order Status Updated';
      case 'payment_confirmed':
        return 'Payment Confirmed';
      case 'low_stock':
        return 'Low Stock Alert';
      default:
        return 'Notification';
    }
  }, []);

  const getNotificationRoute = useCallback((notification: Notification): string | null => {
    const { type, related_entity_id } = notification;
    
    switch (type) {
      case 'new_order':
      case 'order_status':
      case 'payment_confirmed':
        return related_entity_id ? `/admin/orders/${related_entity_id}` : '/admin/orders';
      case 'low_stock':
        return '/admin/products';
      default:
        return null;
    }
  }, []);

  const refreshNotifications = useCallback(async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/notifications?page=1&limit=50`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.data || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  }, [token]);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/notifications/unread-count`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.count || 0);
      }
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  }, [token]);

  const markAsRead = useCallback(
    async (notificationId: number) => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/notifications/${notificationId}/read`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          
          // Update local state
          setNotifications((prev) =>
            prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
          );
          setUnreadCount(data.unreadCount || 0);
        }
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    },
    [token]
  );

  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/notifications/read-all`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        // Update local state
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  }, [token]);

  const handleNotificationClick = useCallback(async (notification: Notification) => {
    // Mark as read
    await markAsRead(notification.id);
    
    // Navigate to related page
    const route = getNotificationRoute(notification);
    if (route) {
      window.location.href = route;
    }
  }, [markAsRead, getNotificationRoute]);

  const displayToast = useCallback((notification: Notification) => {
    const { type, message } = notification;
    
    // Determine toast style based on notification type
    const toastOptions = {
      duration: 5000,
      position: 'top-right' as const,
    };

    // Custom toast with action button
    toast.custom(
      (t) => (
        <div
          className={`${
            t.visible ? 'animate-enter' : 'animate-leave'
          } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
        >
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="shrink-0 pt-0.5">
                {getNotificationIcon(type)}
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {getNotificationTitle(type)}
                </p>
                <p className="mt-1 text-sm text-gray-500">{message}</p>
              </div>
            </div>
          </div>
          <div className="flex border-l border-gray-200">
            <button
              onClick={() => {
                handleNotificationClick(notification);
                toast.dismiss(t.id);
              }}
              className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-blue-600 hover:text-blue-500 focus:outline-none"
            >
              View
            </button>
          </div>
        </div>
      ),
      toastOptions
    );
  }, [getNotificationIcon, getNotificationTitle, handleNotificationClick]);

  // Initialize Socket.io connection
  useEffect(() => {
    // Only connect if user is admin and has token
    if (!token || !user || user.role !== 'admin') {
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    const socketUrl = apiUrl.replace(/\/api\/?$/, '');

    console.log('🔌 Attempting to connect to Socket.io:', socketUrl);

    const socketInstance = io(socketUrl, {
      auth: {
        token,
      },
      reconnection: true,
      reconnectionDelay: 5000,
      reconnectionAttempts: 5,
      timeout: 10000,
    });

    // Connection events
    socketInstance.on('connect', () => {
      console.log('✅ WebSocket connected');
      setConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
      setConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      // Only log errors that are not expected authentication failures
      if (error.message === 'Admin access required') {
        // Silent fail - user is not admin, which is expected
        return;
      }
      console.error('WebSocket connection error:', error.message);
      setConnected(false);
    });

    // Notification events
    socketInstance.on('notification:new', (notification: Notification) => {
      console.log('📢 New notification:', notification);
      
      // Add to notifications list
      setNotifications((prev) => [notification, ...prev]);
      
      // Increment unread count
      setUnreadCount((prev) => prev + 1);
      
      // Display toast notification
      displayToast(notification);
    });

    socketInstance.on('notification:unread_count', ({ count }: { count: number }) => {
      console.log('🔔 Unread count updated:', count);
      setUnreadCount(count);
    });

    // Cleanup on unmount
    return () => {
      socketInstance.disconnect();
    };
  }, [token, user, displayToast]);

  // Fetch initial notifications and unread count
  useEffect(() => {
    let isMounted = true;
    
    const loadInitialData = async () => {
      if (token && user?.role === 'admin' && isMounted) {
        await Promise.all([
          refreshNotifications(),
          fetchUnreadCount()
        ]);
      }
    };
    
    loadInitialData();
    
    return () => {
      isMounted = false;
    };
  }, [token, user, refreshNotifications, fetchUnreadCount]);

  const value: WebSocketContextState = {
    connected,
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
  };

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
};
