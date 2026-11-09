"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-browser";

type Live = {
  online: number; online_logged_in: number; today_visitors: number; today_product_views: number;
  people: { name: string | null; email: string | null; phone: string | null; marketing_ok: boolean; path: string; product: string | null; last_seen: string }[];
  pages: { path: string; visitors: number }[];
  top_products_today: { name: string; slug: string; views: number }[];
};

// Admin → Visitors: who is on the website right now (refreshes every 30 seconds).
export default function VisitorsPage() {
  const [live, setLive] = useState<Live | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    const { data, error } = await getSupabase().rpc("admin_live_visitors");
    setError(error ? (/admin_live_visitors|function/.test(error.message) ? "Run database update 020 first." : error.message) : null);
    if (data) setLive(data as Live);
  }, []);
  useEffect(() => {
    const first = setTimeout(load, 0);
    const t = setInterval(load, 30_000);
    return () => { clearTimeout(first); clearInterval(t); };
  }, [load]);

  const card = (label: string, value: number | string, hint?: string) => (
    <div className="rounded-md bg-white p-4 ring-1 ring-slate-200"><p className="text-xs uppercase text-slate-500">{label}</p><p className="text-2xl font-bold">{value}</p>{hint && <p className="text-xs text-slate-500">{hint}</p>}</div>
  );
  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Visitors <span className="ms-1 inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500 align-middle" aria-hidden="true" /></h1>
        <Link href="/admin/interested" className="text-sm font-semibold text-brand-700 hover:underline">Interested customers →</Link>
      </div>
      <p className="text-sm text-slate-600">Live view – updates every 30 seconds. Admins are not counted. Visitors who are not logged in are anonymous.</p>
      {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
      {!live && !error && <div className="h-40 animate-pulse rounded-md bg-slate-100" />}
      {live && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {card("On the site now", live.online, "active in the last 3 min")}
            {card("Logged in now", live.online_logged_in)}
            {card("Visitors today", live.today_visitors, "browser sessions")}
            {card("Product views today", live.today_product_views)}
          </div>
          <section className="rounded-md bg-white p-4 ring-1 ring-slate-200">
            <h2 className="font-bold">Logged-in customers on the site now</h2>
            {live.people.length === 0 ? <p className="mt-2 text-sm text-slate-500">None right now.</p> : (
              <ul className="mt-2 divide-y divide-slate-100 text-sm">
                {live.people.map((p, i) => (
                  <li key={i} className="py-2">
                    <p className="font-medium">{p.name || "—"} <span className="text-slate-500">{p.email}</span> {p.marketing_ok && <span className="ms-1 rounded bg-emerald-100 px-1.5 text-xs text-emerald-800">offers OK</span>}</p>
                    <p className="text-xs text-slate-500">Looking at: {p.product ? <b>{p.product}</b> : p.path}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <div className="grid gap-4 sm:grid-cols-2">
            <section className="rounded-md bg-white p-4 ring-1 ring-slate-200">
              <h2 className="font-bold">Pages open now</h2>
              {live.pages.length === 0 ? <p className="mt-2 text-sm text-slate-500">Nobody on the site right now.</p> : (
                <ul className="mt-2 space-y-1 text-sm">{live.pages.map((p) => <li key={p.path} className="flex justify-between gap-2"><span className="truncate font-mono text-xs">{p.path}</span><b>{p.visitors}</b></li>)}</ul>
              )}
            </section>
            <section className="rounded-md bg-white p-4 ring-1 ring-slate-200">
              <h2 className="font-bold">Most viewed products (24 h)</h2>
              {live.top_products_today.length === 0 ? <p className="mt-2 text-sm text-slate-500">No product views yet.</p> : (
                <ul className="mt-2 space-y-1 text-sm">{live.top_products_today.map((p) => <li key={p.slug} className="flex justify-between gap-2"><a href={`/products/${p.slug}`} target="_blank" rel="noopener noreferrer" className="truncate text-brand-700 hover:underline">{p.name}</a><b>{p.views}</b></li>)}</ul>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
