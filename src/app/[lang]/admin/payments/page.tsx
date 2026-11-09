"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-browser";
import { adminButton, adminField } from "@/lib/admin";

type Status = { enabled: boolean; keyId: string; mode: string; secretEnd: string; webhook: boolean; dbReady: boolean; fromEnv: boolean };

async function call(method: "GET" | "POST", body?: unknown) {
  const { data } = await getSupabase().auth.getSession();
  const res = await fetch("/api/admin/payments", {
    method,
    headers: { Authorization: `Bearer ${data.session?.access_token ?? ""}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  return res.ok ? { ok: true as const, json } : { ok: false as const, error: (json.error as string) || `Error ${res.status}` };
}

// Admin → Payments: switch on online payment (UPI, cards, net banking) with Razorpay.
export default function PaymentsPage() {
  const [s, setS] = useState<Status | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const webhookUrl = typeof window !== "undefined" ? `${window.location.origin}/api/pay/webhook` : "https://pcbdukaan.com/api/pay/webhook";

  const load = useCallback(async () => {
    const r = await call("GET");
    if (r.ok) setS(r.json); else setMsg({ ok: false, text: r.error });
  }, []);
  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load]);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setBusy(true); setMsg(null);
    const r = await call("POST", { action: "save", keyId: f.get("keyId"), keySecret: f.get("keySecret"), webhookSecret: f.get("webhookSecret") });
    setBusy(false);
    if (r.ok) {
      setS(r.json);
      (form.elements.namedItem("keySecret") as HTMLInputElement).value = "";
      (form.elements.namedItem("webhookSecret") as HTMLInputElement).value = "";
      setMsg({ ok: true, text: "Saved – customers can now pay online at checkout." });
    } else setMsg({ ok: false, text: r.error });
  }

  return (
    <div className="max-w-3xl space-y-5">
      <h1 className="text-2xl font-bold">Online payment</h1>
      <p className="text-sm text-slate-600">Let customers pay by <b>UPI, cards, net banking and wallets</b> at checkout, through Razorpay. Cash on delivery stays available. Razorpay charges about 2% per payment and pays out to your bank account (usually T+2 days). Each payment is checked by your database before an order is marked paid.</p>

      {s && (
        <div className={`rounded-md p-4 text-sm font-semibold ${s.enabled && s.dbReady ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200" : "bg-amber-50 text-amber-900 ring-1 ring-amber-200"}`}>
          {s.enabled && s.dbReady ? `✓ Online payment is ON${s.mode === "test" ? " – TEST mode (no real money)" : ""}` : "Online payment is OFF – customers can only pay cash on delivery"}
          {s.enabled && <span className="block text-xs font-normal">Key {s.keyId} · secret …{s.secretEnd} · webhook {s.webhook ? "set" : "not set (recommended)"}{s.fromEnv ? " · set on the server" : ""}</span>}
          {s.enabled && !s.dbReady && <span className="block text-xs font-normal">Press Save once more so the database also gets the key secret.</span>}
        </div>
      )}
      {msg && <p role="status" className={`rounded-md p-3 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{msg.text}</p>}

      <details className="rounded-md bg-white p-4 ring-1 ring-slate-200" open={!!s && !s.enabled}>
        <summary className="cursor-pointer font-semibold">Step-by-step: get your Razorpay keys (~20 min + KYC approval)</summary>
        <ol className="mt-3 list-decimal space-y-2 ps-5 text-sm text-slate-700">
          <li>Sign up at <a className="text-brand-700 underline" href="https://dashboard.razorpay.com/signup" target="_blank" rel="noopener noreferrer">dashboard.razorpay.com</a> with your business email and mobile.</li>
          <li>Complete <b>KYC / activation</b>: business type, PAN, GSTIN, bank account, and the website <b>pcbdukaan.com</b> (Razorpay checks that it has Contact, Shipping &amp; Returns, Privacy and Terms pages – yours do).</li>
          <li>To try it first: switch the dashboard to <b>Test mode</b>, then <b>Account &amp; Settings → API Keys → Generate key</b>. Test keys start with <code>rzp_test_</code> – no real money moves.</li>
          <li>After activation: switch to <b>Live mode</b> and generate live keys (<code>rzp_live_</code>). Copy the <b>Key ID</b> and <b>Key Secret</b> (the secret is shown only once).</li>
          <li><b>Webhook</b> (recommended – marks orders paid even if the customer closes the browser): <b>Account &amp; Settings → Webhooks → Add new webhook</b>. URL: <code className="break-all">{webhookUrl}</code>, choose a secret, tick <b>payment.captured</b> and <b>order.paid</b>.</li>
          <li>Paste the keys (and the webhook secret) below and press Save. Then place a small test order and pay.</li>
        </ol>
      </details>

      <form onSubmit={save} className="space-y-3 rounded-md bg-white p-4 ring-1 ring-slate-200">
        <h2 className="font-semibold">Razorpay keys</h2>
        <label className="block text-sm font-medium">Key ID<input name="keyId" defaultValue={s?.keyId ?? ""} key={s?.keyId} required placeholder="rzp_live_…" autoComplete="off" className={adminField} /></label>
        <label className="block text-sm font-medium">Key Secret {s?.secretEnd && <span className="font-normal text-slate-500">(saved: …{s.secretEnd} – leave empty to keep it)</span>}
          <input name="keySecret" type="password" autoComplete="off" required={!s?.secretEnd} className={adminField} />
        </label>
        <label className="block text-sm font-medium">Webhook secret <span className="font-normal text-slate-500">(the secret you typed when adding the webhook{s?.webhook ? " – saved, leave empty to keep it" : ""})</span>
          <input name="webhookSecret" type="password" autoComplete="off" className={adminField} />
        </label>
        <p className="text-xs text-slate-500">The keys are checked with Razorpay before saving, kept only on your server and database, and never shown again.</p>
        <div className="flex flex-wrap gap-2">
          <button disabled={busy} className={adminButton}>{busy ? "Checking…" : "Save"}</button>
          {s?.enabled && (
            <>
              <button type="button" onClick={async () => { const r = await call("POST", { action: "test" }); setMsg(r.ok ? { ok: true, text: r.json.text } : { ok: false, text: r.error }); }} className="rounded-md bg-slate-800 px-4 py-2 text-sm font-semibold text-white">Test connection</button>
              {!s.fromEnv && <button type="button" onClick={async () => { if (!confirm("Turn off online payment? Customers will only see cash on delivery.")) return; const r = await call("POST", { action: "off" }); if (r.ok) { setS(r.json); setMsg({ ok: true, text: "Online payment turned off." }); } }} className="rounded-md bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Turn off</button>}
            </>
          )}
        </div>
      </form>
      <p className="text-xs text-slate-500">Paid orders show “Paid online” in Admin → Orders. Unpaid online orders keep their stock reserved – cancel them in Admin → Orders if the customer doesn’t pay.</p>
    </div>
  );
}
