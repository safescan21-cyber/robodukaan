import type { Metadata } from "next";
import Link from "@/i18n/client";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { ELECTRICAL_FAULTS, ELECTRICAL_SAFETY } from "@/lib/electrical-faults";
import { CategoryIcon } from "@/components/CategoryIcon";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://pcbdukaan.com";

export const metadata: Metadata = {
  title: "Electrical & wiring faults – causes and fixes",
  description: "Factory electrical and wiring faults explained: MCB and RCCB tripping, loose connections, earthing, neutral failure, single phasing, motor overheating, 24 V panel faults.",
  alternates: { canonical: "/electrical-faults" },
};

const GROUPS = ["Supply & protection", "Motors", "Control panels"] as const;
const GROUP_STYLE: Record<(typeof GROUPS)[number], [string, string]> = {
  "Supply & protection": ["power", "bg-amber-50 text-amber-600"],
  Motors: ["motor", "bg-brand-50 text-brand-700"],
  "Control panels": ["chip", "bg-emerald-50 text-emerald-700"],
};

export default function ElectricalFaultsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <JsonLd data={{
        "@context": "https://schema.org", "@type": "ItemList", name: "Electrical & wiring faults",
        itemListElement: ELECTRICAL_FAULTS.map((f, i) => ({ "@type": "ListItem", position: i + 1, name: f.h1, url: `${SITE}/electrical-faults/${f.slug}` })),
      }} />
      <Breadcrumbs items={[{ label: "Electrical faults" }]} />
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-amber-700 px-5 py-8 text-white sm:px-10">
        <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full bg-amber-400/20 blur-3xl" />
        <p className="relative text-xs font-semibold uppercase tracking-widest text-amber-300">{ELECTRICAL_FAULTS.length} practical guides</p>
        <h1 className="relative mt-2 text-3xl font-extrabold sm:text-4xl">Electrical & wiring faults – causes and fixes</h1>
      </section>
      <p className="mt-4 max-w-3xl text-slate-700">The faults maintenance teams meet every day in factories and control panels – what you see, why it happens and what to check, in order. For drive, servo and PLC error codes see <Link href="/fault-codes" className="font-semibold text-brand-700 hover:underline">error codes</Link>.</p>
      <p className="mt-4 rounded bg-red-50 p-3 text-sm text-red-900 ring-1 ring-red-200">⚠️ {ELECTRICAL_SAFETY}</p>
      {GROUPS.map((g) => (
        <section key={g} className="mt-6">
          <div className="flex items-center gap-3">
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${GROUP_STYLE[g][1]}`}><CategoryIcon name={GROUP_STYLE[g][0]} className="h-6 w-6" /></span>
            <h2 className="text-xl font-bold">{g}</h2>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {ELECTRICAL_FAULTS.filter((f) => f.group === g).map((f) => (
              <Link key={f.slug} href={`/electrical-faults/${f.slug}`} className="group rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md hover:ring-brand-500">
                <p className="font-bold group-hover:text-brand-700">{f.h1}</p>
                <p className="mt-1 text-sm text-slate-600">{f.description}</p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
