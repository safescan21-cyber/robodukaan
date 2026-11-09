"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-browser";
import { adminField } from "@/lib/admin";
import { formatDate, formatINR } from "@/lib/format";
import { Pager } from "@/components/Pager";
import type { AdminCustomer } from "@/lib/admin-types";

export default function AdminCustomersPage() {
  const [people, setPeople] = useState<AdminCustomer[] | null>(null);
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [only, setOnly] = useState<"all" | "admin" | "blocked">("all");
  const PAGE = 25;
  const filtered = people?.filter((p) => only === "all" || (only === "admin" ? p.role === "admin" : p.is_blocked));
  const shown = filtered?.slice(page * PAGE, page * PAGE + PAGE);
  const count = (k: "admin" | "blocked") => people?.filter((p) => (k === "admin" ? p.role === "admin" : p.is_blocked)).length ?? 0;

  const load = useCallback(async () => {
    const { data, error } = await getSupabase().rpc("admin_customers", { p_search: q.trim() || null });
    if (error) setError(error.message);
    setPeople((data as AdminCustomer[]) ?? []);
  }, [q]);
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Customers <span className="text-base font-normal text-slate-500">({people?.length ?? "…"})</span></h1>
      <div className="flex flex-wrap gap-2">
        {([["all", `All (${people?.length ?? 0})`], ["admin", `Admins (${count("admin")})`], ["blocked", `Blocked (${count("blocked")})`]] as const).map(([k, label]) => (
          <button key={k} onClick={() => { setOnly(k); setPage(0); }}
            className={`rounded-full px-3 py-1 text-sm ring-1 ${only === k ? "bg-brand-600 text-white ring-brand-600" : "bg-white ring-slate-300 hover:ring-brand-600"}`}>{label}</button>
        ))}
      </div>
      <p className="text-xs text-slate-500">To add another admin: open the person (they must have registered on the website) → “Make admin”.</p>
      <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search name, email, phone…" className={`${adminField} mt-0 max-w-md`} aria-label="Search customers" />
      {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="overflow-x-auto rounded-md bg-white ring-1 ring-slate-200">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600">
            <tr><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3">Joined</th><th className="px-4 py-3">Last login</th><th className="px-4 py-3">Orders</th><th className="px-4 py-3">Spent</th><th className="px-4 py-3">Repairs</th><th className="px-4 py-3">Role</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {people === null && <tr><td colSpan={8} className="p-4 text-slate-500">Loading…</td></tr>}
            {filtered?.length === 0 && <tr><td colSpan={8} className="p-4 text-slate-500">No customers found.</td></tr>}
            {shown?.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/admin/customers/${p.id}`} className="font-medium text-brand-700 hover:underline">{p.full_name || "—"}</Link>
                  <span className="block text-xs text-slate-500">{p.email}{!p.email_confirmed && " · not confirmed"}</span>
                </td>
                <td className="px-4 py-3">{p.phone || "—"}</td>
                <td className="px-4 py-3 text-slate-600">{formatDate(p.created_at)}</td>
                <td className="px-4 py-3 text-slate-600">{p.last_sign_in_at ? formatDate(p.last_sign_in_at) : "Never"}</td>
                <td className="px-4 py-3">{p.orders}</td>
                <td className="px-4 py-3">{formatINR(p.spent)}</td>
                <td className="px-4 py-3">{p.repairs}</td>
                <td className="px-4 py-3">{p.is_blocked ? <span className="rounded bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">Blocked</span> : p.role === "admin" ? <span className="rounded bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white">Admin</span> : <span className="text-xs text-slate-500">Customer</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered && <Pager page={page} pageSize={PAGE} total={filtered.length} onPage={setPage} />}
    </div>
  );
}
