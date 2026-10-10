import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("../../index.html", import.meta.url), "utf8");
const start = html.indexOf("async function readGistFileContent(file)");
const end = html.indexOf("\nfunction todayISO()", start);
assert.ok(start >= 0 && end > start, "readGistFileContent must remain present in index.html");
const readGistFileContent = new Function(
  `${html.slice(start, end)}\nreturn readGistFileContent;`,
)();

test("small Gist files use their complete inline content", async () => {
  assert.equal(
    await readGistFileContent({ truncated: false, content: '{"complete":true}' }),
    '{"complete":true}',
  );
});

test("truncated Gist files are fetched from GitHub's raw host without credentials", async () => {
  const previousFetch = globalThis.fetch;
  let call;
  globalThis.fetch = async (url,options) => {
    call = { url, options };
    return new Response('{"complete":true}', { status: 200 });
  };
  try {
    const content = await readGistFileContent({
      truncated: true,
      content: '{"incomplete":',
      raw_url: "https://gist.githubusercontent.com/example/raw/abc/nutrilog.json",
    });
    assert.equal(content, '{"complete":true}');
    assert.deepEqual(call, {
      url: "https://gist.githubusercontent.com/example/raw/abc/nutrilog.json",
      options: { method: "GET" },
    });
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("truncated Gist files reject an unexpected raw host", async () => {
  await assert.rejects(
    readGistFileContent({
      truncated: true,
      raw_url: "https://attacker.example/nutrilog.json",
    }),
    /unexpected cloud backup address/,
  );
});
