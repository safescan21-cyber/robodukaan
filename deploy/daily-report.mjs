#!/usr/bin/env node
// Daily email report for PCBDukaan: yesterday's sales + an SEO health check of the live site,
// with a short summary written by the local AI (Ollama). Runs every morning from a systemd timer
// (installed by deploy/ensure-report.sh). Settings: /etc/robodukaan/report.env and email.env.
//
// Try it by hand on the server:
//   sudo systemctl start robodukaan-report        (sends the report now)
//   node deploy/daily-report.mjs --dry-run --out=/tmp/report.html   (builds it without sending)
// Options for testing: --site=http://127.0.0.1:3100  --fixture=sample.json  --no-ai

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import tls from "node:tls";

const APP_DIR = process.env.APP_DIR || join(dirname(fileURLToPath(import.meta.url)), "..");
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, ...v] = a.replace(/^--/, "").split("="); return [k, v.length ? v.join("=") : true]; }));
const SITE = (args.site || process.env.REPORT_SITE || "https://pcbdukaan.com").replace(/\/$/, "");
const PUBLIC_SITE = "https://pcbdukaan.com";
const STATE_FILE = process.env.REPORT_STATE || "/var/lib/robodukaan/report-state.json";
const OLLAMA = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
// Admin → Daily report saves these (report code, who gets it, on/off); the WhatsApp connection comes from
// Admin → WhatsApp. Both live in the server's private settings folder.
const SETTINGS_DIR = process.env.SETTINGS_DIR || "/var/lib/robodukaan-settings";
const readJson = (f) => { try { return JSON.parse(readFileSync(join(SETTINGS_DIR, f), "utf8")); } catch { return {}; } };
const REPORT = readJson("report.json");
const MODEL = process.env.CHAT_MODEL || "qwen2.5:1.5b";

