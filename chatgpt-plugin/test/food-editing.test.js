import assert from 'node:assert/strict';
import test from 'node:test';
import {handleRequest, encryptNutrilogPayload, decryptNutrilogPayload, foodEntryRevision, applyFoodEdits} from '../worker/index.js';
const env={NUTRILOG_GIST_ID:'abc123',NUTRILOG_ENCRYPTION_KEY:'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8',NUTRILOG_OWNER_EMAIL:'owner@example.com'};
const entry={id:'row-1',date:'2026-10-10',name:'Oats',meal:'Breakfast',amountLabel:'100g',cal:380,prot:13,carb:62,fat:7,fiber:10,updatedAt:'2026-10-10T08:00:00Z'};
const payload={targets:{cal:2100},log:{'2026-10-10':[entry]},measurements:[{date:'2026-10-10',weight:105.3}],recovery:[{private:'untouched'}]};
function request(name,args,email=env.NUTRILOG_OWNER_EMAIL){return new Request('https://example/mcp',{method:'POST',headers:{'oai-authenticated-user-email':email},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:args}})});}
async function fakeCloud(enabled=true){
  const files={'nutrilog.json':{content:JSON.stringify(await encryptNutrilogPayload(payload,env.NUTRILOG_ENCRYPTION_KEY))}};
  if(enabled)files['nutrilog-connector-access.json']={content:JSON.stringify(await encryptNutrilogPayload({format:'nutrilog-connector-access',version:1,gist_id:'abc123',token:'ghp_fixtureTokenOnly',created_at:'2026-10-10T08:00:00Z'},env.NUTRILOG_ENCRYPTION_KEY))};
  const calls=[];
  const fetch=async(url,options)=>{calls.push({url,options});if(options.method==='PATCH'){
    assert.equal(options.headers.authorization,'Bearer ghp_fixtureTokenOnly');
    const written=JSON.parse(options.body).files;
    assert.equal(Object.keys(written).length,1);
    assert.ok(Object.keys(written)[0].startsWith('nutrilog-food-edit-'));
    assert.equal(options.body.includes('Oats'),false);
    Object.assign(files,written);
  }
  return new Response(JSON.stringify({id:'abc123',updated_at:'2026-10-10T11:00:00Z',files}),{status:200});};
  return {files,calls,fetch};
}
const add={date:'2026-10-10',operation_id:'test-add-0001',name:'Banana',meal:'Snack',amount:'120g',calories:107,protein_g:1.3,carbs_g:27.6,fat_g:0.4,fiber_g:3.1};
async function call(cloud,name,args,email){return (await (await handleRequest(request(name,args,email),env,cloud.fetch)).json()).result;}
test('add encrypted entry, verify save, preserve backup and prevent duplicate retries',async()=>{
  const cloud=await fakeCloud();const before=cloud.files['nutrilog.json'].content;
  const r=await call(cloud,'add_food_log',add);
  assert.equal(r.isError,undefined);assert.equal(r.structuredContent.saved,true);assert.equal(r.structuredContent.totals.calories,487);
  assert.equal(r.structuredContent.entry.entry_id,'chatgpt-test-add-0001');
  assert.equal(cloud.files['nutrilog.json'].content,before);
  const replay=await call(cloud,'add_food_log',{...add});assert.equal(replay.structuredContent.replayed,true);
  assert.equal(cloud.calls.filter(c=>c.options.method==='PATCH').length,1);
  const mismatch=await call(cloud,'add_food_log',{...add,calories:108});assert.equal(mismatch.isError,true);assert.match(mismatch.content[0].text,/already used/);
  const text=JSON.stringify(r);for(const secret of ['ghp_','NUTRILOG','private','recovery','105.3'])assert.equal(text.includes(secret),false);
});
test('update scales nutrition exactly and rejects a stale revision',async()=>{
  const cloud=await fakeCloud();
  const args={date:add.date,operation_id:'test-edit-0001',entry_id:entry.id,expected_revision:await foodEntryRevision(entry),changes:{amount:'50g',portion_multiplier:0.5}};
  const r=await call(cloud,'update_food_log',args);assert.equal(r.isError,undefined);assert.equal(r.structuredContent.entry.calories,190);assert.equal(r.structuredContent.entry.fiber_g,5);
  const read=await call(cloud,'get_daily_nutrition',{date:add.date});assert.equal(read.structuredContent.items[0].calories,190);assert.match(read.structuredContent.items[0].revision,/^[a-f0-9]{64}$/);
  const stale=await call(cloud,'update_food_log',{...args,operation_id:'test-edit-0002'});assert.equal(stale.isError,true);assert.match(stale.content[0].text,/changed since/);
  const replay=await call(cloud,'update_food_log',args);assert.equal(replay.structuredContent.replayed,true);
});
test('authorization and opt-in required; validation never touches cloud',async()=>{
  const cloud=await fakeCloud(false);
  const status=await call(cloud,'get_food_editing_status',{});assert.equal(status.structuredContent.enabled,false);
  const blocked=await call(cloud,'add_food_log',add);assert.equal(blocked.isError,true);assert.match(blocked.content[0].text,/not enabled/);
  const count=cloud.calls.length;
  const other=await call(cloud,'add_food_log',add,'other@example.com');assert.equal(other.isError,true);assert.equal(cloud.calls.length,count);
  for(const bad of [{...add,calories:-1},{...add,protein_g:'1'},{...add,date:'2026-02-30'},{...add,meal:'Other'},{...add,unknown:true},{...add,fiber_g:undefined}]){
    const result=await call(cloud,'add_food_log',bad);assert.equal(result.isError,true);assert.equal(cloud.calls.length,count);
  }
});
test('deleted, moved or later edited app entries are not resurrected by journal',()=>{
  const edited={...entry,cal:190,updatedAt:'2026-10-10T09:00:00Z'};
  const edit={operation_id:'fixture-1',created_at:edited.updatedAt,entry:edited};
  const moved={...entry,date:'2026-10-11',updatedAt:'2026-10-10T10:00:00Z'};
  let p=applyFoodEdits({log:{'2026-10-11':[moved]}},[edit]);assert.equal(p.log['2026-10-10'],undefined);assert.equal(p.log['2026-10-11'][0].cal,380);
  p=applyFoodEdits({log:{},tombstones:{'2026-10-10':[{id:entry.id}]}},[edit]);assert.deepEqual(p.log,{});
});
test('failed save is reported and never returns success',async()=>{
  const cloud=await fakeCloud();const fetch=cloud.fetch;cloud.fetch=(url,opts)=>opts.method==='PATCH'?new Response('Forbidden',{status:403}):fetch(url,opts);
  const r=await call(cloud,'add_food_log',add);assert.equal(r.isError,true);assert.match(r.content[0].text,/GitHub refused/);
});
test('retry after saved-but-response-lost does not duplicate entry',async()=>{
  const cloud=await fakeCloud();const fetch=cloud.fetch;let lost=true;cloud.fetch=async(url,opts)=>{const r=await fetch(url,opts);if(opts.method==='PATCH'&&lost){lost=false;throw new Error('Network response lost');}return r;};
  assert.equal((await call(cloud,'add_food_log',add)).isError,true);
  const retry=await call(cloud,'add_food_log',add);assert.equal(retry.structuredContent.replayed,true);assert.equal(retry.structuredContent.totals.calories,487);
});
