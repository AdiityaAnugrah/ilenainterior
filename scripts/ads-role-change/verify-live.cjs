const assert = require('node:assert/strict');
const base = 'https://ilenafurniture.net';
(async () => {
  assert.equal((await fetch(base + '/api/health')).status, 200);
  const response = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: process.env.ADS_ANALYST_EMAIL, password: process.env.ADS_ANALYST_PASSWORD }) });
  assert.equal(response.status, 200);
  const { token, user } = await response.json(); assert.equal(user.role, 'ads_analyst');
  const headers = { Authorization: 'Bearer ' + token };
  assert.equal((await fetch(base + '/api/auth/me', { headers })).status, 200);
  for (const route of ['/api/admin/ads-analytics', '/api/admin/analytics']) {
    const res = await fetch(base + route, { headers }); assert.equal(res.status, 200);
    const data = await res.json();
    if (route.endsWith('/analytics')) assert.deepEqual(data.recent_orders, []);
    if (route.endsWith('/ads-analytics')) {
      assert.ok(data.summary); assert.ok(data.tracking); assert.equal(data.tracking.access_token, undefined);
    }
  }
  for (const route of ['/api/admin/users', '/api/admin/orders', '/api/admin/settings', '/api/admin/audit-logs', '/api/notifications']) {
    assert.equal((await fetch(base + route, { headers })).status, 403, route);
  }
  assert.equal((await fetch(base + '/api/admin/meta-capi', { headers })).status, 200);
  assert.equal((await fetch(base + '/api/admin/marketing-settings', { headers })).status, 200);
  assert.equal((await fetch(base + '/api/admin/settings', { method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' }, body: '{}' })).status, 403);
  assert.equal((await fetch(base + '/api/admin/ads-analytics')).status, 401);
  const home = await fetch(base); assert.equal(home.status, 200);
  const css = (await home.text()).match(/href="([^" ]+\.css[^" ]*)"/); assert.ok(css);
  assert.equal((await fetch(new URL(css[1].replaceAll('&amp;', '&'), base))).status, 200);
  const page = await fetch(base + '/admin/ads'); assert.equal(page.status, 200);
  console.log('LIVE: PASS; login/me=200; role=ads_analyst; ads/sales analytics=200; management APIs/mutation=403; anonymous=401; storefront/CSS/dashboard=200');
})().catch(error => { console.error('LIVE: FAIL', error.message); process.exitCode = 1; });
