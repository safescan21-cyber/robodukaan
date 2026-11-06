"use client";

import Link from "@/i18n/client";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-browser";
import { useI18n } from "@/i18n/client";
import { RepairPhotos } from "@/components/RepairPhotos";
import { RepairStatusBadge } from "@/components/RepairStatusBadge";
import { formatDate, formatINR } from "@/lib/format";
import type { RepairRequest } from "@/lib/types";

export default function MyRepairsPage() {
  const { t } = useI18n();
  const [repairs, setRepairs] = useState<RepairRequest[] | null>(null);

  useEffect(() => {
    getSupabase().from("repair_requests").select("*").order("created_at", { ascending: false })
      .then(({ data }) => setRepairs((data as RepairRequest[]) ?? []));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-bold">{t("account.repairs")}</h1>
        <Link href="/pcb-repair" className="rounded-md bg-accent-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-600">+ {t("myRepairs.new")}</Link>
      </div>
      {repairs === null ? (
        <div className="h-40 animate-pulse rounded-md bg-slate-100" />
      ) : repairs.length === 0 ? (
        <p className="rounded-md bg-white p-6 text-sm text-slate-600 ring-1 ring-slate-200">
          {t("myRepairs.none")} <Link href="/pcb-repair" className="font-semibold text-brand-700 hover:underline">{t("myRepairs.sendPhotos")}</Link>
        </p>
      ) : (
        repairs.map((r) => (
          <article key={r.id} className="rounded-md bg-white p-5 ring-1 ring-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-mono font-bold">{r.request_number}</p>
                <p className="text-xs text-slate-500">Sent {formatDate(r.created_at)}</p>
              </div>
              <RepairStatusBadge status={r.status} />
            </div>
            <p className="mt-3 text-sm"><span className="font-semibold">{r.board_type}</span>{r.device ? ` – ${r.device}` : ""} × {r.quantity}</p>
            <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{r.problem}</p>
            <div className="mt-3"><RepairPhotos paths={r.photos} size="sm" /></div>
            {(r.quote_amount != null || r.admin_notes) && (
              <div className="mt-4 rounded-md bg-brand-50 p-4 text-sm ring-1 ring-brand-100">
                {r.quote_amount != null && <p>{t("myRepairs.quote")}: <span className="text-lg font-bold text-brand-700">{formatINR(r.quote_amount)}</span></p>}
                {r.admin_notes && <p className="mt-1 whitespace-pre-line"><span className="font-semibold">{t("myRepairs.fromTech")}:</span> {r.admin_notes}</p>}
                {r.status === "quoted" && <p className="mt-2 text-xs text-slate-600">{t("myRepairs.approveHint")}</p>}
              </div>
            )}
          </article>
        ))
      )}
    </div>
  );
}
