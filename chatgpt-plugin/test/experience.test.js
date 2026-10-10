import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {NutritionExperience as NX} from '../shared/experience.js';
import {handleRequest,encryptNutrilogPayload,decryptNutrilogPayload,foodEntryRevision,registryCSV,applyExperienceEdit} from '../worker/index.js';
const key='AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8';
const env={NUTRILOG_GIST_ID:'abc123',NUTRILOG_ENCRYPTION_KEY:key,NUTRILOG_OWNER_EMAIL:'owner@example.com'};
const entry={id:'fixture-row',date:'2026-10-09',name:'Oats',meal:'Breakfast',amountLabel:'100g',cal:380,prot:13,carb:62,fat:7,fiber:10,updatedAt:'2026-10-09T08:00:00Z'};
const payload={targets:{cal:2100},log:{'2026-10-09':[entry]},customFoods:[],measurements:[{date:'2026-10-03',weight:106,waist:106},{date:'2026-10-10',weight:105.3,waist:105}]};
const csv='Food list;Amount;Unit;Calories;Fats;Carbs;Prots;Fiber;Source;Source ID\n"Steak; ""raw""";250;g;300;8;0;55;0;label;x\nMilk;200;ml;100;3;10;6;0;label;y';
async function encryptedCSV(value){
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const k=await crypto.subtle.importKey('raw',Buffer.from(key,'base64url'),{name:'AES-GCM'},false,['encrypt']);
  const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv},k,new TextEncoder().encode(value));
  return JSON.stringify({format:'nutrilog-encrypted',version:1,algorithm:'A256GCM',iv:Buffer.from(iv).toString('base64url'),ciphertext:Buffer.from(encrypted).toString('base64url')});
}
async function cloud(){
  const files={'nutrilog.json':{content:JSON.stringify(await encryptNutrilogPayload(payload,key))},
    'foods.csv':{content:await encryptedCSV(csv)},
    'nutrilog-connector-access.json':{content:JSON.stringify(await encryptNutrilogPayload({format:'nutrilog-connector-access',version:1,gist_id:'abc123',token:'ghp_fixtureTokenOnly'},key))}};
  const calls=[];
  const fetch=async(url,options)=>{
    calls.push({url,options});
    if(options.method==='PATCH'){
      assert.equal(options.headers.authorization,'Bearer ghp_fixtureTokenOnly');
      const changes=JSON.parse(options.body).files;
      assert.equal(Object.keys(changes).length,1);
      assert.equal(options.body.includes('ghp_fixtureTokenOnly'),false);
      Object.assign(files,changes);
    }
    return new Response(JSON.stringify({id:'abc123',updated_at:new Date().toISOString(),files}),{status:200});
  };
  return {files,calls,fetch};
}
async function call(c,name,args){
  const request=new Request('https://example/mcp',{method:'POST',headers:{'oai-authenticated-user-email':'owner@example.com'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:args}})});
  return (await (await handleRequest(request,env,c.fetch)).json()).result;
}
const add={date:'2026-10-09',operation_id:'fixture-food-add',name:'Photo meal',meal:'Dinner',amount:'1 plate',calories:600,protein_g:40,carbs_g:50,fat_g:25,fiber_g:5,nutrition_source:'estimated',source_note:'Portion and oil estimated from photo',weight_basis:'cooked'};
test('complete-day averages exclude partial and missing days and invalidate after correction',()=>{
  const log={'2026-10-09':[entry],'2026-10-08':[{...entry,id:'partial',date:'2026-10-08',cal:50}]};
  const days={'2026-10-09':{complete:true,signature:NX.signature([entry]),updatedAt:'2026-10-10T12:00:00Z'}};
  const review=NX.review(log,days,'2026-10-10',()=>({cal:2100}));
  assert.equal(review.from,'2026-10-03');assert.equal(review.to,'2026-10-09');
  assert.equal(review.complete_days,1);assert.equal(review.partial_days,1);assert.equal(review.unlogged_days,5);
  assert.equal(review.average.cal,380);assert.equal(review.average_target,2100);
  assert.equal(NX.status({'2026-10-09':[{...entry,cal:381}]},days,'2026-10-09'),'partial');
  assert.throws(()=>NX.review(log,days,'2026-10-11',()=>({cal:2100})),/Saturday/);
});
test('registry merge keeps new local foods and respects deletion on every device',()=>{
  const old={id:'custom-a',name:'A',cal:100,updatedAt:'2026-10-09T00:00:00Z'};
  const next={...old,cal:120,updatedAt:'2026-10-10T00:00:00Z'};
  assert.equal(NX.mergeFoods([next],[old])[0].cal,120);
  assert.deepEqual(NX.mergeFoods([next],[old],{'custom-a':'2026-10-10T12:00:00Z'}),[]);
  assert.equal(NX.normalizeFood({name:'Steak (raw)'}).weightBasis,'raw');
});
test('live encrypted CSV preserves quoted names and distinguishes ml from grams',async()=>{
  const c=await cloud(),result=await call(c,'search_food_registry',{query:'',limit:30});
  assert.equal(result.isError,undefined);
  assert.equal(result.structuredContent.foods.length,2);
  const [steak,milk]=result.structuredContent.foods;
  assert.equal(steak.name,'Steak; "raw"');assert.equal(steak.calories,120);assert.equal(steak.weight_basis,'raw');
  assert.equal(milk.unit,'ml');assert.equal(milk.reference_amount,100);assert.equal(milk.calories,50);
  assert.equal(registryCSV(csv)[0].prot,22);
  for(const secret of ['ghp_','recovery','measurements'])assert.equal(JSON.stringify(result).includes(secret),false);
});
test('registry addition is encrypted, idempotent and reusable without rewriting the backup',async()=>{
  const c=await cloud(),before=c.files['nutrilog.json'].content;
  const args={operation_id:'fixture-registry-add',name:'Label yoghurt',reference_amount:200,unit:'g',weight_basis:'as_sold',nutrition_source:'label',source_note:'Package label per 200g',calories:150,protein_g:20,carbs_g:10,fat_g:3,fiber_g:0};
  const result=await call(c,'save_food_to_registry',args);assert.equal(result.isError,undefined);
  assert.equal(result.structuredContent.food.calories,75);
  assert.equal(c.files['nutrilog.json'].content,before);
  assert.equal((await call(c,'save_food_to_registry',args)).structuredContent.replayed,true);
  const found=await call(c,'search_food_registry',{query:'yoghurt'});
  const food=found.structuredContent.foods[0];
  const log={operation_id:'fixture-registry-log',date:'2026-10-09',meal:'Snack',food_id:food.food_id,expected_food_revision:food.revision,quantity:100};
  const saved=await call(c,'log_registered_food',log);assert.equal(saved.isError,undefined);
  assert.equal(saved.structuredContent.entry.calories,75);assert.equal(saved.structuredContent.entry.nutrition_source,'label');
  assert.equal((await call(c,'log_registered_food',log)).structuredContent.replayed,true);
  assert.equal((await call(c,'log_registered_food',{...log,quantity:150})).isError,true);
});
test('registered logging refuses changed nutrition and bad units before writing',async()=>{
  const c=await cloud();const search=await call(c,'search_food_registry',{query:'milk'}),food=search.structuredContent.foods[0];
  c.files['foods.csv'].content=await encryptedCSV(csv.replace('Milk;200;ml;100','Milk;200;ml;200'));
  const result=await call(c,'log_registered_food',{operation_id:'fixture-stale-log',date:'2026-10-09',meal:'Snack',food_id:food.food_id,expected_food_revision:food.revision,quantity:100});
  assert.equal(result.isError,true);assert.equal(c.calls.filter(x=>x.options.method==='PATCH').length,0);
  assert.equal((await call(c,'save_food_to_registry',{operation_id:'fixture-invalid'})).isError,true);
});
test('completion checks the exact day and later additions reopen it',async()=>{
  const c=await cloud(),read=await call(c,'get_daily_nutrition',{date:'2026-10-09'});
  const args={date:'2026-10-09',operation_id:'fixture-day-complete',complete:true,expected_day_revision:read.structuredContent.day_revision};
  assert.equal((await call(c,'set_day_complete',args)).isError,undefined);
  assert.equal((await call(c,'get_daily_nutrition',{date:args.date})).structuredContent.day_status,'complete');
  await call(c,'add_food_log',add);
  assert.equal((await call(c,'get_daily_nutrition',{date:args.date})).structuredContent.day_status,'partial');
  assert.equal((await call(c,'set_day_complete',{...args,operation_id:'fixture-stale-day'})).isError,true);
  const review=await call(c,'get_weekly_review',{review_date:'2026-10-10'});
  assert.equal(review.structuredContent.average,null);assert.equal(review.structuredContent.complete_days,0);
  assert.equal(review.structuredContent.measurements.metrics.weight_kg.change,-0.7);
});
test('undo addition removes only that entry; stale undo refuses later corrections',async()=>{
  const c=await cloud(),added=await call(c,'add_food_log',add);
  assert.equal(added.isError,undefined);
  const undo={date:add.date,operation_id:'fixture-undo-add',original_operation_id:add.operation_id,expected_revision:added.structuredContent.entry.revision};
  const result=await call(c,'undo_food_change',undo);assert.equal(result.isError,undefined);
  assert.equal(result.structuredContent.day.item_count,1);
  assert.equal((await call(c,'undo_food_change',undo)).structuredContent.replayed,true);
  const added2=await call(c,'add_food_log',{...add,operation_id:'fixture-second-add'});
  const e=added2.structuredContent.entry;
  await call(c,'update_food_log',{date:add.date,operation_id:'fixture-later-correction',entry_id:e.entry_id,expected_revision:e.revision,changes:{amount:'half plate',portion_multiplier:0.5}});
  assert.equal((await call(c,'undo_food_change',{date:add.date,operation_id:'fixture-stale-undo',original_operation_id:'fixture-second-add',expected_revision:e.revision})).isError,true);
});
test('undo correction restores original nutrition and source',async()=>{
  const c=await cloud();
  const updated=await call(c,'update_food_log',{date:entry.date,operation_id:'fixture-correction',entry_id:entry.id,expected_revision:await foodEntryRevision(entry),changes:{amount:'50g',portion_multiplier:0.5,nutrition_source:'user'}});
  assert.equal(updated.isError,undefined);
  const undone=await call(c,'undo_food_change',{date:entry.date,operation_id:'fixture-undo-correction',original_operation_id:'fixture-correction',expected_revision:updated.structuredContent.entry.revision});
  assert.equal(undone.isError,undefined);
  assert.equal(undone.structuredContent.day.items[0].calories,380);
});
test('PATCH response verifies a committed save despite a stale public GET',async()=>{
  const c=await cloud(),original=c.fetch;let patched=false;
  const old=structuredClone(c.files);
  c.fetch=async(url,options)=>{
    if(options.method==='PATCH'){patched=true;return original(url,options);}
    if(patched)return new Response(JSON.stringify({id:'abc123',files:old}),{status:200});
    return original(url,options);
  };
  const result=await call(c,'add_food_log',add);
  assert.equal(result.isError,undefined);assert.equal(result.structuredContent.saved,true);
  assert.equal(c.calls.filter(c=>c.options.method==='GET').length,1);
});
test('app and connector embed identical completion rules and all app code compiles',async()=>{
  const core=await readFile(new URL('../shared/experience.js',import.meta.url),'utf8');
  const source=core.replace(/\nexport \{NutritionExperience\};\n$/,'');
  for(const path of ['../../index.html','../worker/index.js']){
    const text=await readFile(new URL(path,import.meta.url),'utf8');assert.ok(text.includes(source));
    if(path.endsWith('html'))for(const match of text.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(match[1]);
  }
});

test('registry identifiers survive nutrition changes and custom overrides hide stale base records',async()=>{
  const original=registryCSV(csv)[1],changed=registryCSV(csv.replace('Milk;200;ml;100','Milk;200;ml;200'))[1];
  assert.equal(original.id,changed.id);
  const c=await cloud();
  const overridden={...original,cal:90,nutritionSource:'label',updatedAt:'2026-10-10T12:00:00Z'};
  c.files['nutrilog.json'].content=JSON.stringify(await encryptNutrilogPayload({...payload,customFoods:[overridden]},key));
  const result=await call(c,'search_food_registry',{query:'milk'});
  assert.equal(result.structuredContent.foods.length,1);
  assert.equal(result.structuredContent.foods[0].calories,90);
});
