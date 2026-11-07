import Link from "@/i18n/client";
import { getT } from "@/i18n/server";
import { REPAIR_TERMS } from "@/lib/constants";
import { formatINR } from "@/lib/format";
import { REPAIR_SERVICES, type RepairService } from "@/lib/seo-content";

// The repair promise (free check, approval, test video, warranty) – set in REPAIR_TERMS.
export async function RepairPromise({ className = "" }: { className?: string }) {
  const { t } = await getT();
  const items = [
    ["🔍", t("repairTerms.freeCheck")],
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
    </section>
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
