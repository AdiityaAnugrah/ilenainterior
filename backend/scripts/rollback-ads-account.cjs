const fs = require('node:fs');
require('dotenv').config();
const mysql = require('mysql2/promise');
(async () => {
  const { email, previous } = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const conn = await mysql.createConnection({ host: process.env.DB_HOST, port: process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
  try {
    if (previous) await conn.query('UPDATE users SET name=?,password=?,role=?,status=? WHERE id=? AND email=?',
      [previous.name, previous.password, previous.role, previous.status, previous.id, email]);
    else await conn.query("DELETE FROM users WHERE email=? AND role='ads_analyst'", [email]);
    console.log('ACCOUNT ROLLBACK: previous account state restored');
  } finally { await conn.end(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
