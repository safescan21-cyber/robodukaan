"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabase-browser";

// Dashboard card: send every page to Bing/IndexNow, plus links to Google and Bing webmaster tools.
export function SubmitToSearchEngines() {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setMsg(null);
    const { data } = await getSupabase().auth.getSession();
    const res = await fetch("/api/indexnow", { method: "POST", headers: { Authorization: `Bearer ${data.session?.access_token ?? ""}` } }).catch(() => null);
    const json = await res?.json().catch(() => ({}));
    setBusy(false);
    setMsg(res?.ok ? { ok: true, text: `✓ Sent ${json.sent} pages to Bing and other IndexNow search engines.` } : { ok: false, text: json?.error ?? "Something went wrong." });
  }

  return (
    <section className="rounded-md bg-white p-4 ring-1 ring-slate-200">
      <h2 className="text-sm font-bold uppercase tracking-wide">Search engines</h2>
      <p className="mt-1 text-sm text-slate-600">Product saves are sent automatically. Use this after big changes (many new products, new pages).</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button onClick={submit} disabled={busy} className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
          {busy ? "Sending…" : "Submit all pages to search engines"}
        </button>
        <a href="https://search.google.com/search-console/sitemaps?resource_id=sc-domain%3Apcbdukaan.com" target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-brand-700 hover:underline">Google Search Console ↗</a>
        <a href="https://www.bing.com/webmasters" target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-brand-700 hover:underline">Bing Webmaster Tools ↗</a>
      </div>
      {msg && <p className={`mt-2 text-sm ${msg.ok ? "text-emerald-700" : "text-red-600"}`} role="status">{msg.text}</p>}
    </section>
  );
}
