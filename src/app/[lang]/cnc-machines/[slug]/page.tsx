import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "@/i18n/client";
import { notFound } from "next/navigation";
import { lang } from "next/root-params";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { MachineImage, PhotoCredit } from "@/components/MachineArt";
import { getCncPhotos, getCncSettings } from "@/lib/data";
import { CNC_DATA_CHECKED, MACHINES, SPEC_ROWS, TYPE_LABEL, fullName, getMachine, isTurning, makerName, num, type CncType } from "@/lib/cnc-machines";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://pcbdukaan.com";

export async function generateStaticParams() {
  const all = MACHINES.map((m) => ({ slug: m.slug }));
  return (await lang()) === "en" ? all : all.slice(0, 1);
}

export async function generateMetadata(props: PageProps<"/[lang]/cnc-machines/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const m = getMachine(slug);
  const cnc = await getCncSettings();
  if (!m || !cnc.enabled || cnc.hidden.includes(m.slug)) return { title: "Not found", robots: { index: false } };
  const name = fullName(m);
  const opts = [`${name} specifications & comparison`, `${name} specifications`, `${name} specs`];
  const s = m.specs;
  const facts = [s.x_travel && `X ${s.x_travel}`, s.max_turn_dia && `turning Ø ${s.max_turn_dia}`, s.max_rpm, s.spindle_taper, s.tools && `${s.tools} tools`].filter(Boolean).join(", ");
  return {
    title: opts.find((o) => o.length <= 48) ?? opts[opts.length - 1],
    description: `${name} (${TYPE_LABEL[m.type as CncType]}) technical specifications: ${facts}. Compare with similar machines.`.slice(0, 158),
    alternates: { canonical: `/cnc-machines/${m.slug}` },
  };
}

export default function CncMachinePage(props: PageProps<"/[lang]/cnc-machines/[slug]">) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-md bg-slate-100" />}><Machine params={props.params} /></Suspense>
    </div>
  );
}

