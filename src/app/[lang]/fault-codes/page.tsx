import type { Metadata } from "next";
import Link from "@/i18n/client";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { RepairCta } from "@/components/LocationBlocks";
import { getT } from "@/i18n/server";
import { DRIVE_BRANDS, codeSlug } from "@/lib/fault-codes";

export const metadata: Metadata = {
  title: "Inverter, VFD & servo error codes – meaning & fix",
  description: "What inverter/VFD and servo error codes like oc, ov, Lv, GF, AL-014, E.OC1, F0001 mean, causes and fixes – Delta, Yaskawa, Mitsubishi, Siemens, ABB, Danfoss, INVT and more.",
  alternates: { canonical: "/fault-codes" },
};

export default async function FaultCodesPage() {
  const { t } = await getT();
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Breadcrumbs items={[{ label: t("nav.faultCodes") }]} />
      <h1 className="text-3xl font-extrabold">{t("fault.title")}</h1>
      <p className="mt-2 max-w-3xl text-slate-700">{t("fault.intro")}</p>
      {(["vfd", "servo"] as const).map((kind) => (
      <section key={kind} className="mt-6">
      <h2 className="text-xl font-bold">{kind === "vfd" ? "VFD / inverter (AC drive) error codes" : "Servo drive alarm codes"}</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DRIVE_BRANDS.filter((b) => (b.kind ?? "vfd") === kind).map((b) => (
          <Link key={b.slug} href={`/fault-codes/${b.slug}`} className="group rounded-md bg-white p-5 ring-1 ring-slate-200 hover:ring-brand-600">
            <p className="text-lg font-bold group-hover:text-brand-700">{b.brand}</p>
            <p className="text-sm text-slate-500">{b.series}</p>
            <p className="mt-2 font-mono text-xs text-slate-600">{b.codes.slice(0, 5).map((c) => c.code.split(" ")[0]).join(" · ")} …</p>
          </Link>
        ))}
      </div>
      </section>
      ))}
      <section className="mt-8">
        <h2 className="text-xl font-bold">Earth (ground) fault code on each brand</h2>
        <p className="mt-1 text-sm text-slate-600">The same fault has a different code on every brand – find yours:</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[420px] bg-white text-sm ring-1 ring-slate-200">
            <thead className="bg-slate-50 text-left"><tr><th className="px-3 py-2">Brand</th><th className="px-3 py-2">Code</th><th className="px-3 py-2">Also shown as</th></tr></thead>
            <tbody>
              {DRIVE_BRANDS.flatMap((b) => b.codes.filter((c) => /earth|ground/i.test(c.name) && !/inverter unit/i.test(c.name)).slice(0, 1).map((c) => (
                <tr key={b.slug} className="border-t border-slate-100">
                  <td className="px-3 py-2">{b.brand}</td>
                  <td className="px-3 py-2"><Link href={`/fault-codes/${b.slug}/${codeSlug(c)}`} className="font-mono text-brand-700 hover:underline">{c.code}</Link></td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-500">{c.aliases?.join(", ")}</td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </section>
      <p className="mt-6 rounded bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">⚠️ {t("fault.note")}</p>
      <div className="mt-8"><RepairCta place="your factory" /></div>
    </div>
  );
}
