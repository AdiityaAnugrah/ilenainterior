/**
 * NotificationService
 * Handles creation, retrieval, and management of admin notifications
 * Broadcasts real-time notifications via Socket.io
 */

class NotificationService {
  // Notification type constants
  static TYPES = {
    NEW_ORDER: 'new_order',
    ORDER_STATUS: 'order_status',
    LOW_STOCK: 'low_stock',
    PAYMENT_CONFIRMED: 'payment_confirmed',
  };

  // Low stock threshold (units)
  static LOW_STOCK_THRESHOLD = 10;

  // Low stock deduplication window (24 hours in milliseconds)
  static LOW_STOCK_DEDUP_WINDOW = 24 * 60 * 60 * 1000;

  constructor(io, pool) {
    this.io = io;
    this.pool = pool;
  }

  /**
   * Create a new notification and broadcast to all connected admins
   * @param {string} type - Notification type (use NotificationService.TYPES)
   * @param {string} message - Notification message
   * @param {string} relatedEntityType - Type of related entity (e.g., 'order', 'product')
   * @param {number} relatedEntityId - ID of related entity
   * @param {object} metadata - Additional metadata as JSON
   * @returns {Promise<number>} Notification ID
   */
  async createNotification(type, message, relatedEntityType = null, relatedEntityId = null, metadata = null) {
    const conn = await this.pool.getConnection();
    try {
      // Insert notification into database
      const [result] = await conn.query(
        `INSERT INTO notifications (type, message, related_entity_type, related_entity_id, metadata, created_at)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [type, message, relatedEntityType, relatedEntityId, metadata ? JSON.stringify(metadata) : null]
      );

      const notificationId = result.insertId;

      // Prepare notification payload for broadcast
      const notification = {
        id: notificationId,
        type,
        message,
        related_entity_type: relatedEntityType,
        related_entity_id: relatedEntityId,
        metadata,
        created_at: new Date().toISOString(),
      };

      // Broadcast to all connected admin clients
      this.io.emit('notification:new', notification);

      console.log(`📢 Notification broadcast: [${type}] ${message}`);

      return notificationId;
    } catch (error) {
      console.error('[NotificationService] Create notification error:', error);
      throw error;
    } finally {
      conn.release();
    }
  }

  /**
   * Get paginated notifications for a user with read status
   * @param {number} userId - User ID
   * @param {number} page - Page number (1-indexed)
   * @param {number} limit - Items per page
   * @returns {Promise<{data: Array, total: number}>}
   */
  async getNotifications(userId, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const conn = await this.pool.getConnection();
    
    try {
      // Get notifications with read status for this user
      const [rows] = await conn.query(
        `SELECT n.*, 
                nr.read_at,
                IF(nr.id IS NOT NULL, 1, 0) as is_read
         FROM notifications n
         LEFT JOIN notification_reads nr ON nr.notification_id = n.id AND nr.user_id = ?
         ORDER BY n.created_at DESC
         LIMIT ? OFFSET ?`,
        [userId, limit, offset]
      );

      // Get total count
      const [[{ total }]] = await conn.query('SELECT COUNT(*) as total FROM notifications');

      // Parse metadata JSON
      const data = rows.map(row => ({
        ...row,
        metadata: row.metadata ? JSON.parse(row.metadata) : null,
        is_read: Boolean(row.is_read),
      }));

      return { data, total };
    } finally {
      conn.release();
    }
  }

  /**
   * Get unread notification count for a user
   * @param {number} userId - User ID
   * @returns {Promise<number>} Unread count
   */
  async getUnreadCount(userId) {
    const conn = await this.pool.getConnection();
    try {
      const [[{ count }]] = await conn.query(
        `SELECT COUNT(*) as count
         FROM notifications n
         WHERE n.id NOT IN (
           SELECT notification_id FROM notification_reads WHERE user_id = ?
         )`,
        [userId]
      );
      return count;
    } finally {
      conn.release();
    }
  }

  /**
   * Mark a notification as read for a specific user
   * @param {number} notificationId - Notification ID
   * @param {number} userId - User ID
   * @returns {Promise<number>} Updated unread count
   */
  async markAsRead(notificationId, userId) {
    const conn = await this.pool.getConnection();
    try {
      // Insert into notification_reads (ignore if already exists)
      await conn.query(
        `INSERT IGNORE INTO notification_reads (notification_id, user_id, read_at)
         VALUES (?, ?, NOW())`,
        [notificationId, userId]
      );

      // Get updated unread count
      const unreadCount = await this.getUnreadCount(userId);

      // Emit updated unread count to user's socket connections
      this.emitUnreadCountToUser(userId, unreadCount);

      return unreadCount;
    } finally {
      conn.release();
    }
  }

  /**
   * Mark all notifications as read for a specific user
   * @param {number} userId - User ID
   * @returns {Promise<number>} Updated unread count (should be 0)
   */
  async markAllAsRead(userId) {
    const conn = await this.pool.getConnection();
    try {
      // Get all notification IDs that are unread for this user
      const [unreadNotifications] = await conn.query(
        `SELECT n.id
         FROM notifications n
         WHERE n.id NOT IN (
           SELECT notification_id FROM notification_reads WHERE user_id = ?
         )`,
        [userId]
      );

      // Insert all as read (use INSERT IGNORE to handle any race conditions)
      if (unreadNotifications.length > 0) {
        const values = unreadNotifications.map(n => [n.id, userId]);
        await conn.query(
          `INSERT IGNORE INTO notification_reads (notification_id, user_id, read_at)
           VALUES ?`,
          [values]
        );
      }

      // Emit updated unread count (0) to user's socket connections
      this.emitUnreadCountToUser(userId, 0);

      return 0;
    } finally {
      conn.release();
    }
  }

  /**
   * Check if product stock is low and create notification if needed
   * Implements 24-hour deduplication to avoid spam
   * @param {number} productId - Product ID
   * @param {string} productName - Product name
   * @param {number} newStock - New stock quantity
   */
  async checkLowStock(productId, productName, newStock) {
    // Only trigger if stock is at or below threshold
    if (newStock > NotificationService.LOW_STOCK_THRESHOLD) {
      return;
    }

    const conn = await this.pool.getConnection();
    try {
      // Check for existing low_stock notification within 24 hours
      const twentyFourHoursAgo = new Date(Date.now() - NotificationService.LOW_STOCK_DEDUP_WINDOW);
      
      const [existing] = await conn.query(
        `SELECT id FROM notifications
         WHERE type = ? 
         AND related_entity_type = 'product'
         AND related_entity_id = ?
         AND created_at > ?
         LIMIT 1`,
        [NotificationService.TYPES.LOW_STOCK, productId, twentyFourHoursAgo]
      );

      // If notification already exists within 24 hours, skip
      if (existing.length > 0) {
        console.log(`⏭️  Low stock notification for product ${productId} already sent within 24 hours`);
        return;
      }

      // Create low stock notification
      const message = `Low stock alert: ${productName} - Only ${newStock} units remaining`;
      await this.createNotification(
        NotificationService.TYPES.LOW_STOCK,
        message,
        'product',
        productId,
        { product_name: productName, stock: newStock }
      );
    } finally {
      conn.release();
    }
  }

  /**
   * Emit unread count update to all of a user's socket connections
   * @param {number} userId - User ID
   * @param {number} count - Unread count
   */
  emitUnreadCountToUser(userId, count) {
    const activeConnections = this.io.sockets.adapter.rooms.get(`user_${userId}`);
    if (activeConnections) {
      this.io.to(`user_${userId}`).emit('notification:unread_count', { count });
    }
  }
}

module.exports = NotificationService;
