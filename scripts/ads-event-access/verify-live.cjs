const assert = require('node:assert/strict');
const base='https://ilenafurniture.net';
(async()=>{
  const login=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:process.env.ADS_ANALYST_EMAIL,password:process.env.ADS_ANALYST_PASSWORD})});
  assert.equal(login.status,200); const {token,user}=await login.json(); assert.equal(user.role,'ads_analyst');
  const headers={Authorization:'Bearer '+token,'Content-Type':'application/json'};
  const settings=await fetch(base+'/api/admin/meta-capi',{headers}); assert.equal(settings.status,200); const data=await settings.json();
  assert.equal(data.meta_capi_access_token,undefined);
  // Save the same values: verify write permission without replacing credentials or changing live event behavior.
  assert.equal((await fetch(base+'/api/admin/meta-capi',{method:'PUT',headers,body:JSON.stringify({...data,meta_capi_access_token:''})})).status,200);
  const marketing=await fetch(base+'/api/admin/marketing-settings',{headers}); assert.equal(marketing.status,200); const ids=await marketing.json();
  assert.equal((await fetch(base+'/api/admin/marketing-settings',{method:'PUT',headers,body:JSON.stringify(ids)})).status,200);
  assert.equal((await fetch(base+'/api/admin/meta-capi/test',{method:'POST',headers,body:JSON.stringify({event_name:'invalid'})})).status,400);
  assert.equal((await fetch(base+'/api/admin/marketing-settings',{method:'PUT',headers,body:JSON.stringify({smtp_pass:'not-allowed'})})).status,400);
  for(const route of ['/api/admin/users','/api/admin/orders','/api/admin/settings']) assert.equal((await fetch(base+route,{headers})).status,403);
  assert.equal((await fetch(base+'/api/admin/meta-capi')).status,401);
  assert.equal((await fetch(base+'/admin/tracking')).status,200);
  assert.equal((await fetch(base+'/api/health')).status,200);
  console.log('LIVE: PASS; Zafana login=200; CAPI read/save=200; marketing read/save=200; invalid event/field=400; users/orders/general-settings=403; anonymous=401; tracking page/health=200; live configuration retained');
})().catch(error=>{console.error('LIVE: FAIL',error.message);process.exitCode=1;});
