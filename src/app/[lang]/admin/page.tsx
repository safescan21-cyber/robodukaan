"use client";

import { SubmitToSearchEngines } from "@/components/admin/SubmitToSearchEngines";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-browser";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, formatINR } from "@/lib/format";
import type { Order } from "@/lib/types";

type Stats = {
  revenue: number; orders: number; pending_orders: number; products: number; low_stock: number; customers: number; reviews: number;
  sales_by_day: { day: string; total: number; orders: number }[];
  top_products: { name: string; slug: string; sold_count: number; stock: number }[];
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<Order[]>([]);
  const [lowStock, setLowStock] = useState<{ id: string; name: string; stock: number }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [openRepairs, setOpenRepairs] = useState<number | null>(null);
  const [users, setUsers] = useState<{ total: number; this_week: number; today: number; admins: number; blocked: number } | null>(null);

  useEffect(() => {
    const supabase = getSupabase();
    supabase.rpc("admin_stats").then(({ data, error }) => (error ? setError(error.message) : setStats(data as Stats)));
    supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(8).then(({ data }) => setRecent((data as Order[]) ?? []));
    supabase.rpc("admin_user_counts").then(({ data }) => setUsers(data));
    supabase.from("repair_requests").select("id", { count: "exact", head: true }).in("status", ["new", "reviewing", "approved", "in_repair"])
      .then(({ count }) => setOpenRepairs(count ?? 0));
    supabase.from("products").select("id, name, stock").eq("is_active", true).lte("stock", 5).order("stock").limit(8)
      .then(({ data }) => setLowStock(data ?? []));
  }, []);

  const max = Math.max(1, ...(stats?.sales_by_day.map((d) => Number(d.total)) ?? [1]));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <SubmitToSearchEngines />
      <Link href="/admin/customers" className="grid gap-4 rounded-md bg-gradient-to-r from-brand-800 to-brand-600 p-5 text-white sm:grid-cols-5">
        <div className="sm:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-100">Registered users</p>
          <p className="text-4xl font-extrabold">{users?.total ?? "–"}</p>
        </div>
        {[["Today", users?.today], ["This week", users?.this_week], ["Admins", users?.admins]].map(([k, v]) => (
          <div key={String(k)}><p className="text-xs uppercase text-brand-100">{k}</p><p className="text-2xl font-bold">{v ?? "–"}</p></div>
        ))}
      </Link>
      {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Revenue", stats ? formatINR(stats.revenue) : "–", "bg-emerald-600", "/admin/orders"],
          ["Orders", stats?.orders ?? "–", "bg-brand-600", "/admin/orders"],
          ["To process", stats?.pending_orders ?? "–", "bg-accent-500", "/admin/orders?status=open"],
          ["Customers", stats?.customers ?? "–", "bg-violet-600", "/admin/customers"],
          ["Products", stats?.products ?? "–", "bg-slate-700", "/admin/products"],
          ["Low stock (≤5)", stats?.low_stock ?? "–", "bg-red-600", "/admin/products?stock=low"],
          ["Reviews", stats?.reviews ?? "–", "bg-amber-500", "/admin/reviews"],
          ["Open PCB repairs", openRepairs ?? "–", "bg-teal-600", "/admin/repairs"],
        ].map(([label, value, color, href]) => (
          <Link key={String(label)} href={String(href)} className="flex items-center gap-4 rounded-md bg-white p-4 ring-1 ring-slate-200 hover:ring-brand-600">
            <span className={`h-10 w-1.5 rounded-full ${color}`} />
            <span>
              <span className="block text-xs font-semibold uppercase text-slate-500">{label}</span>
              <span className="block text-2xl font-bold">{value}</span>
            </span>
          </Link>
        ))}
      </div>

      <section className="rounded-md bg-white p-5 ring-1 ring-slate-200">
        <h2 className="text-sm font-bold uppercase tracking-wide">Sales — last 14 days</h2>
        <div className="mt-4 flex h-48 items-end gap-1.5">
          {stats?.sales_by_day.map((d) => (
            <div key={d.day} className="group flex flex-1 flex-col items-center justify-end gap-1">
              <span className="hidden text-[10px] text-slate-600 group-hover:block">{formatINR(d.total)}</span>
              <div className="w-full rounded-t bg-brand-600 transition group-hover:bg-accent-500" style={{ height: `${Math.max(2, (Number(d.total) / max) * 160)}px` }} title={`${d.day}: ${formatINR(d.total)} (${d.orders} orders)`} />
              <span className="text-[10px] text-slate-500">{d.day.slice(8)}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <section className="rounded-md bg-white ring-1 ring-slate-200">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-bold uppercase tracking-wide">Recent orders</h2>
            <Link href="/admin/orders" className="text-sm font-semibold text-brand-700 hover:underline">All orders</Link>
          </div>
          <ul className="divide-y divide-slate-100">
            {recent.length === 0 && <li className="p-4 text-sm text-slate-500">No orders yet.</li>}
            {recent.map((o) => (
              <li key={o.id}>
                <Link href={`/admin/orders/${o.id}`} className="grid grid-cols-2 gap-2 px-4 py-3 text-sm hover:bg-slate-50 sm:grid-cols-5 sm:items-center">
                  <span className="font-mono font-semibold">{o.order_number}</span>
                  <span className="truncate">{o.customer_name}</span>
                  <span className="text-slate-500">{formatDate(o.created_at)}</span>
                  <StatusBadge status={o.status} />
                  <span className="font-semibold sm:text-right">{formatINR(o.total)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <div className="space-y-6">
          <section className="rounded-md bg-white ring-1 ring-slate-200">
            <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-bold uppercase tracking-wide">Low stock</h2>
            <ul className="divide-y divide-slate-100 text-sm">
              {lowStock.length === 0 && <li className="p-4 text-slate-500">All products are well stocked.</li>}
              {lowStock.map((p) => (
                <li key={p.id}>
                  <Link href={`/admin/products/${p.id}`} className="flex justify-between gap-2 px-4 py-2.5 hover:bg-slate-50">
                    <span className="truncate">{p.name}</span>
                    <span className={`font-semibold ${p.stock === 0 ? "text-red-600" : "text-amber-600"}`}>{p.stock}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-md bg-white ring-1 ring-slate-200">
            <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-bold uppercase tracking-wide">Top sellers</h2>
            <ul className="divide-y divide-slate-100 text-sm">
              {stats?.top_products.length === 0 && <li className="p-4 text-slate-500">No sales yet.</li>}
              {stats?.top_products.map((p) => (
                <li key={p.slug} className="flex justify-between gap-2 px-4 py-2.5">
                  <span className="truncate">{p.name}</span>
                  <span className="font-semibold">{p.sold_count} sold</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
