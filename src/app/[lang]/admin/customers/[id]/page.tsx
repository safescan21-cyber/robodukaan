"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getSupabase } from "@/lib/supabase-browser";
import { useAuth } from "@/components/AuthProvider";
import { StatusBadge } from "@/components/StatusBadge";
import { RepairStatusBadge } from "@/components/RepairStatusBadge";
import { formatDate, formatINR } from "@/lib/format";
import type { AdminCustomer } from "@/lib/admin-types";
import type { Address, Order, RepairRequest } from "@/lib/types";

function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [c, setC] = useState<AdminCustomer | null | undefined>(undefined);
  const [orders, setOrders] = useState<Order[]>([]);
  const [repairs, setRepairs] = useState<RepairRequest[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = getSupabase();
    const [cust, ord, rep, addr] = await Promise.all([
      supabase.rpc("admin_customers", { p_search: null, p_user: id }),
      supabase.from("orders").select("*").eq("user_id", id).order("created_at", { ascending: false }),
      supabase.from("repair_requests").select("*").eq("user_id", id).order("created_at", { ascending: false }),
      supabase.from("addresses").select("*").eq("user_id", id).order("is_default", { ascending: false }),
    ]);
    setC(((cust.data as AdminCustomer[]) ?? [])[0] ?? null);
    setOrders((ord.data as Order[]) ?? []);
    setRepairs((rep.data as RepairRequest[]) ?? []);
    setAddresses((addr.data as Address[]) ?? []);
  }, [id]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount
    load();
  }, [load]);

  async function setBlocked(blocked: boolean) {
    if (!c) return;
    if (!confirm(blocked ? `Block ${c.email}? They will be logged out and can't order, request repairs, review or apply for jobs.` : `Unblock ${c.email}?`)) return;
    const { error } = await getSupabase().from("profiles").update({ is_blocked: blocked }).eq("id", c.id);
    setMsg(error ? error.message : blocked ? "Blocked. They'll be logged out on their next page load." : "Unblocked.");
    load();
  }

  async function setRole(role: "user" | "admin") {
    if (!c) return;
    if (!confirm(role === "admin" ? `Give ${c.email} full admin access? They will be able to see all orders and customers and change products.` : `Remove admin access from ${c.email}?`)) return;
    const { error } = await getSupabase().from("profiles").update({ role }).eq("id", c.id);
    setMsg(error ? error.message : role === "admin" ? "Now an admin. They need to log out and in again." : "Admin access removed.");
    load();
  }

  if (c === undefined) return <div className="h-96 animate-pulse rounded-md bg-slate-100" />;
  if (c === null) return <p>Customer not found. <Link href="/admin/customers" className="text-brand-700 underline">Back</Link></p>;
  const phone = (c.phone ?? "").replace(/\D/g, "").slice(-10);

  return (
    <div className="space-y-5">
      <Link href="/admin/customers" className="text-sm font-semibold text-brand-700 hover:underline">← Customers</Link>
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <section className="rounded-md bg-white p-5 ring-1 ring-slate-200">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">{c.full_name || "Unnamed customer"}</h1>
              <p className="text-slate-600">{c.email} {c.email_confirmed ? <span className="ml-1 rounded bg-emerald-100 px-1.5 text-xs font-semibold text-emerald-800">Email confirmed</span> : <span className="ml-1 rounded bg-amber-100 px-1.5 text-xs font-semibold text-amber-800">Not confirmed</span>}</p>
              {c.phone && <p className="text-slate-600">📞 {c.phone}</p>}
            </div>
            <span className="flex gap-2">
              {c.is_blocked && <span className="rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white">Blocked</span>}
              {c.role === "admin" ? <span className="rounded bg-slate-900 px-2 py-1 text-xs font-semibold text-white">Admin</span> : <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold">Customer</span>}
            </span>
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-5">
            {[["Joined", formatDate(c.created_at)], ["Last login", c.last_sign_in_at ? formatDate(c.last_sign_in_at) : "Never"], ["Orders", String(c.orders)], ["Total spent", formatINR(c.spent)], ["PCB repairs", String(c.repairs)]].map(([k, v]) => (
              <div key={k} className="rounded bg-slate-50 p-3"><dt className="text-xs uppercase text-slate-500">{k}</dt><dd className="mt-0.5 font-semibold">{v}</dd></div>
            ))}
          </dl>
          {phone && (
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              <a href={`https://wa.me/91${phone}`} target="_blank" rel="noopener noreferrer" className="rounded-md bg-emerald-600 px-3 py-1.5 font-semibold text-white hover:bg-emerald-700">WhatsApp</a>
              <a href={`tel:+91${phone}`} className="rounded-md bg-slate-800 px-3 py-1.5 font-semibold text-white hover:bg-slate-700">Call</a>
              {c.email && <a href={`mailto:${c.email}`} className="rounded-md px-3 py-1.5 font-semibold ring-1 ring-slate-300 hover:bg-slate-50">Email</a>}
            </div>
          )}
        </section>
        <aside className="space-y-3 rounded-md bg-white p-5 text-sm ring-1 ring-slate-200">
          <h2 className="text-sm font-bold uppercase tracking-wide">Access</h2>
          {c.role === "admin" ? (
            c.id === user?.id ? <p className="text-slate-600">This is you. Another admin can remove your access.</p>
              : <button onClick={() => setRole("user")} className="w-full rounded-md px-3 py-2 font-semibold text-red-600 ring-1 ring-red-300 hover:bg-red-50">Remove admin access</button>
          ) : (
            <button onClick={() => setRole("admin")} className="w-full rounded-md bg-slate-900 px-3 py-2 font-semibold text-white hover:bg-slate-700">Make admin</button>
          )}
          {c.id !== user?.id && (
            c.is_blocked ? (
              <button onClick={() => setBlocked(false)} className="w-full rounded-md bg-emerald-600 px-3 py-2 font-semibold text-white hover:bg-emerald-700">Unblock user</button>
            ) : (
              <button onClick={() => setBlocked(true)} className="w-full rounded-md px-3 py-2 font-semibold text-red-600 ring-1 ring-red-300 hover:bg-red-50">🚫 Block user</button>
            )
          )}
          {msg && <p className="text-slate-700">{msg}</p>}
          <p className="text-xs text-slate-500">Admins can manage products, orders, repairs, banners, coupons and customers. Blocked users are logged out and can only browse.</p>
        </aside>
      </div>

      <section className="rounded-md bg-white ring-1 ring-slate-200">
        <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-bold uppercase tracking-wide">Orders ({orders.length})</h2>
        {orders.length === 0 ? <p className="p-4 text-sm text-slate-500">No orders yet.</p> : (
          <ul className="divide-y divide-slate-100">
            {orders.map((o) => (
              <li key={o.id}>
                <Link href={`/admin/orders/${o.id}`} className="grid grid-cols-2 gap-2 px-4 py-3 text-sm hover:bg-slate-50 sm:grid-cols-4 sm:items-center">
                  <span className="font-mono font-semibold text-brand-700">{o.order_number}</span>
                  <span className="text-slate-500">{formatDate(o.created_at)}</span>
                  <StatusBadge status={o.status} />
                  <span className="font-semibold sm:text-right">{formatINR(o.total)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-md bg-white ring-1 ring-slate-200">
        <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-bold uppercase tracking-wide">PCB repairs ({repairs.length})</h2>
        {repairs.length === 0 ? <p className="p-4 text-sm text-slate-500">No repair requests.</p> : (
          <ul className="divide-y divide-slate-100">
            {repairs.map((r) => (
              <li key={r.id}>
                <Link href={`/admin/repairs/${r.id}`} className="grid grid-cols-2 gap-2 px-4 py-3 text-sm hover:bg-slate-50 sm:grid-cols-4 sm:items-center">
                  <span className="font-mono font-semibold text-brand-700">{r.request_number}</span>
                  <span className="truncate">{r.board_type}</span>
                  <RepairStatusBadge status={r.status} />
                  <span className="text-slate-500 sm:text-right">{formatDate(r.created_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-md bg-white ring-1 ring-slate-200">
        <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-bold uppercase tracking-wide">Saved addresses ({addresses.length})</h2>
        {addresses.length === 0 ? <p className="p-4 text-sm text-slate-500">No saved addresses.</p> : (
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            {addresses.map((a) => (
              <div key={a.id} className="rounded border border-slate-200 p-3 text-sm">
                <p className="text-xs font-bold uppercase text-brand-700">{a.label}{a.is_default ? " · default" : ""}</p>
                <p className="font-semibold">{a.full_name} · {a.phone}</p>
                <p className="text-slate-600">{a.address_line}, {a.city}, {a.state} – {a.pincode}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-md bg-slate-100" />}>
      <CustomerDetail />
    </Suspense>
  );
}
