// node batch.js list.txt – each line "name url"; saves each page's visible text to raw/<name>.txt
// A fresh browser per page, so one crashing page can't stop the rest.
const { chromium } = require("playwright");
const fs = require("fs");
(async () => {
  const list = fs.readFileSync(process.argv[2], "utf8").trim().split("\n").map((l) => l.trim().split(/\s+/));
  for (const [name, url] of list) {
    let b;
    try {
      b = await chromium.launch();
      const ctx = await b.newContext({ userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36" });
      const p = await ctx.newPage();
      let st = 0;
      try {
        const r = await p.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
        st = r ? r.status() : 0;
        await p.waitForTimeout(3000);
        const tabs = [...(await p.$$("text=/specification|technical/i")), ...(await p.$$("text=/^\\s*read\\s+more\\s*$/i"))];
        for (const h of tabs) { try { await h.click({ timeout: 1000 }); } catch (e) { /* not clickable */ } }
        await p.waitForTimeout(800);
      } catch (e) { console.log(name, "ERR", e.message.slice(0, 80)); }
      const text = await Promise.race([
        p.evaluate(() => (document.body ? document.body.innerText : "")).catch(() => ""),
        new Promise((res) => setTimeout(() => res(""), 15000)),
      ]);
      fs.writeFileSync(`raw/${name}.txt`, `URL: ${p.url()}\nSTATUS: ${st}\n\n${text}`);
      console.log(name, st, text.length);
    } catch (e) {
      console.log(name, "FAILED", e.message.slice(0, 80));
    } finally {
      if (b) await b.close().catch(() => {});
    }
  }
})();
