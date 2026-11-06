"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-browser";
import { adminField } from "@/lib/admin";
import { ORDER_STATUSES, STATUS_LABEL } from "@/lib/constants";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, formatINR } from "@/lib/format";
import type { Order } from "@/lib/types";

const PAGE = 50;

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [status, setStatus] = useState(() => (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("status") ?? "" : ""));
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    let req = getSupabase().from("orders").select("*", { count: "exact" }).order("created_at", { ascending: false }).range(page * PAGE, page * PAGE + PAGE - 1);
    if (status === "open") req = req.in("status", ["pending", "confirmed", "packed"]);
    else if (status) req = req.eq("status", status);
    const term = q.trim().replace(/[%,()*\\]/g, " ");
    if (term) req = req.or(`order_number.ilike.%${term}%,customer_name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%`);
    const { data, count } = await req;
    setOrders((data as Order[]) ?? []);
    setTotal(count ?? 0);
  }, [status, q, page]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Orders <span className="text-base font-normal text-slate-500">({total})</span></h1>
      <div className="flex flex-wrap gap-2">
        {[["", "All"], ["open", "To process"], ...ORDER_STATUSES.map((s) => [s, STATUS_LABEL[s]])].map(([value, label]) => (
          <button key={value} onClick={() => { setStatus(value); setPage(0); }}
            className={`rounded-full px-3 py-1 text-sm ring-1 ${status === value ? "bg-brand-600 text-white ring-brand-600" : "bg-white ring-slate-300 hover:ring-brand-600"}`}>
            {label}
          </button>
        ))}
      </div>
      <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search order number, name, phone, email…" className={`${adminField} mt-0 max-w-md`} aria-label="Search orders" />
      <div className="overflow-x-auto rounded-md bg-white ring-1 ring-slate-200">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600">
            <tr><th className="px-4 py-3">Order</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">City</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Total</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders === null && <tr><td colSpan={6} className="p-4 text-slate-500">Loading…</td></tr>}
            {orders?.length === 0 && <tr><td colSpan={6} className="p-4 text-slate-500">No orders found.</td></tr>}
            {orders?.map((o) => (
              <tr key={o.id} className="hover:bg-slate-50">
                <td className="px-4 py-3"><Link href={`/admin/orders/${o.id}`} className="font-mono font-semibold text-brand-700 hover:underline">{o.order_number}</Link></td>
                <td className="px-4 py-3 text-slate-600">{formatDate(o.created_at)}</td>
                <td className="px-4 py-3">{o.customer_name}<span className="block text-xs text-slate-500">{o.phone}</span></td>
                <td className="px-4 py-3 text-slate-600">{o.city}, {o.state}</td>
                <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                <td className="px-4 py-3 text-right font-semibold">{formatINR(o.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {total > PAGE && (
        <div className="flex justify-center gap-2">
          <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm disabled:opacity-40">← Prev</button>
          <span className="px-2 py-1.5 text-sm">Page {page + 1} of {Math.ceil(total / PAGE)}</span>
          <button disabled={(page + 1) * PAGE >= total} onClick={() => setPage((p) => p + 1)} className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm disabled:opacity-40">Next →</button>
        </div>
      )}
    </div>
  );
}
