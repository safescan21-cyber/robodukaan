"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-browser";
import { adminField } from "@/lib/admin";
import { formatDate } from "@/lib/format";
import type { Order, Vendor, VendorAssignment } from "@/lib/types";

const STATUS: Record<VendorAssignment["status"], [string, string]> = {
  assigned: ["Waiting for vendor", "bg-amber-100 text-amber-800"],
  accepted: ["Accepted by vendor", "bg-sky-100 text-sky-800"],
  declined: ["Declined by vendor", "bg-red-100 text-red-700"],
  dispatched: ["Dispatched by vendor", "bg-emerald-100 text-emerald-800"],
};

async function assignRequest(body: Record<string, unknown>) {
  const { data } = await getSupabase().auth.getSession();
  const res = await fetch("/api/admin/vendor-assign", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
  return json as { link: string; emailed: boolean; vendorEmail: string | null };
}

// Order page (admin): assign the order to a vendor, who gets an email + WhatsApp with a private link.
export function VendorAssign({ order, onChange }: { order: Order; onChange: () => void }) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [assignment, setAssignment] = useState<VendorAssignment | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [setupNeeded, setSetupNeeded] = useState(false);

  const load = useCallback(async () => {
    const supabase = getSupabase();
    const [{ data: v, error }, { data: a }] = await Promise.all([
      supabase.from("vendors").select("*").eq("is_active", true).order("company_name"),
      supabase.from("vendor_assignments").select("*, vendor:vendors(*)").eq("order_id", order.id).maybeSingle(),
    ]);
    setSetupNeeded(!!error);
    setVendors((v as Vendor[]) ?? []);
    setAssignment((a as VendorAssignment) ?? null);
  }, [order.id]);
  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  function whatsappLink(vendor: Vendor | null | undefined, link: string) {
    if (!vendor?.whatsapp) return null;
    const items = (order.order_items ?? []).map((i) => `• ${i.name} × ${i.quantity}`).join("\n");
    const text = `Hello ${vendor.contact_name || vendor.company_name},\nNew PCBDukaan order ${order.order_number} to dispatch:\n${items}\nShip to: ${order.customer_name}, ${order.city} – ${order.pincode}\n\nFull details and "Mark dispatched" button:\n${link}`;
    return `https://wa.me/${vendor.whatsapp}?text=${encodeURIComponent(text)}`;
  }

  async function assign(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const vendorId = String(f.get("vendor_id") ?? "");
    if (!vendorId) return;
    if (assignment && assignment.vendor_id !== vendorId && !confirm("Move this order to another vendor? The old vendor's link stops working.")) return;
    setBusy(true); setMsg(null);
    try {
      const r = await assignRequest({ order_id: order.id, vendor_id: vendorId, admin_note: String(f.get("admin_note") ?? "") });
      const vendor = vendors.find((v) => v.id === vendorId);
      setMsg({ ok: true, text: r.emailed ? `Assigned – email sent to ${r.vendorEmail}.` : `Assigned. No email was sent${vendor?.email ? " (email not set up on the server?)" : " (this vendor has no email)"} – send the WhatsApp message.` });
      const wa = whatsappLink(vendor, r.link);
      if (wa) window.open(wa, "_blank", "noopener");
      await load(); onChange();
    } catch (err) { setMsg({ ok: false, text: err instanceof Error ? err.message : String(err) }); }
    setBusy(false);
  }

  async function resend() {
    setBusy(true); setMsg(null);
    try {
      const r = await assignRequest({ order_id: order.id, resend: true });
      setMsg({ ok: r.emailed, text: r.emailed ? `Email sent again to ${r.vendorEmail}.` : "Could not send the email." });
    } catch (err) { setMsg({ ok: false, text: err instanceof Error ? err.message : String(err) }); }
    setBusy(false);
  }

  if (assignment === undefined) return <div className="h-24 animate-pulse rounded-md bg-slate-100" />;
  if (setupNeeded) return <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">To assign orders to vendors, run database update 017 (supabase/migrations/RUN-IN-SUPABASE.sql) in Supabase.</p>;

  const link = assignment ? `${window.location.origin}/vendor/${assignment.token}` : "";
  const wa = assignment ? whatsappLink(assignment.vendor, link) : null;
  const [label, style] = assignment ? STATUS[assignment.status] : ["", ""];
  return (
    <section className="space-y-3 rounded-md bg-white p-5 ring-1 ring-slate-200">
      <h2 className="font-bold">🏭 Vendor / dispatch from supplier</h2>
      {assignment && (
        <div className="space-y-1 rounded bg-slate-50 p-3 text-sm">
          <p><b>{assignment.vendor?.company_name}</b> <span className={`ms-1 rounded-full px-2 py-0.5 text-xs font-semibold ${style}`}>{label}</span></p>
          <p className="text-xs text-slate-500">
            Assigned {formatDate(assignment.assigned_at)}{assignment.notified_at ? " · email sent" : " · email not sent"}
            {assignment.accepted_at ? ` · accepted ${formatDate(assignment.accepted_at)}` : ""}
            {assignment.dispatched_at ? ` · dispatched ${formatDate(assignment.dispatched_at)}` : ""}
          </p>
          {assignment.status === "dispatched" && (
            <p>🚚 {assignment.courier} · <b>{assignment.tracking_number}</b>{assignment.tracking_url && <> · <a href={assignment.tracking_url} target="_blank" rel="noopener noreferrer" className="text-brand-700 underline">track</a></>}</p>
          )}
          {assignment.vendor_note && <p>Vendor note: “{assignment.vendor_note}”</p>}
          <div className="flex flex-wrap gap-2 pt-1">
            {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="rounded bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">WhatsApp vendor</a>}
            {assignment.vendor?.email && assignment.status !== "dispatched" && <button type="button" disabled={busy} onClick={resend} className="rounded px-3 py-1 text-xs font-semibold ring-1 ring-slate-300">Re-send email</button>}
            <button type="button" onClick={() => { navigator.clipboard?.writeText(link); setMsg({ ok: true, text: "Vendor link copied." }); }} className="rounded px-3 py-1 text-xs font-semibold ring-1 ring-slate-300">Copy vendor link</button>
          </div>
        </div>
      )}
      {(!assignment || assignment.status !== "dispatched") && (
        vendors.length === 0 ? (
          <p className="text-sm text-slate-600">No vendors yet. <Link href="/admin/vendors" className="font-semibold text-brand-700 hover:underline">Add a vendor →</Link></p>
        ) : (
          <form onSubmit={assign} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className="text-xs font-medium">{assignment ? "Move to vendor" : "Assign to vendor"}
              <select name="vendor_id" required defaultValue={assignment?.vendor_id ?? ""} className={adminField}>
                <option value="" disabled>Choose vendor…</option>
                {vendors.map((v) => <option key={v.id} value={v.id}>{v.company_name}{v.city ? ` (${v.city})` : ""}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium">Note for vendor (optional)<input name="admin_note" maxLength={1000} placeholder="e.g. pack with test report" className={adminField} /></label>
            <button disabled={busy} className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">{busy ? "Sending…" : assignment ? "Re-assign & notify" : "Assign & notify"}</button>
          </form>
        )
      )}
      {msg && <p className={`text-sm ${msg.ok ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</p>}
    </section>
  );
}
