import type { Metadata } from "next";
import Link from "@/i18n/client";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { ELECTRICAL_FAULTS, ELECTRICAL_SAFETY } from "@/lib/electrical-faults";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://pcbdukaan.com";

export const metadata: Metadata = {
  title: "Electrical & wiring faults – causes and fixes",
  description: "Factory electrical and wiring faults explained: MCB and RCCB tripping, loose connections, earthing, neutral failure, single phasing, motor overheating, 24 V panel faults.",
  alternates: { canonical: "/electrical-faults" },
};

const GROUPS = ["Supply & protection", "Motors", "Control panels"] as const;

export default function ElectricalFaultsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <JsonLd data={{
        "@context": "https://schema.org", "@type": "ItemList", name: "Electrical & wiring faults",
        itemListElement: ELECTRICAL_FAULTS.map((f, i) => ({ "@type": "ListItem", position: i + 1, name: f.h1, url: `${SITE}/electrical-faults/${f.slug}` })),
      }} />
      <Breadcrumbs items={[{ label: "Electrical faults" }]} />
      <h1 className="text-3xl font-extrabold">Electrical & wiring faults – causes and fixes</h1>
      <p className="mt-2 max-w-3xl text-slate-700">The faults maintenance teams meet every day in factories and control panels – what you see, why it happens and what to check, in order. For drive, servo and PLC error codes see <Link href="/fault-codes" className="font-semibold text-brand-700 hover:underline">error codes</Link>.</p>
      <p className="mt-4 rounded bg-red-50 p-3 text-sm text-red-900 ring-1 ring-red-200">⚠️ {ELECTRICAL_SAFETY}</p>
      {GROUPS.map((g) => (
        <section key={g} className="mt-6">
          <h2 className="text-xl font-bold">{g}</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {ELECTRICAL_FAULTS.filter((f) => f.group === g).map((f) => (
              <Link key={f.slug} href={`/electrical-faults/${f.slug}`} className="group rounded-md bg-white p-5 ring-1 ring-slate-200 hover:ring-brand-600">
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
