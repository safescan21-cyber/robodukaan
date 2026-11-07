import type { Metadata } from "next";
import Link from "@/i18n/client";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { RepairForm } from "@/components/RepairForm";
import { BOARD_TYPES } from "@/lib/constants";
import { REPAIR_SERVICES } from "@/lib/seo-content";
import { getT, alternatesFor } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: t("nav.pcbRepairService"),
    description: t("repairPage.metaDescription"),
    alternates: await alternatesFor("/pcb-repair"),
  };
}

const STEPS = [
  ["📷", "repairPage.s1", "repairPage.s1t"],
  ["💬", "repairPage.s2", "repairPage.s2t"],
  ["📦", "repairPage.s3", "repairPage.s3t"],
  ["✅", "repairPage.s4", "repairPage.s4t"],
];

export default async function PcbRepairPage() {
  const { t } = await getT();
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Breadcrumbs items={[{ label: t("nav.pcbRepair") }]} />
      <section className="overflow-hidden rounded-md bg-gradient-to-r from-slate-900 via-brand-900 to-brand-700 p-6 text-white sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent-400">{t("nav.pcbRepairService")}</p>
        <h1 className="mt-2 max-w-2xl text-3xl font-extrabold leading-tight sm:text-4xl">{t("repairPage.h1")}</h1>
        <p className="mt-3 max-w-2xl text-brand-100">{t("repairPage.intro")}</p>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map(([icon, title, text], i) => (
          <div key={title} className="rounded-md bg-white p-5 ring-1 ring-slate-200">
            <p className="text-3xl" aria-hidden="true">{icon}</p>
            <p className="mt-2 text-xs font-bold uppercase text-accent-600">{t("repairPage.step", { n: i + 1 })}</p>
            <p className="font-bold">{t(title)}</p>
            <p className="mt-1 text-sm text-slate-600">{t(text)}</p>
          </div>
        ))}
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <section id="repair-form" className="scroll-mt-24">
          <h2 className="mb-4 text-xl font-bold">{t("repairPage.sendTitle")}</h2>
          <RepairForm />
        </section>
        <aside className="space-y-5">
          <div className="rounded-md bg-white p-5 ring-1 ring-slate-200">
            <h3 className="text-sm font-bold uppercase tracking-wide">{t("repairPage.boardsTitle")}</h3>
            <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
              {BOARD_TYPES.filter((b) => b !== "Other").map((b, i) => <li key={b}>✓ {t(`board.${i}`)}</li>)}
            </ul>
            <Link href="/locations" className="mt-3 inline-block text-sm font-semibold text-brand-700 hover:underline">{t("repairPage.everyState")} <span className="inline-block rtl:-scale-x-100">→</span></Link>
          </div>
          <div className="rounded-md bg-white p-5 ring-1 ring-slate-200">
            <h3 className="text-sm font-bold uppercase tracking-wide">🔧 Repair services</h3>
            <ul className="mt-3 space-y-1.5 text-sm">
              {REPAIR_SERVICES.map((r) => <li key={r.slug}><Link href={`/pcb-repair/${r.slug}`} className="text-brand-700 hover:underline">{r.name}</Link></li>)}
              <li><Link href="/fault-codes" className="text-brand-700 hover:underline">⚠️ {t("nav.faultCodes")}</Link></li>
            </ul>
          </div>
          <div className="rounded-md bg-accent-50 p-5 text-sm ring-1 ring-accent-400/30">
            <h3 className="font-bold">{t("repairPage.tipsTitle")}</h3>
            <ul className="mt-2 list-disc space-y-1 ps-5 text-slate-700">
              <li>{t("repairPage.tip1")}</li>
              <li>{t("repairPage.tip2")}</li>
              <li>{t("repairPage.tip3")}</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
