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
