const bcrypt = require('bcryptjs');
const readline = require('node:readline/promises');
const pool = require('../src/config/db');

const BOOTSTRAP_LOCK = 'design_interior:first-admin-bootstrap';

function readSecret(prompt) {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') {
    return Promise.reject(new Error('Jalankan bootstrap dari terminal interaktif.'));
  }

  process.stdin.setEncoding('utf8');
  process.stdout.write(prompt);
  const previousRawMode = process.stdin.isRaw;

  return new Promise((resolve, reject) => {
    let value = '';
    const finish = (error) => {
      process.stdin.removeListener('data', onData);
      process.stdin.setRawMode(previousRawMode);
      process.stdin.pause();
      process.stdout.write('\n');
      if (error) reject(error);
      else resolve(value);
    };

    const onData = (chunk) => {
      for (const character of chunk) {
        if (character === '\u0003') return finish(new Error('Input dibatalkan.'));
        if (character === '\r' || character === '\n') return finish();
        if (character === '\u007f' || character === '\b') {
          value = [...value].slice(0, -1).join('');
          continue;
        }
        if (character >= ' ' && character !== '\u007f' && value.length < 256) value += character;
      }
    };

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', onData);
  });
}

async function bootstrapAdmin() {
  let conn;
  let lockAcquired = false;
  const action = process.argv[2] || '--bootstrap';

  try {
    if (!process.stdin.isTTY) throw new Error('Jalankan bootstrap dari terminal interaktif.');
    if (!['--bootstrap', '--reset-password'].includes(action)) {
      throw new Error('Gunakan tanpa argumen untuk bootstrap atau --reset-password untuk mereset admin yang ada.');
    }

    const prompts = readline.createInterface({ input: process.stdin, output: process.stdout });
    let name;
    let email;
    try {
      if (action === '--bootstrap') name = (await prompts.question('Nama admin: ')).trim();
      email = (await prompts.question(action === '--bootstrap' ? 'Email admin: ' : 'Email admin yang akan direset: ')).trim().toLowerCase();
    } finally {
      prompts.close();
    }

    if (action === '--bootstrap' && (!name || name.length > 100)) {
      throw new Error('Nama wajib diisi (maksimal 100 karakter).');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Format email tidak valid.');

    const password = await readSecret('Password admin (min. 12 karakter): ');
    const confirmation = await readSecret('Ulangi password admin: ');
    if (password !== confirmation) throw new Error('Konfirmasi password tidak cocok.');
    if ([...password].length < 12 || Buffer.byteLength(password, 'utf8') > 72) {
      throw new Error('Password harus 12 karakter atau lebih dan maksimal 72 byte UTF-8.');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    conn = await pool.getConnection();

    const [lockRows] = await conn.query('SELECT GET_LOCK(?, 10) AS acquired', [BOOTSTRAP_LOCK]);
    if (Number(lockRows[0]?.acquired) !== 1) throw new Error('Bootstrap admin sedang berjalan di sesi lain.');
    lockAcquired = true;

    if (action === '--reset-password') {
      await conn.beginTransaction();
      let transactionOpen = true;
      try {
        const [admins] = await conn.query(
          "SELECT id FROM users WHERE email = ? AND role = 'admin' FOR UPDATE",
          [email]
        );
        if (admins.length === 0) throw new Error('Akun admin tidak ditemukan.');

        await conn.query(
          'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?',
          [passwordHash, admins[0].id]
        );
        await conn.commit();
        transactionOpen = false;
        console.log('Password admin berhasil diperbarui.');
      } catch (error) {
        if (transactionOpen) await conn.rollback();
        throw error;
      }
    } else {
      const [adminRows] = await conn.query("SELECT COUNT(*) AS total FROM users WHERE role = 'admin'");
      if (Number(adminRows[0]?.total) > 0) throw new Error('Admin sudah terdaftar; bootstrap awal tidak dijalankan ulang.');

      await conn.query(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        [name, email, passwordHash, 'admin']
      );
      console.log('Admin pertama berhasil dibuat.');
    }
  } finally {
    if (lockAcquired && conn) {
      try {
        await conn.query('SELECT RELEASE_LOCK(?)', [BOOTSTRAP_LOCK]);
      } catch {
        // Releasing the connection also releases its named lock.
      }
    }
    if (conn) conn.release();
    await pool.end();
  }
}

bootstrapAdmin().catch((error) => {
  console.error(`Bootstrap admin gagal: ${error.message}`);
  process.exitCode = 1;
});
