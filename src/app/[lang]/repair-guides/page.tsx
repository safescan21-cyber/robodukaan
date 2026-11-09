import type { Metadata } from "next";
import Link from "@/i18n/client";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { REPAIR_GUIDES } from "@/lib/repair-guides";
import { getT } from "@/i18n/server";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://pcbdukaan.com";

export const metadata: Metadata = {
  title: "Industrial PCB repair guides",
  description: "Free step-by-step guides: SMPS not working, VFD overcurrent faults, testing IGBTs, PLC and HMI problems, weighing indicators, UPS charging and servo encoder errors.",
  alternates: { canonical: "/repair-guides" },
};

export default async function RepairGuidesPage() {
  const { t } = await getT();
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <JsonLd data={{
        "@context": "https://schema.org", "@type": "ItemList", name: "Industrial PCB repair guides",
        itemListElement: REPAIR_GUIDES.map((g, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}/repair-guides/${g.slug}`, name: g.title })),
      }} />
      <Breadcrumbs items={[{ label: t("nav.pcbRepair"), href: "/pcb-repair" }, { label: t("nav.repairGuides") }]} />
      <h1 className="text-3xl font-extrabold">Industrial PCB repair guides</h1>
      <p className="mt-2 max-w-3xl text-slate-700">
        Practical checks for the most common faults in factories – what usually fails, what you can check safely yourself,
        and when it is time to send the board for repair.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {REPAIR_GUIDES.map((g) => (
          <Link key={g.slug} href={`/repair-guides/${g.slug}`} className="rounded-md bg-white p-5 ring-1 ring-slate-200 hover:ring-brand-600">
            <p className="text-xs font-semibold uppercase text-accent-700">{g.board} · {g.minutes} min</p>
            <h2 className="mt-1 font-bold">{g.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{g.summary}</p>
          </Link>
        ))}
      </div>
      <div className="mt-8 rounded-md bg-gradient-to-r from-slate-900 to-brand-800 p-5 text-white">
        <p className="font-bold">Can&apos;t find the fault?</p>
        <p className="mt-1 text-sm text-brand-100">Send photos of the board – free repair quote, no work without your approval.</p>
        <Link href="/pcb-repair#repair-form" className="mt-3 inline-block rounded-md bg-accent-500 px-4 py-2 text-sm font-bold text-white hover:bg-accent-600">{t("loc.getQuote")}</Link>
      </div>
    </div>
  );
}
