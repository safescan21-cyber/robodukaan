import Link from "@/i18n/client";
import { getT } from "@/i18n/server";
import { REPAIR_TERMS } from "@/lib/constants";
import { formatINR } from "@/lib/format";
import { REPAIR_SERVICES, type RepairService } from "@/lib/seo-content";
import { getRepairExtras } from "@/lib/data";

// The repair promise (free check, approval, test video, warranty) – set in REPAIR_TERMS.
export async function RepairPromise({ className = "" }: { className?: string }) {
  const [{ t }, x] = await Promise.all([getT(), getRepairExtras()]);
  const items = [
    ["🔍", t("repairTerms.freeCheck")],
    ...(x.evaluation === "free" ? [["🆓", "Free evaluation of the board at our workshop"]] : []),
    ...(x.evaluation === "charged" && x.evaluationCharge ? [["🧾", `Evaluation charge: ${x.evaluationCharge}`]] : []),
    ...(x.noFixNoFee ? [["✅", "No fix, no repair charge"]] : []),
    ...(x.turnaround ? [["⏱️", `Repair time: ${x.turnaround}`]] : []),
    ...(x.urgent ? [["🚨", x.urgent]] : []),
    ...(x.pickup ? [["🚚", x.pickup]] : []),
    ["✋", t("repairTerms.approval")],
    ["⚡", t("repairTerms.tested")],
    ...(REPAIR_TERMS.testVideo ? [["🎥", t("repairTerms.video")]] : []),
    ...(REPAIR_TERMS.warrantyMonths > 0 ? [["🛡️", t("repairTerms.warranty", { n: REPAIR_TERMS.warrantyMonths })]] : []),
  ];
  return (
    <section className={`rounded-md bg-emerald-50 p-5 ring-1 ring-emerald-200 ${className}`}>
      <h2 className="text-lg font-bold text-emerald-900">{t("repairTerms.title")}</h2>
      <ul className="mt-3 grid gap-2 text-sm text-emerald-900">
        {items.map(([icon, text]) => <li key={text} className="flex gap-2"><span aria-hidden="true">{icon}</span>{text}</li>)}
      </ul>
      <GoogleReviews x={x} className="mt-4" />
    </section>
  );
}

// Your real Google rating (entered in Admin → Repair promises) with a link to read and write reviews.
export function GoogleReviews({ x, className = "" }: { x: import("@/lib/repair-extras").RepairExtras; className?: string }) {
  if (!x.googleReviewUrl) return null;
  return (
    <a href={x.googleReviewUrl} target="_blank" rel="noopener" className={`flex flex-wrap items-center gap-2 rounded-md bg-white px-3 py-2 text-sm ring-1 ring-emerald-200 hover:ring-emerald-500 ${className}`}>
      {x.googleRating ? <><span className="text-amber-500" aria-hidden="true">★★★★★</span><b>{x.googleRating}/5</b></> : <span aria-hidden="true">⭐</span>}
      <span>{x.googleReviewCount ? `${x.googleReviewCount} Google reviews` : "Google reviews"}</span>
      <span className="font-semibold text-brand-700">Read or write a review →</span>
    </a>
  );
}

export function priceText(p: { from: number; to?: number }, t: (k: string, v?: Record<string, string | number>) => string) {
  return p.to ? `${formatINR(p.from)} – ${formatINR(p.to)}` : t("repairTerms.from", { price: formatINR(p.from) });
}

// Price table for one service, or a summary of all services.
export async function RepairPrices({ service }: { service?: RepairService }) {
  const { t } = await getT();
  const rows = service
    ? (service.prices ?? []).map((p) => ({ item: p.item, price: priceText(p, t) }))
    : REPAIR_SERVICES.map((s) => {
        const p = s.prices;
        if (!p?.length) return { item: s.name, price: t("repairTerms.onQuote"), slug: s.slug };
        const low = Math.min(...p.map((x) => x.from));
        const high = p.every((x) => x.to) ? Math.max(...p.map((x) => x.to!)) : undefined;
        return { item: s.name, price: priceText({ from: low, to: high }, t), slug: s.slug };
      });
  if (!rows.length) return null;
  return (
    <section className="rounded-md bg-white p-5 ring-1 ring-slate-200">
      <h2 className="text-lg font-bold">{t("repairTerms.pricesTitle")}</h2>
      <table className="mt-3 w-full text-sm">
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => (
            <tr key={r.item}>
              <td className="py-2 pe-3">{"slug" in r && r.slug ? <Link href={`/pcb-repair/${r.slug}`} className="text-brand-700 hover:underline">{r.item}</Link> : r.item}</td>
              <td className="py-2 text-end font-semibold whitespace-nowrap">{r.price}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-slate-500">{t("repairTerms.pricesNote")}</p>
    </section>
  );
}
