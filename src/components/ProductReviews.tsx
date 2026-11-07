"use client";

import Link from "@/i18n/client";
import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-browser";
import { postAsUser } from "@/lib/api-client";
import type { Review } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { useAuth } from "./AuthProvider";
import { Stars } from "./Stars";
import { useI18n } from "@/i18n/client";

export function ProductReviews({ productId, slug }: { productId: string; slug: string }) {
  const { user, isAdmin } = useAuth();
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const { t } = useI18n();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [myVotes, setMyVotes] = useState<Record<string, number>>({});
  const [voteError, setVoteError] = useState<{ id: string; text: string } | null>(null);

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

  // Which reviews this customer already liked (1) or disliked (-1).
  useEffect(() => {
    if (!user || !reviews?.length) return;
    getSupabase().from("review_votes").select("review_id, vote").in("review_id", reviews.map((r) => r.id))
      .then(({ data }) => setMyVotes(Object.fromEntries((data ?? []).map((v) => [v.review_id as string, v.vote as number]))));
  }, [user, reviews]);

  async function vote(r: Review, value: 1 | -1) {
    setVoteError(null);
    const next = myVotes[r.id] === value ? 0 : value; // clicking the same button again removes the vote
    const { data, error } = await getSupabase().rpc("vote_review", { p_review: r.id, p_vote: next });
    if (error) {
      setVoteError({ id: r.id, text: error.message.includes("vote_review") ? t("common.error") : error.message });
      return;
    }
    setMyVotes((m) => ({ ...m, [r.id]: next }));
    setReviews((list) => list?.map((x) => (x.id === r.id ? { ...x, likes: data.likes, dislikes: data.dislikes } : x)) ?? null);
  }

  // Admin tools on the product page: reply and hide.
  async function saveReply(r: Review, reply: string) {
    const { error } = await getSupabase().from("reviews").update({ admin_reply: reply.trim() || null }).eq("id", r.id);
    if (error) alert(error.message);
    else load();
  }
  async function hide(r: Review) {
    if (!confirm("Hide this review from the shop?")) return;
    const { error } = await getSupabase().from("reviews").update({ is_hidden: true }).eq("id", r.id);
    if (error) alert(error.message);
    else { load(); postAsUser("/api/revalidate"); }
  }

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
      setMessage(t("reviews.saved"));
      load();
      postAsUser("/api/revalidate", { reason: "review" }); // update the review count and stars on the page
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
        <p className="mt-1 text-sm text-slate-500">{t(count === 1 ? "reviews.countOne" : "reviews.count", { count })}</p>
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
            <p className="font-semibold">{mine ? t("reviews.edit") : t("reviews.write")}</p>
            <div className="mt-2 flex gap-1" role="radiogroup" aria-label={t("reviews.yourRating")}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  type="button"
                  key={n}
                  role="radio"
                  aria-checked={rating === n}
                  aria-label={t("reviews.stars", { n })}
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
              placeholder={t("reviews.placeholder")}
              className="mt-2 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-600"
            />
            <div className="mt-2 flex items-center gap-3">
              <button disabled={busy} className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
                {busy ? t("common.saving") : mine ? t("reviews.update") : t("reviews.submit")}
              </button>
              {message && <p className="text-sm text-slate-600" role="status">{message}</p>}
            </div>
          </form>
        ) : (
          <p className="rounded-md bg-slate-50 p-4 text-sm ring-1 ring-slate-200">
            <Link href={`/login?next=/products/${slug}`} className="font-semibold text-brand-700 hover:underline">{t("auth.login")}</Link> · {t("reviews.loginToWrite")}
          </p>
        )}

        {reviews === null ? (
          <p className="text-sm text-slate-500">{t("common.loading")}</p>
        ) : reviews.length === 0 ? (
          <p className="text-sm text-slate-500">{t("reviews.none")}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {reviews.map((r) => (
              <li key={r.id} className="py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Stars value={r.rating} />
                  <span className="text-sm font-semibold">{r.user_name}</span>
                  {r.verified && <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-800">{t("reviews.verified")}</span>}
                  <span className="text-xs text-slate-400">{formatDate(r.created_at)}</span>
                </div>
                <p className="mt-1.5 whitespace-pre-line text-sm text-slate-700">{r.comment}</p>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-slate-500">{t("reviews.helpful")}</span>
                  {([[1, "👍", r.likes ?? 0, "reviews.like"], [-1, "👎", r.dislikes ?? 0, "reviews.dislike"]] as const).map(([value, icon, n, label]) => {
                    const own = r.user_id === user?.id;
                    const active = myVotes[r.id] === value;
                    const cls = `inline-flex items-center gap-1 rounded-full px-2.5 py-1 ring-1 ${active ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-slate-700 ring-slate-300 hover:ring-brand-600"}`;
                    return user && !own ? (
                      <button key={value} type="button" onClick={() => vote(r, value)} aria-pressed={active} aria-label={`${t(label)} (${n})`} className={cls}>
                        <span aria-hidden="true">{icon}</span>{n}
                      </button>
                    ) : user ? (
                      <span key={value} className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-slate-500 ring-1 ring-slate-200" aria-label={`${t(label)} (${n})`}><span aria-hidden="true">{icon}</span>{n}</span>
                    ) : (
                      <Link key={value} href={`/login?next=/products/${slug}`} className={cls} aria-label={`${t("reviews.loginToVote")} – ${t(label)} (${n})`}><span aria-hidden="true">{icon}</span>{n}</Link>
                    );
                  })}
                  {voteError?.id === r.id && <span className="text-red-600" role="alert">{voteError.text}</span>}
                </div>

                {r.admin_reply && (
                  <div className="mt-3 rounded-md border-s-4 border-brand-600 bg-brand-50 px-3 py-2 text-sm">
                    <p className="text-xs font-bold text-brand-800">{t("reviews.reply")}{r.admin_reply_at ? ` · ${formatDate(r.admin_reply_at)}` : ""}</p>
                    <p className="mt-0.5 whitespace-pre-line text-slate-700">{r.admin_reply}</p>
                  </div>
                )}

                {isAdmin && <AdminReviewTools review={r} onReply={saveReply} onHide={hide} />}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// Admin only: reply (shown under the review as "Reply from PCBDukaan") and hide.
function AdminReviewTools({ review, onReply, onHide }: { review: Review; onReply: (r: Review, text: string) => Promise<void>; onHide: (r: Review) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(review.admin_reply ?? "");
  const [saving, setSaving] = useState(false);
  return (
    <div className="mt-2 text-xs">
      {!open ? (
        <div className="flex gap-3">
          <button type="button" onClick={() => setOpen(true)} className="font-semibold text-brand-700 hover:underline">{review.admin_reply ? "Edit reply" : "Reply"}</button>
          <button type="button" onClick={() => onHide(review)} className="font-semibold text-red-600 hover:underline">Hide review</button>
          <span className="text-slate-400">(admin only)</span>
        </div>
      ) : (
        <form onSubmit={async (e) => { e.preventDefault(); setSaving(true); await onReply(review, text); setSaving(false); setOpen(false); }} className="space-y-2">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={1500} placeholder="Reply as PCBDukaan (leave empty to remove the reply)"
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600" />
          <div className="flex gap-2">
            <button disabled={saving} className="rounded bg-brand-600 px-3 py-1.5 font-semibold text-white disabled:opacity-60">{saving ? "Saving…" : "Save reply"}</button>
            <button type="button" onClick={() => setOpen(false)} className="rounded px-3 py-1.5 font-semibold ring-1 ring-slate-300">Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}
