const MCP_VERSION = "2026-07-28";
const MAX_REQUEST_BYTES = 64 * 1024;
const MAX_GIST_BYTES = 5 * 1024 * 1024;
const MAX_ITEMS_PER_DAY = 500;
const ENCRYPTED_FORMAT = "nutrilog-encrypted";
const ENCRYPTED_VERSION = 1;
const GIST_OWNER = "jozefjanotta-source";
const ACCESS_FILE = "nutrilog-connector-access.json";
const EDIT_PREFIX = "nutrilog-food-edit-";
const MAX_EDIT_FILES = 1000;
const MEALS = ["Breakfast", "Lunch", "Dinner", "Snack"];
const NUTRITION_FIELDS = { calories: "cal", protein_g: "prot", carbs_g: "carb", fat_g: "fat", fiber_g: "fiber" };
const FOOD_FIELDS = {
  name: { type: "string", minLength: 1, maxLength: 200 },
  meal: { type: "string", enum: MEALS },
  amount: { type: "string", minLength: 1, maxLength: 100, description: "Portion label, e.g. 150g or 1 serving." },
  ...Object.fromEntries(Object.keys(NUTRITION_FIELDS).map(key => [key, { type: "number", minimum: 0, maximum: key === "calories" ? 20000 : 5000, description: "Total for the logged portion, not per 100g. Use supplied values or a verified label; disclose estimates." }])),
};
const OPERATION_PROPERTY = { type: "string", pattern: "^[A-Za-z0-9_-]{8,64}$", description: "Unique operation ID. Reuse the identical ID and arguments when retrying an uncertain save; use a new ID for a new user request." };

const TOOL = {
  name: "get_daily_nutrition",
  description:
    "Read meals and nutrition totals for one calendar date from the owner's synced Nutrilog diary. This tool is read-only and never returns weight, body measurements, recovery, goals, or raw sync data.",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      date: {
        type: "string",
        pattern: "^\\d{4}-\\d{2}-\\d{2}$",
        description:
          "Calendar date in YYYY-MM-DD form. For 'today', use the user's local date.",
      },
    },
    required: ["date"],
  },
};

