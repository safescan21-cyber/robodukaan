"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Suspense } from "react";
import { useParams } from "next/navigation";
import { getSupabase } from "@/lib/supabase-browser";
import { adminButton, adminField, revalidateCatalog } from "@/lib/admin";
import { ORDER_STATUSES, STATUS_LABEL } from "@/lib/constants";
import { OrderDetail } from "@/components/OrderDetail";
import type { Order } from "@/lib/types";

function AdminOrderPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null | undefined>(undefined);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data } = await getSupabase().from("orders").select("*, order_items(*)").eq("id", id).maybeSingle();
    setOrder((data as Order) ?? null);
  }, [id]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount
    load();
  }, [load]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!order) return;
    const f = new FormData(e.currentTarget);
    const status = String(f.get("status"));
    if (status === "cancelled" && order.status !== "cancelled" && !confirm("Cancel this order? Its items go back into stock.")) return;
    setSaving(true);
    const { error } = await getSupabase().from("orders").update({
      status,
      payment_status: String(f.get("payment_status")),
      tracking_url: String(f.get("tracking_url")).trim() || null,
    }).eq("id", order.id);
    setSaving(false);
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: "Order updated." });
    if (!error) {
      if (status === "cancelled") revalidateCatalog();
      load();
    }
  }

  if (order === undefined) return <div className="h-96 animate-pulse rounded-md bg-slate-100" />;
  if (order === null) return <p>Order not found. <Link href="/admin/orders" className="text-brand-700 underline">Back</Link></p>;

  const waText = encodeURIComponent(`Hello ${order.customer_name}, your PCBDukaan order ${order.order_number} is now: ${STATUS_LABEL[order.status]}.${order.tracking_url ? ` Track it here: ${order.tracking_url}` : ""}`);

  return (
    <div className="space-y-5">
      <Link href="/admin/orders" className="text-sm font-semibold text-brand-700 hover:underline">← Orders</Link>
      <form key={`${order.status}-${order.payment_status}-${order.tracking_url}`} onSubmit={onSubmit} className="grid gap-4 rounded-md bg-white p-5 ring-1 ring-slate-200 md:grid-cols-[180px_160px_1fr_auto] md:items-end">
        <label className="text-sm font-medium">Order status
          <select name="status" defaultValue={order.status} className={adminField}>
            {ORDER_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium">Payment
          <select name="payment_status" defaultValue={order.payment_status} className={adminField}>
            <option value="pending">Pending</option><option value="paid">Paid</option><option value="refunded">Refunded</option>
          </select>
        </label>
        <label className="text-sm font-medium">Courier tracking link
          <input name="tracking_url" type="url" defaultValue={order.tracking_url ?? ""} placeholder="https://…" className={adminField} />
        </label>
        <button disabled={saving} className={`${adminButton} py-2.5`}>{saving ? "Saving…" : "Update order"}</button>
        {msg && <p className={`text-sm md:col-span-4 ${msg.ok ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</p>}
      </form>
      <div className="flex flex-wrap gap-3 text-sm">
        <a href={`https://wa.me/91${order.phone}?text=${waText}`} target="_blank" rel="noopener noreferrer" className="rounded-md bg-emerald-600 px-3 py-1.5 font-semibold text-white hover:bg-emerald-700">Message customer on WhatsApp</a>
        <a href={`tel:+91${order.phone}`} className="rounded-md bg-slate-800 px-3 py-1.5 font-semibold text-white hover:bg-slate-700">Call customer</a>
        <Link href={`/admin/orders/${order.id}/invoice`} className="rounded-md bg-brand-600 px-3 py-1.5 font-semibold text-white hover:bg-brand-700">🧾 Print invoice</Link>
      </div>
      <OrderDetail order={order} />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-md bg-slate-100" />}>
      <AdminOrderPage />
    </Suspense>
  );
}
