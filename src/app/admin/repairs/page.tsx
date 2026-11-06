"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-browser";
import { adminField } from "@/lib/admin";
import { REPAIR_STATUSES, REPAIR_STATUS_LABEL } from "@/lib/constants";
import { RepairStatusBadge } from "@/components/RepairStatusBadge";
import { formatDate, formatINR } from "@/lib/format";
import { Pager } from "@/components/Pager";
import type { RepairRequest } from "@/lib/types";

export default function AdminRepairsPage() {
  const [rows, setRows] = useState<RepairRequest[] | null>(null);
  const [status, setStatus] = useState("open");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const PAGE = 25;

  const load = useCallback(async () => {
    let req = getSupabase().from("repair_requests").select("*", { count: "exact" }).order("created_at", { ascending: false }).range(page * PAGE, page * PAGE + PAGE - 1);
    if (status === "open") req = req.in("status", ["new", "reviewing", "quoted", "approved", "in_repair"]);
    else if (status) req = req.eq("status", status);
    const term = q.trim().replace(/[%,()*\\]/g, " ");
    if (term) req = req.or(`request_number.ilike.%${term}%,name.ilike.%${term}%,phone.ilike.%${term}%,board_type.ilike.%${term}%`);
    const { data, count } = await req;
    setRows((data as RepairRequest[]) ?? []);
    setTotal(count ?? 0);
  }, [status, q, page]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">PCB repair requests</h1>
      <div className="flex flex-wrap gap-2">
        {[["open", "Open"], ["", "All"], ...REPAIR_STATUSES.map((s) => [s, REPAIR_STATUS_LABEL[s]])].map(([value, label]) => (
          <button key={value} onClick={() => { setStatus(value); setPage(0); }}
            className={`rounded-full px-3 py-1 text-sm ring-1 ${status === value ? "bg-brand-600 text-white ring-brand-600" : "bg-white ring-slate-300 hover:ring-brand-600"}`}>
            {label}
          </button>
        ))}
      </div>
      <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search number, name, phone, board…" className={`${adminField} mt-0 max-w-md`} aria-label="Search repair requests" />
      <div className="overflow-x-auto rounded-md bg-white ring-1 ring-slate-200">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600">
            <tr><th className="px-4 py-3">Request</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Board</th><th className="px-4 py-3">Photos</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Quote</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows === null && <tr><td colSpan={7} className="p-4 text-slate-500">Loading…</td></tr>}
            {rows?.length === 0 && <tr><td colSpan={7} className="p-4 text-slate-500">No repair requests.</td></tr>}
            {rows?.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-3"><Link href={`/admin/repairs/${r.id}`} className="font-mono font-semibold text-brand-700 hover:underline">{r.request_number}</Link></td>
                <td className="px-4 py-3 text-slate-600">{formatDate(r.created_at)}</td>
                <td className="px-4 py-3">{r.name}<span className="block text-xs text-slate-500">{r.phone}</span></td>
                <td className="px-4 py-3">{r.board_type}<span className="block max-w-56 truncate text-xs text-slate-500">{r.problem}</span></td>
                <td className="px-4 py-3">📷 {r.photos.length}</td>
                <td className="px-4 py-3"><RepairStatusBadge status={r.status} /></td>
                <td className="px-4 py-3 text-right">{r.quote_amount != null ? formatINR(r.quote_amount) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager page={page} pageSize={PAGE} total={total} onPage={setPage} />
    </div>
  );
}
