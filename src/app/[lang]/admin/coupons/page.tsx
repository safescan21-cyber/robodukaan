"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-browser";
import { adminButton, adminField } from "@/lib/admin";
import { formatDate, formatINR } from "@/lib/format";
import type { Coupon } from "@/lib/types";

const toLocal = (v: string | null) => (v ? new Date(v).toISOString().slice(0, 16) : "");

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[] | null>(null);
  const [editing, setEditing] = useState<Coupon | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await getSupabase().from("coupons").select("*").order("created_at", { ascending: false });
    setCoupons((data as Coupon[]) ?? []);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount
    load();
  }, [load]);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const opt = (k: string) => (String(f.get(k) ?? "").trim() === "" ? null : String(f.get(k)));
    const values = {
      code: String(f.get("code")).trim().toUpperCase(),
      description: opt("description"),
      discount_type: String(f.get("discount_type")),
      discount_value: Number(f.get("discount_value")),
      max_discount: opt("max_discount") == null ? null : Number(f.get("max_discount")),
      min_order: Number(f.get("min_order") || 0),
      usage_limit: opt("usage_limit") == null ? null : Number(f.get("usage_limit")),
      starts_at: opt("starts_at") ? new Date(String(f.get("starts_at"))).toISOString() : null,
      ends_at: opt("ends_at") ? new Date(String(f.get("ends_at"))).toISOString() : null,
      is_active: f.get("is_active") === "on",
    };
    const supabase = getSupabase();
    const { error } = editing && editing !== "new"
      ? await supabase.from("coupons").update(values).eq("id", editing.id)
      : await supabase.from("coupons").insert(values);
    if (error) return setError(error.message.includes("duplicate") ? "That code already exists." : error.message.includes("check") ? "Codes are 3–30 letters, numbers, - or _." : error.message);
    setError(null);
    setEditing(null);
    load();
  }

  async function remove(c: Coupon) {
    if (!confirm(`Delete coupon ${c.code}?`)) return;
    await getSupabase().from("coupons").delete().eq("id", c.id);
    load();
  }

  const current = editing && editing !== "new" ? editing : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Coupons</h1>
        {editing === null && <button onClick={() => setEditing("new")} className={adminButton}>+ Add coupon</button>}
      </div>
      {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {editing !== null && (
        <form key={current?.id ?? "new"} onSubmit={save} className="grid gap-4 rounded-md bg-white p-5 ring-1 ring-slate-200 sm:grid-cols-3">
          <label className="text-sm font-medium">Code *<input name="code" required pattern="[A-Za-z0-9_\-]{3,30}" defaultValue={current?.code} className={`${adminField} uppercase`} /></label>
          <label className="text-sm font-medium sm:col-span-2">Description<input name="description" defaultValue={current?.description ?? ""} className={adminField} /></label>
          <label className="text-sm font-medium">Type
            <select name="discount_type" defaultValue={current?.discount_type ?? "percent"} className={adminField}>
              <option value="percent">Percent off</option><option value="flat">Flat ₹ off</option>
            </select>
          </label>
          <label className="text-sm font-medium">Value *<input name="discount_value" type="number" min={1} step="0.01" required defaultValue={current?.discount_value} className={adminField} /></label>
          <label className="text-sm font-medium">Max discount ₹ (percent only)<input name="max_discount" type="number" min={0} defaultValue={current?.max_discount ?? ""} className={adminField} /></label>
          <label className="text-sm font-medium">Minimum order ₹<input name="min_order" type="number" min={0} defaultValue={current?.min_order ?? 0} className={adminField} /></label>
          <label className="text-sm font-medium">Usage limit (blank = unlimited)<input name="usage_limit" type="number" min={1} defaultValue={current?.usage_limit ?? ""} className={adminField} /></label>
          <label className="flex items-center gap-2 self-end text-sm"><input type="checkbox" name="is_active" defaultChecked={current?.is_active ?? true} className="h-4 w-4 accent-brand-600" />Active</label>
          <label className="text-sm font-medium">Starts<input name="starts_at" type="datetime-local" defaultValue={toLocal(current?.starts_at ?? null)} className={adminField} /></label>
          <label className="text-sm font-medium">Ends<input name="ends_at" type="datetime-local" defaultValue={toLocal(current?.ends_at ?? null)} className={adminField} /></label>
          <div className="flex items-end gap-2">
            <button className={adminButton}>Save</button>
            <button type="button" onClick={() => setEditing(null)} className="rounded-md px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
          </div>
        </form>
      )}
      <div className="overflow-x-auto rounded-md bg-white ring-1 ring-slate-200">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600">
            <tr><th className="px-4 py-3">Code</th><th className="px-4 py-3">Discount</th><th className="px-4 py-3">Min order</th><th className="px-4 py-3">Used</th><th className="px-4 py-3">Valid</th><th className="px-4 py-3">Status</th><th className="px-4 py-3" /></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {coupons === null && <tr><td colSpan={7} className="p-4 text-slate-500">Loading…</td></tr>}
            {coupons?.length === 0 && <tr><td colSpan={7} className="p-4 text-slate-500">No coupons yet.</td></tr>}
            {coupons?.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3"><span className="font-mono font-bold">{c.code}</span><span className="block text-xs text-slate-500">{c.description}</span></td>
                <td className="px-4 py-3">{c.discount_type === "percent" ? `${Number(c.discount_value)}%${c.max_discount ? ` (max ${formatINR(c.max_discount)})` : ""}` : formatINR(c.discount_value)}</td>
                <td className="px-4 py-3">{Number(c.min_order) ? formatINR(c.min_order) : "—"}</td>
                <td className="px-4 py-3">{c.used_count}{c.usage_limit ? ` / ${c.usage_limit}` : ""}</td>
                <td className="px-4 py-3 text-xs text-slate-600">{c.starts_at ? formatDate(c.starts_at) : "Now"} → {c.ends_at ? formatDate(c.ends_at) : "No end"}</td>
                <td className="px-4 py-3">{c.is_active ? <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">Active</span> : <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">Off</span>}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold">
                  <button onClick={() => setEditing(c)} className="text-brand-700 hover:underline">Edit</button>
                  <button onClick={() => remove(c)} className="ml-3 text-red-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
