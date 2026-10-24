// Also embedded in index.html so device and connector overlays use identical rules.
export function applyProfileEdits(payload, edits) {
  const metricKeys = ['weight','waist','bf','fat','muscle','water','visceralFat'];
  const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
  const tombs = new Set((payload.measurementTombstones || []).map(String));
  const key = item => item.id != null && item.id !== '' ? 'id:' + item.id : 'body:' + [item.date || '',item.weight ?? '',item.waist ?? '',item.bf ?? '',item.muscle ?? '',item.water ?? '',item.comment || ''].join('|');
  const measurements = new Map();
  for (const item of payload.measurements || []) {
    const previous = measurements.get(key(item));
    if (!tombs.has(key(item)) && (!previous || (Date.parse(item.updatedAt) || 0) >= (Date.parse(previous.updatedAt) || 0))) measurements.set(key(item), item);
  }
  const history = [...(payload.targetHistory || [])];
  for (const edit of [...edits].sort((a,b) => String(a.created_at).localeCompare(String(b.created_at)) || String(a.operation_id).localeCompare(String(b.operation_id)))) {
    if (edit.format !== 'nutrilog-profile-edit' || edit.version !== 1 || !/^[A-Za-z0-9_-]{8,64}$/.test(edit.operation_id || '') || !Number.isFinite(Date.parse(edit.created_at))) throw new Error('Invalid encrypted measurement or target change. Sync stopped.');
    const entry = edit.entry;
    if (edit.action === 'add_body_measurement') {
      if (!entry || entry.id !== 'chatgpt-body-' + edit.operation_id || !validDate(entry.date) || entry.updatedAt !== edit.created_at || !metricKeys.some(k => entry[k] !== undefined) || metricKeys.some(k => entry[k] !== undefined && (typeof entry[k] !== 'number' || !Number.isFinite(entry[k]) || entry[k] <= 0 || entry[k] > (['bf','water'].includes(k) ? 100 : 1000)))) throw new Error('Invalid encrypted body measurement. Sync stopped.');
      const previous = measurements.get(key(entry));
      if (!tombs.has(key(entry)) && (!previous || Date.parse(entry.updatedAt) > (Date.parse(previous.updatedAt) || 0))) measurements.set(key(entry), {...entry});
    } else if (edit.action === 'set_nutrition_targets') {
      if (!entry || !validDate(entry.effectiveDate) || entry.timestamp !== Date.parse(edit.created_at) || !['calories','protein','carbs','fat','fiber'].every(k => typeof entry[k] === 'number' && Number.isFinite(entry[k]) && entry[k] >= 0 && entry[k] <= (k === 'calories' ? 20000 : 5000)) || entry.calories <= 0) throw new Error('Invalid encrypted nutrition target. Sync stopped.');
      if (!history.some(item => item.timestamp === entry.timestamp && item.effectiveDate === entry.effectiveDate && ['calories','protein','carbs','fat','fiber'].every(k => item[k] === entry[k]))) history.push({...entry});
    } else throw new Error('Unknown encrypted profile change. Sync stopped.');
  }
  payload.measurements = [...measurements.values()];
  payload.targetHistory = history;
  return payload;
}
