/**
 * Check admin users in database
 */

const pool = require('./src/config/db');

async function checkAdminUsers() {
  const conn = await pool.getConnection();
  try {
    const [users] = await conn.query(
      'SELECT id, name, email, role, status FROM users WHERE role = "admin" LIMIT 5'
    );
    
    console.log('Admin users in database:');
    console.log('========================');
    users.forEach(user => {
      console.log(`ID: ${user.id}, Name: ${user.name}, Email: ${user.email}, Status: ${user.status}`);
    });
    
    if (users.length === 0) {
      console.log('No admin users found!');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    conn.release();
    await pool.end();
  }
}

checkAdminUsers();
