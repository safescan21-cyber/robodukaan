#!/usr/bin/env node
// After each website update: tell Bing (and other IndexNow search engines – Yandex, Seznam, Naver; Bing also
// feeds DuckDuckGo, Yahoo and ChatGPT search) about pages that are new since the last run. The first run
// sends every page. Run by deploy/auto-update.sh; never fails the update.
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const SITE = process.env.SITE || "https://pcbdukaan.com";
const KEY = "6ff10b478d894a90e903df17255f438f";
const STATE = process.env.STATE || "/var/lib/robodukaan-settings/indexnow-sent.txt";

async function main() {
  let xml = "";
  for (let i = 0; i < 12 && !xml.includes("<loc>"); i++) {   // the website may still be starting
    xml = await fetch(`${SITE}/sitemap.xml`, { signal: AbortSignal.timeout(20000) }).then((r) => (r.ok ? r.text() : ""), () => "");
    if (!xml.includes("<loc>")) await new Promise((r) => setTimeout(r, 10000));
  }
  if (!xml) return console.log("indexnow: sitemap not reachable");
  const all = [...new Set([...xml.matchAll(/(?:<loc>|hreflang="[^"]+" href=")([^<"]+)/g)].map((m) => m[1]).filter((u) => u.startsWith(SITE)))];
  const sent = new Set(existsSync(STATE) ? readFileSync(STATE, "utf8").split("\n").filter(Boolean) : []);
  const fresh = all.filter((u) => !sent.has(u));
  if (!fresh.length) return console.log("indexnow: nothing new");
  for (let i = 0; i < fresh.length; i += 10000) {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host: new URL(SITE).host, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList: fresh.slice(i, i + 10000) }),
      signal: AbortSignal.timeout(20000),
    }).catch(() => null);
    if (!res || !res.ok) return console.log(`indexnow: failed (${res ? res.status : "no connection"})`);
  }
  writeFileSync(STATE, [...sent, ...fresh].join("\n") + "\n");
  console.log(`indexnow: sent ${fresh.length} new pages`);
}
main().catch((e) => console.log("indexnow:", e.message));
