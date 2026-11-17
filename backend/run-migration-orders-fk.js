/**
 * Migration script to remove foreign key constraint on orders.user_id
 * This allows users to be deleted while preserving their order history
 */

const pool = require('./src/config/db');

async function runMigration() {
  let conn;
  
  try {
    conn = await pool.getConnection();
    console.log('✓ Database connection established\n');

    // Check if foreign key constraint exists
    console.log('Checking for foreign key constraint on orders.user_id...');
    const [constraints] = await conn.query(`
      SELECT CONSTRAINT_NAME 
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'orders' 
        AND COLUMN_NAME = 'user_id' 
        AND REFERENCED_TABLE_NAME = 'users'
    `);

    if (constraints.length > 0) {
      const constraintName = constraints[0].CONSTRAINT_NAME;
      console.log(`✓ Found constraint: ${constraintName}`);
      
      // Drop the foreign key constraint
      console.log(`\nDropping foreign key constraint ${constraintName}...`);
      await conn.query('ALTER TABLE ?? DROP FOREIGN KEY ??', ['orders', constraintName]);
      console.log('✓ Foreign key constraint dropped successfully');
    } else {
      console.log('✓ No foreign key constraint found - migration not needed');
    }

    // Ensure the lookup index even when a previous run dropped the foreign key
    // but failed before creating the index.
    console.log('\nEnsuring index on orders.user_id...');
    try {
      await conn.query('CREATE INDEX ?? ON ?? (??)', ['idx_user_id', 'orders', 'user_id']);
      console.log('✓ Index created successfully');
    } catch (err) {
      if (err.code === 'ER_DUP_KEYNAME') {
        console.log('✓ Index already exists');
      } else {
        throw err;
      }
    }

    console.log('\n✓ Migration completed successfully!');
    console.log('\nUsers can now be deleted while preserving their order history.');

  } finally {
    try {
      if (conn) conn.release();
    } finally {
      await pool.end();
    }
  }
}

runMigration().catch((error) => {
  console.error('✗ Migration failed:', error.message);
  process.exitCode = 1;
});
