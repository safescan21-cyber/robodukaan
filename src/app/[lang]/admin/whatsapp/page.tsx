"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-browser";
import { adminButton, adminField } from "@/lib/admin";

type Status = {
  connected: boolean; phoneId: string; tokenEnd: string; template: string; invoiceTemplate: string; updateTemplate: string; lang: string; fromEnv: boolean;
  log: { at: string; order?: string; to?: string; ok: boolean; error?: string }[];
};

const TEMPLATE_BODY =
  "Hi {{1}}, thank you for shopping with PCBDukaan! Your order {{2}} for {{3}} has been received. We will call you shortly to confirm it and dispatch it soon. View your order: {{4}} – Team PCBDukaan";
const SAMPLES = ["Ravi", "PD261109001", "₹2,537", "https://pcbdukaan.com/account/orders/123"];
const INVOICE_BODY =
  "Hi {{1}}, your PCBDukaan order {{2}} is confirmed. Invoice no: {{3}}. Products: {{4}}. Total payable: {{5}} (incl. GST). View or download your invoice: {{6}} – Team PCBDukaan";
const UPDATE_BODY =
  "Hi {{1}}, update on your PCBDukaan order {{2}}: {{3}}. Details: {{4}} – Reply here if you have any questions. Team PCBDukaan";
const UPDATE_SAMPLES = ["Ravi", "PD261109001", "Dispatched 🚚 by Delhivery, tracking no. 1234567890", "https://pcbdukaan.com/account/orders/123"];
const INVOICE_SAMPLES = ["Ravi", "PD261109001", "PD/2026-27/0001", "1 × Mean Well EDR-120-24 (MW-EDR-120-24) ₹2,150", "₹2,537", "https://pcbdukaan.com/account/orders/123/invoice"];

