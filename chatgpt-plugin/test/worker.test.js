import assert from "node:assert/strict";
import test from "node:test";

import { dailyNutrition, handleRequest, readNutrilogGist } from "../worker/index.js";

const fixture = {
  v: 3,
  targets: { cal: 2100, prot: 130, carb: 250, fat: 65, fiber: 30 },
  targetHistory: [
    {
      effectiveDate: "2026-10-01",
      calories: 2050,
      protein: 140,
      carbs: 230,
      fat: 62,
      fiber: 31,
      timestamp: 1,
    },
  ],
  log: {
    "2026-10-10": [
      {
        id: "private-row-id",
        updatedAt: "2026-10-10T07:00:00Z",
        name: "Oats",
        meal: "Breakfast",
        amountLabel: "80g",
        cal: 304.4,
        prot: 10.2,
        carb: 53.3,
        fat: 5.6,
        fiber: 8.1,
      },
      {
        name: "Yoghurt",
        meal: "Breakfast",
        amountLabel: "200g",
        cal: 120,
        prot: 20,
        carb: 8,
        fat: 0.5,
        fiber: 0,
      },
    ],
  },
  weight: { "2026-10-10": 76.4 },
  measurements: [{ date: "2026-10-10", waist: 90 }],
  recovery: [{ date: "2026-10-10", sleepHours: 7.5, comment: "private" }],
  goalHistory: [{ effectiveDate: "2026-10-01", phase: "Cut" }],
  decision: { phase: "Cut" },
  tombstones: { "2026-10-09": [{ id: "deleted-row" }] },
};

const env = {
  GITHUB_GIST_TOKEN: "test-token",
  NUTRILOG_GIST_ID: "abc123",
  NUTRILOG_OWNER_EMAIL: "owner@example.com",
};

function mcpRequest(method, params, email = "owner@example.com") {
  return new Request("https://nutrilog.example/mcp", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "oai-authenticated-user-email": email,
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
}

function gistFetch() {
  return Promise.resolve(
    new Response(
      JSON.stringify({
        updated_at: "2026-10-10T08:30:00Z",
        files: { "nutrilog.json": { content: JSON.stringify(fixture), truncated: false } },
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    ),
  );
}

test("dailyNutrition returns only the deliberately reduced schema", () => {
  const result = dailyNutrition(fixture, "2026-10-10", "2026-10-10T08:30:00Z");
  assert.equal(result.item_count, 2);
  assert.deepEqual(result.totals, {
    calories: 424.4,
    protein_g: 30.2,
    carbs_g: 61.3,
    fat_g: 6.1,
    fiber_g: 8.1,
  });
  assert.equal(result.target.calories, 2050);
  assert.equal(result.target.source, "target_history");

  const serialized = JSON.stringify(result);
  for (const forbidden of [
    "private-row-id",
    "updatedAt",
    "weight",
    "measurements",
    "recovery",
    "sleepHours",
    "private",
    "goalHistory",
    "decision",
    "tombstones",
    "deleted-row",
  ]) {
    assert.equal(serialized.includes(forbidden), false, `${forbidden} leaked into the response`);
  }
});

test("MCP discovery and tool listing use the Sites protocol", async () => {
  const discovery = await handleRequest(mcpRequest("server/discover"), env, gistFetch);
  assert.equal(discovery.status, 200);
  assert.deepEqual((await discovery.json()).result.supportedVersions, ["2026-07-28"]);

  const list = await handleRequest(mcpRequest("tools/list"), env, gistFetch);
  const listBody = await list.json();
  assert.equal(listBody.result.tools[0].name, "get_daily_nutrition");
  assert.deepEqual(listBody.result.tools[0].inputSchema.required, ["date"]);
});

test("tool call reads the configured Gist using GET and returns no secret", async () => {
  const calls = [];
  const fetchSpy = async (url, options) => {
    calls.push({ url, options });
    return gistFetch();
  };
  const response = await handleRequest(
    mcpRequest("tools/call", {
      name: "get_daily_nutrition",
      arguments: { date: "2026-10-10" },
    }),
    env,
    fetchSpy,
  );
  const body = await response.json();

  assert.equal(body.result.isError, undefined);
  assert.equal(body.result.structuredContent.totals.calories, 424.4);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.method, "GET");
  assert.equal(calls[0].url, "https://api.github.com/gists/abc123");
  assert.equal(JSON.stringify(body).includes("test-token"), false);
});

test("tool call rejects a caller whose verified email is not allowlisted", async () => {
  let called = false;
  const response = await handleRequest(
    mcpRequest(
      "tools/call",
      { name: "get_daily_nutrition", arguments: { date: "2026-10-10" } },
      "someone-else@example.com",
    ),
    env,
    async () => {
      called = true;
      return gistFetch();
    },
  );
  const body = await response.json();
  assert.equal(body.result.isError, true);
  assert.match(body.result.content[0].text, /restricted to its owner/);
  assert.equal(called, false);
});

test("tool call validates dates before reading private data", async () => {
  let called = false;
  const response = await handleRequest(
    mcpRequest("tools/call", {
      name: "get_daily_nutrition",
      arguments: { date: "2026-02-30" },
    }),
    env,
    async () => {
      called = true;
      return gistFetch();
    },
  );
  const body = await response.json();
  assert.equal(body.result.isError, true);
  assert.equal(called, false);
});

test("readNutrilogGist follows only GitHub's expected private raw host", async () => {
  const config = { gistId: "abc123", token: "secret" };
  await assert.rejects(
    readNutrilogGist(config, async () =>
      new Response(
        JSON.stringify({
          files: {
            "nutrilog.json": {
              truncated: true,
              raw_url: "https://attacker.example/nutrilog.json",
            },
          },
        }),
        { status: 200 },
      ),
    ),
    /unexpected raw Gist URL/,
  );
});