async function Machine({ params }: Pick<PageProps<"/[lang]/cnc-machines/[slug]">, "params">) {
  const { slug } = await params;
  const m = getMachine(slug);
  const cnc = await getCncSettings();
  if (!m || !cnc.enabled || cnc.hidden.includes(m.slug)) notFound();
  const turning = isTurning(m.type);
  const photo = (await getCncPhotos())[m.slug];
  const rows = SPEC_ROWS.filter((r) => m.specs[r.key]);
  // Similar machines: same type, closest size.
  const size = (x: typeof m) => num(x.specs.x_travel ?? x.specs.max_turn_dia) ?? 0;
  const similar = MACHINES.filter((x) => x.type === m.type && x.slug !== m.slug && !cnc.hidden.includes(x.slug))
    .sort((a, b) => Math.abs(size(a) - size(m)) - Math.abs(size(b) - size(m))).slice(0, 6);
  const name = fullName(m);
  return (
    <>
      <JsonLd data={[
        {
          "@context": "https://schema.org", "@type": "Product", name, brand: { "@type": "Brand", name: makerName(m).split(" (")[0] },
          category: TYPE_LABEL[m.type as CncType], url: `${SITE}/cnc-machines/${m.slug}`, ...(photo ? { image: photo.url } : {}),
          additionalProperty: rows.map((r) => ({ "@type": "PropertyValue", name: r.label, value: m.specs[r.key] })),
        },
        {
          "@context": "https://schema.org", "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "CNC machines", item: `${SITE}/cnc-machines` },
            { "@type": "ListItem", position: 2, name, item: `${SITE}/cnc-machines/${m.slug}` },
          ],
        },
      ]} />
      <Breadcrumbs schema={false} items={[{ label: "CNC machine comparison", href: "/cnc-machines" }, { label: name }]} />
      <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-brand-800 p-6 text-white sm:p-8">
        <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-accent-500/20 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="shrink-0">
            <MachineImage type={m.type} photo={photo} alt={name} className="h-40 w-full rounded-xl bg-white sm:h-36 sm:w-52" />
            <PhotoCredit photo={photo} className="mt-1.5 max-w-52 text-slate-300" />
            {!photo && (
              <a href={m.source} target="_blank" rel="noopener" className="mt-2 flex items-center justify-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white ring-1 ring-white/20 hover:bg-white/20">
                📷 See photos on {makerName(m).split(" (")[0]} website ↗
              </a>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-accent-400">{TYPE_LABEL[m.type as CncType]}</p>
            <h1 className="mt-2 text-3xl font-extrabold">{name}</h1>
            <p className="mt-1 text-slate-300">{makerName(m)} · {m.series}</p>
          </div>
        </div>
        <div className="relative mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(turning
            ? [["Turning Ø", m.specs.max_turn_dia], ["Turning length", m.specs.max_turn_len], ["Max. speed", m.specs.max_rpm], ["Tools", m.specs.tools]]
            : [["X × Y × Z", [m.specs.x_travel, m.specs.y_travel, m.specs.z_travel].map((v) => num(v) ?? "–").join(" × ") + " mm"], ["Max. speed", m.specs.max_rpm], ["Taper", m.specs.spindle_taper], ["Tools", m.specs.tools]]
          ).map(([k, v]) => (
            <div key={k} className="rounded-xl bg-white/10 p-3 ring-1 ring-white/15"><p className="text-xs text-slate-300">{k}</p><p className="mt-0.5 font-bold">{v || "–"}</p></div>
          ))}
        </div>
      </header>

      <section className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <h2 className="border-b border-slate-100 px-5 py-4 text-lg font-bold">Technical specifications</h2>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => <tr key={r.key}><th scope="row" className="w-1/2 px-5 py-2.5 text-left font-medium text-slate-600">{r.label}</th><td className="px-5 py-2.5 font-semibold">{m.specs[r.key]}</td></tr>)}
          </tbody>
        </table>
        <p className="border-t border-slate-100 bg-slate-50 px-5 py-3 text-xs text-slate-500">
          Source: <a href={m.source} target="_blank" rel="noopener" className="text-brand-700 underline">{makerName(m).split(" (")[0]} – official specifications</a>, checked {new Date(CNC_DATA_CHECKED).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}. Power ratings are shown as published (continuous / short-time, by controller). Confirm options and current specs with the manufacturer.{m.partial ? " This maker publishes only key data openly – see their page for spindle, tool magazine and accuracy details." : ""}
        </p>
      </section>

      {similar.length > 0 && (
        <section className="mt-6">
          <h2 className="text-lg font-bold">Compare {m.model} with similar machines</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((x) => (
              <div key={x.slug} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <Link href={`/cnc-machines/${x.slug}`} className="font-semibold hover:text-brand-700">{fullName(x)}</Link>
                <p className="text-xs text-slate-500">{x.specs.x_travel ? `X ${x.specs.x_travel}` : x.specs.max_turn_dia ? `Ø ${x.specs.max_turn_dia}` : ""}{x.specs.max_rpm ? ` · ${x.specs.max_rpm}` : ""}</p>
                <Link href={`/cnc-machines/compare?m=${m.slug},${x.slug}`} className="mt-2 inline-block text-sm font-semibold text-brand-700 hover:underline">Compare side by side →</Link>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-6 rounded-xl bg-brand-50 p-5 text-sm text-brand-900 ring-1 ring-brand-100">
        🔧 Running a {makerName(m).split(" (")[0]} machine? We repair CNC servo, spindle drive, SMPS and control boards. <Link href="/pcb-repair/machine-control-board-repair" className="font-semibold underline">CNC board repair</Link> · <Link href="/fault-codes" className="underline">Servo &amp; PLC error codes</Link> · <Link href="/cnc-machines" className="underline">All CNC machines</Link>
      </section>
    </>
  );
}