async function call(method: "GET" | "POST", body?: unknown) {
  const { data } = await getSupabase().auth.getSession();
  const res = await fetch("/api/admin/whatsapp", {
    method,
    headers: { Authorization: `Bearer ${data.session?.access_token ?? ""}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  return res.ok ? { ok: true as const, json } : { ok: false as const, error: (json.error as string) || `Error ${res.status}` };
}

function CopyBox({ label, text }: { label: string; text: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="rounded border border-slate-200 bg-slate-50 p-2 text-sm">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-500">{label}</span>
        <button type="button" className="rounded bg-slate-800 px-2 py-0.5 text-xs font-semibold text-white"
          onClick={async () => { try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* select manually */ } }}>
          {done ? "Copied ✓" : "Copy"}
        </button>
      </div>
      <p className="select-all break-words font-mono text-[13px]">{text}</p>
    </div>
  );
}

// Admin → WhatsApp: automatic order confirmations on WhatsApp (Meta WhatsApp Business API).
export default function WhatsAppSettingsPage() {
  const [s, setS] = useState<Status | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await call("GET");
    if (r.ok) setS(r.json); else setMsg({ ok: false, text: r.error });
  }, []);
  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load]);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setBusy("save"); setMsg(null);
    const r = await call("POST", { action: "save", phoneId: f.get("phoneId"), token: f.get("token"), template: f.get("template"), invoiceTemplate: f.get("invoiceTemplate"), updateTemplate: f.get("updateTemplate"), lang: f.get("lang") });
    setBusy(null);
    if (r.ok) { setS(r.json); (form.elements.namedItem("token") as HTMLInputElement).value = ""; setMsg({ ok: true, text: "Saved. Now send a test message below." }); }
    else setMsg({ ok: false, text: r.error });
  }

  async function test(kind: "hello" | "order" | "invoice" | "update", to: string) {
    setBusy(kind); setMsg(null);
    const r = await call("POST", { action: "test", kind, to });
    setBusy(null);
    setMsg(r.ok ? { ok: true, text: r.json.text } : { ok: false, text: r.error });
  }

  async function remove() {
    if (!confirm("Turn off automatic WhatsApp messages and delete the saved token?")) return;
    const r = await call("POST", { action: "remove" });
    if (r.ok) { setS(r.json); setMsg({ ok: true, text: "WhatsApp turned off." }); }
  }

  return (
    <div className="max-w-3xl space-y-5">
      <h1 className="text-2xl font-bold">WhatsApp order messages</h1>
      <p className="text-sm text-slate-600">When a customer places an order they get the confirmation <b>email</b> and, once this is connected, a <b>WhatsApp message</b> from your business number – automatically, within seconds. When you set an order to <b>Confirmed</b>, they get the <b>invoice with all product details</b>, and after that every event – packed, dispatched (courier + tracking), delivered, cancelled, payment received, refund – the same way. It uses Meta&apos;s official WhatsApp Business API (about ₹0.12 per order message, billed by Meta).</p>

      {!s && !msg && <div className="h-24 animate-pulse rounded-md bg-slate-100" />}
      {s && (
        <div className={`rounded-md p-4 text-sm font-semibold ${s.connected ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200" : "bg-amber-50 text-amber-900 ring-1 ring-amber-200"}`}>
          {s.connected ? "✓ Connected – order confirmations go out on WhatsApp" : "Not connected yet – customers get the email only"}
          {s.connected && <span className="block text-xs font-normal">Phone number ID {s.phoneId} · token …{s.tokenEnd} · templates “{s.template}”, “{s.invoiceTemplate}”, “{s.updateTemplate}” ({s.lang}){s.fromEnv ? " · set on the server" : ""}</span>}
        </div>
      )}
      {msg && <p role="status" className={`rounded-md p-3 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{msg.text}</p>}

      <details className="rounded-md bg-white p-4 ring-1 ring-slate-200" open={!!s && !s.connected}>
        <summary className="cursor-pointer font-semibold">Step-by-step: get WhatsApp Business API from Meta (one time, ~30 min)</summary>
        <ol className="mt-3 list-decimal space-y-3 ps-5 text-sm text-slate-700">
          <li>Open <a className="text-brand-700 underline" href="https://business.facebook.com" target="_blank" rel="noopener noreferrer">business.facebook.com</a> and create a Meta Business account for <b>PCBDukaan</b> (use your Facebook login).</li>
          <li>Open <a className="text-brand-700 underline" href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer">developers.facebook.com/apps</a> → <b>Create app</b> → use case <b>“Connect with customers through WhatsApp”</b> → choose your business.</li>
          <li>In the app: <b>WhatsApp → API Setup</b> → <b>Add phone number</b>. Use a number that is <b>not</b> on the normal WhatsApp / WhatsApp Business app (a new SIM, or delete WhatsApp from that number first). Display name: <b>PCBDukaan</b>. Verify with the SMS code.</li>
          <li>Add a payment method in <b>WhatsApp Manager → Settings → Payment</b> (Meta charges per message; ~₹0.12 for order updates).</li>
          <li>
            <b>WhatsApp Manager → Message templates → Create template</b>: category <b>Utility</b>, name and language below, then the body text. Add the sample values when Meta asks. Approval usually takes a few minutes.
            <div className="mt-2 space-y-2">
              <CopyBox label="Template name" text="order_confirmation" />
              <CopyBox label="Language" text="English" />
              <CopyBox label="Body" text={TEMPLATE_BODY} />
              <CopyBox label="Sample values {{1}} {{2}} {{3}} {{4}}" text={SAMPLES.join("   ")} />
            </div>
          </li>
          <li>
            Create a <b>second</b> template the same way (category <b>Utility</b>) for the invoice sent when you confirm an order:
            <div className="mt-2 space-y-2">
              <CopyBox label="Template name" text="order_invoice" />
              <CopyBox label="Body" text={INVOICE_BODY} />
              <CopyBox label="Sample values {{1}} … {{6}}" text={INVOICE_SAMPLES.join("   ")} />
            </div>
          </li>
          <li>
            And a <b>third</b> template (category <b>Utility</b>) for every later update – packed, dispatched, tracking, delivered, cancelled, payment, refund:
            <div className="mt-2 space-y-2">
              <CopyBox label="Template name" text="order_update" />
              <CopyBox label="Body" text={UPDATE_BODY} />
              <CopyBox label="Sample values {{1}} … {{4}}" text={UPDATE_SAMPLES.join("   ")} />
            </div>
          </li>
          <li>
            Optional – for the <b>daily business report PDF</b> on your own WhatsApp (Admin → Daily report): a template (category <b>Utility</b>) with header type <b>Document</b>:
            <div className="mt-2 space-y-2">
              <CopyBox label="Template name" text="daily_report" />
              <CopyBox label="Header" text="Document (upload any small PDF as the sample)" />
              <CopyBox label="Body" text="PCBDukaan daily report for {{1}}: {{2}}. The full report is attached as a PDF." />
              <CopyBox label="Sample values {{1}} {{2}}" text="Mon, 10 Nov 2026   3 orders, ₹12,400 yesterday; 1 new order to confirm" />
            </div>
          </li>
          <li>Permanent token: <b>business.facebook.com → Settings → Users → System users</b> → Add (Admin) → <b>Assign assets</b> → your WhatsApp app (full control) → <b>Generate token</b>, expiry <b>Never</b>, tick <b>whatsapp_business_messaging</b> and <b>whatsapp_business_management</b>. Copy the token.</li>
          <li>Copy the <b>Phone number ID</b> from <b>WhatsApp → API Setup</b> (a long number, not your mobile number). Paste both below and press Save.</li>
        </ol>
      </details>

      <form onSubmit={save} className="space-y-3 rounded-md bg-white p-4 ring-1 ring-slate-200">
        <h2 className="font-semibold">Connection</h2>
        <label className="block text-sm font-medium">Phone number ID
          <input name="phoneId" inputMode="numeric" defaultValue={s?.phoneId ?? ""} key={s?.phoneId} required placeholder="e.g. 106540352242922" className={adminField} />
        </label>
        <label className="block text-sm font-medium">Permanent access token {s?.tokenEnd && <span className="font-normal text-slate-500">(saved: …{s.tokenEnd} – leave empty to keep it)</span>}
          <input name="token" type="password" autoComplete="off" required={!s?.tokenEnd} placeholder="EAA…" className={adminField} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-medium">Order template<input name="template" defaultValue={s?.template ?? "order_confirmation"} key={s?.template} className={adminField} /></label>
          <label className="block text-sm font-medium">Invoice template<input name="invoiceTemplate" defaultValue={s?.invoiceTemplate ?? "order_invoice"} key={s?.invoiceTemplate} className={adminField} /></label>
          <label className="block text-sm font-medium">Update template<input name="updateTemplate" defaultValue={s?.updateTemplate ?? "order_update"} key={s?.updateTemplate} className={adminField} /></label>
          <label className="block text-sm font-medium">Language code<input name="lang" defaultValue={s?.lang ?? "en"} key={s?.lang} className={adminField} /></label>
        </div>
        <p className="text-xs text-slate-500">The token is stored only on your server and never shown again. If the template language in WhatsApp Manager is “English (US)”, use <code>en_US</code>.</p>
        <div className="flex flex-wrap gap-2">
          <button disabled={busy === "save"} className={adminButton}>{busy === "save" ? "Saving…" : "Save"}</button>
          {s?.connected && !s.fromEnv && <button type="button" onClick={remove} className="rounded-md bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Turn off</button>}
        </div>
      </form>

      {s?.connected && (
        <form className="space-y-3 rounded-md bg-white p-4 ring-1 ring-slate-200" onSubmit={(e) => e.preventDefault()}>
          <h2 className="font-semibold">Send a test</h2>
          <label className="block text-sm font-medium">Your mobile number<input id="wa-test-to" type="tel" inputMode="numeric" placeholder="98765 43210" className={adminField} /></label>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={!!busy} onClick={() => test("hello", (document.getElementById("wa-test-to") as HTMLInputElement).value)} className="rounded-md bg-slate-800 px-4 py-2 text-sm font-semibold text-white">{busy === "hello" ? "Sending…" : "1. Test connection (hello_world)"}</button>
            <button type="button" disabled={!!busy} onClick={() => test("order", (document.getElementById("wa-test-to") as HTMLInputElement).value)} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">{busy === "order" ? "Sending…" : "2. Test order message"}</button>
            <button type="button" disabled={!!busy} onClick={() => test("invoice", (document.getElementById("wa-test-to") as HTMLInputElement).value)} className="rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white">{busy === "invoice" ? "Sending…" : "3. Test invoice message"}</button>
            <button type="button" disabled={!!busy} onClick={() => test("update", (document.getElementById("wa-test-to") as HTMLInputElement).value)} className="rounded-md bg-violet-700 px-4 py-2 text-sm font-semibold text-white">{busy === "update" ? "Sending…" : "4. Test update message"}</button>
          </div>
          <p className="text-xs text-slate-500">While your Meta app is new, test messages only reach numbers added under WhatsApp → API Setup → “To”. After you add the payment method and your number is approved, every customer receives them.</p>
        </form>
      )}

      {!!s?.log.length && (
        <section className="rounded-md bg-white p-4 ring-1 ring-slate-200">
          <h2 className="mb-2 font-semibold">Recent messages</h2>
          <ul className="divide-y divide-slate-100 text-sm">
            {s.log.map((l, i) => (
              <li key={i} className="flex flex-wrap justify-between gap-2 py-1.5">
                <span>{l.ok ? "✓" : "✕"} {l.order} <span className="text-slate-500">to {l.to}</span></span>
                <span className={l.ok ? "text-slate-500" : "text-red-600"}>{l.ok ? new Date(l.at).toLocaleString("en-IN") : l.error}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
