const pool = require('../config/db');

/**
 * Delete guest projects older than 30 days
 * Should be run as a scheduled task (cron job)
 */
async function cleanupExpiredGuestProjects() {
  const conn = await pool.getConnection();
  try {
    const [result] = await conn.query(
      `DELETE FROM projects 
       WHERE guest_token IS NOT NULL 
       AND user_id IS NULL 
       AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)`
    );
    
    const deletedCount = result.affectedRows;
    console.log(`[Expiration Service] Deleted ${deletedCount} expired guest projects`);
    return deletedCount;
  } catch (error) {
    console.error('[Expiration Service Error]', error);
    throw error;
  } finally {
    conn.release();
  }
}

// Run cleanup if executed directly
if (require.main === module) {
  cleanupExpiredGuestProjects()
    .then((count) => {
      console.log(`Cleanup completed. ${count} projects deleted.`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Cleanup failed:', error);
      process.exit(1);
    });
}

module.exports = { cleanupExpiredGuestProjects };
