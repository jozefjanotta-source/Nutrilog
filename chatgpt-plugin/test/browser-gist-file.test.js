import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("../../index.html", import.meta.url), "utf8");
const start = html.indexOf("async function fetchGistWithTimeout(url,options={}");
const end = html.indexOf("\nfunction todayISO()", start);
assert.ok(start >= 0 && end > start, "readGistFileContent must remain present in index.html");
const { readGistFileContent, fetchGistWithTimeout } = new Function(
  `${html.slice(start, end)}\nreturn { readGistFileContent, fetchGistWithTimeout };`,
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
    assert.equal(call.url,"https://gist.githubusercontent.com/example/raw/abc/nutrilog.json");
    assert.equal(call.options.method,"GET");
    assert.ok(call.options.signal instanceof AbortSignal);
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


test("slow GitHub requests stop with an actionable timeout", async () => {
  const previousFetch=globalThis.fetch;
  globalThis.fetch=async (_url,{signal})=>new Promise((_resolve,reject)=>{
    signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true});
  });
  try{
    await assert.rejects(fetchGistWithTimeout('https://api.github.com/gists/test',{},10),
      /GitHub took too long.*saved on this device/);
  }finally{globalThis.fetch=previousFetch;}
});