// Settings from the app's .env.local (Supabase address and public key).
for (const file of [".env.local", ".env.production", ".env"]) {
  const p = join(APP_DIR, file);
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const inr = (n) => "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const pct = (now, before) => (before ? `${now >= before ? "▲" : "▼"} ${Math.abs(Math.round(((now - before) / before) * 100))}%` : now ? "new" : "–");

async function fetchWithTimeout(url, opts = {}, ms = 20000) {
  return fetch(url, { ...opts, signal: AbortSignal.timeout(ms), redirect: opts.redirect || "follow" });
}

// ── Sales data (database function public.daily_report, needs REPORT_TOKEN) ─────────────
async function getSales() {
  if (args.fixture) return JSON.parse(readFileSync(args.fixture, "utf8"));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const token = process.env.REPORT_TOKEN || REPORT.token;
  if (!url || !key) throw new Error("Supabase address/key not found in .env.local");
  if (!token) throw new Error("The report is not switched on yet – open Admin → Daily report and press Save");
  const res = await fetchWithTimeout(`${url}/rest/v1/rpc/daily_report`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_token: token }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(body.includes("Invalid report code") ? "The report code is wrong – run set-report.sh again" : body.includes("daily_report") ? "Run supabase/migrations/008_daily_report.sql in Supabase first" : `Database error ${res.status}: ${body.slice(0, 200)}`);
  return JSON.parse(body);
}

// ── SEO health check of the live site ──────────────────────────────────────────────────
function attr(tag, name) { const m = tag.match(new RegExp(`${name}="([^"]*)"`)); return m ? m[1] : null; }

async function checkPage(url) {
  const local = url.replace(PUBLIC_SITE, SITE);
  const t0 = Date.now();
  try {
    const res = await fetchWithTimeout(local, { headers: { "User-Agent": "PCBDukaan-daily-report" } }, 30000);
    const html = await res.text();
    const ms = Date.now() - t0;
    const metas = html.match(/<meta [^>]*>/g) || [];
    const links = html.match(/<link [^>]*>/g) || [];
    const title = (html.match(/<title>([\s\S]*?)<\/title>/) || [])[1];
    const desc = attr(metas.find((m) => m.includes('name="description"')) || "", "content");
    const robots = attr(metas.find((m) => m.includes('name="robots"')) || "", "content") || "";
    const canonical = attr(links.find((l) => l.includes('rel="canonical"')) || "", "href");
    const h1 = (html.match(/<h1[\s>]/g) || []).length;
    const problems = [];
    if (res.status !== 200) problems.push(`status ${res.status}`);
    else {
      if (!title) problems.push("no title");
      if (!desc) problems.push("no description");
      if (!canonical) problems.push("no canonical");
      if (robots.includes("noindex")) problems.push("noindex");
      if (h1 !== 1) problems.push(`${h1} H1 headings`);
      if (/<img (?![^>]*\balt=)[^>]*>/.test(html)) problems.push("image without alt text");
    }
    if (ms > 3000) problems.push(`slow (${(ms / 1000).toFixed(1)}s)`);
    return { url, status: res.status, ms, problems };
  } catch (e) {
    return { url, status: 0, ms: Date.now() - t0, problems: [`failed: ${e.name === "TimeoutError" ? "timeout" : e.message}`] };
  }
}

function sslDaysLeft(host) {
  return new Promise((resolve) => {
    const s = tls.connect({ host, port: 443, servername: host, timeout: 10000 }, () => {
      const cert = s.getPeerCertificate();
      s.end();
      resolve(cert?.valid_to ? Math.floor((new Date(cert.valid_to) - Date.now()) / 86400000) : null);
    });
    s.on("error", () => resolve(null));
    s.on("timeout", () => { s.destroy(); resolve(null); });
  });
}

async function getSeo() {
  const out = { pages: 0, ok: 0, problems: [], slowest: [], robots: false, sitemap: false, ssl: null, languages: [] };
  try {
    const r = await fetchWithTimeout(`${SITE}/robots.txt`);
    const txt = await r.text();
    out.robots = r.ok && /Sitemap:/i.test(txt) && !/Disallow:\s*\/\s*$/m.test(txt);
  } catch { /* reported as false */ }
  let urls = [];
  try {
    const r = await fetchWithTimeout(`${SITE}/sitemap.xml`);
    const xml = await r.text();
    urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    out.sitemap = r.ok && urls.length > 0;
  } catch { /* reported as false */ }
  // Every page in the sitemap plus the home page of each language.
  const langs = ["hi", "ur", "fr", "ko", "ja", "zh"].map((l) => `${PUBLIC_SITE}/${l}`);
  const all = [...new Set([...urls, ...langs])];
  const results = [];
  for (let i = 0; i < all.length; i += 4) results.push(...(await Promise.all(all.slice(i, i + 4).map(checkPage))));
  out.pages = results.length;
  out.ok = results.filter((r) => r.problems.length === 0).length;
  out.problems = results.filter((r) => r.problems.length);
  out.slowest = [...results].sort((a, b) => b.ms - a.ms).slice(0, 3);
  out.medianMs = results.length ? [...results].sort((a, b) => a.ms - b.ms)[Math.floor(results.length / 2)].ms : null;
  out.languages = langs.map((l) => ({ lang: l.split("/").pop(), ok: results.find((r) => r.url === l)?.status === 200 }));
  if (SITE.startsWith("https://")) out.ssl = await sslDaysLeft(new URL(SITE).hostname);
  return out;
}

// ── Short summary from the local AI ───────────────────────────────────────────────────
async function aiSummary(facts) {
  if (args["no-ai"]) return null;
  try {
    const res = await fetchWithTimeout(`${OLLAMA}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL, stream: false, keep_alive: "5m",
        options: { temperature: 0.2, num_predict: 260 },
        messages: [
          { role: "system", content: "You write the summary at the top of a daily business report for PCBDukaan, an Indian online shop for industrial PCBs and PCB repair. Use ONLY the facts given; never invent numbers. Write 3 to 5 short bullet points in plain English starting with '- ': what changed, what needs attention today, one practical suggestion. No greeting, no headings." },
          { role: "user", content: facts },
        ],
      }),
    }, 180000);
    if (!res.ok) return null;
    const text = (await res.json())?.message?.content?.trim();
    return text ? text.split("\n").map((l) => l.trim()).filter((l) => l.startsWith("-")).slice(0, 5).map((l) => l.replace(/^-\s*/, "").replace(/\*\*/g, "")) : null;
  } catch {
    return null;
  }
}

// ── Email ─────────────────────────────────────────────────────────────────────────────
function buildEmail({ sales, seo, ai, prev, errors }) {
  const S = sales?.sales;
  const y = S?.yesterday, w = S?.last7, pw = S?.prev7, m = S?.month;
  const day = sales?.day ? new Date(`${sales.day}T12:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : new Date().toLocaleDateString("en-IN");
  const card = (label, value, sub = "") => `<td style="padding:10px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;vertical-align:top"><div style="font-size:12px;color:#64748b">${label}</div><div style="font-size:20px;font-weight:700;color:#0f172a">${value}</div><div style="font-size:12px;color:#64748b">${sub}</div></td>`;
  const h2 = (t) => `<h2 style="font-size:16px;margin:24px 0 8px;color:#14306f">${t}</h2>`;
  const table = (head, rows) => rows.length ? `<table cellpadding="6" style="border-collapse:collapse;width:100%;font-size:13px">${head ? `<tr style="background:#f1f5f9;text-align:left">${head.map((h) => `<th>${h}</th>`).join("")}</tr>` : ""}${rows.map((r) => `<tr style="border-top:1px solid #e2e8f0">${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</table>` : `<p style="font-size:13px;color:#64748b">None.</p>`;
  const list = (items) => `<ul style="margin:4px 0;padding-left:20px;font-size:14px">${items.map((i) => `<li style="margin:3px 0">${i}</li>`).join("")}</ul>`;

  let html = `<div style="font-family:Segoe UI,Roboto,Arial,sans-serif;max-width:680px;margin:auto;color:#0f172a">
  <div style="background:#14306f;color:#fff;padding:16px 20px;border-radius:10px 10px 0 0"><div style="font-size:20px;font-weight:800">PCB<span style="color:#f97316">Dukaan</span> daily report</div><div style="font-size:13px;color:#c7d6fb">${esc(day)}</div></div>
  <div style="border:1px solid #e2e8f0;border-top:0;padding:4px 20px 20px;border-radius:0 0 10px 10px">`;

  if (errors.length) html += `<p style="background:#fef2f2;color:#991b1b;padding:10px;border-radius:6px;font-size:13px">${errors.map(esc).join("<br>")}</p>`;
  if (ai?.length) html += h2("Summary (written by the AI – check the numbers below)") + list(ai.map(esc));

  if (S) {
    html += h2("Sales") + `<table cellspacing="6" style="width:100%"><tr>${card("Yesterday", inr(y.revenue), `${y.orders} order${y.orders === 1 ? "" : "s"}${y.cancelled ? ` · ${y.cancelled} cancelled` : ""}`)}${card("Last 7 days", inr(w.revenue), `${w.orders} orders · ${pct(Number(w.revenue), Number(pw.revenue))} vs week before`)}${card("This month", inr(m.revenue), `${m.orders} orders · GST ${inr(m.gst)}`)}</tr></table>`;
    html += `<p style="font-size:12px;color:#64748b;margin:4px 6px">Totals include 18% GST and exclude cancelled orders. Average order (7 days): ${w.orders ? inr(w.revenue / w.orders) : "–"}. Discounts given (7 days): ${inr(w.discounts)}.</p>`;
    const open = sales.open_orders || {};
    html += h2("Orders to handle") + list([
      `Open orders: <b>${open.pending || 0}</b> new · <b>${open.confirmed || 0}</b> confirmed · <b>${open.packed || 0}</b> packed`,
      `Delivered but payment not marked as received: <b>${sales.unpaid_delivered}</b>`,
    ]);
    if (sales.waiting_over_24h?.length) html += `<p style="font-size:13px;margin:6px 0">Waiting more than 24 hours:</p>` + table(["Order", "Customer", "City", "Total", "Waiting"], sales.waiting_over_24h.map((o) => [`<a href="${PUBLIC_SITE}/admin/orders?q=${encodeURIComponent(o.order)}">${esc(o.order)}</a>`, esc(o.customer), esc(o.city), inr(o.total), `${o.hours} h`]));
    html += h2("Best sellers (last 7 days)") + table(["Product", "SKU", "Qty", "Sales"], (sales.top_products || []).map((p) => [esc(p.name), esc(p.sku), p.qty, inr(p.revenue)]));
    html += h2("Stock") + `<p style="font-size:13px;margin:4px 0">${sales.catalog.active} products live · ${sales.catalog.out_of_stock} out of stock · ${sales.catalog.hidden} hidden · <b>${sales.catalog.no_photo}</b> without a photo</p>`;
    if (sales.low_stock?.length) html += table(["Low stock (3 or fewer)", "SKU", "Left"], sales.low_stock.map((p) => [esc(p.name), esc(p.sku), p.stock === 0 ? `<b style="color:#b91c1c">0</b>` : p.stock]));
    const rep = sales.repairs?.open || {};
    html += h2("Customers, repairs, jobs") + list([
      `New customers: <b>${sales.customers.new_yesterday}</b> yesterday · ${sales.customers.new_last7} in 7 days · ${sales.customers.total} total`,
      `PCB repair requests: <b>${sales.repairs.new_yesterday}</b> new yesterday · open: ${Object.entries(rep).map(([k, v]) => `${v} ${k.replace("_", " ")}`).join(", ") || "none"}`,
      `Job applications: <b>${sales.jobs.applications_yesterday}</b> yesterday · ${sales.jobs.unreviewed} not reviewed yet`,
      `New product reviews yesterday: ${sales.reviews_yesterday}`,
    ]);
  }

  if (seo) {
    const issues = seo.problems;
    html += h2("SEO &amp; site health") + list([
      `Pages checked: <b>${seo.pages}</b> · without problems: <b>${seo.ok}</b>${prev?.seoPages && prev.seoPages !== seo.pages ? ` (was ${prev.seoPages} pages yesterday)` : ""}`,
      `Sitemap: ${seo.sitemap ? "✅ OK" : "❌ not working"} · robots.txt: ${seo.robots ? "✅ OK" : "❌ check it"} · HTTPS certificate: ${seo.ssl == null ? "–" : seo.ssl < 14 ? `⚠️ expires in ${seo.ssl} days` : `✅ ${seo.ssl} days left`}`,
      `Languages: ${seo.languages.map((l) => `${l.lang} ${l.ok ? "✅" : "❌"}`).join(" · ")}`,
      `Speed: typical page ${seo.medianMs != null ? `${(seo.medianMs / 1000).toFixed(2)} s` : "–"}; slowest ${seo.slowest.map((s) => `${esc(s.url.replace(PUBLIC_SITE, "") || "/")} ${(s.ms / 1000).toFixed(1)} s`).join(", ")}`,
    ]);
    if (issues.length) html += table(["Page", "Problem"], issues.slice(0, 25).map((r) => [`<a href="${esc(r.url)}">${esc(r.url.replace(PUBLIC_SITE, "") || "/")}</a>`, esc(r.problems.join(", "))])) + (issues.length > 25 ? `<p style="font-size:12px;color:#64748b">…and ${issues.length - 25} more.</p>` : "");
    if (sales?.catalog?.no_photo) html += `<p style="font-size:13px">Tip: ${sales.catalog.no_photo} products have no photo. Google shows products with photos in search results; add them in Admin → Products.</p>`;
  }

  html += `<p style="font-size:11px;color:#94a3b8;margin-top:24px">Sent automatically every morning by your server. Search traffic (clicks, keywords) is in Google Search Console.</p></div></div>`;
  return html;
}

function factsForAi(sales, seo) {
  const f = [];
  if (sales?.sales) {
    const { yesterday: y, last7: w, prev7: p, month: m } = sales.sales;
    f.push(`Yesterday: ${y.orders} orders, revenue ${inr(y.revenue)}, ${y.cancelled} cancelled.`);
    f.push(`Last 7 days: ${w.orders} orders, ${inr(w.revenue)}; the 7 days before: ${p.orders} orders, ${inr(p.revenue)}.`);
    f.push(`This month so far: ${m.orders} orders, ${inr(m.revenue)}.`);
    const o = sales.open_orders || {};
    f.push(`Open orders: ${o.pending || 0} new, ${o.confirmed || 0} confirmed, ${o.packed || 0} packed; ${sales.waiting_over_24h?.length || 0} waiting over 24 hours.`);
    if (sales.top_products?.length) f.push(`Best seller this week: ${sales.top_products[0].name} (${sales.top_products[0].qty} sold).`);
    f.push(`Low stock items: ${sales.low_stock?.length || 0}; products without photo: ${sales.catalog?.no_photo}.`);
    f.push(`New customers yesterday: ${sales.customers?.new_yesterday}. New repair requests: ${sales.repairs?.new_yesterday}. New job applications: ${sales.jobs?.applications_yesterday}.`);
  }
  if (seo) f.push(`Website: ${seo.pages} pages checked, ${seo.problems.length} with problems${seo.problems[0] ? ` (e.g. ${seo.problems[0].url.replace(PUBLIC_SITE, "") || "/"}: ${seo.problems[0].problems.join(", ")})` : ""}; sitemap ${seo.sitemap ? "ok" : "broken"}; typical page loads in ${seo.medianMs} ms.`);
  return f.join("\n");
}

// ── PDF (attached to the email, sent on WhatsApp) ──────────────────────────────────────
async function buildPdf({ sales, seo, ai, errors, dayText }) {
  const require = createRequire(join(APP_DIR, "package.json"));
  const PDFDocument = require("pdfkit");
  const doc = new PDFDocument({ size: "A4", margin: 40, info: { Title: `PCBDukaan daily report ${dayText}` } });
  const fontR = join(APP_DIR, "assets/fonts/DejaVuSans.ttf"), fontB = join(APP_DIR, "assets/fonts/DejaVuSans-Bold.ttf");
  const fonts = existsSync(fontR) && existsSync(fontB);
  if (fonts) { doc.registerFont("R", fontR); doc.registerFont("B", fontB); }
  const R = fonts ? "R" : "Helvetica", B = fonts ? "B" : "Helvetica-Bold";
  const money = (n) => (fonts ? inr(n) : inr(n).replace("₹", "Rs. "));
  const chunks = []; doc.on("data", (c) => chunks.push(c));
  const done = new Promise((r) => doc.on("end", () => r(Buffer.concat(chunks))));
  const L = 40, W = 515;
  const ensure = (h) => { if (doc.y + h > 790) doc.addPage(); };
  const h2 = (t) => { ensure(40); doc.moveDown(0.8).font(B).fontSize(12.5).fillColor("#14306f").text(t, L, doc.y, { width: W }); doc.moveDown(0.3); };
  const bullet = (t) => { ensure(18); doc.font(R).fontSize(9.5).fillColor("#0f172a").text(`•  ${t}`, L + 6, doc.y, { width: W - 6 }); doc.moveDown(0.15); };
  const table = (head, rows, widths) => {
    if (!rows.length) { doc.font(R).fontSize(9).fillColor("#64748b").text("None.", L, doc.y); return; }
    const line = (cells, bold, fill) => {
      doc.font(bold ? B : R).fontSize(8.5);
      const h = Math.max(...cells.map((c, i) => doc.heightOfString(String(c), { width: widths[i] - 8 }))) + 8;
      ensure(h); const y = doc.y; let x = L;
      if (fill) doc.rect(L, y, W, h).fill(fill);
      cells.forEach((c, i) => { doc.fillColor("#0f172a").font(bold ? B : R).fontSize(8.5).text(String(c), x + 4, y + 4, { width: widths[i] - 8 }); x += widths[i]; });
      doc.rect(L, y, W, h).lineWidth(0.5).strokeColor("#cbd5e1").stroke();
      doc.y = y + h; doc.x = L;
    };
    if (head) line(head, true, "#f1f5f9");
    rows.forEach((r) => line(r, false));
  };

  doc.rect(0, 0, 595.28, 70).fill("#14306f");
  doc.font(B).fontSize(20).fillColor("#ffffff").text("PCB", L, 22, { continued: true }).fillColor("#f97316").text("Dukaan", { continued: true }).fillColor("#ffffff").text("  daily report");
  doc.font(R).fontSize(10).fillColor("#c7d6fb").text(dayText, L, 48);
  doc.y = 85; doc.x = L;
  if (errors.length) { doc.font(R).fontSize(9).fillColor("#991b1b").text(errors.join("\n"), L, doc.y, { width: W }); doc.moveDown(0.5); }
  if (ai?.length) { h2("Summary (written by the AI – check the numbers below)"); ai.forEach(bullet); }

  const S = sales?.sales;
  if (S) {
    const y = S.yesterday, w = S.last7, pw = S.prev7, m = S.month;
    h2("Sales");
    const boxes = [["Yesterday", money(y.revenue), `${y.orders} order${y.orders === 1 ? "" : "s"}${y.cancelled ? ` · ${y.cancelled} cancelled` : ""}`], ["Last 7 days", money(w.revenue), `${w.orders} orders · ${pct(Number(w.revenue), Number(pw.revenue))} vs week before`], ["This month", money(m.revenue), `${m.orders} orders · GST ${money(m.gst)}`]];
    ensure(62); const by = doc.y;
    boxes.forEach(([label, value, sub], i) => {
      const x = L + i * 175;
      doc.roundedRect(x, by, 165, 56, 6).fillAndStroke("#f8fafc", "#e2e8f0");
      doc.font(R).fontSize(8.5).fillColor("#64748b").text(label, x + 8, by + 6, { width: 150 });
      doc.font(B).fontSize(15).fillColor("#0f172a").text(value, x + 8, by + 18, { width: 150 });
      doc.font(R).fontSize(7.5).fillColor("#64748b").text(sub, x + 8, by + 38, { width: 150 });
    });
    doc.y = by + 62; doc.x = L;
    doc.font(R).fontSize(8).fillColor("#64748b").text(`Totals include ${18}% GST and exclude cancelled orders. Average order (7 days): ${w.orders ? money(w.revenue / w.orders) : "–"}. Discounts given (7 days): ${money(w.discounts)}.`, L, doc.y, { width: W });
    const open = sales.open_orders || {};
    h2("Orders to handle");
    bullet(`Open orders: ${open.pending || 0} new · ${open.confirmed || 0} confirmed · ${open.packed || 0} packed`);
    bullet(`Delivered but payment not marked as received: ${sales.unpaid_delivered}`);
    if (sales.waiting_over_24h?.length) { doc.moveDown(0.3); table(["Waiting > 24 h", "Customer", "City", "Total", "Hours"], sales.waiting_over_24h.map((o) => [o.order, o.customer, o.city, money(o.total), o.hours]), [110, 150, 110, 85, 60]); }
    h2("Best sellers (last 7 days)");
    table(["Product", "SKU", "Qty", "Sales"], (sales.top_products || []).map((p) => [p.name, p.sku, p.qty, money(p.revenue)]), [260, 120, 50, 85]);
    h2("Stock");
    bullet(`${sales.catalog.active} products live · ${sales.catalog.out_of_stock} out of stock · ${sales.catalog.hidden} hidden · ${sales.catalog.no_photo} without a photo`);
    if (sales.low_stock?.length) { doc.moveDown(0.3); table(["Low stock (3 or fewer)", "SKU", "Left"], sales.low_stock.map((p) => [p.name, p.sku, p.stock]), [300, 140, 75]); }
    const rep = sales.repairs?.open || {};
    h2("Customers, repairs, jobs");
    bullet(`New customers: ${sales.customers.new_yesterday} yesterday · ${sales.customers.new_last7} in 7 days · ${sales.customers.total} total`);
    bullet(`PCB repair requests: ${sales.repairs.new_yesterday} new yesterday · open: ${Object.entries(rep).map(([k, v]) => `${v} ${k.replace("_", " ")}`).join(", ") || "none"}`);
    bullet(`Job applications: ${sales.jobs.applications_yesterday} yesterday · ${sales.jobs.unreviewed} not reviewed yet`);
    bullet(`New product reviews yesterday: ${sales.reviews_yesterday}`);
  }
  if (seo) {
    h2("Website health & SEO");
    bullet(`Pages checked: ${seo.pages} · without problems: ${seo.ok}`);
    bullet(`Sitemap: ${seo.sitemap ? "OK" : "not working"} · robots.txt: ${seo.robots ? "OK" : "check it"} · HTTPS certificate: ${seo.ssl == null ? "–" : `${seo.ssl} days left`}`);
    bullet(`Languages: ${seo.languages.map((l) => `${l.lang} ${l.ok ? "OK" : "problem"}`).join(" · ")}`);
    bullet(`Speed: typical page ${seo.medianMs != null ? `${(seo.medianMs / 1000).toFixed(2)} s` : "–"}`);
    if (seo.problems.length) { doc.moveDown(0.3); table(["Page", "Problem"], seo.problems.slice(0, 20).map((r) => [r.url.replace(PUBLIC_SITE, "") || "/", r.problems.join(", ")]), [200, 315]); }
  }
  ensure(30); doc.moveDown(1).font(R).fontSize(7.5).fillColor("#94a3b8").text("Sent automatically every morning by your server · Admin → Daily report", L, doc.y, { width: W });
  doc.end();
  return done;
}

// ── WhatsApp (the PDF as a document) – uses the connection from Admin → WhatsApp ───────────
async function sendWhatsApp(numbers, pdf, fileName, dayText, headline) {
  const wa = readJson("whatsapp.json");
  const token = process.env.WHATSAPP_TOKEN || wa.token, phoneId = process.env.WHATSAPP_PHONE_ID || wa.phoneId;
  if (!numbers.length) return [];
  if (!token || !phoneId) return numbers.map((to) => ({ to, ok: false, error: "WhatsApp is not connected (Admin → WhatsApp)" }));
  const base = `${process.env.WHATSAPP_API_BASE || "https://graph.facebook.com"}/${process.env.WHATSAPP_API_VERSION || "v24.0"}/${phoneId}`;
  const auth = { Authorization: `Bearer ${token}` };
  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("type", "application/pdf");
  form.append("file", new Blob([pdf], { type: "application/pdf" }), fileName);
  const up = await fetchWithTimeout(`${base}/media`, { method: "POST", headers: auth, body: form }, 60000).catch((e) => ({ ok: false, json: async () => ({ error: { message: e.message } }) }));
  const media = await up.json().catch(() => ({}));
  if (!up.ok || !media.id) return numbers.map((to) => ({ to, ok: false, error: `PDF upload failed: ${media.error?.message || "unknown"}` }));
  const send = async (body) => {
    const r = await fetchWithTimeout(`${base}/messages`, { method: "POST", headers: { ...auth, "Content-Type": "application/json" }, body: JSON.stringify(body) }, 30000);
    const j = await r.json().catch(() => ({}));
    return r.ok && j.messages?.[0]?.id ? null : (j.error?.error_user_msg || j.error?.message || `HTTP ${r.status}`);
  };
  const out = [];
  for (const to of numbers) {
    const viaTemplate = await send({
      messaging_product: "whatsapp", to, type: "template",
      template: { name: REPORT.waTemplate || "daily_report", language: { code: wa.lang || "en" }, components: [
        { type: "header", parameters: [{ type: "document", document: { id: media.id, filename: fileName } }] },
        { type: "body", parameters: [{ type: "text", text: dayText }, { type: "text", text: headline.replace(/[\n\t]+/g, " ").slice(0, 200) || "-" }] },
      ] },
    }).catch((e) => e.message);
    if (!viaTemplate) { out.push({ to, ok: true }); continue; }
    // Without the approved template, a plain document only arrives if you messaged the business number in the last 24 h.
    const plain = await send({ messaging_product: "whatsapp", to, type: "document", document: { id: media.id, filename: fileName, caption: `PCBDukaan daily report – ${dayText}: ${headline}` } }).catch((e) => e.message);
    out.push(plain ? { to, ok: false, error: `template: ${viaTemplate} · plain: ${plain}` } : { to, ok: true, note: "sent as a plain document (template not used)" });
  }
  return out;
}

async function main() {
  const errors = [];
  const [sales, seo] = await Promise.all([
    getSales().catch((e) => { errors.push(`Sales data: ${e.message}`); return null; }),
    getSeo().catch((e) => { errors.push(`SEO check: ${e.message}`); return null; }),
  ]);
  let prev = null;
  try { prev = JSON.parse(readFileSync(STATE_FILE, "utf8")); } catch { /* first run */ }
  const ai = await aiSummary(factsForAi(sales, seo));
  const html = buildEmail({ sales, seo, ai, prev, errors });

  const y = sales?.sales?.yesterday;
  const subject = `PCBDukaan daily report – ${sales?.day ?? new Date().toISOString().slice(0, 10)}: ${y ? `${y.orders} order${y.orders === 1 ? "" : "s"}, ${inr(y.revenue)}` : "sales data unavailable"}${seo?.problems.length ? ` · ${seo.problems.length} SEO issue${seo.problems.length === 1 ? "" : "s"}` : ""}`;

  const dayText = sales?.day ? new Date(`${sales.day}T12:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : new Date().toLocaleDateString("en-IN");
  const headline = y ? `${y.orders} order${y.orders === 1 ? "" : "s"}, ${inr(y.revenue)} yesterday; ${sales.open_orders?.pending || 0} new orders to confirm` : "sales data unavailable";
  const pdf = await buildPdf({ sales, seo, ai, errors, dayText }).catch((e) => { console.error("PDF failed:", e.message); return null; });
  const fileName = `PCBDukaan-report-${sales?.day ?? new Date().toISOString().slice(0, 10)}.pdf`;
  if (args.out) writeFileSync(args.out, `<!doctype html><meta charset="utf-8"><title>${esc(subject)}</title>${html}`);
  if (args.pdf && pdf) writeFileSync(args.pdf, pdf);
  console.log(subject);
  if (args["dry-run"]) return;
  if (REPORT.enabled === false && !args.now) { console.log("Report is switched off in Admin → Daily report."); return; }

  const result = { at: new Date().toISOString(), subject, email: null, whatsapp: [] };
  const toList = (REPORT.emails?.length ? REPORT.emails : [process.env.REPORT_TO || process.env.ADMIN_EMAIL || process.env.SMTP_USER]).filter(Boolean);
  try {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS || !toList.length) throw new Error("Email is not set up on the server");
    const nodemailer = createRequire(join(APP_DIR, "package.json"))("nodemailer");
    const port = Number(process.env.SMTP_PORT || 465);
    await nodemailer.createTransport({ host: process.env.SMTP_HOST, port, secure: port === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } })
      .sendMail({ from: process.env.MAIL_FROM || `PCBDukaan reports <${process.env.SMTP_USER}>`, to: toList.join(", "), subject, html,
        attachments: pdf ? [{ filename: fileName, content: pdf, contentType: "application/pdf" }] : [] });
    result.email = { ok: true, to: toList };
    console.log(`Emailed to ${toList.join(", ")}`);
  } catch (e) {
    result.email = { ok: false, error: e.message };
    console.error(`Email failed: ${e.message}`);
  }
  if (pdf && REPORT.whatsapp?.length) {
    result.whatsapp = await sendWhatsApp(REPORT.whatsapp, pdf, fileName, dayText, headline).catch((e) => [{ ok: false, error: e.message }]);
    for (const w of result.whatsapp) console.log(`WhatsApp ${w.to}: ${w.ok ? "sent" : w.error}`);
  }
  try { writeFileSync(join(SETTINGS_DIR, "report-last.json"), JSON.stringify(result)); } catch { /* settings folder not writable here */ }

  try { mkdirSync(dirname(STATE_FILE), { recursive: true }); writeFileSync(STATE_FILE, JSON.stringify({ day: sales?.day, seoPages: seo?.pages })); } catch { /* not important */ }
}

main().catch((e) => { console.error(e.message); process.exit(1); });
