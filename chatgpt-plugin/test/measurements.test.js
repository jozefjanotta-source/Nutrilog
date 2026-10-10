import assert from 'node:assert/strict';
import test from 'node:test';
import { latestMeasurements, measurementHistory, weightProgress, encryptNutrilogPayload, handleRequest } from '../worker/index.js';
const env = { NUTRILOG_GIST_ID: 'abc123', NUTRILOG_ENCRYPTION_KEY: 'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8', NUTRILOG_OWNER_EMAIL: 'owner@example.com' };
const fixture = {
  measurements: [
    { id: 1, date: '2026-09-05', weight: 103, waist: 102, bf: 22, muscle: 76, water: 55, fat: 22.7, comment: 'private', updatedAt: '2026-09-05T10:00:00Z' },
    { id: 2, date: '2026-10-10', weight: 102.1, waist: 101, bf: null, muscle: '', water: undefined, fat: null, updatedAt: '2026-10-10T09:00:00Z' },
    { id: 2, date: '2026-10-10', weight: 104, waist: 105, updatedAt: '2026-10-10T08:00:00Z' },
    { id: 3, date: '2026-10-11', weight: 999 },
    { date: '2026-02-30', weight: 110 },
    { date: ['2026-10-12'], weight: 111 },
    { id: 4, date: '2026-10-12', weight: null, waist: '' },
  ],
  measurementTombstones: ['id:3'],
  weight: { '2026-01-03': 109.6, '2026-10-10': 105, 'bad': 120, '2026-10-13': null },
  recovery: [{ sleepHours: 8 }], goalHistory: [{ phase: 'Cut' }], log: { private: [] },
};
test('latest returns dated corrected body record with null missing fields and no private metadata', () => {
  const r = latestMeasurements(fixture, {}, 'sync-time');
  assert.equal(r.measurement.date, '2026-10-10');
  assert.equal(r.measurement.weight_kg, 102.1);
  for (const k of ['body_fat_percent','fat_mass_kg','muscle_mass_kg','body_water_percent','visceral_fat']) assert.equal(r.measurement[k], null);
  assert.equal(r.source_updated_at, 'sync-time');
  for (const k of ['comment','private','updatedAt','recovery','goalHistory','tombstones','sleepHours']) assert.equal(JSON.stringify(r).includes(k), false);
  assert.equal(latestMeasurements(fixture, {to:'2026-09-30'}).measurement.date, '2026-09-05');
});
test('history includes legacy weights, pagination, dates and empty range', () => {
  const r = measurementHistory(fixture, {limit:2});
  assert.equal(r.total_count, 3);
  assert.equal(r.measurements[0].source, 'weight_diary');
  assert.equal(r.measurements[0].weight_kg, 109.6);
  assert.equal(r.has_more, true);
  assert.equal(r.next_offset, 2);
  const next = measurementHistory(fixture, {offset:2,limit:2});
  assert.equal(next.count, 1);
  assert.equal(next.has_more, false);
  assert.equal(measurementHistory(fixture, {from:'2026-09-05',to:'2026-09-05'}).count, 1);
  assert.equal(latestMeasurements(fixture,{to:'2025-01-01'}).found, false);
  assert.equal(latestMeasurements({}).measurement, null);
});
test('progress uses metric-specific dated endpoints and null for insufficient samples', () => {
  const r = weightProgress(fixture);
  assert.equal(r.metrics.weight_kg.change, -7.5);
  assert.equal(r.metrics.waist_cm.change, -1);
  assert.equal(r.metrics.waist_cm.first.date, '2026-09-05');
  assert.equal(r.metrics.muscle_mass_kg.sample_count, 1);
  assert.equal(r.metrics.muscle_mass_kg.change, null);
  assert.equal(r.metrics.visceral_fat.first, null);
  assert.equal(weightProgress(fixture,{from:'2026-09-05'}).metrics.weight_kg.change, -0.9);
});
test('tombstones without IDs follow app keys and invalid numbers stay absent', () => {
  const r = measurementHistory({measurements:[{date:'2026-10-01',weight:102,comment:'gone'}, {date:'2026-10-02',weight:101,waist:false,bf:' ',muscle:'oops'}],measurementTombstones:['body:2026-10-01|102|||||gone']});
  assert.equal(r.count, 1);
  assert.equal(r.measurements[0].waist_cm, null);
  assert.equal(r.measurements[0].body_fat_percent, null);
});
function request(name, args, email='owner@example.com') {
  return new Request('https://example/mcp', {method:'POST',headers:{'oai-authenticated-user-email':email},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:args}})});
}
test('all measurement tools authenticate and decrypt read-only before returning reduced data', async () => {
  const encrypted = await encryptNutrilogPayload(fixture,env.NUTRILOG_ENCRYPTION_KEY);
  for (const name of ['get_latest_measurements','get_measurement_history','get_weight_progress']) {
    let calls=0;
    const fetcher = async (_,opts) => {calls++; assert.equal(opts.method,'GET'); return new Response(JSON.stringify({files:{'nutrilog.json':{content:JSON.stringify(encrypted)}}}));};
    const ok = await (await handleRequest(request(name,{}),env,fetcher)).json();
    assert.equal(ok.result.isError,undefined);
    assert.ok(ok.result.structuredContent);
    const denied = await (await handleRequest(request(name,{},'other@example.com'),env,fetcher)).json();
    assert.equal(denied.result.isError,true);
    assert.equal(calls,1);
    assert.equal(JSON.stringify(ok).includes(env.NUTRILOG_ENCRYPTION_KEY),false);
  }
});
test('invalid dates, ranges, pagination and extra arguments fail before data fetch', async () => {
  const cases = [ ['get_latest_measurements',{to:'2026-02-30'}], ['get_measurement_history',{from:'2026-10-10',to:'2026-09-01'}], ['get_measurement_history',{limit:1001}], ['get_measurement_history',{offset:-1}], ['get_weight_progress',{recovery:true}], ['get_latest_measurements',{from:'2026-01-01'}], ['get_latest_measurements',[]] ];
  for (const [name,args] of cases) {
    const result = await (await handleRequest(request(name,args),env,()=>{throw Error('must not fetch');})).json();
    assert.equal(result.result.isError,true);
    assert.equal(JSON.stringify(result).includes('must not fetch'),false);
  }
});
test('progress is computed from full history even beyond the default page size', () => {
  const measurements = Array.from({length:105},(_,i)=>({date:new Date(Date.UTC(2026,0,i+1)).toISOString().slice(0,10),weight:120-i/10}));
  assert.equal(measurementHistory({measurements}).count,100);
  assert.equal(weightProgress({measurements}).metrics.weight_kg.change,-10.4);
});
