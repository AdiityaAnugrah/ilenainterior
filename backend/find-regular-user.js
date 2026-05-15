/**
 * Find regular users for testing
 */

const pool = require('./src/config/db');

async function findUsers() {
  const conn = await pool.getConnection();
  try {
    const [users] = await conn.query(
      'SELECT id, name, email, role FROM users WHERE role = "user" LIMIT 5'
    );
    
    console.log('Regular users in database:');
    console.log('==========================');
    users.forEach(user => {
      console.log(`ID: ${user.id}, Name: ${user.name}, Email: ${user.email}`);
    });
    
    if (users.length === 0) {
      console.log('No regular users found!');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    conn.release();
    await pool.end();
  }
}

findUsers();
