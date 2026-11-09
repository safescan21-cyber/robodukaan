"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-browser";
import { adminField } from "@/lib/admin";
import type { Vendor } from "@/lib/types";

const digits = (v: string) => {
  const d = v.replace(/\D/g, "");
  return d.length === 10 ? `91${d}` : d;   // 10-digit Indian mobile → add country code for WhatsApp
};

const ENQUIRY_SUBJECT = "Dealer / reseller account enquiry – PCBDukaan";
function enquiryText(v: Vendor) {
  return `Hello ${v.contact_name || v.company_name} team,

PCBDukaan Pvt Ltd sells industrial electronics online at https://pcbdukaan.com and repairs industrial PCBs (VFD, SMPS, PLC, servo, HMI) across India.

We would like to open a dealer / reseller account with you. Please share:
1. Dealer price list and discount
2. Minimum order quantity and payment terms
3. Whether you can dispatch directly to our customers (drop-ship) with our invoice
4. Brand authorisation letter (for genuine products)

Thank you,
PCBDukaan – sonugiri@pcbdukaan.in`;
}

// Admin → Vendors: suppliers who can dispatch orders directly to customers.
export default function VendorsPage() {
  const [rows, setRows] = useState<Vendor[] | null>(null);
  const [editing, setEditing] = useState<Vendor | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, { open: number; done: number }>>({});
  const [show, setShow] = useState<"active" | "prospect">("active");

  const load = useCallback(async () => {
    const supabase = getSupabase();
    const [{ data, error }, { data: a }] = await Promise.all([
      supabase.from("vendors").select("*").order("company_name"),
      supabase.from("vendor_assignments").select("vendor_id, status"),
    ]);
    setError(error ? (/vendors/.test(error.message) ? "Run database update 017 (supabase/migrations/RUN-IN-SUPABASE.sql) in Supabase first." : error.message) : null);
    setRows((data as Vendor[]) ?? []);
    const c: Record<string, { open: number; done: number }> = {};
    for (const r of (a ?? []) as { vendor_id: string; status: string }[]) {
      c[r.vendor_id] ??= { open: 0, done: 0 };
      if (r.status === "dispatched") c[r.vendor_id].done++; else if (r.status !== "declined") c[r.vendor_id].open++;
    }
    setCounts(c);
  }, []);
  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "").trim();
    const values = {
      company_name: get("company_name"),
      contact_name: get("contact_name") || null,
      email: get("email").toLowerCase() || null,
      whatsapp: get("whatsapp") ? digits(get("whatsapp")) : null,
      city: get("city") || null,
      ...(get("phone") || (editing !== "new" && editing?.phone) ? { phone: get("phone") || null } : {}),
      ...(get("website") || (editing !== "new" && editing?.website) ? { website: get("website") || null } : {}),
      notes: get("notes") || null,
      is_active: f.get("is_active") === "on",
    };
    const supabase = getSupabase();
    const { error } = editing === "new" || !editing
      ? await supabase.from("vendors").insert(values)
      : await supabase.from("vendors").update(values).eq("id", editing.id);
    if (error) return setError(/whatsapp/.test(error.message) ? "WhatsApp number: 10-digit mobile number (or with 91 in front)." : /email/.test(error.message) ? "Please check the email address." : /website/.test(error.message) ? "Website must start with https://" : error.message);
    setEditing(null);
    load();
  }

  const v = editing && editing !== "new" ? editing : null;
  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Vendors</h1>
        <button onClick={() => setEditing("new")} className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">+ Add vendor</button>
      </div>
      <p className="text-sm text-slate-600">Suppliers who can dispatch an order straight to your customer. Assign an order to a vendor on the order page – they get an email (and you can send WhatsApp) with a private link to accept it and mark it dispatched.</p>
      {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}

      {editing && (
        <form key={v?.id ?? "new"} onSubmit={save} className="grid gap-3 rounded-md bg-white p-5 ring-1 ring-slate-200 sm:grid-cols-2">
          <h2 className="font-bold sm:col-span-2">{v ? `Edit ${v.company_name}` : "New vendor"}</h2>
          <label className="text-sm font-medium">Company name *<input name="company_name" required minLength={2} maxLength={120} defaultValue={v?.company_name ?? ""} className={adminField} /></label>
          <label className="text-sm font-medium">Contact person<input name="contact_name" maxLength={80} defaultValue={v?.contact_name ?? ""} className={adminField} /></label>
          <label className="text-sm font-medium">Email (orders are sent here)<input name="email" type="email" maxLength={200} defaultValue={v?.email ?? ""} className={adminField} /></label>
          <label className="text-sm font-medium">WhatsApp number<input name="whatsapp" inputMode="tel" maxLength={16} placeholder="98765 43210" defaultValue={v?.whatsapp ?? ""} className={adminField} /></label>
          <label className="text-sm font-medium">Phone (calls)<input name="phone" maxLength={40} defaultValue={v?.phone ?? ""} placeholder="+91 …" className={adminField} /></label>
          <label className="text-sm font-medium">Website<input name="website" type="url" maxLength={300} defaultValue={v?.website ?? ""} placeholder="https://…" className={adminField} /></label>
          <label className="text-sm font-medium">City<input name="city" maxLength={80} defaultValue={v?.city ?? ""} className={adminField} /></label>
          <label className="flex items-center gap-2 self-end text-sm font-medium"><input name="is_active" type="checkbox" defaultChecked={v?.is_active ?? true} /> Active (can receive orders – only after they agreed)</label>
          <label className="text-sm font-medium sm:col-span-2">Notes (what they supply, terms…)<textarea name="notes" rows={2} maxLength={1000} defaultValue={v?.notes ?? ""} className={adminField} /></label>
          <div className="flex gap-2 sm:col-span-2">
            <button className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">Save</button>
            <button type="button" onClick={() => setEditing(null)} className="rounded-md px-4 py-2 text-sm ring-1 ring-slate-300">Cancel</button>
          </div>
        </form>
      )}

      <div className="flex flex-wrap gap-2">
        {([["active", `Active vendors (${rows?.filter((r) => r.is_active).length ?? 0})`], ["prospect", `Prospects / inactive (${rows?.filter((r) => !r.is_active).length ?? 0})`]] as const).map(([k, label]) => (
          <button key={k} onClick={() => setShow(k)} className={`rounded-full px-3 py-1 text-sm ring-1 ${show === k ? "bg-brand-600 text-white ring-brand-600" : "bg-white ring-slate-300 hover:ring-brand-600"}`}>{label}</button>
        ))}
      </div>
      {show === "prospect" && <p className="text-xs text-slate-500">Prospects can&apos;t receive orders. Send them the dealership enquiry; when they open an account for you, tap Edit → tick Active.</p>}
      {rows === null && <div className="h-32 animate-pulse rounded-md bg-slate-100" />}
      {rows?.length === 0 && !editing && <p className="text-sm text-slate-500">No vendors yet – add your first supplier.</p>}
      <div className="space-y-2">
        {rows?.filter((r) => (show === "active" ? r.is_active : !r.is_active)).map((r) => {
          const tel = (r.phone ?? "").split("/")[0].replace(/\(.*?\)/g, "").replace(/[^\d+]/g, "");
          return (
            <div key={r.id} className="rounded-md bg-white p-4 ring-1 ring-slate-200">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="text-sm">
                  <p className="font-bold">{r.company_name}</p>
                  <p className="text-slate-600">{[r.contact_name, r.city].filter(Boolean).join(" · ")}</p>
                  <p className="text-slate-600">{[r.email, r.phone && `📞 ${r.phone}`, r.whatsapp && `WhatsApp +${r.whatsapp}`].filter(Boolean).join(" · ") || "no contact details yet"}</p>
                  {r.website && <a href={r.website} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-700 hover:underline">{r.website.replace(/^https?:\/\//, "")}</a>}
                  {r.notes && <p className="mt-1 text-xs text-slate-500">{r.notes}</p>}
                  {r.is_active && <p className="mt-1 text-xs text-slate-500">Orders: {counts[r.id]?.open ?? 0} open · {counts[r.id]?.done ?? 0} dispatched</p>}
                </div>
                <button onClick={() => setEditing(r)} className="text-sm font-semibold text-brand-700 hover:underline">Edit</button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {r.email && <a href={`mailto:${r.email}?subject=${encodeURIComponent(ENQUIRY_SUBJECT)}&body=${encodeURIComponent(enquiryText(r))}`} className="rounded bg-brand-600 px-3 py-1 font-semibold text-white">✉️ Email enquiry</a>}
                {r.whatsapp && <a href={`https://wa.me/${r.whatsapp}?text=${encodeURIComponent(enquiryText(r))}`} target="_blank" rel="noopener noreferrer" className="rounded bg-emerald-600 px-3 py-1 font-semibold text-white">WhatsApp enquiry</a>}
                {tel.length >= 8 && <a href={`tel:${tel}`} className="rounded bg-slate-800 px-3 py-1 font-semibold text-white">📞 Call</a>}
                <button type="button" onClick={() => { navigator.clipboard?.writeText(enquiryText(r)); setError(null); alert("Enquiry message copied – paste it in IndiaMART, WhatsApp or the supplier's website form."); }} className="rounded px-3 py-1 font-semibold ring-1 ring-slate-300">Copy enquiry message</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
