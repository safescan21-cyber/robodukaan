"use client";

import { useI18n } from "@/i18n/client";
import { formatDate } from "@/lib/format";
import type { RepairHistoryEntry, RepairStatus } from "@/lib/types";

// The normal path of a repair; "rejected" and "cancelled" end it early.
const STEPS: RepairStatus[] = ["new", "reviewing", "quoted", "approved", "in_repair", "repaired", "returned"];

export function RepairTimeline({ status, history }: { status: RepairStatus; history: RepairHistoryEntry[] }) {
  const { t } = useI18n();
  const when = (s: RepairStatus) => [...history].reverse().find((h) => h.status === s)?.at;
  if (status === "rejected" || status === "cancelled") {
    const at = when(status);
    return <p className="font-semibold text-red-600">{t(`repairStatus.${status}`)}{at ? ` · ${formatDate(at)}` : ""}</p>;
  }
  const current = STEPS.indexOf(status);
  return (
    <ol className="space-y-0">
      {STEPS.map((s, i) => {
        const done = i <= current;
        const at = when(s);
        return (
          <li key={s} className="relative flex gap-3 pb-4 last:pb-0">
            {i < STEPS.length - 1 && <span className={`absolute start-[9px] top-5 h-full w-0.5 ${i < current ? "bg-emerald-500" : "bg-slate-200"}`} aria-hidden="true" />}
            <span className={`relative z-10 mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${done ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"} ${i === current ? "ring-4 ring-emerald-100" : ""}`}>{done ? "✓" : i + 1}</span>
            <div className="text-sm">
              <p className={done ? "font-semibold text-slate-900" : "text-slate-400"}>{t(`repairStatus.${s}`)}</p>
              {done && at && <p className="text-xs text-slate-500">{formatDate(at)}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
