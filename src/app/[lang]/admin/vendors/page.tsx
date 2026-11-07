"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-browser";
import { adminField } from "@/lib/admin";
import type { Vendor } from "@/lib/types";

const digits = (v: string) => {
  const d = v.replace(/\D/g, "");
  return d.length === 10 ? `91${d}` : d;   // 10-digit Indian mobile → add country code for WhatsApp
};

// Admin → Vendors: suppliers who can dispatch orders directly to customers.
export default function VendorsPage() {
  const [rows, setRows] = useState<Vendor[] | null>(null);
  const [editing, setEditing] = useState<Vendor | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, { open: number; done: number }>>({});

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
      notes: get("notes") || null,
      is_active: f.get("is_active") === "on",
    };
    const supabase = getSupabase();
    const { error } = editing === "new" || !editing
      ? await supabase.from("vendors").insert(values)
      : await supabase.from("vendors").update(values).eq("id", editing.id);
    if (error) return setError(/whatsapp/.test(error.message) ? "WhatsApp number: 10-digit mobile number (or with 91 in front)." : /email/.test(error.message) ? "Please check the email address." : error.message);
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
          <label className="text-sm font-medium">City<input name="city" maxLength={80} defaultValue={v?.city ?? ""} className={adminField} /></label>
          <label className="flex items-center gap-2 self-end text-sm font-medium"><input name="is_active" type="checkbox" defaultChecked={v?.is_active ?? true} /> Active</label>
          <label className="text-sm font-medium sm:col-span-2">Notes (what they supply, terms…)<textarea name="notes" rows={2} maxLength={1000} defaultValue={v?.notes ?? ""} className={adminField} /></label>
          <div className="flex gap-2 sm:col-span-2">
            <button className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">Save</button>
            <button type="button" onClick={() => setEditing(null)} className="rounded-md px-4 py-2 text-sm ring-1 ring-slate-300">Cancel</button>
          </div>
        </form>
      )}

      {rows === null && <div className="h-32 animate-pulse rounded-md bg-slate-100" />}
      {rows?.length === 0 && !editing && <p className="text-sm text-slate-500">No vendors yet – add your first supplier.</p>}
      <div className="space-y-2">
        {rows?.map((r) => (
          <div key={r.id} className={`flex flex-wrap items-start justify-between gap-2 rounded-md bg-white p-4 ring-1 ring-slate-200 ${r.is_active ? "" : "opacity-60"}`}>
            <div className="text-sm">
              <p className="font-bold">{r.company_name}{!r.is_active && <span className="ms-2 text-xs font-normal">(inactive)</span>}</p>
              <p className="text-slate-600">{[r.contact_name, r.city].filter(Boolean).join(" · ")}</p>
              <p className="text-slate-600">{r.email ?? "no email"}{r.whatsapp ? ` · WhatsApp +${r.whatsapp}` : ""}</p>
              {r.notes && <p className="mt-1 text-xs text-slate-500">{r.notes}</p>}
              <p className="mt-1 text-xs text-slate-500">Orders: {counts[r.id]?.open ?? 0} open · {counts[r.id]?.done ?? 0} dispatched</p>
            </div>
            <button onClick={() => setEditing(r)} className="text-sm font-semibold text-brand-700 hover:underline">Edit</button>
          </div>
        ))}
      </div>
    </div>
  );
}
