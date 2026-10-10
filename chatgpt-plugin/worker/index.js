const MCP_VERSION = "2026-07-28";
const MAX_REQUEST_BYTES = 64 * 1024;
const MAX_GIST_BYTES = 5 * 1024 * 1024;
const MAX_ITEMS_PER_DAY = 500;

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

const page = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Nutrilog read-only connector</title>
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
      <h1>Nutrilog read-only connector</h1>
      <p><strong>Nutrilog remains the primary application.</strong></p>
      <p>This private connector lets ChatGPT read one requested diary day. It cannot add, edit, or delete Nutrilog data.</p>
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
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T12:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === date;
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

  const rawItems = Array.isArray(payload.log?.[date]) ? payload.log[date] : [];
  if (rawItems.length > MAX_ITEMS_PER_DAY) {
    throw new Error("The requested day contains too many diary rows to return safely.");
  }

  const items = rawItems
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
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

function configuration(env) {
  const gistId = text(env.NUTRILOG_GIST_ID, 100);
  const token = text(env.GITHUB_GIST_TOKEN, 500);
  const ownerEmail = text(env.NUTRILOG_OWNER_EMAIL, 320).toLowerCase();
  if (!gistId || !token || !ownerEmail) {
    throw new Error(
      "Connector configuration is incomplete. Set NUTRILOG_GIST_ID, GITHUB_GIST_TOKEN, and NUTRILOG_OWNER_EMAIL as hosted runtime values.",
    );
  }
  if (!/^[a-f0-9]+$/i.test(gistId)) throw new Error("NUTRILOG_GIST_ID is invalid.");
  return { gistId, token, ownerEmail };
}

function authorize(request, ownerEmail) {
  const callerEmail = text(request.headers.get("oai-authenticated-user-email"), 320).toLowerCase();
  if (!callerEmail || callerEmail !== ownerEmail) {
    throw new Error("This Nutrilog connector is restricted to its owner.");
  }
}

async function fetchTextWithLimit(url, headers, fetchImpl) {
  const response = await fetchImpl(url, { method: "GET", headers, redirect: "error" });
  if (!response.ok) {
    throw new Error(`GitHub returned ${response.status} while reading the Nutrilog Gist.`);
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
    authorization: `Bearer ${config.token}`,
    "user-agent": "nutrilog-read-only-chatgpt-connector",
    "x-github-api-version": "2022-11-28",
  };
  const apiUrl = `https://api.github.com/gists/${encodeURIComponent(config.gistId)}`;
  const rawGist = await fetchTextWithLimit(apiUrl, headers, fetchImpl);
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

  let payload;
  try {
    payload = JSON.parse(content);
  } catch {
    throw new Error("nutrilog.json is not valid JSON.");
  }
  return { payload, updatedAt: text(gist.updated_at, 40) || null };
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
    return rpcResult(body.id, { tools: [TOOL] });
  }

  if (body.method !== "tools/call") return rpcError(body.id, -32601, "Method not found.");

  if (body.params?.name !== TOOL.name) return rpcError(body.id, -32602, "Unknown tool.");
  const args = body.params?.arguments;
  if (!args || Object.keys(args).some((key) => key !== "date") || !validDate(args.date)) {
    return rpcResult(body.id, toolFailure("date must be a real date in YYYY-MM-DD form."));
  }

  try {
    const config = configuration(env);
    authorize(request, config.ownerEmail);
    const { payload, updatedAt } = await readNutrilogGist(config, fetchImpl);
    return rpcResult(body.id, toolSuccess(dailyNutrition(payload, args.date, updatedAt)));
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
    return jsonResponse({ ok: true, configured: Boolean(env.NUTRILOG_GIST_ID && env.GITHUB_GIST_TOKEN && env.NUTRILOG_OWNER_EMAIL) });
  }
  if (url.pathname === "/mcp" && request.method === "POST") return mcp(request, env, fetchImpl);
  return new Response("Not found", { status: 404 });
}

export default {
  async fetch(request, env) {
    return handleRequest(request, env);
  },
};
