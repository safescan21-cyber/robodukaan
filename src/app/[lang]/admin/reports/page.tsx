"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-browser";
import { adminButton, adminField } from "@/lib/admin";

type Last = { at: string; subject: string; email: { ok: boolean; to?: string[]; error?: string } | null; whatsapp: { to: string; ok: boolean; error?: string; note?: string }[] };
type Status = { on: boolean; emails: string[]; whatsapp: string[]; defaultEmail: string; emailReady: boolean; last: Last | null };

async function call(method: "GET" | "POST", body?: unknown) {
  const { data } = await getSupabase().auth.getSession();
  const res = await fetch("/api/admin/reports", {
    method, cache: "no-store", body: body ? JSON.stringify(body) : undefined,
    headers: { Authorization: `Bearer ${data.session?.access_token ?? ""}`, ...(body ? { "Content-Type": "application/json" } : {}) },
  });
  const json = await res.json().catch(() => ({}));
  return res.ok ? { ok: true as const, json } : { ok: false as const, error: (json.error as string) || `Error ${res.status}` };
}

// Admin → Daily report: the morning business report (sales, orders to handle, stock, repairs, website health,
// AI summary) as a PDF by email and WhatsApp.
export default function ReportsPage() {
  const [s, setS] = useState<Status | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => { const r = await call("GET"); if (r.ok) setS(r.json); else setMsg({ ok: false, text: r.error }); }, []);
  useEffect(() => { const t = setTimeout(load, 0); const i = setInterval(load, 20_000); return () => { clearTimeout(t); clearInterval(i); }; }, [load]);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true); setMsg(null);
    const r = await call("POST", { action: "save", emails: f.get("emails"), whatsapp: f.get("whatsapp"), enabled: f.get("enabled") === "on" });
    setBusy(false);
    if (r.ok) { setS(r.json); setMsg({ ok: true, text: r.json.on ? "Saved – the report comes every morning at 8 AM." : "Saved – the report is switched off." }); }
    else setMsg({ ok: false, text: r.error });
  }

  async function sendNow() {
    setBusy(true); setMsg(null);
    const r = await call("POST", { action: "send" });
    setBusy(false);
    setMsg(r.ok ? { ok: true, text: r.json.text } : { ok: false, text: r.error });
  }

  return (
    <div className="max-w-3xl space-y-5">
      <h1 className="text-2xl font-bold">Daily report</h1>
      <p className="text-sm text-slate-600">Every morning at 8 AM your server sends yesterday’s business report – a short summary written by the AI, sales (yesterday, 7 days, month), orders waiting to be handled, best sellers, low stock, new customers, repair requests and website health – as a <b>PDF</b> by email and WhatsApp.</p>
      {s && (
        <div className={`rounded-md p-4 text-sm font-semibold ${s.on ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200" : "bg-amber-50 text-amber-900 ring-1 ring-amber-200"}`}>
          {s.on ? "✓ The report is ON – every day at 8 AM" : "The report is OFF – fill in below and press Save"}
          {!s.emailReady && <span className="block text-xs font-normal">Email isn’t set up on the server, so only WhatsApp can be used.</span>}
        </div>
      )}
      {msg && <p role="status" className={`rounded-md p-3 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{msg.text}</p>}

      {s && (
        <form onSubmit={save} className="space-y-3 rounded-md bg-white p-4 ring-1 ring-slate-200" key={`${s.emails.join()}|${s.whatsapp.join()}|${s.on}`}>
          <label className="block text-sm font-medium">Email addresses <span className="font-normal text-slate-500">(comma separated; empty = {s.defaultEmail || "the admin email"})</span>
            <input name="emails" defaultValue={s.emails.join(", ")} placeholder={s.defaultEmail} className={adminField} />
          </label>
          <label className="block text-sm font-medium">WhatsApp numbers <span className="font-normal text-slate-500">(10-digit mobile numbers, comma separated)</span>
            <input name="whatsapp" defaultValue={s.whatsapp.map((n) => n.replace(/^91/, "")).join(", ")} inputMode="tel" placeholder="98765 43210" className={adminField} />
          </label>
          <p className="text-xs text-slate-500">WhatsApp needs the connection in <b>Admin → WhatsApp</b> and an approved template named <code>daily_report</code> with a <b>Document</b> header (the steps are on that page). Until then, the PDF only reaches numbers that sent a message to your business WhatsApp in the last 24 hours.</p>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="enabled" defaultChecked={s.on || !s.last} className="h-4 w-4 accent-brand-600" />Send every morning at 8 AM</label>
          <div className="flex flex-wrap gap-2">
            <button disabled={busy} className={adminButton}>Save</button>
            <button type="button" onClick={sendNow} disabled={busy} className="rounded-md bg-slate-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">📨 Send the report now</button>
          </div>
        </form>
      )}

      {s?.last && (
        <section className="rounded-md bg-white p-4 text-sm ring-1 ring-slate-200">
          <h2 className="mb-2 font-semibold">Last report</h2>
          <p className="text-slate-600">{new Date(s.last.at).toLocaleString("en-IN")} – {s.last.subject}</p>
          <ul className="mt-2 space-y-1">
            <li>{s.last.email?.ok ? `✓ Email sent to ${s.last.email.to?.join(", ")}` : `✕ Email: ${s.last.email?.error ?? "not sent"}`}</li>
            {s.last.whatsapp.map((w, i) => <li key={i}>{w.ok ? `✓ WhatsApp +${w.to}${w.note ? ` (${w.note})` : ""}` : `✕ WhatsApp +${w.to}: ${w.error}`}</li>)}
          </ul>
        </section>
      )}
    </div>
  );
}
