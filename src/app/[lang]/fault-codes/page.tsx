import type { Metadata } from "next";
import Link from "@/i18n/client";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { RepairCta } from "@/components/LocationBlocks";
import { getT } from "@/i18n/server";
import { DRIVE_BRANDS } from "@/lib/fault-codes";

export const metadata: Metadata = {
  title: "VFD fault codes – meaning, causes & fixes (Delta, Yaskawa, Siemens, ABB…)",
  description: "What VFD error codes like oc, ov, Lv, GF, E.OC1, F0001 mean, their common causes and what to check – for Delta, Yaskawa, Mitsubishi, Siemens, ABB, Schneider and Danfoss drives.",
  alternates: { canonical: "/fault-codes" },
};

export default async function FaultCodesPage() {
  const { t } = await getT();
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Breadcrumbs items={[{ label: t("nav.faultCodes") }]} />
      <h1 className="text-3xl font-extrabold">{t("fault.title")}</h1>
      <p className="mt-2 max-w-3xl text-slate-700">{t("fault.intro")}</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DRIVE_BRANDS.map((b) => (
          <Link key={b.slug} href={`/fault-codes/${b.slug}`} className="group rounded-md bg-white p-5 ring-1 ring-slate-200 hover:ring-brand-600">
            <p className="text-lg font-bold group-hover:text-brand-700">{b.brand}</p>
            <p className="text-sm text-slate-500">{b.series}</p>
            <p className="mt-2 font-mono text-xs text-slate-600">{b.codes.slice(0, 5).map((c) => c.code.split(" ")[0]).join(" · ")} …</p>
          </Link>
        ))}
      </div>
      <p className="mt-6 rounded bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">⚠️ {t("fault.note")}</p>
      <div className="mt-8"><RepairCta place="your factory" /></div>
    </div>
  );
}
