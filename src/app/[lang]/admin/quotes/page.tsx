"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-browser";
import { adminField } from "@/lib/admin";
import { formatDate, formatINR } from "@/lib/format";
import { Pager } from "@/components/Pager";
import type { QuoteRequest, QuoteStatus } from "@/lib/types";

const STATUSES: [QuoteStatus, string, string][] = [
  ["new", "New", "bg-amber-100 text-amber-800"],
  ["quoted", "Quote sent", "bg-sky-100 text-sky-800"],
  ["won", "Won (ordered)", "bg-emerald-100 text-emerald-800"],
  ["lost", "Lost", "bg-slate-200 text-slate-700"],
];

export default function AdminQuotesPage() {
  const [rows, setRows] = useState<QuoteRequest[] | null>(null);
  const [status, setStatus] = useState<string>("open");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const PAGE = 25;

  const load = useCallback(async () => {
    let req = getSupabase().from("quote_requests").select("*", { count: "exact" }).order("created_at", { ascending: false }).range(page * PAGE, page * PAGE + PAGE - 1);
    if (status === "open") req = req.in("status", ["new", "quoted"]);
    else if (status) req = req.eq("status", status);
    const term = q.trim().replace(/[%,()*\\]/g, " ");
    if (term) req = req.or(`quote_number.ilike.%${term}%,name.ilike.%${term}%,company.ilike.%${term}%,phone.ilike.%${term}%,product_name.ilike.%${term}%`);
    const { data, count, error } = await req;
    setError(error ? (error.message.includes("quote_requests") ? "Run supabase/migrations/RUN-IN-SUPABASE.sql (update 009) in Supabase first." : error.message) : null);
    setRows((data as QuoteRequest[]) ?? []);
    setTotal(count ?? 0);
  }, [status, q, page]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function save(row: QuoteRequest, form: HTMLFormElement) {
    const f = new FormData(form);
    const amount = String(f.get("quoted_amount")).trim();
    const { error } = await getSupabase().from("quote_requests").update({
      status: String(f.get("status")),
      quoted_amount: amount ? Number(amount) : null,
      admin_notes: String(f.get("admin_notes")).trim() || null,
    }).eq("id", row.id);
    if (error) setError(error.message);
    else load();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Bulk quote requests</h1>
      <div className="flex flex-wrap gap-2">
        {[["open", "Open"], ["", "All"], ...STATUSES.map(([v, l]) => [v, l])].map(([value, label]) => (
          <button key={value} onClick={() => { setStatus(value); setPage(0); }}
            className={`rounded-full px-3 py-1 text-sm ring-1 ${status === value ? "bg-brand-600 text-white ring-brand-600" : "bg-white ring-slate-300 hover:ring-brand-600"}`}>
            {label}
          </button>
        ))}
      </div>
      <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search number, name, company, phone, product…" className={`${adminField} mt-0 max-w-md`} aria-label="Search quote requests" />
      {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
      {rows === null && <div className="h-40 animate-pulse rounded-md bg-slate-100" />}
      {rows?.length === 0 && <p className="text-sm text-slate-500">No quote requests.</p>}
      <div className="space-y-3">
        {rows?.map((r) => {
          const st = STATUSES.find(([v]) => v === r.status);
          const wa = encodeURIComponent(`Hello ${r.name}, this is PCBDukaan about your quote request ${r.quote_number} for ${r.quantity} × ${r.product_name ?? "items"}.`);
          return (
            <div key={r.id} className="rounded-md bg-white p-4 ring-1 ring-slate-200">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-mono font-bold">{r.quote_number} <span className={`ms-1 rounded-full px-2 py-0.5 font-sans text-xs font-semibold ${st?.[2]}`}>{st?.[1]}</span></p>
                  <p className="text-xs text-slate-500">{formatDate(r.created_at)}</p>
                </div>
                <p className="text-right text-lg font-bold">{r.quantity} × <span className="font-semibold">{r.product_id ? <Link href={`/admin/products/${r.product_id}`} className="text-brand-700 hover:underline">{r.product_name}</Link> : r.product_name ?? "—"}</span></p>
              </div>
              <div className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
                <p><b>{r.name}</b>{r.company ? ` · ${r.company}` : ""}{r.city ? ` · ${r.city}` : ""}</p>
                <p>{r.gstin ? <>GSTIN <span className="font-mono">{r.gstin}</span></> : null}</p>
                {r.message && <p className="whitespace-pre-line text-slate-700 sm:col-span-2">“{r.message}”</p>}
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-sm">
                <a href={`tel:+91${r.phone}`} className="rounded bg-slate-800 px-3 py-1 font-semibold text-white">📞 {r.phone}</a>
                <a href={`https://wa.me/91${r.phone}?text=${wa}`} target="_blank" rel="noopener noreferrer" className="rounded bg-emerald-600 px-3 py-1 font-semibold text-white">WhatsApp</a>
                {r.email && <a href={`mailto:${r.email}?subject=${encodeURIComponent(`Quote ${r.quote_number} – PCBDukaan`)}`} className="rounded px-3 py-1 font-semibold ring-1 ring-slate-300">✉️ {r.email}</a>}
              </div>
              <form onSubmit={(e) => { e.preventDefault(); save(r, e.currentTarget); }} className="mt-3 grid gap-2 border-t border-slate-100 pt-3 sm:grid-cols-[160px_160px_1fr_auto] sm:items-end">
                <label className="text-xs font-medium">Status
                  <select name="status" defaultValue={r.status} className={adminField}>{STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                </label>
                <label className="text-xs font-medium">Quoted total (₹)<input name="quoted_amount" type="number" min={0} step="0.01" defaultValue={r.quoted_amount ?? ""} className={adminField} /></label>
                <label className="text-xs font-medium">Notes<input name="admin_notes" defaultValue={r.admin_notes ?? ""} maxLength={1000} className={adminField} /></label>
                <button className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">Save</button>
              </form>
              {r.quoted_amount != null && <p className="mt-1 text-xs text-slate-500">Quoted: {formatINR(r.quoted_amount)}</p>}
            </div>
          );
        })}
      </div>
      <Pager page={page} pageSize={PAGE} total={total} onPage={setPage} />
    </div>
  );
}
