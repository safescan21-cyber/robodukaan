"use client";

import { useCallback, useEffect, useState } from "react";
import Link, { useI18n } from "@/i18n/client";
import { getSupabase } from "@/lib/supabase-browser";
import { useAuth } from "./AuthProvider";

type Q = { id: number; asker_name: string | null; question: string; answer: string | null; answered_at: string | null; created_at: string };

// Questions & answers on the product page: answered questions for everyone, plus your own (waiting) ones.
export function ProductQuestions({ productId, slug }: { productId: string; slug: string }) {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const [items, setItems] = useState<Q[] | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const { data } = await getSupabase().from("product_questions")
      .select("id, asker_name, question, answer, answered_at, created_at").eq("product_id", productId)
      .order("answered_at", { ascending: false, nullsFirst: false }).limit(50);
    setItems((data as Q[]) ?? []);
  }, [productId]);
  useEffect(() => { const t0 = setTimeout(load, 0); return () => clearTimeout(t0); }, [load, user]);

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    if (text.trim().length < 5) return;
    setBusy(true); setMsg(null);
    const { data } = await getSupabase().auth.getSession();
    const res = await fetch("/api/product-question", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
      body: JSON.stringify({ productId, question: text.trim() }),
    });
    const r = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) { setText(""); setMsg({ ok: true, text: t("qa.thanks") }); load(); }
    else setMsg({ ok: false, text: r.error || t("qa.failed") });
  }

  const date = (d: string) => new Date(d).toLocaleDateString(locale === "en" ? "en-IN" : locale, { day: "numeric", month: "short", year: "numeric" });
  return (
    <div className="space-y-5">
      {items === null ? <div className="h-16 animate-pulse rounded bg-slate-100" /> : items.length === 0 ? (
        <p className="text-sm text-slate-600">{t("qa.none")}</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((q) => (
            <li key={q.id} className="py-3 text-sm">
              <p className="font-semibold text-slate-900"><span className="me-1 text-brand-700">Q:</span>{q.question}</p>
              <p className="mt-0.5 text-xs text-slate-500">{q.asker_name ?? t("qa.customer")} · {date(q.created_at)}</p>
              {q.answer ? (
                <p className="mt-2 whitespace-pre-line rounded bg-emerald-50 p-2 text-slate-800"><span className="me-1 font-semibold text-emerald-700">A:</span>{q.answer}</p>
              ) : (
                <p className="mt-2 text-xs text-amber-700">{t("qa.waiting")}</p>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="rounded-md bg-slate-50 p-4 ring-1 ring-slate-200">
        <p className="mb-2 text-sm font-semibold">{t("qa.ask")}</p>
        {user ? (
          <form onSubmit={ask} className="space-y-2">
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={500} required minLength={5} placeholder={t("qa.placeholder")}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
            <button disabled={busy || text.trim().length < 5} className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">{busy ? "…" : t("qa.submit")}</button>
          </form>
        ) : (
          <p className="text-sm text-slate-600"><Link href={`/login?next=${encodeURIComponent(`/products/${slug}`)}`} className="font-semibold text-brand-700 underline">{t("qa.login")}</Link></p>
        )}
        {msg && <p role="status" className={`mt-2 text-sm ${msg.ok ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</p>}
      </div>
    </div>
  );
}
