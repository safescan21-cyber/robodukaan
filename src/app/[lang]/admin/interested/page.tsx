"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase-browser";
import { adminField } from "@/lib/admin";
import { formatDate } from "@/lib/format";
import { toCsv } from "@/lib/product-import";

type Row = {
  user_id: string; full_name: string | null; email: string | null; phone: string | null; marketing_ok: boolean;
  product_id: string; product_name: string; product_slug: string; views: number; last_viewed: string;
  in_wishlist: boolean; ordered: boolean;
};
const SITE = "https://pcbdukaan.com";

function offerEmail(r: Row) {
  return {
    subject: `${r.product_name} – PCBDukaan`,
    body: `Hello ${r.full_name?.split(" ")[0] || ""},

You recently looked at ${r.product_name} on PCBDukaan:
${SITE}/products/${r.product_slug}

[Write your offer or update here – e.g. back in stock, special price, delivery time.]

If you have any questions, just reply to this email.

Regards,
PCBDukaan

You receive this because you chose "Email me offers" in your PCBDukaan account. To stop, reply STOP or untick it in My account → Profile.`,
  };
}

// Admin → Interested customers: logged-in customers who viewed products (last 7–180 days).
export default function InterestedPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [days, setDays] = useState(30);
  const [q, setQ] = useState("");
  const [consentOnly, setConsentOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await getSupabase().rpc("admin_interested_customers", { p_product: null, p_days: days });
    setError(error ? (/admin_interested_customers|function/.test(error.message) ? "Run database update 020 first." : error.message) : null);
    setRows((data as Row[]) ?? []);
  }, [days]);
  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (rows ?? []).filter((r) => (!consentOnly || r.marketing_ok)
      && (!term || [r.product_name, r.full_name, r.email, r.phone].some((v) => v?.toLowerCase().includes(term))));
  }, [rows, q, consentOnly]);

  function exportCsv() {
    const csv = toCsv([["name", "email", "phone", "offers_ok", "product", "views", "last_viewed", "in_wishlist", "ordered"],
      ...shown.map((r) => [r.full_name, r.email, r.phone, r.marketing_ok ? "yes" : "no", r.product_name, r.views, r.last_viewed.slice(0, 10), r.in_wishlist ? "yes" : "no", r.ordered ? "yes" : "no"])]);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `interested-customers-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Interested customers</h1>
        <Link href="/admin/visitors" className="text-sm font-semibold text-brand-700 hover:underline">← Live visitors</Link>
      </div>
      <p className="text-sm text-slate-600">
        Logged-in customers and the products they looked at. The <b>Email</b> button works only for customers who chose
        “Email me offers” (Indian data-protection law requires their consent for offers).
      </p>
      {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs font-medium">Period
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} className={adminField}>
            {[7, 30, 90, 180].map((d) => <option key={d} value={d}>Last {d} days</option>)}
          </select>
        </label>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search product, name, email…" className={`${adminField} max-w-xs`} aria-label="Search" />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={consentOnly} onChange={(e) => setConsentOnly(e.target.checked)} /> Only customers who accept offers</label>
        <button type="button" onClick={exportCsv} disabled={!shown.length} className="rounded-md px-3 py-2 text-sm font-semibold ring-1 ring-slate-300 disabled:opacity-50">Download CSV</button>
      </div>
      {rows === null && <div className="h-40 animate-pulse rounded-md bg-slate-100" />}
      {rows && shown.length === 0 && <p className="text-sm text-slate-500">No product views from logged-in customers in this period yet.</p>}
      <div className="space-y-2">
        {shown.map((r) => {
          const mail = offerEmail(r);
          return (
            <div key={r.user_id + r.product_id} className="flex flex-wrap items-start justify-between gap-3 rounded-md bg-white p-4 ring-1 ring-slate-200">
              <div className="text-sm">
                <p className="font-bold">{r.full_name || "—"} <span className="font-normal text-slate-500">{r.email}{r.phone ? ` · ${r.phone}` : ""}</span></p>
                <p>Viewed <a href={`/products/${r.product_slug}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-700 hover:underline">{r.product_name}</a> {r.views}× · last {formatDate(r.last_viewed)}</p>
                <p className="mt-1 flex flex-wrap gap-1 text-xs">
                  {r.in_wishlist && <span className="rounded bg-pink-100 px-1.5 text-pink-800">♥ in wishlist</span>}
                  {r.ordered && <span className="rounded bg-emerald-100 px-1.5 text-emerald-800">already ordered</span>}
                  <span className={`rounded px-1.5 ${r.marketing_ok ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{r.marketing_ok ? "accepts offers" : "no offers consent"}</span>
                </p>
              </div>
              {r.marketing_ok && r.email ? (
                <a href={`mailto:${r.email}?subject=${encodeURIComponent(mail.subject)}&body=${encodeURIComponent(mail.body)}`} className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700">✉️ Email</a>
              ) : (
                <span className="text-xs text-slate-400" title="The customer has not agreed to receive offers">Email not allowed</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
