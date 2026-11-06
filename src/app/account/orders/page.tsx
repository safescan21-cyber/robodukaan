"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-browser";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, formatINR } from "@/lib/format";
import type { Order } from "@/lib/types";

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    getSupabase()
      .from("orders")
      .select("*, order_items(id, quantity)")
      .order("created_at", { ascending: false })
      .then(({ data }) => setOrders((data as Order[]) ?? []));
  }, []);

  return (
    <div className="rounded-md bg-white ring-1 ring-slate-200">
      <h1 className="border-b border-slate-200 px-4 py-3 text-lg font-bold">My orders</h1>
      {orders === null ? (
        <p className="p-4 text-sm text-slate-500">Loading…</p>
      ) : orders.length === 0 ? (
        <p className="p-6 text-sm text-slate-600">You haven’t placed any orders yet. <Link href="/products" className="font-semibold text-brand-700 hover:underline">Browse products</Link></p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600">
              <tr><th className="px-4 py-3">Order</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Total</th><th className="px-4 py-3" /></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((o) => {
                const qty = o.order_items?.reduce((s, i) => s + i.quantity, 0) ?? 0;
                return (
                  <tr key={o.id}>
                    <td className="px-4 py-3 font-mono font-semibold">{o.order_number}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(o.created_at)}</td>
                    <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                    <td className="px-4 py-3">{formatINR(o.total)} <span className="text-slate-500">for {qty} item{qty === 1 ? "" : "s"}</span></td>
                    <td className="px-4 py-3 text-right"><Link href={`/account/orders/${o.id}`} className="rounded bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700">View</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
