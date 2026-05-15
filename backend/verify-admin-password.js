/**
 * Verify admin password hash
 */

const pool = require('./src/config/db');
const bcrypt = require('bcryptjs');

async function verifyPassword() {
  const conn = await pool.getConnection();
  try {
    const [users] = await conn.query(
      'SELECT id, name, email, password FROM users WHERE email = "admin@ilena.com"'
    );
    
    if (users.length === 0) {
      console.log('Admin user not found!');
      return;
    }
    
    const user = users[0];
    console.log('Admin user found:');
    console.log(`ID: ${user.id}, Name: ${user.name}, Email: ${user.email}`);
    console.log(`Password hash: ${user.password}`);
    
    // Test various passwords
    const testPasswords = ['password', 'admin123', 'admin', 'Password123'];
    
    console.log('\nTesting passwords:');
    for (const pwd of testPasswords) {
      const isValid = await bcrypt.compare(pwd, user.password);
      console.log(`  "${pwd}": ${isValid ? '✓ VALID' : '✗ invalid'}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    conn.release();
    await pool.end();
  }
}

verifyPassword();
