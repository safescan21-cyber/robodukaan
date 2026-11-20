import type { Metadata } from "next";
import Link from "@/i18n/client";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { getT } from "@/i18n/server";
import { PCB_LESSONS } from "@/lib/pcb-design";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://pcbdukaan.com";

export const metadata: Metadata = {
  title: "Learn PCB design – free study material",
  description: "Free PCB design study material: PCB basics, schematic, footprints, placement, trace width, creepage, grounding, SMPS layout, thermal design, Gerber files and KiCad.",
  alternates: { canonical: "/pcb-design" },
};

export default async function PcbDesignPage() {
  const { t } = await getT();
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <JsonLd data={{
        "@context": "https://schema.org", "@type": "ItemList", name: "Learn PCB design",
        itemListElement: PCB_LESSONS.map((l, i) => ({ "@type": "ListItem", position: i + 1, name: l.h1, url: `${SITE}/pcb-design/${l.slug}` })),
      }} />
      <Breadcrumbs items={[{ label: t("nav.pcbDesign") }]} />
      <h1 className="text-3xl font-extrabold">Learn PCB design – free study material</h1>
      <p className="mt-2 max-w-3xl text-slate-700">
        {PCB_LESSONS.length} short lessons, from what a PCB is to making Gerber files – written by people who repair industrial boards every day, so every lesson also shows what goes wrong in real machines.
        Read them in order, or jump to what you need.
      </p>
      <ol className="mt-6 grid gap-4 sm:grid-cols-2">
        {PCB_LESSONS.map((l, i) => (
          <li key={l.slug}>
            <Link href={`/pcb-design/${l.slug}`} className="group block h-full rounded-md bg-white p-5 ring-1 ring-slate-200 hover:ring-brand-600">
              <p className="text-xs font-semibold uppercase text-accent-700">Lesson {i + 1} · {l.level} · {l.minutes} min</p>
              <p className="mt-1 text-lg font-bold group-hover:text-brand-700">{l.h1}</p>
              <p className="mt-1 text-sm text-slate-600">{l.description}</p>
            </Link>
          </li>
        ))}
      </ol>
      <div className="mt-8 rounded-md bg-brand-50 p-5 ring-1 ring-brand-200">
        <p className="font-bold text-brand-900">Want hands-on training?</p>
        <p className="mt-1 text-sm text-brand-900">Our PCB repair course teaches component testing, soldering and fault finding on real industrial boards.</p>
        <p className="mt-2 text-sm"><Link href="/pcb-repair-course" className="font-semibold text-brand-700 underline">PCB repair course →</Link>
          {" · "}<Link href="/repair-guides" className="text-brand-700 hover:underline">{t("nav.repairGuides")}</Link>
          {" · "}<Link href="/fault-codes" className="text-brand-700 hover:underline">{t("nav.faultCodes")}</Link></p>
      </div>
    </div>
  );
}
