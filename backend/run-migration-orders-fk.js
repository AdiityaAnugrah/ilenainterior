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
      WHERE TABLE_SCHEMA = 'ilena_interior' 
        AND TABLE_NAME = 'orders' 
        AND COLUMN_NAME = 'user_id' 
        AND REFERENCED_TABLE_NAME = 'users'
    `);

    if (constraints.length > 0) {
      const constraintName = constraints[0].CONSTRAINT_NAME;
      console.log(`✓ Found constraint: ${constraintName}`);
      
      // Drop the foreign key constraint
      console.log(`\nDropping foreign key constraint ${constraintName}...`);
      await conn.query(`ALTER TABLE orders DROP FOREIGN KEY ${constraintName}`);
      console.log('✓ Foreign key constraint dropped successfully');
      
      // Add index for performance if it doesn't exist
      console.log('\nAdding index on user_id for query performance...');
      try {
        await conn.query('CREATE INDEX idx_user_id ON orders(user_id)');
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
    } else {
      console.log('✓ No foreign key constraint found - migration not needed');
    }

  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (conn) conn.release();
    await pool.end();
    process.exit(0);
  }
}

runMigration();
