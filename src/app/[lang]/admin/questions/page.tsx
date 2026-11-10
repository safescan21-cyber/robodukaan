"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-browser";
import { adminButton, adminField, revalidateCatalog } from "@/lib/admin";

type Q = { id: number; asker_name: string | null; question: string; answer: string | null; answered_at: string | null; is_public: boolean; created_at: string; product: { name: string; slug: string } | null };

// Admin → Questions: customers' questions from product pages. Answers appear on the product page for everyone.
export default function QuestionsAdmin() {
  const [items, setItems] = useState<Q[] | null>(null);
  const [filter, setFilter] = useState<"open" | "all">("open");
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    let q = getSupabase().from("product_questions").select("id, asker_name, question, answer, answered_at, is_public, created_at, product:products(name, slug)").order("created_at", { ascending: false }).limit(200);
    if (filter === "open") q = q.is("answer", null);
    const { data, error } = await q;
    if (error) setMsg(error.message.includes("product_questions") ? "Database update 027 is needed first (it installs itself within a few minutes)." : error.message);
    setItems((data as unknown as Q[]) ?? []);
  }, [filter]);
  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load]);

  async function save(q: Q) {
    const answer = (drafts[q.id] ?? q.answer ?? "").trim();
    if (!answer) return;
    const { error } = await getSupabase().from("product_questions").update({ answer, answered_at: new Date().toISOString() }).eq("id", q.id);
    setMsg(error ? error.message : "Answer published on the product page.");
    if (!error) { revalidateCatalog(); load(); }
  }
  async function togglePublic(q: Q) {
    await getSupabase().from("product_questions").update({ is_public: !q.is_public }).eq("id", q.id);
    load();
  }
  async function remove(q: Q) {
    if (!confirm("Delete this question?")) return;
    await getSupabase().from("product_questions").delete().eq("id", q.id);
    load();
  }

  return (
    <div className="max-w-4xl space-y-4">
      <h1 className="text-2xl font-bold">Product questions</h1>
      <p className="text-sm text-slate-600">Customers ask these on product pages (logged-in customers, max 5 a day). Your answer appears on the product page for everyone – it builds trust and helps Google. You also get an email for each new question.</p>
      <div className="flex gap-2">
        {(["open", "all"] as const).map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)} className={`rounded-full px-3 py-1 text-sm ring-1 ${filter === f ? "bg-brand-600 text-white ring-brand-600" : "bg-white ring-slate-300"}`}>{f === "open" ? "Waiting for an answer" : "All"}</button>
        ))}
      </div>
      {msg && <p role="status" className="rounded bg-slate-100 p-2 text-sm">{msg}</p>}
      {items === null ? <div className="h-32 animate-pulse rounded bg-slate-100" /> : items.length === 0 ? <p className="text-sm text-slate-500">No questions here.</p> : (
        <ul className="space-y-3">
          {items.map((q) => (
            <li key={q.id} className="rounded-md bg-white p-4 ring-1 ring-slate-200">
              <p className="text-xs text-slate-500">{q.product ? <Link href={`/products/${q.product.slug}`} className="font-semibold text-brand-700 hover:underline">{q.product.name}</Link> : "Product removed"} · {q.asker_name ?? "Customer"} · {new Date(q.created_at).toLocaleString("en-IN")}{!q.is_public && " · hidden"}</p>
              <p className="mt-1 font-semibold">{q.question}</p>
              <textarea value={drafts[q.id] ?? q.answer ?? ""} onChange={(e) => setDrafts({ ...drafts, [q.id]: e.target.value })} rows={3} maxLength={2000} placeholder="Your answer (shown on the product page)…" className={adminField} />
              <div className="mt-2 flex flex-wrap gap-3 text-sm">
                <button type="button" onClick={() => save(q)} className={adminButton}>{q.answer ? "Update answer" : "Publish answer"}</button>
                <button type="button" onClick={() => togglePublic(q)} className="text-slate-600 hover:underline">{q.is_public ? "Hide from product page" : "Show on product page"}</button>
                <button type="button" onClick={() => remove(q)} className="text-red-600 hover:underline">Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
