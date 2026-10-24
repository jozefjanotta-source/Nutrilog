import assert from 'node:assert/strict';
import test from 'node:test';
import {handleRequest,encryptNutrilogPayload,decryptNutrilogPayload} from '../worker/index.js';
import {applyProfileEdits} from '../worker/profile.js';
const env={NUTRILOG_GIST_ID:'abc123',NUTRILOG_ENCRYPTION_KEY:'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8',NUTRILOG_OWNER_EMAIL:'owner@example.com'};
const fixture={targets:{cal:2100,prot:130,carb:250,fat:65,fiber:30},targetHistory:[{effectiveDate:'2026-10-01',calories:2100,protein:130,carbs:250,fat:65,fiber:30,timestamp:1}],measurements:[],log:{},recovery:[{comment:'private recovery'}]};
async function cloud(enabled=true){
  const files={'nutrilog.json':{content:JSON.stringify(await encryptNutrilogPayload(fixture,env.NUTRILOG_ENCRYPTION_KEY))}};
  if(enabled) files['nutrilog-connector-access.json']={content:JSON.stringify(await encryptNutrilogPayload({format:'nutrilog-connector-access',version:1,gist_id:'abc123',token:'ghp_fixtureTokenOnly'},env.NUTRILOG_ENCRYPTION_KEY))};
  const writes=[];
  const fetch=async(url,options)=>{
    if(options.method==='PATCH'){
      assert.equal(options.headers.authorization,'Bearer ghp_fixtureTokenOnly');
      const patch=JSON.parse(options.body).files;
      assert.equal(Object.keys(patch).length,1);assert.match(Object.keys(patch)[0],/^nutrilog-profile-edit-/);
      assert.equal(options.body.includes('weight'),false);assert.equal(options.body.includes('calories'),false);
      writes.push(patch);Object.assign(files,patch);
    }
    return new Response(JSON.stringify({id:'abc123',files,updated_at:'2026-10-24T10:00:00Z'}));
  };
  return {files,writes,fetch};
}
async function call(c,name,args,email=env.NUTRILOG_OWNER_EMAIL){
  const req=new Request('https://example/mcp',{method:'POST',headers:{'oai-authenticated-user-email':email},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:args}})});
  return (await (await handleRequest(req,env,c.fetch)).json()).result;
}
const add={date:'2026-10-24',operation_id:'body-test-0001',measurements:{weight_kg:104.2,waist_cm:102,body_fat_percent:22.5,visceral_fat:10}};
test('body measurements save encrypted, preserve other fields, read back and replay without duplicates',async()=>{
  const c=await cloud();const backup=c.files['nutrilog.json'].content;
  const saved=await call(c,'add_body_measurement',add);assert.equal(saved.isError,undefined);assert.equal(saved.structuredContent.measurement.weight_kg,104.2);assert.equal(saved.structuredContent.measurement.muscle_mass_kg,null);
  assert.equal(c.files['nutrilog.json'].content,backup);
  const read=await call(c,'get_latest_measurements',{});assert.equal(read.structuredContent.measurement.visceral_fat,10);
  assert.equal((await call(c,'add_body_measurement',add)).structuredContent.replayed,true);assert.equal(c.writes.length,1);
  assert.equal((await call(c,'get_measurement_history',{})).structuredContent.total_count,1);
  assert.equal((await call(c,'add_body_measurement',{...add,measurements:{weight_kg:105}})).isError,true);
  const result=JSON.stringify(saved);for(const secret of ['ghp_','private recovery','abc123'])assert.equal(result.includes(secret),false);
});
test('targets preserve macros and effective history, reject stale revisions, support future changes and retries',async()=>{
  const c=await cloud();const date='2026-10-24';
  const before=(await call(c,'get_nutrition_targets',{date})).structuredContent;
  const args={effective_date:date,operation_id:'target-test-0001',expected_revision:before.revision,targets:{calories:1900}};
  const saved=await call(c,'set_nutrition_targets',args);assert.equal(saved.isError,undefined);assert.equal(saved.structuredContent.target.calories,1900);assert.equal(saved.structuredContent.target.protein_g,130);
  assert.equal((await call(c,'get_nutrition_targets',{date:'2026-10-23'})).structuredContent.target.calories,2100);
  assert.equal((await call(c,'set_nutrition_targets',{...args,operation_id:'target-test-0002'})).isError,true);
  assert.equal((await call(c,'set_nutrition_targets',args)).structuredContent.replayed,true);
  const future=(await call(c,'get_nutrition_targets',{date:'2026-12-01'})).structuredContent;
  assert.equal((await call(c,'set_nutrition_targets',{effective_date:'2026-12-01',expected_revision:future.revision,operation_id:'target-future-01',targets:{calories:2000,protein_g:150}})).structuredContent.target.calories,2000);
  assert.equal((await call(c,'get_nutrition_targets',{date})).structuredContent.target.calories,1900);
  assert.equal((await call(c,'get_daily_nutrition',{date:'2026-12-01'})).structuredContent.target.protein_g,150);
});
test('profile writes require owner, opt-in and strictly valid explicit values',async()=>{
  const c=await cloud(false);assert.equal((await call(c,'add_body_measurement',add)).isError,true);
  const enabled=await cloud();assert.equal((await call(enabled,'add_body_measurement',add,'other@example.com')).isError,true);assert.equal(enabled.writes.length,0);
  for(const changes of [{date:'2026-02-30'},{measurements:{}},{measurements:{weight_kg:'104'}},{measurements:{weight_kg:0}},{measurements:{body_fat_percent:101}},{measurements:{weight_kg:104,token:'secret'}},{unexpected:true}]) assert.equal((await call(enabled,'add_body_measurement',{...add,...changes})).isError,true);
  assert.equal(enabled.writes.length,0);
});
test('saved-but-response-lost retries are idempotent; failed PATCH and unverifiable saves report errors',async()=>{
  const c=await cloud();const fetch=c.fetch;let lost=true;
  c.fetch=async(u,o)=>{const r=await fetch(u,o);if(o.method==='PATCH'&&lost){lost=false;throw Error('Response lost');}return r;};
  assert.equal((await call(c,'add_body_measurement',add)).isError,true);
  assert.equal((await call(c,'add_body_measurement',add)).structuredContent.replayed,true);assert.equal(c.writes.length,1);
  for(const mode of ['forbidden','unverified']){const c=await cloud();const fetch=c.fetch;c.fetch=(u,o)=>o.method==='PATCH'?new Response('{}',{status:mode==='forbidden'?403:200}):fetch(u,o);assert.equal((await call(c,'add_body_measurement',add)).isError,true);}
});
test('profile overlays preserve later edits and tombstones, and fail closed on corrupt files',async()=>{
  const c=await cloud();await call(c,'add_body_measurement',add);
  const edit=await decryptNutrilogPayload(JSON.parse(Object.values(c.writes[0])[0].content),env.NUTRILOG_ENCRYPTION_KEY);
  const local={...edit.entry,weight:103,updatedAt:'2099-01-01T00:00:00Z'};
  const p=applyProfileEdits({measurements:[local],targetHistory:[]},[edit,edit]);
  assert.equal(p.measurements.length,1);assert.equal(p.measurements[0].weight,103);
  const deleted=applyProfileEdits({measurementTombstones:['id:'+edit.entry.id]},[edit]);assert.equal(deleted.measurements.length,0);
  assert.throws(()=>applyProfileEdits({},[{...edit,action:'unknown'}]));
  c.files['nutrilog-profile-edit-broken-01.json']={content:'{"bad":true}'};
  assert.equal((await call(c,'add_body_measurement',{...add,operation_id:'body-test-0002'})).isError,true);assert.equal(c.writes.length,1);
});
