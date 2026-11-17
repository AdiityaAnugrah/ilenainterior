/**
 * Order Code Generator Service
 * Generates unique order codes in format ORD-YYYYMMDD-XXXX.
 */

/**
 * Generate an order code while holding a date-scoped advisory lock on the
 * caller's connection. The caller must keep the connection until its INSERT
 * commits and then release `lockName` on that same connection.
 * @param {import('mysql2/promise').PoolConnection} conn
 * @returns {Promise<{ orderCode: string, lockName: string }>}
 */
async function generateOrderCode(conn) {
  if (!conn) throw new TypeError('A transaction connection is required to generate an order code.');

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const datePrefix = `${year}${month}${day}`;
  const lockName = `order-code:${datePrefix}`;

  const [lockRows] = await conn.query('SELECT GET_LOCK(?, 10) AS acquired', [lockName]);
  if (Number(lockRows[0]?.acquired) !== 1) {
    throw new Error('Order code generation lock could not be acquired.');
  }

  try {
    const [rows] = await conn.query(
      `SELECT MAX(CAST(SUBSTRING_INDEX(order_code, '-', -1) AS UNSIGNED)) AS last_sequence
       FROM orders
       WHERE order_code LIKE ?`,
      [`ORD-${datePrefix}-%`]
    );

    const lastSequence = Number(rows[0]?.last_sequence || 0);
    const sequence = lastSequence + 1;
    if (!Number.isSafeInteger(sequence) || sequence < 1) {
      throw new Error('Order code sequence is outside the supported range.');
    }

    return {
      orderCode: `ORD-${datePrefix}-${String(sequence).padStart(4, '0')}`,
      lockName,
    };
  } catch (error) {
    try {
      await conn.query('SELECT RELEASE_LOCK(?)', [lockName]);
    } catch {
      conn.destroy();
    }
    throw error;
  }
}

module.exports = { generateOrderCode };
