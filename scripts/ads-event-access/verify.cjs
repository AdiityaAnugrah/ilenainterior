const assert = require('node:assert/strict'), path = require('node:path');
const root = path.resolve(__dirname, '../..'), mode = process.argv[2] || 'modified';
const target = process.argv[3] ? path.resolve(process.argv[3]) : root;
const dep = name => require(require.resolve(name, { paths: [path.join(root, 'backend')] }));
const express = dep('express'), request = dep('supertest'), jwt = dep('jsonwebtoken');
let role = 'ads_analyst', status = 'active';
let values = { meta_pixel_id: '123456789', meta_capi_enabled: 'true', meta_capi_access_token: 'FIXTURE_TOKEN_123', meta_capi_test_event_code: 'TEST123' };
const query = async (sql, params) => {
  if (sql.includes('FROM users WHERE id')) return [[{ role, status }]];
  if (sql.startsWith('INSERT INTO settings')) { values[params[0]] = params[1]; return [{}]; }
  return [Object.entries(values).map(([key,value]) => ({key,value}))];
};
const pool = { query, getConnection: async () => ({ query, release() {}, beginTransaction: async () => {}, commit: async () => {}, rollback: async () => {} }) };
const db = path.join(root, 'backend/src/config/db.js'); require.cache[db] = { id:db, filename:db, loaded:true, exports:pool };
const Module = require('node:module'), originalResolve = Module._resolveFilename;
const deps = { express: require.resolve('express', {paths:[path.join(root,'backend')]}) };
Module._resolveFilename = function(name,parent,...args) {
  if (name === '../config/db') return db;
  if (name === '../middleware/adminAuth' || name === '../middleware/roleAuth') return path.join(root, 'backend/src/middleware', name.split('/').at(-1) + '.js');
  if (name === '../services/metaCapi') return path.join(target, 'backend/src/services/metaCapi.js');
  if (deps[name]) return deps[name];
  return originalResolve.call(this,name,parent,...args);
};
process.env.JWT_SECRET = 'fixture-secret'; process.env.CLIENT_URL = 'https://shop.example';
const calls=[]; global.fetch=async(url,opts)=>{ calls.push(JSON.parse(opts.body)); return {ok:true,json:async()=>({events_received:1})}; };
const token = jwt.sign({id:42},process.env.JWT_SECRET);
const app=express(); app.use(express.json());
app.use('/api/admin/meta-capi',require(path.join(target,'backend/src/routes/metaCapi.js')).admin);
const auth = method => request(app)[method]('/api/admin/meta-capi').set('Authorization','Bearer '+token);
(async()=>{
  await auth('get').expect(mode === 'modified' ? 200 : 403);
  if(mode !== 'modified') { console.log(`${mode.toUpperCase()}: PASS; analyst CAPI=403; previous permissions restored`); process.exit(0); }
  const config={meta_pixel_id:'123456789',meta_capi_enabled:true,meta_capi_access_token:'',meta_capi_test_event_code:'TEST123',meta_page_view_enabled:false,meta_lead_enabled:false};
  const read = await auth('get').expect(200); assert.ok(!JSON.stringify(read.body).includes('FIXTURE_TOKEN_123'));
  await auth('put').send(config).expect(200); assert.equal(values.meta_lead_enabled,'false'); assert.equal(values.meta_capi_access_token,'FIXTURE_TOKEN_123');
  const capi = require(path.join(target,'backend/src/services/metaCapi.js'));
  assert.deepEqual(await capi.sendLead(values,{}),{skipped:true});
  assert.deepEqual(await capi.sendPageView(values,{}),{skipped:true});
  await request(app).post('/api/admin/meta-capi/test').set('Authorization','Bearer '+token).send({event_name:'Lead'}).expect(200);
  assert.equal(calls.at(-1).data[0].event_name,'Lead'); assert.equal(calls.at(-1).test_event_code,'TEST123');
  await request(app).post('/api/admin/meta-capi/test').set('Authorization','Bearer '+token).send({event_name:'Purchase'}).expect(400);
  await auth('put').send({...config,meta_lead_enabled:'yes'}).expect(400);
  app.use('/api/admin/marketing-settings',require(path.join(root,'backend/src/routes/marketingSettings.js')));
  const marketing=()=>request(app).put('/api/admin/marketing-settings').set('Authorization','Bearer '+token);
  await marketing().send({google_tag_manager_id:'GTM-TEST123',google_analytics_id:'G-TEST123',tiktok_pixel_id:'ABCDEFG123'}).expect(200);
  assert.equal(values.google_tag_manager_id,'GTM-TEST123');
  await marketing().send({smtp_pass:'not-allowed'}).expect(400);
  await marketing().send({google_tag_manager_id:'<script>'}).expect(400);
  app.use('/api/admin',require(path.join(root,'backend/src/routes/admin.js')));
  await request(app).put('/api/admin/settings').set('Authorization','Bearer '+token).send({key:'smtp_pass',value:'x'}).expect(403);
  await request(app).get('/api/admin/users').set('Authorization','Bearer '+token).expect(403);
  status='blocked'; await auth('get').expect(403); status='active'; role='user'; await auth('get').expect(403); await auth('put').send(config).expect(403);
  await request(app).get('/api/admin/meta-capi').expect(401);
  role='admin'; await auth('get').expect(200);
  console.log('MODIFIED: PASS; analyst CAPI read/save=200; Lead test=200; event flags enforced; token retained/redacted; marketing whitelist enforced; general settings/users=403; blocked/customer=403; anonymous=401');
  process.exit(0);
})().catch(error=>{console.error(error);process.exit(1);});
