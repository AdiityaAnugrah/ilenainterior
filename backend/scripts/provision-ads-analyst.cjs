// Run from backend; supply credentials and a private backup path through environment variables.
const fs = require('node:fs');
const path = require('node:path');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const mysql = require('mysql2/promise');
(async () => {
  const email = process.env.ADS_ANALYST_EMAIL;
  const password = process.env.ADS_ANALYST_PASSWORD;
  const backup = process.env.ADS_ANALYST_BACKUP;
  if (!email || !password || !backup) throw new Error('Email, password and private backup path required');
  const conn = await mysql.createConnection({ host: process.env.DB_HOST, port: process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
  try {
    const [rows] = await conn.query('SELECT id, name, email, password, role, status FROM users WHERE email = ?', [email]);
    fs.mkdirSync(path.dirname(backup), { recursive: true });
    fs.writeFileSync(backup, JSON.stringify({ email, previous: rows[0] || null }), { flag: 'wx', mode: 0o600 });
    const migration = fs.readFileSync(path.join(__dirname, '../database/migration_ads_analyst.sql'), 'utf8');
    for (const sql of migration.split(';').map(s => s.trim()).filter(Boolean)) await conn.query(sql);
    const hash = await bcrypt.hash(password, 12);
    await conn.beginTransaction();
    if (rows.length) await conn.query("UPDATE users SET password=?, role='ads_analyst', status='active', updated_at=NOW() WHERE id=?", [hash, rows[0].id]);
    else await conn.query("INSERT INTO users (name,email,password,role,status) VALUES (?,?,?,'ads_analyst','active')", ['Zafana', email, hash]);
    const [[user]] = await conn.query('SELECT password,role,status FROM users WHERE email=?', [email]);
    if (user.role !== 'ads_analyst' || user.status !== 'active' || !(await bcrypt.compare(password, user.password))) throw new Error('Account verification failed');
    await conn.commit();
    console.log('ACCOUNT: verified; ads_analyst; active; bcrypt password matches');
  } catch (error) { await conn.rollback(); throw error; }
  finally { await conn.end(); }
})().catch(error => { console.error('Provision failed:', error.message); process.exitCode = 1; });