const RANGE_PROPERTIES = {
  from: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$", description: "Inclusive start date, YYYY-MM-DD." },
  to: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$", description: "Inclusive end date, YYYY-MM-DD. Use the user's local date for today." },
};
const TOOLS = [
  TOOL,
  {
    name: "get_latest_measurements",
    description: "Read the latest synced body measurement on or before an optional date. Returns weight in kg, waist in cm, body fat and water percentages, fat and muscle mass in kg, and visceral fat only if recorded. Missing values are null; includes the measurement date and backup update time. Read-only.",
    inputSchema: { type: "object", additionalProperties: false, properties: { to: RANGE_PROPERTIES.to } },
  },
  {
    name: "get_measurement_history",
    description: "Read dated body measurements and legacy weight-only records, oldest first, with optional inclusive date filters. Use offset and limit for pagination. Missing values are null. Read-only; omits comments, recovery, goals and raw backup data.",
    inputSchema: { type: "object", additionalProperties: false, properties: {
      ...RANGE_PROPERTIES,
      limit: { type: "integer", minimum: 1, maximum: 1000, default: 100 },
      offset: { type: "integer", minimum: 0, default: 0 },
    } },
  },
  {
    name: "get_weight_progress",
    description: "Compare first and last recorded values of body metrics within an optional inclusive date range. Returns dated endpoints, change (last minus first), and sample counts per metric; does not infer fat or muscle changes from weight alone. Reads the full filtered history without pagination. Read-only.",
    inputSchema: { type: "object", additionalProperties: false, properties: RANGE_PROPERTIES },
  },
  {
    name: "get_food_editing_status",
    description: "Check whether the owner enabled ChatGPT food editing in Nutrilog Settings. Returns only enabled state, never credentials. Read-only.",
    inputSchema: { type: "object", additionalProperties: false, properties: {} },
  },
  {
    name: "add_food_log",
    description: "Add one food entry to the owner's encrypted Nutrilog diary ONLY when the user asks to log food. All nutrition numbers are totals for the stated portion. Ask about ambiguous food, date, portion or nutrition; disclose estimates. Saves an encrypted change that appears in Nutrilog on its next Pull or auto-sync. Reuse operation_id on retries to prevent duplicates. Does not change targets, measurements, the food database or existing entries.",
    inputSchema: { type: "object", additionalProperties: false, properties: {
      date: RANGE_PROPERTIES.from, operation_id: OPERATION_PROPERTY, ...FOOD_FIELDS,
    }, required: ["date", "operation_id", "name", "meal", "amount", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g"] },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "update_food_log",
    description: "Change exactly one existing food entry ONLY when the user requests it. First read get_daily_nutrition to obtain its entry_id and revision; resolve duplicate/ambiguous names before writing. Rejects stale revisions. Supply changed portion totals, or portion_multiplier plus a new amount to scale all existing nutrition. Date is the entry's current date; this tool does not move or delete entries. Encrypted changes merge into Nutrilog on its next sync. Reuse operation_id and identical arguments on retries.",
    inputSchema: { type: "object", additionalProperties: false, properties: {
      date: RANGE_PROPERTIES.from, operation_id: OPERATION_PROPERTY,
      entry_id: { type: "string", minLength: 1, maxLength: 2000 },
      expected_revision: { type: "string", pattern: "^[a-f0-9]{64}$" },
      changes: { type: "object", additionalProperties: false, minProperties: 1, properties: {
        ...FOOD_FIELDS, portion_multiplier: { type: "number", exclusiveMinimum: 0, maximum: 100, description: "Scales every existing nutrition total. Requires a new amount label; cannot be combined with explicit nutrition totals." },
      } },
    }, required: ["date", "operation_id", "entry_id", "expected_revision", "changes"] },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
  },
].map((tool) => ({ ...tool, annotations: tool.annotations ?? { readOnlyHint: true, destructiveHint: false, openWorldHint: false } }));

const page = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Nutrilog private connector</title>
    <style>
      :root { color-scheme: light dark; font-family: system-ui, sans-serif; }
      body { display: grid; min-height: 100vh; margin: 0; place-items: center; background: #101612; }
      main { max-width: 38rem; margin: 1rem; padding: 2rem; border: 1px solid #3c4b41; border-radius: 1rem; background: #172019; color: #f3f7f4; }
      h1 { margin-top: 0; font-size: 1.55rem; }
      p { color: #c7d1ca; line-height: 1.55; }
      strong { color: #7ee2a8; }
    </style>
  </head>
  <body>
    <main>
      <h1>Nutrilog private connector</h1>
      <p><strong>Nutrilog remains the primary application.</strong></p>
      <p>This private connector lets ChatGPT read diary days, body measurements and progress. When you enable food editing in Nutrilog Settings, ChatGPT can also add or change food entries you request. Updates appear in Nutrilog on its next sync.</p>
    </main>
  </body>
</html>`;

function jsonResponse(value, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "private, no-store",
      ...extraHeaders,
    },
  });
}

function rpcResult(id, result) {
  return jsonResponse({ jsonrpc: "2.0", id, result });
}

function rpcError(id, code, message, status = 200) {
  return jsonResponse({ jsonrpc: "2.0", id: id ?? null, error: { code, message } }, status);
}

function text(value, maxLength = 200) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value) {
  return Math.round((number(value) + Number.EPSILON) * 10) / 10;
}

function validDate(date) {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T12:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === date;
}

function base64UrlToBytes(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error("The Nutrilog encryption key or encrypted payload is invalid.");
  }
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  let binary;
  try {
    binary = atob(padded);
  } catch {
    throw new Error("The Nutrilog encryption key or encrypted payload is invalid.");
  }
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function bytesToBase64Url(bytes) {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function importEncryptionKey(encodedKey, usage) {
  const rawKey = base64UrlToBytes(encodedKey);
  if (rawKey.byteLength !== 32) throw new Error("The Nutrilog encryption key must be 32 bytes.");
  return crypto.subtle.importKey("raw", rawKey, { name: "AES-GCM" }, false, [usage]);
}

export async function encryptNutrilogPayload(payload, encodedKey, randomValues = crypto.getRandomValues.bind(crypto)) {
  const key = await importEncryptionKey(encodedKey, "encrypt");
  const iv = new Uint8Array(12);
  randomValues(iv);
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  return {
    format: ENCRYPTED_FORMAT,
    version: ENCRYPTED_VERSION,
    algorithm: "A256GCM",
    iv: bytesToBase64Url(iv),
    ciphertext: bytesToBase64Url(new Uint8Array(ciphertext)),
  };
}

export async function decryptNutrilogPayload(envelope, encodedKey) {
  if (
    !envelope ||
    envelope.format !== ENCRYPTED_FORMAT ||
    envelope.version !== ENCRYPTED_VERSION ||
    envelope.algorithm !== "A256GCM"
  ) {
    throw new Error("The configured Gist is not an encrypted Nutrilog backup.");
  }
  const key = await importEncryptionKey(encodedKey, "decrypt");
  const iv = base64UrlToBytes(envelope.iv);
  if (iv.byteLength !== 12) throw new Error("The encrypted Nutrilog backup has an invalid IV.");
  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      base64UrlToBytes(envelope.ciphertext),
    );
    return JSON.parse(new TextDecoder().decode(plaintext));
  } catch {
    throw new Error("Unable to decrypt Nutrilog. Check the encryption key and Gist ID.");
  }
}

function normalizeTargetEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  const effectiveDate = text(
    entry.effectiveDate ?? entry.effective_from ?? entry.date ?? entry.from ?? entry.startDate,
    10,
  );
  const calories = number(
    entry.calories ??
      entry.cal ??
      entry.targetCal ??
      entry.targetCalories ??
      entry.calorieTarget ??
      entry.kcal ??
      entry.value ??
      entry.targetValue ??
      entry.targets?.cal ??
      (typeof entry.target === "object" ? entry.target.cal : entry.target),
  );
  if (!validDate(effectiveDate) || calories <= 0) return null;
  return {
    effectiveDate,
    calories: round(calories),
    protein_g: round(entry.protein ?? entry.prot ?? entry.targets?.prot),
    carbs_g: round(entry.carbs ?? entry.carb ?? entry.targets?.carb),
    fat_g: round(entry.fat ?? entry.targets?.fat),
    fiber_g: round(entry.fiber ?? entry.targets?.fiber),
    timestamp: number(entry.timestamp ?? entry.ts),
  };
}

function targetForDate(payload, date) {
  const candidates = [
    ...(Array.isArray(payload.targetHistory) ? payload.targetHistory : []),
    ...(Array.isArray(payload.calorieTargetHistory) ? payload.calorieTargetHistory : []),
    ...(Array.isArray(payload.decision?.targetHistory) ? payload.decision.targetHistory : []),
  ]
    .map(normalizeTargetEntry)
    .filter((entry) => entry && entry.effectiveDate <= date)
    .sort(
      (a, b) =>
        a.effectiveDate.localeCompare(b.effectiveDate) || a.timestamp - b.timestamp,
    );

  if (candidates.length) {
    const { timestamp, ...target } = candidates.at(-1);
    void timestamp;
    return { ...target, source: "target_history" };
  }

  const current = payload.targets;
  if (!current || typeof current !== "object") return null;
  return {
    calories: round(current.cal),
    protein_g: round(current.prot),
    carbs_g: round(current.carb),
    fat_g: round(current.fat),
    fiber_g: round(current.fiber),
    source: "current_snapshot",
  };
}

export function dailyNutrition(payload, date, sourceUpdatedAt = null) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("The Nutrilog Gist does not contain a JSON object.");
  }
  if (!validDate(date)) throw new Error("date must be a real date in YYYY-MM-DD form.");

  const rawItems = foodEntries(payload, date);
  if (rawItems.length > MAX_ITEMS_PER_DAY) {
    throw new Error("The requested day contains too many diary rows to return safely.");
  }

  const items = rawItems
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      entry_id: String(item.id),
      name: text(item.name),
      meal: text(item.meal, 50),
      amount: text(item.amountLabel, 100),
      calories: round(item.cal),
      protein_g: round(item.prot),
      carbs_g: round(item.carb),
      fat_g: round(item.fat),
      fiber_g: round(item.fiber),
    }));

  const totals = items.reduce(
    (sum, item) => ({
      calories: round(sum.calories + item.calories),
      protein_g: round(sum.protein_g + item.protein_g),
      carbs_g: round(sum.carbs_g + item.carbs_g),
      fat_g: round(sum.fat_g + item.fat_g),
      fiber_g: round(sum.fiber_g + item.fiber_g),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 },
  );

  return {
    date,
    logged: items.length > 0,
    item_count: items.length,
    items,
    totals,
    target: targetForDate(payload, date),
    source_updated_at: sourceUpdatedAt,
  };
}

const METRICS = {
  weight_kg: "weight", waist_cm: "waist", body_fat_percent: "bf",
  fat_mass_kg: "fat", muscle_mass_kg: "muscle", body_water_percent: "water",
  visceral_fat: "visceralFat",
};

function optionalNumber(value) {
  if (value === null || value === undefined || value === "" || typeof value === "boolean") return null;
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && !value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? round(parsed) : null;
}

// Match the app's tombstone keys without returning IDs or comments.
function bodyKey(item) {
  if (item.id !== null && item.id !== undefined && item.id !== "") return "id:" + String(item.id);
  return "body:" + [item.date || "", item.weight ?? "", item.waist ?? "", item.bf ?? "",
    item.muscle ?? "", item.water ?? "", item.comment || ""].join("|");
}

function validateMeasurementArgs(name, args = {}) {
  const allowed = name === "get_latest_measurements" ? ["to"]
    : name === "get_measurement_history" ? ["from", "to", "limit", "offset"] : ["from", "to"];
  if (!args || typeof args !== "object" || Array.isArray(args) || Object.keys(args).some((key) => !allowed.includes(key))) {
    throw new Error("Unexpected measurement arguments.");
  }
  for (const key of ["from", "to"]) {
    if (args[key] !== undefined && (typeof args[key] !== "string" || !validDate(args[key]))) {
      throw new Error(`${key} must be a real date in YYYY-MM-DD form.`);
    }
  }
  if (args.from && args.to && args.from > args.to) throw new Error("from must be on or before to.");
  if (args.limit !== undefined && (!Number.isInteger(args.limit) || args.limit < 1 || args.limit > 1000)) {
    throw new Error("limit must be an integer from 1 to 1000.");
  }
  if (args.offset !== undefined && (!Number.isSafeInteger(args.offset) || args.offset < 0)) {
    throw new Error("offset must be a nonnegative safe integer.");
  }
  return args;
}

export function measurementRecords(payload, args = {}) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("The Nutrilog Gist does not contain a JSON object.");
  const tombs = new Set((Array.isArray(payload.measurementTombstones) ? payload.measurementTombstones : []).map(String));
  const byKey = new Map();
  for (const item of Array.isArray(payload.measurements) ? payload.measurements : []) {
    if (!item || typeof item !== "object" || !validDate(item.date) || tombs.has(bodyKey(item))) continue;
    const current = byKey.get(bodyKey(item));
    const stamp = Date.parse(item.updatedAt) || 0;
    if (!current || stamp >= (Date.parse(current.updatedAt) || 0)) byKey.set(bodyKey(item), item);
  }
  const rows = [...byKey.values()].sort((a, b) => a.date.localeCompare(b.date)
    || (Date.parse(a.updatedAt) || 0) - (Date.parse(b.updatedAt) || 0)
    || number(a.id) - number(b.id)).map((item) => {
      const record = { date: item.date, source: "body_measurement" };
      for (const [field, key] of Object.entries(METRICS)) record[field] = optionalNumber(item[key]);
      return record;
    }).filter((record) => Object.keys(METRICS).some((key) => record[key] !== null));
  const dates = new Set(rows.map((row) => row.date));
  // The app has a separate older weight diary. Use it only for dates without body records.
  for (const [date, value] of Object.entries(payload.weight || {})) {
    const weight = optionalNumber(value);
    if (!validDate(date) || weight === null || dates.has(date)) continue;
    rows.push({ date, source: "weight_diary", ...Object.fromEntries(Object.keys(METRICS).map((key) => [key, null])), weight_kg: weight });
  }
  return rows.filter((row) => (!args.from || row.date >= args.from) && (!args.to || row.date <= args.to))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function latestMeasurements(payload, args = {}, sourceUpdatedAt = null) {
  validateMeasurementArgs("get_latest_measurements", args);
  const rows = measurementRecords(payload, args);
  return { found: rows.length > 0, measurement: rows.at(-1) ?? null, source_updated_at: sourceUpdatedAt };
}

export function measurementHistory(payload, args = {}, sourceUpdatedAt = null) {
  validateMeasurementArgs("get_measurement_history", args);
  const rows = measurementRecords(payload, args);
  const offset = args.offset ?? 0, limit = args.limit ?? 100;
  const items = rows.slice(offset, offset + limit);
  const hasMore = offset + items.length < rows.length;
  return { from: args.from ?? null, to: args.to ?? null, total_count: rows.length,
    count: items.length, offset, limit, has_more: hasMore, next_offset: hasMore ? offset + items.length : null,
    measurements: items, source_updated_at: sourceUpdatedAt };
}

export function weightProgress(payload, args = {}, sourceUpdatedAt = null) {
  validateMeasurementArgs("get_weight_progress", args);
  const rows = measurementRecords(payload, args);
  const metrics = {};
  for (const field of Object.keys(METRICS)) {
    const samples = rows.filter((row) => row[field] !== null);
    const first = samples[0], last = samples.at(-1);
    metrics[field] = { sample_count: samples.length,
      first: first ? { date: first.date, value: first[field] } : null,
      last: last ? { date: last.date, value: last[field] } : null,
      change: samples.length >= 2 ? round(last[field] - first[field]) : null };
  }
  return { from: args.from ?? null, to: args.to ?? null, record_count: rows.length,
    first_date: rows[0]?.date ?? null, last_date: rows.at(-1)?.date ?? null,
    metrics, source_updated_at: sourceUpdatedAt };
}

function legacyFoodKey(date, item) {
  return [item.date || date, item.name || "", item.meal || "", item.amountLabel || "",
    item.cal ?? "", item.prot ?? "", item.carb ?? "", item.fat ?? "", item.fiber ?? ""].join("|");
}
function normalizedFood(item, date, index) {
  return { ...item, date: item.date || date, id: item.id || "legacy:" + legacyFoodKey(date, item) + "|" + index };
}
function foodDeleted(payload, entry) {
  return Object.entries(payload.tombstones || {}).some(([date, tombs]) => (Array.isArray(tombs) ? tombs : []).some(t =>
    t.id && String(t.id) === String(entry.id) || (!t.id || String(t.id).startsWith("legacy:")) && String(entry.id).startsWith("legacy:") && t.key === legacyFoodKey(date, entry)));
}
export function foodEntries(payload, date) {
  return (Array.isArray(payload.log?.[date]) ? payload.log[date] : []).map((item, index) =>
    item && typeof item === "object" ? normalizedFood(item, date, index) : null).filter(item => item && !foodDeleted(payload, item));
}
export async function foodEntryRevision(entry) {
  // The app supplies fallback timestamps to old rows. Exclude timestamps so the
  // same legacy entry has the same revision on the server and every device.
  const value = JSON.stringify([entry.id, entry.date, entry.name, entry.meal, entry.amountLabel,
    entry.cal, entry.prot, entry.carb, entry.fat, entry.fiber ?? 0]);
  return digest(value);
}
async function digest(value) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, "0")).join("");
}
async function dailyNutritionWithRevisions(payload, date, updatedAt) {
  const result = dailyNutrition(payload, date, updatedAt);
  const entries = foodEntries(payload, date);
  for (let i = 0; i < result.items.length; i++) result.items[i].revision = await foodEntryRevision(entries[i]);
  return result;
}
function exactObject(value, allowed, message) {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).some(k => !allowed.includes(k))) throw new Error(message);
}
function strictText(value, max, label) {
  if (typeof value !== "string" || !value.trim() || value.length > max || /[\u0000-\u001f]/.test(value)) throw new Error(`${label} must be nonempty text of at most ${max} characters.`);
}
export function validateFoodArgs(name, args) {
  const update = name === "update_food_log";
  exactObject(args, update ? ["date", "operation_id", "entry_id", "expected_revision", "changes"] : ["date", "operation_id", ...Object.keys(FOOD_FIELDS)], "Unexpected food arguments.");
  if (!validDate(args.date)) throw new Error("date must be a real date in YYYY-MM-DD form.");
  if (typeof args.operation_id !== "string" || !/^[A-Za-z0-9_-]{8,64}$/.test(args.operation_id)) throw new Error("operation_id must contain 8–64 letters, digits, underscores or hyphens.");
  const fields = update ? args.changes : args;
  if (update) {
    strictText(args.entry_id, 2000, "entry_id");
    if (typeof args.expected_revision !== "string" || !/^[a-f0-9]{64}$/.test(args.expected_revision)) throw new Error("Read the current entry revision before editing.");
    exactObject(fields, [...Object.keys(FOOD_FIELDS), "portion_multiplier"], "Unexpected food changes.");
    if (!Object.keys(fields).length) throw new Error("Supply at least one food change.");
  }
  for (const key of ["name", "amount"]) if (!update || fields[key] !== undefined) strictText(fields[key], key === "name" ? 200 : 100, key);
  if ((!update || fields.meal !== undefined) && !MEALS.includes(fields.meal)) throw new Error("meal must be Breakfast, Lunch, Dinner or Snack.");
  for (const key of Object.keys(NUTRITION_FIELDS)) {
    const value = fields[key], max = key === "calories" ? 20000 : 5000;
    if ((!update || value !== undefined) && (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > max)) throw new Error(`${key} must be a number from 0 to ${max}, for the logged portion.`);
  }
  if (fields.portion_multiplier !== undefined) {
    if (typeof fields.portion_multiplier !== "number" || !Number.isFinite(fields.portion_multiplier) || fields.portion_multiplier <= 0 || fields.portion_multiplier > 100 || !fields.amount || Object.keys(NUTRITION_FIELDS).some(k => fields[k] !== undefined)) throw new Error("portion_multiplier must be greater than 0 and at most 100, requires amount, and cannot accompany explicit nutrition totals.");
  }
}
async function gistFileText(file, config, fetchImpl, headers = {}) {
  if (!file) throw new Error("The requested encrypted connector file is missing.");
  if (!file.truncated && typeof file.content === "string") return file.content;
  const url = new URL(file.raw_url);
  const parts = url.pathname.split("/");
  if (url.protocol !== "https:" || url.hostname !== "gist.githubusercontent.com" || parts[1].toLowerCase() !== GIST_OWNER || parts[2] !== config.gistId) throw new Error("GitHub returned an unexpected connector file URL.");
  // Never forward the GitHub token to the raw-file host.
  return fetchTextWithLimit(url.toString(), { "user-agent": "nutrilog-private-chatgpt-connector" }, fetchImpl);
}
async function decodedGistFile(file, config, fetchImpl) {
  return decryptNutrilogPayload(JSON.parse(await gistFileText(file, config, fetchImpl)), config.encryptionKey);
}
export function applyFoodEdits(payload, edits) {
  payload.log ||= {};
  const byId = new Map();
  for (const date of Object.keys(payload.log)) for (const entry of foodEntries(payload, date)) {
    const current = byId.get(String(entry.id));
    if (!current || (Date.parse(entry.updatedAt) || 0) >= (Date.parse(current.updatedAt) || 0)) byId.set(String(entry.id), entry);
  }
  for (const edit of edits.sort((a, b) => a.created_at.localeCompare(b.created_at) || a.operation_id.localeCompare(b.operation_id))) {
    const entry = edit.entry;
    if (!entry || !validDate(entry.date) || !entry.id || !Number.isFinite(Date.parse(entry.updatedAt))) throw new Error("An encrypted food change is invalid. No data was modified.");
    if (foodDeleted(payload, entry)) continue;
    const current = byId.get(String(entry.id));
    // Stable IDs and latest timestamps keep app edits, moves and deletions.
    if (!current || (Date.parse(entry.updatedAt) || 0) > (Date.parse(current.updatedAt) || 0)) byId.set(String(entry.id), { ...entry });
  }
  const log = {};
  for (const entry of byId.values()) (log[entry.date] ||= []).push(entry);
  payload.log = log;
  return payload;
}
async function applyGistFoodEdits(payload, gist, encryptionKey, fetchImpl) {
  if (gist.truncated) throw new Error("GitHub returned an incomplete file list. No data was modified.");
  const names = Object.keys(gist.files || {}).filter(name => name.startsWith(EDIT_PREFIX) && name.endsWith(".json"));
  if (names.length > MAX_EDIT_FILES) throw new Error("The connector food-change history is full. No data was modified.");
  const config = { encryptionKey, gistId: String(gist.id || "") };
  const edits = [];
  // Bounded parallel batches avoid hundreds of simultaneous raw-file requests.
  for (let i = 0; i < names.length; i += 10) {
    const batch = await Promise.all(names.slice(i, i + 10).map(async name => {
      const edit = await decodedGistFile(gist.files[name], config, fetchImpl);
      if (edit.format !== "nutrilog-food-edit" || edit.version !== 1 || !["add_food_log", "update_food_log"].includes(edit.action) || !/^[A-Za-z0-9_-]{8,64}$/.test(edit.operation_id || "") || !Number.isFinite(Date.parse(edit.created_at))) throw new Error("An encrypted food change is invalid.");
      return edit;
    }));
    edits.push(...batch);
  }
  applyFoodEdits(payload, edits);
}
async function writeAccess(config, snapshot, fetchImpl) {
  if (!snapshot.gist?.files?.[ACCESS_FILE]) throw new Error("Food editing is not enabled. In Nutrilog Settings, tap Enable ChatGPT food editing, then retry.");
  const access = await decodedGistFile(snapshot.gist.files[ACCESS_FILE], config, fetchImpl);
  return accessToken(access, config);
}
function accessToken(access, config) {
  if (!access || access.format !== "nutrilog-connector-access" || access.version !== 1 || access.gist_id !== config.gistId || typeof access.token !== "string" || !/^(ghp_|github_pat_)[A-Za-z0-9_]+$/.test(access.token) || access.token.length > 255) throw new Error("ChatGPT food editing connection is invalid. Enable it again in Nutrilog Settings.");
  return access.token;
}
async function saveFoodEdit(config, snapshot, name, args, fetchImpl) {
  const token = await writeAccess(config, snapshot, fetchImpl);
  const requestHash = await digest(JSON.stringify([name, args.date, args.entry_id ?? null, args.expected_revision ?? null,
    Object.keys(name === "add_food_log" ? FOOD_FIELDS : args.changes).sort().map(key => [key, name === "add_food_log" ? args[key] : args.changes[key]])]));
  const filename = EDIT_PREFIX + args.operation_id + ".json";
  const previous = snapshot.gist.files[filename];
  if (previous) {
    const edit = await decodedGistFile(previous, config, fetchImpl);
    if (edit.request_hash !== requestHash) throw new Error("This operation_id was already used for different changes. Use a new operation_id.");
    return foodEditResult(snapshot.payload, args.date, edit.entry, true, snapshot.updatedAt);
  }
  if (Object.keys(snapshot.gist.files).filter(k => k.startsWith(EDIT_PREFIX)).length >= MAX_EDIT_FILES) throw new Error("The connector food-change history is full. No data was modified.");
  let entry;
  const now = new Date().toISOString();
  if (name === "add_food_log") {
    if (foodEntries(snapshot.payload, args.date).length >= MAX_ITEMS_PER_DAY) throw new Error("This day already contains the maximum number of entries.");
    entry = { id: "chatgpt-" + args.operation_id, date: args.date, updatedAt: now };
  } else {
    const current = foodEntries(snapshot.payload, args.date).find(item => String(item.id) === args.entry_id);
    if (!current) throw new Error("The food entry was removed or moved. Read the diary again before editing.");
    if (await foodEntryRevision(current) !== args.expected_revision) throw new Error("The food entry changed since it was read. Read the diary again before editing.");
    entry = { ...current, updatedAt: new Date(Math.max(Date.now(), (Date.parse(current.updatedAt) || 0) + 1)).toISOString() };
  }
  const fields = name === "add_food_log" ? args : args.changes;
  for (const key of ["name", "meal", "amount"]) if (fields[key] !== undefined) entry[key === "amount" ? "amountLabel" : key] = fields[key].trim();
  for (const [key, field] of Object.entries(NUTRITION_FIELDS)) {
    if (fields[key] !== undefined) entry[field] = fields[key];
    if (fields.portion_multiplier !== undefined) {
      const value = (entry[field] ?? (field === "fiber" ? 0 : NaN)) * fields.portion_multiplier;
      if (!Number.isFinite(value) || value < 0 || value > (field === "cal" ? 20000 : 5000)) throw new Error("Scaled nutrition is missing or outside the supported range. Supply explicit portion totals instead.");
      entry[field] = round(value);
    }
  }
  const edit = { format: "nutrilog-food-edit", version: 1, action: name, operation_id: args.operation_id,
    request_hash: requestHash, created_at: entry.updatedAt, entry };
  const envelope = await encryptNutrilogPayload(edit, config.encryptionKey);
  const content = JSON.stringify(envelope);
  const response = await fetchImpl(`https://api.github.com/gists/${encodeURIComponent(config.gistId)}`, {
    method: "PATCH", redirect: "manual", signal: AbortSignal.timeout(20000),
    headers: { accept: "application/vnd.github+json", "content-type": "application/json", authorization: "Bearer " + token,
      "user-agent": "nutrilog-private-chatgpt-connector", "x-github-api-version": "2022-11-28" },
    body: JSON.stringify({ files: { [filename]: { content } } }),
  });
  if (!response.ok) throw new Error(response.status === 401 || response.status === 403
    ? "GitHub refused the save. Check that your token has gist permission, then enable ChatGPT editing again in Nutrilog Settings."
    : `GitHub returned ${response.status}. Retry with the same operation_id and identical arguments to avoid duplicates.`);
  // Do not trust a success status alone: verify the immutable encrypted operation.
  const verified = await readNutrilogGist(config, fetchImpl);
  const saved = verified.gist?.files?.[filename];
  if (!saved || (await decodedGistFile(saved, config, fetchImpl)).request_hash !== requestHash) throw new Error("Save could not be verified. Retry with the same operation_id and identical arguments.");
  return foodEditResult(verified.payload, args.date, entry, false, verified.updatedAt);
}
async function foodEditResult(payload, date, entry, replayed, updatedAt) {
  const data = await dailyNutritionWithRevisions(payload, date, updatedAt);
  const item = data.items.find(item => item.entry_id === String(entry.id));
  return { content: [{ type: "text", text: `${replayed ? "Already saved" : "Saved"}: ${entry.name} (${entry.amountLabel}) on ${date}. Open or Pull Nutrilog to sync it to your device.` }],
    structuredContent: { saved: true, replayed, date, entry: item ?? null, totals: data.totals, sync: "encrypted_cloud_change", device_sync_required: true } };
}

function configuration(env) {
  const gistId = text(env.NUTRILOG_GIST_ID, 100);
  const encryptionKey = text(env.NUTRILOG_ENCRYPTION_KEY, 100);
  const ownerEmail = text(env.NUTRILOG_OWNER_EMAIL, 320).toLowerCase();
  if (!gistId || !encryptionKey || !ownerEmail) {
    throw new Error(
      "Connector configuration is incomplete. Set NUTRILOG_GIST_ID, NUTRILOG_ENCRYPTION_KEY, and NUTRILOG_OWNER_EMAIL as hosted runtime values.",
    );
  }
  if (!/^[a-f0-9]+$/i.test(gistId)) throw new Error("NUTRILOG_GIST_ID is invalid.");
  if (!/^[A-Za-z0-9_-]{43}$/.test(encryptionKey)) throw new Error("NUTRILOG_ENCRYPTION_KEY is invalid.");
  return { gistId, encryptionKey, ownerEmail };
}

function authorize(request, ownerEmail) {
  const callerEmail = text(request.headers.get("oai-authenticated-user-email"), 320).toLowerCase();
  if (!callerEmail || callerEmail !== ownerEmail) {
    throw new Error("This Nutrilog connector is restricted to its owner.");
  }
}

async function fetchTextWithLimit(url, headers, fetchImpl) {
  const response = await fetchImpl(url, { method: "GET", headers, redirect: "manual", signal: AbortSignal.timeout(20000) });
  if (!response.ok) {
    const error = new Error(`GitHub returned ${response.status} while reading the Nutrilog Gist.`);
    error.status = response.status;
    throw error;
  }
  const declaredLength = number(response.headers.get("content-length"));
  if (declaredLength > MAX_GIST_BYTES) throw new Error("The Nutrilog Gist is too large to read safely.");
  const body = await response.text();
  if (new TextEncoder().encode(body).byteLength > MAX_GIST_BYTES) {
    throw new Error("The Nutrilog Gist is too large to read safely.");
  }
  return body;
}

export async function readNutrilogGist(config, fetchImpl = fetch) {
  const headers = {
    accept: "application/vnd.github+json",
    "user-agent": "nutrilog-private-chatgpt-connector",
    "x-github-api-version": "2022-11-28",
  };
  const apiUrl = `https://api.github.com/gists/${encodeURIComponent(config.gistId)}`;
  let rawGist;
  try {
    rawGist = await fetchTextWithLimit(apiUrl, headers, fetchImpl);
  } catch (error) {
    if (error.status !== 403 && error.status !== 429) throw error;
    // Bootstrap from the encrypted access file without exposing or caching its
    // credential. Then fetch the complete file list with authenticated limits.
    // Never fall back to just nutrilog.json: that would hide pending food edits.
    try {
      const rawUrl = `https://gist.githubusercontent.com/${GIST_OWNER}/${encodeURIComponent(config.gistId)}/raw/${ACCESS_FILE}`;
      const accessText = await fetchTextWithLimit(rawUrl, { "user-agent": headers["user-agent"] }, fetchImpl);
      const access = await decryptNutrilogPayload(JSON.parse(accessText), config.encryptionKey);
      const token = accessToken(access, config);
      rawGist = await fetchTextWithLimit(apiUrl, { ...headers, authorization: "Bearer " + token }, fetchImpl);
    } catch {
      throw new Error("GitHub is temporarily rate limited and an enabled editing connection could not be used. No food was modified. Check the token in Nutrilog Settings or try again shortly.");
    }
  }
  let gist;
  try {
    gist = JSON.parse(rawGist);
  } catch {
    throw new Error("GitHub returned an invalid Gist response.");
  }

  const file = gist.files?.["nutrilog.json"];
  if (!file) throw new Error("The configured Gist does not contain nutrilog.json.");
  let content = file.content;
  if (file.truncated) {
    const rawUrl = new URL(file.raw_url);
    if (rawUrl.protocol !== "https:" || rawUrl.hostname !== "gist.githubusercontent.com") {
      throw new Error("GitHub returned an unexpected raw Gist URL.");
    }
    content = await fetchTextWithLimit(rawUrl.toString(), headers, fetchImpl);
  }
  if (typeof content !== "string") throw new Error("nutrilog.json has no readable content.");

  let envelope;
  try {
    envelope = JSON.parse(content);
  } catch {
    throw new Error("nutrilog.json is not valid JSON.");
  }
  const payload = await decryptNutrilogPayload(envelope, config.encryptionKey);
  await applyGistFoodEdits(payload, gist, config.encryptionKey, fetchImpl);
  return { payload, updatedAt: text(gist.updated_at, 40) || null, gist };
}

function toolSuccess(data) {
  const summary = data.logged
    ? `${data.item_count} item${data.item_count === 1 ? "" : "s"}, ${data.totals.calories} kcal on ${data.date}.`
    : `No food is logged for ${data.date}.`;
  return {
    content: [{ type: "text", text: summary }],
    structuredContent: data,
  };
}

function toolFailure(message) {
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}

async function mcp(request, env, fetchImpl) {
  let body;
  try {
    const declaredLength = number(request.headers.get("content-length"));
    if (declaredLength > MAX_REQUEST_BYTES) return rpcError(null, -32600, "Request is too large.", 413);
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_REQUEST_BYTES) {
      return rpcError(null, -32600, "Request is too large.", 413);
    }
    body = JSON.parse(raw);
  } catch {
    return rpcError(null, -32700, "Invalid JSON.", 400);
  }

  if (!body || body.jsonrpc !== "2.0" || typeof body.method !== "string") {
    return rpcError(body?.id, -32600, "Invalid JSON-RPC request.", 400);
  }

  if (body.method === "server/discover") {
    return rpcResult(body.id, {
      supportedVersions: [MCP_VERSION],
      capabilities: { tools: {} },
    });
  }

  if (body.method === "tools/list") {
    return rpcResult(body.id, { tools: TOOLS });
  }

  if (body.method !== "tools/call") return rpcError(body.id, -32601, "Method not found.");

  const name = body.params?.name;
  if (!TOOLS.some((tool) => tool.name === name)) return rpcError(body.id, -32602, "Unknown tool.");
  const args = body.params?.arguments ?? {};
  try {
    if (name === TOOL.name) {
      if (!args || typeof args !== "object" || Array.isArray(args) || Object.keys(args).some((key) => key !== "date") || typeof args.date !== "string" || !validDate(args.date)) {
        throw new Error("date must be a real date in YYYY-MM-DD form.");
      }
    } else if (name === "get_food_editing_status") {
      if (!args || typeof args !== "object" || Array.isArray(args) || Object.keys(args).length) throw new Error("Unexpected editing status arguments.");
    } else if (name === "add_food_log" || name === "update_food_log") validateFoodArgs(name, args);
    else validateMeasurementArgs(name, args);
  } catch (error) {
    return rpcResult(body.id, toolFailure(error.message));
  }

  try {
    const config = configuration(env);
    authorize(request, config.ownerEmail);
    const snapshot = await readNutrilogGist(config, fetchImpl);
    const { payload, updatedAt } = snapshot;
    if (name === "get_food_editing_status") {
      const enabled = !!snapshot.gist?.files?.[ACCESS_FILE];
      return rpcResult(body.id, { content: [{ type: "text", text: enabled ? "Food editing is enabled." : "Open Nutrilog Settings and tap Enable ChatGPT food editing first." }], structuredContent: { enabled } });
    }
    if (name === "add_food_log" || name === "update_food_log") return rpcResult(body.id, await saveFoodEdit(config, snapshot, name, args, fetchImpl));
    if (name === TOOL.name) return rpcResult(body.id, toolSuccess(await dailyNutritionWithRevisions(payload, args.date, updatedAt)));
    const operation = { get_latest_measurements: latestMeasurements, get_measurement_history: measurementHistory, get_weight_progress: weightProgress }[name];
    const data = operation(payload, args, updatedAt);
    const summary = name === "get_latest_measurements"
      ? data.found ? `Latest synced body measurement: ${data.measurement.date}.` : "No body measurements are synced."
      : name === "get_measurement_history" ? `${data.count} of ${data.total_count} measurement records.`
      : `Progress across ${data.record_count} measurement records.`;
    return rpcResult(body.id, { content: [{ type: "text", text: summary }], structuredContent: data });
  } catch (error) {
    return rpcResult(body.id, toolFailure(error instanceof Error ? error.message : "Unable to read Nutrilog."));
  }
}

export async function handleRequest(request, env = {}, fetchImpl = fetch) {
  const url = new URL(request.url);
  if (url.pathname === "/" && request.method === "GET") {
    return new Response(page, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "private, no-store",
        "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
        "x-content-type-options": "nosniff",
      },
    });
  }
  if (url.pathname === "/health" && request.method === "GET") {
    return jsonResponse({
      ok: true,
      configured: Boolean(
        env.NUTRILOG_GIST_ID &&
          env.NUTRILOG_ENCRYPTION_KEY &&
          env.NUTRILOG_OWNER_EMAIL,
      ),
    });
  }
  if (url.pathname === "/mcp" && request.method === "POST") return mcp(request, env, fetchImpl);
  return new Response("Not found", { status: 404 });
}

export default {
  async fetch(request, env) {
    return handleRequest(request, env);
  },
};
