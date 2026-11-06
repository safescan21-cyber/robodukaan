"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-browser";
import { revalidateCatalog } from "@/lib/admin";
import { Stars } from "@/components/Stars";
import { formatDate } from "@/lib/format";
import type { Review } from "@/lib/types";
import { Pager } from "@/components/Pager";
import { adminField } from "@/lib/admin";

type Row = Review & { product: { name: string; slug: string } | null };

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Row[] | null>(null);
  const [filter, setFilter] = useState<"all" | "visible" | "hidden">("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const PAGE = 25;

  const load = useCallback(async () => {
    let req = getSupabase().from("reviews").select("*, product:products(name, slug)", { count: "exact" }).order("created_at", { ascending: false }).range(page * PAGE, page * PAGE + PAGE - 1);
    const term = q.trim().replace(/[%,()*\\]/g, " ");
    if (term) req = req.or(`comment.ilike.%${term}%,user_name.ilike.%${term}%`);
    if (filter === "visible") req = req.eq("is_hidden", false);
    if (filter === "hidden") req = req.eq("is_hidden", true);
    const { data, count } = await req;
    setReviews((data as Row[]) ?? []);
    setTotal(count ?? 0);
  }, [filter, q, page]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on change
    load();
  }, [load]);

  async function setHidden(r: Row, is_hidden: boolean) {
    await getSupabase().from("reviews").update({ is_hidden }).eq("id", r.id);
    revalidateCatalog();
    load();
  }
  async function remove(r: Row) {
    if (!confirm("Delete this review permanently?")) return;
    await getSupabase().from("reviews").delete().eq("id", r.id);
    revalidateCatalog();
    load();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Reviews</h1>
      <div className="flex gap-2">
        {(["all", "visible", "hidden"] as const).map((f) => (
          <button key={f} onClick={() => { setFilter(f); setPage(0); }} className={`rounded-full px-3 py-1 text-sm capitalize ring-1 ${filter === f ? "bg-brand-600 text-white ring-brand-600" : "bg-white ring-slate-300"}`}>{f}</button>
        ))}
      </div>
      <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search review text or name…" className={`${adminField} mt-0 max-w-md`} aria-label="Search reviews" />
      <ul className="divide-y divide-slate-100 rounded-md bg-white ring-1 ring-slate-200">
        {reviews === null && <li className="p-4 text-sm text-slate-500">Loading…</li>}
        {reviews?.length === 0 && <li className="p-4 text-sm text-slate-500">No reviews.</li>}
        {reviews?.map((r) => (
          <li key={r.id} className={`flex flex-wrap gap-4 p-4 text-sm ${r.is_hidden ? "bg-slate-50 opacity-70" : ""}`}>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Stars value={r.rating} />
                <span className="font-semibold">{r.user_name}</span>
                {r.verified && <span className="rounded bg-emerald-100 px-1.5 text-[11px] font-semibold text-emerald-800">Verified</span>}
                {r.is_hidden && <span className="rounded bg-slate-200 px-1.5 text-[11px] font-semibold">Hidden</span>}
                <span className="text-xs text-slate-400">{formatDate(r.created_at)}</span>
              </div>
              {r.product && <Link href={`/products/${r.product.slug}`} target="_blank" className="text-xs text-brand-700 hover:underline">{r.product.name}</Link>}
              <p className="mt-1 whitespace-pre-line text-slate-700">{r.comment}</p>
            </div>
            <div className="flex items-start gap-3 text-xs font-semibold">
              <button onClick={() => setHidden(r, !r.is_hidden)} className="text-brand-700 hover:underline">{r.is_hidden ? "Show" : "Hide"}</button>
              <button onClick={() => remove(r)} className="text-red-600 hover:underline">Delete</button>
            </div>
          </li>
        ))}
      </ul>
      <Pager page={page} pageSize={PAGE} total={total} onPage={setPage} />
    </div>
  );
}
