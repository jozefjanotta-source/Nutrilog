import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const html=await readFile(new URL('../../index.html',import.meta.url),'utf8');
const source=html.slice(html.indexOf('// ---- MEAL PHOTO ESTIMATES ----'),html.indexOf('// ---- SEARCH ----'));
const fixture={is_meal:true,name:'Chicken and rice',portion:'1 plate (450g)',assumptions:'Estimated 150g chicken, 250g rice, vegetables and 10g oil.',cal:760,prot:50,carb:80,fat:22,fiber:4};
function setup(fetchImpl){
  const elements=new Map();
  const el=id=>{if(!elements.has(id)){let value='';elements.set(id,{get value(){return value},set value(v){value=String(v)},style:{display:'none'},textContent:'',disabled:false,files:[]})}return elements.get(id)};
  const state={currentDate:'2026-10-16',log:{}};
  const context=vm.createContext({document:{getElementById:el},state,AbortController,setTimeout,clearTimeout,fetch:fetchImpl,createLogEntryId:()=> 'new-id',persist:()=>{},scheduleAutoSync:()=>{},jumpToDate:date=>{state.currentDate=date},switchView:()=>{},showToast:()=>{}});
  vm.runInContext(source,context);
  vm.runInContext("prepareMealPhoto=async ()=> 'data:image/jpeg;base64,fixture'",context);
  el('mp-key').value='test-session-key';
  el('mp-meal').value='Dinner';
  return {context,el,state};
}
test('photo estimate is editable and does not log until explicit save; save marks it as estimated',async()=>{
  let request;
  const {context,el,state}=setup(async(url,options)=>{request={url,options};return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify(fixture)}}]})}});
  context.openMealPhoto();
  await context.estimateMealPhoto();
  assert.deepEqual(state.log,{});
  assert.equal(el('mp-review').style.display,'block');
  assert.equal(request.url,'https://api.openai.com/v1/chat/completions');
  assert.equal(JSON.parse(request.options.body).messages[1].content[1].image_url.url,'data:image/jpeg;base64,fixture');
  el('mp-cal').value='700';
  context.saveMealPhoto();
  assert.equal(state.log['2026-10-16'].length,1);
  assert.equal(state.log['2026-10-16'][0].cal,700);
  assert.match(state.log['2026-10-16'][0].name,/photo estimate/);
  assert.equal(el('mp-key').value,'');
  assert.equal(JSON.stringify(state).includes('test-session-key'),false);
  context.saveMealPhoto();
  assert.equal(state.log['2026-10-16'].length,1);
});
test('rejects non-food, incomplete, negative and nonnumeric estimates',()=>{
  const {context}=setup();
  for(const value of [{...fixture,is_meal:false},{...fixture,name:''},{...fixture,cal:-1},{...fixture,prot:'50'},{...fixture,fat:Infinity},{...fixture,fiber:null}]){
    assert.throws(()=>context.validateMealPhotoEstimate(value));
  }
});
test('failed API response never opens review or writes a log',async()=>{
  const {context,el,state}=setup(async()=>({ok:false,status:401}));
  await context.estimateMealPhoto();
  assert.match(el('mp-status').textContent,/key was rejected/);
  assert.equal(el('mp-review').style.display,'none');
  assert.equal(el('mp-analyze').disabled,false);
  assert.deepEqual(state.log,{});
});
test('closing during analysis ignores late responses and clears credentials',async()=>{
  let resolve;
  const {context,el,state}=setup(()=>new Promise(r=>{resolve=r}));
  const pending=context.estimateMealPhoto();
  await Promise.resolve();
  context.closeMealPhoto();
  resolve({ok:true,json:async()=>({choices:[{message:{content:JSON.stringify(fixture)}}]})});
  await pending;
  assert.equal(el('mp-review').style.display,'none');
  assert.equal(el('mp-key').value,'');
  assert.deepEqual(state.log,{});
});
test('blank nutrition and impossible dates cannot be saved',async()=>{
  const {context,el,state}=setup(async()=>({ok:true,json:async()=>({choices:[{message:{content:JSON.stringify(fixture)}}]})}));
  context.openMealPhoto();await context.estimateMealPhoto();
  el('mp-prot').value='';context.saveMealPhoto();assert.deepEqual(state.log,{});
  el('mp-prot').value='50';el('mp-date').value='2026-02-30';context.saveMealPhoto();assert.deepEqual(state.log,{});
});
