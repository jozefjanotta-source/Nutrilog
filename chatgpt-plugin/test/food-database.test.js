import assert from "node:assert/strict";
import test from "node:test";

import {
  decryptNutrilogPayload,
  decryptNutrilogText,
  encryptNutrilogPayload,
  encryptNutrilogText,
  handleRequest,
  parseFoodDatabase,
  searchFoodDatabase,
} from "../worker/index.js";

const env = {
  NUTRILOG_GIST_ID: "abc123",
  NUTRILOG_ENCRYPTION_KEY: "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8",
  NUTRILOG_OWNER_EMAIL: "owner@example.com",
};
const baseCsv = [
  "Food list;Amount;Unit;Calories;Fats;Carbs;Prots;Fiber;Source;Source ID",
  "Oats;100;g;380;7;62;13;10;Manufacturer label;label-oats",
  "Whole milk;100;ml;64;3.6;4.7;3.3;0;Manufacturer label;label-milk",
  "Egg;1;pc;72;4.8;0.4;6.3;0;USDA;171287",
  "",
].join("\n");
const payload = { targets: { cal: 2100 }, log: {}, customFoods: [
  { name: "Cottage light", cal: 77, prot: 11, carb: 2.8, fat: 2.4, fiber: 0, unit: "g" },
] };

function request(name, args) {
  return new Request("https://example/mcp", {
    method: "POST",
    headers: { "oai-authenticated-user-email": env.NUTRILOG_OWNER_EMAIL },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } }),
  });
}

async function fakeCloud() {
  const files = {
    "nutrilog.json": { content: JSON.stringify(await encryptNutrilogPayload(payload, env.NUTRILOG_ENCRYPTION_KEY)) },
    "foods.csv": { content: JSON.stringify(await encryptNutrilogText(baseCsv, env.NUTRILOG_ENCRYPTION_KEY)) },
    "nutrilog-connector-access.json": { content: JSON.stringify(await encryptNutrilogPayload({
      format: "nutrilog-connector-access", version: 1, gist_id: "abc123", token: "ghp_fixtureTokenOnly",
    }, env.NUTRILOG_ENCRYPTION_KEY)) },
  };
  const calls = [];
  const fetch = async (url, options) => {
    calls.push({ url, options });
    if (options.method === "PATCH") {
      assert.equal(options.headers.authorization, "Bearer ghp_fixtureTokenOnly");
      Object.assign(files, JSON.parse(options.body).files);
    }
    return new Response(JSON.stringify({ id: "abc123", updated_at: "2026-10-11T06:00:00Z", files }), { status: 200 });
  };
  return { files, calls, fetch };
}

async function call(cloud, name, args) {
  return (await (await handleRequest(request(name, args), env, cloud.fetch)).json()).result;
}

test("food database parser normalizes grams, millilitres and per-item rows", () => {
  const parsed = parseFoodDatabase(baseCsv);
  assert.equal(parsed.rows.length, 3);
  assert.deepEqual(parsed.rows.map(row => [row.name, row.basis_amount, row.unit, row.calories]), [
    ["Oats", 100, "g", 380], ["Whole milk", 100, "ml", 64], ["Egg", 1, "pc", 72],
  ]);
  assert.equal(searchFoodDatabase(parsed.rows, payload.customFoods, "milk", 20)[0].source_id, "label-milk");
  assert.equal(searchFoodDatabase(parsed.rows, payload.customFoods, "cottage", 20)[0].source_type, "custom");
});

test("search tool returns only matching normalized foods", async () => {
  const cloud = await fakeCloud();
  const result = await call(cloud, "search_food_database", { query: "oat" });
  assert.equal(result.isError, undefined);
  assert.equal(result.structuredContent.count, 1);
  assert.equal(result.structuredContent.items[0].name, "Oats");
  assert.equal(JSON.stringify(result).includes("Whole milk"), false);
});

const newFood = {
  operation_id: "database-add-0001", name: "Example protein yoghurt", basis_amount: 100, unit: "g",
  calories: 72, protein_g: 10.5, carbs_g: 5.1, fat_g: 0.8, fiber_g: 0,
  source: "Manufacturer label", source_id: "example-label-2026-10",
};

test("adds one encrypted reusable food and makes retries idempotent", async () => {
  const cloud = await fakeCloud();
  const result = await call(cloud, "add_food_to_database", newFood);
  assert.equal(result.isError, undefined);
  assert.equal(result.structuredContent.saved, true);
  assert.equal(result.structuredContent.food.name, newFood.name);
  const patch = cloud.calls.find(call => call.options.method === "PATCH");
  const written = JSON.parse(patch.options.body).files;
  assert.deepEqual(Object.keys(written).sort(), ["foods.csv", "nutrilog-food-database-database-add-0001.json"]);
  assert.equal(JSON.stringify(written).includes(newFood.name), false);
  const csv = await decryptNutrilogText(JSON.parse(cloud.files["foods.csv"].content), env.NUTRILOG_ENCRYPTION_KEY);
  assert.equal(parseFoodDatabase(csv).rows.some(food => food.name === newFood.name), true);
  const operation = await decryptNutrilogPayload(JSON.parse(cloud.files["nutrilog-food-database-database-add-0001.json"].content), env.NUTRILOG_ENCRYPTION_KEY);
  assert.equal(operation.action, "add_food_to_database");

  const replay = await call(cloud, "add_food_to_database", newFood);
  assert.equal(replay.structuredContent.replayed, true);
  assert.equal(cloud.calls.filter(call => call.options.method === "PATCH").length, 1);
  const conflict = await call(cloud, "add_food_to_database", { ...newFood, calories: 73 });
  assert.equal(conflict.isError, true);
  assert.match(conflict.content[0].text, /already used/);
});

test("rejects duplicate names and invalid database values before writing", async () => {
  const cloud = await fakeCloud();
  const duplicate = await call(cloud, "add_food_to_database", { ...newFood, operation_id: "database-add-0002", name: "  oats " });
  assert.equal(duplicate.isError, true);
  assert.match(duplicate.content[0].text, /already exists/);
  const before = cloud.calls.length;
  const invalid = await call(cloud, "add_food_to_database", { ...newFood, operation_id: "database-add-0003", basis_amount: 0 });
  assert.equal(invalid.isError, true);
  assert.equal(cloud.calls.length, before);
});
