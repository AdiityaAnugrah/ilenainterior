'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { ShoppingCart, Package, AlertTriangle, CheckCircle, Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const NotificationsPage: React.FC = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, refreshNotifications } = useWebSocket();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Refresh notifications when page loads
    refreshNotifications();
  }, []);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_order':
        return (
          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
            <ShoppingCart size={20} className="text-blue-600" />
          </div>
        );
      case 'order_status':
        return (
          <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
            <CheckCircle size={20} className="text-indigo-600" />
          </div>
        );
      case 'payment_confirmed':
        return (
          <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle size={20} className="text-green-600" />
          </div>
        );
      case 'low_stock':
        return (
          <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
            <AlertTriangle size={20} className="text-yellow-600" />
          </div>
        );
      default:
        return (
          <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
            <Bell size={20} className="text-gray-600" />
          </div>
        );
    }
  };

  const handleNotificationClick = async (notification: any) => {
    // Mark as read
    await markAsRead(notification.id);
    
    // Navigate to related page
    const route = getNotificationRoute(notification);
    if (route) {
      router.push(route);
    }
  };

  const getNotificationRoute = (notification: any): string => {
    const { type, related_entity_id } = notification;
    
    switch (type) {
      case 'new_order':
      case 'order_status':
      case 'payment_confirmed':
        return related_entity_id ? `/admin/orders/${related_entity_id}` : '/admin/orders';
      case 'low_stock':
        return '/admin/products';
      default:
        return '/admin/notifications';
    }
  };

  const handleMarkAllAsRead = async () => {
    setLoading(true);
    await markAllAsRead();
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-stone-900">All Notifications</h1>
            <p className="text-sm text-stone-600 mt-1">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Marking...' : 'Mark all as read'}
            </button>
          )}
        </div>

        {/* Notifications List */}
        <div className="bg-white rounded-lg shadow-sm border border-stone-200">
          {notifications.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Bell size={48} className="mx-auto mb-4 text-stone-300" />
              <p className="text-stone-600 text-lg font-medium">No notifications yet</p>
              <p className="text-stone-500 text-sm mt-1">
                You'll see notifications here when important events occur
              </p>
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full px-6 py-4 text-left hover:bg-stone-50 transition-colors ${
                    !notification.is_read ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!notification.is_read ? 'font-semibold text-stone-900' : 'text-stone-700'}`}>
                        {notification.message}
                      </p>
                      <p className="text-xs text-stone-500 mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <div className="flex-shrink-0">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          New
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Load More - Placeholder for future pagination */}
        {notifications.length >= 50 && (
          <div className="mt-6 text-center">
            <button
              className="px-6 py-2 bg-white text-stone-700 text-sm font-medium rounded-lg border border-stone-300 hover:bg-stone-50 transition-colors"
              onClick={() => {
                // TODO: Implement pagination
                console.log('Load more notifications');
              }}
            >
              Load More
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
