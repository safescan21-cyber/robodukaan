"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Suspense } from "react";
import { useParams } from "next/navigation";
import { getSupabase } from "@/lib/supabase-browser";
import { adminButton, adminField, revalidateCatalog } from "@/lib/admin";
import { formatINR } from "@/lib/format";
import { ORDER_STATUSES, STATUS_LABEL } from "@/lib/constants";
import { OrderDetail } from "@/components/OrderDetail";
import { VendorAssign } from "@/components/admin/VendorAssign";
import type { Order } from "@/lib/types";

function AdminOrderPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null | undefined>(undefined);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [newStatus, setNewStatus] = useState<string | null>(null);

  // Issue the invoice number (if needed) and email + WhatsApp the invoice to the customer.
  const sendInvoice = useCallback(async (orderId: string) => {
    setSending(true);
    const { data } = await getSupabase().auth.getSession();
    const res = await fetch("/api/admin/order-invoice", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
      body: JSON.stringify({ orderId }),
    });
    const r = await res.json().catch(() => ({}));
    setSending(false);
    return res.ok
      ? { ok: true, text: `Invoice ${r.invoiceNumber} – email: ${r.email} · WhatsApp: ${r.whatsapp}.` }
      : { ok: false, text: r.error || `Error ${res.status}` };
  }, []);

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
    if (!error && status === "confirmed" && order.status !== "confirmed" && f.get("send_invoice") === "on") {
      const r = await sendInvoice(order.id);
      setMsg({ ok: r.ok, text: `Order confirmed. ${r.text}` });
    }
    setNewStatus(null);
    if (!error) {
      if (status === "cancelled") revalidateCatalog();
      load();
    }
  }

  if (order === undefined) return <div className="h-96 animate-pulse rounded-md bg-slate-100" />;
  if (order === null) return <p>Order not found. <Link href="/admin/orders" className="text-brand-700 underline">Back</Link></p>;

  const waText = encodeURIComponent(
    order.status === "pending" || order.status === "confirmed"
      ? `Hello ${order.customer_name}, thank you for your order ${order.order_number} at PCBDukaan.\n\n${(order.order_items ?? []).map((i) => `• ${i.name} × ${i.quantity}`).join("\n")}\nTotal: ${formatINR(order.total)} (${order.payment_method === "cod" ? "cash on delivery" : order.payment_method})\n\nYour order is ${order.status === "confirmed" ? "confirmed" : "received"} and will be dispatched soon. View it here: ${location.origin}/account/orders/${order.id}`
      : `Hello ${order.customer_name}, your PCBDukaan order ${order.order_number} is now: ${STATUS_LABEL[order.status]}.${order.tracking_url ? ` Track it here: ${order.tracking_url}` : ""}`,
  );
  const digits = order.phone.replace(/\D/g, "").replace(/^0(?=\d{10}$)/, "");
  const waPhone = digits.length === 10 ? `91${digits}` : digits;

  return (
    <div className="space-y-5">
      <Link href="/admin/orders" className="text-sm font-semibold text-brand-700 hover:underline">← Orders</Link>
      <form key={`${order.status}-${order.payment_status}-${order.tracking_url}`} onSubmit={onSubmit} className="grid gap-4 rounded-md bg-white p-5 ring-1 ring-slate-200 md:grid-cols-[180px_160px_1fr_auto] md:items-end">
        <label className="text-sm font-medium">Order status
          <select name="status" defaultValue={order.status} onChange={(e) => setNewStatus(e.target.value)} className={adminField}>
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
        <button disabled={saving || sending} className={`${adminButton} py-2.5`}>{saving ? "Saving…" : sending ? "Sending invoice…" : "Update order"}</button>
        {newStatus === "confirmed" && order.status !== "confirmed" && (
          <label className="flex items-center gap-2 text-sm md:col-span-4"><input type="checkbox" name="send_invoice" defaultChecked className="h-4 w-4 accent-brand-600" />Issue invoice and send it to the customer by email{order.email ? "" : " (no email given)"} + WhatsApp, with all product details</label>
        )}
        {msg && <p className={`text-sm md:col-span-4 ${msg.ok ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</p>}
      </form>
      <div className="flex flex-wrap gap-3 text-sm">
        <a href={`https://wa.me/${waPhone}?text=${waText}`} target="_blank" rel="noopener noreferrer" className="rounded-md bg-emerald-600 px-3 py-1.5 font-semibold text-white hover:bg-emerald-700">Message customer on WhatsApp</a>
        <a href={`tel:+${waPhone}`} className="rounded-md bg-slate-800 px-3 py-1.5 font-semibold text-white hover:bg-slate-700">Call customer</a>
        {order.status !== "cancelled" && (
          <button type="button" disabled={sending} onClick={async () => {
            if (!order.invoice_number && !confirm("This issues the next invoice number for this order and sends the invoice to the customer. Continue?")) return;
            const r = await sendInvoice(order.id); setMsg(r); load();
          }} className="rounded-md bg-sky-700 px-3 py-1.5 font-semibold text-white hover:bg-sky-800 disabled:opacity-60">{sending ? "Sending…" : order.invoice_number ? "📨 Send invoice again" : "📨 Send invoice to customer"}</button>
        )}
        <Link href={`/admin/orders/${order.id}/invoice`} className="rounded-md bg-brand-600 px-3 py-1.5 font-semibold text-white hover:bg-brand-700">🧾 Print invoice</Link>
      </div>
      <VendorAssign order={order} onChange={load} />
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
