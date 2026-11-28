import type { Metadata } from "next";
import Link from "@/i18n/client";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { RepairCta } from "@/components/LocationBlocks";
import { getT } from "@/i18n/server";
import { DRIVE_BRANDS, codeSlug, faultSearchItems } from "@/lib/fault-codes";
import { FaultSearch } from "@/components/FaultSearch";
import { CategoryIcon } from "@/components/CategoryIcon";

export const metadata: Metadata = {
  title: "VFD, servo & PLC error codes – meaning & fix",
  description: "What VFD, servo and PLC error codes mean – oc, ov, Lv, GF, AL-014, F30001, SF/BF LED, 6105 – with causes and fixes for Delta, Siemens, Mitsubishi, Yaskawa, ABB and more.",
  alternates: { canonical: "/fault-codes" },
};

export default async function FaultCodesPage() {
  const { t } = await getT();
  const total = DRIVE_BRANDS.reduce((n, b) => n + b.codes.length, 0);
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Breadcrumbs items={[{ label: t("nav.faultCodes") }]} />
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-brand-800 px-5 py-8 text-white sm:px-10 sm:py-10">
        <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full bg-accent-500/20 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-16 left-1/3 h-56 w-56 rounded-full bg-brand-500/30 blur-3xl" />
        <p className="relative text-xs font-semibold uppercase tracking-widest text-accent-400">{total} codes · {DRIVE_BRANDS.length} brands · free</p>
        <h1 className="relative mt-2 text-3xl font-extrabold sm:text-4xl">{t("fault.title")}</h1>
        <p className="relative mt-2 max-w-2xl text-slate-300">{t("fault.intro")}</p>
        <div className="relative mt-6 max-w-2xl"><FaultSearch items={faultSearchItems()} /></div>
        <p className="relative mt-4 flex flex-wrap gap-2 text-xs">
          {["oc", "ov", "Lv", "GFF", "AL-014", "E.OC1", "F0001", "SF LED"].map((x) => (
            <Link key={x} href={`/fault-codes?q=${encodeURIComponent(x)}`} className="rounded-full bg-white/10 px-3 py-1 font-mono ring-1 ring-white/20 hover:bg-white/20">{x}</Link>
          ))}
        </p>
      </section>
      {(["vfd", "servo", "plc"] as const).map((kind) => {
        const brands = DRIVE_BRANDS.filter((b) => (b.kind ?? "vfd") === kind);
        const style = { vfd: ["motor", "bg-brand-50 text-brand-700"], servo: ["drone", "bg-violet-50 text-violet-700"], plc: ["chip", "bg-emerald-50 text-emerald-700"] }[kind];
        return (
          <section key={kind} className="mt-10">
            <div className="flex items-center gap-3">
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${style[1]}`}><CategoryIcon name={style[0]} className="h-6 w-6" /></span>
              <h2 className="text-xl font-bold">{kind === "vfd" ? "VFD / inverter (AC drive) error codes" : kind === "servo" ? "Servo drive alarm codes" : "PLC error codes & status LED faults"}</h2>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {brands.map((b) => (
                <Link key={b.slug} href={`/fault-codes/${b.slug}`} className="group flex flex-col rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md hover:ring-brand-500">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-lg font-bold group-hover:text-brand-700">{b.brand}</p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${style[1]}`}>{b.codes.length} codes</span>
                  </div>
                  <p className="mt-0.5 text-sm text-slate-500">{b.series}</p>
                  <p className="mt-3 flex flex-wrap gap-1.5">
                    {b.codes.slice(0, 5).map((c) => <span key={c.code} className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-700">{c.code.split(" / ")[0]}</span>)}
                  </p>
                  <span className="mt-auto pt-3 text-sm font-semibold text-brand-700 opacity-0 transition group-hover:opacity-100">See all codes <span className="inline-block rtl:-scale-x-100">→</span></span>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
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
