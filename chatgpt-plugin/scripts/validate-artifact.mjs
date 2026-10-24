import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const worker = await readFile(new URL("../dist/server/index.js", import.meta.url), "utf8");
const hosting = JSON.parse(
  await readFile(new URL("../dist/.openai/hosting.json", import.meta.url), "utf8"),
);

assert.match(worker, /POST \/mcp|pathname === "\/mcp"/);
assert.match(await readFile(new URL('../dist/server/profile.js',import.meta.url),'utf8'), /export function applyProfileEdits/);
assert.ok(hosting.capabilities.includes("mcp"));
assert.equal(hosting.d1, null);
assert.equal(hosting.r2, null);

console.log("Validated Sites Worker artifact");
