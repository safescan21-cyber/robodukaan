"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-browser";

type Status = { checked_at: string | null; results: { name: string; ok: boolean; detail: string }[] };

// Admin → Site health: what the server monitor found in its last run (every 5 minutes).
export default function SiteHealthPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await getSupabase().auth.getSession();
    const res = await fetch("/api/admin/site-health", { headers: { Authorization: `Bearer ${data.session?.access_token ?? ""}` }, cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) setError(json.error || `Error ${res.status}`);
    else { setError(null); setStatus(json); }
  }, []);
  useEffect(() => {
    const first = setTimeout(load, 0);
    const t = setInterval(load, 60_000);
    return () => { clearTimeout(first); clearInterval(t); };
  }, [load]);

  const bad = status?.results.filter((r) => !r.ok) ?? [];
  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">Site health</h1>
      <p className="text-sm text-slate-600">Your server checks the website, every API, the database, services, disk, memory and SSL every 5 minutes. If something fails twice in a row you get an email, and another when it works again.</p>
      {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
      {!status && !error && <div className="h-40 animate-pulse rounded-md bg-slate-100" />}
      {status && !status.checked_at && <p className="rounded-md bg-amber-50 p-4 text-sm text-amber-900">The monitor hasn&apos;t run yet – it starts automatically within about 10 minutes after the next server update.</p>}
      {status?.checked_at && (
        <>
          <div className={`rounded-md p-4 font-semibold ${bad.length ? "bg-red-50 text-red-800 ring-1 ring-red-200" : "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"}`}>
            {bad.length ? `✕ ${bad.length} problem${bad.length > 1 ? "s" : ""} found` : "✓ Everything is working"}
            <span className="block text-xs font-normal">Last check: {status.checked_at} · {status.results.filter((r) => r.ok).length}/{status.results.length} OK</span>
          </div>
          <ul className="divide-y divide-slate-100 rounded-md bg-white ring-1 ring-slate-200">
            {[...bad, ...status.results.filter((r) => r.ok)].map((r) => (
              <li key={r.name} className="flex gap-3 p-3 text-sm">
                <span className={r.ok ? "text-emerald-600" : "text-red-600"}>{r.ok ? "✓" : "✕"}</span>
                <div><p className="font-medium">{r.name}</p><p className="text-xs text-slate-500">{r.detail}</p></div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
