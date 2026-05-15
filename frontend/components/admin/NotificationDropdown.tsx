'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { ShoppingCart, Package, AlertTriangle, CheckCircle, Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface NotificationDropdownProps {
  onClose: () => void;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ onClose }) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useWebSocket();
  const router = useRouter();

  // Show only recent 5 notifications in dropdown
  const recentNotifications = notifications.slice(0, 5);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_order':
        return <ShoppingCart size={18} className="text-blue-600" />;
      case 'order_status':
        return <CheckCircle size={18} className="text-indigo-600" />;
      case 'payment_confirmed':
        return <CheckCircle size={18} className="text-green-600" />;
      case 'low_stock':
        return <AlertTriangle size={18} className="text-yellow-600" />;
      default:
        return <Bell size={18} className="text-gray-600" />;
    }
  };

  const handleNotificationClick = async (notification: any) => {
    // Mark as read
    await markAsRead(notification.id);
    
    // Navigate to related page
    const route = getNotificationRoute(notification);
    if (route) {
      router.push(route);
      onClose();
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
    await markAllAsRead();
  };

  return (
    <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-stone-200 z-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200">
        <h3 className="text-sm font-semibold text-stone-900">Notifications</h3>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Notification List */}
      <div className="max-h-96 overflow-y-auto">
        {recentNotifications.length === 0 ? (
          <div className="px-4 py-8 text-center text-stone-500 text-sm">
            <Bell size={32} className="mx-auto mb-2 text-stone-300" />
            No notifications yet
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {recentNotifications.map((notification) => (
              <button
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`w-full px-4 py-3 text-left hover:bg-stone-50 transition-colors ${
                  !notification.is_read ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
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
                      <span className="inline-block w-2 h-2 bg-blue-600 rounded-full"></span>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {recentNotifications.length > 0 && (
        <div className="px-4 py-3 border-t border-stone-200">
          <Link
            href="/admin/notifications"
            onClick={onClose}
            className="block text-center text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
