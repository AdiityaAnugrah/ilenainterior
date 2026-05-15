/**
 * Order Code Generator Service
 * Generates unique order codes in format: ORD-YYYYMMDD-XXXX
 * where XXXX is a sequential number for that day
 */

const pool = require('../config/db');

/**
 * Generate a unique order code for today
 * @returns {Promise<string>} Order code in format ORD-YYYYMMDD-XXXX
 */
async function generateOrderCode() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const datePrefix = `${year}${month}${day}`;
  
  const conn = await pool.getConnection();
  try {
    // Find the highest sequence number for today
    const [rows] = await conn.query(
      `SELECT order_code FROM orders 
       WHERE order_code LIKE ? 
       ORDER BY order_code DESC 
       LIMIT 1`,
      [`ORD-${datePrefix}-%`]
    );
    
    let sequence = 1;
    if (rows.length > 0) {
      // Extract sequence number from last order code
      const lastCode = rows[0].order_code;
      const lastSequence = parseInt(lastCode.split('-')[2]);
      sequence = lastSequence + 1;
    }
    
    // Format sequence as 4-digit number with leading zeros
    const sequenceStr = String(sequence).padStart(4, '0');
    
    return `ORD-${datePrefix}-${sequenceStr}`;
  } finally {
    conn.release();
  }
}

module.exports = { generateOrderCode };
