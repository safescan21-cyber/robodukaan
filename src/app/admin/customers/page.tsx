"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-browser";
import { adminField } from "@/lib/admin";
import { useAuth } from "@/components/AuthProvider";
import { formatDate } from "@/lib/format";
import type { Profile } from "@/lib/types";

export default function AdminCustomersPage() {
  const { user } = useAuth();
  const [people, setPeople] = useState<Profile[] | null>(null);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    let req = getSupabase().from("profiles").select("*").order("created_at", { ascending: false }).limit(200);
    const term = q.trim().replace(/[%,()*\\]/g, " ");
    if (term) req = req.or(`full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`);
    const { data } = await req;
    setPeople((data as Profile[]) ?? []);
  }, [q]);
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function setRole(p: Profile, role: "user" | "admin") {
    if (!confirm(role === "admin" ? `Give ${p.email} full admin access?` : `Remove admin access from ${p.email}?`)) return;
    const { error } = await getSupabase().from("profiles").update({ role }).eq("id", p.id);
    if (error) alert(error.message);
    load();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Customers</h1>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, phone…" className={`${adminField} mt-0 max-w-md`} aria-label="Search customers" />
      <div className="overflow-x-auto rounded-md bg-white ring-1 ring-slate-200">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600">
            <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3">Joined</th><th className="px-4 py-3">Role</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {people === null && <tr><td colSpan={5} className="p-4 text-slate-500">Loading…</td></tr>}
            {people?.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3 font-medium">{p.full_name || "—"}</td>
                <td className="px-4 py-3">{p.email}</td>
                <td className="px-4 py-3">{p.phone || "—"}</td>
                <td className="px-4 py-3 text-slate-600">{formatDate(p.created_at)}</td>
                <td className="px-4 py-3">
                  {p.role === "admin" ? (
                    <span className="flex items-center gap-2">
                      <span className="rounded bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white">Admin</span>
                      {p.id !== user?.id && <button onClick={() => setRole(p, "user")} className="text-xs text-red-600 hover:underline">Remove</button>}
                    </span>
                  ) : (
                    <button onClick={() => setRole(p, "admin")} className="text-xs font-semibold text-brand-700 hover:underline">Make admin</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
