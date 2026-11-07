"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-browser";
import { adminField } from "@/lib/admin";
import { formatDate } from "@/lib/format";
import { Pager } from "@/components/Pager";
import type { PartnerApplication, PartnerStatus } from "@/lib/types";

const STATUSES: [PartnerStatus, string, string][] = [
  ["new", "New", "bg-amber-100 text-amber-800"],
  ["contacted", "Contacted", "bg-sky-100 text-sky-800"],
  ["active", "Active partner", "bg-emerald-100 text-emerald-800"],
  ["rejected", "Not a fit", "bg-slate-200 text-slate-700"],
];

export default function AdminPartnersPage() {
  const [rows, setRows] = useState<PartnerApplication[] | null>(null);
  const [status, setStatus] = useState<string>("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const PAGE = 25;

  const load = useCallback(async () => {
    let req = getSupabase().from("partner_applications").select("*", { count: "exact" }).order("created_at", { ascending: false }).range(page * PAGE, page * PAGE + PAGE - 1);
    if (status) req = req.eq("status", status);
    const term = q.trim().replace(/[%,()*\\]/g, " ");
    if (term) req = req.or(`name.ilike.%${term}%,business_name.ilike.%${term}%,phone.ilike.%${term}%,city.ilike.%${term}%,state.ilike.%${term}%`);
    const { data, count, error } = await req;
    setError(error ? (error.message.includes("partner_applications") ? "Run supabase/migrations/RUN-IN-SUPABASE.sql (update 016) in Supabase first." : error.message) : null);
    setRows((data as PartnerApplication[]) ?? []);
    setTotal(count ?? 0);
  }, [status, q, page]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function save(row: PartnerApplication, form: HTMLFormElement) {
    const f = new FormData(form);
    const { error } = await getSupabase().from("partner_applications").update({
      status: String(f.get("status")),
      admin_notes: String(f.get("admin_notes")).trim() || null,
    }).eq("id", row.id);
    if (error) setError(error.message);
    else load();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Technician partners</h1>
      <p className="text-sm text-slate-600">Applications from <a href="/repair-partners" target="_blank" className="text-brand-700 hover:underline">/repair-partners</a>. Call them, agree the referral fee, then mark them “Active partner”.</p>
      <div className="flex flex-wrap gap-2">
        {[["", "All"], ...STATUSES.map(([v, l]) => [v, l])].map(([value, label]) => (
          <button key={value} onClick={() => { setStatus(value); setPage(0); }}
            className={`rounded-full px-3 py-1 text-sm ring-1 ${status === value ? "bg-brand-600 text-white ring-brand-600" : "bg-white ring-slate-300 hover:ring-brand-600"}`}>
            {label}
          </button>
        ))}
      </div>
      <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search name, shop, phone, city…" className={`${adminField} mt-0 max-w-md`} aria-label="Search partner applications" />
      {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
      {rows === null && <div className="h-40 animate-pulse rounded-md bg-slate-100" />}
      {rows?.length === 0 && <p className="text-sm text-slate-500">No applications yet.</p>}
      <div className="space-y-3">
        {rows?.map((r) => {
          const st = STATUSES.find(([v]) => v === r.status);
          const wa = encodeURIComponent(`Hello ${r.name}, this is PCBDukaan about your repair partner application.`);
          return (
            <div key={r.id} className="rounded-md bg-white p-4 ring-1 ring-slate-200">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-bold">{r.name}{r.business_name ? <span className="font-normal"> · {r.business_name}</span> : null} <span className={`ms-1 rounded-full px-2 py-0.5 text-xs font-semibold ${st?.[2]}`}>{st?.[1]}</span></p>
                  <p className="text-xs text-slate-500">{formatDate(r.created_at)} · {[r.city, r.state].filter(Boolean).join(", ")}</p>
                </div>
              </div>
              {r.experience && <p className="mt-2 text-sm"><b>Experience:</b> {r.experience}</p>}
              {r.message && <p className="mt-1 whitespace-pre-line text-sm text-slate-700">“{r.message}”</p>}
              <div className="mt-2 flex flex-wrap gap-2 text-sm">
                <a href={`tel:+91${r.phone}`} className="rounded bg-slate-800 px-3 py-1 font-semibold text-white">📞 {r.phone}</a>
                <a href={`https://wa.me/91${r.phone}?text=${wa}`} target="_blank" rel="noopener noreferrer" className="rounded bg-emerald-600 px-3 py-1 font-semibold text-white">WhatsApp</a>
                {r.email && <a href={`mailto:${r.email}?subject=${encodeURIComponent("PCBDukaan repair partner")}`} className="rounded px-3 py-1 font-semibold ring-1 ring-slate-300">✉️ {r.email}</a>}
              </div>
              <form onSubmit={(e) => { e.preventDefault(); save(r, e.currentTarget); }} className="mt-3 grid gap-2 border-t border-slate-100 pt-3 sm:grid-cols-[180px_1fr_auto] sm:items-end">
                <label className="text-xs font-medium">Status
                  <select name="status" defaultValue={r.status} className={adminField}>{STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                </label>
                <label className="text-xs font-medium">Notes (fee agreed, areas…)<input name="admin_notes" defaultValue={r.admin_notes ?? ""} maxLength={1000} className={adminField} /></label>
                <button className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">Save</button>
              </form>
            </div>
          );
        })}
      </div>
      <Pager page={page} pageSize={PAGE} total={total} onPage={setPage} />
    </div>
  );
}
