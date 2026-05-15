const router = require('express').Router();
const adminAuth = require('../middleware/adminAuth');

/**
 * Notifications API Router
 * Provides endpoints for fetching, marking as read, and managing notifications
 */

// GET /api/notifications - Get paginated notifications with read status
router.get('/', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const notificationService = req.app.get('notificationService');

    if (!notificationService) {
      return res.status(500).json({ message: 'Notification service not initialized' });
    }

    const { data, total } = await notificationService.getNotifications(
      req.user.id,
      parseInt(page),
      parseInt(limit)
    );

    const unreadCount = await notificationService.getUnreadCount(req.user.id);

    res.json({
      data,
      total,
      unreadCount,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) {
    console.error('[Notifications API] Get notifications error:', error);
    res.status(500).json({ message: 'Failed to fetch notifications' });
  }
});

// GET /api/notifications/unread-count - Get unread notification count
router.get('/unread-count', adminAuth, async (req, res) => {
  try {
    const notificationService = req.app.get('notificationService');

    if (!notificationService) {
      return res.status(500).json({ message: 'Notification service not initialized' });
    }

    const count = await notificationService.getUnreadCount(req.user.id);

    res.json({ count });
  } catch (error) {
    console.error('[Notifications API] Get unread count error:', error);
    res.status(500).json({ message: 'Failed to fetch unread count' });
  }
});

// PUT /api/notifications/:id/read - Mark notification as read
router.put('/:id/read', adminAuth, async (req, res) => {
  try {
    const notificationService = req.app.get('notificationService');

    if (!notificationService) {
      return res.status(500).json({ message: 'Notification service not initialized' });
    }

    const unreadCount = await notificationService.markAsRead(
      parseInt(req.params.id),
      req.user.id
    );

    res.json({
      message: 'Marked as read',
      unreadCount,
    });
  } catch (error) {
    console.error('[Notifications API] Mark as read error:', error);
    res.status(500).json({ message: 'Failed to mark as read' });
  }
});

// PUT /api/notifications/read-all - Mark all notifications as read
router.put('/read-all', adminAuth, async (req, res) => {
  try {
    const notificationService = req.app.get('notificationService');

    if (!notificationService) {
      return res.status(500).json({ message: 'Notification service not initialized' });
    }

    const unreadCount = await notificationService.markAllAsRead(req.user.id);

    res.json({
      message: 'All marked as read',
      unreadCount,
    });
  } catch (error) {
    console.error('[Notifications API] Mark all as read error:', error);
    res.status(500).json({ message: 'Failed to mark all as read' });
  }
});

// DELETE /api/notifications/:id - Delete notification
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const pool = req.app.get('pool');

    if (!pool) {
      return res.status(500).json({ message: 'Database pool not initialized' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.query('DELETE FROM notifications WHERE id = ?', [req.params.id]);
      res.json({ message: 'Notification deleted' });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('[Notifications API] Delete notification error:', error);
    res.status(500).json({ message: 'Failed to delete notification' });
  }
});

module.exports = router;
