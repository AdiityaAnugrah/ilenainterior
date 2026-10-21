const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const mode = process.argv[2] || 'modified';
const target = mode === 'modified' ? root : path.resolve(process.argv[3]);
const dep = name => require(require.resolve(name, { paths: [path.join(root, 'backend')] }));
const express = dep('express');
const request = dep('supertest');
const jwt = dep('jsonwebtoken');
let role = 'ads_analyst', status = 'active';
const queries = [];
const query = async (sql, params) => {
  queries.push({ sql, params });
  if (sql.includes('FROM users WHERE id')) return [[{ role, status }]];
  if (sql.includes('FROM settings')) return [[{ key: 'meta_pixel_id', value: '123456789' }, { key: 'meta_capi_access_token', value: 'NEVER_EXPOSE_TOKEN' }]];
  if (sql.includes('meta_event_metrics') && sql.startsWith('SELECT')) return [[]];
  return [[{}]];
};
const pool = { query, getConnection: async () => ({ query, release() {} }) };
const db = path.join(root, 'backend/src/config/db.js');
require.cache[db] = { id: db, filename: db, loaded: true, exports: pool };
const Module = require('node:module');
const resolve = Module._resolveFilename;
const jwtPath = require.resolve('jsonwebtoken', { paths: [path.join(root, 'backend')] });
Module._resolveFilename = function(name, parent, ...args) {
  if (name === '../config/db') return db;
  if (name === 'jsonwebtoken') return jwtPath;
  if (name === './roleAuth' && mode === 'rollback') return resolve.call(this, './roleAuth', { ...parent, filename: path.join(root, 'backend/src/middleware/adminAuth.js') }, ...args);
  return resolve.call(this, name, parent, ...args);
};
process.env.JWT_SECRET = 'fixture-test-secret';
const token = jwt.sign({ id: 42, role: 'admin' }, process.env.JWT_SECRET);
const app = express(); app.use(express.json());
app.get('/admin-only', require(path.join(target, 'backend/src/middleware/adminAuth.js')), (req, res) => res.json({ ok: true }));
const get = url => request(app).get(url).set('Authorization', 'Bearer ' + token);
(async () => {
  await get('/admin-only').expect(403);
  role = 'admin'; await get('/admin-only').expect(200);
  if (mode !== 'modified') {
    console.log(`${mode.toUpperCase()}: PASS; admin=200; analyst/admin-only=403; original role behavior retained`);
    process.exit(0);
  }
  const analyticsAuth = require(path.join(root, 'backend/src/middleware/roleAuth'))('admin', 'ads_analyst');
  app.get('/analytics-only', analyticsAuth, (req, res) => res.json({ role: req.user.role }));
  app.use('/api/admin', require(path.join(root, 'backend/src/routes/admin')));
  role = 'ads_analyst';
  assert.equal((await get('/analytics-only').expect(200)).body.role, 'ads_analyst');
  const ads = await get('/api/admin/ads-analytics?days=999').expect(200);
  assert.equal(ads.body.days, 90); assert.ok(!JSON.stringify(ads.body).includes('NEVER_EXPOSE_TOKEN'));
  assert.equal(ads.body.tracking.pixel_id, '123456789');
  const sales = await get('/api/admin/analytics').expect(200); assert.deepEqual(sales.body.recent_orders, []);
  for (const url of ['/api/admin/users', '/api/admin/orders', '/api/admin/products', '/api/admin/settings', '/api/admin/meta-capi', '/api/admin/audit-logs']) await get(url).expect(403);
  for (const [method, url] of [['put','/api/admin/settings'], ['put','/api/admin/users/1/role'], ['post','/api/admin/meta-capi/test'], ['delete','/api/admin/products/1']]) {
    await request(app)[method](url).set('Authorization', 'Bearer ' + token).send({ role: 'admin' }).expect(403);
  }
  status = 'blocked'; await get('/analytics-only').expect(403); await get('/api/admin/ads-analytics').expect(403);
  role = 'admin'; await get('/admin-only').expect(403);
  status = 'active'; role = 'user'; await get('/analytics-only').expect(403);
  await request(app).get('/analytics-only').expect(401);
  await request(app).get('/analytics-only').set('Authorization', 'Bearer invalid').expect(403);
  role = 'admin'; await get('/api/admin/ads-analytics').expect(200);
  const metrics = require(path.join(root, 'backend/src/services/adsAnalytics'));
  await metrics.recordEvent('Lead', 'fixture_123', 'https://shop.example/iklan?private=secret#fragment', 'sent');
  assert.deepEqual(queries.at(-1).params, ['fixture_123', 'Lead', '/iklan', 'sent']);
  assert.ok(queries.at(-1).sql.includes('ON DUPLICATE KEY UPDATE'));
  console.log('MODIFIED: PASS; analyst analytics=200; admin APIs/mutations=403; blocked/user=403; anonymous=401; DB role overrides JWT; no token/customer leakage; metrics sanitized/deduplicated');
  process.exit(0);
})().catch(error => { console.error(error); process.exit(1); });
