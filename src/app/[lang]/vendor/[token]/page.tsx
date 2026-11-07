"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getSupabase } from "@/lib/supabase-browser";
import { formatDate, formatINR2 } from "@/lib/format";
import { STORE } from "@/lib/constants";
import type { VendorOrderView } from "@/lib/types";

const field = "mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600";
const BADGE: Record<VendorOrderView["status"], [string, string]> = {
  assigned: ["New – please accept", "bg-amber-100 text-amber-800"],
  accepted: ["Accepted – to dispatch", "bg-sky-100 text-sky-800"],
  declined: ["Declined", "bg-red-100 text-red-700"],
  dispatched: ["Dispatched", "bg-emerald-100 text-emerald-800"],
};

// A vendor's private link from the assignment email/WhatsApp: see the order, accept it, mark it dispatched.
function VendorOrder() {
  const { token } = useParams<{ token: string }>();
  const [order, setOrder] = useState<VendorOrderView | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!/^[0-9a-f-]{36}$/i.test(token)) return setOrder(null);
    const { data } = await getSupabase().rpc("vendor_order", { p_token: token });
    setOrder((data as VendorOrderView) ?? null);
  }, [token]);
  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  async function act(action: "accept" | "decline" | "dispatch", extra: Record<string, string> = {}) {
    setBusy(true); setError(null); setDone(null);
    try {
      const res = await fetch(`/api/vendor/${token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...extra }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not save – please try again.");
      setOrder(json.order);
      setDone(action === "dispatch" ? "Marked as dispatched – PCBDukaan and the customer have been informed. Thank you!" : action === "accept" ? "Order accepted. Please dispatch it and mark it dispatched below." : "Order declined. PCBDukaan has been informed.");
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    setBusy(false);
  }

  if (order === undefined) return <div className="h-96 animate-pulse rounded-md bg-slate-100" />;
  if (order === null) return <p className="rounded-md bg-white p-6 text-center ring-1 ring-slate-200">This link is not valid any more. If the order was moved to another vendor, PCBDukaan will contact you.</p>;

  const [label, style] = BADGE[order.status];
  const cancelled = order.order_status === "cancelled";
  const s = order.ship_to;
  const wa = STORE.whatsapp ? `https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent(`Order ${order.order_number}: ${label}${order.tracking_number ? ` – ${order.courier} ${order.tracking_number}` : ""}`)}` : null;
  return (
    <div className="space-y-4">
      <div className="rounded-md bg-white p-5 ring-1 ring-slate-200">
        <p className="text-xs text-slate-500">{order.vendor} · assigned {formatDate(order.assigned_at)}</p>
        <h1 className="mt-1 text-xl font-bold">Order {order.order_number} <span className={`ms-1 rounded-full px-2 py-0.5 align-middle text-xs font-semibold ${style}`}>{label}</span></h1>
        {cancelled && <p className="mt-2 rounded bg-red-50 p-2 text-sm font-semibold text-red-700">This order was cancelled – please do not dispatch it.</p>}
        <table className="mt-3 w-full text-sm">
          <thead><tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500"><th className="py-1">Item</th><th className="py-1 text-end">Qty</th></tr></thead>
          <tbody>{order.items.map((i) => (
            <tr key={i.sku + i.name} className="border-b border-slate-100"><td className="py-2">{i.name}<span className="block text-xs text-slate-500">SKU {i.sku}</span></td><td className="py-2 text-end text-base font-bold">{i.quantity}</td></tr>
          ))}</tbody>
        </table>
        <div className="mt-3 rounded bg-slate-50 p-3 text-sm">
          <p className="font-semibold">Ship to</p>
          <p><b>{s.name}</b>{s.company ? ` (${s.company})` : ""}<br />{s.address}<br />{s.city}, {s.state} – {s.pincode}<br />📞 <a href={`tel:+91${s.phone}`} className="text-brand-700">{s.phone}</a>{s.gstin ? <><br />GSTIN {s.gstin}</> : null}</p>
        </div>
        {order.cod_amount ? <p className="mt-3 rounded bg-orange-50 p-3 text-sm"><b>Cash on delivery:</b> collect {formatINR2(order.cod_amount)} from the customer.</p> : null}
        {order.admin_note && <p className="mt-3 text-sm"><b>Note from PCBDukaan:</b> {order.admin_note}</p>}
        {order.notes && <p className="mt-1 text-sm"><b>Customer note:</b> {order.notes}</p>}
      </div>

      {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
      {done && <p className="rounded bg-emerald-50 p-3 text-sm text-emerald-800" role="status">{done}</p>}

      {!cancelled && (order.status === "assigned" || order.status === "declined") && (
        <div className="flex flex-wrap gap-3">
          <button disabled={busy} onClick={() => act("accept")} className="rounded-md bg-brand-600 px-5 py-2.5 font-bold text-white hover:bg-brand-700 disabled:opacity-60">✓ Accept order</button>
          {order.status === "assigned" && (
            <button disabled={busy} onClick={() => { const note = prompt("Reason (e.g. out of stock)?") ?? ""; act("decline", { note }); }} className="rounded-md px-5 py-2.5 font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-50 disabled:opacity-60">Can&apos;t supply</button>
          )}
        </div>
      )}

      {!cancelled && order.status !== "dispatched" && (
        <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); act("dispatch", Object.fromEntries(["courier", "tracking_number", "tracking_url", "note"].map((k) => [k, String(f.get(k) ?? "")]))); }}
          className="space-y-3 rounded-md bg-white p-5 ring-1 ring-slate-200">
          <h2 className="font-bold">🚚 Mark as dispatched</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium">Courier *<input name="courier" required minLength={2} maxLength={80} placeholder="e.g. DTDC, Delhivery, Blue Dart" className={field} /></label>
            <label className="text-sm font-medium">Tracking / AWB number *<input name="tracking_number" required minLength={3} maxLength={80} className={field} /></label>
            <label className="text-sm font-medium sm:col-span-2">Tracking link (optional)<input name="tracking_url" type="url" maxLength={500} placeholder="https://…" className={field} /></label>
            <label className="text-sm font-medium sm:col-span-2">Note (optional)<input name="note" maxLength={1000} placeholder="e.g. 2 boxes" className={field} /></label>
          </div>
          <button disabled={busy} className="w-full rounded-md bg-emerald-600 px-5 py-2.5 font-bold text-white hover:bg-emerald-700 disabled:opacity-60">{busy ? "Saving…" : "Mark dispatched"}</button>
        </form>
      )}

      {order.status === "dispatched" && (
        <div className="rounded-md bg-emerald-50 p-5 text-sm ring-1 ring-emerald-200">
          <p className="font-bold text-emerald-900">Dispatched {order.dispatched_at ? formatDate(order.dispatched_at) : ""}</p>
          <p className="mt-1">Courier: <b>{order.courier}</b> · Tracking: <b>{order.tracking_number}</b>{order.tracking_url && <> · <a href={order.tracking_url} target="_blank" rel="noopener noreferrer" className="text-brand-700 underline">track</a></>}</p>
        </div>
      )}
      {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-block text-sm font-semibold text-emerald-700 hover:underline">Message PCBDukaan on WhatsApp</a>}
    </div>
  );
}

export default function Page() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-md bg-slate-100" />}><VendorOrder /></Suspense>
    </div>
  );
}
