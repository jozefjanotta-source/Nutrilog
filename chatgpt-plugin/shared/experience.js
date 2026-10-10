// Shared deterministic data rules for the app and encrypted connector.
const NutritionExperience = (() => {
  const fields = ['id','date','name','meal','amountLabel','cal','prot','carb','fat','fiber','nutritionSource','sourceNote','weightBasis'];
  const stamp = x => Date.parse(x?.updatedAt) || 0;
  function signature(entries) {
    return JSON.stringify((entries || []).map(e => fields.map(k => e[k] ?? (['cal','prot','carb','fat','fiber'].includes(k) ? 0 : ''))).sort((a,b) => String(a[0]) < String(b[0]) ? -1 : String(a[0]) > String(b[0]) ? 1 : 0));
  }
  function status(log, days, date) {
    const mark = days?.[date];
    return mark?.complete && mark.signature === signature(log?.[date]) ? 'complete' : (log?.[date]?.length ? 'partial' : 'unlogged');
  }
  function mergeDays(local, remote) {
    const out = {...(remote || {})};
    for (const [d, v] of Object.entries(local || {})) if (!out[d] || stamp(v) >= stamp(out[d])) out[d] = v;
    return out;
  }
  function foodId(f, prefix='custom') {
    return f.id || prefix + '-legacy:' + encodeURIComponent(JSON.stringify(prefix==='db'?[f.name,f.unit || 'g',f.sourceId || '']:[f.name,f.unit || 'g',f.cal,f.prot,f.carb,f.fat,f.fiber || 0]));
  }
  function normalizeFood(f, prefix='custom') {
    return {...f, id:foodId(f,prefix), updatedAt:f.updatedAt || '1970-01-01T00:00:00.000Z',
      weightBasis:f.weightBasis || (/\braw\b/i.test(f.name) ? 'raw' : /\bcooked\b/i.test(f.name) ? 'cooked' : 'unspecified'),
      nutritionSource:f.nutritionSource || (prefix === 'db' ? 'database' : 'user'), sourceNote:f.sourceNote || f.source || ''};
  }
  function mergeFoods(local, remote, tombstones={}) {
    const out = new Map();
    for (const f of [...(remote || []),...(local || [])]) {
      const item = normalizeFood(f);
      if (tombstones[item.id]) continue;
      if (!out.has(item.id) || stamp(item) >= stamp(out.get(item.id))) out.set(item.id,item);
    }
    return [...out.values()];
  }
  function totals(entries) {
    const sum = {cal:0,prot:0,carb:0,fat:0,fiber:0};
    for (const e of entries || []) for (const k of Object.keys(sum)) sum[k] += Number(e[k]) || 0;
    return sum;
  }
  function review(log, days, saturday, targetsForDate) {
    const end = new Date(saturday + 'T12:00:00Z');
    if (Number.isNaN(+end) || end.toISOString().slice(0,10) !== saturday || end.getUTCDay() !== 6) throw new Error('Choose a real Saturday for the review date.');
    const dates = Array.from({length:7},(_,i) => new Date(+end - (7-i)*86400000).toISOString().slice(0,10));
    const complete = dates.filter(d => status(log,days,d) === 'complete');
    const partial = dates.filter(d => status(log,days,d) === 'partial');
    const average = complete.length ? totals(complete.flatMap(d => log?.[d] || [])) : null;
    if (average) for (const k of Object.keys(average)) average[k] = Math.round(average[k] / complete.length * 10) / 10;
    const targetValues = dates.map(d => targetsForDate(d)?.cal).filter(v => typeof v === 'number' && v > 0);
    return {review_date:saturday, from:dates[0], to:dates[6], complete_days:complete.length, partial_days:partial.length,
      unlogged_days:7-complete.length-partial.length, average, average_target:targetValues.length ? Math.round(targetValues.reduce((a,b)=>a+b,0)/targetValues.length) : null,
      target_days:targetValues.length, days:dates.map(date => ({date,status:status(log,days,date)}))};
  }
  return {signature,status,mergeDays,foodId,normalizeFood,mergeFoods,totals,review};
})();

export {NutritionExperience};
