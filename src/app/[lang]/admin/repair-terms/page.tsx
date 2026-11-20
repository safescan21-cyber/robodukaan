"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-browser";
import { adminButton, adminField, revalidateCatalog } from "@/lib/admin";
import { mergeExtras, type RepairExtras } from "@/lib/repair-extras";

// Admin → Repair promises: repair time, evaluation charge, pickup and your Google reviews – shown on every
// repair page (and the Google review link in the "repaired & returned" and "delivered" emails).
export default function RepairTermsAdmin() {
  const [x, setX] = useState<RepairExtras | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await getSupabase().from("site_content").select("value").eq("key", "repair_terms").maybeSingle();
    if (error) setMsg({ ok: false, text: error.message });
    setX(mergeExtras((data?.value as Partial<RepairExtras>) ?? null));
  }, []);
  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load]);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const s = (k: string) => String(f.get(k) ?? "").trim();
    const raw = {
      turnaround: s("turnaround"), evaluation: s("evaluation"), evaluationCharge: s("evaluationCharge"),
      noFixNoFee: f.get("noFixNoFee") === "on", pickup: s("pickup"), urgent: s("urgent"),
      googleReviewUrl: s("googleReviewUrl"), googleRating: s("googleRating"), googleReviewCount: s("googleReviewCount"),
    } as Partial<RepairExtras>;
    const value = mergeExtras(raw);
    if (raw.googleReviewUrl && !value.googleReviewUrl) return setMsg({ ok: false, text: "The review link must be a Google link (g.page, maps.app.goo.gl or google.com)." });
    if (raw.googleRating && !value.googleRating) return setMsg({ ok: false, text: "Google rating must be like 4.8 (1 to 5)." });
    const { error } = await getSupabase().from("site_content").upsert({ key: "repair_terms", value, updated_at: new Date().toISOString() });
    if (error) return setMsg({ ok: false, text: error.message });
    revalidateCatalog();
    setMsg({ ok: true, text: "Saved – repair pages show it within a minute." });
    load();
  }

  if (!x) return <div className="h-64 animate-pulse rounded-md bg-slate-100" />;
  const text = (name: keyof RepairExtras, label: string, ph: string, help?: string) => (
    <label className="block text-sm font-medium">{label}
      <input name={name} defaultValue={String(x[name] ?? "")} placeholder={ph} maxLength={name === "googleReviewUrl" ? 300 : 160} className={adminField} />
      {help && <span className="mt-1 block text-xs font-normal text-slate-500">{help}</span>}
    </label>
  );
  return (
    <div className="max-w-3xl space-y-5">
      <h1 className="text-2xl font-bold">Repair promises & reviews</h1>
      <p className="text-sm text-slate-600">Competitors win customers with clear promises (“repair in 48 hours”, “no fix, no fee”, “pickup anywhere in India”) and their Google rating. Fill in only what you really offer – empty fields are not shown anywhere.</p>
      {msg && <p role="status" className={`rounded-md p-3 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{msg.text}</p>}
      <form onSubmit={save} className="space-y-4 rounded-md bg-white p-4 ring-1 ring-slate-200">
        <h2 className="font-semibold">Repair promises</h2>
        {text("turnaround", "Usual repair time", "3–7 working days for most boards", "Shown as “Repair time: …”.")}
        {text("urgent", "Urgent repair (optional)", "Urgent repair in 24–48 hours (extra charge)")}
        <label className="block text-sm font-medium">Evaluation at the workshop
          <select name="evaluation" defaultValue={x.evaluation} className={adminField}>
            <option value="">Don’t show</option>
            <option value="free">Free evaluation</option>
            <option value="charged">Evaluation is charged</option>
          </select>
        </label>
        {text("evaluationCharge", "Evaluation charge (if charged)", "₹500, adjusted in the repair bill")}
        <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" name="noFixNoFee" defaultChecked={x.noFixNoFee} /> No fix, no repair charge</label>
        {text("pickup", "Pickup / sending the board", "Courier pickup arranged anywhere in India")}

        <h2 className="pt-2 font-semibold">Google reviews</h2>
        {text("googleReviewUrl", "Google review link", "https://g.page/r/…/review", "Google Business Profile → “Ask for reviews” → copy the link. It is shown on repair pages and added to the “repaired & returned” and “order delivered” emails.")}
        <div className="grid gap-4 sm:grid-cols-2">
          {text("googleRating", "Your Google rating", "4.8", "Exactly as Google shows it – leave empty to show only the link.")}
          {text("googleReviewCount", "Number of Google reviews", "37")}
        </div>
        <button className={adminButton}>Save</button>
      </form>
    </div>
  );
}
