"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getSupabase } from "@/lib/supabase-browser";
import { postAsUser } from "@/lib/api-client";
import { adminButton, adminField } from "@/lib/admin";
import { REPAIR_STATUSES, REPAIR_STATUS_LABEL } from "@/lib/constants";
import { RepairPhotos } from "@/components/RepairPhotos";
import { RepairStatusBadge } from "@/components/RepairStatusBadge";
import { formatDate, formatINR } from "@/lib/format";
import type { RepairRequest } from "@/lib/types";

function AdminRepair() {
  const { id } = useParams<{ id: string }>();
  const [r, setR] = useState<RepairRequest | null | undefined>(undefined);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data } = await getSupabase().from("repair_requests").select("*").eq("id", id).maybeSingle();
    setR((data as RepairRequest) ?? null);
  }, [id]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount
    load();
  }, [load]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!r) return;
    const f = new FormData(e.currentTarget);
    const quote = String(f.get("quote_amount")).trim();
    setSaving(true);
    setMsg(null);
    const { error } = await getSupabase().from("repair_requests").update({
      status: String(f.get("status")),
      quote_amount: quote === "" ? null : Number(quote),
      admin_notes: String(f.get("admin_notes")).trim() || null,
    }).eq("id", r.id);
    if (error) {
      setSaving(false);
      return setMsg({ ok: false, text: error.message });
    }
    let text = "Saved.";
    if (f.get("notify") === "on") {
      const sent = await postAsUser("/api/email/repair", { requestId: r.id, kind: "update" });
      text = sent ? "Saved and emailed the customer." : "Saved, but the email couldn't be sent (is the mailbox connected?).";
    }
    setSaving(false);
    setMsg({ ok: true, text });
    load();
  }

  if (r === undefined) return <div className="h-96 animate-pulse rounded-md bg-slate-100" />;
  if (r === null) return <p>Request not found. <Link href="/admin/repairs" className="text-brand-700 underline">Back</Link></p>;

  const wa = encodeURIComponent(`Hello ${r.name}, this is PCBDukaan about your PCB repair request ${r.request_number}.`);

  return (
    <div className="space-y-5">
      <Link href="/admin/repairs" className="text-sm font-semibold text-brand-700 hover:underline">← Repair requests</Link>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-white p-5 ring-1 ring-slate-200">
        <div>
          <p className="text-sm text-slate-500">PCB repair request</p>
          <h1 className="font-mono text-xl font-bold">{r.request_number}</h1>
          {(r.urgent || r.wants_exchange) && (
            <p className="mt-1 text-sm font-semibold text-red-700">
              {r.urgent && "🚨 Machine stopped – customer needs this urgently. "}
              {r.wants_exchange && "🔁 Customer wants an exchange board if you have one."}
            </p>
          )}
          <p className="text-sm text-slate-500">Received {formatDate(r.created_at)}</p>
        </div>
        <RepairStatusBadge status={r.status} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <section className="rounded-md bg-white p-5 ring-1 ring-slate-200">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide">Board &amp; problem</h2>
            <p><span className="font-semibold">{r.board_type}</span>{r.device ? ` – ${r.device}` : ""} · Qty {r.quantity}</p>
            <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{r.problem}</p>
          </section>
          <section className="rounded-md bg-white p-5 ring-1 ring-slate-200">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide">Photos ({r.photos.length}) — click to open full size</h2>
            <RepairPhotos paths={r.photos} />
          </section>
          <form key={r.updated_at} onSubmit={onSubmit} className="space-y-4 rounded-md bg-white p-5 ring-1 ring-slate-200">
            <h2 className="text-sm font-bold uppercase tracking-wide">Update for the customer</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium">Status
                <select name="status" defaultValue={r.status} className={adminField}>
                  {REPAIR_STATUSES.map((s) => <option key={s} value={s}>{REPAIR_STATUS_LABEL[s]}</option>)}
                </select>
              </label>
              <label className="text-sm font-medium">Repair quote (₹)
                <input name="quote_amount" type="number" min={0} step="1" defaultValue={r.quote_amount ?? ""} placeholder="e.g. 1200" className={adminField} />
              </label>
              <label className="text-sm font-medium sm:col-span-2">Message to the customer
                <textarea name="admin_notes" rows={4} defaultValue={r.admin_notes ?? ""} placeholder="e.g. Two MOSFETs and the driver IC are damaged. Repair takes 3 days after we receive the board. Courier it to: …" className={adminField} />
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="notify" defaultChecked className="h-4 w-4 accent-brand-600" />Email this update to the customer</label>
            <div className="flex flex-wrap items-center gap-3">
              <button disabled={saving} className={adminButton}>{saving ? "Saving…" : "Save update"}</button>
              {msg && <p className={`text-sm ${msg.ok ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</p>}
            </div>
          </form>
        </div>
        <aside className="space-y-5">
          <section className="rounded-md bg-white p-5 text-sm ring-1 ring-slate-200">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide">Customer</h2>
            <p className="font-semibold">{r.name}</p>
            <p className="text-slate-600">📞 {r.phone}</p>
            {r.email && <p className="text-slate-600">✉️ <a href={`mailto:${r.email}`} className="hover:underline">{r.email}</a></p>}
            <div className="mt-3 flex flex-wrap gap-2">
              <a href={`https://wa.me/91${r.phone.replace(/\D/g, "").slice(-10)}?text=${wa}`} target="_blank" rel="noopener noreferrer" className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">WhatsApp</a>
              <a href={`tel:+91${r.phone.replace(/\D/g, "").slice(-10)}`} className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700">Call</a>
            </div>
          </section>
          {r.quote_amount != null && (
            <section className="rounded-md bg-brand-50 p-5 text-sm ring-1 ring-brand-100">
              <p className="text-slate-600">Current quote</p>
              <p className="text-2xl font-bold text-brand-700">{formatINR(r.quote_amount)}</p>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-md bg-slate-100" />}>
      <AdminRepair />
    </Suspense>
  );
}
