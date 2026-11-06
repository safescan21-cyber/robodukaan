"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-browser";
import { useAuth } from "@/components/AuthProvider";
import { useWishlist } from "@/components/WishlistProvider";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, formatINR } from "@/lib/format";
import type { Order } from "@/lib/types";

export default function AccountDashboard() {
  const { user, profile } = useAuth();
  const { count: wishCount } = useWishlist();
  const [orders, setOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    getSupabase()
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setOrders((data as Order[]) ?? []));
  }, []);

  const active = orders?.filter((o) => !["delivered", "cancelled"].includes(o.status)).length ?? 0;
  const spent = orders?.filter((o) => o.status !== "cancelled").reduce((s, o) => s + Number(o.total), 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="rounded-md bg-gradient-to-r from-brand-700 to-brand-600 p-6 text-white">
        <p className="text-sm text-brand-100">Hello,</p>
        <h1 className="text-2xl font-bold">{profile?.full_name || user?.email}</h1>
        <p className="mt-1 text-sm text-brand-100">From here you can view your orders, manage addresses and edit your account details.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          ["Total orders", orders?.length ?? "–", "/account/orders"],
          ["In progress", orders ? active : "–", "/account/orders"],
          ["Total spent", orders ? formatINR(spent) : "–", "/account/orders"],
          ["Wishlist", wishCount, "/wishlist"],
        ].map(([label, value, href]) => (
          <Link key={String(label)} href={String(href)} className="rounded-md bg-white p-4 ring-1 ring-slate-200 hover:ring-brand-600">
            <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
          </Link>
        ))}
      </div>
      <section className="rounded-md bg-white ring-1 ring-slate-200">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-bold uppercase tracking-wide">Recent orders</h2>
          <Link href="/account/orders" className="text-sm font-semibold text-brand-700 hover:underline">View all</Link>
        </div>
        {orders === null ? (
          <p className="p-4 text-sm text-slate-500">Loading…</p>
        ) : orders.length === 0 ? (
          <p className="p-4 text-sm text-slate-600">No orders yet. <Link href="/products" className="font-semibold text-brand-700 hover:underline">Start shopping</Link></p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {orders.slice(0, 5).map((o) => (
              <li key={o.id}>
                <Link href={`/account/orders/${o.id}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm hover:bg-slate-50">
                  <span className="font-mono font-semibold">{o.order_number}</span>
                  <span className="text-slate-500">{formatDate(o.created_at)}</span>
                  <StatusBadge status={o.status} />
                  <span className="font-semibold">{formatINR(o.total)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
