import type { Metadata } from "next";
import Link from "@/i18n/client";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { CncFinder } from "@/components/CncFinder";
import { getCncPhotos } from "@/lib/data";
import { CNC_DATA_CHECKED, CNC_MAKERS, MACHINES, TYPE_LABEL, finderItems, type CncType } from "@/lib/cnc-machines";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://pcbdukaan.com";

export const metadata: Metadata = {
  title: "CNC machine comparison – VMC, HMC, lathe specs",
  description: `Compare ${MACHINES.length} CNC machines side by side – VMC, HMC, turning centres and VTLs from Jyoti, BFW, Makino and DMG MORI. Specs from maker data.`.slice(0, 158),
  alternates: { canonical: "/cnc-machines" },
};

export default async function CncMachinesPage() {
  const photos = await getCncPhotos();
  const makers = Object.entries(CNC_MAKERS).map(([slug, m]) => ({ slug, name: m.name.split(" (")[0], full: m.name, country: m.country, count: MACHINES.filter((x) => x.maker === slug).length }));
  const types = (Object.keys(TYPE_LABEL) as CncType[]).map((t) => ({ t, n: MACHINES.filter((m) => m.type === t).length })).filter((x) => x.n);
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 pb-28">
      <JsonLd data={{
        "@context": "https://schema.org", "@type": "ItemList", name: "CNC machines",
        itemListElement: MACHINES.slice(0, 100).map((m, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}/cnc-machines/${m.slug}` })),
      }} />
      <Breadcrumbs items={[{ label: "CNC machine comparison" }]} />
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-brand-800 px-5 py-8 text-white sm:px-10">
        <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full bg-accent-500/20 blur-3xl" />
        <p className="relative text-xs font-semibold uppercase tracking-widest text-accent-400">{MACHINES.length} machines · {makers.length} manufacturers · specs from maker data</p>
        <h1 className="relative mt-2 text-3xl font-extrabold sm:text-4xl">CNC machine comparison</h1>
        <p className="relative mt-2 max-w-2xl text-slate-300">Search and compare VMCs, HMCs, turning centres and VTLs side by side – travels, spindle speed and power, taper, tool magazine, rapid traverse and accuracy, exactly as each manufacturer publishes them.</p>
        <div className="relative mt-5 flex flex-wrap gap-2 text-xs">
          {types.map(({ t, n }) => <span key={t} className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/20">{TYPE_LABEL[t]} · {n}</span>)}
        </div>
      </section>

      <div className="mt-6"><CncFinder items={finderItems()} photos={photos} makers={makers.map(({ slug, name }) => ({ slug, name }))} /></div>

      <section className="mt-10 grid gap-4 sm:grid-cols-2">
        {makers.map((m) => (
          <div key={m.slug} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-lg font-bold">{m.full}</p>
            <p className="text-sm text-slate-500">{m.country} · {m.count} machines listed</p>
            <p className="mt-2 text-sm"><a href={CNC_MAKERS[m.slug].site} target="_blank" rel="noopener" className="text-brand-700 hover:underline">Manufacturer website ↗</a></p>
          </div>
        ))}
      </section>

      <section className="mt-8 rounded-xl bg-amber-50 p-5 text-sm text-amber-950 ring-1 ring-amber-200">
        <p className="font-semibold">About this data</p>
        <p className="mt-1">Specifications are copied from each manufacturer&apos;s own website (link on every machine page), checked on {new Date(CNC_DATA_CHECKED).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}. Options, controllers and accuracy standards differ between makers, and specs can change – always confirm with the manufacturer or dealer before buying. More manufacturers are being added. Spotted a mistake? <Link href="/contact" className="font-semibold underline">Tell us</Link>.</p>
      </section>
      <section className="mt-6 rounded-xl bg-white p-5 text-sm shadow-sm ring-1 ring-slate-200">
        <p className="font-semibold">Own a CNC machine?</p>
        <p className="mt-1 text-slate-700">We repair CNC drive, servo, SMPS and control boards at component level, and explain <Link href="/fault-codes" className="font-semibold text-brand-700 hover:underline">servo, VFD &amp; PLC error codes</Link>. <Link href="/pcb-repair/machine-control-board-repair" className="font-semibold text-brand-700 hover:underline">CNC board repair →</Link></p>
      </section>
    </div>
  );
}
