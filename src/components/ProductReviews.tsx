"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-browser";
import type { Review } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { useAuth } from "./AuthProvider";
import { Stars } from "./Stars";

export function ProductReviews({ productId, slug }: { productId: string; slug: string }) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await getSupabase()
      .from("reviews")
      .select("*")
      .eq("product_id", productId)
      .eq("is_hidden", false)
      .order("created_at", { ascending: false })
      .limit(50);
    setReviews((data as Review[]) ?? []);
  }, [productId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount
    load();
  }, [load]);

  const mine = reviews?.find((r) => r.user_id === user?.id);

  useEffect(() => {
    if (mine) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- prefill the form with the user's review
      setRating(mine.rating);
      setComment(mine.comment);
    }
  }, [mine]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    setMessage(null);
    const { error } = await getSupabase()
      .from("reviews")
      .upsert({ product_id: productId, user_id: user.id, rating, comment: comment.trim() }, { onConflict: "product_id,user_id" });
    setBusy(false);
    if (error) setMessage(error.message);
    else {
      setMessage("Thanks! Your review is saved.");
      load();
    }
  }

  const count = reviews?.length ?? 0;
  const avg = count ? reviews!.reduce((s, r) => s + r.rating, 0) / count : 0;
  const dist = [5, 4, 3, 2, 1].map((n) => ({ n, c: reviews?.filter((r) => r.rating === n).length ?? 0 }));

  return (
    <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
      <div>
        <p className="text-4xl font-extrabold">{avg ? avg.toFixed(1) : "–"}</p>
        <Stars value={avg} size="md" />
        <p className="mt-1 text-sm text-slate-500">{count} review{count === 1 ? "" : "s"}</p>
        <ul className="mt-4 space-y-1.5">
          {dist.map(({ n, c }) => (
            <li key={n} className="flex items-center gap-2 text-xs">
              <span className="w-6">{n}★</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                <span className="block h-full bg-amber-400" style={{ width: count ? `${(c / count) * 100}%` : 0 }} />
              </span>
              <span className="w-6 text-right text-slate-500">{c}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-6">
        {user ? (
          <form onSubmit={submit} className="rounded-md bg-slate-50 p-4 ring-1 ring-slate-200">
            <p className="font-semibold">{mine ? "Edit your review" : "Write a review"}</p>
            <div className="mt-2 flex gap-1" role="radiogroup" aria-label="Your rating">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  type="button"
                  key={n}
                  role="radio"
                  aria-checked={rating === n}
                  aria-label={`${n} star${n > 1 ? "s" : ""}`}
                  onClick={() => setRating(n)}
                  className={`text-2xl ${n <= rating ? "text-amber-400" : "text-slate-300"}`}
                >
                  ★
                </button>
              ))}
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required
              minLength={2}
              maxLength={1500}
              rows={3}
              placeholder="How did this product work for your project?"
              className="mt-2 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-600"
            />
            <div className="mt-2 flex items-center gap-3">
              <button disabled={busy} className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
                {busy ? "Saving…" : mine ? "Update review" : "Submit review"}
              </button>
              {message && <p className="text-sm text-slate-600" role="status">{message}</p>}
            </div>
          </form>
        ) : (
          <p className="rounded-md bg-slate-50 p-4 text-sm ring-1 ring-slate-200">
            <Link href={`/login?next=/products/${slug}`} className="font-semibold text-brand-700 hover:underline">Log in</Link> to write a review.
          </p>
        )}

        {reviews === null ? (
          <p className="text-sm text-slate-500">Loading reviews…</p>
        ) : reviews.length === 0 ? (
          <p className="text-sm text-slate-500">No reviews yet. Be the first to review this product.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {reviews.map((r) => (
              <li key={r.id} className="py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Stars value={r.rating} />
                  <span className="text-sm font-semibold">{r.user_name}</span>
                  {r.verified && <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-800">Verified buyer</span>}
                  <span className="text-xs text-slate-400">{formatDate(r.created_at)}</span>
                </div>
                <p className="mt-1.5 whitespace-pre-line text-sm text-slate-700">{r.comment}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
