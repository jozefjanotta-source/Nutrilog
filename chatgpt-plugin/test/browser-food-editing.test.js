import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {encryptNutrilogPayload,decryptNutrilogPayload} from '../worker/index.js';
const html=await readFile(new URL('../../index.html',import.meta.url),'utf8');
const key='AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8';
const base={id:'row-1',date:'2026-10-10',name:'Oats',meal:'Breakfast',amountLabel:'100g',cal:380,prot:13,carb:62,fat:7,fiber:10,updatedAt:'2026-10-10T08:00:00Z'};
const edited={...base,amountLabel:'50g',cal:190,prot:6.5,carb:31,fat:3.5,fiber:5,updatedAt:'2026-10-10T09:00:00Z'};
const edit={format:'nutrilog-food-edit',version:1,action:'update_food_log',operation_id:'test-edit-0001',created_at:edited.updatedAt,entry:edited};
function range(start,end){const a=html.indexOf(start),b=html.indexOf(end,a);assert.ok(a>=0&&b>a,start);return html.slice(a,b);}
function context(){
  const elements={'chatgpt-editing-msg':{style:{}},'gist-token-input':{value:'ghp_fixtureTokenOnly'},'sync-status':{}};
  const ctx=vm.createContext({crypto:globalThis.crypto,Date,AbortController,URL,TextEncoder,TextDecoder,btoa,atob,setTimeout,clearTimeout,console,
    ENCRYPTED_GIST_FORMAT:'nutrilog-encrypted',ENCRYPTED_GIST_VERSION:1,document:{getElementById:id=>elements[id]},
    state:{log:{},tombstones:{},gistToken:'ghp_fixtureTokenOnly',gistId:'abc123',gistEncryptionKey:key},persist(){},lsSet(){},lsGet:()=> '[]',showSyncStatus(){},recordSyncSuccess(){},mergeBodyMeasurements(){},mergeRecoveryData(){},
  });
  vm.runInContext(range('const NutritionExperience =','const SK='),ctx);
  vm.runInContext(range('let experienceSyncQueue=','function foodSourceLabel'),ctx);
  vm.runInContext(range('let autoSyncTimer=null;','function mergeLogData(local'),ctx);
  ctx.navigator={onLine:true};ctx.refreshExperienceView=()=>{};ctx.mergeTargetHistory=()=>{};ctx.updateCurrentTargetsFromHistory=()=>{};ctx.saveTargetHistory=()=>{};
  vm.runInContext(range('function bytesToBase64Url(bytes)','function todayISO()'),ctx);
  vm.runInContext(range('function createLogEntryId()','state.log=normalizeLogData(state.log)'),ctx);
  vm.runInContext(range('function mergeLogData(local','function showSyncStatus(status)'),ctx);
  vm.runInContext(range('// ChatGPT saves each change separately','function applyRemotePayload(p)'),ctx);
  ctx.dataPayload=()=>({targets:{cal:2100},log:ctx.state.log,tombstones:ctx.state.tombstones});
  return {ctx,elements};
}
async function gist(){return {files:{'nutrilog.json':{content:JSON.stringify(await encryptNutrilogPayload({targets:{cal:2100},log:{'2026-10-10':[base]}},key))},'nutrilog-food-edit-test-edit-0001.json':{content:JSON.stringify(await encryptNutrilogPayload(edit,key))}}};}
test('all inline scripts compile',()=>{for(const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(match[1]);});
test('app imports encrypted connector edit once and respects later local edits and deletions',async()=>{
  const {ctx}=context();const cloud=await gist();
  let p={log:{'2026-10-10':[base]}};
  await ctx.mergeConnectorFoodEdits(p,cloud);assert.equal(p.log['2026-10-10'][0].cal,190);
  await ctx.mergeConnectorFoodEdits(p,cloud);assert.equal(p.log['2026-10-10'].length,1);
  ctx.state.log={'2026-10-10':[{...base,cal:250,updatedAt:'2026-10-10T10:00:00Z'}]};
  p=await ctx.mergeConnectorFoodEdits({log:ctx.state.log},cloud);assert.equal(p.log['2026-10-10'][0].cal,250);
  ctx.state.tombstones={'2026-10-10':[{id:base.id}]};ctx.state.log={};
  p=await ctx.mergeConnectorFoodEdits({log:{}},cloud);assert.equal(p.log['2026-10-10'],undefined);
  ctx.cleanupData();assert.equal(ctx.state.tombstones['2026-10-10'].length,1);
});
test('enabling writes only encrypted credentials; disabling removes only access file',async()=>{
  const {ctx,elements}=context();const cloud=await gist();const writes=[];
  ctx.fetch=async(url,options)=>{if(options.method==='PATCH')writes.push(JSON.parse(options.body));return new Response(JSON.stringify(cloud),{status:200});};
  await ctx.setChatGPTFoodEditing(true);assert.match(elements['chatgpt-editing-msg'].textContent,/Enabled/);
  assert.deepEqual(Object.keys(writes[0].files),['nutrilog-connector-access.json']);
  assert.equal(JSON.stringify(writes[0]).includes('ghp_fixture'),false);
  const access=await decryptNutrilogPayload(JSON.parse(writes[0].files['nutrilog-connector-access.json'].content),key);
  assert.equal(access.token,'ghp_fixtureTokenOnly');assert.equal(access.gist_id,'abc123');
  await ctx.setChatGPTFoodEditing(false);assert.equal(writes[1].files['nutrilog-connector-access.json'],null);
});
test('auto push incorporates encrypted changes before writing the backup',async()=>{
  const {ctx}=context();const cloud=await gist();let written;
  ctx.fetch=async(url,options)=>{if(options.method==='PATCH'){written=JSON.parse(options.body);return new Response('{}',{status:200});}return new Response(JSON.stringify(cloud),{status:200});};
  await ctx.silentPush();assert.ok(written);
  const p=await decryptNutrilogPayload(JSON.parse(written.files['nutrilog.json'].content),key);
  assert.equal(p.log['2026-10-10'][0].cal,190);
});
test('auto push stops rather than overwriting data when remote read or edit decryption fails',async()=>{
  for(const bad of ['http','edit']){
    const {ctx}=context();const cloud=await gist();let patched=false;
    if(bad==='edit')cloud.files['nutrilog-food-edit-test-edit-0001.json'].content='{"bad":true}';
    ctx.fetch=async(url,options)=>{if(options.method==='PATCH')patched=true;return new Response(JSON.stringify(cloud),{status:bad==='http'?403:200});};
    await ctx.silentPush();assert.equal(patched,false);
  }
});

test('queued automatic saves never overlap and preserve edits made while a save is in flight',async()=>{
  const {ctx}=context();let cloud=await gist();let active=0,maxActive=0,release,started;
  const firstStarted=new Promise(r=>started=r),gate=new Promise(r=>release=r);let writes=0;
  ctx.fetch=async(url,options)=>{
    if(options.method==='PATCH'){
      active++;maxActive=Math.max(maxActive,active);writes++;
      const body=JSON.parse(options.body);
      if(writes===1){started();await gate;}
      cloud.files['nutrilog.json']=body.files['nutrilog.json'];active--;
      return new Response(JSON.stringify(cloud),{status:200});
    }
    return new Response(JSON.stringify(cloud),{status:200});
  };
  const first=ctx.silentPush();await firstStarted;
  ctx.state.log['2026-10-10'].push({...base,id:'row-2',name:'New food',cal:100,updatedAt:'2026-10-10T12:00:00Z'});
  vm.runInContext('experienceDirty++;experiencePending=true;',ctx);
  const second=ctx.silentPush();release();await Promise.all([first,second]);
  assert.equal(maxActive,1);assert.equal(writes,2);
  const final=await decryptNutrilogPayload(JSON.parse(cloud.files['nutrilog.json'].content),key);
  assert.equal(final.log['2026-10-10'].length,2);
  assert.equal(final.log['2026-10-10'].find(e=>e.id==='row-2').cal,100);
});
test('foreground checks skip offline and hidden devices, and merge pending local foods safely',async()=>{
  const {ctx}=context();ctx.document.visibilityState='visible';
  ctx.state.targets={cal:2100};ctx.state.customFoods=[{id:'custom-local',name:'Local food',cal:100,updatedAt:'2026-10-10T12:00:00Z'}];
  vm.runInContext(range('async function pullOnReturn(force=false)','function initExperience()'),ctx);
  ctx.applyRemotePayload=p=>{ctx.state.log=ctx.mergeLogData(ctx.state.log,p.log,p.tombstones);ctx.mergeRemoteExperience(p);};
  let calls=0;const cloud=await gist();
  ctx.fetch=async()=>{calls++;return new Response(JSON.stringify(cloud),{status:200});};
  ctx.navigator.onLine=false;await ctx.pullOnReturn(true);assert.equal(calls,0);
  ctx.navigator.onLine=true;ctx.document.visibilityState='hidden';await ctx.pullOnReturn(true);assert.equal(calls,0);
  ctx.document.visibilityState='visible';await ctx.pullOnReturn(true);assert.equal(calls,1);
  assert.equal(ctx.state.log['2026-10-10'][0].cal,190);
  assert.equal(ctx.state.customFoods[0].id,'custom-local');
  // Pending union gets its own queued push, tested above; cancel its timer here.
  vm.runInContext('clearTimeout(autoSyncTimer)',ctx);
});
test('custom foods persist under the correct key and day completion persists with the diary',()=>{
  const values=new Map();const ctx=vm.createContext({state:{customFoods:[{name:'Saved food'}],dayStatus:{'2026-10-09':{complete:true}}},
    SK:{custom:'nl_custom',dayStatus:'nl_day_status'},lsSet:(k,v)=>values.set(k,v)});
  vm.runInContext(range('function persist(k)','function createLogEntryId()'),ctx);
  ctx.persist('custom');ctx.persist('dayStatus');
  assert.equal(values.get('nl_custom')[0].name,'Saved food');
  assert.equal(values.get('nl_day_status')['2026-10-09'].complete,true);
});
