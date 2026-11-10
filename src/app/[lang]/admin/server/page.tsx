"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-browser";
import { adminField } from "@/lib/admin";

type Info = { serverIp: string | null; apiHost: string; apiIps: string[]; dnsReady: boolean; serverReady: boolean; pending: boolean; status: string };
const REF = "cjslvfsrfjslpnyjrvhr";

async function call(method: "GET" | "POST", body?: unknown) {
  const { data } = await getSupabase().auth.getSession();
  const res = await fetch("/api/admin/server-move", {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
  return json;
}

// Admin → Server move: move the database from Supabase cloud to the VPS without the terminal.
export default function ServerMovePage() {
  const [info, setInfo] = useState<Info | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setInfo(await call("GET")); setError(null); } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }, []);
  useEffect(() => {
    const first = setTimeout(load, 0);
    const t = setInterval(load, 30_000);
    return () => { clearTimeout(first); clearInterval(t); };
  }, [load]);

  async function start(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;   // React clears e.currentTarget after the first await
    const f = new FormData(form);
    setBusy(true); setMsg(null); setError(null);
    try {
      await call("POST", {
        action: "start",
        cloud_url: String(f.get("cloud_url") ?? ""),
        s3_key: String(f.get("s3_key") ?? ""),
        s3_secret: String(f.get("s3_secret") ?? ""),
        s3_region: String(f.get("s3_region") ?? ""),
        night: f.get("night") === "on",
      });
      form.reset();   // don't leave the password and keys on screen
      setMsg("Saved. The server starts the move within 5 minutes – progress appears below. You'll also get an email at the end.");
      load();
    } catch (err) { setError(err instanceof Error ? err.message : String(err)); }
    setBusy(false);
  }

  async function cancel() {
    if (!confirm("Stop the automatic move? (If the website was already switched, it stays switched – use the terminal --back command to undo.)")) return;
    try { await call("POST", { action: "cancel" }); setMsg("Cancel sent – the server stops within 5 minutes."); load(); } catch (err) { setError(err instanceof Error ? err.message : String(err)); }
  }

  // The latest milestone decides the state (reason lines can follow a STOPPED line).
  const milestone = [...(info?.status.trim().split("\n") ?? [])].reverse().find((l) => /STOPPED|ALL DONE|Cancelled|move started|Trying again|Details received/.test(l)) ?? "";
  const stopped = /STOPPED/.test(milestone);
  const running = !!milestone && !stopped && !/ALL DONE|Cancelled/.test(milestone);

  async function retry() {
    setBusy(true); setError(null);
    try { await call("POST", { action: "retry" }); setMsg("Sent – the server tries again within 5 minutes, using your saved details."); load(); } catch (err) { setError(err instanceof Error ? err.message : String(err)); }
    setBusy(false);
  }
  return (
    <div className="max-w-3xl space-y-5">
      <h1 className="text-2xl font-bold">Server move</h1>
      <p className="text-sm text-slate-600">Move the database from Supabase cloud to your own VPS. Fill this in once – the server does the rest, at night, checks the website and switches back by itself if anything fails.</p>
      {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
      {msg && <p className="rounded bg-emerald-50 p-3 text-sm text-emerald-800" role="status">{msg}</p>}

      <section className="rounded-md bg-white p-5 ring-1 ring-slate-200">
        <h2 className="font-bold">1. DNS check</h2>
        {!info ? <div className="mt-2 h-12 animate-pulse rounded bg-slate-100" /> : (
          <div className="mt-2 space-y-1 text-sm">
            <p>Your server&apos;s IP address: <b className="font-mono">{info.serverIp ?? "unknown"}</b></p>
            <p>{info.apiHost} points to: <b className="font-mono">{info.apiIps.join(", ") || "nothing yet"}</b></p>
            <p className={`font-semibold ${info.dnsReady ? "text-emerald-700" : "text-amber-700"}`}>
              {info.dnsReady ? "✓ DNS is ready." : `✕ Not ready. At Hostinger, the A record "api" must point to ${info.serverIp ?? "your server IP"}. (The move waits for this by itself.)`}
            </p>
            <a href="https://hpanel.hostinger.com/domain/pcbdukaan.com/dns" target="_blank" rel="noopener noreferrer" className="inline-block text-brand-700 hover:underline">Open Hostinger DNS →</a>
          </div>
        )}
      </section>

      <form onSubmit={start} className="space-y-3 rounded-md bg-white p-5 ring-1 ring-slate-200">
        <h2 className="font-bold">2. Details from Supabase</h2>
        <label className="block text-sm font-medium">Connection string
          <span className="block text-xs font-normal text-slate-500">
            <a href={`https://supabase.com/dashboard/project/${REF}?showConnect=true`} target="_blank" rel="noopener noreferrer" className="text-brand-700 hover:underline">Supabase → Connect</a> → “Session pooler” → copy. Replace [YOUR-PASSWORD] with your database password.
          </span>
          <textarea name="cloud_url" required rows={3} autoComplete="off" spellCheck={false} placeholder="postgresql://postgres.xxxx:PASSWORD@aws-0-ap-south-1.pooler.supabase.com:5432/postgres" className={`${adminField} font-mono text-xs`} />
        </label>
        <p className="text-xs text-slate-500">
          <a href={`https://supabase.com/dashboard/project/${REF}/settings/storage`} target="_blank" rel="noopener noreferrer" className="text-brand-700 hover:underline">Supabase → Storage settings</a> → “S3 Connection” → “New access key”:
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium">Access key ID<input name="s3_key" required autoComplete="off" spellCheck={false} className={`${adminField} font-mono text-xs`} /></label>
          <label className="block text-sm font-medium">Secret access key<input name="s3_secret" type="password" required autoComplete="new-password" className={`${adminField} font-mono text-xs`} /></label>
          <label className="block text-sm font-medium">Region <span className="font-normal text-slate-500">(optional, e.g. ap-south-1)</span><input name="s3_region" autoComplete="off" className={adminField} /></label>
          <label className="flex items-center gap-2 self-end text-sm font-medium"><input name="night" type="checkbox" defaultChecked /> Switch at night (1–5 AM)</label>
        </div>
        <p className="text-xs text-slate-500">These details go only to your own server, which deletes them when the move is finished.</p>
        <button disabled={busy || info?.serverReady === false} className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
          {busy ? "Saving…" : "Start automatic move"}
        </button>
        {info && !info.serverReady && <p className="text-xs text-amber-700">The server is still updating itself – try again in 5–10 minutes.</p>}
      </form>

      <section className="rounded-md bg-white p-5 ring-1 ring-slate-200">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-bold">3. Progress</h2>
          {running && <button type="button" onClick={cancel} className="text-sm font-semibold text-red-600 hover:underline">Cancel</button>}
        </div>
        {info?.pending && <p className="mt-2 text-sm text-amber-700">Waiting for the server to pick up the details (within 5 minutes)…</p>}
        {stopped && !info?.pending && (
          <div className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
            <p>The move stopped and <b>your website was not changed</b> – it keeps working on Supabase cloud. The lines starting with “reason:” say why. The same details were also emailed to you.</p>
            <p className="mt-1">If it was the connection string: fill in the form above again with the <b>Session pooler</b> string. Otherwise:</p>
            <button type="button" onClick={retry} disabled={busy} className="mt-2 rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60">↻ Try again (saved details)</button>
          </div>
        )}
        <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap rounded bg-slate-900 p-3 text-xs text-slate-100">{info?.status.trim() || "Not started yet."}</pre>
        <p className="mt-1 text-xs text-slate-500">Refreshes every 30 seconds.</p>
      </section>
    </div>
  );
}
